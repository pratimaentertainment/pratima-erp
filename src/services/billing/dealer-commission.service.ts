import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface ActiveDealerInfo {
  id: string;
  dealerCode: string;
  businessName: string;
  contactPerson: string;
  commissionPercent: number;
  firstPaymentDiscountPercent: number;
  isActive: boolean;
}

export interface FirstPaymentDiscountResult {
  eligible: boolean;
  discountPercent: number;
  dealerId?: string;
  dealerCode?: string;
  businessName?: string;
}

export class DealerCommissionService {
  /**
   * Evaluates whether a dealer and tenant share identical identity markers (userId, email, canonicalEmail, phone),
   * which constitutes prohibited self-referral / self-attribution abuse.
   */
  static isSelfReferral(
    dealer: {
      userId: string;
      phone: string;
      user?: { email: string | null; canonicalEmail?: string | null } | null;
    },
    tenant: {
      email?: string | null;
      phone?: string | null;
      contactPhone?: string | null;
      users?: Array<{ id: string; email: string | null; canonicalEmail?: string | null; phone?: string | null }>;
    }
  ): boolean {
    if (!dealer || !tenant) return false;

    const normalizePhone = (p?: string | null) => (p || '').replace(/\D/g, '').slice(-10);
    const normalizeEmail = (e?: string | null) => (e || '').trim().toLowerCase();

    const dealerUserId = dealer.userId;
    const dealerPhone = normalizePhone(dealer.phone);
    const dealerEmail = normalizeEmail(dealer.user?.email);
    const dealerCanonical = normalizeEmail(dealer.user?.canonicalEmail) || dealerEmail;

    // Check tenant root phone & email
    const tenantPhone = normalizePhone(tenant.phone || tenant.contactPhone);
    const tenantEmail = normalizeEmail(tenant.email);

    if (dealerPhone && tenantPhone && dealerPhone === tenantPhone) return true;
    if (dealerEmail && tenantEmail && dealerEmail === tenantEmail) return true;

    // Check tenant users
    if (tenant.users && Array.isArray(tenant.users)) {
      for (const u of tenant.users) {
        if (u.id === dealerUserId) return true;
        const uPhone = normalizePhone(u.phone);
        const uEmail = normalizeEmail(u.email);
        const uCanonical = normalizeEmail(u.canonicalEmail) || uEmail;

        if (dealerPhone && uPhone && dealerPhone === uPhone) return true;
        if (dealerEmail && uEmail && dealerEmail === uEmail) return true;
        if (dealerCanonical && uCanonical && dealerCanonical === uCanonical) return true;
      }
    }

    return false;
  }
  /**
   * Resolves an active dealer profile by unique dealer code (case-insensitive).
   */
  static async resolveActiveDealerByCode(code: string): Promise<ActiveDealerInfo | null> {
    if (!code || typeof code !== 'string') return null;
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) return null;

    const dealer = await prisma.dealerProfile.findUnique({
      where: { dealerCode: normalizedCode },
      select: {
        id: true,
        dealerCode: true,
        businessName: true,
        contactPerson: true,
        commissionPercent: true,
        firstPaymentDiscountPercent: true,
        isActive: true,
      },
    });

    if (!dealer || !dealer.isActive) {
      return null;
    }

    return {
      id: dealer.id,
      dealerCode: dealer.dealerCode,
      businessName: dealer.businessName,
      contactPerson: dealer.contactPerson,
      commissionPercent: Number(dealer.commissionPercent),
      firstPaymentDiscountPercent: Number(dealer.firstPaymentDiscountPercent),
      isActive: dealer.isActive,
    };
  }

  /**
   * Checks if a tenant is eligible for the one-time first payment discount.
   * If dealerCodeInput is provided and tenant has no dealer attached, links the dealer
   * provided the tenant has zero successful payments.
   */
  static async calculateFirstPaymentDiscount(
    tenantId: string,
    dealerCodeInput?: string
  ): Promise<FirstPaymentDiscountResult> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        referredByDealer: {
          include: {
            user: { select: { id: true, email: true, canonicalEmail: true } },
          },
        },
        users: {
          select: { id: true, email: true, canonicalEmail: true, phone: true },
        },
        transactions: {
          where: { status: 'SUCCESS' },
          select: { id: true },
        },
      },
    });

    if (!tenant) {
      return { eligible: false, discountPercent: 0 };
    }

    // If tenant already has a successful payment or has already used discount
    if (tenant.firstPaymentDiscountUsed || tenant.transactions.length > 0) {
      return { eligible: false, discountPercent: 0 };
    }

    let dealer = tenant.referredByDealer;

    // If not currently attributed to a dealer, try linking with dealerCodeInput
    if (!dealer && dealerCodeInput) {
      const resolved = await this.resolveActiveDealerByCode(dealerCodeInput);
      if (resolved) {
        const potentialDealer = await prisma.dealerProfile.findUnique({
          where: { id: resolved.id },
          include: { user: { select: { id: true, email: true, canonicalEmail: true } } },
        });

        // Anti-Fraud Guard: Block linking self-referral codes
        if (potentialDealer && this.isSelfReferral(potentialDealer, tenant)) {
          console.warn(
            `[DEALER_ANTI_FRAUD] Blocked self-referral discount linkage for dealer "${potentialDealer.dealerCode}" on tenant "${tenantId}".`
          );
          return { eligible: false, discountPercent: 0 };
        }

        await prisma.tenant.update({
          where: { id: tenantId },
          data: { referredByDealerId: resolved.id },
        });
        dealer = potentialDealer as any;
      }
    }

    if (!dealer || !dealer.isActive) {
      return { eligible: false, discountPercent: 0 };
    }

    // Anti-Fraud Guard: Check if existing attributed dealer is a self-referral
    if (this.isSelfReferral(dealer, tenant)) {
      console.warn(
        `[DEALER_ANTI_FRAUD] Blocked self-referral discount application for dealer "${dealer.dealerCode}" on tenant "${tenantId}".`
      );
      return { eligible: false, discountPercent: 0 };
    }

    const discountPercent = Number(dealer.firstPaymentDiscountPercent || 0);
    if (discountPercent <= 0) {
      return { eligible: false, discountPercent: 0 };
    }

    return {
      eligible: true,
      discountPercent,
      dealerId: dealer.id,
      dealerCode: dealer.dealerCode,
      businessName: dealer.businessName,
    };
  }

  /**
   * Automatically records a lifetime recurring commission ledger entry for a successful transaction.
   * Strictly idempotent via billingTransactionId unique constraint.
   */
  static async recordDealerCommissionForTransaction(billingTransactionId: string) {
    try {
      const tx = await prisma.billingTransaction.findUnique({
        where: { id: billingTransactionId },
        include: {
          tenant: {
            include: {
              referredByDealer: {
                include: {
                  user: { select: { id: true, email: true, canonicalEmail: true } },
                },
              },
              users: {
                select: { id: true, email: true, canonicalEmail: true, phone: true },
              },
            },
          },
        },
      });

      if (!tx || tx.status !== 'SUCCESS') {
        return { recorded: false, reason: 'Transaction not found or not successful' };
      }

      const tenant = tx.tenant;
      if (!tenant || !tenant.referredByDealerId) {
        return { recorded: false, reason: 'Tenant not referred by any dealer' };
      }

      const dealer = tenant.referredByDealer;
      if (!dealer) {
        return { recorded: false, reason: 'Dealer profile not found' };
      }

      // Anti-Fraud Guard: Block dealer self-referral commission on own studio account
      if (this.isSelfReferral(dealer, tenant)) {
        console.warn(
          `[DEALER_COMMISSION_BLOCKED_SELF_REFERRAL] Dealer "${dealer.businessName}" (${dealer.dealerCode}) attempted to earn commission on studio "${tenant.name}". Blocked.`
        );
        return {
          recorded: false,
          reason: 'Self-referral prohibited: Studio owners cannot earn commission on their own studio accounts.',
        };
      }

      // Idempotency check:
      const existingLedger = await prisma.dealerCommissionLedger.findUnique({
        where: { billingTransactionId: tx.id },
      });

      if (existingLedger) {
        return { recorded: true, commissionId: existingLedger.id, alreadyRecorded: true };
      }

      // Count prior successful transactions to determine cycle number
      const priorCount = await prisma.billingTransaction.count({
        where: {
          tenantId: tenant.id,
          status: 'SUCCESS',
          transactionDate: { lte: tx.transactionDate },
        },
      });

      const paymentCycleNumber = Math.max(1, priorCount);
      const netPaidAmount = Number(tx.amount || 0);
      const commissionPercent = Number(dealer.commissionPercent || 0);
      const commissionAmount = Math.round(((netPaidAmount * commissionPercent) / 100) * 100) / 100;

      // Extract discount if saved in notes
      let discountApplied = 0;
      if (tx.notes && tx.notes.includes('discountAmount:')) {
        const match = tx.notes.match(/discountAmount:\s*([\d.]+)/);
        if (match && match[1]) {
          discountApplied = parseFloat(match[1]) || 0;
        }
      }

      const grossPlanAmount = netPaidAmount + discountApplied;

      const commissionRow = await prisma.$transaction(async (prismaTx) => {
        const created = await prismaTx.dealerCommissionLedger.create({
          data: {
            dealerId: dealer.id,
            tenantId: tenant.id,
            billingTransactionId: tx.id,
            paymentCycleNumber,
            grossPlanAmount: new Prisma.Decimal(grossPlanAmount),
            discountApplied: new Prisma.Decimal(discountApplied),
            netPaidAmount: new Prisma.Decimal(netPaidAmount),
            commissionPercent: new Prisma.Decimal(commissionPercent),
            commissionAmount: new Prisma.Decimal(commissionAmount),
            status: 'PENDING',
          },
        });

        // Mark first payment discount used
        if (!tenant.firstPaymentDiscountUsed) {
          await prismaTx.tenant.update({
            where: { id: tenant.id },
            data: { firstPaymentDiscountUsed: true },
          });
        }

        return created;
      });

      console.log(
        `[DEALER_COMMISSION_RECORDED] Dealer "${dealer.businessName}" (${dealer.dealerCode}) credited ₹${commissionAmount} (${commissionPercent}%) for Studio "${tenant.name}" Cycle #${paymentCycleNumber}.`
      );

      return {
        recorded: true,
        commissionId: commissionRow.id,
        commissionAmount,
        commissionPercent,
        dealerCode: dealer.dealerCode,
      };
    } catch (err: any) {
      console.error('[DEALER_COMMISSION_RECORD_ERROR]', err);
      return { recorded: false, error: err.message };
    }
  }
}
