export const QUOTATION_STATUSES = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  VIEWED: 'VIEWED',
  NEGOTIATION: 'NEGOTIATION',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  CONVERTED: 'CONVERTED',
} as const;

export type QuotationStatus = typeof QUOTATION_STATUSES[keyof typeof QUOTATION_STATUSES];

export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  VIEWED: 'Viewed',
  NEGOTIATION: 'Negotiation',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
  CONVERTED: 'Converted',
};

export const QUOTATION_STATUS_COLORS: Record<QuotationStatus, 'info' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  DRAFT: 'neutral',
  SENT: 'info',
  VIEWED: 'info',
  NEGOTIATION: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  EXPIRED: 'danger',
  CONVERTED: 'success',
};

export const QUOTATION_REVISION_STATUSES = {
  DRAFT: 'DRAFT',
  LOCKED: 'LOCKED',
} as const;

export type QuotationRevisionStatus = typeof QUOTATION_REVISION_STATUSES[keyof typeof QUOTATION_REVISION_STATUSES];

export const QUOTATION_DOCUMENT_TYPES = {
  STANDARD: 'STANDARD',
  PROFORMA: 'PROFORMA',
} as const;

export const QUOTATION_TABS = {
  OVERVIEW: 'OVERVIEW',
  ITEMS: 'ITEMS',
  PRICING: 'PRICING',
  REVISIONS: 'REVISIONS',
  ACTIVITY: 'ACTIVITY',
  FILES: 'FILES',
  NOTES: 'NOTES',
  AUDIT: 'AUDIT',
} as const;

export const QUOTATION_DEFAULT_FILTERS = {
  STATUS: 'status',
  CUSTOMER: 'customerId',
  DATE_RANGE: 'dateRange',
} as const;

export const QUOTATION_DEFAULT_SORTING = {
  FIELD: 'createdAt',
  ORDER: 'desc',
} as const;

export const QUOTATION_DEFAULT_VALIDITY_DAYS = 30;
