import { Prisma, DiscountType } from '@prisma/client';

type Decimal = Prisma.Decimal;

export interface PricingItemInput {
  itemId: string;
  quantity: number;
  unitPrice: Decimal;
  itemDiscountType?: DiscountType | null;
  itemDiscountValue?: Decimal | null;
  taxPercentage?: Decimal | null;
  isBillable?: boolean; // Replaces lineItemType constraint; false for INFO items
}

export interface PricingDiscountInput {
  discountType: DiscountType;
  discountValue: Decimal;
}

export interface PricingResult {
  currencyCode: string;
  subtotal: Decimal;
  discountAmount: Decimal;
  taxAmount: Decimal;
  roundOff: Decimal;
  grandTotal: Decimal;
  items: Array<{
    itemId: string;
    calculatedSubtotal: Decimal;
    calculatedDiscountAmount: Decimal;
    calculatedTaxAmount: Decimal;
    calculatedTotal: Decimal;
  }>;
}
