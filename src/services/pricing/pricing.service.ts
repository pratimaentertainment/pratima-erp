import { Prisma } from '@prisma/client';
import { PricingItemInput, PricingDiscountInput, PricingResult } from './pricing.types';
import { DEFAULT_CURRENCY_CODE, ROUND_GRAND_TOTAL_TO_NEAREST_INT, ROUNDING_PRECISION } from './pricing.constants';

type Decimal = Prisma.Decimal;

export class PricingService {
  /**
   * Calculates the exact financial math for a set of items and global discount.
   * Pure deterministic function with zero side effects or external dependencies.
   * 
   * Strategy & Sequence:
   * 1. Decimal Precision Strategy: All internal calculations use Prisma.Decimal to prevent floating point inaccuracies.
   * 2. Item Subtotal Strategy: Quantity * UnitPrice. If an item is not billable (INFO), its financial contribution is 0.
   * 3. Item Discount Strategy: Evaluated per item. Fixed or Percentage. Item subtotal - discount = Item Taxable Amount.
   * 4. Tax Calculation Strategy: Tax is computed per item on its Taxable Amount.
   * 5. Quotation Level Discount: Evaluated on the total taxable subtotal of all items. 
   * 6. Rounding Strategy: Item and tax calculations retain 2 decimal places. Grand Total can be rounded to nearest integer if configured, persisting the difference in roundOff.
   */
  public static calculate(
    items: PricingItemInput[],
    globalDiscount?: PricingDiscountInput | null,
    currencyCode: string = DEFAULT_CURRENCY_CODE
  ): PricingResult {
    let globalSubtotal = new Prisma.Decimal(0);
    let globalTaxAmount = new Prisma.Decimal(0);
    
    const calculatedItems = items.map((item) => {
      // 1. Determine if item is billable. INFO items contribute 0 to the final totals.
      const isBillable = item.isBillable !== false;
      const unitPrice = isBillable ? new Prisma.Decimal(item.unitPrice) : new Prisma.Decimal(0);
      const quantity = isBillable ? new Prisma.Decimal(item.quantity) : new Prisma.Decimal(0);

      // 2. Base Subtotal (pre-discount)
      const baseSubtotal = unitPrice.mul(quantity);

      // 3. Item Discount Calculation
      let calculatedDiscountAmount = new Prisma.Decimal(0);
      if (item.itemDiscountType && item.itemDiscountType !== 'NONE' && item.itemDiscountValue) {
        const discountValue = new Prisma.Decimal(item.itemDiscountValue || 0);
        if (item.itemDiscountType === 'PERCENTAGE') {
          // Percentage discount: (Base * Percentage) / 100
          calculatedDiscountAmount = baseSubtotal.mul(discountValue).div(100);
        } else if (item.itemDiscountType === 'FIXED' || (item.itemDiscountType as any) === 'FIXED_AMOUNT') {
          calculatedDiscountAmount = discountValue;
        }
      }

      // Ensure discount doesn't exceed the base subtotal (no negative taxable amount)
      if (calculatedDiscountAmount.greaterThan(baseSubtotal)) {
        calculatedDiscountAmount = baseSubtotal;
      }

      // 4. Taxable Amount (Calculated Subtotal)
      const calculatedSubtotal = baseSubtotal.sub(calculatedDiscountAmount);

      // 5. Item Tax Calculation
      let calculatedTaxAmount = new Prisma.Decimal(0);
      if (item.taxPercentage) {
        const taxPercent = new Prisma.Decimal(item.taxPercentage);
        calculatedTaxAmount = calculatedSubtotal.mul(taxPercent).div(100);
      }

      // 6. Item Total
      const calculatedTotal = calculatedSubtotal.add(calculatedTaxAmount);

      // Accumulate to global totals
      globalSubtotal = globalSubtotal.add(calculatedSubtotal);
      globalTaxAmount = globalTaxAmount.add(calculatedTaxAmount);

      return {
        itemId: item.itemId,
        // We round item-level results to our standard precision (e.g., 2 decimal places) 
        // to match standard ledger storage constraints.
        calculatedSubtotal: this.roundToPrecision(calculatedSubtotal, ROUNDING_PRECISION),
        calculatedDiscountAmount: this.roundToPrecision(calculatedDiscountAmount, ROUNDING_PRECISION),
        calculatedTaxAmount: this.roundToPrecision(calculatedTaxAmount, ROUNDING_PRECISION),
        calculatedTotal: this.roundToPrecision(calculatedTotal, ROUNDING_PRECISION),
      };
    });

    // 7. Global Quotation Discount Calculation
    let globalDiscountAmount = new Prisma.Decimal(0);
    if (globalDiscount && globalDiscount.discountType !== 'NONE') {
      const discountValue = new Prisma.Decimal(globalDiscount.discountValue || 0);
      if (globalDiscount.discountType === 'PERCENTAGE') {
        // Global percentage discount applies to the total taxable subtotal BEFORE taxes.
        globalDiscountAmount = globalSubtotal.mul(discountValue).div(100);
      } else if (globalDiscount.discountType === 'FIXED' || (globalDiscount.discountType as any) === 'FIXED_AMOUNT') {
        globalDiscountAmount = discountValue;
      }
    }

    // Ensure global discount doesn't exceed the subtotal
    if (globalDiscountAmount.greaterThan(globalSubtotal)) {
      globalDiscountAmount = globalSubtotal;
    }

    // 8. Grand Total Calculation
    // Sequence: Subtotal (which is already post-item-discount) - Global Discount + Taxes
    const exactGrandTotal = globalSubtotal.sub(globalDiscountAmount).add(globalTaxAmount);

    // 9. Rounding Strategy
    let grandTotal = exactGrandTotal;
    let roundOff = new Prisma.Decimal(0);

    if (ROUND_GRAND_TOTAL_TO_NEAREST_INT) {
      // Round to nearest integer (e.g., 100.40 -> 100.00, 100.60 -> 101.00)
      grandTotal = new Prisma.Decimal(exactGrandTotal.toNearest(1));
      // RoundOff is the adjustment made. e.g., grandTotal - exactGrandTotal.
      // If exact is 100.40, grandTotal is 100, roundOff is -0.40.
      roundOff = grandTotal.sub(exactGrandTotal);
    }

    return {
      currencyCode,
      subtotal: this.roundToPrecision(globalSubtotal, ROUNDING_PRECISION),
      discountAmount: this.roundToPrecision(globalDiscountAmount, ROUNDING_PRECISION),
      taxAmount: this.roundToPrecision(globalTaxAmount, ROUNDING_PRECISION),
      roundOff: this.roundToPrecision(roundOff, ROUNDING_PRECISION),
      grandTotal: this.roundToPrecision(grandTotal, ROUNDING_PRECISION),
      items: calculatedItems,
    };
  }

  /**
   * Helper method to enforce exact decimal precision securely.
   */
  private static roundToPrecision(value: Decimal, precision: number): Decimal {
    return new Prisma.Decimal(value.toDecimalPlaces(precision));
  }
}
