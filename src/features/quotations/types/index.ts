import type { QuotationStatus } from '../constants';

export interface QuotationItemDto {
  id: string;
  productId: string;
  productName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  total: number;
}

export interface QuotationDto {
  id: string;
  quoteNumber: string;
  customerId: string;
  customerName: string;
  title: string;
  status: QuotationStatus;
  issueDate: string;
  expiryDate: string;
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  notes?: string;
  terms?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  version: number;
  items: QuotationItemDto[];
}
