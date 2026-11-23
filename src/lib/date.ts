import { format, isValid } from 'date-fns';

/**
 * Universal date formatter to guarantee deterministic rendering
 * between Next.js SSR and Client Hydration.
 */
export function formatDate(
  date: Date | string | number | null | undefined,
  formatString: string = 'dd/MM/yyyy'
): string {
  if (!date) return 'N/A';
  
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    if (!isValid(d)) return 'N/A';
    return format(d, formatString);
  } catch {
    return 'N/A';
  }
}

/**
 * Universal date + time formatter
 */
export function formatDateTime(
  date: Date | string | number | null | undefined,
  formatString: string = 'dd/MM/yyyy hh:mm a'
): string {
  if (!date) return 'N/A';
  
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    if (!isValid(d)) return 'N/A';
    return format(d, formatString);
  } catch {
    return 'N/A';
  }
}
