'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { serializePrisma } from '@/lib/serialize';
import {
  Prisma,
  AccountType,
  EntryType,
  VoucherType,
  PayoutStatus,
  TdsSection,
  PaymentMethod,
} from '@prisma/client';
import { AccountingService } from '@/services/accounting.service';
import { AccountingSyncService } from '@/services/accounting-sync.service';
import { z } from 'zod';

async function validateSession() {
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

export interface PendingPayoutItem {
  id: string;
  assignmentType: 'STAFF' | 'EVENT';
  role: string;
  grossAmount: number;
  payoutStatus: PayoutStatus;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    panNumber: string | null;
    bankAccountNumber: string | null;
    bankIfsc: string | null;
    bankName: string | null;
    accountHolderName: string | null;
    upiId: string | null;
  };
  bookingId: string;
  bookingNumber: string;
  bookingTitle: string;
  eventDate: Date | null;
  createdAt: Date;
}

export interface DisbursedPayoutItem extends PendingPayoutItem {
  tdsSection: TdsSection;
  tdsRate: number;
  tdsAmount: number;
  netPayableAmount: number;
  disbursedAt: Date;
  disbursementReference: string | null;
  sourceAccountName?: string | null;
}

const disbursePayoutSchema = z.object({
  assignmentId: z.string().uuid('Invalid assignment ID'),
  assignmentType: z.enum(['STAFF', 'EVENT']),
  tdsSection: z.nativeEnum(TdsSection).default(TdsSection.NONE),
  paymentMethod: z.enum(['BANK', 'CASH', 'UPI']).default('BANK'),
  sourceAccountId: z.string().uuid('Invalid source ledger account ID'),
  referenceNumber: z.string().min(1, 'Reference number or disbursement note is required'),
});

export type DisbursePayoutInput = z.infer<typeof disbursePayoutSchema>;

/**
 * Fetches all pending freelancer crew payout assignments across both StaffAssignment and EventAssignment.
 */
export async function getPendingFreelancerPayoutsAction(): Promise<{
  success: boolean;
  data?: {
    pendingPayouts: PendingPayoutItem[];
    sourceAccounts: Array<{ id: string; name: string; code: string | null; type: AccountType }>;
    isTdsEnabled: boolean;
  };
  error?: string;
}> {
  try {
    const { tenantId } = await validateSession();

    // 1. Fetch Tenant settings
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { isTdsEnabled: true },
    });

    // 2. Fetch Pending StaffAssignments
    const staffAssignments = await prisma.staffAssignment.findMany({
      where: {
        tenantId,
        deletedAt: null,
        payoutStatus: { not: PayoutStatus.PAID },
        payoutAmount: { not: null, gt: 0 },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            panNumber: true,
            bankAccountNumber: true,
            bankIfsc: true,
            bankName: true,
            accountHolderName: true,
            upiId: true,
          },
        },
        subEvent: {
          include: {
            eventBooking: {
              select: {
                id: true,
                bookingNumber: true,
                title: true,
                startDate: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 3. Fetch Pending EventAssignments
    const eventAssignments = await prisma.eventAssignment.findMany({
      where: {
        eventBooking: { tenantId, deletedAt: null },
        payoutStatus: { not: PayoutStatus.PAID },
        agreedPayment: { not: null, gt: 0 },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            panNumber: true,
            bankAccountNumber: true,
            bankIfsc: true,
            bankName: true,
            accountHolderName: true,
            upiId: true,
          },
        },
        eventBooking: {
          select: {
            id: true,
            bookingNumber: true,
            title: true,
            startDate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 4. Fetch available Cash & Bank source accounts
    let sourceAccounts = await prisma.account.findMany({
      where: {
        tenantId,
        deletedAt: null,
        type: AccountType.ASSET,
        OR: [
          { code: { in: ['1010', '1020', '1030'] } },
          { name: { contains: 'Bank', mode: 'insensitive' } },
          { name: { contains: 'Cash', mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
      },
      orderBy: [{ code: 'asc' }, { name: 'asc' }],
    });

    if (sourceAccounts.length === 0) {
      await AccountingService.initializeDefaultAccounts(tenantId);
      sourceAccounts = await prisma.account.findMany({
        where: {
          tenantId,
          deletedAt: null,
          type: AccountType.ASSET,
          OR: [
            { code: { in: ['1010', '1020', '1030'] } },
            { name: { contains: 'Bank', mode: 'insensitive' } },
            { name: { contains: 'Cash', mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, code: true, type: true },
        orderBy: [{ code: 'asc' }, { name: 'asc' }],
      });
    }

    // 5. Merge and format unified pending payout items
    const unifiedList: PendingPayoutItem[] = [];

    for (const sa of staffAssignments) {
      unifiedList.push({
        id: sa.id,
        assignmentType: 'STAFF',
        role: sa.role,
        grossAmount: Number(sa.payoutAmount),
        payoutStatus: sa.payoutStatus,
        user: sa.user,
        bookingId: sa.subEvent.eventBooking.id,
        bookingNumber: sa.subEvent.eventBooking.bookingNumber,
        bookingTitle: sa.subEvent.eventBooking.title,
        eventDate: sa.subEvent.eventDate || sa.subEvent.eventBooking.startDate,
        createdAt: sa.createdAt,
      });
    }

    for (const ea of eventAssignments) {
      unifiedList.push({
        id: ea.id,
        assignmentType: 'EVENT',
        role: ea.role,
        grossAmount: Number(ea.agreedPayment),
        payoutStatus: ea.payoutStatus,
        user: ea.user,
        bookingId: ea.eventBooking.id,
        bookingNumber: ea.eventBooking.bookingNumber,
        bookingTitle: ea.eventBooking.title,
        eventDate: ea.eventBooking.startDate,
        createdAt: ea.createdAt,
      });
    }

    return {
      success: true,
      data: {
        pendingPayouts: serializePrisma(unifiedList),
        sourceAccounts: serializePrisma(sourceAccounts),
        isTdsEnabled: Boolean(tenant?.isTdsEnabled),
      },
    };
  } catch (error: any) {
    console.error('[GET_PENDING_PAYOUTS_ERROR]', error);
    return { success: false, error: error.message || 'Failed to fetch pending freelancer payouts' };
  }
}

/**
 * Executes a freelancer payout disbursement with statutory TDS deduction & multi-mode Cash/Bank routing.
 */
export async function disburseFreelancerPayoutAction(
  input: DisbursePayoutInput
): Promise<{
  success: boolean;
  message?: string;
  voucherNumber?: string;
  error?: string;
}> {
  try {
    const { tenantId, userId } = await validateSession();
    const validated = disbursePayoutSchema.parse(input);

    return await prisma.$transaction(async (tx) => {
      // 1. Fetch Tenant settings
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: { isTdsEnabled: true },
      });
      const isTdsEnabled = Boolean(tenant?.isTdsEnabled);

      // 2. Fetch source asset account (Bank or Cash)
      const sourceAccount = await tx.account.findFirst({
        where: {
          id: validated.sourceAccountId,
          tenantId,
          type: AccountType.ASSET,
          deletedAt: null,
        },
      });

      if (!sourceAccount) {
        throw new Error('Invalid or unauthorized source ledger account.');
      }

      // 3. Fetch Assignment and Freelancer details
      let grossAmount = 0;
      let crewName = 'Freelancer';
      let crewRole = 'Crew';
      let bookingLabel = '';
      let crewUser: any = null;

      if (validated.assignmentType === 'STAFF') {
        const staffAsg = await tx.staffAssignment.findFirst({
          where: { id: validated.assignmentId, tenantId, deletedAt: null },
          include: {
            user: true,
            subEvent: {
              include: { eventBooking: true },
            },
          },
        });

        if (!staffAsg) throw new Error('Staff crew assignment not found.');
        if (staffAsg.payoutStatus === PayoutStatus.PAID) {
          throw new Error('This assignment has already been disbursed and paid.');
        }

        grossAmount = Number(staffAsg.payoutAmount || 0);
        crewName = staffAsg.user.name;
        crewRole = staffAsg.role;
        bookingLabel = `#${staffAsg.subEvent.eventBooking.bookingNumber} (${staffAsg.subEvent.eventBooking.title})`;
        crewUser = staffAsg.user;
      } else {
        const eventAsg = await tx.eventAssignment.findFirst({
          where: {
            id: validated.assignmentId,
            eventBooking: { tenantId, deletedAt: null },
          },
          include: {
            user: true,
            eventBooking: true,
          },
        });

        if (!eventAsg) throw new Error('Event crew assignment not found.');
        if (eventAsg.payoutStatus === PayoutStatus.PAID) {
          throw new Error('This assignment has already been disbursed and paid.');
        }

        grossAmount = Number(eventAsg.agreedPayment || 0);
        crewName = eventAsg.user.name;
        crewRole = eventAsg.role;
        bookingLabel = `#${eventAsg.eventBooking.bookingNumber} (${eventAsg.eventBooking.title})`;
        crewUser = eventAsg.user;
      }

      if (grossAmount <= 0) {
        throw new Error('Agreed payout amount must be greater than zero to disburse.');
      }

      // 4. Calculate Statutory TDS (Section 194J / 194C / 206AA)
      let tdsRate = 0;
      let tdsAmount = 0;
      let appliedSection: TdsSection = TdsSection.NONE;

      if (isTdsEnabled && validated.tdsSection !== TdsSection.NONE) {
        appliedSection = validated.tdsSection;

        // Check PAN status: If missing PAN, Section 206AA mandates a 20% flat withholding
        const hasPan = Boolean(crewUser?.panNumber && crewUser.panNumber.trim().length === 10);

        if (!hasPan) {
          tdsRate = 20.0;
        } else {
          switch (validated.tdsSection) {
            case TdsSection.SEC_194J_PROFESSIONAL:
              tdsRate = 10.0;
              break;
            case TdsSection.SEC_194J_TECHNICAL:
              tdsRate = 2.0;
              break;
            case TdsSection.SEC_194C_CONTRACTOR:
              tdsRate = 1.0;
              break;
            default:
              tdsRate = 0;
          }
        }

        tdsAmount = Math.round(grossAmount * (tdsRate / 100) * 100) / 100;
      }

      const netPayableAmount = Math.round((grossAmount - tdsAmount) * 100) / 100;

      // 5. Update Assignment record
      const updateData = {
        tdsSection: appliedSection,
        tdsRate: new Prisma.Decimal(tdsRate.toFixed(2)),
        tdsAmount: new Prisma.Decimal(tdsAmount.toFixed(2)),
        netPayableAmount: new Prisma.Decimal(netPayableAmount.toFixed(2)),
        disbursedAt: new Date(),
        disbursementReference: validated.referenceNumber.trim(),
        sourceBankAccountId: sourceAccount.id,
        payoutStatus: PayoutStatus.PAID,
      };

      if (validated.assignmentType === 'STAFF') {
        await tx.staffAssignment.update({
          where: { id: validated.assignmentId },
          data: updateData,
        });
      } else {
        await tx.eventAssignment.update({
          where: { id: validated.assignmentId },
          data: updateData,
        });
      }

      // 6. Post Double-Entry PAYMENT Voucher
      // DEBIT:  Freelancer & Crew Payouts Payable (2020) [Gross Amount]
      // CREDIT: Duties & Taxes - TDS Payable (2070)      [TDS Amount, if any]
      // CREDIT: Source Asset Ledger (Bank/Cash)         [Net Payable Amount]
      const payableAccount = await AccountingSyncService.getOrCreateTargetAccount(
        tenantId,
        { code: '2020', preferredNameKeyword: 'Payouts Payable' },
        AccountType.LIABILITY,
        tx
      );

      const voucherEntries: Array<{ accountId: string; type: EntryType; amount: number }> = [
        {
          accountId: payableAccount.id,
          type: EntryType.DEBIT,
          amount: grossAmount,
        },
      ];

      if (tdsAmount > 0) {
        const tdsAccount = await AccountingSyncService.getOrCreateTargetAccount(
          tenantId,
          { code: '2070', preferredNameKeyword: 'TDS Payable' },
          AccountType.LIABILITY,
          tx
        );
        voucherEntries.push({
          accountId: tdsAccount.id,
          type: EntryType.CREDIT,
          amount: tdsAmount,
        });
      }

      voucherEntries.push({
        accountId: sourceAccount.id,
        type: EntryType.CREDIT,
        amount: netPayableAmount,
      });

      const tdsNarration = tdsAmount > 0 ? ` [TDS u/s ${appliedSection.replace('SEC_', '')} @ ${tdsRate}%: ₹${tdsAmount.toFixed(2)}]` : '';
      const narration = `Payout disbursement for ${crewName} (${crewRole}) on booking ${bookingLabel} via ${validated.paymentMethod} from ${sourceAccount.name}. Ref: ${validated.referenceNumber.trim()}.${tdsNarration}`;

      const voucher = await AccountingService.createVoucher({
        tenantId,
        userId,
        type: VoucherType.PAYMENT,
        date: new Date(),
        referenceId: `PAY-DISB-${validated.assignmentId}`,
        narration,
        entries: voucherEntries,
        tx,
      });

      // 7. Activity Timeline Audit Log
      await tx.activityTimeline.create({
        data: {
          tenantId,
          entityType: 'CREW_PAYOUT',
          entityId: validated.assignmentId,
          action: 'PAYOUT_DISBURSED',
          notes: `Disbursed ₹${netPayableAmount.toFixed(2)} to ${crewName} via ${validated.paymentMethod} (Ref: ${validated.referenceNumber.trim()}). Voucher #${voucher.voucherNumber}.${tdsNarration}`,
          createdById: userId,
        },
      });

      return {
        success: true,
        message: `Disbursed ₹${netPayableAmount.toFixed(2)} to ${crewName}. Payment Voucher #${voucher.voucherNumber} posted.`,
        voucherNumber: voucher.voucherNumber,
      };
    });
  } catch (error: any) {
    console.error('[DISBURSE_PAYOUT_ERROR]', error);
    return { success: false, error: error.message || 'Failed to disburse freelancer payout' };
  }
}
