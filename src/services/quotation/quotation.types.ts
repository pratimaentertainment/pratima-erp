import { Prisma, DiscountType, LineItemType } from '@prisma/client';
import { ServiceQuotationStatus } from './quotation.constants';

type Decimal = Prisma.Decimal;

// ----------------------------------------------------------------------
// Base Context
// ----------------------------------------------------------------------

export interface ServiceContext {
  tenantId: string;
  branchId: string;
  userId: string;
  roleIds: string[];
  permissions: string[];
  requestId: string;
}

// ----------------------------------------------------------------------
// Pricing & Math Inputs
// ----------------------------------------------------------------------

// ----------------------------------------------------------------------
// Request DTOs
// ----------------------------------------------------------------------

export interface QuotationItemInput {
  packageId: string;
  quotationFunctionId?: string | null;
  itemName?: string;
  description?: string | null;
  quantity: number;
  unitPrice: Decimal;
  itemDiscountType?: DiscountType | null;
  itemDiscountValue?: Decimal | null;
  taxPercentage?: Decimal | null;
  lineItemType?: LineItemType;
}

export interface QuotationDiscountInput {
  discountType: DiscountType;
  discountValue: Decimal;
  couponCode?: string | null;
}

export interface CreateQuotationDto {
  idempotencyKey?: string;
  leadId: string;
  tenantId?: string;
  branchId?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  validUntil?: Date | string | null;
  notes?: string | null;
  terms?: string | null;
  termsAndConditions?: string | null;
  subjects?: Array<{
    id?: string;
    role: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    birthDate?: Date | string | null;
    anniversaryDate?: Date | string | null;
  }>;
  functions?: Array<{
    id?: string;
    name: string;
    date?: Date | string | null;
    venue?: string | null;
  }>;
  deliverables?: Array<{
    id?: string;
    name: string;
    itemType: string;
    quantity: number;
    basePageLimit?: number | null;
  }>;
  pricingMode?: 'ITEMIZED' | 'LUMP_SUM';
  lumpSumAmount?: number | Decimal | null;
  items: QuotationItemInput[];
  discount?: QuotationDiscountInput;
}

export interface CreateRevisionDto {
  revisionReason?: string;
  revisionComment?: string;
  notes?: string | null;
  terms?: string | null;
  termsAndConditions?: string | null;
  pricingMode?: 'ITEMIZED' | 'LUMP_SUM';
  lumpSumAmount?: number | Decimal | null;
  subjects?: Array<{
    id?: string;
    role?: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    birthDate?: Date | string | null;
    anniversaryDate?: Date | string | null;
  }>;
  functions?: Array<{
    id?: string;
    name: string;
    date?: Date | string | null;
    venue?: string | null;
  }>;
  deliverables?: Array<{
    id?: string;
    name: string;
    itemType?: string;
    quantity: number;
    basePageLimit?: number | null;
  }>;
  items?: QuotationItemInput[];
  discount?: QuotationDiscountInput;
}

export interface UpdateRevisionDto {
  revisionReason?: string;
  revisionComment?: string;
  notes?: string | null;
  terms?: string | null;
  termsAndConditions?: string | null;
  validUntil?: Date;
  pricingMode?: 'ITEMIZED' | 'LUMP_SUM';
  lumpSumAmount?: number | Decimal | null;
  subjects?: Array<{
    id?: string;
    role?: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    birthDate?: Date | string | null;
    anniversaryDate?: Date | string | null;
  }>;
  functions?: Array<{
    id?: string;
    name: string;
    date?: Date | string | null;
    venue?: string | null;
  }>;
  deliverables?: Array<{
    id?: string;
    name: string;
    itemType?: string;
    quantity: number;
    basePageLimit?: number | null;
  }>;
  items?: QuotationItemInput[];
  discount?: QuotationDiscountInput;
  updatedAt?: Date; // For optimistic locking
}

// ----------------------------------------------------------------------
// Response DTOs
// ----------------------------------------------------------------------

export interface QuotationRevisionItemDto {
  id: string;
  packageId: string;
  quotationFunctionId?: string | null;
  functionName?: string | null;
  itemName: string;
  description?: string | null;
  package?: any;
  snapshotExtra?: any;
  quantity: number;
  unitPrice: number;
  priceOverride?: number | null;
  itemDiscountType?: DiscountType | null;
  itemDiscountValue?: number | null;
  gstInclusive: boolean;
  taxPercentage?: number | null;
  calculatedSubtotal: number;
  calculatedDiscountAmount: number;
  calculatedTaxAmount: number;
  calculatedTotal: number;
  lineItemType: LineItemType;
  taxRate?: {
    id: string;
    name: string;
    percentage: number;
  } | null;
}

export interface QuotationRevisionDto {
  id: string;
  quotationId: string;
  revisionNumber: number;
  revisionReason?: string | null;
  revisionComment?: string | null;
  currencyCode: string;
  status: ServiceQuotationStatus;
  pricingMode?: 'ITEMIZED' | 'LUMP_SUM';
  lumpSumAmount?: number | null;
  subtotal: number;
  discountType?: DiscountType | null;
  discountValue?: number | null;
  discountAmount: number;
  couponCode?: string | null;
  taxAmount: number;
  roundOff: number;
  totalAmount: number;
  grandTotal: number;
  createdAt: Date;
  items: QuotationRevisionItemDto[];
  clientSignature?: string | null;
  acceptedAt?: Date | string | null;
  clientIpAddress?: string | null;
  acceptanceTerms?: string | null;
  terms?: string | null;
  termsAndConditions?: string | null;
  notes?: string | null;
}

export interface QuotationDto {
  id: string;
  totalAmount: number;
  status: ServiceQuotationStatus;
  pricingMode?: 'ITEMIZED' | 'LUMP_SUM';
  lumpSumAmount?: number | null;
  validUntil?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuotationDetailDto extends QuotationDto {
  leadId: string;
  documentUrl?: string | null;
  quoteNumber?: string;
  quotationNumber?: string;
  customerName?: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  title?: string;
  eventType?: string | null;
  subtotal?: number;
  totalDiscount?: number;
  totalTax?: number;
  grandTotal?: number;
  currencyCode?: string;
  currency?: string;
  version?: number;
  clientSignature?: string | null;
  acceptedAt?: Date | string | null;
  clientIpAddress?: string | null;
  acceptanceTerms?: string | null;
  terms?: string | null;
  termsAndConditions?: string | null;
  advanceRequired?: number | null;
  subjects?: any[];
  functions?: any[];
  deliverables?: any[];
  items?: QuotationRevisionItemDto[];
  revisions?: QuotationRevisionDto[];
  customPortfolioUrls?: string[];
  customPromoVideoUrl?: string | null;
  portfolioUrls?: string[];
  promoVideoUrl?: string | null;
  whyChooseUs?: string[];
  tenant?: {
    id: string;
    name: string;
    tradeName?: string | null;
    logoUrl?: string | null;
    settings?: any;
    bankDetails?: any;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    gstNumber?: string | null;
    defaultPortfolioUrls?: string[];
    defaultPromoVideoUrl?: string | null;
    whyChooseUs?: string[];
  } | null;
  branch?: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
  } | null;
  notes?: string | null;
  lead: {
    id: string;
    leadCode: string;
    eventType?: string | null;
    customer: {
      id: string;
      firstName: string;
      lastName: string;
      name?: string;
      companyName?: string | null;
      email?: string | null;
      phone?: string | null;
      customerCode?: string | null;
    };
    inquiry?: {
      id: string;
      eventType?: string | null;
      eventDate?: Date | string | null;
      notes?: string | null;
    } | null;
  };
  latestRevision?: QuotationRevisionDto;
}

