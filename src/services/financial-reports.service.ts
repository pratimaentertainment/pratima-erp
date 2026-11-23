import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { serializePrisma } from '@/lib/serialize';
import {
  AccountType,
  EntryType,
  Prisma,
} from '@prisma/client';

export interface DateFilterParams {
  tenantId?: string;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
}

export interface BalanceSheetParams {
  tenantId?: string;
  asOfDate?: Date | string | null;
}

export class FinancialReportsService {
  /**
   * Resolves active user session and tenant context.
   */
  private static async resolveSession(overrides?: { tenantId?: string }) {
    if (overrides?.tenantId) {
      return {
        tenantId: overrides.tenantId,
        userId: 'system',
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
   * Generates a full Trial Balance statement for the studio.
   * Compiles total debits, total credits, and net closing balances for every ledger account.
   * Double-Entry Rule: Sum of Closing Debits MUST equal Sum of Closing Credits.
   */
  static async getTrialBalance(params?: DateFilterParams) {
    const { tenantId } = await this.resolveSession({ tenantId: params?.tenantId });

    // Date range filter for voucher entries
    const dateFilter: Prisma.DateTimeFilter = {};
    if (params?.startDate) {
      dateFilter.gte = new Date(params.startDate);
    }
    if (params?.endDate) {
      const endD = new Date(params.endDate);
      endD.setHours(23, 59, 59, 999);
      dateFilter.lte = endD;
    }

    const hasDateFilter = Object.keys(dateFilter).length > 0;

    // Fetch all accounts with their entries up to the date
    const accounts = await prisma.account.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        entries: {
          where: {
            voucher: {
              deletedAt: null,
              isVoided: false,
              ...(hasDateFilter ? { date: dateFilter } : {}),
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

    let totalPeriodDebit = 0;
    let totalPeriodCredit = 0;
    let totalClosingDebit = 0;
    let totalClosingCredit = 0;

    const rows = accounts.map((acc) => {
      let debitSum = 0;
      let creditSum = 0;

      for (const entry of acc.entries) {
        const amt = Number(entry.amount);
        if (entry.type === EntryType.DEBIT) {
          debitSum += amt;
        } else {
          creditSum += amt;
        }
      }

      totalPeriodDebit += debitSum;
      totalPeriodCredit += creditSum;

      let closingDebit = 0;
      let closingCredit = 0;

      if (debitSum > creditSum) {
        closingDebit = debitSum - creditSum;
      } else if (creditSum > debitSum) {
        closingCredit = creditSum - debitSum;
      }

      totalClosingDebit += closingDebit;
      totalClosingCredit += closingCredit;

      return {
        id: acc.id,
        code: acc.code || '—',
        name: acc.name,
        type: acc.type,
        isDefault: acc.isDefault,
        totalDebit: debitSum,
        totalCredit: creditSum,
        closingDebit,
        closingCredit,
        entryCount: acc.entries.length,
      };
    });

    // Check balance equality within cents tolerance
    const diff = Math.abs(totalClosingDebit - totalClosingCredit);
    const isBalanced = diff < 0.01;

    return serializePrisma({
      reportTitle: 'Trial Balance Statement',
      asOfDate: params?.endDate ? new Date(params.endDate).toISOString() : new Date().toISOString(),
      isBalanced,
      totalPeriodDebit,
      totalPeriodCredit,
      totalClosingDebit,
      totalClosingCredit,
      difference: diff,
      rows,
      accountsCount: accounts.length,
    });
  }

  /**
   * Generates Profit & Loss Statement (Income Statement) for a financial period.
   * Categorizes:
   *   - Operating Revenue
   *   - Direct Production Costs (Cost of Goods Sold) -> Gross Profit
   *   - Overhead & Operating Expenses -> Net Profit
   */
  static async getProfitAndLoss(params?: DateFilterParams) {
    const { tenantId } = await this.resolveSession({ tenantId: params?.tenantId });

    const dateFilter: Prisma.DateTimeFilter = {};
    if (params?.startDate) {
      dateFilter.gte = new Date(params.startDate);
    }
    if (params?.endDate) {
      const endD = new Date(params.endDate);
      endD.setHours(23, 59, 59, 999);
      dateFilter.lte = endD;
    }

    const hasDateFilter = Object.keys(dateFilter).length > 0;

    const accounts = await prisma.account.findMany({
      where: {
        tenantId,
        type: { in: [AccountType.REVENUE, AccountType.EXPENSE] },
        deletedAt: null,
      },
      include: {
        entries: {
          where: {
            voucher: {
              deletedAt: null,
              isVoided: false,
              ...(hasDateFilter ? { date: dateFilter } : {}),
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

    const revenueItems: Array<{ id: string; code: string; name: string; amount: number }> = [];
    const directExpenseItems: Array<{ id: string; code: string; name: string; amount: number }> = [];
    const operatingExpenseItems: Array<{ id: string; code: string; name: string; amount: number }> = [];

    // Common keywords identifying direct shoot/production costs vs. office overheads
    const directExpenseKeywords = [
      'freelancer',
      'crew',
      'editing',
      'print',
      'lab',
      'bind',
      'rental',
      'sub-leasing',
      'shooting fee',
    ];

    for (const acc of accounts) {
      let debitSum = 0;
      let creditSum = 0;

      for (const entry of acc.entries) {
        const amt = Number(entry.amount);
        if (entry.type === EntryType.DEBIT) {
          debitSum += amt;
        } else {
          creditSum += amt;
        }
      }

      if (acc.type === AccountType.REVENUE) {
        // Revenue normal balance = Credit - Debit
        const netRev = creditSum - debitSum;
        revenueItems.push({
          id: acc.id,
          code: acc.code || '—',
          name: acc.name,
          amount: netRev,
        });
      } else if (acc.type === AccountType.EXPENSE) {
        // Expense normal balance = Debit - Credit
        const netExp = debitSum - creditSum;
        const lowerName = acc.name.toLowerCase();
        const isDirect = directExpenseKeywords.some((k) => lowerName.includes(k));

        if (isDirect) {
          directExpenseItems.push({
            id: acc.id,
            code: acc.code || '—',
            name: acc.name,
            amount: netExp,
          });
        } else {
          operatingExpenseItems.push({
            id: acc.id,
            code: acc.code || '—',
            name: acc.name,
            amount: netExp,
          });
        }
      }
    }

    const totalRevenue = revenueItems.reduce((sum, i) => sum + i.amount, 0);
    const totalDirectExpenses = directExpenseItems.reduce((sum, i) => sum + i.amount, 0);
    const grossProfit = totalRevenue - totalDirectExpenses;
    const grossMarginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    const totalOperatingExpenses = operatingExpenseItems.reduce((sum, i) => sum + i.amount, 0);
    const totalExpenses = totalDirectExpenses + totalOperatingExpenses;
    const netProfit = totalRevenue - totalExpenses;
    const netMarginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return serializePrisma({
      reportTitle: 'Profit & Loss Statement (Income Statement)',
      startDate: params?.startDate ? new Date(params.startDate).toISOString() : null,
      endDate: params?.endDate ? new Date(params.endDate).toISOString() : new Date().toISOString(),
      revenueItems,
      totalRevenue,
      directExpenseItems,
      totalDirectExpenses,
      grossProfit,
      grossMarginPercent,
      operatingExpenseItems,
      totalOperatingExpenses,
      totalExpenses,
      netProfit,
      netMarginPercent,
    });
  }

  /**
   * Generates Balance Sheet statement as of a specific date.
   * Verifies the fundamental accounting equation:
   *   Total Assets = Total Liabilities + Total Equity (including Net Retained Earnings to date)
   */
  static async getBalanceSheet(params?: BalanceSheetParams) {
    const { tenantId } = await this.resolveSession({ tenantId: params?.tenantId });

    const asOf = params?.asOfDate ? new Date(params.asOfDate) : new Date();
    asOf.setHours(23, 59, 59, 999);

    // 1. Fetch all accounts with their cumulative entries up to asOf
    const accounts = await prisma.account.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        entries: {
          where: {
            voucher: {
              deletedAt: null,
              isVoided: false,
              date: { lte: asOf },
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

    const currentAssets: Array<{ id: string; code: string; name: string; amount: number }> = [];
    const fixedAssets: Array<{ id: string; code: string; name: string; amount: number }> = [];
    const currentLiabilities: Array<{ id: string; code: string; name: string; amount: number }> = [];
    const equityItems: Array<{ id: string; code: string; name: string; amount: number }> = [];

    let cumulativeRevenue = 0;
    let cumulativeExpenses = 0;

    for (const acc of accounts) {
      let debitSum = 0;
      let creditSum = 0;

      for (const entry of acc.entries) {
        const amt = Number(entry.amount);
        if (entry.type === EntryType.DEBIT) {
          debitSum += amt;
        } else {
          creditSum += amt;
        }
      }

      if (acc.type === AccountType.ASSET) {
        const netAsset = debitSum - creditSum;
        const lowerName = acc.name.toLowerCase();
        const isFixed = lowerName.includes('equipment') || lowerName.includes('camera') || lowerName.includes('fixed') || lowerName.includes('capital');
        if (isFixed) {
          fixedAssets.push({ id: acc.id, code: acc.code || '—', name: acc.name, amount: netAsset });
        } else {
          currentAssets.push({ id: acc.id, code: acc.code || '—', name: acc.name, amount: netAsset });
        }
      } else if (acc.type === AccountType.LIABILITY) {
        const netLiability = creditSum - debitSum;
        currentLiabilities.push({ id: acc.id, code: acc.code || '—', name: acc.name, amount: netLiability });
      } else if (acc.type === AccountType.EQUITY) {
        const isDrawings = acc.name.toLowerCase().includes('drawing');
        const netEquity = isDrawings ? -(debitSum - creditSum) : creditSum - debitSum;
        equityItems.push({ id: acc.id, code: acc.code || '—', name: acc.name, amount: netEquity });
      } else if (acc.type === AccountType.REVENUE) {
        cumulativeRevenue += creditSum - debitSum;
      } else if (acc.type === AccountType.EXPENSE) {
        cumulativeExpenses += debitSum - creditSum;
      }
    }

    const netRetainedProfit = cumulativeRevenue - cumulativeExpenses;

    const totalCurrentAssets = currentAssets.reduce((sum, a) => sum + a.amount, 0);
    const totalFixedAssets = fixedAssets.reduce((sum, a) => sum + a.amount, 0);
    const totalAssets = totalCurrentAssets + totalFixedAssets;

    const totalLiabilities = currentLiabilities.reduce((sum, l) => sum + l.amount, 0);
    const totalEquityWithoutProfit = equityItems.reduce((sum, e) => sum + e.amount, 0);
    const totalEquity = totalEquityWithoutProfit + netRetainedProfit;

    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
    const difference = Math.abs(totalAssets - totalLiabilitiesAndEquity);
    const isBalanced = difference < 0.05;

    return serializePrisma({
      reportTitle: 'Balance Sheet Statement',
      asOfDate: asOf.toISOString(),
      isBalanced,
      difference,
      currentAssets,
      totalCurrentAssets,
      fixedAssets,
      totalFixedAssets,
      totalAssets,
      currentLiabilities,
      totalLiabilities,
      equityItems,
      totalEquityWithoutProfit,
      netRetainedProfit,
      totalEquity,
      totalLiabilitiesAndEquity,
    });
  }
}
