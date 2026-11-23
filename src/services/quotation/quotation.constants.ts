export type ServiceQuotationStatus = 
  | 'DRAFT' 
  | 'SENT' 
  | 'VIEWED' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'CONVERTED' 
  | 'EXPIRED';

export const QUOTATION_STATUS_TRANSITIONS: Record<ServiceQuotationStatus, ServiceQuotationStatus[]> = {
  DRAFT: ['SENT', 'APPROVED', 'EXPIRED'],
  SENT: ['VIEWED', 'APPROVED', 'REJECTED', 'EXPIRED'],
  VIEWED: ['APPROVED', 'REJECTED', 'SENT', 'EXPIRED'],
  APPROVED: ['CONVERTED', 'EXPIRED'],
  REJECTED: ['SENT', 'EXPIRED'],
  CONVERTED: [],
  EXPIRED: [],
};

// If a revision is in any of these states, it is considered immutable.
export const IMMUTABLE_REVISION_STATUSES: ServiceQuotationStatus[] = [
  'SENT',
  'VIEWED',
  'APPROVED',
  'REJECTED',
  'CONVERTED',
  'EXPIRED',
];

export const DEFAULT_CURRENCY = 'INR';
