import { prisma } from '@/lib/prisma';
import { RoyaltyStatus } from '@prisma/client';

export interface RoyaltyCalculationResult {
  success: boolean;
  recorded: boolean;
  ledgerId?: string;
  grossAmount?: number;
  royaltyPercent?: number;
  royaltyAmount?: number;
  reason?: string;
}

export class FranchiseRoyaltyService {
  /**
   * Evaluates if a booking belongs to a Franchisee tenant with an active parent Franchisor.
   * If yes, computes royalty dues and upserts a FranchiseRoyaltyLedger entry.
   * Settled records are protected and never mutated.
   */
  static async recordBookingRoyaltyIfFranchisee(eventBookingId: string): Promise<RoyaltyCalculationResult> {
    try {
      if (!eventBookingId) {
        return { success: false, recorded: false, reason: 'Invalid event booking ID' };
      }

      // 1. Fetch booking with tenant and financial links
      const booking = await prisma.eventBooking.findUnique({
        where: { id: eventBookingId },
        select: {
          id: true,
          title: true,
          tenantId: true,
          tenant: {
            select: {
              id: true,
              name: true,
              parentTenantId: true,
              royaltyPercent: true,
            },
          },
          quotation: {
            select: {
              totalAmount: true,
              lumpSumAmount: true,
            },
          },
          invoice: {
            select: {
              grandTotal: true,
              subtotal: true,
            },
          },
          lead: {
            select: {
              expectedRevenue: true,
            },
          },
          royaltyLedger: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      });

      if (!booking) {
        return { success: false, recorded: false, reason: 'Booking not found' };
      }

      const tenant = booking.tenant;
      if (!tenant || !tenant.parentTenantId) {
        // Not a franchisee studio
        return { success: true, recorded: false, reason: 'Studio is independent (no parent franchisor)' };
      }

      const royaltyPercentNum = Number(tenant.royaltyPercent || 0);
      if (royaltyPercentNum <= 0) {
        return { success: true, recorded: false, reason: 'Franchisee royalty rate is 0%' };
      }

      // Check if royalty record already exists and is settled
      if (booking.royaltyLedger && booking.royaltyLedger.status === RoyaltyStatus.SETTLED) {
        return {
          success: true,
          recorded: false,
          ledgerId: booking.royaltyLedger.id,
          reason: 'Royalty has already been settled and is locked against mutation',
        };
      }

      // Compute financial figures
      const grossAmount = Math.max(
        0,
        Number(
          booking.invoice?.grandTotal ||
          booking.quotation?.totalAmount ||
          booking.quotation?.lumpSumAmount ||
          booking.lead?.expectedRevenue ||
          0
        )
      );

      const royaltyAmount = Math.round(((grossAmount * royaltyPercentNum) / 100) * 100) / 100;
      const bookingTitle = booking.title || `Booking #${booking.id.slice(0, 8)}`;

      // Upsert into FranchiseRoyaltyLedger
      const ledgerEntry = await prisma.franchiseRoyaltyLedger.upsert({
        where: {
          eventBookingId: booking.id,
        },
        create: {
          franchisorId: tenant.parentTenantId,
          franchiseeId: tenant.id,
          eventBookingId: booking.id,
          bookingTitle,
          grossAmount,
          royaltyPercent: royaltyPercentNum,
          royaltyAmount,
          status: RoyaltyStatus.PENDING,
          notes: `Auto-computed ${royaltyPercentNum}% royalty on "${bookingTitle}".`,
        },
        update: {
          bookingTitle,
          grossAmount,
          royaltyPercent: royaltyPercentNum,
          royaltyAmount,
          notes: `Recalculated ${royaltyPercentNum}% royalty on "${bookingTitle}".`,
        },
      });

      return {
        success: true,
        recorded: true,
        ledgerId: ledgerEntry.id,
        grossAmount,
        royaltyPercent: royaltyPercentNum,
        royaltyAmount,
      };
    } catch (error: any) {
      console.error('[FranchiseRoyaltyService.recordBookingRoyaltyIfFranchisee] Error:', error);
      return {
        success: false,
        recorded: false,
        reason: error?.message || 'Failed to record franchise royalty',
      };
    }
  }

  /**
   * Scans bookings of a franchisee (or all franchisees under a franchisor)
   * and generates missing pending royalty ledger entries.
   */
  static async syncMissingFranchiseRoyalties(params: {
    franchisorId: string;
    franchiseeId?: string;
  }): Promise<{ totalSynced: number; errors: number }> {
    try {
      const { franchisorId, franchiseeId } = params;

      // Find all franchisees under this franchisor
      const franchisees = await prisma.tenant.findMany({
        where: {
          parentTenantId: franchisorId,
          ...(franchiseeId ? { id: franchiseeId } : {}),
          deletedAt: null,
        },
        select: {
          id: true,
          royaltyPercent: true,
        },
      });

      if (franchisees.length === 0) {
        return { totalSynced: 0, errors: 0 };
      }

      const franchiseeMap = new Map(
        franchisees.map((f) => [f.id, Number(f.royaltyPercent || 0)])
      );
      const franchiseeIds = Array.from(franchiseeMap.keys());

      // Find bookings for these franchisees that have no ledger entry yet
      const unbilledBookings = await prisma.eventBooking.findMany({
        where: {
          tenantId: { in: franchiseeIds },
          deletedAt: null,
          royaltyLedger: null,
        },
        select: {
          id: true,
          tenantId: true,
        },
        take: 200,
      });

      let totalSynced = 0;
      let errors = 0;

      for (const b of unbilledBookings) {
        const royaltyRate = franchiseeMap.get(b.tenantId) || 0;
        if (royaltyRate > 0) {
          const res = await this.recordBookingRoyaltyIfFranchisee(b.id);
          if (res.recorded) {
            totalSynced++;
          } else if (!res.success) {
            errors++;
          }
        }
      }

      return { totalSynced, errors };
    } catch (error) {
      console.error('[FranchiseRoyaltyService.syncMissingFranchiseRoyalties] Error:', error);
      return { totalSynced: 0, errors: 1 };
    }
  }
}
