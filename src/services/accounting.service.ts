import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { serializePrisma } from '@/lib/serialize';
import {
  VoucherType,
  EntryType,
  AccountType,
  Prisma,
} from '@prisma/client';

export interface VoucherEntryInput {
  accountId: string;
  type: EntryType;
  amount: number | string;
}

export interface CreateVoucherParams {
  tenantId?: string;
  userId?: string;
  type: VoucherType;
  date?: Date | string | null;
  narration?: string | null;
  referenceId?: string | null;
  entries: VoucherEntryInput[];
  tx?: Prisma.TransactionClient;
}

export interface GetVouchersParams {
  tenantId?: string;
  type?: VoucherType | 'ALL';
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  search?: string | null;
  accountId?: string | null;
  referenceId?: string | null;
}

export const DEFAULT_CHART_OF_ACCOUNTS: Array<{
  name: string;
  type: AccountType;
  code: string;
  description: string;
}> = [
  // --- ASSETS ---
  {
    name: 'Cash on Hand',
    type: AccountType.ASSET,
    code: '1010',
    description: 'Physical currency and cash vault maintained at the studio',
  },
  {
    name: 'Petty Cash',
    type: AccountType.ASSET,
    code: '1020',
    description: 'Daily minor shoot logistics and office refreshments fund',
  },
  {
    name: 'Primary Business Bank Account',
    type: AccountType.ASSET,
    code: '1030',
    description: 'Operating current account for client NEFT/RTGS/UPI receipts and supplier payouts',
  },
  {
    name: 'Accounts Receivable (Sundry Debtors)',
    type: AccountType.ASSET,
    code: '1100',
    description: 'Outstanding client balances on invoices and confirmed event bookings',
  },
  {
    name: 'Staff & Crew Advances',
    type: AccountType.ASSET,
    code: '1200',
    description: 'Advance payments given to shooters and editors prior to final reconciliation',
  },
  {
    name: 'Cameras & Production Equipment',
    type: AccountType.ASSET,
    code: '1500',
    description: 'Capital fixed assets including cinema cameras, prime lenses, and audio gear',
  },

  // --- LIABILITIES ---
  {
    name: 'Accounts Payable (Sundry Creditors)',
    type: AccountType.LIABILITY,
    code: '2010',
    description: 'Amounts owed to album print labs, gear rental vendors, and external suppliers',
  },
  {
    name: 'Freelancer & Crew Payouts Payable',
    type: AccountType.LIABILITY,
    code: '2020',
    description: 'Earned shoot fees and editing retainers pending bank transfer to team members',
  },
  {
    name: 'Client Booking Advances (Unearned Revenue)',
    type: AccountType.LIABILITY,
    code: '2030',
    description: 'Token deposits and advance bookings received for uncompleted future events',
  },
  {
    name: 'Duties & Taxes - Output CGST',
    type: AccountType.LIABILITY,
    code: '2040',
    description: 'Central GST (9%) collected on intra-state photography services pending monthly statutory remittance',
  },
  {
    name: 'Duties & Taxes - Output SGST',
    type: AccountType.LIABILITY,
    code: '2050',
    description: 'State GST (9%) collected on intra-state photography services pending monthly statutory remittance',
  },
  {
    name: 'Duties & Taxes - Output IGST',
    type: AccountType.LIABILITY,
    code: '2060',
    description: 'Integrated GST (18%) collected on inter-state destination shoot clients pending statutory remittance',
  },
  {
    name: 'Duties & Taxes - TDS Payable (u/s 194J/194C)',
    type: AccountType.LIABILITY,
    code: '2070',
    description: 'Tax Deducted at Source withheld from freelancer cinematographers, editors & crew payouts',
  },
  {
    name: 'Client Excess / Retainer Balances',
    type: AccountType.LIABILITY,
    code: '2080',
    description: 'Overpayments, tips, and unallocated client advance funds held for future assignments or refund',
  },
  {
    name: 'GST / Output Tax Payable',
    type: AccountType.LIABILITY,
    code: '2100',
    description: 'Goods and Services Tax collected from clients pending government remittance',
  },

  // --- EQUITY ---
  {
    name: "Owner's Capital / Equity",
    type: AccountType.EQUITY,
    code: '3010',
    description: 'Proprietor initial capital investment and accumulated retained profits',
  },
  {
    name: 'Owner Drawings',
    type: AccountType.EQUITY,
    code: '3020',
    description: 'Personal funds withdrawn by studio partner/owner from business accounts',
  },

  // --- REVENUE ---
  {
    name: 'Wedding & Event Photography Revenue',
    type: AccountType.REVENUE,
    code: '4010',
    description: 'Core billings from confirmed wedding assignments, candid coverage, and portraits',
  },
  {
    name: 'Cinematography & Video Production Revenue',
    type: AccountType.REVENUE,
    code: '4020',
    description: 'Revenue from cinematic teasers, wedding films, and aerial drone reels',
  },
  {
    name: 'Album Design & Fine Art Print Revenue',
    type: AccountType.REVENUE,
    code: '4030',
    description: 'Sales of physical custom flush-mount photobooks, framed prints, and canvases',
  },
  {
    name: 'Commercial & Fashion Shoot Revenue',
    type: AccountType.REVENUE,
    code: '4040',
    description: 'Corporate campaigns, commercial ads, brand shoots, and fashion lookbooks',
  },
  {
    name: 'Other Operating Income',
    type: AccountType.REVENUE,
    code: '4090',
    description: 'Rescheduling fees, raw footage retrieval charges, and miscellaneous receipts',
  },

  // --- EXPENSES ---
  {
    name: 'Freelancer & Crew Shooting Fees',
    type: AccountType.EXPENSE,
    code: '5010',
    description: 'Direct compensation for external freelance photographers, cinematographers & assistants',
  },
  {
    name: 'Post-Production & Editing Charges',
    type: AccountType.EXPENSE,
    code: '5020',
    description: 'Costs for specialized color grading, sound design, and outsourced album layout editors',
  },
  {
    name: 'Album Printing & Binding Costs',
    type: AccountType.EXPENSE,
    code: '5030',
    description: 'Direct lab printing, paper, binding, and presentation box manufacturing expenses',
  },
  {
    name: 'Equipment Rental & Sub-Leasing',
    type: AccountType.EXPENSE,
    code: '5040',
    description: 'Short-term rentals of specialized cine lenses, grip equipment, and lighting packages',
  },
  {
    name: 'Travel, Conveyance & Lodging',
    type: AccountType.EXPENSE,
    code: '5110',
    description: 'Outstation flights, train tickets, rental vehicles, and crew hotel room bookings',
  },
  {
    name: 'Studio Rent & Utilities',
    type: AccountType.EXPENSE,
    code: '5120',
    description: 'Studio lease, electricity bills, high-speed fiber internet, and workspace upkeep',
  },
  {
    name: 'Gear Maintenance & Repairs',
    type: AccountType.EXPENSE,
    code: '5130',
    description: 'Sensor cleaning, camera calibration, shutter replacements, and lens repairs',
  },
  {
    name: 'Software Subscriptions & Cloud Storage',
    type: AccountType.EXPENSE,
    code: '5140',
    description: 'Adobe Creative Cloud, Google Workspace, cloud photo gallery hosting, and ERP software',
  },
];

export class AccountingService {
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
   * Initializes standard default Chart of Accounts for a tenant studio if none exist.
   * Can run either standalone against `prisma` or within an existing transaction `client`.
   */
  static async initializeDefaultAccounts(
    tenantId: string,
    client: Prisma.TransactionClient | typeof prisma = prisma
  ) {
    const existingAccounts = await client.account.findMany({
      where: { tenantId, deletedAt: null },
      select: { name: true, code: true },
    });

    const existingNameSet = new Set(existingAccounts.map((a) => a.name.toLowerCase().trim()));
    const existingCodeSet = new Set(existingAccounts.map((a) => a.code).filter(Boolean));

    const missingDefaults = DEFAULT_CHART_OF_ACCOUNTS.filter(
      (acc) =>
        !existingNameSet.has(acc.name.toLowerCase().trim()) &&
        (!acc.code || !existingCodeSet.has(acc.code))
    );

    if (missingDefaults.length === 0) {
      return {
        success: true as const,
        message: 'All default ledgers are already configured.',
        createdCount: 0,
      };
    }

    await client.account.createMany({
      data: missingDefaults.map((acc) => ({
        tenantId,
        name: acc.name,
        type: acc.type,
        code: acc.code,
        description: acc.description,
        isDefault: true,
      })),
      skipDuplicates: true,
    });

    return {
      success: true as const,
      message: `Successfully initialized ${missingDefaults.length} default accounts.`,
      createdCount: missingDefaults.length,
    };
  }

  /**
   * Alias for initializeDefaultAccounts to seed or update Chart of Accounts.
   */
  static async seedDefaultAccounts(
    tenantId: string,
    client: Prisma.TransactionClient | typeof prisma = prisma
  ) {
    return this.initializeDefaultAccounts(tenantId, client);
  }

  /**
   * Generates a sequential voucher number with type prefix (e.g. PAY-0001, REC-0001).
   */
  private static async generateVoucherNumber(
    tx: Prisma.TransactionClient,
    tenantId: string,
    type: VoucherType
  ): Promise<string> {
    const prefixMap: Record<VoucherType, string> = {
      [VoucherType.PAYMENT]: 'PAY',
      [VoucherType.RECEIPT]: 'REC',
      [VoucherType.CONTRA]: 'CON',
      [VoucherType.JOURNAL]: 'JRN',
    };

    const prefix = prefixMap[type] || 'VOU';

    // Count existing vouchers for this tenant & type
    const count = await tx.financialVoucher.count({
      where: { tenantId, type },
    });

    let sequence = count + 1;
    let candidate = `${prefix}-${sequence.toString().padStart(4, '0')}`;

    // Verify candidate uniqueness in case of prior deletions or concurrency
    let existing = await tx.financialVoucher.findUnique({
      where: {
        tenantId_voucherNumber: {
          tenantId,
          voucherNumber: candidate,
        },
      },
    });

    while (existing) {
      sequence++;
      candidate = `${prefix}-${sequence.toString().padStart(4, '0')}`;
      existing = await tx.financialVoucher.findUnique({
        where: {
          tenantId_voucherNumber: {
            tenantId,
            voucherNumber: candidate,
          },
        },
      });
    }

    return candidate;
  }

  /**
   * Creates a double-entry financial voucher inside an atomic Prisma transaction.
   * Enforces that SUM(Debits) === SUM(Credits) with exact two-decimal precision.
   * Supports participation in an external transaction client via `params.tx`.
   */
  static async createVoucher(params: CreateVoucherParams) {
    const { tenantId, userId: actorUserId } = await this.resolveSession({
      tenantId: params.tenantId,
      userId: params.userId,
    });

    if (!params.entries || params.entries.length < 2) {
      throw new Error('A valid double-entry voucher requires at least two ledger line entries.');
    }

    const dbClient = params.tx || prisma;

    // 1. Verify accounts belong to this tenant and are active
    const accountIds = Array.from(new Set(params.entries.map((e) => e.accountId)));
    const accounts = await dbClient.account.findMany({
      where: {
        id: { in: accountIds },
        tenantId,
        deletedAt: null,
      },
    });

    if (accounts.length !== accountIds.length) {
      throw new Error('One or more selected ledger accounts do not exist or are unauthorized.');
    }

    // 2. Strict Double-Entry Validation (Debits == Credits)
    let totalDebitCents = 0;
    let totalCreditCents = 0;

    const sanitizedEntries = params.entries.map((entry, index) => {
      const num = Number(entry.amount);
      if (isNaN(num) || num <= 0) {
        throw new Error(`Entry line #${index + 1} has an invalid or non-positive amount (${entry.amount}).`);
      }

      // Convert to integer cents to guarantee exact currency equality without floating point errors
      const cents = Math.round(num * 100);

      if (entry.type === EntryType.DEBIT) {
        totalDebitCents += cents;
      } else if (entry.type === EntryType.CREDIT) {
        totalCreditCents += cents;
      } else {
        throw new Error(`Entry line #${index + 1} has an unrecognized entry type.`);
      }

      return {
        accountId: entry.accountId,
        type: entry.type,
        amount: new Prisma.Decimal(num.toFixed(2)),
      };
    });

    if (totalDebitCents !== totalCreditCents) {
      const debitFormatted = (totalDebitCents / 100).toFixed(2);
      const creditFormatted = (totalCreditCents / 100).toFixed(2);
      const diffFormatted = Math.abs((totalDebitCents - totalCreditCents) / 100).toFixed(2);
      throw new Error(
        `Double-Entry Imbalance: Total Debits (₹${debitFormatted}) must exactly equal Total Credits (₹${creditFormatted}). Out of balance by ₹${diffFormatted}.`
      );
    }

    const voucherDate = params.date ? new Date(params.date) : new Date();

    // 3. Execute atomic transaction (either via provided tx or a fresh $transaction)
    const executeOperation = async (tx: Prisma.TransactionClient) => {
      const voucherNumber = await this.generateVoucherNumber(tx, tenantId, params.type);

      const createdVoucher = await tx.financialVoucher.create({
        data: {
          tenantId,
          voucherNumber,
          date: voucherDate,
          type: params.type,
          narration: params.narration?.trim() || null,
          referenceId: params.referenceId?.trim() || null,
          entries: {
            create: sanitizedEntries.map((e) => ({
              accountId: e.accountId,
              type: e.type,
              amount: e.amount,
            })),
          },
        },
        include: {
          entries: {
            include: {
              account: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  type: true,
                },
              },
            },
          },
        },
      });

      // Audit Trail in ActivityTimeline
      await tx.activityTimeline.create({
        data: {
          tenantId,
          entityType: 'ACCOUNTING_VOUCHER',
          entityId: createdVoucher.id,
          action: 'FINANCIAL_VOUCHER_POSTED',
          notes: `Posted ${createdVoucher.type} voucher ${createdVoucher.voucherNumber} for ₹${(totalDebitCents / 100).toFixed(2)}.${createdVoucher.narration ? ` Narration: ${createdVoucher.narration}` : ''}`,
          metadata: {
            voucherId: createdVoucher.id,
            voucherNumber: createdVoucher.voucherNumber,
            type: createdVoucher.type,
            totalAmount: totalDebitCents / 100,
            referenceId: createdVoucher.referenceId,
          },
          createdById: actorUserId !== 'system' ? actorUserId : null,
        },
      });

      return createdVoucher;
    };

    const voucher = params.tx ? await executeOperation(params.tx) : await prisma.$transaction(executeOperation);
    return serializePrisma(voucher);
  }

  /**
   * Fetches double-entry vouchers with nested entries and joined ledger accounts,
   * supporting filtering by date range, voucher type, and search query.
   */
  static async getVouchers(params: GetVouchersParams) {
    const { tenantId } = await this.resolveSession({ tenantId: params.tenantId });

    const whereClause: Prisma.FinancialVoucherWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (params.type && params.type !== 'ALL') {
      whereClause.type = params.type;
    }

    if (params.startDate || params.endDate) {
      whereClause.date = {};
      if (params.startDate) {
        whereClause.date.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        // End of the day
        const endD = new Date(params.endDate);
        endD.setHours(23, 59, 59, 999);
        whereClause.date.lte = endD;
      }
    }

    if (params.referenceId) {
      whereClause.referenceId = params.referenceId;
    }

    if (params.accountId) {
      whereClause.entries = {
        some: {
          accountId: params.accountId,
        },
      };
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      whereClause.OR = [
        { voucherNumber: { contains: q, mode: 'insensitive' } },
        { narration: { contains: q, mode: 'insensitive' } },
        { referenceId: { contains: q, mode: 'insensitive' } },
        {
          entries: {
            some: {
              account: {
                name: { contains: q, mode: 'insensitive' },
              },
            },
          },
        },
      ];
    }

    const vouchers = await prisma.financialVoucher.findMany({
      where: whereClause,
      include: {
        entries: {
          include: {
            account: {
              select: {
                id: true,
                name: true,
                code: true,
                type: true,
              },
            },
          },
          orderBy: [{ type: 'asc' }, { amount: 'desc' }],
        },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });

    // Compute total amount for each voucher (SUM of Debits) and aggregate summaries
    let totalPayments = 0;
    let totalReceipts = 0;
    let totalContra = 0;
    let totalJournals = 0;

    const enrichedVouchers = vouchers.map((v) => {
      let voucherTotal = 0;
      for (const entry of v.entries) {
        if (entry.type === EntryType.DEBIT) {
          voucherTotal += Number(entry.amount);
        }
      }

      if (!v.isVoided) {
        if (v.type === VoucherType.PAYMENT) {
          totalPayments += voucherTotal;
        } else if (v.type === VoucherType.RECEIPT) {
          totalReceipts += voucherTotal;
        } else if (v.type === VoucherType.CONTRA) {
          totalContra += voucherTotal;
        } else if (v.type === VoucherType.JOURNAL) {
          totalJournals += voucherTotal;
        }
      }

      return {
        ...v,
        totalAmount: voucherTotal,
      };
    });

    const summary = {
      totalCount: enrichedVouchers.length,
      totalPayments,
      totalReceipts,
      totalContra,
      totalJournals,
    };

    return serializePrisma({
      vouchers: enrichedVouchers,
      summary,
    });
  }

  /**
   * Fetches single voucher by ID.
   */
  static async getVoucherById(voucherId: string, tenantIdOverride?: string) {
    const { tenantId } = await this.resolveSession({ tenantId: tenantIdOverride });

    const voucher = await prisma.financialVoucher.findFirst({
      where: { id: voucherId, tenantId, deletedAt: null },
      include: {
        entries: {
          include: {
            account: true,
          },
          orderBy: [{ type: 'asc' }, { amount: 'desc' }],
        },
      },
    });

    if (!voucher) {
      throw new Error('Voucher not found or unauthorized');
    }

    let voucherTotal = 0;
    for (const entry of voucher.entries) {
      if (entry.type === EntryType.DEBIT) {
        voucherTotal += Number(entry.amount);
      }
    }

    return serializePrisma({
      ...voucher,
      totalAmount: voucherTotal,
    });
  }
}
