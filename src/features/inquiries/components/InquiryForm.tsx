'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  inquiryFormSchema, 
  type InquiryFormValues, 
  STANDARD_EVENT_TYPES 
} from '../schemas/inquiry.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { createInquiry, updateInquiry } from '@/actions/inquiry.actions';
import { toast } from 'sonner';
import { format } from 'date-fns';

export interface InquiryFormProps {
  initialData?: any;
  leadSources: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string; email: string }>;
  currentUserId?: string;
  onSuccess: (record: any) => void;
  onCancel?: () => void;
}

export function InquiryForm({
  initialData,
  leadSources,
  users,
  currentUserId,
  onSuccess,
  onCancel,
}: InquiryFormProps) {
  const [loading, setLoading] = React.useState(false);
  const isEditing = !!initialData?.id;

  // Determine initial eventType and otherEventType
  const initialEventTypeRaw = initialData?.eventType || '';
  const isKnownStandard = STANDARD_EVENT_TYPES.slice(0, -1).includes(initialEventTypeRaw as any);
  const defaultEventType = initialEventTypeRaw
    ? isKnownStandard
      ? initialEventTypeRaw
      : 'Other'
    : '';
  const defaultOtherEventType = initialEventTypeRaw && !isKnownStandard ? initialEventTypeRaw : '';

  // Determine default assigned user: keep initialData for editing; default to logged-in user if creating new
  const defaultAssignedTo =
    initialData?.assignedToId ||
    (currentUserId && users.some((u) => u.id === currentUserId) ? currentUserId : '') ||
    '';

  const form = useForm<InquiryFormValues>({
    resolver: zodResolver(inquiryFormSchema) as any,
    defaultValues: {
      firstName: initialData?.customer?.firstName || '',
      lastName: initialData?.customer?.lastName || '',
      email: initialData?.customer?.email || '',
      phone: initialData?.customer?.phone || '',
      whatsapp: initialData?.customer?.whatsapp || '',
      inquiryDate: initialData?.inquiryDate
        ? format(new Date(initialData.inquiryDate), 'yyyy-MM-dd')
        : format(new Date(), 'yyyy-MM-dd'),
      eventDate: initialData?.eventDate
        ? format(new Date(initialData.eventDate), 'yyyy-MM-dd')
        : '',
      eventType: defaultEventType,
      otherEventType: defaultOtherEventType,
      preferredContactTime: initialData?.preferredContactTime || '',
      budgetRange: initialData?.budgetRange || '',
      leadSourceId: initialData?.leadSourceId || '',
      assignedToId: defaultAssignedTo,
      priority: initialData?.priority || 'MEDIUM',
      notes: initialData?.notes || '',
    },
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = form;

  // Automatically pre-select logged-in user if available and no user selected yet on creation
  React.useEffect(() => {
    if (!isEditing && currentUserId && !watch('assignedToId')) {
      if (users.some((u) => u.id === currentUserId)) {
        setValue('assignedToId', currentUserId);
      }
    }
  }, [currentUserId, isEditing, setValue, watch, users]);

  const selectedEventType = watch('eventType');

  const onSubmit = async (data: InquiryFormValues) => {
    setLoading(true);
    try {
      const finalEventType =
        data.eventType === 'Other'
          ? data.otherEventType?.trim() || 'Other'
          : data.eventType || undefined;

      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || undefined,
        phone: data.phone,
        whatsapp: data.whatsapp || undefined,
        inquiryDate: data.inquiryDate ? new Date(data.inquiryDate) : new Date(),
        eventDate: data.eventDate ? new Date(data.eventDate) : undefined,
        eventType: finalEventType,
        preferredContactTime: data.preferredContactTime || undefined,
        budgetRange: data.budgetRange || undefined,
        leadSourceId: data.leadSourceId || undefined,
        assignedToId: data.assignedToId || undefined,
        priority: data.priority,
        notes: data.notes || undefined,
      };

      if (isEditing) {
        const res = await updateInquiry(initialData.id, payload);
        if (res.success) {
          toast.success('Inquiry updated successfully');
          onSuccess(res.data);
        } else {
          toast.error(res.error || 'Failed to update inquiry');
        }
      } else {
        const res = await createInquiry(payload);
        if (res.success) {
          toast.success('Inquiry created successfully');
          onSuccess(res.data);
        } else {
          toast.error(res.error || 'Failed to create inquiry');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
        {/* Customer Information Header */}
        <div className="col-span-1 sm:col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b pb-1">
          Customer Information
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="firstName">
            First Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="firstName"
            placeholder="John"
            disabled={isEditing}
            {...register('firstName')}
          />
          {errors.firstName && (
            <p className="text-xs text-destructive">{errors.firstName.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="lastName">
            Last Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="lastName"
            placeholder="Doe"
            disabled={isEditing}
            {...register('lastName')}
          />
          {errors.lastName && (
            <p className="text-xs text-destructive">{errors.lastName.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">
            Phone <span className="text-red-500">*</span>
          </Label>
          <Input
            id="phone"
            placeholder="+91 9876543210"
            disabled={isEditing}
            {...register('phone')}
          />
          {errors.phone && (
            <p className="text-xs text-destructive">{errors.phone.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <Input
            id="whatsapp"
            placeholder="+91 9876543210"
            disabled={isEditing}
            {...register('whatsapp')}
          />
          {errors.whatsapp && (
            <p className="text-xs text-destructive">{errors.whatsapp.message}</p>
          )}
        </div>

        <div className="space-y-1.5 col-span-1 sm:col-span-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="client@example.com"
            disabled={isEditing}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        {/* Inquiry Details Header */}
        <div className="col-span-1 sm:col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b pb-1 mt-2">
          Inquiry Details
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="inquiryDate">
            Inquiry Date <span className="text-red-500">*</span>
          </Label>
          <Input id="inquiryDate" type="date" {...register('inquiryDate')} />
          {errors.inquiryDate && (
            <p className="text-xs text-destructive">{errors.inquiryDate.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="eventDate">Event Date</Label>
          <Input id="eventDate" type="date" {...register('eventDate')} />
          {errors.eventDate && (
            <p className="text-xs text-destructive">{errors.eventDate.message}</p>
          )}
        </div>

        {/* Event Type Select Dropdown */}
        <FormField
          control={control}
          name="eventType"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel>Event Type</FormLabel>
              <Select 
                defaultValue={field.value} 
                onValueChange={field.onChange} 
                value={field.value}
                items={STANDARD_EVENT_TYPES.map((type) => ({ value: type, label: type }))}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Event Type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {STANDARD_EVENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Dynamic Conditional "Other" Input Field */}
        {selectedEventType === 'Other' && (
          <div className="space-y-1.5 animate-in fade-in-50 duration-200">
            <Label htmlFor="otherEventType">
              Custom Event Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="otherEventType"
              placeholder="e.g. Arangetram, Housewarming, Baby Shower"
              {...register('otherEventType')}
            />
            {errors.otherEventType && (
              <p className="text-xs text-destructive">{errors.otherEventType.message}</p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="preferredContactTime">Preferred Contact Time</Label>
          <Input
            id="preferredContactTime"
            placeholder="e.g. Evening, 5 PM - 7 PM"
            {...register('preferredContactTime')}
          />
          {errors.preferredContactTime && (
            <p className="text-xs text-destructive">
              {errors.preferredContactTime.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="budgetRange">Budget Range</Label>
          <Input
            id="budgetRange"
            placeholder="e.g. ₹50,000 - ₹1,00,000"
            {...register('budgetRange')}
          />
          {errors.budgetRange && (
            <p className="text-xs text-destructive">{errors.budgetRange.message}</p>
          )}
        </div>

        <FormField
          control={control}
          name="leadSourceId"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel>Source</FormLabel>
              <Select 
                defaultValue={field.value} 
                onValueChange={field.onChange} 
                value={field.value}
                items={leadSources.map((s) => ({ value: s.id, label: s.name }))}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Source" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {leadSources.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      {source.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="priority"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel>Priority</FormLabel>
              <Select 
                defaultValue={field.value} 
                onValueChange={field.onChange} 
                value={field.value}
                items={[
                  { value: 'LOW', label: 'Low' },
                  { value: 'MEDIUM', label: 'Medium' },
                  { value: 'HIGH', label: 'High' },
                ]}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Priority" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="assignedToId"
          render={({ field }) => (
            <FormItem className="space-y-1.5 col-span-1 sm:col-span-2">
              <FormLabel>Assign To</FormLabel>
              <Select 
                defaultValue={field.value} 
                onValueChange={field.onChange} 
                value={field.value}
                items={users.map((u) => ({ value: u.id, label: `${u.name} (${u.email})` }))}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Executive" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-1.5 col-span-1 sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Initial requirements, context, or special requests..."
            rows={3}
            {...register('notes')}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : isEditing ? 'Update Inquiry' : 'Save Inquiry'}
        </Button>
      </div>
    </form>
    </Form>
  );
}
