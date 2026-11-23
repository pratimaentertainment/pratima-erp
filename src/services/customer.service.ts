import { CustomerRepository } from '@/repositories/customer.repository';
import { NumberSeriesService } from './number-series.service';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { getActiveContext } from '@/lib/context';
import { Prisma } from '@prisma/client';
import { serializePrisma } from '@/lib/serialize';
import bcrypt from 'bcryptjs';

export class CustomerService {
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

  static async logAction(tx: Prisma.TransactionClient, tenantId: string, userId: string, entityId: string, action: string, oldValues?: any, newValues?: any) {
    await tx.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'CUSTOMER',
        entityId,
        action,
        oldValues: oldValues ? JSON.parse(JSON.stringify(oldValues)) : undefined,
        newValues: newValues ? JSON.parse(JSON.stringify(newValues)) : undefined,
      }
    });
  }

  static async findAll(tenantIdOrCtx?: any, maybeBranchId?: string | null, includeUnconfirmed = false) {
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
    }

    return CustomerRepository.findAll(tenantId, branchId || undefined, includeUnconfirmed);
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

    return CustomerRepository.findById(tenantId, id);
  }

  static async create(data: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    cityId?: string;
    stateId?: string;
  }) {
    const { tenantId, userId, branchId } = await this.validateSession();

    return prisma.$transaction(async (tx) => {
      // Generate code safely
      const customerCode = await NumberSeriesService.getNextNumber(tx, tenantId, 'CUSTOMER');
      const portalAccessCode = `PORTAL-${customerCode}`;
      const rawPin = Math.floor(100000 + Math.random() * 900000).toString();
      const portalPin = await bcrypt.hash(rawPin, 10);

      const created = await CustomerRepository.create(tx, {
        tenantId,
        branchId,
        customerCode,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        cityId: data.cityId,
        stateId: data.stateId,
        isConfirmed: true,
        portalAccessGranted: true,
        portalAccessCode,
        portalPin,
        confirmedAt: new Date(),
        createdById: userId,
      });

      await this.logAction(tx, tenantId, userId, created.id, 'CREATE', null, created);
      return created;
    });
  }

  static async confirmCustomer(customerId: string, options?: { notes?: string }) {
    const { tenantId, userId } = await this.validateSession();

    return prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: { id: customerId, tenantId },
      });

      if (!customer) throw new Error("Customer not found");

      const portalAccessCode = customer.portalAccessCode || `PORTAL-${customer.customerCode}`;
      let portalPin = customer.portalPin;
      if (!portalPin) {
        const rawPin = Math.floor(100000 + Math.random() * 900000).toString();
        portalPin = await bcrypt.hash(rawPin, 10);
      }

      const updated = await tx.customer.update({
        where: { id: customerId },
        data: {
          isConfirmed: true,
          portalAccessGranted: true,
          portalAccessCode,
          portalPin,
          confirmedAt: customer.confirmedAt || new Date(),
          updatedById: userId,
        },
        include: {
          city: true,
          state: true,
        }
      });

      await this.logAction(
        tx, tenantId, userId, customer.id, 'CUSTOMER_CONFIRMED',
        customer, updated
      );

      await tx.activityTimeline.create({
        data: {
          tenantId,
          entityType: 'CUSTOMER',
          entityId: customer.id,
          action: 'CUSTOMER_CONFIRMED',
          notes: options?.notes || `Customer ${customer.customerCode} confirmed and portal access generated (${portalAccessCode}).`,
          createdById: userId,
        }
      });

      return updated;
    });
  }

  static async update(id: string, data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    cityId?: string;
    stateId?: string;
  }) {
    const { tenantId, userId } = await this.validateSession();

    return prisma.$transaction(async (tx) => {
      const old = await tx.customer.findUnique({ where: { id, tenantId } });
      if (!old) throw new Error("Customer not found");

      const updated = await CustomerRepository.update(tenantId, id, {
        ...data,
        updatedById: userId,
      });

      await this.logAction(tx, tenantId, userId, updated.id, 'UPDATE', old, updated);
      return updated;
    });
  }

  static async softDelete(id: string) {
    const { tenantId, userId } = await this.validateSession();

    return prisma.$transaction(async (tx) => {
      const old = await tx.customer.findUnique({ where: { id, tenantId } });
      if (!old) throw new Error("Customer not found");

      const deleted = await CustomerRepository.softDelete(tenantId, id, userId);

      await this.logAction(tx, tenantId, userId, deleted.id, 'DELETE', old, null);
      return true;
    });
  }

  /**
   * Fetches the complete 360-degree profile of a customer, including:
   * Leads & historical quotations, Invoices, Payments, and EventBookings
   * with deep inclusion of SubEvents and StaffAssignments.
   */
  static async getCustomer360Profile(customerId: string, explicitTenantId?: string) {
    let tenantId = explicitTenantId;
    if (!tenantId) {
      const sessionData = await this.validateSession();
      tenantId = sessionData.tenantId;
    }

    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        tenantId,
        deletedAt: null,
      },
      include: {
        city: true,
        state: true,
        branch: true,
        _count: {
          select: {
            leads: true,
            invoices: true,
            creditNotes: true,
            payments: true,
            eventBookings: true,
            storageRecords: true,
            clientSelections: true,
          },
        },
        leads: {
          where: { deletedAt: null },
          take: 10,
          include: {
            assignedTo: true,
            package: true,
            quotations: {
              include: {
                quotationRevisions: {
                  orderBy: { revisionNumber: 'desc' },
                  take: 1,
                },
                invoice: true,
              },
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        invoices: {
          where: { deletedAt: null },
          take: 10,
          include: {
            items: true,
            payments: {
              where: { deletedAt: null },
              orderBy: { paymentDate: 'desc' },
            },
            quotation: true,
            creditNotes: {
              where: { deletedAt: null },
              include: { items: true },
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        creditNotes: {
          where: { deletedAt: null },
          take: 10,
          include: {
            items: true,
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
                grandTotal: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        payments: {
          where: { deletedAt: null },
          take: 10,
          include: {
            invoice: true,
          },
          orderBy: { paymentDate: 'desc' },
        },
        eventBookings: {
          where: { deletedAt: null },
          take: 10,
          include: {
            subEvents: {
              where: { deletedAt: null },
              include: {
                staffAssignments: {
                  where: { deletedAt: null },
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        designation: true,
                        skills: true,
                        employmentType: true,
                      },
                    },
                  },
                  orderBy: { createdAt: 'asc' },
                },
              },
              orderBy: { eventDate: 'asc' },
            },
            invoice: true,
            quotation: true,
          },
          orderBy: { startDate: 'desc' },
        },
        storageRecords: {
          where: { deletedAt: null },
          take: 10,
          include: {
            integration: {
              select: { provider: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        clientSelections: {
          where: { deletedAt: null },
          take: 10,
          include: {
            _count: {
              select: { items: true, galleryFolders: true },
            },
            galleryFolders: {
              include: {
                _count: {
                  select: { photos: true },
                },
              },
            },
            eventBooking: {
              select: {
                id: true,
                title: true,
                bookingNumber: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return customer ? serializePrisma(customer) : null;
  }
}
