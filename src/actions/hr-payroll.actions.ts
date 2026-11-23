'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { serializePrisma } from '@/lib/serialize';
import { Prisma, AttendanceStatus, LeaveType, ApprovalStatus, PayrollStatus } from '@prisma/client';
import { z } from 'zod';
import { getActiveContext } from '@/lib/context';

/**
 * Validates tenant session and retrieves authenticated user context.
 */
async function validateSession() {
  const context = await getActiveContext();
  if (!context || !context.tenantId) {
    throw new Error('Unauthorized: No active tenant session');
  }
  return {
    tenantId: context.tenantId,
    userId: context.userId,
    branchId: context.branchId,
    isAllBranches: context.isAllBranches,
    userName: (context.user?.name || 'Admin') as string,
  };
}

// ==========================================
// ZOD VALIDATION SCHEMAS
// ==========================================

const markAttendanceSchema = z.object({
  userId: z.string().uuid('Invalid staff user ID'),
  date: z.string().min(1, 'Date is required'),
  status: z.enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE']),
  clockInTime: z.string().optional().nullable(),
  clockOutTime: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const createLeaveRequestSchema = z.object({
  userId: z.string().uuid('Invalid staff user ID'),
  type: z.enum(['SICK', 'CASUAL', 'ANNUAL', 'MATERNITY']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reason: z.string().optional().nullable(),
});

const updateLeaveStatusSchema = z.object({
  leaveId: z.string().uuid('Invalid leave request ID'),
  status: z.enum(['APPROVED', 'REJECTED']),
  rejectionReason: z.string().optional().nullable(),
});

const generatePayrollSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
});

const markPayrollPaidSchema = z.object({
  payrollId: z.string().uuid('Invalid payroll ID'),
  paymentMode: z.string().min(1, 'Payment mode is required'),
  transactionRef: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const updateStaffSalarySchema = z.object({
  userId: z.string().uuid('Invalid staff user ID'),
  monthlySalary: z.number().min(0, 'Salary must be non-negative'),
});

// ==========================================
// 1. ATTENDANCE ACTIONS
// ==========================================

/**
 * Fetches all active in-house staff members for the tenant along with
 * their attendance status for a specific calendar date.
 */
export async function getDailyAttendance(dateStr?: string) {
  try {
    const { tenantId } = await validateSession();
    
    // Normalize date to UTC midnight
    const now = new Date();
    const resolvedDateStr = dateStr || now.toISOString().split('T')[0];
    const targetDate = new Date(`${resolvedDateStr.split('T')[0]}T00:00:00.000Z`);

    // Fetch active staff in tenant
    const staffMembers = await prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        employeeCode: true,
        designation: true,
        department: true,
        monthlySalary: true,
        baseSalary: true,
        profileImage: true,
        joiningDate: true,
        employmentType: true,
      },
      orderBy: { name: 'asc' },
    });

    const staffIds = staffMembers.map((s) => s.id);

    // Fetch attendance records for this date
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        userId: { in: staffIds },
        date: targetDate,
      },
    });

    // Fetch active approved leaves for this date
    const approvedLeaves = await prisma.leaveRequest.findMany({
      where: {
        userId: { in: staffIds },
        status: ApprovalStatus.APPROVED,
        startDate: { lte: targetDate },
        endDate: { gte: targetDate },
      },
    });

    const attendanceMap = new Map<string, any>();
    attendanceRecords.forEach((att) => {
      attendanceMap.set(att.userId, att);
    });

    const leaveMap = new Map<string, any>();
    approvedLeaves.forEach((leave) => {
      leaveMap.set(leave.userId, leave);
    });

    let presentCount = 0;
    let halfDayCount = 0;
    let absentCount = 0;
    let leaveCount = 0;
    let unmarkedCount = 0;

    const roster = staffMembers.map((staff) => {
      const att = attendanceMap.get(staff.id);
      const leave = leaveMap.get(staff.id);

      let effectiveStatus = att?.status || (leave ? 'LEAVE' : 'UNMARKED');
      if (effectiveStatus === 'PRESENT') presentCount++;
      else if (effectiveStatus === 'HALF_DAY') halfDayCount++;
      else if (effectiveStatus === 'ABSENT') absentCount++;
      else if (effectiveStatus === 'LEAVE') leaveCount++;
      else unmarkedCount++;

      const salaryVal = Number(staff.monthlySalary || staff.baseSalary || 0);

      return {
        userId: staff.id,
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        employeeCode: staff.employeeCode || `EMP-${staff.id.slice(0, 6).toUpperCase()}`,
        designation: staff.designation || 'Studio Staff',
        department: staff.department || 'Operations',
        profileImage: staff.profileImage,
        monthlySalary: salaryVal,
        status: effectiveStatus,
        attendanceId: att?.id || null,
        clockIn: att?.clockIn ? att.clockIn.toISOString() : null,
        clockOut: att?.clockOut ? att.clockOut.toISOString() : null,
        notes: att?.notes || (leave ? `On Approved Leave (${leave.type})` : null),
        leaveType: leave?.type || null,
      };
    });

    return {
      success: true,
      data: {
        date: resolvedDateStr,
        stats: {
          totalStaff: staffMembers.length,
          presentCount,
          halfDayCount,
          absentCount,
          leaveCount,
          unmarkedCount,
        },
        roster: serializePrisma(roster),
      },
    };
  } catch (error: any) {
    console.error('getDailyAttendance error:', error);
    return {
      success: false,
      error: error.message || 'Failed to retrieve daily attendance',
    };
  }
}

/**
 * Upserts a staff member's attendance status for a given day.
 */
export async function markStaffAttendance(input: z.infer<typeof markAttendanceSchema>) {
  try {
    const { tenantId, branchId } = await validateSession();
    const payload = markAttendanceSchema.parse(input);

    const targetDate = new Date(`${payload.date.split('T')[0]}T00:00:00.000Z`);

    // Verify staff belongs to tenant
    const staff = await prisma.user.findFirst({
      where: { id: payload.userId, tenantId, deletedAt: null },
    });
    if (!staff) {
      return { success: false, error: 'Staff member not found in this tenant' };
    }

    // Resolve branch: use active context branch or fallback to staff's primary assigned branch
    let targetBranchId = branchId;
    if (!targetBranchId) {
      const staffBranch = await prisma.userBranch.findFirst({
        where: { userId: payload.userId, isActive: true },
        orderBy: { isPrimary: 'desc' },
        select: { branchId: true },
      });
      targetBranchId = staffBranch?.branchId || null;
    }

    let clockIn: Date | null = null;
    let clockOut: Date | null = null;

    if (payload.status === 'PRESENT' || payload.status === 'HALF_DAY') {
      if (payload.clockInTime) {
        if (payload.clockInTime.includes(':') && !payload.clockInTime.includes('T')) {
          const [h, m] = payload.clockInTime.split(':').map(Number);
          clockIn = new Date(targetDate);
          clockIn.setUTCHours(h, m, 0, 0);
        } else {
          clockIn = new Date(payload.clockInTime);
        }
      } else {
        // Default 09:30 AM UTC
        clockIn = new Date(targetDate);
        clockIn.setUTCHours(9, 30, 0, 0);
      }

      if (payload.clockOutTime) {
        if (payload.clockOutTime.includes(':') && !payload.clockOutTime.includes('T')) {
          const [h, m] = payload.clockOutTime.split(':').map(Number);
          clockOut = new Date(targetDate);
          clockOut.setUTCHours(h, m, 0, 0);
        } else {
          clockOut = new Date(payload.clockOutTime);
        }
      }
    }

    const record = await prisma.attendance.upsert({
      where: {
        userId_date: {
          userId: payload.userId,
          date: targetDate,
        },
      },
      update: {
        status: payload.status as AttendanceStatus,
        clockIn,
        clockOut,
        notes: payload.notes || null,
        tenantId,
        ...(targetBranchId ? { branchId: targetBranchId } : {}),
      },
      create: {
        userId: payload.userId,
        tenantId,
        branchId: targetBranchId,
        date: targetDate,
        status: payload.status as AttendanceStatus,
        clockIn,
        clockOut,
        notes: payload.notes || null,
      },
    });

    revalidatePath('/hr');
    return {
      success: true,
      data: serializePrisma(record),
      message: `Marked ${staff.name} as ${payload.status}`,
    };
  } catch (error: any) {
    console.error('markStaffAttendance error:', error);
    return {
      success: false,
      error: error.message || 'Failed to record staff attendance',
    };
  }
}

// ==========================================
// 2. LEAVE MANAGEMENT ACTIONS
// ==========================================

/**
 * Lists all pending and historical leave requests for in-house staff.
 */
export async function getLeaveRequests() {
  try {
    const { tenantId } = await validateSession();

    const requests = await prisma.leaveRequest.findMany({
      where: {
        user: { tenantId, deletedAt: null },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            designation: true,
            department: true,
            profileImage: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return {
      success: true,
      data: serializePrisma(requests),
    };
  } catch (error: any) {
    console.error('getLeaveRequests error:', error);
    return {
      success: false,
      error: error.message || 'Failed to load leave requests',
    };
  }
}

/**
 * Creates a new leave request for a staff member.
 */
export async function createLeaveRequest(input: z.infer<typeof createLeaveRequestSchema>) {
  try {
    const { tenantId, branchId } = await validateSession();
    const payload = createLeaveRequestSchema.parse(input);

    const staff = await prisma.user.findFirst({
      where: { id: payload.userId, tenantId, deletedAt: null },
    });
    if (!staff) {
      return { success: false, error: 'Staff member not found in this tenant' };
    }

    // Resolve branch: use active context branch or fallback to staff's primary assigned branch
    let targetBranchId = branchId;
    if (!targetBranchId) {
      const staffBranch = await prisma.userBranch.findFirst({
        where: { userId: payload.userId, isActive: true },
        orderBy: { isPrimary: 'desc' },
        select: { branchId: true },
      });
      targetBranchId = staffBranch?.branchId || null;
    }

    const startDate = new Date(`${payload.startDate.split('T')[0]}T00:00:00.000Z`);
    const endDate = new Date(`${payload.endDate.split('T')[0]}T00:00:00.000Z`);

    if (endDate < startDate) {
      return { success: false, error: 'End date cannot be prior to start date' };
    }

    const leave = await prisma.leaveRequest.create({
      data: {
        tenantId,
        branchId: targetBranchId,
        userId: payload.userId,
        type: payload.type as LeaveType,
        startDate,
        endDate,
        status: ApprovalStatus.PENDING,
        reason: payload.reason || null,
      },
    });

    revalidatePath('/hr');
    return {
      success: true,
      data: serializePrisma(leave),
      message: 'Leave request submitted successfully',
    };
  } catch (error: any) {
    console.error('createLeaveRequest error:', error);
    return {
      success: false,
      error: error.message || 'Failed to submit leave request',
    };
  }
}

/**
 * Approves or Rejects a leave request and auto-updates attendance records.
 */
export async function updateLeaveRequestStatus(input: z.infer<typeof updateLeaveStatusSchema>) {
  try {
    const { tenantId, userId: reviewerId } = await validateSession();
    const payload = updateLeaveStatusSchema.parse(input);

    const existing = await prisma.leaveRequest.findFirst({
      where: {
        id: payload.leaveId,
        user: { tenantId },
      },
      include: { user: true },
    });

    if (!existing) {
      return { success: false, error: 'Leave request not found' };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.leaveRequest.update({
        where: { id: payload.leaveId },
        data: {
          status: payload.status as ApprovalStatus,
          reviewedById: reviewerId,
          reviewedAt: new Date(),
          rejectionReason: payload.status === 'REJECTED' ? payload.rejectionReason || null : null,
        },
      });

      // If approved, upsert attendance as LEAVE for each day in date range
      if (payload.status === 'APPROVED') {
        const curDate = new Date(existing.startDate);
        const endDate = new Date(existing.endDate);

        while (curDate <= endDate) {
          const dayDate = new Date(curDate);
          await tx.attendance.upsert({
            where: {
              userId_date: {
                userId: existing.userId,
                date: dayDate,
              },
            },
            update: {
              status: AttendanceStatus.LEAVE,
              tenantId,
              branchId: existing.branchId || undefined,
              notes: `Approved Leave: ${existing.type}`,
            },
            create: {
              userId: existing.userId,
              tenantId,
              branchId: existing.branchId || null,
              date: dayDate,
              status: AttendanceStatus.LEAVE,
              notes: `Approved Leave: ${existing.type}`,
            },
          });
          curDate.setUTCDate(curDate.getUTCDate() + 1);
        }
      }

      return res;
    });

    revalidatePath('/hr');
    return {
      success: true,
      data: serializePrisma(updated),
      message: `Leave request ${payload.status.toLowerCase()} successfully`,
    };
  } catch (error: any) {
    console.error('updateLeaveRequestStatus error:', error);
    return {
      success: false,
      error: error.message || 'Failed to update leave request status',
    };
  }
}

// ==========================================
// 3. PAYROLL ENGINE ACTIONS
// ==========================================

/**
 * Fetches generated monthly payroll records and overall payroll metrics.
 */
export async function getMonthlyPayroll(month: number, year: number) {
  try {
    const { tenantId } = await validateSession();

    const payrolls = await prisma.payroll.findMany({
      where: {
        month,
        year,
        user: { tenantId, deletedAt: null },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            employeeCode: true,
            designation: true,
            department: true,
            profileImage: true,
            monthlySalary: true,
            baseSalary: true,
            joiningDate: true,
          },
        },
      },
      orderBy: { user: { name: 'asc' } },
    });

    let totalPayrollCost = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let draftCount = 0;
    let paidCount = 0;

    const formattedPayrolls = payrolls.map((p) => {
      const net = Number(p.netPay || 0);
      const base = Number(p.baseSalary || 0);
      const ded = Number(p.deductions || 0);
      const bon = Number(p.bonus || 0);

      totalPayrollCost += net;
      if (p.status === 'PAID') {
        totalPaid += net;
        paidCount++;
      } else {
        totalPending += net;
        draftCount++;
      }

      return {
        id: p.id,
        userId: p.userId,
        staffName: p.user.name,
        staffEmail: p.user.email,
        staffPhone: p.user.phone,
        employeeCode: p.user.employeeCode || `EMP-${p.user.id.slice(0, 6).toUpperCase()}`,
        designation: p.user.designation || 'Staff',
        department: p.user.department || 'Operations',
        profileImage: p.user.profileImage,
        joiningDate: p.user.joiningDate ? p.user.joiningDate.toISOString() : null,
        month: p.month,
        year: p.year,
        baseSalary: base,
        deductions: ded,
        bonus: bon,
        netPay: net,
        status: p.status,
        totalWorkingDays: p.totalWorkingDays || 30,
        presentDays: p.presentDays || 0,
        halfDays: p.halfDays || 0,
        absentDays: p.absentDays || 0,
        leaveDays: p.leaveDays || 0,
        paymentMode: p.paymentMode,
        transactionRef: p.transactionRef,
        paidAt: p.paidAt ? p.paidAt.toISOString() : null,
        paymentNotes: p.paymentNotes,
        createdAt: p.createdAt.toISOString(),
      };
    });

    return {
      success: true,
      data: {
        month,
        year,
        metrics: {
          totalPayrollCost,
          totalPaid,
          totalPending,
          staffCount: payrolls.length,
          draftCount,
          paidCount,
        },
        records: serializePrisma(formattedPayrolls),
      },
    };
  } catch (error: any) {
    console.error('getMonthlyPayroll error:', error);
    return {
      success: false,
      error: error.message || 'Failed to retrieve monthly payroll',
    };
  }
}

/**
 * Calculates and generates/recalculates monthly payroll for all active in-house staff.
 * Operates idempotently inside a single atomic database transaction.
 */
export async function generateMonthlyPayroll(month: number, year: number) {
  try {
    const { tenantId } = await validateSession();
    generatePayrollSchema.parse({ month, year });

    // Calculate calendar days in month
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    // Fetch in-house staff
    const staffMembers = await prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        monthlySalary: true,
        baseSalary: true,
      },
    });

    if (staffMembers.length === 0) {
      return { success: false, error: 'No active staff members found to process payroll' };
    }

    const staffIds = staffMembers.map((s) => s.id);

    // Fetch month's attendance records for all staff
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        userId: { in: staffIds },
        date: { gte: startDate, lte: endDate },
      },
    });

    // Map attendance per user
    const userAttendanceMap = new Map<string, any[]>();
    for (const record of attendanceRecords) {
      const list = userAttendanceMap.get(record.userId) || [];
      list.push(record);
      userAttendanceMap.set(record.userId, list);
    }

    // Atomic transaction for payroll generation
    const generatedCount = await prisma.$transaction(async (tx) => {
      let count = 0;

      for (const staff of staffMembers) {
        const baseSalary = Number(staff.monthlySalary || staff.baseSalary || 0);
        const records = userAttendanceMap.get(staff.id) || [];

        let presentDays = 0;
        let halfDays = 0;
        let absentDays = 0;
        let leaveDays = 0;

        for (const att of records) {
          if (att.status === AttendanceStatus.PRESENT) presentDays++;
          else if (att.status === AttendanceStatus.HALF_DAY) halfDays++;
          else if (att.status === AttendanceStatus.ABSENT) absentDays++;
          else if (att.status === AttendanceStatus.LEAVE) leaveDays++;
        }

        // Standard studio formula: Per-day rate prorated across month days
        const perDayRate = baseSalary > 0 ? baseSalary / daysInMonth : 0;
        
        // Absent = full day deduction, Half Day = 0.5 day deduction. Leaves are paid.
        const deductions = Math.round((absentDays * perDayRate + halfDays * 0.5 * perDayRate) * 100) / 100;
        const netPay = Math.max(0, Math.round((baseSalary - deductions) * 100) / 100);

        // Check if existing payroll record exists
        const existing = await tx.payroll.findUnique({
          where: {
            userId_month_year: {
              userId: staff.id,
              month,
              year,
            },
          },
        });

        // Do not overwrite already PAID payrolls
        if (existing && existing.status === PayrollStatus.PAID) {
          continue;
        }

        await tx.payroll.upsert({
          where: {
            userId_month_year: {
              userId: staff.id,
              month,
              year,
            },
          },
          update: {
            baseSalary: new Prisma.Decimal(baseSalary),
            deductions: new Prisma.Decimal(deductions),
            netPay: new Prisma.Decimal(netPay),
            totalWorkingDays: daysInMonth,
            presentDays,
            halfDays,
            absentDays,
            leaveDays,
            tenantId,
          },
          create: {
            userId: staff.id,
            tenantId,
            month,
            year,
            baseSalary: new Prisma.Decimal(baseSalary),
            deductions: new Prisma.Decimal(deductions),
            netPay: new Prisma.Decimal(netPay),
            status: PayrollStatus.DRAFT,
            totalWorkingDays: daysInMonth,
            presentDays,
            halfDays,
            absentDays,
            leaveDays,
          },
        });

        count++;
      }

      return count;
    });

    revalidatePath('/hr');
    return {
      success: true,
      message: `Payroll processed successfully for ${generatedCount} staff members (${month}/${year})`,
    };
  } catch (error: any) {
    console.error('generateMonthlyPayroll error:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate monthly payroll',
    };
  }
}

/**
 * Marks a payroll record as PAID with audit details.
 */
export async function markPayrollPaid(input: z.infer<typeof markPayrollPaidSchema>) {
  try {
    const { tenantId } = await validateSession();
    const payload = markPayrollPaidSchema.parse(input);

    const payroll = await prisma.payroll.findFirst({
      where: {
        id: payload.payrollId,
        user: { tenantId },
      },
    });

    if (!payroll) {
      return { success: false, error: 'Payroll record not found in this tenant' };
    }

    const updated = await prisma.payroll.update({
      where: { id: payload.payrollId },
      data: {
        status: PayrollStatus.PAID,
        paymentMode: payload.paymentMode,
        transactionRef: payload.transactionRef || null,
        paymentNotes: payload.notes || null,
        paidAt: new Date(),
      },
    });

    revalidatePath('/hr');
    return {
      success: true,
      data: serializePrisma(updated),
      message: 'Salary marked as PAID successfully',
    };
  } catch (error: any) {
    console.error('markPayrollPaid error:', error);
    return {
      success: false,
      error: error.message || 'Failed to update payroll payment status',
    };
  }
}

/**
 * Quick action to update a staff member's base/monthly salary.
 */
export async function updateStaffSalary(input: z.infer<typeof updateStaffSalarySchema>) {
  try {
    const { tenantId } = await validateSession();
    const payload = updateStaffSalarySchema.parse(input);

    const updated = await prisma.user.updateMany({
      where: {
        id: payload.userId,
        tenantId,
        deletedAt: null,
      },
      data: {
        monthlySalary: new Prisma.Decimal(payload.monthlySalary),
        baseSalary: new Prisma.Decimal(payload.monthlySalary),
      },
    });

    if (updated.count === 0) {
      return { success: false, error: 'Staff member not found' };
    }

    revalidatePath('/hr');
    return {
      success: true,
      message: 'Staff salary updated successfully',
    };
  } catch (error: any) {
    console.error('updateStaffSalary error:', error);
    return {
      success: false,
      error: error.message || 'Failed to update salary',
    };
  }
}
