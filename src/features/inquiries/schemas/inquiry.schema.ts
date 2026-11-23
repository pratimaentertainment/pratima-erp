import { z } from 'zod';

export const STANDARD_EVENT_TYPES = [
  'Wedding',
  'Pre-Wedding',
  'Maternity',
  'Birthday',
  'Commercial',
  'Portrait',
  'Other',
] as const;

export type StandardEventType = (typeof STANDARD_EVENT_TYPES)[number];

export const inquiryFormSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required').trim(),
    lastName: z.string().min(1, 'Last name is required').trim(),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    phone: z.string().min(5, 'Phone number must be at least 5 digits').trim(),
    whatsapp: z.string().optional().or(z.literal('')),
    inquiryDate: z.string().min(1, 'Inquiry date is required'),
    eventDate: z.string().optional().or(z.literal('')),
    eventType: z.string().optional().or(z.literal('')),
    otherEventType: z.string().optional().or(z.literal('')),
    preferredContactTime: z.string().optional().or(z.literal('')),
    budgetRange: z.string().optional().or(z.literal('')),
    leadSourceId: z.string().optional().or(z.literal('')),
    assignedToId: z.string().optional().or(z.literal('')),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
    notes: z.string().optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.eventType === 'Other' && (!data.otherEventType || !data.otherEventType.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['otherEventType'],
        message: 'Please specify the custom event name',
      });
    }
  });

export type InquiryFormValues = z.infer<typeof inquiryFormSchema>;
