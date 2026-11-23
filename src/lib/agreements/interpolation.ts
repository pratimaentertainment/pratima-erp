import { format } from 'date-fns';
import { formatMoney } from '@/lib/currency';

export interface AgreementUserData {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  companyName?: string | null;
  designation?: string | null;
}

export interface AgreementContextData {
  companyName?: string | null;
  role?: string | null;
  eventDate?: string | Date | null;
  subEventName?: string | null;
  payoutAmount?: number | string | null;
  dateSigned?: string | Date | null;
}

/**
 * Compiles a contract template into a legally immutable snapshot string
 * by dynamically replacing smart placeholder tags with actual user and event data.
 */
export function compileAgreementContent(
  templateContent: string,
  user: AgreementUserData,
  context?: AgreementContextData
): string {
  if (!templateContent) return '';

  let compiled = templateContent;

  const replacements: Record<string, string> = {
    '{{freelancer_name}}': user.name || '',
    '{{freelancer_phone}}': user.phone || 'N/A',
    '{{freelancer_email}}': user.email || 'N/A',
    '{{address}}': user.address || 'N/A',
    '{{company_name}}':
      user.companyName ||
      context?.companyName ||
      'Pratima Photography Studio',
    '{{role}}': context?.role || user.designation || 'Creative Specialist',
    '{{event_date}}': context?.eventDate
      ? format(new Date(context.eventDate), 'dd MMM yyyy')
      : 'As per event schedule',
    '{{sub_event_name}}': context?.subEventName || 'Assigned Event Ceremonies',
    '{{payout_amount}}':
      context?.payoutAmount !== undefined && context?.payoutAmount !== null
        ? formatMoney(Number(context.payoutAmount))
        : 'As agreed per event shoot',
    '{{date_signed}}': context?.dateSigned
      ? format(new Date(context.dateSigned), 'dd MMM yyyy')
      : format(new Date(), 'dd MMM yyyy'),
  };

  // Replace each tag case-insensitively
  for (const [tag, value] of Object.entries(replacements)) {
    // Escape regex special characters in tag
    const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedTag, 'gi');
    compiled = compiled.replace(regex, value);
  }

  return compiled;
}
