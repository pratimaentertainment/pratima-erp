import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { getActiveContext } from '@/lib/context';
import { serializePrisma } from '@/lib/serialize';
import { redirect } from 'next/navigation';
import {
  AccountType,
  EntryType,
  LeadStatus,
  PostProductionStatus,
  InvoiceStatus,
  EventBookingStatus,
  TaskStatus,
} from '@prisma/client';

export interface OverdueInvoiceItem {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  balanceDue: number;
  grandTotal: number;
  dueDate: Date | string | null;
  daysOverdue: number;
}

export interface FinancialMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  pendingReceivables: number;
  agedAR: {
    current: number; // 0-30 days
    days31to60: number; // 31-60 days
    over60: number; // 60+ days
  };
  overdueInvoices: OverdueInvoiceItem[];
}

export interface MonthlyRevenueTrend {
  monthKey: string;
  month: string;
  shortMonth: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface UpcomingShootItem {
  id: string;
  bookingNumber: string;
  title: string;
  startDate: Date | string;
  endDate: Date | string;
  location: string;
  status: string;
  customerName: string;
  customerPhone: string;
  crewCount: number;
  crewNames: string[];
}

export interface RiskShootItem {
  id: string;
  bookingNumber: string;
  title: string;
  startDate: Date | string;
  endDate: Date | string;
  location: string;
  customerName: string;
}

export interface RiskTaskItem {
  id: string;
  type: string;
  taskType: string | null;
  status: string;
  dueDate: Date | string | null;
  bookingTitle: string;
  bookingNumber: string;
  assignedToName: string;
}

export interface OperationalRiskMetrics {
  shootsMissingCrewCount: number;
  shootsMissingGearCount: number;
  overdueTasksCount: number;
  shootsMissingCrew: RiskShootItem[];
  shootsMissingGear: RiskShootItem[];
  overdueTasks: RiskTaskItem[];
}

export interface StaffShootItem {
  id: string;
  bookingNumber: string;
  title: string;
  startDate: Date | string;
  endDate: Date | string;
  location: string;
  status: string;
  customerName: string;
  customerPhone: string;
  myRole: string;
  payoutStatus?: string;
}

export interface StaffTaskItem {
  id: string;
  type: string;
  taskType: string | null;
  status: string;
  dueDate: Date | string | null;
  bookingTitle: string;
  bookingNumber: string;
  notes: string | null;
}

export interface StaffFollowUpItem {
  id: string;
  leadName: string;
  leadPhone: string;
  eventType: string | null;
  followUpDate: Date | string;
  type: string;
  status: string;
}

export interface StaffDashboardData {
  myShoots: StaffShootItem[];
  myTasks: StaffTaskItem[];
  myFollowUps: StaffFollowUpItem[];
  stats: {
    totalShoots: number;
    pendingTasks: number;
    pendingFollowUps: number;
  };
}

export interface RecentActivityItem {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  notes: string | null;
  createdAt: Date | string;
  performedBy: string;
  performedByEmail: string | null;
}

export interface OwnerDashboardData {
  isExecutive: boolean;
  financials?: FinancialMetrics;
  revenueTrend?: MonthlyRevenueTrend[];
  risks?: OperationalRiskMetrics;
  sales: {
    activeLeads: number;
    totalLeads: number;
    wonLeads: number;
  };
  operations: {
    upcomingShoots: UpcomingShootItem[];
    totalUpcoming: number;
  };
  pendingEdits: {
    count: number;
  };
  recentActivity: RecentActivityItem[];
  staffData?: StaffDashboardData;
}

export interface SessionContext {
  tenantId: string;
  userId: string;
  branchId: string | null;
  isSuperAdmin: boolean;
  isExecutive: boolean;
  userName?: string;
  role?: string;
  roles?: string[];
}

export class DashboardService {
  /**
   * Resolves active user session, tenant context, and evaluates role-based executive permissions.
   */
  static async validateSession(): Promise<SessionContext> {
    const session = await auth();
    const user = session?.user as any;
    if (!user) {
      redirect('/login');
    }

    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    if (!user?.tenantId && !isSuperAdmin) {
      redirect('/setup');
    }

    let branchId: string | null = null;
    try {
      const context = await getActiveContext();
      branchId = context?.activeBranch?.id || null;
    } catch {
      branchId = null;
    }

    const userId = (user.id as string) || '';
    const systemRole = (user.role || '').toUpperCase();

    // Query tenant roles assigned to user to properly identify accountants & finance managers
    let assignedRoleNames: string[] = [];
    if (userId) {
      try {
        const userRoles = await prisma.userRole.findMany({
          where: { userId },
          include: { role: true },
        });
        assignedRoleNames = userRoles.map((ur) => ur.role.name.toUpperCase());
      } catch (err) {
        console.error('[DashboardService] Error fetching user roles:', err);
      }
    }

    const allRoles = [systemRole, ...assignedRoleNames].filter(Boolean);
    const executiveRoleSet = new Set([
      'SUPER_ADMIN',
      'TENANT_OWNER',
      'ADMIN',
      'ACCOUNTANT',
      'FINANCE',
      'FINANCE_MANAGER',
    ]);

    const isExecutive = isSuperAdmin || allRoles.some((r) => executiveRoleSet.has(r));

    return {
      tenantId: (user.tenantId as string) || '',
      userId,
      branchId,
      isSuperAdmin,
      isExecutive,
      userName: user.name as string,
      role: systemRole,
      roles: assignedRoleNames,
    };
  }

  /**
   * Generates Role-Gated 360-Degree Master Command Center Metrics.
   * Executive roles receive complete double-entry financials, aged AR, and operational risk telemetry.
   * Staff roles receive only personal operations (assigned shoots, post-production queue, and follow-ups).
   */
  static async getOwnerDashboardMetrics(context?: Partial<SessionContext>): Promise<OwnerDashboardData> {
    // Strictly resolve session to eliminate cross-tenant override vulnerabilities
    const session = await this.validateSession();
    const tenantId = context?.tenantId && session.isSuperAdmin ? context.tenantId : session.tenantId;
    const userId = session.userId;
    const isExecutive = session.isExecutive;

    // Zero-state fallback if no tenant exists (e.g. unassigned SUPER_ADMIN)
    if (!tenantId) {
      return {
        isExecutive: false,
        sales: { activeLeads: 0, totalLeads: 0, wonLeads: 0 },
        operations: { upcomingShoots: [], totalUpcoming: 0 },
        pendingEdits: { count: 0 },
        recentActivity: [],
      };
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const fourteenDaysLater = new Date(todayStart.getTime() + 14 * 24 * 60 * 60 * 1000);
    fourteenDaysLater.setHours(23, 59, 59, 999);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);

    // -------------------------------------------------------------------------
    // 1. BASE OPERATIONAL & PIPELINE METRICS (Shared)
    // -------------------------------------------------------------------------
    const [
      activeLeadsCount,
      totalLeadsCount,
      wonLeadsCount,
      upcomingBookings,
      totalUpcomingCount,
      pendingEditsCount,
      // Staff personal workspace queries
      myAssignedShoots,
      myAssignedTasks,
      myAssignedFollowUps,
      myShootsCount,
      myTasksCount,
      myFollowUpsCount,
    ] = await Promise.all([
      // Active Leads
      prisma.lead.count({
        where: {
          tenantId,
          deletedAt: null,
          status: {
            in: [
              LeadStatus.NEW,
              LeadStatus.QUALIFIED,
              LeadStatus.QUOTATION_SENT,
              LeadStatus.NEGOTIATION,
            ],
          },
        },
      }),

      // Total Leads
      prisma.lead.count({
        where: { tenantId, deletedAt: null },
      }),

      // Won Leads
      prisma.lead.count({
        where: { tenantId, deletedAt: null, status: LeadStatus.WON },
      }),

      // Next 14 Days Event Bookings (Limit 6 for performance, excluding cancelled)
      prisma.eventBooking.findMany({
        where: {
          tenantId,
          deletedAt: null,
          status: { not: EventBookingStatus.CANCELLED },
          startDate: {
            gte: todayStart,
            lte: fourteenDaysLater,
          },
        },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          assignments: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          startDate: 'asc',
        },
        take: 6,
      }),

      // Total upcoming shoots in the 14-day window
      prisma.eventBooking.count({
        where: {
          tenantId,
          deletedAt: null,
          status: { not: EventBookingStatus.CANCELLED },
          startDate: {
            gte: todayStart,
            lte: fourteenDaysLater,
          },
        },
      }),

      // Pending Post-Production Jobs (status != DELIVERED)
      prisma.postProductionJob.count({
        where: {
          tenantId,
          deletedAt: null,
          status: { not: PostProductionStatus.DELIVERED },
        },
      }),

      // Staff Workspace: My Assigned Shoots
      userId
        ? prisma.eventBooking.findMany({
            where: {
              tenantId,
              deletedAt: null,
              status: { not: EventBookingStatus.CANCELLED },
              startDate: { gte: todayStart },
              assignments: { some: { userId } },
            },
            select: {
              id: true,
              bookingNumber: true,
              title: true,
              startDate: true,
              endDate: true,
              location: true,
              status: true,
              customer: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
              assignments: {
                where: { userId },
                select: { role: true, payoutStatus: true },
              },
            },
            take: 6,
            orderBy: { startDate: 'asc' },
          })
        : Promise.resolve([]),

      // Staff Workspace: My Workflow Tasks
      userId
        ? prisma.workflowTask.findMany({
            where: {
              tenantId,
              deletedAt: null,
              assignedTo: userId,
              status: { notIn: [TaskStatus.COMPLETED, TaskStatus.APPROVED] },
            },
            include: {
              eventBooking: {
                select: { id: true, title: true, bookingNumber: true },
              },
            },
            take: 6,
            orderBy: { dueDate: 'asc' },
          })
        : Promise.resolve([]),

      // Staff Workspace: My Follow-Up Calls
      userId
        ? prisma.followUp.findMany({
            where: {
              tenantId,
              deletedAt: null,
              assignedToId: userId,
              status: 'PENDING',
            },
            include: {
              lead: {
                select: {
                  id: true,
                  leadCode: true,
                  customer: {
                    select: {
                      firstName: true,
                      lastName: true,
                      phone: true,
                    },
                  },
                },
              },
            },
            take: 6,
            orderBy: { followUpDate: 'asc' },
          })
        : Promise.resolve([]),

      // Counts for Staff Workspace stats
      userId
        ? prisma.eventBooking.count({
            where: {
              tenantId,
              deletedAt: null,
              status: { not: EventBookingStatus.CANCELLED },
              startDate: { gte: todayStart },
              assignments: { some: { userId } },
            },
          })
        : Promise.resolve(0),

      userId
        ? prisma.workflowTask.count({
            where: {
              tenantId,
              deletedAt: null,
              assignedTo: userId,
              status: { notIn: [TaskStatus.COMPLETED, TaskStatus.APPROVED] },
            },
          })
        : Promise.resolve(0),

      userId
        ? prisma.followUp.count({
            where: {
              tenantId,
              deletedAt: null,
              assignedToId: userId,
              status: 'PENDING',
            },
          })
        : Promise.resolve(0),
    ]);

    // Format upcoming shoots
    const upcomingShoots: UpcomingShootItem[] = upcomingBookings.map((b) => {
      const customerFullName = b.customer
        ? `${b.customer.firstName || ''} ${b.customer.lastName || ''}`.trim() || 'Client'
        : 'Walk-in Client';
      const crewNames = b.assignments
        .map((a) => a.user?.name)
        .filter(Boolean) as string[];

      return {
        id: b.id,
        bookingNumber: b.bookingNumber,
        title: b.title || 'Wedding & Reception Shoot',
        startDate: b.startDate,
        endDate: b.endDate,
        location: b.location || 'Studio / Designated Venue',
        status: b.status,
        customerName: customerFullName,
        customerPhone: b.customer?.phone || 'N/A',
        crewCount: b.assignments.length,
        crewNames,
      };
    });

    // Format staff personal workspace items
    const staffData: StaffDashboardData = {
      myShoots: (myAssignedShoots as any[]).map((b) => ({
        id: b.id,
        bookingNumber: b.bookingNumber,
        title: b.title || 'Assigned Shoot',
        startDate: b.startDate,
        endDate: b.endDate,
        location: b.location || 'Studio / Venue',
        status: b.status,
        customerName: b.customer
          ? `${b.customer.firstName || ''} ${b.customer.lastName || ''}`.trim() || 'Client'
          : 'Client',
        customerPhone: b.customer?.phone || 'N/A',
        myRole: b.assignments?.[0]?.role || 'Crew Member',
        payoutStatus: b.assignments?.[0]?.payoutStatus || 'PENDING',
      })),
      myTasks: (myAssignedTasks as any[]).map((t) => ({
        id: t.id,
        type: t.type,
        taskType: t.taskType,
        status: t.status,
        dueDate: t.dueDate,
        bookingTitle: t.eventBooking?.title || 'Production Event',
        bookingNumber: t.eventBooking?.bookingNumber || 'BK',
        notes: t.notes,
      })),
      myFollowUps: (myAssignedFollowUps as any[]).map((f) => {
        const cust = f.lead?.customer;
        const name = cust
          ? `${cust.firstName || ''} ${cust.lastName || ''}`.trim() || 'Inquiry Contact'
          : 'Inquiry Contact';
        return {
          id: f.id,
          leadName: name,
          leadPhone: cust?.phone || 'N/A',
          eventType: f.lead?.leadCode ? `Lead #${f.lead.leadCode}` : null,
          followUpDate: f.followUpDate,
          type: f.type,
          status: f.status,
        };
      }),
      stats: {
        totalShoots: myShootsCount,
        pendingTasks: myTasksCount,
        pendingFollowUps: myFollowUpsCount,
      },
    };

    // -------------------------------------------------------------------------
    // 2. RESTRICTED STAFF VIEW: ZERO FINANCIAL LEAKAGE
    // -------------------------------------------------------------------------
    if (!isExecutive) {
      return serializePrisma({
        isExecutive: false,
        sales: {
          activeLeads: activeLeadsCount,
          totalLeads: totalLeadsCount,
          wonLeads: wonLeadsCount,
        },
        operations: {
          upcomingShoots,
          totalUpcoming: totalUpcomingCount,
        },
        pendingEdits: {
          count: pendingEditsCount,
        },
        recentActivity: [],
        staffData,
      });
    }

    // -------------------------------------------------------------------------
    // 3. EXECUTIVE 360-DEGREE VIEW: OPTIMIZED DOUBLE-ENTRY & RISK RADAR
    // -------------------------------------------------------------------------
    const [
      // Double-entry Revenue Aggregates (isVoided: false, deletedAt: null)
      revCreditsAgg,
      revDebitsAgg,

      // Double-entry Expense Aggregates
      expDebitsAgg,
      expCreditsAgg,

      // Standardized Accounts Receivable Account Code '1100'
      arAccount,

      // Open Invoices for Reconciled Balance Due & Aging Breakdown
      openInvoices,

      // 6-Month Trend Voucher Entries
      trendVoucherEntries,

      // Operational Risk: Shoots in next 14 days missing crew (assignments: none)
      shootsMissingCrew,
      shootsMissingCrewCount,

      // Operational Risk: Shoots in next 14 days missing gear (allocations: none)
      shootsMissingGear,
      shootsMissingGearCount,

      // Operational Risk: Overdue post-production workflow tasks (dueDate < now)
      overdueTasks,
      overdueTasksCount,

      // 6 Most Recent Audit Timeline Actions
      recentTimeline,
    ] = await Promise.all([
      // REVENUE: Normal balance is Credit (Credits - Debits)
      prisma.voucherEntry.aggregate({
        where: {
          voucher: { tenantId, isVoided: false, deletedAt: null },
          account: { tenantId, deletedAt: null, type: AccountType.REVENUE },
          type: EntryType.CREDIT,
        },
        _sum: { amount: true },
      }),
      prisma.voucherEntry.aggregate({
        where: {
          voucher: { tenantId, isVoided: false, deletedAt: null },
          account: { tenantId, deletedAt: null, type: AccountType.REVENUE },
          type: EntryType.DEBIT,
        },
        _sum: { amount: true },
      }),

      // EXPENSE: Normal balance is Debit (Debits - Credits)
      prisma.voucherEntry.aggregate({
        where: {
          voucher: { tenantId, isVoided: false, deletedAt: null },
          account: { tenantId, deletedAt: null, type: AccountType.EXPENSE },
          type: EntryType.DEBIT,
        },
        _sum: { amount: true },
      }),
      prisma.voucherEntry.aggregate({
        where: {
          voucher: { tenantId, isVoided: false, deletedAt: null },
          account: { tenantId, deletedAt: null, type: AccountType.EXPENSE },
          type: EntryType.CREDIT,
        },
        _sum: { amount: true },
      }),

      // Accounts Receivable Account: Code '1100'
      prisma.account.findFirst({
        where: {
          tenantId,
          deletedAt: null,
          code: '1100',
        },
        select: { id: true },
      }),

      // Open Invoices with outstanding balance
      prisma.invoice.findMany({
        where: {
          tenantId,
          deletedAt: null,
          status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] },
          balanceDue: { gt: 0 },
        },
        select: {
          id: true,
          invoiceNumber: true,
          grandTotal: true,
          paidAmount: true,
          balanceDue: true,
          dueDate: true,
          issueDate: true,
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
        orderBy: { dueDate: 'asc' },
      }),

      // 6-Month Voucher Entries for Trend Calculation
      prisma.voucherEntry.findMany({
        where: {
          voucher: {
            tenantId,
            isVoided: false,
            deletedAt: null,
            date: { gte: sixMonthsAgo },
          },
          account: {
            tenantId,
            deletedAt: null,
            type: { in: [AccountType.REVENUE, AccountType.EXPENSE] },
          },
        },
        select: {
          type: true,
          amount: true,
          account: {
            select: { type: true },
          },
          voucher: {
            select: { date: true },
          },
        },
      }),

      // Shoots Missing Crew (next 14 days)
      prisma.eventBooking.findMany({
        where: {
          tenantId,
          deletedAt: null,
          status: { not: EventBookingStatus.CANCELLED },
          startDate: { gte: todayStart, lte: fourteenDaysLater },
          assignments: { none: {} },
        },
        select: {
          id: true,
          bookingNumber: true,
          title: true,
          startDate: true,
          endDate: true,
          location: true,
          customer: { select: { firstName: true, lastName: true } },
        },
        take: 5,
        orderBy: { startDate: 'asc' },
      }),
      prisma.eventBooking.count({
        where: {
          tenantId,
          deletedAt: null,
          status: { not: EventBookingStatus.CANCELLED },
          startDate: { gte: todayStart, lte: fourteenDaysLater },
          assignments: { none: {} },
        },
      }),

      // Shoots Missing Gear (next 14 days)
      prisma.eventBooking.findMany({
        where: {
          tenantId,
          deletedAt: null,
          status: { not: EventBookingStatus.CANCELLED },
          startDate: { gte: todayStart, lte: fourteenDaysLater },
          shootGearAllocations: { none: {} },
        },
        select: {
          id: true,
          bookingNumber: true,
          title: true,
          startDate: true,
          endDate: true,
          location: true,
          customer: { select: { firstName: true, lastName: true } },
        },
        take: 5,
        orderBy: { startDate: 'asc' },
      }),
      prisma.eventBooking.count({
        where: {
          tenantId,
          deletedAt: null,
          status: { not: EventBookingStatus.CANCELLED },
          startDate: { gte: todayStart, lte: fourteenDaysLater },
          shootGearAllocations: { none: {} },
        },
      }),

      // Overdue Post-Production Workflow Tasks
      prisma.workflowTask.findMany({
        where: {
          tenantId,
          deletedAt: null,
          status: { notIn: [TaskStatus.COMPLETED, TaskStatus.APPROVED] },
          dueDate: { lt: now },
        },
        include: {
          eventBooking: { select: { id: true, title: true, bookingNumber: true } },
          user: { select: { id: true, name: true } },
        },
        take: 5,
        orderBy: { dueDate: 'asc' },
      }),
      prisma.workflowTask.count({
        where: {
          tenantId,
          deletedAt: null,
          status: { notIn: [TaskStatus.COMPLETED, TaskStatus.APPROVED] },
          dueDate: { lt: now },
        },
      }),

      // 6 Most Recent Activity Records
      prisma.activityTimeline.findMany({
        where: { tenantId },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 6,
      }),
    ]);

    // ----------------------------------------------------
    // COMPUTE REVENUE & EXPENSES
    // ----------------------------------------------------
    const revCreditSum = Number(revCreditsAgg._sum.amount || 0);
    const revDebitSum = Number(revDebitsAgg._sum.amount || 0);
    const totalRevenue = Math.max(0, revCreditSum - revDebitSum);

    const expDebitSum = Number(expDebitsAgg._sum.amount || 0);
    const expCreditSum = Number(expCreditsAgg._sum.amount || 0);
    const totalExpenses = Math.max(0, expDebitSum - expCreditSum);

    const netProfit = totalRevenue - totalExpenses;

    // ----------------------------------------------------
    // COMPUTE ACCOUNTS RECEIVABLE (LEDGER 1100 + OPEN INVOICES)
    // ----------------------------------------------------
    let arVoucherBalance = 0;
    if (arAccount) {
      const [arDebits, arCredits] = await Promise.all([
        prisma.voucherEntry.aggregate({
          where: {
            accountId: arAccount.id,
            voucher: { tenantId, isVoided: false, deletedAt: null },
            type: EntryType.DEBIT,
          },
          _sum: { amount: true },
        }),
        prisma.voucherEntry.aggregate({
          where: {
            accountId: arAccount.id,
            voucher: { tenantId, isVoided: false, deletedAt: null },
            type: EntryType.CREDIT,
          },
          _sum: { amount: true },
        }),
      ]);
      arVoucherBalance = Number(arDebits._sum.amount || 0) - Number(arCredits._sum.amount || 0);
    }

    // ----------------------------------------------------
    // COMPUTE AGED AR (0-30, 31-60, 60+ DAYS) & OVERDUE INVOICES
    // ----------------------------------------------------
    let agedCurrent = 0;
    let aged31to60 = 0;
    let agedOver60 = 0;
    let invoiceBalanceDueSum = 0;
    const overdueInvoicesList: OverdueInvoiceItem[] = [];

    for (const inv of openInvoices) {
      const balance = Number(inv.balanceDue || 0);
      invoiceBalanceDueSum += balance;

      const due = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.issueDate);
      const diffMs = now.getTime() - due.getTime();
      const daysOverdue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

      if (daysOverdue <= 30) {
        agedCurrent += balance;
      } else if (daysOverdue <= 60) {
        aged31to60 += balance;
      } else {
        agedOver60 += balance;
      }

      if (diffMs > 0) {
        const custName = inv.customer
          ? `${inv.customer.firstName || ''} ${inv.customer.lastName || ''}`.trim() || 'Client'
          : 'Client';
        overdueInvoicesList.push({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          customerName: custName,
          customerPhone: inv.customer?.phone || 'N/A',
          balanceDue: balance,
          grandTotal: Number(inv.grandTotal || 0),
          dueDate: inv.dueDate,
          daysOverdue,
        });
      }
    }

    // Pending Receivables reconciled
    const pendingReceivables = Math.max(
      arVoucherBalance > 0 ? arVoucherBalance : 0,
      invoiceBalanceDueSum
    );

    // Sort overdue invoices by days overdue descending and take top 5
    overdueInvoicesList.sort((a, b) => b.daysOverdue - a.daysOverdue);
    const top5OverdueInvoices = overdueInvoicesList.slice(0, 5);

    // ----------------------------------------------------
    // COMPUTE 6-MONTH REVENUE TREND
    // ----------------------------------------------------
    const monthBuckets: Record<
      string,
      { month: string; shortMonth: string; revenue: number; expenses: number }
    > = {};

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const shortMonthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthBuckets[key] = {
        month: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
        shortMonth: shortMonthNames[d.getMonth()],
        revenue: 0,
        expenses: 0,
      };
    }

    for (const entry of trendVoucherEntries) {
      if (!entry.voucher?.date) continue;
      const d = new Date(entry.voucher.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthBuckets[key]) {
        const amt = Number(entry.amount || 0);
        if (entry.account.type === AccountType.REVENUE) {
          if (entry.type === EntryType.CREDIT) {
            monthBuckets[key].revenue += amt;
          } else {
            monthBuckets[key].revenue -= amt;
          }
        } else if (entry.account.type === AccountType.EXPENSE) {
          if (entry.type === EntryType.DEBIT) {
            monthBuckets[key].expenses += amt;
          } else {
            monthBuckets[key].expenses -= amt;
          }
        }
      }
    }

    const revenueTrend: MonthlyRevenueTrend[] = Object.entries(monthBuckets).map(
      ([monthKey, val]) => ({
        monthKey,
        month: val.month,
        shortMonth: val.shortMonth,
        revenue: Math.max(0, val.revenue),
        expenses: Math.max(0, val.expenses),
        profit: val.revenue - val.expenses,
      })
    );

    // ----------------------------------------------------
    // FORMAT RISKS & RECENT ACTIVITIES
    // ----------------------------------------------------
    const formattedRisks: OperationalRiskMetrics = {
      shootsMissingCrewCount,
      shootsMissingGearCount,
      overdueTasksCount,
      shootsMissingCrew: shootsMissingCrew.map((s) => ({
        id: s.id,
        bookingNumber: s.bookingNumber,
        title: s.title || 'Studio Production',
        startDate: s.startDate,
        endDate: s.endDate,
        location: s.location || 'Studio / Venue',
        customerName: s.customer
          ? `${s.customer.firstName || ''} ${s.customer.lastName || ''}`.trim() || 'Client'
          : 'Client',
      })),
      shootsMissingGear: shootsMissingGear.map((s) => ({
        id: s.id,
        bookingNumber: s.bookingNumber,
        title: s.title || 'Studio Production',
        startDate: s.startDate,
        endDate: s.endDate,
        location: s.location || 'Studio / Venue',
        customerName: s.customer
          ? `${s.customer.firstName || ''} ${s.customer.lastName || ''}`.trim() || 'Client'
          : 'Client',
      })),
      overdueTasks: overdueTasks.map((t) => ({
        id: t.id,
        type: t.type,
        taskType: t.taskType,
        status: t.status,
        dueDate: t.dueDate,
        bookingTitle: t.eventBooking?.title || 'Event Deliverables',
        bookingNumber: t.eventBooking?.bookingNumber || 'BK',
        assignedToName: t.user?.name || 'Unassigned',
      })),
    };

    const recentActivity: RecentActivityItem[] = recentTimeline.map((item) => ({
      id: item.id,
      entityType: item.entityType,
      entityId: item.entityId,
      action: item.action,
      notes: item.notes,
      createdAt: item.createdAt,
      performedBy: item.createdBy?.name || item.createdBy?.email || 'Studio Staff',
      performedByEmail: item.createdBy?.email || null,
    }));

    return serializePrisma({
      isExecutive: true,
      financials: {
        totalRevenue,
        totalExpenses,
        netProfit,
        pendingReceivables,
        agedAR: {
          current: agedCurrent,
          days31to60: aged31to60,
          over60: agedOver60,
        },
        overdueInvoices: top5OverdueInvoices,
      },
      revenueTrend,
      risks: formattedRisks,
      sales: {
        activeLeads: activeLeadsCount,
        totalLeads: totalLeadsCount,
        wonLeads: wonLeadsCount,
      },
      operations: {
        upcomingShoots,
        totalUpcoming: totalUpcomingCount,
      },
      pendingEdits: {
        count: pendingEditsCount,
      },
      recentActivity,
      staffData,
    });
  }

  /**
   * Follow-Up Metrics query for conversion pipeline tracking.
   */
  static async getMetrics(ctx?: { tenantId?: string; branchId?: string | null }) {
    let tenantId = ctx?.tenantId;
    let branchId = ctx?.branchId;

    if (!tenantId) {
      const sessionData = await this.validateSession();
      tenantId = sessionData.tenantId;
      branchId = sessionData.branchId;
    }

    if (!tenantId) {
      return {
        todaysFollowUps: 0,
        overdueFollowUps: 0,
        upcomingFollowUps: 0,
        completedToday: 0,
        missedFollowUps: 0,
      };
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const baseWhere: any = {
      tenantId,
      ...(branchId ? { branchId } : {}),
      deletedAt: null,
    };

    const [
      todaysFollowUps,
      overdueFollowUps,
      upcomingFollowUps,
      completedToday,
      missedFollowUps,
    ] = await Promise.all([
      prisma.followUp.count({
        where: {
          ...baseWhere,
          followUpDate: { gte: todayStart, lte: todayEnd },
          status: 'PENDING',
        },
      }),
      prisma.followUp.count({
        where: {
          ...baseWhere,
          followUpDate: { lt: todayStart },
          status: 'PENDING',
        },
      }),
      prisma.followUp.count({
        where: {
          ...baseWhere,
          followUpDate: { gt: todayEnd, lte: sevenDaysFromNow },
          status: 'PENDING',
        },
      }),
      prisma.followUp.count({
        where: {
          ...baseWhere,
          updatedAt: { gte: todayStart, lte: todayEnd },
          status: 'COMPLETED',
        },
      }),
      prisma.followUp.count({
        where: {
          ...baseWhere,
          followUpDate: { lt: todayStart },
          status: 'PENDING',
        },
      }),
    ]);

    return {
      todaysFollowUps,
      overdueFollowUps,
      upcomingFollowUps,
      completedToday,
      missedFollowUps,
    };
  }
}
