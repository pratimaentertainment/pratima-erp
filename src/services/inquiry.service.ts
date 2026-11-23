import { InquiryRepository } from '@/repositories/inquiry.repository';
import { CustomerRepository } from '@/repositories/customer.repository';
import { NumberSeriesService } from './number-series.service';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { getActiveContext } from '@/lib/context';
import { Prisma, Priority } from '@prisma/client';
import { CreateInquiryInput, UpdateInquiryInput } from '@/schemas/inquiry.schema';
import { serializePrisma } from '@/lib/serialize';

export class InquiryService {
  static async validateSession(): Promise<{ tenantId: string; userId: string; branchId: string }> {
    const session = await auth();
    const user = session?.user as { id?: string; tenantId?: string } | undefined;
    if (!user?.tenantId || !user?.id) throw new Error('Unauthorized');

    const context = await getActiveContext();
    if (!context?.activeBranch?.id) throw new Error('No active branch selected');

    return {
      tenantId: user.tenantId,
      userId: user.id,
      branchId: context.activeBranch.id,
    };
  }

  static async logAction(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userId: string,
    entityId: string,
    action: string,
    notes?: string,
    oldValues?: unknown,
    newValues?: unknown
  ) {
    await tx.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'INQUIRY',
        entityId,
        action,
        oldValues: oldValues ? (JSON.parse(JSON.stringify(oldValues)) as Prisma.InputJsonValue) : Prisma.JsonNull,
        newValues: newValues ? (JSON.parse(JSON.stringify(newValues)) as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });

    await tx.activityTimeline.create({
      data: {
        tenantId,
        entityType: 'INQUIRY',
        entityId,
        action,
        notes,
        createdById: userId,
      },
    });
  }

  static async findAll(
    tenantIdOrSession?: string | { tenantId?: string; branchId?: string | null },
    branchId?: string | null,
    includeConverted = false
  ) {
    let tenantId: string;
    let bId = branchId;

    if (typeof tenantIdOrSession === 'string') {
      tenantId = tenantIdOrSession;
    } else if (tenantIdOrSession?.tenantId) {
      tenantId = tenantIdOrSession.tenantId;
      bId = tenantIdOrSession.branchId !== undefined ? tenantIdOrSession.branchId : bId;
    } else {
      const sessionData = await this.validateSession();
      tenantId = sessionData.tenantId;
      bId = sessionData.branchId;
    }

    const inquiries = await InquiryRepository.findAll(tenantId, bId || undefined, includeConverted);
    const serialized = (inquiries || []).map((inquiry) => ({
      ...inquiry,
      budget: null,
      budgetRange: inquiry.budgetRange || null,
      lead: inquiry.lead
        ? {
            ...inquiry.lead,
            expectedRevenue:
              inquiry.lead.expectedRevenue != null
                ? Number(inquiry.lead.expectedRevenue)
                : null,
          }
        : null,
    }));
    return serializePrisma(serialized);
  }

  static async findById(idOrTenantId: string, maybeId?: string) {
    let id = idOrTenantId;
    let tenantId: string;

    if (maybeId) {
      tenantId = idOrTenantId;
      id = maybeId;
    } else {
      const sessionData = await this.validateSession();
      tenantId = sessionData.tenantId;
    }

    const inquiry = await InquiryRepository.findById(tenantId, id);
    if (!inquiry) return null;

    const leadExpectedRev = (inquiry as unknown as { lead?: { expectedRevenue?: unknown } | null })?.lead?.expectedRevenue;

    const serialized = {
      ...inquiry,
      budget: null,
      budgetRange: inquiry.budgetRange || null,
      lead: (inquiry as unknown as { lead?: Record<string, unknown> | null })?.lead
        ? {
            ...((inquiry as unknown as { lead: Record<string, unknown> }).lead),
            expectedRevenue: leadExpectedRev != null ? Number(leadExpectedRev) || null : null,
          }
        : null,
    };
    return serializePrisma(serialized);
  }

  static async create(
    dataOrTenantId: CreateInquiryInput | Record<string, unknown> | string,
    maybeBranchId?: string | null,
    maybeData?: CreateInquiryInput | Record<string, unknown>
  ) {
    let tenantId: string;
    let branchId: string | null = null;
    let userId: string;
    let data: Record<string, unknown>;

    if (maybeData) {
      tenantId = dataOrTenantId as string;
      branchId = maybeBranchId || null;
      data = maybeData as Record<string, unknown>;
      userId = (data.createdById as string) || 'SYSTEM';
    } else {
      data = dataOrTenantId as Record<string, unknown>;
      const sessionData = await this.validateSession();
      tenantId = sessionData.tenantId;
      userId = sessionData.userId;
      branchId = sessionData.branchId;
    }

    let firstName = (data.firstName as string) || '';
    let lastName = (data.lastName as string) || '';
    const rawCustomerName = (data.customerName || data.name) as string | undefined;
    if (!firstName && rawCustomerName) {
      const parts = rawCustomerName.trim().split(/\s+/);
      firstName = parts[0] || 'Client';
      lastName = parts.slice(1).join(' ') || '';
    }
    firstName = firstName || 'Client';
    const phone = (data.phone || data.customerPhone) as string | undefined;
    const email = (data.email || data.customerEmail) as string | undefined;
    const whatsapp = (data.whatsapp || data.customerWhatsapp) as string | undefined;

    return prisma.$transaction(async (tx) => {
      let resolvedBranchId = branchId;
      if (!resolvedBranchId) {
        const defaultBranch = await tx.branch.findFirst({
          where: { tenantId, deletedAt: null },
          orderBy: [{ isHeadOffice: 'desc' }, { createdAt: 'asc' }],
        });
        if (!defaultBranch) {
          throw new Error('No active branch found for tenant');
        }
        resolvedBranchId = defaultBranch.id;
      }

      // 1. Duplicate detection logic
      let customerId: string;

      const existingCustomers = await tx.customer.findMany({
        where: {
          tenantId,
          OR: [
            ...(phone ? [{ phone }] : []),
            ...(whatsapp ? [{ whatsapp }] : []),
            ...(email ? [{ email }] : []),
          ],
          deletedAt: null,
        },
      });

      if (existingCustomers.length > 0) {
        // Link to existing customer
        const existing = existingCustomers[0];
        customerId = existing.id;
        const customerUpdates: Prisma.CustomerUpdateInput = {};
        if ((!existing.firstName || existing.firstName === 'Client') && firstName && firstName !== 'Client') {
          customerUpdates.firstName = firstName;
        }
        if (!existing.lastName && lastName) {
          customerUpdates.lastName = lastName;
        }
        if (!existing.email && email) {
          customerUpdates.email = email;
        }
        if (!existing.whatsapp && whatsapp) {
          customerUpdates.whatsapp = whatsapp;
        }
        if (Object.keys(customerUpdates).length > 0) {
          await tx.customer.update({
            where: { id: existing.id },
            data: customerUpdates,
          });
        }
      } else {
        // Create new customer safely
        const customerCode = await NumberSeriesService.getNextNumber(tx, tenantId, 'CUSTOMER');
        const customer = await CustomerRepository.create(tx, {
          tenantId,
          branchId: resolvedBranchId,
          customerCode,
          firstName,
          lastName,
          email: email || null,
          phone: phone || null,
          whatsapp: whatsapp || null,
          createdById: userId,
        });
        customerId = customer.id;
      }

      // 2. Generate Inquiry Code
      const inquiryCode = await NumberSeriesService.getNextNumber(tx, tenantId, 'INQUIRY');

      // 3. Create Inquiry
      const inquiry = await InquiryRepository.create(tx, {
        tenantId,
        branchId: resolvedBranchId,
        inquiryCode,
        customerId,
        inquiryDate: data.inquiryDate ? new Date(data.inquiryDate as string | number | Date) : new Date(),
        eventDate: data.eventDate ? new Date(data.eventDate as string | number | Date) : null,
        eventType: (data.eventType as string) || 'Wedding',
        preferredContactTime: (data.preferredContactTime as string) || null,
        budgetRange: (data.budgetRange as string) || null,
        leadSourceId: (data.leadSourceId as string) || null,
        assignedToId: (data.assignedToId as string) || null,
        priority: (data.priority as Priority) || 'MEDIUM',
        notes: (data.notes as string) || null,
        createdById: userId,
      });

      // 4. Log Action and Activity Timeline
      await this.logAction(
        tx,
        tenantId,
        userId,
        inquiry.id,
        'INQUIRY_CREATED',
        `Inquiry ${inquiryCode} created for ${firstName} ${lastName}.`,
        null,
        inquiry
      );

      return inquiry;
    });
  }

  static async update(id: string, data: UpdateInquiryInput | Prisma.InquiryUncheckedUpdateInput) {
    const { tenantId, userId } = await this.validateSession();

    return prisma.$transaction(async (tx) => {
      const old = await tx.inquiry.findUnique({ where: { id, tenantId } });
      if (!old) throw new Error('Inquiry not found');

      const updated = await InquiryRepository.update(tenantId, id, {
        ...data,
        updatedById: userId,
      });

      if (!updated) throw new Error('Failed to update inquiry');

      await this.logAction(tx, tenantId, userId, updated.id, 'INQUIRY_UPDATED', 'Inquiry details updated.', old, updated);
      return updated;
    });
  }

  static async softDelete(id: string) {
    const { tenantId, userId } = await this.validateSession();

    return prisma.$transaction(async (tx) => {
      const old = await tx.inquiry.findUnique({ where: { id, tenantId } });
      if (!old) throw new Error('Inquiry not found');

      const deleted = await InquiryRepository.softDelete(tenantId, id, userId);

      if (!deleted) throw new Error('Failed to delete inquiry');

      await this.logAction(tx, tenantId, userId, deleted.id, 'INQUIRY_DELETED', 'Inquiry was deleted.', old, null);
      return true;
    });
  }
}
