import { prisma } from '@/lib/prisma';
import {
  Prisma,
  InvoiceStatus,
  EntryType,
  VoucherType,
  AccountType,
  PaymentMethod,
  PaymentStatus,
} from '@prisma/client';
import { auth } from '@/auth';
import { getActiveContext } from '@/lib/context';
import { NumberSeriesService } from '@/services/number-series.service';
import { AccountingService } from '@/services/accounting.service';
import { AccountingSyncService } from '@/services/accounting-sync.service';
import { serializePrisma } from '@/lib/serialize';

export class InvoiceService {
  private static async validateSession() {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.tenantId) throw new Error('Unauthorized');

    const context = await getActiveContext();
    return {
      tenantId: user.tenantId as string,
      userId: user.id as string,
      branchId: (context?.activeBranch?.id as string) || user.branchId,
    };
  }

  /**
   * Auto-generates an official Invoice from an accepted/approved quotation.
   * Copies quotation revision items to invoice line items and calculates totals atomically.
   */
  static async generateInvoiceFromQuotation(
    quotationId: string,
    explicitTenantId?: string,
    explicitBranchId?: string,
    explicitUserId?: string
  ) {
    let tenantId = explicitTenantId;
    let userId = explicitUserId;
    let branchId = explicitBranchId;

    if (!tenantId) {
      const session = await this.validateSession();
      tenantId = session.tenantId;
      userId = userId || session.userId;
      branchId = branchId || session.branchId;
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Fetch quotation with lead, customer, and latest revisions
      const quotation = await tx.quotation.findFirst({
        where: { id: quotationId, lead: { tenantId } },
        include: {
          lead: {
            include: {
              customer: {
                include: {
                  state: true,
                },
              },
              inquiry: true,
            },
          },
          quotationRevisions: {
            orderBy: { revisionNumber: 'desc' },
            take: 1,
            include: {
              items: true,
            },
          },
          invoice: true,
        },
      });

      if (!quotation) {
        throw new Error('Quotation not found');
      }

      // Check for existing invoice (idempotent)
      if (quotation.invoice) {
        return serializePrisma(quotation.invoice);
      }

      const lead = quotation.lead;
      if (!lead) {
        throw new Error('Associated lead not found for this quotation');
      }

      const customer = lead.customer;
      if (!customer) {
        throw new Error('Customer record not found for this quotation lineage');
      }

      // 2. Fetch Tenant and Branch to verify GST registration and Place of Supply
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
      });

      const effectiveBranchId = branchId || lead.branchId;
      const branch = effectiveBranchId
        ? await tx.branch.findFirst({
            where: { id: effectiveBranchId, tenantId },
          })
        : null;

      const isGstRegistered = Boolean(tenant?.isGstRegistered);

      // Place of supply and state determination
      const customerStateName = (customer.state?.name || '').trim();
      const customerStateCode = customer.stateCode || customer.state?.code || '';
      const supplierState = (branch?.state || tenant?.state || 'Maharashtra').trim().toLowerCase();
      const customerState = customerStateName.toLowerCase();
      const isInterState = isGstRegistered && Boolean(customerState && customerState !== supplierState);

      const placeOfSupply = customerStateCode
        ? `${customerStateCode}-${customerStateName || supplierState}`
        : (customerStateName || branch?.state || '27-Maharashtra');

      const customerGstin = customer.gstin || null;
      const customerTradeName = customer.companyName || `${customer.firstName} ${customer.lastName || ''}`.trim();

      // 3. Line Items & GST Calculation (SAC 998382 for photography)
      const latestRev = quotation.quotationRevisions[0];
      const items = latestRev?.items || [];

      const subtotal = latestRev?.subtotal ?? quotation.totalAmount;
      const discountAmount = latestRev?.discountAmount ?? new Prisma.Decimal(0);

      let totalCgst = new Prisma.Decimal(0);
      let totalSgst = new Prisma.Decimal(0);
      let totalIgst = new Prisma.Decimal(0);

      const preparedItems = items.map((item) => {
        const sacCode = '998382';
        const itemQty = item.quantity || 1;
        const unitPriceDec = item.unitPrice;
        const discDec = item.calculatedDiscountAmount ?? new Prisma.Decimal(0);
        const baseLineTotal = unitPriceDec.mul(itemQty).minus(discDec);

        let gstRate = new Prisma.Decimal(0);
        let cgstRate = new Prisma.Decimal(0);
        let cgstAmount = new Prisma.Decimal(0);
        let sgstRate = new Prisma.Decimal(0);
        let sgstAmount = new Prisma.Decimal(0);
        let igstRate = new Prisma.Decimal(0);
        let igstAmount = new Prisma.Decimal(0);
        let lineTax = new Prisma.Decimal(0);

        if (isGstRegistered) {
          const standardGst = 18.0;
          gstRate = new Prisma.Decimal(standardGst);

          if (isInterState) {
            igstRate = gstRate;
            igstAmount = item.calculatedTaxAmount && !item.calculatedTaxAmount.isZero()
              ? item.calculatedTaxAmount
              : baseLineTotal.mul(0.18).toDecimalPlaces(2);
            lineTax = igstAmount;
            totalIgst = totalIgst.plus(igstAmount);
          } else {
            cgstRate = new Prisma.Decimal(standardGst / 2);
            sgstRate = new Prisma.Decimal(standardGst / 2);
            const halfTax = item.calculatedTaxAmount && !item.calculatedTaxAmount.isZero()
              ? item.calculatedTaxAmount.div(2).toDecimalPlaces(2)
              : baseLineTotal.mul(0.09).toDecimalPlaces(2);
            cgstAmount = halfTax;
            sgstAmount = halfTax;
            lineTax = cgstAmount.plus(sgstAmount);
            totalCgst = totalCgst.plus(cgstAmount);
            totalSgst = totalSgst.plus(sgstAmount);
          }
        }

        const lineTotal = baseLineTotal.plus(lineTax);

        return {
          tenantId,
          itemType: item.lineItemType,
          name: item.itemName,
          description: item.description,
          sacCode,
          quantity: itemQty,
          unitPrice: unitPriceDec,
          gstRate,
          cgstRate,
          cgstAmount,
          sgstRate,
          sgstAmount,
          igstRate,
          igstAmount,
          taxAmount: lineTax,
          discountAmount: discDec,
          totalPrice: lineTotal,
        };
      });

      const invoiceTaxAmount = isGstRegistered
        ? totalCgst.plus(totalSgst).plus(totalIgst)
        : new Prisma.Decimal(0);
      const grandTotal = subtotal.minus(discountAmount).plus(invoiceTaxAmount);

      // 4. Generate sequential Invoice Number
      const invoiceNumber = await NumberSeriesService.getNextNumber(tx, tenantId, 'INVOICE');

      // Due date: default 14 days from issueDate or quotation validUntil
      const issueDate = new Date();
      const dueDate = quotation.validUntil || new Date(issueDate.getTime() + 14 * 24 * 60 * 60 * 1000);

      // 5. Create Invoice Record
      const invoice = await tx.invoice.create({
        data: {
          tenantId,
          branchId: effectiveBranchId,
          customerId: customer.id,
          leadId: lead.id,
          quotationId: quotation.id,
          invoiceNumber,
          status: InvoiceStatus.UNPAID,
          subtotal,
          taxAmount: invoiceTaxAmount,
          discountAmount,
          grandTotal,
          paidAmount: new Prisma.Decimal(0),
          balanceDue: grandTotal,
          placeOfSupply,
          isInterState,
          cgstAmount: totalCgst,
          sgstAmount: totalSgst,
          igstAmount: totalIgst,
          customerGstin,
          customerTradeName,
          issueDate,
          dueDate,
          notes: isGstRegistered
            ? `Auto-generated from quotation ${quotation.id.slice(0, 8)}`
            : `Bill of Supply - Unregistered under GST. Auto-generated from quotation ${quotation.id.slice(0, 8)}`,
          createdById: userId,
          items: {
            create: preparedItems,
          },
        },
        include: {
          items: true,
          customer: true,
          lead: true,
          quotation: true,
        },
      });

      // 6. CRUCIAL DOUBLE-ENTRY MERCANTILE ACCRUAL VOUCHER
      // DEBIT: Accounts Receivable (1100) [grandTotal]
      // CREDIT: Photography Revenue (4010) [subtotal - discountAmount]
      // CREDIT: Output CGST (2040) / Output SGST (2050) / Output IGST (2060)
      const arAccount = await AccountingSyncService.getOrCreateTargetAccount(
        tenantId,
        { code: '1100', preferredNameKeyword: 'Accounts Receivable' },
        AccountType.ASSET,
        tx
      );

      const revAccount = await AccountingSyncService.getOrCreateTargetAccount(
        tenantId,
        { code: '4010', preferredNameKeyword: 'Photography Revenue' },
        AccountType.REVENUE,
        tx
      );

      const netBaseRevenue = subtotal.minus(discountAmount);

      const accrualEntries: Array<{ accountId: string; type: EntryType; amount: number }> = [
        {
          accountId: arAccount.id,
          type: EntryType.DEBIT,
          amount: Number(grandTotal.toFixed(2)),
        },
        {
          accountId: revAccount.id,
          type: EntryType.CREDIT,
          amount: Number(netBaseRevenue.toFixed(2)),
        },
      ];

      if (totalCgst.greaterThan(0)) {
        const cgstAccount = await AccountingSyncService.getOrCreateTargetAccount(
          tenantId,
          { code: '2040', preferredNameKeyword: 'Output CGST' },
          AccountType.LIABILITY,
          tx
        );
        accrualEntries.push({
          accountId: cgstAccount.id,
          type: EntryType.CREDIT,
          amount: Number(totalCgst.toFixed(2)),
        });
      }

      if (totalSgst.greaterThan(0)) {
        const sgstAccount = await AccountingSyncService.getOrCreateTargetAccount(
          tenantId,
          { code: '2050', preferredNameKeyword: 'Output SGST' },
          AccountType.LIABILITY,
          tx
        );
        accrualEntries.push({
          accountId: sgstAccount.id,
          type: EntryType.CREDIT,
          amount: Number(totalSgst.toFixed(2)),
        });
      }

      if (totalIgst.greaterThan(0)) {
        const igstAccount = await AccountingSyncService.getOrCreateTargetAccount(
          tenantId,
          { code: '2060', preferredNameKeyword: 'Output IGST' },
          AccountType.LIABILITY,
          tx
        );
        accrualEntries.push({
          accountId: igstAccount.id,
          type: EntryType.CREDIT,
          amount: Number(totalIgst.toFixed(2)),
        });
      }

      await AccountingService.createVoucher({
        tenantId,
        userId,
        type: VoucherType.JOURNAL,
        date: issueDate,
        referenceId: `INV-${invoice.id}`,
        narration: `Sales Accrual for ${isGstRegistered ? 'Tax Invoice' : 'Bill of Supply'} #${invoiceNumber} issued to ${customerTradeName}.`,
        entries: accrualEntries,
        tx,
      });

      // 7. ADVANCE RECONCILIATION: Query for existing advance credits (2030) linked to this booking/lead
      const existingBooking = await tx.eventBooking.findFirst({
        where: {
          tenantId,
          deletedAt: null,
          OR: [
            { quotationId: quotation.id },
            ...(lead ? [{ leadId: lead.id }] : []),
          ],
        },
      });

      let totalAdvanceAvailable = new Prisma.Decimal(0);
      let advanceRefVoucher = '';

      if (existingBooking) {
        const advVoucher = await tx.financialVoucher.findFirst({
          where: {
            tenantId,
            referenceId: `BKG-ADV-${existingBooking.id}`,
            isVoided: false,
            deletedAt: null,
          },
          include: { entries: true },
        });

        if (advVoucher) {
          const creditEntry = advVoucher.entries.find((e) => e.type === EntryType.CREDIT);
          if (creditEntry) {
            totalAdvanceAvailable = totalAdvanceAvailable.plus(creditEntry.amount);
            advanceRefVoucher = advVoucher.voucherNumber;
          }
        }
      }

      // Check if lead had an advance voucher if booking did not
      if (totalAdvanceAvailable.isZero() && lead) {
        const leadAdvVoucher = await tx.financialVoucher.findFirst({
          where: {
            tenantId,
            referenceId: `LEAD-ADV-${lead.id}`,
            isVoided: false,
            deletedAt: null,
          },
          include: { entries: true },
        });

        if (leadAdvVoucher) {
          const creditEntry = leadAdvVoucher.entries.find((e) => e.type === EntryType.CREDIT);
          if (creditEntry) {
            totalAdvanceAvailable = totalAdvanceAvailable.plus(creditEntry.amount);
            advanceRefVoucher = leadAdvVoucher.voucherNumber;
          }
        }
      }

      let reconciledAmount = new Prisma.Decimal(0);
      let finalInvoice = invoice;

      if (totalAdvanceAvailable.greaterThan(0)) {
        reconciledAmount = Prisma.Decimal.min(totalAdvanceAvailable, grandTotal);

        if (reconciledAmount.greaterThan(0)) {
          // Resolve Advance account (2030)
          const advanceAccount = await AccountingSyncService.getOrCreateTargetAccount(
            tenantId,
            { code: '2030', preferredNameKeyword: 'Client Booking Advances' },
            AccountType.LIABILITY,
            tx
          );

          // Post Reconciliation Journal: DEBIT Advance (2030), CREDIT AR (1100)
          await AccountingService.createVoucher({
            tenantId,
            userId,
            type: VoucherType.JOURNAL,
            date: new Date(),
            referenceId: `ADV-REC-${invoice.id}`,
            narration: `Advance Reconciliation for Invoice #${invoiceNumber}: Setting off ₹${reconciledAmount.toString()} from Client Booking Advances against Accounts Receivable.`,
            entries: [
              {
                accountId: advanceAccount.id,
                type: EntryType.DEBIT,
                amount: Number(reconciledAmount.toFixed(2)),
              },
              {
                accountId: arAccount.id,
                type: EntryType.CREDIT,
                amount: Number(reconciledAmount.toFixed(2)),
              },
            ],
            tx,
          });

          // Update Invoice balances and status
          const updatedPaid = reconciledAmount;
          const updatedBalance = grandTotal.minus(reconciledAmount);
          const updatedStatus = updatedBalance.lessThanOrEqualTo(0)
            ? InvoiceStatus.PAID
            : InvoiceStatus.PARTIALLY_PAID;

          finalInvoice = await tx.invoice.update({
            where: { id: invoice.id },
            data: {
              paidAmount: updatedPaid,
              balanceDue: updatedBalance.lessThan(0) ? new Prisma.Decimal(0) : updatedBalance,
              status: updatedStatus,
            },
            include: {
              items: true,
              customer: true,
              lead: true,
              quotation: true,
              payments: true,
            },
          });

          // Create an applied payment receipt record for audit
          const advanceReceiptNum = await NumberSeriesService.getNextNumber(tx, tenantId, 'PAYMENT');
          await tx.payment.create({
            data: {
              tenantId,
              branchId: effectiveBranchId,
              invoiceId: invoice.id,
              customerId: customer.id,
              receiptNumber: advanceReceiptNum,
              amount: reconciledAmount,
              paymentMethod: PaymentMethod.BANK_TRANSFER,
              paymentDate: new Date(),
              status: PaymentStatus.SUCCESS,
              notes: `Advance deposit of ₹${reconciledAmount.toString()} reconciled against invoice #${invoiceNumber} (Ref Voucher: ${advanceRefVoucher || 'BKG-ADV'}).`,
              createdById: userId,
            },
          });

          // Link booking to invoice
          if (existingBooking) {
            await tx.eventBooking.update({
              where: { id: existingBooking.id },
              data: {
                invoiceId: invoice.id,
              },
            });
          }
        }
      }

      // 8. Log Activity Timeline
      await tx.activityTimeline.create({
        data: {
          tenantId,
          entityType: 'LEAD',
          entityId: lead.id,
          action: 'INVOICE_GENERATED',
          notes: `Invoice ${invoiceNumber} created with Grand Total: ₹${grandTotal.toString()} (${
            isGstRegistered ? (isInterState ? 'IGST 18%' : 'CGST 9% + SGST 9%') : 'Bill of Supply'
          }).${reconciledAmount.greaterThan(0) ? ` Advance deposit of ₹${reconciledAmount.toString()} set-off.` : ''}`,
          createdById: userId,
        },
      });

      return serializePrisma(finalInvoice);
    });
  }

  static async findById(id: string) {
    const { tenantId } = await this.validateSession();
    const invoice = await prisma.invoice.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        items: true,
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
        customer: true,
        lead: true,
        quotation: true,
        eventBookings: true,
      },
    });

    if (!invoice) return null;
    return serializePrisma(invoice);
  }

  static async findAll(filters?: any, pagination?: { take?: number; skip?: number }) {
    const { tenantId, branchId } = await this.validateSession();
    const take = pagination?.take ?? 50;
    const skip = pagination?.skip ?? 0;

    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        ...(branchId ? { branchId } : {}),
        deletedAt: null,
        ...filters,
      },
      include: {
        customer: true,
        payments: true,
        lead: true,
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });

    return serializePrisma(invoices);
  }

  /**
   * Enterprise paginated invoices retrieval with strict take/skip memory guards.
   */
  static async getInvoices(params?: {
    page?: number;
    pageSize?: number;
    filters?: any;
  }) {
    const { tenantId, branchId } = await this.validateSession();
    const page = Math.max(1, params?.page || 1);
    const take = Math.min(Math.max(1, params?.pageSize || 50), 100);
    const skip = (page - 1) * take;

    const where = {
      tenantId,
      ...(branchId ? { branchId } : {}),
      deletedAt: null,
      ...(params?.filters || {}),
    };

    const [invoices, totalCount] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          customer: true,
          payments: {
            where: { deletedAt: null },
            orderBy: { paymentDate: 'desc' },
          },
          lead: true,
          quotation: true,
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.invoice.count({ where }),
    ]);

    return {
      invoices: serializePrisma(invoices),
      totalCount,
      page,
      pageSize: take,
      totalPages: Math.ceil(totalCount / take),
    };
  }

  static async findByLeadId(leadId: string) {
    const { tenantId } = await this.validateSession();
    const invoices = await prisma.invoice.findMany({
      where: {
        OR: [
          { leadId },
          { quotation: { leadId } },
        ],
        tenantId,
        deletedAt: null,
      },
      include: {
        items: true,
        payments: {
          where: { deletedAt: null },
          orderBy: { paymentDate: 'desc' },
        },
        quotation: true,
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return serializePrisma(invoices);
  }

  static async getRecentInvoices(limit: number = 5) {
    const { tenantId } = await this.validateSession();
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      include: {
        customer: true,
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
        lead: true,
        quotation: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return serializePrisma(invoices);
  }
}
