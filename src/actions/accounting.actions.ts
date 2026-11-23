'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { serializePrisma } from '@/lib/serialize';
import { AccountType, EntryType, VoucherType, Prisma } from '@prisma/client';
import {
  AccountingService,
  DEFAULT_CHART_OF_ACCOUNTS,
  VoucherEntryInput,
} from '@/services/accounting.service';
import { AccountingSyncService } from '@/services/accounting-sync.service';
import { FinancialReportsService } from '@/services/financial-reports.service';
import { z } from 'zod';

async function validateSession(tenantIdOverride?: string) {
  if (tenantIdOverride) {
    return { tenantId: tenantIdOverride, userId: 'system' };
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

const createAccountSchema = z.object({
  name: z.string().min(2, 'Ledger name must be at least 2 characters'),
  type: z.nativeEnum(AccountType),
  code: z.string().optional(),
  description: z.string().optional(),
});

const updateAccountSchema = z.object({
  accountId: z.string().uuid('Invalid account ID'),
  name: z.string().min(2).optional(),
  code: z.string().optional(),
  description: z.string().optional(),
});

/**
 * Initializes standard default Chart of Accounts for a tenant studio if none exist.
 */
export async function initializeDefaultAccountsAction(tenantIdOverride?: string): Promise<
  | { success: true; message: string; createdCount: number }
  | { success: false; error: string; message?: never; createdCount?: never }
> {
  try {
    const { tenantId } = await validateSession(tenantIdOverride);

    const result = await AccountingService.initializeDefaultAccounts(tenantId);

    revalidatePath('/finance/ledgers');
    revalidatePath('/finance');
    revalidatePath('/finance');

    return result;
  } catch (error: any) {
    console.error('[INIT_DEFAULT_ACCOUNTS_ERROR]', error);
    return { success: false, error: error.message || 'Failed to initialize default accounts' };
  }
}

/**
 * Fetches all ledgers for the active tenant grouped by AccountType,
 * calculating total debit, credit, and current balance for each ledger.
 */
export async function getChartOfAccountsAction() {
  try {
    const { tenantId } = await validateSession();

    // Fetch accounts with aggregated active (non-voided, non-deleted) voucher entries
    const accounts = await prisma.account.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        entries: {
          where: {
            voucher: {
              deletedAt: null,
              isVoided: false,
            },
          },
          select: {
            type: true,
            amount: true,
          },
        },
      },
      orderBy: [{ code: 'asc' }, { name: 'asc' }],
    });

    // Check if tenant has missing default ledgers (including newly introduced statutory accounts)
    const existingCodeSet = new Set(accounts.map((a) => a.code).filter(Boolean));
    const hasMissingDefaults = DEFAULT_CHART_OF_ACCOUNTS.some(
      (d) => d.code && !existingCodeSet.has(d.code)
    );

    if (accounts.length === 0 || hasMissingDefaults) {
      await AccountingService.initializeDefaultAccounts(tenantId);
      if (hasMissingDefaults && accounts.length > 0) {
        return getChartOfAccountsAction();
      }
      if (accounts.length === 0) {
        return getChartOfAccountsAction();
      }
    }

    // Process balances:
    // ASSET & EXPENSE: Balance = Debit - Credit
    // LIABILITY, EQUITY & REVENUE: Balance = Credit - Debit
    const enrichedAccounts = accounts.map((acc) => {
      let totalDebit = 0;
      let totalCredit = 0;

      for (const entry of acc.entries) {
        const num = Number(entry.amount);
        if (entry.type === EntryType.DEBIT) {
          totalDebit += num;
        } else {
          totalCredit += num;
        }
      }

      const isDebitNormal = acc.type === AccountType.ASSET || acc.type === AccountType.EXPENSE;
      const netBalance = isDebitNormal ? totalDebit - totalCredit : totalCredit - totalDebit;

      return {
        id: acc.id,
        name: acc.name,
        type: acc.type,
        code: acc.code,
        description: acc.description,
        isDefault: acc.isDefault,
        createdAt: acc.createdAt,
        updatedAt: acc.updatedAt,
        totalDebit,
        totalCredit,
        netBalance,
        entryCount: acc.entries.length,
      };
    });

    // Group by AccountType
    const grouped = {
      [AccountType.ASSET]: enrichedAccounts.filter((a) => a.type === AccountType.ASSET),
      [AccountType.LIABILITY]: enrichedAccounts.filter((a) => a.type === AccountType.LIABILITY),
      [AccountType.EQUITY]: enrichedAccounts.filter((a) => a.type === AccountType.EQUITY),
      [AccountType.REVENUE]: enrichedAccounts.filter((a) => a.type === AccountType.REVENUE),
      [AccountType.EXPENSE]: enrichedAccounts.filter((a) => a.type === AccountType.EXPENSE),
    };

    const summary = {
      totalAccounts: enrichedAccounts.length,
      totalAssets: grouped[AccountType.ASSET].reduce((sum, a) => sum + a.netBalance, 0),
      totalLiabilities: grouped[AccountType.LIABILITY].reduce((sum, a) => sum + a.netBalance, 0),
      totalEquity: grouped[AccountType.EQUITY].reduce((sum, a) => sum + a.netBalance, 0),
      totalRevenue: grouped[AccountType.REVENUE].reduce((sum, a) => sum + a.netBalance, 0),
      totalExpenses: grouped[AccountType.EXPENSE].reduce((sum, a) => sum + a.netBalance, 0),
    };

    return {
      success: true,
      data: serializePrisma({
        all: enrichedAccounts,
        grouped,
        summary,
      }),
    };
  } catch (error: any) {
    console.error('[GET_CHART_OF_ACCOUNTS_ERROR]', error);
    return { success: false, error: error.message || 'Failed to fetch chart of accounts' };
  }
}

/**
 * Creates a new custom ledger account with strict validation.
 */
export async function createAccountAction(input: z.infer<typeof createAccountSchema>) {
  try {
    const { tenantId } = await validateSession();
    const validated = createAccountSchema.parse(input);

    const cleanName = validated.name.trim();

    // Check duplicate name within tenant
    const existing = await prisma.account.findFirst({
      where: {
        tenantId,
        name: { equals: cleanName, mode: 'insensitive' },
        deletedAt: null,
      },
    });

    if (existing) {
      return { success: false, error: `An account named "${cleanName}" already exists.` };
    }

    const account = await prisma.account.create({
      data: {
        tenantId,
        name: cleanName,
        type: validated.type,
        code: validated.code?.trim() || null,
        description: validated.description?.trim() || null,
        isDefault: false,
      },
    });

    revalidatePath('/finance/ledgers');
    revalidatePath('/finance');

    return { success: true, data: serializePrisma(account) };
  } catch (error: any) {
    console.error('[CREATE_ACCOUNT_ERROR]', error);
    return { success: false, error: error.message || 'Failed to create ledger account' };
  }
}

/**
 * Updates an existing custom ledger account.
 */
export async function updateAccountAction(input: z.infer<typeof updateAccountSchema>) {
  try {
    const { tenantId } = await validateSession();
    const validated = updateAccountSchema.parse(input);

    const account = await prisma.account.findFirst({
      where: { id: validated.accountId, tenantId, deletedAt: null },
    });

    if (!account) {
      return { success: false, error: 'Account not found or unauthorized' };
    }

    // If renaming, ensure no collision
    if (validated.name && validated.name.trim() !== account.name) {
      const existing = await prisma.account.findFirst({
        where: {
          tenantId,
          name: { equals: validated.name.trim(), mode: 'insensitive' },
          id: { not: account.id },
          deletedAt: null,
        },
      });
      if (existing) {
        return { success: false, error: `An account named "${validated.name.trim()}" already exists.` };
      }
    }

    const updated = await prisma.account.update({
      where: { id: account.id },
      data: {
        name: validated.name?.trim() || account.name,
        code: validated.code !== undefined ? validated.code?.trim() || null : account.code,
        description:
          validated.description !== undefined
            ? validated.description?.trim() || null
            : account.description,
      },
    });

    revalidatePath('/finance/ledgers');

    return { success: true, data: serializePrisma(updated) };
  } catch (error: any) {
    console.error('[UPDATE_ACCOUNT_ERROR]', error);
    return { success: false, error: error.message || 'Failed to update account' };
  }
}

/**
 * Soft deletes a custom ledger account.
 * Rejects deletion if it is a system default ledger or has posted voucher entries.
 */
export async function deleteAccountAction(accountId: string) {
  try {
    const { tenantId } = await validateSession();

    const account = await prisma.account.findFirst({
      where: { id: accountId, tenantId, deletedAt: null },
      include: {
        _count: {
          select: { entries: true },
        },
      },
    });

    if (!account) {
      return { success: false, error: 'Account not found or unauthorized' };
    }

    if (account.isDefault) {
      return {
        success: false,
        error: 'System default ledgers are protected and cannot be deleted.',
      };
    }

    if (account._count.entries > 0) {
      return {
        success: false,
        error: `Cannot delete account: It contains ${account._count.entries} posted voucher transaction(s). Archive or reassign transactions first.`,
      };
    }

    await prisma.account.update({
      where: { id: account.id },
      data: { deletedAt: new Date() },
    });

    revalidatePath('/finance/ledgers');

    return { success: true, message: `Account "${account.name}" deleted successfully.` };
  } catch (error: any) {
    console.error('[DELETE_ACCOUNT_ERROR]', error);
    return { success: false, error: error.message || 'Failed to delete account' };
  }
}

// ------------------------------------------------------
// DOUBLE-ENTRY VOUCHERS & EXPENSE SERVER ACTIONS
// ------------------------------------------------------

const voucherEntrySchema = z.object({
  accountId: z.string().uuid('Invalid account ID'),
  type: z.nativeEnum(EntryType),
  amount: z.coerce.number().positive('Entry amount must be greater than zero'),
});

const createVoucherSchema = z
  .object({
    type: z.nativeEnum(VoucherType),
    date: z.string().optional().nullable(),
    narration: z.string().optional().nullable(),
    referenceId: z.string().optional().nullable(),
    entries: z
      .array(voucherEntrySchema)
      .min(2, 'At least two entries are required for double-entry accounting'),
  })
  .refine(
    (data) => {
      let debitCents = 0;
      let creditCents = 0;
      for (const entry of data.entries) {
        const cents = Math.round(Number(entry.amount) * 100);
        if (entry.type === EntryType.DEBIT) {
          debitCents += cents;
        } else if (entry.type === EntryType.CREDIT) {
          creditCents += cents;
        }
      }
      return debitCents === creditCents;
    },
    {
      message: 'Double-entry error: Total debits must exactly equal total credits.',
      path: ['entries'],
    }
  );

/**
 * Creates a double-entry financial voucher inside an atomic transaction.
 */
export async function createVoucherAction(input: z.infer<typeof createVoucherSchema>) {
  try {
    const { tenantId } = await validateSession();
    const validated = createVoucherSchema.parse(input);

    const voucher = await AccountingService.createVoucher({
      ...validated,
      tenantId,
    });

    revalidatePath('/finance/vouchers');
    revalidatePath('/finance/ledgers');
    revalidatePath('/finance');
    revalidatePath('/finance');

    return { success: true, data: voucher };
  } catch (error: any) {
    console.error('[CREATE_VOUCHER_ERROR]', error);
    return { success: false, error: error.message || 'Failed to post voucher' };
  }
}

/**
 * Fetches double-entry vouchers for Daybook with filter options.
 */
export async function getVouchersAction(filters?: {
  type?: VoucherType | 'ALL';
  startDate?: string | null;
  endDate?: string | null;
  search?: string | null;
  accountId?: string | null;
  referenceId?: string | null;
}) {
  try {
    const { tenantId } = await validateSession();

    const data = await AccountingService.getVouchers({
      ...filters,
      tenantId,
    });

    return { success: true, data };
  } catch (error: any) {
    console.error('[GET_VOUCHERS_ERROR]', error);
    return { success: false, error: error.message || 'Failed to fetch vouchers' };
  }
}

/**
 * Fetches details for a single financial voucher.
 */
export async function getVoucherByIdAction(voucherId: string) {
  try {
    const { tenantId } = await validateSession();
    const voucher = await AccountingService.getVoucherById(voucherId, tenantId);
    return { success: true, data: voucher };
  } catch (error: any) {
    console.error('[GET_VOUCHER_BY_ID_ERROR]', error);
    return { success: false, error: error.message || 'Failed to fetch voucher details' };
  }
}

const voidFinancialVoucherSchema = z.object({
  voucherId: z.string().uuid('Invalid voucher ID'),
  reason: z.string().min(3, 'Void reason must be at least 3 characters'),
});

/**
 * Strictly voids an existing financial voucher by posting an offsetting Contra/Reversal voucher.
 * Enforces audit trail immutability without hard deleting ledger records.
 */
export async function voidFinancialVoucherAction(
  voucherId: string,
  reason: string
): Promise<
  | { success: true; message: string; reversalVoucher: any; originalVoucherId: string }
  | { success: false; error: string }
> {
  try {
    const { tenantId, userId } = await validateSession();

    const parsed = voidFinancialVoucherSchema.safeParse({ voucherId, reason });
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || 'Invalid void parameters',
      };
    }

    const cleanReason = parsed.data.reason.trim();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch original voucher and its entries
      const originalVoucher = await tx.financialVoucher.findFirst({
        where: { id: parsed.data.voucherId, tenantId, deletedAt: null },
        include: {
          entries: {
            include: { account: true },
          },
        },
      });

      if (!originalVoucher) {
        throw new Error('Financial voucher not found or unauthorized');
      }

      if (originalVoucher.isVoided) {
        throw new Error(`Voucher #${originalVoucher.voucherNumber} has already been voided.`);
      }

      if (!originalVoucher.entries || originalVoucher.entries.length === 0) {
        throw new Error('Cannot void a voucher with no ledger entries.');
      }

      // 2. Prepare counter-balancing reversal entries (Swap DEBIT <-> CREDIT)
      const reversedEntries: VoucherEntryInput[] = originalVoucher.entries.map((entry) => ({
        accountId: entry.accountId,
        type: entry.type === EntryType.DEBIT ? EntryType.CREDIT : EntryType.DEBIT,
        amount: Number(entry.amount),
      }));

      // 3. Post the Contra / Reversal Voucher
      const reversalNarration = `Reversal / Void of ${originalVoucher.type} Voucher #${originalVoucher.voucherNumber}. Reason: ${cleanReason}`;

      const reversalVoucher = await AccountingService.createVoucher({
        tenantId,
        userId,
        type: VoucherType.JOURNAL,
        date: new Date(),
        referenceId: `REV-${originalVoucher.voucherNumber}`,
        narration: reversalNarration,
        entries: reversedEntries,
        tx,
      });

      // 4. Update original voucher to mark as voided and link reversal voucher
      const updatedOriginal = await tx.financialVoucher.update({
        where: { id: originalVoucher.id },
        data: {
          isVoided: true,
          voidedAt: new Date(),
          voidedById: userId,
          voidReason: cleanReason,
          reversalVoucherId: reversalVoucher.id,
        },
      });

      // 5. Link reversal voucher back to original voucher
      await tx.financialVoucher.update({
        where: { id: reversalVoucher.id },
        data: {
          reversalVoucherId: originalVoucher.id,
        },
      });

      // 6. Post Activity Timeline audit event
      await tx.activityTimeline.create({
        data: {
          tenantId,
          entityType: 'ACCOUNTING_VOUCHER',
          entityId: originalVoucher.id,
          action: 'VOUCHER_VOIDED',
          notes: `Voided Voucher #${originalVoucher.voucherNumber}. Created Reversal Voucher #${reversalVoucher.voucherNumber}. Reason: ${cleanReason}`,
          createdById: userId !== 'system' ? userId : null,
        },
      });

      return {
        originalVoucher: updatedOriginal,
        reversalVoucher,
      };
    });

    revalidatePath('/finance');
    revalidatePath('/finance/vouchers');
    revalidatePath('/finance/ledgers');
    revalidatePath('/finance/reports');
    revalidatePath('/finance');

    return {
      success: true,
      message: `Voucher #${result.originalVoucher.voucherNumber} voided successfully. Reversal #${result.reversalVoucher.voucherNumber} posted.`,
      reversalVoucher: result.reversalVoucher,
      originalVoucherId: result.originalVoucher.id,
    };
  } catch (error: any) {
    console.error('[VOID_FINANCIAL_VOUCHER_ERROR]', error);
    return { success: false, error: error.message || 'Failed to void financial voucher' };
  }
}

// ------------------------------------------------------
// AUTO-SYNC (CRM / DISPATCH TO ACCOUNTS) ACTIONS
// ------------------------------------------------------

const syncBookingAdvanceSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID'),
  advanceAmount: z.coerce.number().positive('Advance amount must be positive').optional().nullable(),
  paymentMethod: z.string().optional().nullable(),
});

const syncFreelancerPayoutSchema = z.object({
  assignmentId: z.string().uuid('Invalid assignment ID'),
  payoutAmount: z.coerce.number().positive('Payout amount must be positive').optional().nullable(),
});

/**
 * Automatically generates a double-entry Receipt Voucher for a booking advance deposit.
 */
export async function syncBookingAdvanceAction(input: z.infer<typeof syncBookingAdvanceSchema>) {
  try {
    const { tenantId } = await validateSession();
    const validated = syncBookingAdvanceSchema.parse(input);

    const result = await AccountingSyncService.syncBookingAdvanceToAccounts({
      ...validated,
      tenantId,
    });

    revalidatePath('/finance/vouchers');
    revalidatePath('/finance/ledgers');
    revalidatePath('/finance/reports');
    revalidatePath('/finance');

    return { success: true, data: result };
  } catch (error: any) {
    console.error('[SYNC_BOOKING_ADVANCE_ERROR]', error);
    return { success: false, error: error.message || 'Failed to sync booking advance to accounts' };
  }
}

/**
 * Automatically generates a double-entry Journal Voucher for a crew shoot payout.
 */
export async function syncFreelancerPayoutAction(input: z.infer<typeof syncFreelancerPayoutSchema>) {
  try {
    const { tenantId } = await validateSession();
    const validated = syncFreelancerPayoutSchema.parse(input);

    const result = await AccountingSyncService.syncFreelancerPayoutToAccounts({
      ...validated,
      tenantId,
    });

    revalidatePath('/finance/vouchers');
    revalidatePath('/finance/ledgers');
    revalidatePath('/finance/reports');
    revalidatePath('/finance');

    return { success: true, data: result };
  } catch (error: any) {
    console.error('[SYNC_FREELANCER_PAYOUT_ERROR]', error);
    return { success: false, error: error.message || 'Failed to sync crew payout liability' };
  }
}

/**
 * Batch synchronizes all crew payout liabilities for a completed booking.
 */
export async function syncBookingOperationsAction(bookingId: string) {
  try {
    const { tenantId } = await validateSession();
    const results = await AccountingSyncService.syncCompletedBookingOperations(bookingId, tenantId);

    revalidatePath('/finance/vouchers');
    revalidatePath('/finance/ledgers');
    revalidatePath('/finance/reports');

    return { success: true, data: results };
  } catch (error: any) {
    console.error('[SYNC_BOOKING_OPERATIONS_ERROR]', error);
    return { success: false, error: error.message || 'Failed to sync operations payouts' };
  }
}

// ------------------------------------------------------
// FINANCIAL REPORTING (TRIAL BALANCE, P&L, BALANCE SHEET)
// ------------------------------------------------------

/**
 * Generates the studio Trial Balance statement.
 */
export async function getTrialBalanceAction(params?: { startDate?: string | null; endDate?: string | null }) {
  try {
    const { tenantId } = await validateSession();
    const data = await FinancialReportsService.getTrialBalance({
      ...params,
      tenantId,
    });
    return { success: true, data };
  } catch (error: any) {
    console.error('[GET_TRIAL_BALANCE_ERROR]', error);
    return { success: false, error: error.message || 'Failed to generate trial balance' };
  }
}

/**
 * Generates the studio Profit & Loss Statement (Income Statement).
 */
export async function getProfitAndLossAction(params?: { startDate?: string | null; endDate?: string | null }) {
  try {
    const { tenantId } = await validateSession();
    const data = await FinancialReportsService.getProfitAndLoss({
      ...params,
      tenantId,
    });
    return { success: true, data };
  } catch (error: any) {
    console.error('[GET_PROFIT_AND_LOSS_ERROR]', error);
    return { success: false, error: error.message || 'Failed to generate profit and loss statement' };
  }
}

/**
 * Generates the studio Balance Sheet as of a specific date.
 */
export async function getBalanceSheetAction(params?: { asOfDate?: string | null }) {
  try {
    const { tenantId } = await validateSession();
    const data = await FinancialReportsService.getBalanceSheet({
      ...params,
      tenantId,
    });
    return { success: true, data };
  } catch (error: any) {
    console.error('[GET_BALANCE_SHEET_ERROR]', error);
    return { success: false, error: error.message || 'Failed to generate balance sheet' };
  }
}


