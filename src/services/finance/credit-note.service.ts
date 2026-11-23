import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { serializePrisma } from '@/lib/serialize';
import { AccountingService } from '@/services/accounting.service';
import { AccountingSyncService } from '@/services/accounting-sync.service';
import {
  CreditNoteReason,
  InvoiceStatus,
  AccountType,
  EntryType,
  VoucherType,
  PaymentMethod,
  Prisma,
} from '@prisma/client';

export interface CreditNoteItemToReverse {
  invoiceItemId?: string;
  name?: string;
  sacCode?: string;
  quantity: number;
  unitPrice: number;
  gstRate?: number;
}

export interface GenerateCreditNoteParams {
  invoiceId: string;
  reason: CreditNoteReason;
  notes?: string;
  refundAmount?: number;
  sourceAccountId?: string;
  refundPaymentMethod?: PaymentMethod | 'BANK' | 'CASH' | 'UPI' | 'OTHER';
  refundReference?: string;
  itemsToReverse?: CreditNoteItemToReverse[];
  tenantId?: string;
  userId?: string;
}

export class CreditNoteService {
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
   * Generates a statutory Credit Note against an existing Invoice, reverses statutory GST
   * and Revenue via double-entry Journal Voucher, and optionally disburses client cash/bank refunds.
   */
  static async generateCreditNote(params: GenerateCreditNoteParams) {
    const { tenantId, userId } = await this.resolveSession({
      tenantId: params.tenantId,
      userId: params.userId,
    });

    const refundAmountNum = Number(params.refundAmount || 0);

    if (refundAmountNum > 0 && !params.sourceAccountId) {
      throw new Error('A source ledger account (Bank or Cash) is required when refunding amounts to client.');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Fetch original Invoice with items, customer, and existing credit notes
      const invoice = await tx.invoice.findFirst({
        where: {
          id: params.invoiceId,
          tenantId,
          deletedAt: null,
        },
        include: {
          items: true,
          customer: {
            include: { state: true },
          },
          tenant: true,
          branch: true,
          creditNotes: {
            where: { deletedAt: null },
          },
        },
      });

      if (!invoice) {
        throw new Error('Invoice not found or unauthorized.');
      }

      if (invoice.status === InvoiceStatus.CANCELLED) {
        throw new Error('Invoice is already marked as CANCELLED.');
      }

      const invoicePaid = Number(invoice.paidAmount || 0);
      if (refundAmountNum > invoicePaid) {
        throw new Error(
          `Refund amount (₹${refundAmountNum}) cannot exceed total amount paid on invoice (₹${invoicePaid}).`
        );
      }

      const isGstRegistered = Boolean(invoice.tenant?.isGstRegistered);
      const isInterState = Boolean(invoice.isInterState);

      // 2. Determine line items to reverse
      let preparedItems: Array<{
        name: string;
        sacCode: string;
        quantity: number;
        unitPrice: number;
        subtotal: number;
        gstRate: number;
        cgstAmount: number;
        sgstAmount: number;
        igstAmount: number;
        totalPrice: number;
      }> = [];

      if (params.itemsToReverse && params.itemsToReverse.length > 0) {
        // Partial or specific item selection
        for (const itemInput of params.itemsToReverse) {
          const matchedInvoiceItem = itemInput.invoiceItemId
            ? invoice.items.find((i) => i.id === itemInput.invoiceItemId)
            : undefined;

          const name = itemInput.name || matchedInvoiceItem?.name || 'Reversed Service Item';
          const sacCode = itemInput.sacCode || matchedInvoiceItem?.sacCode || '998382';
          const quantity = Math.max(1, itemInput.quantity || matchedInvoiceItem?.quantity || 1);
          const unitPrice =
            itemInput.unitPrice !== undefined
              ? itemInput.unitPrice
              : matchedInvoiceItem
              ? Number(matchedInvoiceItem.unitPrice)
              : 0;

          const lineSubtotal = quantity * unitPrice;
          const gstRate = isGstRegistered
            ? itemInput.gstRate !== undefined
              ? itemInput.gstRate
              : matchedInvoiceItem
              ? Number(matchedInvoiceItem.gstRate)
              : 18
            : 0;

          let cgstAmount = 0;
          let sgstAmount = 0;
          let igstAmount = 0;

          if (isGstRegistered && gstRate > 0) {
            const taxFactor = gstRate / 100;
            if (isInterState) {
              igstAmount = Number((lineSubtotal * taxFactor).toFixed(2));
            } else {
              const halfTaxFactor = taxFactor / 2;
              cgstAmount = Number((lineSubtotal * halfTaxFactor).toFixed(2));
              sgstAmount = Number((lineSubtotal * halfTaxFactor).toFixed(2));
            }
          }

          const lineTotal = Number(
            (lineSubtotal + cgstAmount + sgstAmount + igstAmount).toFixed(2)
          );

          preparedItems.push({
            name,
            sacCode,
            quantity,
            unitPrice,
            subtotal: lineSubtotal,
            gstRate,
            cgstAmount,
            sgstAmount,
            igstAmount,
            totalPrice: lineTotal,
          });
        }
      } else {
        // 100% Full Invoice Reversal (all original line items)
        for (const item of invoice.items) {
          const lineSubtotal = Number(item.unitPrice) * item.quantity;
          const gstRate = isGstRegistered ? Number(item.gstRate || 0) : 0;
          const cgstAmount = isGstRegistered ? Number(item.cgstAmount || 0) : 0;
          const sgstAmount = isGstRegistered ? Number(item.sgstAmount || 0) : 0;
          const igstAmount = isGstRegistered ? Number(item.igstAmount || 0) : 0;
          const lineTotal = Number(item.totalPrice);

          preparedItems.push({
            name: item.name,
            sacCode: item.sacCode || '998382',
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            subtotal: lineSubtotal,
            gstRate,
            cgstAmount,
            sgstAmount,
            igstAmount,
            totalPrice: lineTotal,
          });
        }
      }

      if (preparedItems.length === 0) {
        throw new Error('No items specified to reverse.');
      }

      // 3. Compute credit note totals
      const totalSubtotal = preparedItems.reduce((acc, i) => acc + i.subtotal, 0);
      const totalCgst = preparedItems.reduce((acc, i) => acc + i.cgstAmount, 0);
      const totalSgst = preparedItems.reduce((acc, i) => acc + i.sgstAmount, 0);
      const totalIgst = preparedItems.reduce((acc, i) => acc + i.igstAmount, 0);
      const totalGrand = Number(
        (totalSubtotal + totalCgst + totalSgst + totalIgst).toFixed(2)
      );

      if (totalGrand <= 0) {
        throw new Error('Credit Note grand total must be greater than zero.');
      }

      // 4. Generate unique sequential credit note number (CN-{YYYY}-{00001})
      const currentYear = new Date().getFullYear();
      const series = await tx.numberSeries.upsert({
        where: {
          tenantId_entityType: {
            tenantId,
            entityType: `CREDIT_NOTE_${currentYear}`,
          },
        },
        update: {
          nextNumber: { increment: 1 },
        },
        create: {
          tenantId,
          entityType: `CREDIT_NOTE_${currentYear}`,
          prefix: `CN-${currentYear}`,
          nextNumber: 2,
        },
      });

      const currentNumber = series.nextNumber - 1;
      const paddedNumber = currentNumber.toString().padStart(5, '0');
      const creditNoteNumber = `${series.prefix}-${paddedNumber}`;

      // 5. Create CreditNote & CreditNoteItems
      const creditNote = await tx.creditNote.create({
        data: {
          tenantId,
          branchId: invoice.branchId,
          customerId: invoice.customerId,
          invoiceId: invoice.id,
          creditNoteNumber,
          status: refundAmountNum > 0 ? 'REFUNDED' : 'ISSUED',
          reason: params.reason,
          notes: params.notes || null,
          issueDate: new Date(),
          subtotal: new Prisma.Decimal(totalSubtotal.toFixed(2)),
          cgstAmount: new Prisma.Decimal(totalCgst.toFixed(2)),
          sgstAmount: new Prisma.Decimal(totalSgst.toFixed(2)),
          igstAmount: new Prisma.Decimal(totalIgst.toFixed(2)),
          grandTotal: new Prisma.Decimal(totalGrand.toFixed(2)),
          refundAmount: new Prisma.Decimal(refundAmountNum.toFixed(2)),
          createdById: userId !== 'system' ? userId : null,
          items: {
            create: preparedItems.map((item) => ({
              name: item.name,
              sacCode: item.sacCode,
              quantity: item.quantity,
              unitPrice: new Prisma.Decimal(item.unitPrice.toFixed(2)),
              gstRate: new Prisma.Decimal(item.gstRate.toFixed(2)),
              cgstAmount: new Prisma.Decimal(item.cgstAmount.toFixed(2)),
              sgstAmount: new Prisma.Decimal(item.sgstAmount.toFixed(2)),
              igstAmount: new Prisma.Decimal(item.igstAmount.toFixed(2)),
              totalPrice: new Prisma.Decimal(item.totalPrice.toFixed(2)),
            })),
          },
        },
        include: {
          items: true,
          customer: true,
          invoice: true,
        },
      });

      // 6. THE DOUBLE-ENTRY REVERSAL JOURNAL VOUCHER
      // DEBIT: Photography Revenue (4010) [Subtotal Reversed]
      // DEBIT: Output CGST (2040) / Output SGST (2050) / Output IGST (2060) [Taxes Reversed]
      // CREDIT: Accounts Receivable (1100 / 1050) [Grand Total Reversed]
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

      const reversalEntries: Array<{ accountId: string; type: EntryType; amount: number }> = [
        {
          accountId: revAccount.id,
          type: EntryType.DEBIT,
          amount: Number(totalSubtotal.toFixed(2)),
        },
      ];

      if (totalCgst > 0) {
        const cgstAccount = await AccountingSyncService.getOrCreateTargetAccount(
          tenantId,
          { code: '2040', preferredNameKeyword: 'Output CGST' },
          AccountType.LIABILITY,
          tx
        );
        reversalEntries.push({
          accountId: cgstAccount.id,
          type: EntryType.DEBIT,
          amount: Number(totalCgst.toFixed(2)),
        });
      }

      if (totalSgst > 0) {
        const sgstAccount = await AccountingSyncService.getOrCreateTargetAccount(
          tenantId,
          { code: '2050', preferredNameKeyword: 'Output SGST' },
          AccountType.LIABILITY,
          tx
        );
        reversalEntries.push({
          accountId: sgstAccount.id,
          type: EntryType.DEBIT,
          amount: Number(totalSgst.toFixed(2)),
        });
      }

      if (totalIgst > 0) {
        const igstAccount = await AccountingSyncService.getOrCreateTargetAccount(
          tenantId,
          { code: '2060', preferredNameKeyword: 'Output IGST' },
          AccountType.LIABILITY,
          tx
        );
        reversalEntries.push({
          accountId: igstAccount.id,
          type: EntryType.DEBIT,
          amount: Number(totalIgst.toFixed(2)),
        });
      }

      // Credit Accounts Receivable by total grand reversed
      reversalEntries.push({
        accountId: arAccount.id,
        type: EntryType.CREDIT,
        amount: Number(totalGrand.toFixed(2)),
      });

      await AccountingService.createVoucher({
        tenantId,
        userId,
        type: VoucherType.JOURNAL,
        date: new Date(),
        referenceId: `CN-${creditNote.id}`,
        narration: `Statutory Reversal for Credit Note #${creditNoteNumber} issued against Invoice #${invoice.invoiceNumber}. Reason: ${params.reason}.`,
        entries: reversalEntries,
        tx,
      });

      // 7. CLIENT CASH/BANK REFUND VOUCHER (If refundAmount > 0)
      // DEBIT: Accounts Receivable (1100) [Refund Amount]
      // CREDIT: Bank/Cash Account [Refund Amount]
      if (refundAmountNum > 0 && params.sourceAccountId) {
        const sourceAccount = await tx.account.findFirst({
          where: {
            id: params.sourceAccountId,
            tenantId,
            deletedAt: null,
          },
        });

        if (!sourceAccount) {
          throw new Error('Selected source bank or cash account does not exist or is unauthorized.');
        }

        await AccountingService.createVoucher({
          tenantId,
          userId,
          type: VoucherType.PAYMENT,
          date: new Date(),
          referenceId: `CN-REFUND-${creditNote.id}`,
          narration: `Client Refund disbursed for Credit Note #${creditNoteNumber} against Invoice #${invoice.invoiceNumber} (Ref: ${
            params.refundReference || 'N/A'
          }).`,
          entries: [
            {
              accountId: arAccount.id,
              type: EntryType.DEBIT,
              amount: Number(refundAmountNum.toFixed(2)),
            },
            {
              accountId: sourceAccount.id,
              type: EntryType.CREDIT,
              amount: Number(refundAmountNum.toFixed(2)),
            },
          ],
          tx,
        });
      }

      // 8. UPDATE INVOICE BALANCE AND STATUS
      const priorCredits = invoice.creditNotes.reduce(
        (sum, cn) => sum + Number(cn.grandTotal),
        0
      );
      const totalCredited = priorCredits + totalGrand;
      const invoiceGrandTotal = Number(invoice.grandTotal);

      let newStatus: InvoiceStatus = invoice.status;
      let newBalanceDue = Number(invoice.balanceDue);
      let newPaidAmount = Number(invoice.paidAmount);

      if (refundAmountNum > 0) {
        newPaidAmount = Math.max(0, newPaidAmount - refundAmountNum);
      }

      if (totalCredited >= invoiceGrandTotal) {
        // 100% Fully Reversed / Cancelled
        newStatus = InvoiceStatus.CANCELLED;
        newBalanceDue = 0;
      } else {
        // Partial Credit
        const remainingInvoiceGross = Math.max(0, invoiceGrandTotal - totalCredited);
        newBalanceDue = Math.max(0, remainingInvoiceGross - newPaidAmount);

        if (newBalanceDue === 0 && newPaidAmount > 0) {
          newStatus = InvoiceStatus.PAID;
        } else if (newPaidAmount > 0) {
          newStatus = InvoiceStatus.PARTIALLY_PAID;
        } else {
          newStatus = InvoiceStatus.UNPAID;
        }
      }

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: newStatus,
          balanceDue: new Prisma.Decimal(newBalanceDue.toFixed(2)),
          paidAmount: new Prisma.Decimal(newPaidAmount.toFixed(2)),
          updatedById: userId !== 'system' ? userId : null,
        },
      });

      // 9. RECORD AUDIT TIMELINE EVENT
      if (invoice.customerId) {
        await tx.activityTimeline.create({
          data: {
            tenantId,
            entityType: 'CUSTOMER',
            entityId: invoice.customerId,
            action: 'CREDIT_NOTE_ISSUED',
            notes: `Statutory Credit Note #${creditNoteNumber} issued for ₹${totalGrand.toLocaleString(
              'en-IN'
            )} against Invoice #${invoice.invoiceNumber}. Reason: ${params.reason}.${
              refundAmountNum > 0 ? ` Cash/Bank refund disbursed: ₹${refundAmountNum}.` : ''
            }`,
            metadata: {
              creditNoteId: creditNote.id,
              creditNoteNumber,
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              grandTotal: totalGrand,
              refundAmount: refundAmountNum,
              reason: params.reason,
            },
            createdById: userId !== 'system' ? userId : null,
          },
        });
      }

      return serializePrisma(creditNote);
    });
  }

  /**
   * Fetches all credit notes issued for a specific invoice.
   */
  static async getCreditNotesByInvoice(invoiceId: string, explicitTenantId?: string) {
    const { tenantId } = await this.resolveSession({ tenantId: explicitTenantId });
    const creditNotes = await prisma.creditNote.findMany({
      where: {
        invoiceId,
        tenantId,
        deletedAt: null,
      },
      include: {
        items: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return serializePrisma(creditNotes);
  }

  /**
   * Fetches all credit notes for a given customer.
   */
  static async getCreditNotesByCustomer(customerId: string, explicitTenantId?: string) {
    const { tenantId } = await this.resolveSession({ tenantId: explicitTenantId });
    const creditNotes = await prisma.creditNote.findMany({
      where: {
        customerId,
        tenantId,
        deletedAt: null,
      },
      include: {
        items: true,
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            grandTotal: true,
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return serializePrisma(creditNotes);
  }
}
