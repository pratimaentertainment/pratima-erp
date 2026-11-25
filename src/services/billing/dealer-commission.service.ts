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
        referredByDealer: true,
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
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { referredByDealerId: resolved.id },
        });
        dealer = await prisma.dealerProfile.findUnique({ where: { id: resolved.id } });
      }
    }

    if (!dealer || !dealer.isActive) {
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
              referredByDealer: true,
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

      // Idempotency check:
      const existingLedger = await prisma.dealerCommissionLedger.findUnique({
        where: { billingTransactionId: tx.id },
      });

      if (existingLedger) {
        return { recorded: true, commissionId: existingLedger.id, alreadyRecorded: true };
      }

      const dealer = tenant.referredByDealer;
      if (!dealer) {
        return { recorded: false, reason: 'Dealer profile not found' };
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
