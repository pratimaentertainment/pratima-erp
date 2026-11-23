'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { serializePrisma } from '@/lib/serialize';
import { CreditNoteReason, AccountType } from '@prisma/client';
import {
  CreditNoteService,
  GenerateCreditNoteParams,
} from '@/services/finance/credit-note.service';
import { AccountingService } from '@/services/accounting.service';
import { z } from 'zod';

const generateCreditNoteSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID'),
  reason: z.nativeEnum(CreditNoteReason),
  notes: z.string().optional(),
  refundAmount: z.number().min(0).default(0),
  sourceAccountId: z.string().uuid('Invalid source ledger account ID').optional(),
  refundPaymentMethod: z.enum(['BANK', 'CASH', 'UPI', 'OTHER']).default('BANK'),
  refundReference: z.string().optional(),
  itemsToReverse: z
    .array(
      z.object({
        invoiceItemId: z.string().uuid().optional(),
        name: z.string().optional(),
        sacCode: z.string().optional(),
        quantity: z.number().min(1),
        unitPrice: z.number().min(0),
        gstRate: z.number().min(0).optional(),
      })
    )
    .optional(),
});

export type GenerateCreditNoteInput = z.infer<typeof generateCreditNoteSchema>;

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

/**
 * Server action to generate a statutory Credit Note against an existing invoice.
 */
export async function generateCreditNoteAction(input: GenerateCreditNoteInput) {
  try {
    const { tenantId, userId } = await validateSession();
    const validated = generateCreditNoteSchema.parse(input);

    const creditNote = await CreditNoteService.generateCreditNote({
      ...validated,
      tenantId,
      userId,
    });

    // Revalidate relevant pages
    if (creditNote.customerId) {
      revalidatePath(`/customers/${creditNote.customerId}`);
    }
    revalidatePath('/finance/vouchers');
    revalidatePath('/finance/reports');
    revalidatePath('/finance/ledgers');
    revalidatePath('/finance/payouts');

    return {
      success: true,
      message: `Credit Note #${creditNote.creditNoteNumber} successfully generated.`,
      data: creditNote,
    };
  } catch (error: any) {
    console.error('[GENERATE_CREDIT_NOTE_ERROR]', error);
    return {
      success: false,
      error: error.message || 'Failed to generate statutory credit note',
    };
  }
}

/**
 * Server action to fetch all credit notes for an invoice.
 */
export async function getInvoiceCreditNotesAction(invoiceId: string) {
  try {
    const { tenantId } = await validateSession();
    const creditNotes = await CreditNoteService.getCreditNotesByInvoice(invoiceId, tenantId);
    return {
      success: true,
      data: creditNotes,
    };
  } catch (error: any) {
    console.error('[GET_INVOICE_CREDIT_NOTES_ERROR]', error);
    return {
      success: false,
      error: error.message || 'Failed to retrieve invoice credit notes',
    };
  }
}

/**
 * Server action to fetch all credit notes for a customer.
 */
export async function getCustomerCreditNotesAction(customerId: string) {
  try {
    const { tenantId } = await validateSession();
    const creditNotes = await CreditNoteService.getCreditNotesByCustomer(customerId, tenantId);
    return {
      success: true,
      data: creditNotes,
    };
  } catch (error: any) {
    console.error('[GET_CUSTOMER_CREDIT_NOTES_ERROR]', error);
    return {
      success: false,
      error: error.message || 'Failed to retrieve customer credit notes',
    };
  }
}

/**
 * Fetches active bank and cash asset ledger accounts for refund disbursements.
 */
export async function getRefundSourceAccountsAction(): Promise<{
  success: boolean;
  data?: Array<{ id: string; name: string; code: string | null; type: AccountType }>;
  error?: string;
}> {
  try {
    const { tenantId } = await validateSession();

    let accounts = await prisma.account.findMany({
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

    if (accounts.length === 0) {
      await AccountingService.initializeDefaultAccounts(tenantId);
      accounts = await prisma.account.findMany({
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

    return {
      success: true,
      data: serializePrisma(accounts),
    };
  } catch (error: any) {
    console.error('[GET_REFUND_SOURCE_ACCOUNTS_ERROR]', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch source refund accounts',
    };
  }
}
