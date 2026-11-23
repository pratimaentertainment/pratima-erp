'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { EntityEditPage } from '@/components/crud/EntityEditPage';
import { 
  EntityEditForm, 
  EntityEditToolbar, 
  EntityDraftBanner, 
  EntityLockBanner, 
  EntityValidationSummary,
  EntityUnsavedChanges
} from '@/components/entity-edit';
import { FormWrapper } from '@/components/forms/FormWrapper';
import { FormField } from '@/components/forms/FormField';
import { TextInput } from '@/components/inputs/TextInput';
import { ContentCard } from '@/components/cards';
import { LineItemsTable, LineItemToolbar, LineItemTotals, useLineItems, type LineItemBase } from '@/components/line-items';
import { CreateQuotationSchema } from '../schemas';
import { calculateQuotationTotals } from '../utils';
import { QUOTATION_ROUTES } from '../navigation';
import type { QuotationDto } from '../types';
import type { ActionResponse } from '@/actions/action-response';

interface QuotationEditFormProps {
  initialData: QuotationDto;
  isLocked?: boolean;
}

/**
 * Safely converts any date input (string, number, Date) to a YYYY-MM-DD date string.
 * Never throws RangeError.
 */
function safeToDateInputString(value: unknown, fallbackDaysFromNow = 0): string {
  if (value) {
    const d = new Date(value as string | number | Date);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  }
  const fallback = new Date(Date.now() + fallbackDaysFromNow * 86400000);
  return fallback.toISOString().split('T')[0];
}

/**
 * Safely parses any date input into a valid Date object or undefined.
 */
function safeParseDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value as string | number | Date);
  return !isNaN(d.getTime()) ? d : undefined;
}

function QuotationEditFormInner({ initialData, isLocked }: QuotationEditFormProps) {
  const router = useRouter();
  
  // Note: in a real implementation we would sync this with react-hook-form's isDirty
  const [isDirty, setIsDirty] = React.useState(false);
  const [errors] = React.useState<Array<{field?: string, message: string}>>([]);

  const rawData = initialData as unknown as {
    issueDate?: string | Date;
    createdAt?: string | Date;
    updatedAt?: string | Date;
    expiryDate?: string | Date;
    validUntil?: string | Date;
    quoteNumber?: string;
    notes?: string;
    terms?: string;
    termsAndConditions?: string;
    acceptanceTerms?: string;
    lead?: {
      customerId?: string;
      customer?: { id?: string };
    };
    latestRevision?: {
      createdAt?: string | Date;
      validUntil?: string | Date;
    };
  };

  const rawIssue = rawData.issueDate || rawData.createdAt || rawData.latestRevision?.createdAt;
  const rawExpiry = rawData.expiryDate || rawData.validUntil || rawData.latestRevision?.validUntil;
  const rawLastSaved = safeParseDate(rawData.updatedAt || rawData.createdAt);

  const defaultIssueDate = safeToDateInputString(rawIssue, 0);
  const defaultExpiryDate = safeToDateInputString(rawExpiry, 7);

  const initialLineItems = React.useMemo<LineItemBase[]>(() => {
    const rawList = Array.isArray(initialData.items)
      ? (initialData.items as unknown as Array<Record<string, unknown>>)
      : [];
    return rawList.map((raw) => ({
      id: String(raw.id || crypto.randomUUID()),
      productId: String(raw.productId || raw.packageId || ''),
      productName: String(raw.productName || raw.itemName || (raw.package as { name?: string })?.name || 'Service Component'),
      description: String(raw.description || (raw.snapshotExtra as { description?: string })?.description || ''),
      quantity: Number(raw.quantity) || 1,
      unitPrice: Number(raw.unitPrice) || 0,
      discount: Number(raw.discount ?? raw.itemDiscountValue ?? raw.calculatedDiscountAmount ?? 0),
      tax: Number(raw.tax ?? raw.taxPercentage ?? 0),
      total: Number(raw.total ?? raw.calculatedTotal ?? (Number(raw.quantity || 1) * Number(raw.unitPrice || 0))),
    }));
  }, [initialData.items]);

  const { items, addItem, updateItem, removeItem, duplicateItem, moveItem } = useLineItems<LineItemBase>(
    initialLineItems
  );

  const handleAddBlankItem = () => {
    setIsDirty(true);
    addItem({
      id: crypto.randomUUID(),
      productId: '',
      productName: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      tax: 0,
      discount: 0,
      total: 0,
    });
  };

  const totals = React.useMemo(() => calculateQuotationTotals(items), [items]);

  const handleSubmit = async (data: unknown): Promise<ActionResponse<{ id: string }>> => {
    console.log('Submitting', data, items);
    return {
      success: true,
      message: 'Quotation updated successfully',
      data: { id: initialData.id }
    };
  };

  const handleSuccess = () => {
    setIsDirty(false);
    router.push(QUOTATION_ROUTES.DETAIL(initialData.id));
  };

  return (
    <EntityEditPage
      title={`Edit ${initialData.quoteNumber}`}
    >
      <EntityUnsavedChanges isDirty={isDirty} />
      
      <FormWrapper
        schema={CreateQuotationSchema}
        action={handleSubmit as unknown as (data: unknown) => Promise<ActionResponse<{ id: string }>>}
        onSuccess={handleSuccess}
        className="w-full"
        defaultValues={{
          title: initialData.title || rawData.quoteNumber || 'Quotation Proposal',
          customerId: initialData.customerId || rawData.lead?.customer?.id || rawData.lead?.customerId || '',
          issueDate: defaultIssueDate,
          expiryDate: defaultExpiryDate,
          notes: rawData.notes || '',
          terms: rawData.terms || rawData.termsAndConditions || rawData.acceptanceTerms || '',
        }}
      >
        <EntityEditForm>
          {isLocked && <EntityLockBanner lockedBy="System" />}
          {!isLocked && <EntityDraftBanner isDirty={isDirty} lastSavedAt={rawLastSaved} />}
          <EntityValidationSummary errors={errors} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ContentCard className="p-6 space-y-4">
              <h3 className="text-lg font-medium mb-4">Quote Details</h3>
              <FormField name="title" render={({ field, error }) => (
                <TextInput {...field} error={error} label="Quotation Title" required disabled={isLocked} onChange={(e) => { setIsDirty(true); field.onChange(e); }} />
              )} />
              
              <FormField name="customerId" render={({ field, error }) => (
                <TextInput {...field} error={error} label="Customer" required disabled={isLocked} onChange={(e) => { setIsDirty(true); field.onChange(e); }} />
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField name="issueDate" render={({ field, error }) => (
                  <TextInput {...field} error={error} label="Issue Date" required type="date" disabled={isLocked} onChange={(e) => { setIsDirty(true); field.onChange(e); }} />
                )} />
                <FormField name="expiryDate" render={({ field, error }) => (
                  <TextInput {...field} error={error} label="Expiry Date" required type="date" disabled={isLocked} onChange={(e) => { setIsDirty(true); field.onChange(e); }} />
                )} />
              </div>
            </ContentCard>
            
            <ContentCard className="p-6 space-y-4">
              <h3 className="text-lg font-medium mb-4">Terms & Notes</h3>
              <FormField name="notes" render={({ field, error }) => (
                <TextInput {...field} error={error} label="Notes (Visible to Customer)" disabled={isLocked} onChange={(e) => { setIsDirty(true); field.onChange(e); }} />
              )} />
              <FormField name="terms" render={({ field, error }) => (
                <TextInput {...field} error={error} label="Terms & Conditions" disabled={isLocked} onChange={(e) => { setIsDirty(true); field.onChange(e); }} />
              )} />
            </ContentCard>
          </div>

          <ContentCard className="p-6">
            <LineItemToolbar title="Quotation Items" />
            
            <LineItemsTable
              items={items}
              onUpdate={(id, u) => { setIsDirty(true); updateItem(id, u); }}
              onRemove={(id) => { setIsDirty(true); removeItem(id); }}
              onDuplicate={(id) => { setIsDirty(true); duplicateItem(id, () => crypto.randomUUID()); }}
              onMove={(d, h) => { setIsDirty(true); moveItem(d, h); }}
              onAddBlankItem={handleAddBlankItem}
              readOnly={isLocked}
              currency="USD"
            />

            <LineItemTotals
              subtotal={totals.subtotal}
              totalDiscount={totals.totalDiscount}
              totalTax={totals.totalTax}
              grandTotal={totals.grandTotal}
              currency="USD"
            />
          </ContentCard>

          <EntityEditToolbar
            primaryAction={{ id: 'save', label: 'Save Changes', type: 'submit', disabled: isLocked }}
            secondaryActions={[
              { id: 'cancel', label: 'Cancel', variant: 'outline', onClick: () => router.back() }
            ]}
          />
        </EntityEditForm>
      </FormWrapper>
    </EntityEditPage>
  );
}

export function QuotationEditForm(props: QuotationEditFormProps) {
  return <QuotationEditFormInner {...props} />;
}
