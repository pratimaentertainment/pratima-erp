import { LeadRepository } from '@/repositories/lead.repository';
import { NumberSeriesService } from './number-series.service';
import { RoleService } from './role.service';
import { HandoffService } from './handoff.service';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { getActiveContext } from '@/lib/context';
import { Prisma, InquiryStatus, Priority, LeadStatus } from '@prisma/client';
import { z } from 'zod';
import { serializePrisma } from '@/lib/serialize';

/**
 * Safely parses various budget formats into a single numeric expected revenue value.
 * Handles numbers, currency symbols (₹, $, Rs), commas, suffixes (k, L, Lakh, Cr),
 * and ranges (e.g. "50,000 - 1,00,000" or "50k - 100k") by calculating the midpoint.
 */
export function parseBudgetToExpectedRevenue(budgetInput?: any): number {
  if (budgetInput === null || budgetInput === undefined) return 0;
  if (typeof budgetInput === 'number') {
    return isNaN(budgetInput) ? 0 : Math.max(0, budgetInput);
  }
  if (typeof budgetInput !== 'string') return 0;

  const raw = budgetInput.trim();
  if (!raw) return 0;

  const parseToken = (str: string): number => {
    let clean = str.replace(/[₹$,]/g, '').trim().toLowerCase();
    let multiplier = 1;
    if (clean.endsWith('cr') || clean.endsWith('crore') || clean.endsWith('crores')) {
      multiplier = 10000000;
      clean = clean.replace(/crores?|cr/g, '').trim();
    } else if (clean.endsWith('l') || clean.endsWith('lac') || clean.endsWith('lakh') || clean.endsWith('lakhs')) {
      multiplier = 100000;
      clean = clean.replace(/lakhs?|lac|l/g, '').trim();
    } else if (clean.endsWith('k')) {
      multiplier = 1000;
      clean = clean.replace(/k/g, '').trim();
    }

    const num = parseFloat(clean);
    return isNaN(num) ? 0 : Math.max(0, num * multiplier);
  };

  if (raw.includes('-') || /\bto\b/i.test(raw)) {
    const parts = raw.split(/[-–—]|\bto\b/i).map(s => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const v1 = parseToken(parts[0]);
      const v2 = parseToken(parts[1]);
      if (v1 > 0 && v2 > 0) {
        return Math.round((v1 + v2) / 2);
      }
      return v1 > 0 ? v1 : v2;
    }
  }

  return parseToken(raw);
}

const CreateLeadSchema = z.object({
  packageId: z.string().uuid().optional().nullable(),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  expectedRevenue: z.coerce.number().nonnegative().optional().nullable(),
  expectedBookingDate: z.date().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const UpdateLeadSchema = z.object({
  status: z.nativeEnum(LeadStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedRevenue: z.coerce.number().nonnegative().optional().nullable(),
  expectedBookingDate: z.date().optional().nullable(),
  packageId: z.string().uuid().optional().nullable(),
  assignedToId: z.string().uuid().optional().nullable(),
  lostReason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const AUDIT_ACTIONS = {
  CREATED: 'LEAD_CREATED',
  UPDATED: 'LEAD_UPDATED',
  DELETED: 'LEAD_DELETED',
};

export class LeadService {
  static async validateSession() {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.tenantId) throw new Error("Unauthorized");
    
    const context = await getActiveContext();
    if (!context?.activeBranch?.id) throw new Error("No active branch selected");

    return {
      tenantId: user.tenantId,
      userId: user.id,
      branchId: context.activeBranch.id
    };
  }

  static async logAction(tx: Prisma.TransactionClient, tenantId: string, userId: string, entityId: string, action: string, notes?: string, oldValues?: any, newValues?: any) {
    await tx.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'LEAD',
        entityId,
        action,
        oldValues: oldValues ? JSON.parse(JSON.stringify(oldValues)) : undefined,
        newValues: newValues ? JSON.parse(JSON.stringify(newValues)) : undefined,
      }
    });

    await tx.activityTimeline.create({
      data: {
        tenantId,
        entityType: 'LEAD',
        entityId,
        action,
        notes,
        createdById: userId,
      }
    });
  }

  static async findAll(tenantIdOrCtx?: any, maybeBranchId?: string | null) {
    let tenantId: string;
    let branchId: string | null | undefined = maybeBranchId;

    if (typeof tenantIdOrCtx === 'string') {
      tenantId = tenantIdOrCtx;
    } else if (tenantIdOrCtx?.tenantId) {
      tenantId = tenantIdOrCtx.tenantId;
      branchId = tenantIdOrCtx.branchId !== undefined ? tenantIdOrCtx.branchId : branchId;
    } else {
      const sessionData = await this.validateSession();
      tenantId = sessionData.tenantId;
      branchId = sessionData.branchId;
      const hasPerm = await RoleService.hasPermission(sessionData.userId, 'LEAD', 'READ', sessionData.branchId);
      if (!hasPerm) throw new Error("Permission denied");
    }
    
    const leads = await LeadRepository.findAll(tenantId, branchId);
    const sanitizedLeads = (leads || []).map((lead: any) => ({
      ...lead,
      expectedRevenue: lead.expectedRevenue !== null && lead.expectedRevenue !== undefined
        ? (typeof lead.expectedRevenue?.toNumber === 'function'
            ? lead.expectedRevenue.toNumber()
            : Number(lead.expectedRevenue) || 0)
        : 0,
      package: lead.package
        ? {
            ...lead.package,
            basePrice: lead.package.basePrice !== null && lead.package.basePrice !== undefined
              ? (typeof lead.package.basePrice?.toNumber === 'function'
                  ? lead.package.basePrice.toNumber()
                  : Number(lead.package.basePrice) || 0)
              : 0,
          }
        : null,
      quotations: Array.isArray(lead.quotations)
        ? lead.quotations.map((q: any) => ({
            ...q,
            totalAmount: q.totalAmount !== null && q.totalAmount !== undefined
              ? (typeof q.totalAmount?.toNumber === 'function'
                  ? q.totalAmount.toNumber()
                  : Number(q.totalAmount) || 0)
              : 0,
          }))
        : [],
    }));
    return serializePrisma(sanitizedLeads);
  }

  static async findById(idOrTenantId: string, maybeBranchId?: string | null, maybeId?: string) {
    let id = idOrTenantId;
    let tenantId: string;

    if (maybeId) {
      tenantId = idOrTenantId;
      id = maybeId;
    } else {
      const sessionData = await this.validateSession();
      tenantId = sessionData.tenantId;
      const hasPerm = await RoleService.hasPermission(sessionData.userId, 'LEAD', 'READ', sessionData.branchId);
      if (!hasPerm) throw new Error("Permission denied");
    }

    const lead = await LeadRepository.findById(tenantId, id);
    if (!lead) return null;

    const sanitizedLead = {
      ...lead,
      expectedRevenue: lead.expectedRevenue !== null && lead.expectedRevenue !== undefined
        ? (typeof lead.expectedRevenue?.toNumber === 'function'
            ? lead.expectedRevenue.toNumber()
            : Number(lead.expectedRevenue) || 0)
        : 0,
      package: lead.package
        ? {
            ...lead.package,
            basePrice: lead.package.basePrice !== null && lead.package.basePrice !== undefined
              ? (typeof lead.package.basePrice?.toNumber === 'function'
                  ? lead.package.basePrice.toNumber()
                  : Number(lead.package.basePrice) || 0)
              : 0,
          }
        : null,
      quotations: Array.isArray(lead.quotations)
        ? lead.quotations.map((q: any) => ({
            ...q,
            totalAmount: q.totalAmount !== null && q.totalAmount !== undefined
              ? (typeof q.totalAmount?.toNumber === 'function'
                  ? q.totalAmount.toNumber()
                  : Number(q.totalAmount) || 0)
              : 0,
          }))
        : [],
    };
    return serializePrisma(sanitizedLead);
  }

  static async getTimeline(id: string) {
    const { tenantId, userId, branchId } = await this.validateSession();
    const hasPerm = await RoleService.hasPermission(userId, 'LEAD', 'READ', branchId);
    if (!hasPerm) throw new Error("Permission denied");

    const timeline = await prisma.activityTimeline.findMany({
      where: { tenantId, entityType: 'LEAD', entityId: id },
      orderBy: { createdAt: 'desc' },
      include: { createdBy: true }
    });
    return serializePrisma(timeline);
  }

  static async createFromInquiry(inquiryId: string, payload: any) {
    const { tenantId, userId, branchId } = await this.validateSession();
    
    const hasPerm = await RoleService.hasPermission(userId, 'LEAD', 'CREATE', branchId);
    if (!hasPerm) throw new Error("Permission denied");

    const data = CreateLeadSchema.parse(payload || {});

    return prisma.$transaction(async (tx) => {
      // 1. Fetch Inquiry
      const inquiry = await tx.inquiry.findUnique({
        where: { id: inquiryId, tenantId },
        include: { customer: true }
      });

      if (!inquiry) throw new Error("Inquiry not found");
      
      if (inquiry.status === InquiryStatus.CONVERTED) {
        throw new Error("This Inquiry has already been converted to a Lead.");
      }

      // Check if lead already exists for this inquiry
      const existingLead = await tx.lead.findUnique({
        where: { inquiryId: inquiry.id }
      });

      if (existingLead) throw new Error("A Lead already exists for this Inquiry");

      // 2. Generate Lead Code
      const leadCode = await NumberSeriesService.getNextNumber(tx, tenantId, 'LEAD');

      // Carry over details: Event Type, Target Date, Budget, Notes
      const carriedNotes = [
        inquiry.eventType ? `Event Type: ${inquiry.eventType}` : null,
        inquiry.eventDate ? `Target Date: ${inquiry.eventDate.toISOString().split('T')[0]}` : null,
        inquiry.budgetRange ? `Budget: ${inquiry.budgetRange}` : null,
        inquiry.preferredContactTime ? `Preferred Contact: ${inquiry.preferredContactTime}` : null,
        inquiry.notes ? `Inquiry Notes: ${inquiry.notes}` : null,
        data.notes ? `Lead Notes: ${data.notes}` : null,
      ].filter(Boolean).join('\n');

      // 3. Ensure Customer ID is valid and linked
      let customerId = inquiry.customerId;
      if (!customerId || !inquiry.customer) {
        const customerCode = await NumberSeriesService.getNextNumber(tx, tenantId, 'CUSTOMER');
        const newCustomer = await tx.customer.create({
          data: {
            tenantId,
            branchId,
            customerCode,
            firstName: 'Client',
            lastName: '',
            createdById: userId,
          }
        });
        customerId = newCustomer.id;
        await tx.inquiry.update({
          where: { id: inquiry.id },
          data: { customerId }
        });
      }

      // 4. Determine Expected Revenue: Explicit payload takes precedence, fallback to parsed inquiry budget
      const rawBudget = (inquiry as any).budget ?? (inquiry as any).estimatedBudget ?? inquiry.budgetRange;
      const parsedBudgetRevenue = parseBudgetToExpectedRevenue(rawBudget);
      const mappedRevenue = data.expectedRevenue !== undefined && data.expectedRevenue !== null
        ? data.expectedRevenue
        : (parsedBudgetRevenue > 0 ? parsedBudgetRevenue : (typeof rawBudget === 'number' && rawBudget > 0 ? rawBudget : 0));

      // 5. Create Lead
      const lead = await LeadRepository.create(tx, {
        tenantId,
        branchId,
        leadCode,
        customerId,
        inquiryId: inquiry.id,
        packageId: data.packageId,
        assignedToId: inquiry.assignedToId,
        status: LeadStatus.QUALIFIED, // Start in QUALIFIED status
        priority: data.priority || inquiry.priority,
        probability: 50,
        expectedRevenue: mappedRevenue,
        expectedBookingDate: data.expectedBookingDate || inquiry.eventDate,
        notes: carriedNotes,
        createdById: userId,
      });

      // 5. Mark Inquiry as CONVERTED so it no longer clutters active inquiries
      await tx.inquiry.update({
        where: { id: inquiry.id },
        data: {
          status: InquiryStatus.CONVERTED,
          updatedById: userId,
        }
      });

      // 6. Log Action on Lead and Activity Timeline
      await this.logAction(
        tx, tenantId, userId, lead.id, AUDIT_ACTIONS.CREATED, 
        `Lead ${leadCode} generated from Inquiry ${inquiry.inquiryCode}.`, 
        null, lead
      );

      await tx.activityTimeline.create({
        data: {
          tenantId,
          entityType: 'INQUIRY',
          entityId: inquiry.id,
          action: 'INQUIRY_CONVERTED',
          notes: `Inquiry converted to Lead ${leadCode}.`,
          createdById: userId,
        }
      });

      return serializePrisma(lead);
    });
  }

  static async update(id: string, payload: any) {
    const { tenantId, userId, branchId } = await this.validateSession();
    
    const hasPerm = await RoleService.hasPermission(userId, 'LEAD', 'UPDATE', branchId);
    if (!hasPerm) throw new Error("Permission denied");

    const data = UpdateLeadSchema.parse(payload);

    return prisma.$transaction(async (tx) => {
      const old = await tx.lead.findUnique({ where: { id, tenantId }, include: { customer: true } });
      if (!old) throw new Error("Lead not found");

      const updated = await tx.lead.update({
        where: { id, tenantId },
        data: {
          ...data,
          updatedById: userId,
        },
        include: {
          customer: true,
          assignedTo: true,
          package: true,
          inquiry: {
            include: { leadSource: true }
          },
          followUps: {
            orderBy: { followUpDate: 'desc' },
            take: 3,
          }
        }
      });

      let notes = 'Lead details updated.';
      if (old.status !== updated.status) {
        notes = `Lead stage changed from ${old.status} to ${updated.status}.`;
        if (updated.status === LeadStatus.LOST && updated.lostReason) {
          notes += ` Reason: ${updated.lostReason}`;
        }
      }

      // When lead is won, finalize customer booking and activate portal access
      if (old.status !== LeadStatus.WON && updated.status === LeadStatus.WON) {
        const portalCode = old.customer?.portalAccessCode || `PORTAL-${old.customer?.customerCode || updated.leadCode}`;
        if (old.customerId) {
          await tx.customer.update({
            where: { id: old.customerId },
            data: {
              isConfirmed: true,
              portalAccessGranted: true,
              portalAccessCode: portalCode,
              confirmedAt: old.customer?.confirmedAt || new Date(),
              updatedById: userId,
            }
          });
        }

        await tx.activityTimeline.create({
          data: {
            tenantId,
            entityType: 'CUSTOMER',
            entityId: old.customerId,
            action: 'CUSTOMER_CONFIRMED_VIA_LEAD',
            notes: `Customer confirmed upon Lead ${updated.leadCode} marked as WON. Portal access granted (${portalCode}).`,
            createdById: userId,
          }
        });
      }

      await this.logAction(tx, tenantId, userId, updated.id, AUDIT_ACTIONS.UPDATED, notes, old, updated);
      return serializePrisma(updated);
    });
  }

  /**
   * Converts a WON lead into confirmed Customer, EventBooking, Project,
   * and initializes an empty PostProductionJob with standard deliverable tasks.
   */
  static async convertLeadToBooking(leadId: string, customNotes?: string) {
    const { tenantId, userId, branchId } = await this.validateSession();
    const hasPerm = await RoleService.hasPermission(userId, 'LEAD', 'UPDATE', branchId);
    if (!hasPerm) throw new Error("Permission denied");

    return await HandoffService.convertLeadToBooking({
      leadId,
      notes: customNotes,
      tenantId,
      branchId,
      userId,
    });
  }

  static async confirmBooking(leadId: string, customNotes?: string) {
    return this.convertLeadToBooking(leadId, customNotes);
  }

  static async softDelete(id: string) {
    const { tenantId, userId, branchId } = await this.validateSession();
    
    const hasPerm = await RoleService.hasPermission(userId, 'LEAD', 'DELETE', branchId);
    if (!hasPerm) throw new Error("Permission denied");

    return prisma.$transaction(async (tx) => {
      const old = await tx.lead.findUnique({ where: { id, tenantId } });
      if (!old) throw new Error("Lead not found");

      const deleted = await LeadRepository.softDelete(tenantId, id, userId);

      await this.logAction(tx, tenantId, userId, deleted.id, AUDIT_ACTIONS.DELETED, 'Lead was deleted.', old, null);
      return true;
    });
  }
}
