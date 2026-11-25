/**
 * Global Currency Formatting Utility for FRAMIQ
 * Defaults to Indian Rupee (INR / ₹) with standard 2 decimal places.
 */

export function formatMoney(
  amount: number | string | null | undefined,
  currencyCode: string = 'INR',
  locale: string = 'en-IN'
): string {
  const num = typeof amount === 'number' ? amount : Number(amount);
  const safeAmount = isNaN(num) || num === null || num === undefined ? 0 : num;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safeAmount);
  } catch {
    // Fallback in case of unsupported locale / currencyCode
    const prefix = currencyCode === 'INR' ? '₹' : currencyCode === 'USD' ? '$' : `${currencyCode} `;
    return `${prefix}${safeAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

export function formatNumber(
  amount: number | string | null | undefined,
  minimumFractionDigits: number = 2,
  maximumFractionDigits: number = 2,
  locale: string = 'en-IN'
): string {
  const num = typeof amount === 'number' ? amount : Number(amount);
  const safeAmount = isNaN(num) || num === null || num === undefined ? 0 : num;

  return safeAmount.toLocaleString(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  });
}
