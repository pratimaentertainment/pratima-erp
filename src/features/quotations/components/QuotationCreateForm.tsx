'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { EntityCreatePage } from '@/components/crud/EntityCreatePage';
import { FormWrapper } from '@/components/forms/FormWrapper';
import { FormField } from '@/components/forms/FormField';
import { TextInput } from '@/components/inputs/TextInput';
import { ContentCard } from '@/components/cards';
import { LineItemsTable, LineItemToolbar, LineItemTotals, useLineItems, type LineItemBase } from '@/components/line-items';
import { CreateQuotationSchema, type CreateQuotationInput, type QuotationItemInput } from '../schemas';
import { calculateQuotationTotals } from '../utils';
import { QUOTATION_ROUTES } from '../navigation';
import { QuotationEntityConfig } from '../config';

const generateDefaultValues = () => ({
  issueDate: new Date().toISOString().split('T')[0],
  expiryDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
});

export function QuotationCreateForm() {
  const router = useRouter();

  // Line Items state management using the generic hook
  const { items, addItem, updateItem, removeItem, duplicateItem, moveItem } = useLineItems<LineItemBase>([]);

  const handleAddBlankItem = () => {
    addItem({
      id: crypto.randomUUID(),
      productId: '',
      productName: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      tax: 0,
      total: 0,
    });
  };

  const totals = calculateQuotationTotals(items);

  const handleSubmit = async (data: any) => {
    // Construct final payload mapping the generic line items into the specific DTO
    const payload: CreateQuotationInput = {
      ...data,
      items: items.map(item => ({
        productId: item.productId || 'custom',
        productName: item.productName,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        tax: item.tax,
      })),
    };

    console.log('Submit Payload:', payload);
    // In Phase 3 backend integration, this will call `createQuotationAction(payload)`
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return {
      success: true,
      message: 'Quotation created successfully',
      data: { id: 'new-quote-id' }
    } as any;
  };

  const handleSuccess = (response: any) => {
    router.push(QUOTATION_ROUTES.DETAIL(response.data.id));
  };

  const handleCancel = () => {
    router.push(QUOTATION_ROUTES.LIST);
  };

  return (
    <EntityCreatePage
      title={`Create ${QuotationEntityConfig.singular}`}
      description="Fill in the quotation details and line items below."
    >
      <FormWrapper
        schema={CreateQuotationSchema}
        action={handleSubmit}
        onSuccess={handleSuccess}
        className="space-y-8"
        defaultValues={generateDefaultValues()}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ContentCard className="p-6 space-y-4">
            <h3 className="text-lg font-medium mb-4">Quote Details</h3>
            <FormField name="title" render={({ field, error }) => (
              <TextInput {...field} error={error} label="Quotation Title" required placeholder="e.g. Website Redesign Q3" />
            )} />
            
            <FormField name="customerId" render={({ field, error }) => (
              <TextInput {...field} error={error} label="Customer" required placeholder="Select Customer (stub)" />
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField name="issueDate" render={({ field, error }) => (
                <TextInput {...field} error={error} label="Issue Date" required type="date" />
              )} />
              <FormField name="expiryDate" render={({ field, error }) => (
                <TextInput {...field} error={error} label="Expiry Date" required type="date" />
              )} />
            </div>
          </ContentCard>
          
          <ContentCard className="p-6 space-y-4">
            <h3 className="text-lg font-medium mb-4">Terms & Notes</h3>
            <FormField name="notes" render={({ field, error }) => (
              <TextInput {...field} error={error} label="Notes (Visible to Customer)" placeholder="Thank you for your business..." />
            )} />
            <FormField name="terms" render={({ field, error }) => (
              <TextInput {...field} error={error} label="Terms & Conditions" placeholder="Payment net 30..." />
            )} />
          </ContentCard>
        </div>

        <ContentCard className="p-6">
          <LineItemToolbar title="Quotation Items" />
          
          <LineItemsTable
            items={items}
            onUpdate={updateItem}
            onRemove={removeItem}
            onDuplicate={(id) => duplicateItem(id, () => crypto.randomUUID())}
            onMove={moveItem}
            onAddBlankItem={handleAddBlankItem}
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
      </FormWrapper>
    </EntityCreatePage>
  );
}
