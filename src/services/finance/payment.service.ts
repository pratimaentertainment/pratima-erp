import { prisma } from '@/lib/prisma';
import { Prisma, PaymentMethod, PaymentStatus, InvoiceStatus, EventBookingStatus } from '@prisma/client';
import { auth } from '@/auth';
import { getActiveContext } from '@/lib/context';
import { NumberSeriesService } from '@/services/number-series.service';
import { serializePrisma } from '@/lib/serialize';
import { AccountingSyncService } from '@/services/accounting-sync.service';

export interface RecordPaymentParams {
  invoiceId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionRef?: string;
  notes?: string;
  paymentDate?: Date;
  tenantId?: string;
  userId?: string;
  branchId?: string;
}

export class PaymentService {
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
   * Records a payment against an invoice in an atomic transaction:
   * 1. Creates Payment record with unique receipt number.
   * 2. Deducts amount from Invoice.balanceDue and updates Invoice.status (PARTIALLY_PAID / PAID).
   * 3. Automatically triggers Event Date locking (Status: CONFIRMED) if this is the first advance payment.
   * 4. Updates Lead to WON upon confirmed booking.
   */
  static async recordPayment(params: RecordPaymentParams) {
    let tenantId = params.tenantId;
    let userId = params.userId;
    let branchId = params.branchId;

    if (!tenantId) {
      const session = await this.validateSession();
      tenantId = session.tenantId;
      userId = userId || session.userId;
      branchId = branchId || session.branchId;
    }

    if (params.amount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Fetch invoice with relations
      const invoice = await tx.invoice.findFirst({
        where: { id: params.invoiceId, tenantId, deletedAt: null },
        include: {
          payments: true,
          customer: true,
          lead: {
            include: {
              inquiry: true,
            },
          },
          quotation: true,
          eventBookings: true,
        },
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      if (invoice.status === InvoiceStatus.PAID) {
        throw new Error('Invoice is already fully paid');
      }

      // 1. Calculate settlement and surplus amounts (Graceful Overpayment & Retainer Routing)
      const paymentDecimal = new Prisma.Decimal(params.amount);
      const currentBalanceDue = invoice.balanceDue;

      let settleDecimal = paymentDecimal;
      let surplusDecimal = new Prisma.Decimal(0);

      if (paymentDecimal.greaterThan(currentBalanceDue)) {
        settleDecimal = currentBalanceDue;
        surplusDecimal = paymentDecimal.minus(currentBalanceDue);
      }

      // 2. Generate Receipt Number
      const receiptNumber = await NumberSeriesService.getNextNumber(tx, tenantId, 'PAYMENT');

      // 3. Construct descriptive notes if surplus exists
      let paymentNotes = params.notes || null;
      if (surplusDecimal.greaterThan(0)) {
        const surplusMsg = `Settled invoice balance of ₹${settleDecimal.toString()}. Surplus ₹${surplusDecimal.toString()} credited to Client Retainer (2080).`;
        paymentNotes = paymentNotes ? `${paymentNotes} | ${surplusMsg}` : surplusMsg;
      }

      // 4. Create Payment record
      const payment = await tx.payment.create({
        data: {
          tenantId,
          branchId: invoice.branchId,
          invoiceId: invoice.id,
          customerId: invoice.customerId,
          receiptNumber,
          amount: paymentDecimal,
          paymentMethod: params.paymentMethod,
          transactionRef: params.transactionRef || null,
          paymentDate: params.paymentDate || new Date(),
          status: PaymentStatus.SUCCESS,
          notes: paymentNotes,
          createdById: userId,
        },
      });

      // 5. Update Invoice balances and status
      const updatedPaidAmount = invoice.paidAmount.plus(settleDecimal);
      const updatedBalanceDue = invoice.grandTotal.minus(updatedPaidAmount);

      const updatedStatus: InvoiceStatus = updatedBalanceDue.lessThanOrEqualTo(0)
        ? InvoiceStatus.PAID
        : InvoiceStatus.PARTIALLY_PAID;

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: updatedPaidAmount,
          balanceDue: updatedBalanceDue.lessThan(0) ? new Prisma.Decimal(0) : updatedBalanceDue,
          status: updatedStatus,
          updatedById: userId,
        },
      });

      // 5. EVENT DATE LOCKING: If this is the advance/first payment, confirm EventBooking
      const isFirstPayment = invoice.payments.length === 0 || invoice.paidAmount.isZero();
      let confirmedBooking = null;

      if (isFirstPayment) {
        const lead = invoice.lead;
        const inquiryDate = lead?.inquiry?.eventDate;
        const expectedDate = lead?.expectedBookingDate;

        const eventStartDate = inquiryDate || expectedDate || new Date();
        const eventEndDate = new Date(eventStartDate.getTime() + 6 * 60 * 60 * 1000);

        // Check if an event booking already exists for this quotation / lead / invoice
        const existingBooking = await tx.eventBooking.findFirst({
          where: {
            tenantId,
            OR: [
              { invoiceId: invoice.id },
              ...(lead ? [{ leadId: lead.id }] : []),
              ...(invoice.quotationId ? [{ quotationId: invoice.quotationId }] : []),
            ],
          },
        });

        if (existingBooking) {
          confirmedBooking = await tx.eventBooking.update({
            where: { id: existingBooking.id },
            data: {
              status: EventBookingStatus.CONFIRMED,
              invoiceId: invoice.id,
              notes: existingBooking.notes
                ? `${existingBooking.notes}\nAdvance payment received (${receiptNumber}). Dates locked.`
                : `Advance payment received (${receiptNumber}). Dates locked.`,
            },
          });
        } else {
          const bookingNumber = await NumberSeriesService.getNextNumber(tx, tenantId, 'BOOKING');
          const clientName = `${invoice.customer.firstName} ${invoice.customer.lastName || ''}`.trim();
          const title = lead?.inquiry?.eventType
            ? `${clientName} - ${lead.inquiry.eventType} Shoot`
            : `${clientName} - Event Photography`;

          confirmedBooking = await tx.eventBooking.create({
            data: {
              tenantId,
              branchId: invoice.branchId,
              bookingNumber,
              title,
              leadId: lead?.id || null,
              customerId: invoice.customerId,
              quotationId: invoice.quotationId || null,
              invoiceId: invoice.id,
              startDate: eventStartDate,
              endDate: eventEndDate,
              status: EventBookingStatus.CONFIRMED,
              location: lead?.notes || null,
              notes: `Auto-confirmed upon advance payment receipt ${receiptNumber}`,
              createdById: userId,
            },
          });
        }

        // 6. Transition Lead status to 'WON' upon confirmed booking & payment
        if (lead && lead.status !== 'WON') {
          await tx.lead.update({
            where: { id: lead.id },
            data: { status: 'WON' },
          });
        }
      }

      // 7. Activity Timeline & Audit Log
      if (invoice.leadId) {
        await tx.activityTimeline.create({
          data: {
            tenantId,
            entityType: 'LEAD',
            entityId: invoice.leadId,
            action: 'PAYMENT_RECEIVED',
            notes: `Payment of ${params.amount} received via ${params.paymentMethod}. Receipt #${receiptNumber}.${
              isFirstPayment ? ' Advance payment confirmed; event dates locked.' : ''
            }`,
            createdById: userId,
          },
        });
      }

      // 8. General Ledger Double-Entry Posting
      const clientName = `${invoice.customer.firstName} ${invoice.customer.lastName || ''}`.trim();
      const bookingTitle = confirmedBooking?.title || (invoice.eventBookings && invoice.eventBookings[0]?.title);

      const syncResult = await AccountingSyncService.syncPaymentReceiptToAccounts({
        paymentId: payment.id,
        invoiceId: invoice.id,
        tenantId,
        amount: params.amount,
        settleAmount: settleDecimal.toNumber(),
        surplusAmount: surplusDecimal.toNumber(),
        paymentMethod: params.paymentMethod,
        receiptNumber,
        paymentDate: payment.paymentDate,
        isFirstPayment,
        clientName,
        invoiceNumber: invoice.invoiceNumber,
        bookingTitle,
        userId,
        tx,
      });

      return serializePrisma({
        payment,
        invoice: updatedInvoice,
        booking: confirmedBooking,
        voucher: syncResult?.voucher,
      });
    });
  }

  /**
   * Alias for recordPayment supporting mercantile double-entry & overpayment surplus routing.
   */
  static async processPayment(params: RecordPaymentParams) {
    return this.recordPayment(params);
  }

  static async findById(id: string) {
    const { tenantId } = await this.validateSession();
    const payment = await prisma.payment.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        customer: true,
        invoice: true,
      },
    });

    if (!payment) return null;
    return serializePrisma(payment);
  }

  static async getInvoicePayments(invoiceId: string) {
    const { tenantId } = await this.validateSession();
    const payments = await prisma.payment.findMany({
      where: { invoiceId, tenantId, deletedAt: null },
      orderBy: { paymentDate: 'desc' },
      include: {
        customer: true,
      },
    });

    return serializePrisma(payments);
  }
}
