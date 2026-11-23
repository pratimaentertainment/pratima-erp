import type { QuotationDto, QuotationItemDto } from '../types';

/**
 * Placeholder for backend-to-frontend mappers.
 * In a real scenario, this transforms Prisma objects or Backend JSON into strictly typed DTOs.
 */
export function mapToQuotationDto(data: any): QuotationDto {
  return {
    id: data.id,
    quoteNumber: data.quoteNumber,
    customerId: data.customerId,
    customerName: data.customer?.name || data.customerName || 'Unknown Customer',
    title: data.title,
    status: data.status,
    issueDate: data.issueDate,
    expiryDate: data.expiryDate,
    subtotal: Number(data.subtotal) || 0,
    totalDiscount: Number(data.totalDiscount) || 0,
    totalTax: Number(data.totalTax) || 0,
    grandTotal: Number(data.grandTotal) || 0,
    notes: data.notes,
    terms: data.terms,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    createdBy: data.createdBy,
    version: data.version,
    items: data.items ? data.items.map(mapToQuotationItemDto) : [],
  };
}

export function mapToQuotationItemDto(data: any): QuotationItemDto {
  return {
    id: data.id,
    productId: data.productId,
    productName: data.product?.name || data.productName || 'Unknown Product',
    description: data.description,
    quantity: Number(data.quantity) || 0,
    unitPrice: Number(data.unitPrice) || 0,
    discount: Number(data.discount) || 0,
    tax: Number(data.tax) || 0,
    total: Number(data.total) || 0,
  };
}
