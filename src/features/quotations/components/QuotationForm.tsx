'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Save, 
  Calculator, 
  FileText, 
  Calendar as CalendarIcon, 
  Sparkles, 
  Tag, 
  Percent, 
  Layers, 
  Loader2,
  Users,
  BookOpen,
  MapPin,
  Heart,
  Video,
  Clock,
  PackageCheck,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';

import { quotationFormSchema, type QuotationFormValues } from '@/validations/quotation.schema';
import { createQuotationAction, createRevisionAction, updateRevisionDraftAction } from '@/actions/quotation.actions';
import { formatMoney } from '@/lib/currency';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

import { PackagePicker } from './PackagePicker';
import { SaveAsPackageDialog } from './SaveAsPackageDialog';

export interface QuotationFormProps {
  lead?: {
    id: string;
    leadCode?: string;
    tenantId?: string;
    branchId?: string;
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string | null;
    status?: string;
    budgetRange?: string | null;
  };
  initialValues?: Partial<QuotationFormValues>;
  packages?: any[];
  onSuccess?: (quotation: any) => void;
  quotationId?: string;
  revisionId?: string;
  revisionNumber?: number;
  mode?: 'create' | 'edit' | 'revise';
}

export function QuotationForm({
  lead,
  initialValues,
  packages = [],
  onSuccess,
  quotationId,
  revisionId,
  revisionNumber,
  mode = 'create',
}: QuotationFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const defaultValidUntil = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  }, []);

  const form = useForm<QuotationFormValues>({
    resolver: zodResolver(quotationFormSchema) as any,
    defaultValues: {
      leadId: lead?.id || initialValues?.leadId || 'temp-lead-id',
      tenantId: lead?.tenantId || initialValues?.tenantId || null,
      branchId: lead?.branchId || initialValues?.branchId || null,
      customerId: lead?.customerId || initialValues?.customerId || null,
      customerName: lead?.customerName || initialValues?.customerName || '',
      customerPhone: lead?.customerPhone || initialValues?.customerPhone || '',
      customerEmail: lead?.customerEmail || initialValues?.customerEmail || null,
      title: initialValues?.title || (lead?.customerName ? `Quotation for ${lead.customerName}` : 'Photography Quotation'),
      validUntil: initialValues?.validUntil || defaultValidUntil,
      eventDate: initialValues?.eventDate || '',

      pricingMode: initialValues?.pricingMode || 'ITEMIZED',
      lumpSumAmount: initialValues?.lumpSumAmount != null ? Number(initialValues.lumpSumAmount) : undefined,

      // Section 1: Event Subjects (Bride, Groom, etc.)
      subjects: initialValues?.subjects && initialValues.subjects.length > 0 ? initialValues.subjects : [
        { role: 'Bride', name: '', phone: '', email: '', birthDate: '', anniversaryDate: '' },
        { role: 'Groom', name: '', phone: '', email: '', birthDate: '', anniversaryDate: '' },
      ],

      // Section 2: Event Functions & Itinerary
      functions: initialValues?.functions && initialValues.functions.length > 0 ? initialValues.functions : [
        { name: 'Wedding Ceremony', date: initialValues?.eventDate || '', venue: '' },
        { name: 'Reception', date: initialValues?.eventDate || '', venue: '' },
      ],

      // Section 3: Quotation Items
      items: initialValues?.items && initialValues.items.length > 0 ? initialValues.items : [
        {
          packageId: null,
          quotationFunctionId: null,
          itemName: 'Full Day Candid Wedding Photography',
          description: '2 Senior Candid Photographers, 1 Traditional Videographer, 1 Drone Pilot',
          quantity: 1,
          unitPrice: 50000,
          discountType: 'NONE',
          discountValue: 0,
        },
      ],

      // Section 4: Deliverables & Upselling Limits
      deliverables: initialValues?.deliverables && initialValues.deliverables.length > 0 ? initialValues.deliverables : [
        { name: '40-Page Premium Leather Photobook', itemType: 'ALBUM', quantity: 1, basePageLimit: 40 },
        { name: 'Cinematic 4K Wedding Highlight Video', itemType: 'VIDEO', quantity: 1, basePageLimit: null },
      ],

      discountType: initialValues?.discountType || 'NONE',
      discountValue: initialValues?.discountValue || 0,
      taxRate: initialValues?.taxRate ?? 18,
      advanceRequired: initialValues?.advanceRequired ?? 20000,
      notes: initialValues?.notes || (lead ? `Prepared specifically for ${lead.customerName} (${lead.leadCode}).` : ''),
      termsAndConditions: initialValues?.termsAndConditions || (initialValues as Record<string, unknown>)?.terms as string || '',
    },
  });

  React.useEffect(() => {
    if (initialValues) {
      form.reset({
        ...form.getValues(),
        ...initialValues,
        notes: initialValues.notes !== undefined ? initialValues.notes : form.getValues().notes,
        termsAndConditions: initialValues.termsAndConditions || (initialValues as Record<string, unknown>)?.terms as string || form.getValues().termsAndConditions,
        subjects: initialValues.subjects?.length ? initialValues.subjects : form.getValues().subjects,
        functions: initialValues.functions?.length ? initialValues.functions : form.getValues().functions,
        items: initialValues.items?.length ? initialValues.items : form.getValues().items,
        deliverables: initialValues.deliverables?.length ? initialValues.deliverables : form.getValues().deliverables,
      });
    }
  }, [initialValues]);

  // Dynamic Array Handlers
  const {
    fields: subjectFields,
    append: appendSubject,
    remove: removeSubject,
  } = useFieldArray({
    control: form.control,
    name: 'subjects',
  });

  const {
    fields: functionFields,
    append: appendFunction,
    remove: removeFunction,
  } = useFieldArray({
    control: form.control,
    name: 'functions',
  });

  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const {
    fields: deliverableFields,
    append: appendDeliverable,
    remove: removeDeliverable,
  } = useFieldArray({
    control: form.control,
    name: 'deliverables',
  });

  // Watch form values for live calculations and mapping
  const watchedItems = useWatch({ control: form.control, name: 'items' }) || [];
  const watchedFunctions = useWatch({ control: form.control, name: 'functions' }) || [];
  const watchedPricingMode = useWatch({ control: form.control, name: 'pricingMode' }) || 'ITEMIZED';
  const watchedLumpSumAmount = form.watch('lumpSumAmount');
  const watchedDiscountType = useWatch({ control: form.control, name: 'discountType' }) || 'NONE';
  const watchedDiscountValue = useWatch({ control: form.control, name: 'discountValue' }) || 0;
  const watchedTaxRate = useWatch({ control: form.control, name: 'taxRate' }) || 0;
  const watchedAdvanceRequired = useWatch({ control: form.control, name: 'advanceRequired' });

  const isLumpSum = watchedPricingMode === 'LUMP_SUM';

  // Calculation Engine
  const calculation = React.useMemo(() => {
    let subTotal = 0;
    let totalLineDiscounts = 0;

    const computedRows = (watchedItems || []).map((item) => {
      const qty = Math.max(1, Number(item?.quantity) || 1);
      const price = Math.max(0, Number(item?.unitPrice) || 0);
      const gross = qty * price;

      let discountAmount = 0;
      const dVal = Math.max(0, Number(item?.discountValue) || 0);

      if (item?.discountType === 'PERCENTAGE') {
        const pct = Math.min(100, dVal);
        discountAmount = (gross * pct) / 100;
      } else if (item?.discountType === 'FIXED') {
        discountAmount = Math.min(gross, dVal);
      }

      discountAmount = Math.round(discountAmount * 100) / 100;
      const rowTotal = Math.round(Math.max(0, gross - discountAmount) * 100) / 100;

      subTotal += rowTotal;
      totalLineDiscounts += discountAmount;

      return {
        gross,
        discountAmount,
        rowTotal,
      };
    });

    let quoteDiscountAmount = 0;
    const qDVal = Math.max(0, Number(watchedDiscountValue) || 0);
    if (watchedDiscountType === 'PERCENTAGE') {
      const pct = Math.min(100, qDVal);
      quoteDiscountAmount = (subTotal * pct) / 100;
    } else if (watchedDiscountType === 'FIXED') {
      quoteDiscountAmount = Math.min(subTotal, qDVal);
    }
    quoteDiscountAmount = Math.round(quoteDiscountAmount * 100) / 100;

    const taxableAmount = Math.max(0, subTotal - quoteDiscountAmount);
    const taxRatePct = Math.max(0, Math.min(100, Number(watchedTaxRate) || 0));
    const taxAmount = Math.round(((taxableAmount * taxRatePct) / 100) * 100) / 100;

    // In Lump Sum mode, grandTotal is the entered lumpSumAmount (if set)
    const lumpSumNum = watchedLumpSumAmount != null && String(watchedLumpSumAmount) !== ''
      ? Number(watchedLumpSumAmount)
      : null;

    const calculatedGrandTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;
    const grandTotal = isLumpSum && lumpSumNum != null ? lumpSumNum : calculatedGrandTotal;
    const totalSavings = totalLineDiscounts + quoteDiscountAmount;

    return {
      computedRows,
      subTotal,
      quoteDiscountAmount,
      taxableAmount,
      taxAmount,
      grandTotal,
      totalSavings,
    };
  }, [watchedItems, watchedPricingMode, watchedLumpSumAmount, watchedDiscountType, watchedDiscountValue, watchedTaxRate, isLumpSum]);

  // Standard Manual Entry: Add blank line item
  const handleAddNewBlankItem = () => {
    appendItem({
      packageId: null,
      quotationFunctionId: null,
      itemName: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      discountType: 'NONE',
      discountValue: 0,
    });
  };

  const onSubmit = async (values: QuotationFormValues) => {
    setIsSubmitting(true);
    try {
      // Clean and sanitize dynamic entities before dispatching
      const cleanSubjects = (values.subjects || [])
        .filter((s) => s.name && s.name.trim().length > 0)
        .map((s) => ({
          ...s,
          name: s.name.trim(),
          role: s.role?.trim() || 'Bride',
        }));

      const cleanFunctions = (values.functions || [])
        .filter((f) => f.name && f.name.trim().length > 0)
        .map((f) => ({
          ...f,
          name: f.name.trim(),
        }));

      const cleanDeliverables = (values.deliverables || [])
        .filter((d) => d.name && d.name.trim().length > 0)
        .map((d) => ({
          ...d,
          name: d.name.trim(),
          itemType: d.itemType || 'ALBUM',
          quantity: Number(d.quantity) || 1,
          basePageLimit: d.basePageLimit != null && String(d.basePageLimit) !== '' ? Number(d.basePageLimit) : null,
        }));

      const lumpSumVal = values.pricingMode === 'LUMP_SUM' && values.lumpSumAmount != null && String(values.lumpSumAmount) !== ''
        ? Number(values.lumpSumAmount)
        : null;

      // 1. Handle Edit Draft Revision
      if ((mode === 'edit' || revisionId) && revisionId) {
        const updatePayload = {
          revisionId,
          revisionReason: (initialValues as Record<string, unknown>)?.revisionReason as string || 'Quotation revision updated',
          revisionComment: values.notes || '',
          notes: values.notes || '',
          terms: values.termsAndConditions || '',
          termsAndConditions: values.termsAndConditions || '',
          validUntil: values.validUntil ? new Date(values.validUntil) : undefined,
          pricingMode: values.pricingMode || 'ITEMIZED',
          lumpSumAmount: lumpSumVal,
          subjects: cleanSubjects,
          functions: cleanFunctions,
          deliverables: cleanDeliverables,
          items: values.items.map((item) => ({
            id: item.id,
            packageId: item.packageId || null,
            quotationFunctionId: item.quotationFunctionId || null,
            itemName: item.itemName,
            description: item.description || null,
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unitPrice) || 0,
            discountType: item.discountType || 'NONE',
            discountValue: Number(item.discountValue) || 0,
            itemDiscountType: item.discountType || 'NONE',
            itemDiscountValue: Number(item.discountValue) || 0,
            lineItemType: 'STANDARD',
          })),
          discount: (values.discountType && values.discountType !== 'NONE') ? {
            discountType: values.discountType,
            discountValue: Number(values.discountValue) || 0,
          } : undefined,
          updatedAt: (initialValues as Record<string, unknown>)?.updatedAt ? new Date((initialValues as Record<string, unknown>).updatedAt as string | number | Date) : undefined,
        };

        const res = await updateRevisionDraftAction(updatePayload as unknown as Parameters<typeof updateRevisionDraftAction>[0]);
        if (res.success) {
          toast.success(`Draft saved successfully!`);
          if (onSuccess) {
            onSuccess(res.data);
          } else if (quotationId || res.data?.id) {
            router.push(`/sales/quotations/${quotationId || res.data.id}`);
          } else {
            router.push('/sales/quotations');
          }
        } else {
          toast.error(res.error || 'Failed to update quotation draft.');
        }
        return;
      }

      // 2. Handle Create New Revision from existing quotation
      if (mode === 'revise' || (quotationId && !revisionId)) {
        const revisionPayload = {
          quotationId: quotationId!,
          revisionReason: (initialValues as Record<string, unknown>)?.revisionReason as string || 'Client requested modifications',
          revisionComment: values.notes || '',
          notes: values.notes || '',
          terms: values.termsAndConditions || '',
          termsAndConditions: values.termsAndConditions || '',
          pricingMode: values.pricingMode || 'ITEMIZED',
          lumpSumAmount: lumpSumVal,
          subjects: cleanSubjects,
          functions: cleanFunctions,
          deliverables: cleanDeliverables,
          items: values.items.map((item) => ({
            id: item.id,
            packageId: item.packageId || null,
            quotationFunctionId: item.quotationFunctionId || null,
            itemName: item.itemName,
            description: item.description || null,
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unitPrice) || 0,
            discountType: item.discountType || 'NONE',
            discountValue: Number(item.discountValue) || 0,
            itemDiscountType: item.discountType || 'NONE',
            itemDiscountValue: Number(item.discountValue) || 0,
            lineItemType: 'STANDARD',
          })),
          discount: (values.discountType && values.discountType !== 'NONE') ? {
            discountType: values.discountType,
            discountValue: Number(values.discountValue) || 0,
          } : undefined,
        };

        const res = await createRevisionAction(revisionPayload as unknown as Parameters<typeof createRevisionAction>[0]);
        if (res.success) {
          toast.success(`Revision created successfully!`);
          if (onSuccess) {
            onSuccess(res.data);
          } else if (quotationId || res.data?.id) {
            router.push(`/sales/quotations/${quotationId || res.data.id}`);
          } else {
            router.push('/sales/quotations');
          }
        } else {
          toast.error(res.error || 'Failed to create revision.');
        }
        return;
      }

      // 3. Create new quotation
      const payload = {
        ...values,
        notes: values.notes || null,
        terms: values.termsAndConditions || null,
        termsAndConditions: values.termsAndConditions || null,
        leadId: lead?.id || values.leadId,
        tenantId: lead?.tenantId || values.tenantId,
        branchId: lead?.branchId || values.branchId,
        customerId: lead?.customerId || values.customerId,
        customerName: lead?.customerName || values.customerName,
        customerPhone: lead?.customerPhone || values.customerPhone,
        customerEmail: lead?.customerEmail || values.customerEmail,
        pricingMode: values.pricingMode || 'ITEMIZED',
        lumpSumAmount: lumpSumVal,
        subjects: cleanSubjects,
        functions: cleanFunctions,
        deliverables: cleanDeliverables,
        subTotal: calculation.subTotal,
        taxAmount: calculation.taxAmount,
        grandTotal: calculation.grandTotal,
      };

      const res = await createQuotationAction(payload as unknown as Parameters<typeof createQuotationAction>[0]);
      if (res.success) {
        toast.success('Quotation generated successfully!');
        if (onSuccess) {
          onSuccess(res.data);
        } else if (res.data?.id) {
          router.push(`/sales/quotations/${res.data.id}`);
        } else {
          router.push('/sales/quotations');
        }
      } else {
        toast.error(res.error || 'Failed to generate quotation.');
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || 'An unexpected error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitButtonLabel = isSubmitting
    ? (mode === 'edit' ? 'Saving Draft...' : mode === 'revise' ? 'Creating Revision...' : 'Generating...')
    : (mode === 'edit' ? 'Update Revision Draft' : mode === 'revise' ? `Save as Revision R${(revisionNumber || 1) + 1}` : 'Generate Quotation');

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-8 w-8 text-muted-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">
              {mode === 'revise'
                ? `Create Revision (R${(revisionNumber || 1) + 1})`
                : mode === 'edit'
                ? `Edit Quotation (Rev #${revisionNumber || 1})`
                : 'Advanced Quotation Builder'}
            </h1>
            {lead?.leadCode && (
              <Badge variant="secondary" className="font-mono text-xs">
                {lead.leadCode}
              </Badge>
            )}
            {mode === 'edit' && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-300 text-xs font-semibold">
                Draft Revision
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground pl-10">
            {mode === 'revise'
              ? 'Modify services, deliverables, and rates to create a new revision based on client feedback.'
              : mode === 'edit'
              ? 'Adjust line items, packages, itinerary, and terms for this draft proposal.'
              : 'Configure subjects, itinerary functions, catalog packages, and deliverables with upselling base limits.'}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {submitButtonLabel}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {submitButtonLabel}
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content: Metadata, Accordion Sections & Notes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metadata Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Quotation Metadata & Pricing Strategy
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2 sm:col-span-3">
                <Label htmlFor="title">Quotation Subject / Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Wedding Photography & Cinematic Video Proposal"
                  {...form.register('title')}
                />
              </div>

              {/* Pricing Mode Toggle / Selector */}
              <div className="space-y-2">
                <Label htmlFor="pricingMode" className="flex items-center gap-1.5 font-medium">
                  <Tag className="w-3.5 h-3.5 text-primary" />
                  Pricing Mode
                </Label>
                <Select
                  value={watchedPricingMode}
                  onValueChange={(val) => {
                    if (val) form.setValue('pricingMode', val as 'ITEMIZED' | 'LUMP_SUM');
                  }}
                >
                  <SelectTrigger id="pricingMode" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ITEMIZED">
                      Itemized (Show all prices)
                    </SelectItem>
                    <SelectItem value="LUMP_SUM">
                      Lump Sum (Hide individual prices)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventDate" className="flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  Primary Event Date
                </Label>
                <Input id="eventDate" type="date" {...form.register('eventDate')} className="h-9 text-xs" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="validUntil" className="flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  Valid Until
                </Label>
                <Input id="validUntil" type="date" {...form.register('validUntil')} className="h-9 text-xs" />
              </div>
            </CardContent>
          </Card>

          {/* ADVANCED HYBRID ACCORDION */}
          <Accordion
            type="multiple"
            defaultValue={['subjects', 'functions', 'items', 'deliverables']}
            className="space-y-4"
          >
            {/* SECTION 1: EVENT SUBJECTS */}
            <AccordionItem value="subjects" className="border rounded-lg bg-card px-4 shadow-xs">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-2 text-base font-semibold">
                  <Users className="w-4 h-4 text-primary" />
                  <span>Event Subjects & VIPs</span>
                  <Badge variant="outline" className="ml-2 text-xs font-normal">
                    {subjectFields.length} {subjectFields.length === 1 ? 'Person' : 'People'}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-5 space-y-4">
                <p className="text-xs text-muted-foreground">
                  Record bride, groom, and principal subjects with personal milestones for automated relationship reminders.
                </p>

                <div className="space-y-3">
                  {subjectFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="p-3 rounded-lg border bg-muted/20 relative group hover:border-primary/40 transition-colors space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2 border-b pb-2">
                        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                          <Heart className="w-3.5 h-3.5 text-rose-500" />
                          Subject #{index + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSubject(index)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <Label className="text-xs">Role</Label>
                          <Select
                            value={form.watch(`subjects.${index}.role`) || 'Bride'}
                            onValueChange={(val) => form.setValue(`subjects.${index}.role`, val || 'Bride')}
                          >
                            <SelectTrigger className="h-8 text-xs mt-1">
                              <SelectValue placeholder="Role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Bride">Bride</SelectItem>
                              <SelectItem value="Groom">Groom</SelectItem>
                              <SelectItem value="Client">Client</SelectItem>
                              <SelectItem value="Father of Bride">Father of Bride</SelectItem>
                              <SelectItem value="Mother of Bride">Mother of Bride</SelectItem>
                              <SelectItem value="Father of Groom">Father of Groom</SelectItem>
                              <SelectItem value="Mother of Groom">Mother of Groom</SelectItem>
                              <SelectItem value="Other">Other VIP</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-xs">Full Name</Label>
                          <Input
                            placeholder="e.g. Ananya Sharma"
                            {...form.register(`subjects.${index}.name` as const)}
                            className="h-8 text-xs mt-1"
                          />
                        </div>

                        <div>
                          <Label className="text-xs">Phone Number</Label>
                          <Input
                            placeholder="+91 98765 43210"
                            {...form.register(`subjects.${index}.phone` as const)}
                            className="h-8 text-xs mt-1 font-mono"
                          />
                        </div>

                        <div>
                          <Label className="text-xs">Email Address</Label>
                          <Input
                            placeholder="ananya@example.com"
                            {...form.register(`subjects.${index}.email` as const)}
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <Label className="text-xs flex items-center gap-1 text-muted-foreground">
                            <CalendarIcon className="w-3 h-3" />
                            Birth Date (For Birthday Greetings)
                          </Label>
                          <Input
                            type="date"
                            {...form.register(`subjects.${index}.birthDate` as const)}
                            className="h-8 text-xs mt-1"
                          />
                        </div>

                        <div>
                          <Label className="text-xs flex items-center gap-1 text-muted-foreground">
                            <Heart className="w-3 h-3" />
                            Anniversary Date
                          </Label>
                          <Input
                            type="date"
                            {...form.register(`subjects.${index}.anniversaryDate` as const)}
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Add Subject Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      appendSubject({
                        role: 'Bride',
                        name: '',
                        phone: '',
                        email: '',
                        birthDate: '',
                        anniversaryDate: '',
                      })
                    }
                    className="h-8 text-xs border-dashed"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Bride
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      appendSubject({
                        role: 'Groom',
                        name: '',
                        phone: '',
                        email: '',
                        birthDate: '',
                        anniversaryDate: '',
                      })
                    }
                    className="h-8 text-xs border-dashed"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Groom
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      appendSubject({
                        role: 'Client',
                        name: '',
                        phone: '',
                        email: '',
                        birthDate: '',
                        anniversaryDate: '',
                      })
                    }
                    className="h-8 text-xs border-dashed"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Client / Other VIP
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* SECTION 2: EVENT FUNCTIONS */}
            <AccordionItem value="functions" className="border rounded-lg bg-card px-4 shadow-xs">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-2 text-base font-semibold">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>Event Functions & Itinerary</span>
                  <Badge variant="outline" className="ml-2 text-xs font-normal">
                    {functionFields.length} {functionFields.length === 1 ? 'Function' : 'Functions'}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-5 space-y-4">
                <p className="text-xs text-muted-foreground">
                  Organize coverage requirements by wedding ceremony and celebration to seamlessly map line items.
                </p>

                <div className="space-y-3">
                  {functionFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="p-3 rounded-lg border bg-muted/20 relative group hover:border-primary/40 transition-colors space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2 border-b pb-2">
                        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                          <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                          Function #{index + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFunction(index)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Function Name</Label>
                          <Input
                            placeholder="e.g. Wedding Ceremony, Haldi, Reception"
                            {...form.register(`functions.${index}.name` as const)}
                            className="h-8 text-xs mt-1 font-medium"
                          />
                        </div>

                        <div>
                          <Label className="text-xs flex items-center gap-1 text-muted-foreground">
                            <CalendarIcon className="w-3 h-3" />
                            Date
                          </Label>
                          <Input
                            type="date"
                            {...form.register(`functions.${index}.date` as const)}
                            className="h-8 text-xs mt-1"
                          />
                        </div>

                        <div>
                          <Label className="text-xs flex items-center gap-1 text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            Venue / Location
                          </Label>
                          <Input
                            placeholder="e.g. Grand Ballroom, The Leela Palace"
                            {...form.register(`functions.${index}.venue` as const)}
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Add Function Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      appendFunction({
                        name: 'Haldi Ceremony',
                        date: form.getValues('eventDate') || '',
                        venue: '',
                      })
                    }
                    className="h-8 text-xs border-dashed"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    + Haldi
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      appendFunction({
                        name: 'Sangeet & Cocktail',
                        date: form.getValues('eventDate') || '',
                        venue: '',
                      })
                    }
                    className="h-8 text-xs border-dashed"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    + Sangeet
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      appendFunction({
                        name: 'Wedding Ceremony',
                        date: form.getValues('eventDate') || '',
                        venue: '',
                      })
                    }
                    className="h-8 text-xs border-dashed"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    + Wedding
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      appendFunction({
                        name: 'Reception',
                        date: form.getValues('eventDate') || '',
                        venue: '',
                      })
                    }
                    className="h-8 text-xs border-dashed"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    + Reception
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      appendFunction({
                        name: '',
                        date: form.getValues('eventDate') || '',
                        venue: '',
                      })
                    }
                    className="h-8 text-xs border-dashed"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Custom Function
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* SECTION 3: LINE ITEMS & PACKAGES */}
            <AccordionItem value="items" className="border rounded-lg bg-card px-4 shadow-xs">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-2 text-base font-semibold">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>Line Items & Packages</span>
                  <Badge variant="outline" className="ml-2 text-xs font-normal">
                    {itemFields.length} {itemFields.length === 1 ? 'Item' : 'Items'}
                  </Badge>
                  {isLumpSum && (
                    <Badge variant="secondary" className="ml-1 text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      Lump Sum Mode
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    {isLumpSum
                      ? 'Package bundle items. Individual line-item rates are hidden; quote is calculated via the lump sum amount.'
                      : 'Specify services, rates, quantities, and map line items to individual functions.'}
                  </p>
                  <PackagePicker
                    append={appendItem}
                    tenantId={lead?.tenantId}
                    variant="outline"
                    size="sm"
                  />
                </div>

                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 text-xs">
                        <TableHead className={isLumpSum ? "w-[42%]" : "w-[30%]"}>Service / Item</TableHead>
                        <TableHead className={isLumpSum ? "w-[28%]" : "w-[18%]"}>Mapped Function</TableHead>
                        <TableHead className={isLumpSum ? "w-[10%] text-center" : "w-[8%] text-center"}>Qty</TableHead>
                        {isLumpSum ? (
                          <TableHead className="w-[16%]">Pricing</TableHead>
                        ) : (
                          <>
                            <TableHead className="w-[15%]">Rate (₹)</TableHead>
                            <TableHead className="w-[15%]">Discount</TableHead>
                            <TableHead className="w-[14%] text-right">Amount (₹)</TableHead>
                          </>
                        )}
                        <TableHead className="w-[36px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemFields.map((field, index) => {
                        const currentItem = watchedItems[index] || {};

                        return (
                          <TableRow key={field.id} className="align-top">
                            {/* Item Name & Description */}
                            <TableCell className="space-y-1.5">
                              <Input
                                placeholder="Service name (e.g. Candid Photography)"
                                {...form.register(`items.${index}.itemName` as const)}
                                className="h-9 text-sm"
                              />
                              {form.formState.errors.items?.[index]?.itemName && (
                                <p className="text-xs text-destructive font-medium">
                                  {form.formState.errors.items[index]?.itemName?.message}
                                </p>
                              )}
                              <Textarea
                                placeholder="Deliverables, crew size, timing..."
                                {...form.register(`items.${index}.description` as const)}
                                className="text-xs min-h-[44px] resize-y"
                              />
                            </TableCell>

                            {/* Function Mapping Dropdown */}
                            <TableCell>
                              <Select
                                value={currentItem.quotationFunctionId || 'none'}
                                onValueChange={(val) => {
                                  form.setValue(
                                    `items.${index}.quotationFunctionId`,
                                    !val || val === 'none' ? null : val
                                  );
                                }}
                              >
                                <SelectTrigger className="h-9 text-xs">
                                  <SelectValue placeholder="Map to event..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">-- All / General --</SelectItem>
                                  {watchedFunctions
                                    .filter((fn) => fn.name && fn.name.trim().length > 0)
                                    .map((fn, fIdx) => (
                                      <SelectItem key={fIdx} value={fn.name.trim()}>
                                        {fn.name.trim()}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </TableCell>

                            {/* Quantity */}
                            <TableCell>
                              <Input
                                type="number"
                                min="1"
                                {...form.register(`items.${index}.quantity` as const)}
                                className="h-9 text-sm text-center"
                              />
                            </TableCell>

                            {/* Conditional Rendering: Lump Sum vs Itemized */}
                            {isLumpSum ? (
                              <TableCell className="pt-3">
                                <Badge
                                  variant="secondary"
                                  className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-xs font-medium"
                                >
                                  Included in Package
                                </Badge>
                              </TableCell>
                            ) : (
                              <>
                                {/* Unit Price */}
                                <TableCell>
                                  <div className="relative flex items-center">
                                    <span className="absolute left-3 text-xs font-semibold text-muted-foreground select-none pointer-events-none">
                                      ₹
                                    </span>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="100"
                                      {...form.register(`items.${index}.unitPrice` as const)}
                                      className="h-9 text-sm pl-8 font-mono"
                                    />
                                  </div>
                                </TableCell>

                                {/* Discount */}
                                <TableCell className="space-y-1.5">
                                  <div className="flex gap-1">
                                    <Select
                                      value={currentItem.discountType || 'NONE'}
                                      onValueChange={(val) => {
                                        if (val) form.setValue(`items.${index}.discountType`, val as 'PERCENTAGE' | 'FIXED' | 'NONE');
                                      }}
                                    >
                                      <SelectTrigger className="h-8 text-xs w-[68px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="NONE">None</SelectItem>
                                        <SelectItem value="PERCENTAGE">%</SelectItem>
                                        <SelectItem value="FIXED">Flat ₹</SelectItem>
                                      </SelectContent>
                                    </Select>

                                    {currentItem.discountType && currentItem.discountType !== 'NONE' && (
                                      <div className="relative flex items-center flex-1">
                                        <Input
                                          type="number"
                                          min="0"
                                          {...form.register(`items.${index}.discountValue` as const)}
                                          className="h-8 text-xs w-full pl-6 font-mono"
                                          placeholder="0"
                                        />
                                      </div>
                                    )}
                                  </div>
                                </TableCell>

                                {/* Line Total */}
                                <TableCell className="text-right font-semibold text-sm pt-3.5 font-mono">
                                  {(() => {
                                    const qty = Math.max(1, Number(currentItem?.quantity) || 1);
                                    const price = Math.max(0, Number(currentItem?.unitPrice) || 0);
                                    const gross = qty * price;
                                    let discount = 0;
                                    const dVal = Math.max(0, Number(currentItem?.discountValue) || 0);
                                    if (currentItem?.discountType === 'PERCENTAGE') {
                                      discount = (gross * Math.min(100, dVal)) / 100;
                                    } else if (currentItem?.discountType === 'FIXED') {
                                      discount = Math.min(gross, dVal);
                                    }
                                    return formatMoney(Math.max(0, gross - discount));
                                  })()}
                                </TableCell>
                              </>
                            )}

                            {/* Delete Action */}
                            <TableCell className="pt-3">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(index)}
                                disabled={itemFields.length === 1}
                                className="text-muted-foreground hover:text-destructive h-8 w-8"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Lump Sum Amount Input Field at bottom of table if Lump Sum selected */}
                {isLumpSum && (
                  <div className="p-4 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <PackageCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        Lump Sum Package Grand Total (₹)
                      </span>
                      <p className="text-[11px] text-muted-foreground">
                        Individual item rates are hidden from the client proposal. Enter the all-inclusive package price below.
                      </p>
                    </div>
                    <div className="w-full sm:w-52">
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-xs font-semibold text-muted-foreground select-none pointer-events-none">
                          ₹
                        </span>
                        <Controller
                          control={form.control}
                          name="lumpSumAmount"
                          render={({ field }) => (
                            <Input
                              {...field}
                              type="number"
                              min="0"
                              step="500"
                              placeholder="e.g. 150000"
                              value={field.value ?? ''}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === '' ? undefined : Number(e.target.value)
                                )
                              }
                              className="h-9 text-sm pl-8 font-mono font-bold bg-background text-right"
                            />
                          )}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Toolbar Below Items List */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddNewBlankItem}
                    className="w-full sm:w-auto border-dashed flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Custom Line Item
                  </Button>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <PackagePicker
                      append={appendItem}
                      tenantId={lead?.tenantId}
                      variant="outline"
                      size="sm"
                      buttonLabel="Catalog Package"
                    />

                    <SaveAsPackageDialog
                      items={watchedItems}
                      getItems={() => form.getValues('items')}
                      tenantId={lead?.tenantId}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* SECTION 4: DELIVERABLES & BASE LIMITS */}
            <AccordionItem value="deliverables" className="border rounded-lg bg-card px-4 shadow-xs">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-2 text-base font-semibold">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span>Deliverables & Upselling Limits</span>
                  <Badge variant="outline" className="ml-2 text-xs font-normal">
                    {deliverableFields.length} {deliverableFields.length === 1 ? 'Deliverable' : 'Deliverables'}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-5 space-y-4">
                <p className="text-xs text-muted-foreground">
                  Specify physical and digital deliverables (photobooks, teaser films, raw drives) with base page limits for upsell calculation.
                </p>

                <div className="space-y-3">
                  {deliverableFields.map((field, index) => {
                    const currentType = form.watch(`deliverables.${index}.itemType`) || 'ALBUM';

                    return (
                      <div
                        key={field.id}
                        className="p-3 rounded-lg border bg-muted/20 relative group hover:border-primary/40 transition-colors space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2 border-b pb-2">
                          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                            {currentType === 'ALBUM' ? (
                              <BookOpen className="w-3.5 h-3.5 text-primary" />
                            ) : (
                              <Video className="w-3.5 h-3.5 text-primary" />
                            )}
                            Deliverable #{index + 1}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeDeliverable(index)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div className="sm:col-span-2">
                            <Label className="text-xs">Deliverable Name / Title</Label>
                            <Input
                              placeholder="e.g. 40-Page Flush Mount Leather Album"
                              {...form.register(`deliverables.${index}.name` as const)}
                              className="h-8 text-xs mt-1 font-medium"
                            />
                          </div>

                          <div>
                            <Label className="text-xs">Type</Label>
                            <Select
                              value={currentType}
                              onValueChange={(val) =>
                                form.setValue(`deliverables.${index}.itemType`, val || 'ALBUM')
                              }
                            >
                              <SelectTrigger className="h-8 text-xs mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ALBUM">Photobook / Album</SelectItem>
                                <SelectItem value="VIDEO">Cinematic Video</SelectItem>
                                <SelectItem value="PHOTO_PRINT">Framed Prints</SelectItem>
                                <SelectItem value="RAW_STORAGE">Raw Hard Drive / USB</SelectItem>
                                <SelectItem value="OTHER">Other Deliverable</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs">Quantity</Label>
                            <Input
                              type="number"
                              min="1"
                              {...form.register(`deliverables.${index}.quantity` as const)}
                              className="h-8 text-xs mt-1 text-center"
                            />
                          </div>
                        </div>

                        {currentType === 'ALBUM' && (
                          <div className="p-2.5 rounded bg-primary/5 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-0.5">
                              <span className="text-xs font-semibold text-primary">
                                Upselling Base Page Limit
                              </span>
                              <p className="text-[11px] text-muted-foreground">
                                Pages included in package base price. Any customer selections exceeding this limit will trigger extra page invoicing.
                              </p>
                            </div>
                            <div className="w-full sm:w-36">
                              <Input
                                type="number"
                                min="10"
                                placeholder="e.g. 40 pages"
                                {...form.register(`deliverables.${index}.basePageLimit` as const)}
                                className="h-8 text-xs font-mono bg-background text-center"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Quick Add Deliverable Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      appendDeliverable({
                        name: '40-Page Flush Mount Leather Album',
                        itemType: 'ALBUM',
                        quantity: 1,
                        basePageLimit: 40,
                      })
                    }
                    className="h-8 text-xs border-dashed"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    + Photobook / Album
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      appendDeliverable({
                        name: 'Cinematic 4K Wedding Trailer & Teaser Film',
                        itemType: 'VIDEO',
                        quantity: 1,
                        basePageLimit: null,
                      })
                    }
                    className="h-8 text-xs border-dashed"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    + Video Film
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      appendDeliverable({
                        name: 'Original RAW Photos & 4K Footage on SSD',
                        itemType: 'RAW_STORAGE',
                        quantity: 1,
                        basePageLimit: null,
                      })
                    }
                    className="h-8 text-xs border-dashed"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    + RAW Storage
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      appendDeliverable({
                        name: '',
                        itemType: 'OTHER',
                        quantity: 1,
                        basePageLimit: null,
                      })
                    }
                    className="h-8 text-xs border-dashed"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Custom Deliverable
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Special Notes Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Special Notes & Customer Instructions
              </CardTitle>
              <CardDescription>
                Customer-specific preferences, shoot guidelines, or internal studio instructions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                id="notes"
                rows={3}
                placeholder="e.g. Client requested candid morning preparation shots. Special focus on elderly grandparents; drone shots subject to venue clearance..."
                {...form.register('notes')}
                className="text-xs"
              />
            </CardContent>
          </Card>

          {/* Terms & Conditions Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Terms & Conditions / Studio Policies
              </CardTitle>
              <CardDescription>
                Studio policies and commercial terms. Leave blank to automatically apply standard studio terms from settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                id="termsAndConditions"
                rows={3}
                placeholder="Leave blank to use default studio terms & policies from settings..."
                {...form.register('termsAndConditions')}
                className="text-xs"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar: Summary & Commercial Calculation */}
        <div className="space-y-6">
          <Card className="sticky top-6 border-primary/20 shadow-md">
            <CardHeader className="pb-4 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="w-4 h-4 text-primary" />
                Financial Summary
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              {isLumpSum ? (
                /* Lump Sum Mode Financial Summary */
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b">
                    <span className="text-xs font-medium text-muted-foreground">Pricing Mode</span>
                    <Badge variant="outline" className="text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200">
                      Lump Sum Package
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sidebarLumpSum" className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      Package Price (₹)
                    </Label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-xs font-semibold text-muted-foreground select-none pointer-events-none">
                        ₹
                      </span>
                      <Controller
                        control={form.control}
                        name="lumpSumAmount"
                        render={({ field }) => (
                          <Input
                            {...field}
                            id="sidebarLumpSum"
                            type="number"
                            min="0"
                            step="500"
                            placeholder="Enter total package price"
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value === '' ? undefined : Number(e.target.value)
                              )
                            }
                            className="h-9 text-sm pl-8 font-mono font-bold text-foreground"
                          />
                        )}
                      />
                    </div>
                  </div>

                  {/* Advance Deposit */}
                  <div className="space-y-2 pt-2 border-t">
                    <Label htmlFor="advLumpSum" className="text-xs text-muted-foreground">
                      Advance Deposit Required (₹)
                    </Label>
                    <Input
                      id="advLumpSum"
                      type="number"
                      min="0"
                      {...form.register('advanceRequired')}
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  {/* Grand Total */}
                  <div className="pt-4 border-t-2 border-primary/20 space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm font-bold text-foreground">Package Total</span>
                      <span className="text-2xl font-black text-primary font-mono tracking-tight">
                        ₹{Number(form.watch('lumpSumAmount') || 0).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground text-right">
                      All-inclusive fixed package price
                    </p>
                  </div>
                </div>
              ) : (
                /* Itemized Mode Financial Summary */
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold font-mono">{formatMoney(calculation.subTotal)}</span>
                  </div>

                  {/* Overall Quotation Discount */}
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex justify-between text-xs">
                      <Label className="text-muted-foreground flex items-center gap-1">
                        <Tag className="w-3 h-3 text-muted-foreground" />
                        Overall Discount
                      </Label>
                      {calculation.quoteDiscountAmount > 0 && (
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                          -{formatMoney(calculation.quoteDiscountAmount)}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Select
                        value={watchedDiscountType}
                        onValueChange={(val) => {
                          if (val) form.setValue('discountType', val as 'PERCENTAGE' | 'FIXED' | 'NONE');
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs w-[90px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">None</SelectItem>
                          <SelectItem value="PERCENTAGE">% Pct</SelectItem>
                          <SelectItem value="FIXED">Flat ₹</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min="0"
                        disabled={watchedDiscountType === 'NONE'}
                        {...form.register('discountValue')}
                        className="h-8 text-xs font-mono"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* GST / Tax Rate */}
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex justify-between text-xs">
                      <Label className="text-muted-foreground flex items-center gap-1">
                        <Percent className="w-3 h-3 text-muted-foreground" />
                        Applicable GST / Tax Rate
                      </Label>
                      <span className="font-mono font-semibold">{formatMoney(calculation.taxAmount)}</span>
                    </div>
                    <Select
                      value={String(watchedTaxRate)}
                      onValueChange={(val) => {
                        if (val != null) form.setValue('taxRate', Number(val));
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0% (Exempt)</SelectItem>
                        <SelectItem value="5">5% GST</SelectItem>
                        <SelectItem value="12">12% GST</SelectItem>
                        <SelectItem value="18">18% GST (Standard)</SelectItem>
                        <SelectItem value="28">28% GST</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Advance Deposit */}
                  <div className="space-y-2 pt-2 border-t">
                    <Label htmlFor="adv" className="text-xs text-muted-foreground">
                      Advance Deposit Required (₹)
                    </Label>
                    <Input
                      id="adv"
                      type="number"
                      min="0"
                      {...form.register('advanceRequired')}
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  {/* Grand Total */}
                  <div className="pt-4 border-t-2 border-primary/20 space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm font-bold text-foreground">Grand Total</span>
                      <span className="text-2xl font-black text-primary font-mono tracking-tight">
                        {formatMoney(calculation.grandTotal)}
                      </span>
                    </div>
                    {calculation.totalSavings > 0 && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium text-right">
                        Total Savings: {formatMoney(calculation.totalSavings)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="pt-2 border-t bg-muted/20">
              <Button
                type="submit"
                className="w-full font-bold shadow-sm"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {submitButtonLabel}
                  </>
                ) : (
                  submitButtonLabel
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </form>
  );
}
