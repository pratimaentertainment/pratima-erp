/**
 * WhatsApp Messaging Utility Engine
 * Enterprise-grade URL generator and phone sanitizer for Click-to-WhatsApp workflows.
 */

/**
 * Normalizes and sanitizes phone numbers for WhatsApp API/Web URL compatibility.
 * Handles Indian numbers (+91 prefixing, 10-digit expansion, 0-prefix removal),
 * 00-international prefixes, and standardizes to E.164 digits format without symbols.
 */
export function formatWhatsAppPhone(phone?: string | null): string {
  if (!phone) return '';

  // Remove all non-numeric characters
  let clean = phone.replace(/\D/g, '');
  if (!clean) return '';

  // Strip international dialing escape sequence (00 prefix)
  if (clean.startsWith('00')) {
    clean = clean.slice(2);
  }

  // Handle standard 10-digit Indian mobile numbers (prepend 91)
  if (clean.length === 10) {
    return `91${clean}`;
  }

  // Handle 11-digit Indian numbers starting with trunk prefix '0' (e.g., 09876543210 -> 919876543210)
  if (clean.length === 11 && clean.startsWith('0')) {
    return `91${clean.slice(1)}`;
  }

  // If already 12 digits starting with 91, return as is
  if (clean.length === 12 && clean.startsWith('91')) {
    return clean;
  }

  return clean;
}

/**
 * Generates a pre-filled direct Click-to-WhatsApp link.
 * If phone is provided, directs to https://wa.me/{phone}?text={encodedMessage}.
 * If phone is omitted, directs to https://wa.me/?text={encodedMessage} allowing manual contact selection.
 *
 * @param phone Recipient's phone number in any common format (+91, 0-prefix, spaces, dashes)
 * @param message The pre-filled message text to encode safely
 * @returns Fully encoded WhatsApp URL
 */
export function generateWhatsAppLink(phone: string, message: string): string {
  const formattedPhone = formatWhatsAppPhone(phone);
  const encodedMessage = encodeURIComponent(message || '');

  if (formattedPhone) {
    return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
  }

  return `https://wa.me/?text=${encodedMessage}`;
}

/**
 * Parameter interface for generating overdue invoice payment reminder messages.
 */
export interface InvoiceReminderMessageParams {
  clientName: string;
  balanceDue: number;
  invoiceNumber: string;
  studioName?: string;
}

/**
 * Constructs a standardized, polite WhatsApp payment reminder message template.
 */
export function buildInvoiceOverdueReminder(params: InvoiceReminderMessageParams): string {
  const { clientName, balanceDue, invoiceNumber } = params;
  const formattedBalance = Number(balanceDue || 0).toLocaleString('en-IN');
  return `Hello ${clientName}, gentle reminder regarding pending payment of ₹${formattedBalance} for invoice ${invoiceNumber}. Please process the payment at the earliest.`;
}

/**
 * Parameter interface for generating shoot coordination messages.
 */
export interface ShootCoordinationMessageParams {
  eventName: string;
  eventDate: string;
  clientName?: string;
  location?: string;
}

/**
 * Constructs a standardized shoot schedule confirmation message template.
 */
export function buildShootCoordinationMessage(params: ShootCoordinationMessageParams): string {
  const { eventName, eventDate } = params;
  return `Hello, this is regarding the upcoming shoot for ${eventName} on ${eventDate}. Please confirm the schedule.`;
}

/**
 * Parameter interface for generating promotional marketing messages to guest leads.
 */
export interface GuestLeadPromoMessageParams {
  guestName: string;
  studioName?: string;
  discountPercentage?: number;
}

/**
 * Constructs a high-conversion Click-to-WhatsApp promotional message template for captured guest leads.
 */
export function buildGuestLeadPromoMessage(params: GuestLeadPromoMessageParams): string {
  const { guestName, studioName = 'Pratima Studio', discountPercentage = 10 } = params;
  return `Hello ${guestName}, capture your family's beautiful moments with ${studioName}. Save our number for future bookings and get an exclusive ${discountPercentage}% discount on your next event!`;
}

