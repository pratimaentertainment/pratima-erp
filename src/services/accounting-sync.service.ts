import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { serializePrisma } from '@/lib/serialize';
import { AccountingService } from './accounting.service';
import {
  VoucherType,
  EntryType,
  AccountType,
  PaymentMethod,
  Prisma,
} from '@prisma/client';

export interface SyncBookingAdvanceParams {
  bookingId: string;
  advanceAmount?: number | string | null;
  paymentMethod?: 'BANK' | 'CASH' | string | null;
  tenantId?: string;
  userId?: string;
  tx?: Prisma.TransactionClient;
}

export interface SyncFreelancerPayoutParams {
  assignmentId: string;
  payoutAmount?: number | string | null;
  tenantId?: string;
  userId?: string;
  tx?: Prisma.TransactionClient;
}

export interface SyncPaymentReceiptParams {
  paymentId: string;
  invoiceId?: string | null;
  tenantId: string;
  amount: number | string | Prisma.Decimal;
  settleAmount?: number | string | Prisma.Decimal | null;
  surplusAmount?: number | string | Prisma.Decimal | null;
  paymentMethod: PaymentMethod | string;
  receiptNumber: string;
  paymentDate?: Date | string | null;
  isFirstPayment?: boolean;
  clientName?: string | null;
  invoiceNumber?: string | null;
  bookingTitle?: string | null;
  userId?: string;
  tx?: Prisma.TransactionClient;
}

export class AccountingSyncService {
  /**
   * Resolves active user session and tenant context.
   */
  private static async resolveSession(overrides?: { tenantId?: string; userId?: string }) {
    if (overrides?.tenantId) {
      return {
        tenantId: overrides.tenantId,
        userId: overrides.userId || 'system',
      };
    }

    const session = await auth();
    const user = session?.user as any;
    if (!user?.tenantId) {
      throw new Error('Unauthorized: No active tenant session');
    }

    return {
      tenantId: user.tenantId as string,
      userId: user.id as string,
    };
  }

  /**
   * Helper to ensure default ledgers are present for the tenant
   * and find matching accounts by code, name keyword, or account type.
   */
  public static async getOrCreateTargetAccount(
    tenantId: string,
    target: string | { code?: string; preferredNameKeyword?: string },
    fallbackType: AccountType,
    client: Prisma.TransactionClient | typeof prisma = prisma
  ) {
    const code = typeof target === 'object' ? target.code : undefined;
    const preferredNameKeyword =
      typeof target === 'string' ? target : target.preferredNameKeyword;

    let account = null;

    if (code) {
      account = await client.account.findFirst({
        where: {
          tenantId,
          code,
          deletedAt: null,
        },
      });
    }

    if (!account && preferredNameKeyword) {
      account = await client.account.findFirst({
        where: {
          tenantId,
          deletedAt: null,
          name: { contains: preferredNameKeyword, mode: 'insensitive' },
        },
      });
    }

    if (!account) {
      // Find any active account of fallbackType
      account = await client.account.findFirst({
        where: {
          tenantId,
          type: fallbackType,
          deletedAt: null,
        },
      });
    }

    if (!account) {
      // Seed default accounts if missing for this tenant
      await AccountingService.initializeDefaultAccounts(tenantId, client);

      if (code) {
        account = await client.account.findFirst({
          where: {
            tenantId,
            code,
            deletedAt: null,
          },
        });
      }

      if (!account && preferredNameKeyword) {
        account = await client.account.findFirst({
          where: {
            tenantId,
            deletedAt: null,
            name: { contains: preferredNameKeyword, mode: 'insensitive' },
          },
        });
      }

      if (!account) {
        account = await client.account.findFirst({
          where: { tenantId, type: fallbackType, deletedAt: null },
        });
      }
    }

    if (!account) {
      throw new Error(
        `Failed to resolve or create a valid ${fallbackType} account for automated synchronization.`
      );
    }

    return account;
  }

  /**
   * Synchronizes customer payment receipts to the double-entry accounting ledger.
   * Generates a RECEIPT Voucher:
   *   DEBIT:  Bank Account (1030) or Cash on Hand (1010) [Asset]
   *   CREDIT: Client Booking Advances (2030) [Liability, if advance deposit]
   *           OR Wedding & Event Photography Revenue (4010) [Revenue, if settlement]
   * Enforces strict idempotency via referenceId: "PMT-{paymentId}".
   */
  static async syncPaymentReceiptToAccounts(params: SyncPaymentReceiptParams) {
    const { tenantId, userId } = await this.resolveSession({
      tenantId: params.tenantId,
      userId: params.userId,
    });

    if (!params.paymentId) {
      throw new Error('Payment ID is required for payment receipt accounting sync.');
    }

    const client = params.tx || prisma;
    const amountNum =
      typeof params.amount === 'number'
        ? params.amount
        : Number(params.amount.toString());

    if (isNaN(amountNum) || amountNum <= 0) {
      throw new Error('Payment amount must be greater than zero to post a financial voucher.');
    }

    const referenceId = `PMT-${params.paymentId}`;

    // 1. Idempotency Check: Avoid double-posting the payment voucher
    const existingVoucher = await client.financialVoucher.findFirst({
      where: {
        tenantId,
        referenceId,
        deletedAt: null,
      },
      include: {
        entries: {
          include: { account: true },
        },
      },
    });

    if (existingVoucher) {
      return serializePrisma({
        success: true,
        message: `Payment receipt voucher already posted for payment #${params.receiptNumber}.`,
        voucher: existingVoucher,
        alreadySynced: true,
      });
    }

    // 2. Resolve Debit Ledger (Cash on Hand vs Bank Account)
    const isCash = String(params.paymentMethod).toUpperCase() === 'CASH';
    const debitAccount = await this.getOrCreateTargetAccount(
      tenantId,
      isCash
        ? { code: '1010', preferredNameKeyword: 'Cash on Hand' }
        : { code: '1030', preferredNameKeyword: 'Bank' },
      AccountType.ASSET,
      client
    );

    // 3. Resolve Credit Entries & Double-Entry Allocation
    const creditEntries: Array<{ accountId: string; type: EntryType; amount: number }> = [];
    const surplusNum = params.surplusAmount ? Math.max(0, Number(params.surplusAmount)) : 0;

    if (params.invoiceId) {
      // Invoice Settlement: Credits Accounts Receivable (1100) and routes any surplus to Client Excess (2080)
      const arAccount = await this.getOrCreateTargetAccount(
        tenantId,
        { code: '1100', preferredNameKeyword: 'Accounts Receivable' },
        AccountType.ASSET,
        client
      );

      let settleNum =
        params.settleAmount !== undefined && params.settleAmount !== null
          ? Number(params.settleAmount)
          : amountNum - surplusNum;

      if (settleNum < 0) settleNum = 0;

      if (surplusNum > 0) {
        const surplusAccount = await this.getOrCreateTargetAccount(
          tenantId,
          { code: '2080', preferredNameKeyword: 'Client Excess' },
          AccountType.LIABILITY,
          client
        );

        if (settleNum > 0) {
          creditEntries.push({
            accountId: arAccount.id,
            type: EntryType.CREDIT,
            amount: settleNum,
          });
        }

        creditEntries.push({
          accountId: surplusAccount.id,
          type: EntryType.CREDIT,
          amount: surplusNum,
        });
      } else {
        creditEntries.push({
          accountId: arAccount.id,
          type: EntryType.CREDIT,
          amount: amountNum,
        });
      }
    } else {
      // Standalone Advance Booking Deposit without Invoice: Credits Client Booking Advances (2030)
      const advanceAccount = await this.getOrCreateTargetAccount(
        tenantId,
        { code: '2030', preferredNameKeyword: 'Client Booking Advances' },
        AccountType.LIABILITY,
        client
      );

      creditEntries.push({
        accountId: advanceAccount.id,
        type: EntryType.CREDIT,
        amount: amountNum,
      });
    }

    // 4. Construct narration
    const clientLabel = params.clientName ? ` from ${params.clientName}` : '';
    const contextLabel = params.bookingTitle
      ? ` for ${params.bookingTitle}`
      : params.invoiceNumber
      ? ` for Invoice #${params.invoiceNumber}`
      : '';
    const surplusNote = surplusNum > 0 ? ` (Includes ₹${surplusNum.toFixed(2)} surplus credited to Client Retainer)` : '';

    const narration = `Receipt #${params.receiptNumber} received via ${params.paymentMethod}${clientLabel}${contextLabel}${surplusNote}.`.trim();

    // 5. Post double-entry receipt voucher
    const voucher = await AccountingService.createVoucher({
      tenantId,
      userId,
      type: VoucherType.RECEIPT,
      date: params.paymentDate ? new Date(params.paymentDate) : new Date(),
      referenceId,
      narration,
      entries: [
        {
          accountId: debitAccount.id,
          type: EntryType.DEBIT,
          amount: amountNum,
        },
        ...creditEntries,
      ],
      tx: params.tx,
    });

    return serializePrisma({
      success: true,
      message: `Payment receipt voucher ${voucher.voucherNumber} posted successfully.`,
      voucher,
      alreadySynced: false,
    });
  }

  /**
   * Synchronizes booking advance deposits to the double-entry accounting ledger.
   * Generates a RECEIPT Voucher:
   *   DEBIT:  Bank / Cash Account (Asset Inflow)
   *   CREDIT: Client Booking Advances / Photography Revenue (Liability/Revenue)
   * Enforces strict idempotency via referenceId: "BKG-ADV-{bookingId}".
   */
  static async syncBookingAdvanceToAccounts(params: SyncBookingAdvanceParams) {
    const { tenantId, userId } = await this.resolveSession({
      tenantId: params.tenantId,
      userId: params.userId,
    });

    if (!params.bookingId) {
      throw new Error('Booking ID is required for advance synchronization');
    }

    const client = params.tx || prisma;

    // 1. Fetch booking details
    const booking = await client.eventBooking.findFirst({
      where: { id: params.bookingId, tenantId, deletedAt: null },
      include: {
        customer: true,
        invoice: true,
      },
    });

    if (!booking) {
      throw new Error('Event booking not found or unauthorized');
    }

    const referenceId = `BKG-ADV-${booking.id}`;

    // 2. Idempotency Check: Avoid double-posting the advance voucher
    const existingVoucher = await client.financialVoucher.findFirst({
      where: {
        tenantId,
        referenceId,
        deletedAt: null,
      },
      include: {
        entries: {
          include: { account: true },
        },
      },
    });

    if (existingVoucher) {
      return serializePrisma({
        success: true,
        message: 'Advance receipt voucher already posted for this booking.',
        voucher: existingVoucher,
        alreadySynced: true,
      });
    }

    // 3. Resolve Amount
    let finalAmount = 0;
    if (params.advanceAmount !== undefined && params.advanceAmount !== null) {
      finalAmount = Number(params.advanceAmount);
    } else if (booking.invoice?.paidAmount) {
      finalAmount = Number(booking.invoice.paidAmount);
    }

    if (finalAmount <= 0) {
      throw new Error('Advance amount must be greater than zero to post a financial voucher.');
    }

    // 4. Resolve Debit Ledger (Bank or Cash)
    const isCash = params.paymentMethod?.toUpperCase() === 'CASH';
    const debitAccount = await this.getOrCreateTargetAccount(
      tenantId,
      isCash
        ? { code: '1010', preferredNameKeyword: 'Cash on Hand' }
        : { code: '1030', preferredNameKeyword: 'Bank' },
      AccountType.ASSET,
      client
    );

    // 5. Resolve Credit Ledger (Advance deposit or Event Revenue)
    const creditAccount = await this.getOrCreateTargetAccount(
      tenantId,
      { code: '2030', preferredNameKeyword: 'Client Booking Advances' },
      AccountType.LIABILITY,
      client
    );

    // 6. Post double-entry voucher
    const voucher = await AccountingService.createVoucher({
      tenantId,
      userId,
      type: VoucherType.RECEIPT,
      date: new Date(),
      referenceId,
      narration: `Advance deposit received for booking #${booking.bookingNumber} (${booking.title}) from ${booking.customer.firstName} ${booking.customer.lastName}.`,
      entries: [
        {
          accountId: debitAccount.id,
          type: EntryType.DEBIT,
          amount: finalAmount,
        },
        {
          accountId: creditAccount.id,
          type: EntryType.CREDIT,
          amount: finalAmount,
        },
      ],
      tx: params.tx,
    });

    return serializePrisma({
      success: true,
      message: `Advance voucher ${voucher.voucherNumber} posted successfully.`,
      voucher,
      alreadySynced: false,
    });
  }

  /**
   * Synchronizes agreed freelancer / crew payouts into accounts when dispatch duties are finalized.
   * Generates a JOURNAL Voucher:
   *   DEBIT:  Freelancer & Crew Shooting Fees (Expense)
   *   CREDIT: Freelancer & Crew Payouts Payable (Liability)
   * Enforces strict idempotency via referenceId: "ASG-PAYOUT-{assignmentId}".
   */
  static async syncFreelancerPayoutToAccounts(params: SyncFreelancerPayoutParams) {
    const { tenantId, userId } = await this.resolveSession({
      tenantId: params.tenantId,
      userId: params.userId,
    });

    if (!params.assignmentId) {
      throw new Error('Assignment ID is required for payout synchronization');
    }

    const client = params.tx || prisma;

    // 1. Fetch assignment details (support either EventAssignment or StaffAssignment ID)
    let assignment = await client.eventAssignment.findFirst({
      where: {
        id: params.assignmentId,
        eventBooking: { tenantId, deletedAt: null },
      },
      include: {
        user: true,
        eventBooking: true,
      },
    });

    if (!assignment) {
      const staffAsg = await client.staffAssignment.findFirst({
        where: {
          id: params.assignmentId,
          tenantId,
          deletedAt: null,
        },
        include: {
          user: true,
          subEvent: {
            include: { eventBooking: true },
          },
        },
      });

      if (staffAsg && staffAsg.subEvent?.eventBooking) {
        let evAsg = await client.eventAssignment.findFirst({
          where: {
            eventBookingId: staffAsg.subEvent.eventBookingId,
            userId: staffAsg.userId,
            role: staffAsg.role,
          },
          include: { user: true, eventBooking: true },
        });

        if (!evAsg) {
          evAsg = await client.eventAssignment.create({
            data: {
              eventBookingId: staffAsg.subEvent.eventBookingId,
              userId: staffAsg.userId,
              role: staffAsg.role,
              agreedPayment: staffAsg.payoutAmount,
            },
            include: { user: true, eventBooking: true },
          });
        }
        assignment = evAsg;
      }
    }

    if (!assignment) {
      throw new Error('Event crew assignment not found or unauthorized');
    }

    const referenceId = `ASG-PAYOUT-${assignment.id}`;

    // 2. Idempotency Check
    const existingVoucher = await client.financialVoucher.findFirst({
      where: {
        tenantId,
        referenceId,
        deletedAt: null,
      },
      include: {
        entries: {
          include: { account: true },
        },
      },
    });

    if (existingVoucher) {
      return serializePrisma({
        success: true,
        message: 'Crew payout liability voucher already posted.',
        voucher: existingVoucher,
        alreadySynced: true,
      });
    }

    // 3. Resolve payout amount
    let finalPayout = 0;
    if (params.payoutAmount !== undefined && params.payoutAmount !== null) {
      finalPayout = Number(params.payoutAmount);
    } else if (assignment.agreedPayment) {
      finalPayout = Number(assignment.agreedPayment);
    }

    if (finalPayout <= 0) {
      throw new Error('Agreed payout amount must be greater than zero to post a crew expense voucher.');
    }

    // 4. Resolve Expense Ledger (Debit)
    const expenseAccount = await this.getOrCreateTargetAccount(
      tenantId,
      { code: '5010', preferredNameKeyword: 'Freelancer & Crew Shooting Fees' },
      AccountType.EXPENSE,
      client
    );

    // 5. Resolve Payable Ledger (Credit)
    const payableAccount = await this.getOrCreateTargetAccount(
      tenantId,
      { code: '2020', preferredNameKeyword: 'Freelancer & Crew Payouts Payable' },
      AccountType.LIABILITY,
      client
    );

    // 6. Post double-entry journal voucher
    const voucher = await AccountingService.createVoucher({
      tenantId,
      userId,
      type: VoucherType.JOURNAL,
      date: new Date(),
      referenceId,
      narration: `Accrued shoot payout for ${assignment.user?.name || 'Staff'} as ${assignment.role} on booking #${assignment.eventBooking.bookingNumber} (${assignment.eventBooking.title}).`,
      entries: [
        {
          accountId: expenseAccount.id,
          type: EntryType.DEBIT,
          amount: finalPayout,
        },
        {
          accountId: payableAccount.id,
          type: EntryType.CREDIT,
          amount: finalPayout,
        },
      ],
      tx: params.tx,
    });

    return serializePrisma({
      success: true,
      message: `Crew fee liability voucher ${voucher.voucherNumber} posted successfully.`,
      voucher,
      alreadySynced: false,
    });
  }

  /**
   * Batch synchronizes all crew assignments for an EventBooking upon wrap-up.
   */
  static async syncCompletedBookingOperations(bookingId: string, tenantIdOverride?: string) {
    const { tenantId } = await this.resolveSession({ tenantId: tenantIdOverride });

    const booking = await prisma.eventBooking.findFirst({
      where: { id: bookingId, tenantId, deletedAt: null },
      include: {
        assignments: {
          where: { agreedPayment: { not: null } },
          include: { user: true },
        },
      },
    });

    if (!booking) {
      throw new Error('Event booking not found');
    }

    const results = [];
    for (const asg of booking.assignments) {
      if (Number(asg.agreedPayment) > 0) {
        try {
          const res = await this.syncFreelancerPayoutToAccounts({
            assignmentId: asg.id,
            tenantId,
          });
          results.push(res);
        } catch (err: any) {
          console.error(`[SYNC_PAYOUT_ERR] Assignment ${asg.id}:`, err.message);
        }
      }
    }

    return results;
  }
}
