'use client';

import React, { useState, useRef } from 'react';
import QRCode from 'react-qr-code';
import {
  QrCode,
  Copy,
  ExternalLink,
  Download,
  Printer,
  Globe,
  Sparkles,
  Camera,
  Check,
} from 'lucide-react';
import { useAppContext } from '@/providers/app-context';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export function StorefrontQrModal() {
  const { currentTenant } = useAppContext();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const tenantSlug = currentTenant?.slug;
  const studioName = currentTenant?.name || 'Studio Storefront';

  // Construct origin-relative URL
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const storefrontUrl = tenantSlug ? `${origin}/${tenantSlug}` : '';

  const handleCopy = async () => {
    if (!storefrontUrl) return;
    try {
      await navigator.clipboard.writeText(storefrontUrl);
      setCopied(true);
      toast.success('Storefront link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Failed to copy link to clipboard');
    }
  };

  const handleDownloadSvg = () => {
    const svgElement = printRef.current?.querySelector('svg');
    if (!svgElement) {
      toast.error('QR code not found for download');
      return;
    }

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `${tenantSlug || 'studio'}_storefront_qr.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);

    toast.success('Vector QR Code downloaded for high-resolution print.');
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (!tenantSlug) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-foreground bg-muted/40 hover:bg-muted/70 px-2.5 py-1.5 rounded-md border border-border/60 transition-colors cursor-pointer font-medium"
        title="Studio Public Storefront & Reception QR Code"
      >
        <QrCode className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="hidden sm:inline">Storefront QR</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="text-center sm:text-left space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-1.5">
                  <span>Studio Storefront & Desk QR</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Share with visiting clients or display on your reception desk.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Printable Standee Card */}
          <div
            ref={printRef}
            className="p-5 rounded-2xl bg-gradient-to-b from-card to-muted/30 border border-border/80 shadow-xs flex flex-col items-center text-center space-y-4 my-1 print:border-none print:shadow-none"
          >
            {/* Studio Branding */}
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
                <Camera className="w-3 h-3" />
                <span>Client Portal & Booking</span>
              </div>
              <h3 className="text-base font-extrabold text-foreground tracking-tight">
                {studioName}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Scan to book inquiries or access your customer dashboard
              </p>
            </div>

            {/* QR Code Container */}
            <div className="p-3.5 bg-white rounded-xl shadow-xs border border-border/40 inline-flex items-center justify-center">
              <QRCode
                value={storefrontUrl}
                size={180}
                level="H"
                style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                viewBox={`0 0 256 256`}
              />
            </div>

            {/* URL String */}
            <div className="text-center space-y-0.5">
              <div className="font-mono text-[11px] font-semibold text-foreground/80 break-all px-2 py-1 rounded bg-muted/50 border border-border/40">
                {storefrontUrl}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Point any smartphone camera to open instantly
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="space-y-2 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleCopy}
                className="h-9 text-xs gap-1.5 font-semibold"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied Link!' : 'Copy Link'}</span>
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => window.open(storefrontUrl, '_blank', 'noopener,noreferrer')}
                className="h-9 text-xs gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Visit Storefront</span>
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadSvg}
                className="h-9 text-xs gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Vector SVG</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="h-9 text-xs gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Standee</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
