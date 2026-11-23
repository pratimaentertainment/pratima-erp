'use server';

import { InvoiceService } from '@/services/finance/invoice.service';
import { PaymentService, RecordPaymentParams } from '@/services/finance/payment.service';
import { BookingService } from '@/services/finance/booking.service';
import { revalidatePath } from 'next/cache';
import { PaymentMethod, EventBookingStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { serializePrisma } from '@/lib/serialize';

export async function generateInvoiceFromQuotationAction(quotationId: string) {
  try {
    const invoice = await InvoiceService.generateInvoiceFromQuotation(quotationId);
    revalidatePath('/sales/quotations');
    revalidatePath(`/sales/quotations/${quotationId}`);
    revalidatePath('/dashboard');
    revalidatePath('/customers');
    if ((invoice as any)?.customerId) {
      revalidatePath(`/customers/${(invoice as any).customerId}`);
    }
    revalidatePath('/leads');
    if ((invoice as any)?.leadId) {
      revalidatePath(`/leads/${(invoice as any).leadId}`);
    }
    const cleanInvoice = JSON.parse(JSON.stringify(serializePrisma(invoice)));
    return { success: true, data: cleanInvoice };
  } catch (error: any) {
    console.error('[GENERATE_INVOICE_ERROR]', error);
    return { success: false, error: error.message || 'Failed to generate invoice' };
  }
}

export async function getQuotationsForTestingAction() {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.tenantId) return { success: false, error: 'Unauthorized' };

    const quotations = await prisma.quotation.findMany({
      where: {
        lead: { tenantId: user.tenantId },
      },
      include: {
        lead: {
          include: {
            customer: true,
          },
        },
        invoice: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return { success: true, data: serializePrisma(quotations) };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch quotations' };
  }
}

export async function recordPaymentAction(
  invoiceIdOrPayload:
    | string
    | {
        invoiceId: string;
        amount: number;
        paymentMethod?: PaymentMethod;
        transactionRef?: string;
        notes?: string;
        paymentDate?: Date;
      },
  amountArg?: number,
  paymentMethodArg?: PaymentMethod,
  transactionRefArg?: string
) {
  try {
    let payload: {
      invoiceId: string;
      amount: number;
      paymentMethod: PaymentMethod;
      transactionRef?: string;
      notes?: string;
      paymentDate?: Date;
    };

    if (typeof invoiceIdOrPayload === 'string') {
      payload = {
        invoiceId: invoiceIdOrPayload,
        amount: amountArg ?? 10000,
        paymentMethod: paymentMethodArg ?? PaymentMethod.UPI,
        transactionRef: transactionRefArg ?? 'TEST-REF',
      };
    } else {
      payload = {
        ...invoiceIdOrPayload,
        paymentMethod: invoiceIdOrPayload.paymentMethod ?? PaymentMethod.UPI,
      };
    }

    const result = await PaymentService.recordPayment(payload);
    revalidatePath('/dashboard');
    revalidatePath('/customers');
    if ((result as any)?.invoice?.customerId) {
      revalidatePath(`/customers/${(result as any).invoice.customerId}`);
    }
    revalidatePath('/sales/quotations');
    revalidatePath('/leads');
    if ((result as any)?.invoice?.leadId) {
      revalidatePath(`/leads/${(result as any).invoice.leadId}`);
    }
    revalidatePath('/operations/calendar');
    revalidatePath('/finance/vouchers');
    revalidatePath('/finance/reports');
    revalidatePath('/finance/ledgers');
    revalidatePath('/finance');
    revalidatePath('/finance');

    const cleanData = JSON.parse(JSON.stringify(serializePrisma(result)));
    return { success: true, data: cleanData };
  } catch (error: any) {
    console.error('[RECORD_PAYMENT_ERROR]', error);
    return { success: false, error: error.message || 'Failed to record payment' };
  }
}

export const processPaymentAction = recordPaymentAction;

export async function getRecentInvoicesAction(limit: number = 5) {
  try {
    const invoices = await InvoiceService.getRecentInvoices(limit);
    return { success: true, data: invoices };
  } catch (error: any) {
    console.error('[GET_RECENT_INVOICES_ERROR]', error);
    return { success: false, error: error.message || 'Failed to fetch recent invoices' };
  }
}

export async function getInvoicesAction(params?: { page?: number; pageSize?: number; filters?: any }) {
  try {
    const result = await InvoiceService.getInvoices(params);
    return { success: true, data: result };
  } catch (error: any) {
    console.error('[GET_INVOICES_ERROR]', error);
    return { success: false, error: error.message || 'Failed to fetch invoices' };
  }
}

export async function getInvoiceDetailsAction(invoiceId: string) {
  try {
    const invoice = await InvoiceService.findById(invoiceId);
    return { success: true, data: invoice };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch invoice' };
  }
}

export async function getInvoicePaymentsAction(invoiceId: string) {
  try {
    const payments = await PaymentService.getInvoicePayments(invoiceId);
    return { success: true, data: payments };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch payments' };
  }
}

export async function lockEventBookingAction(payload: {
  customerId: string;
  startDate: Date;
  endDate: Date;
  title: string;
  leadId?: string;
  quotationId?: string;
  invoiceId?: string;
  location?: string;
  notes?: string;
  status?: EventBookingStatus;
}) {
  try {
    const result = await BookingService.lockDates(payload);
    revalidatePath('/dashboard');
    revalidatePath('/operations/calendar');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to lock event booking' };
  }
}
