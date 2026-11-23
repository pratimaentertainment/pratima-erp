'use client';

import * as React from 'react';
import { MessageSquareShare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/currency';

interface WhatsAppShareButtonProps {
  quotation: {
    id: string;
    quoteNumber?: string;
    quotationNumber?: string;
    grandTotal?: number | string | null;
    totalAmount?: number | string | null;
    clientName?: string;
    clientPhone?: string;
    validUntil?: string | Date | null;
    tenant?: {
      name?: string;
      settings?: {
        studioName?: string | null;
        phone?: string | null;
        whatsappTemplates?: any;
      } | null;
    } | null;
  };
  phone?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function WhatsAppShareButton({
  quotation,
  phone,
  variant = 'outline',
  size = 'default',
  className
}: WhatsAppShareButtonProps) {
  const handleShare = () => {
    const rawPhone = phone || quotation.clientPhone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    
    // Auto-prefix Indian country code if 10 digits
    const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const quoteNumber = quotation.quotationNumber || quotation.quoteNumber || 'N/A';
    const amount = formatMoney(Number(quotation.grandTotal || quotation.totalAmount || 0));
    const clientName = quotation.clientName || 'Valued Client';
    const studioName = quotation.tenant?.settings?.studioName || quotation.tenant?.name || 'our studio';
    
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const quoteLink = `${baseUrl}/quote/${quotation.id}`;

    // Extract template if configured in TenantSettings
    const templates = quotation.tenant?.settings?.whatsappTemplates;
    let templateString: string | null = null;
    
    if (templates) {
      if (typeof templates === 'string') {
        try {
          const parsed = JSON.parse(templates);
          templateString = parsed.quotation || parsed.quote || null;
        } catch {
          templateString = templates;
        }
      } else if (typeof templates === 'object' && templates !== null) {
        templateString = (templates as any).quotation || (templates as any).quote || null;
      }
    }

    let message = templateString;
    if (!message) {
      message = `Hello {{clientName}},\n\nThank you for reaching out to *{{studioName}}*! Here is your official photography quotation:\n\n📄 *Quote #:* {{quoteNumber}}\n💰 *Total Amount:* {{amount}}\n🔗 *View Quotation:* {{link}}\n\nPlease review and let us know if you would like to proceed.\n\nWarm regards,\n*{{studioName}}*`;
    }

    // Replace template variables
    const finalMessage = message
      .replace(/{{clientName}}/g, clientName)
      .replace(/{{quoteNumber}}/g, quoteNumber)
      .replace(/{{amount}}/g, amount)
      .replace(/{{link}}/g, quoteLink)
      .replace(/{{studioName}}/g, studioName);

    const encodedMessage = encodeURIComponent(finalMessage);
    const waUrl = targetPhone 
      ? `https://wa.me/${targetPhone}?text=${encodedMessage}`
      : `https://wa.me/?text=${encodedMessage}`;

    window.open(waUrl, '_blank');
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleShare}
      className={className || "gap-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"}
    >
      <MessageSquareShare className="h-4 w-4" />
      <span>Share via WhatsApp</span>
    </Button>
  );
}
