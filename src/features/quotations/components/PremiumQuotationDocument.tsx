'use client';

import * as React from 'react';
import { formatMoney } from '@/lib/currency';
import { formatDate } from '@/lib/date';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  CheckCircle2, 
  Clock, 
  Building2, 
  ShieldCheck, 
  CreditCard,
  Camera,
  Sparkles,
  Film,
  Users,
  BookOpen,
  Award,
  Heart,
  FileText
} from 'lucide-react';

export interface PremiumQuotationDocumentProps {
  quotation: any;
  isPublic?: boolean;
  className?: string;
}

/**
 * Extracts embeddable URL for YouTube, Vimeo, or direct MP4/video formats.
 */
function resolveVideoPlayer(url?: string | null): { type: 'iframe' | 'video'; src: string } | null {
  if (!url) return null;
  const clean = url.trim();
  if (!clean) return null;

  // YouTube detection
  const ytMatch = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch) {
    return {
      type: 'iframe',
      src: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0&modestbranding=1&autoplay=0`,
    };
  }

  // Vimeo detection
  const vimeoMatch = clean.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)/);
  if (vimeoMatch) {
    return {
      type: 'iframe',
      src: `https://player.vimeo.com/video/${vimeoMatch[1]}?title=0&byline=0&portrait=0`,
    };
  }

  return { type: 'video', src: clean };
}

/**
 * Safely resolves the human-readable event function name for a line item.
 * Checks direct relations, matching against quotation.functions by ID or Name,
 * and falling back to snapshotExtra reference or explicit function strings.
 */
function resolveItemFunctionName(item: any, functionsList: any[] = []): string | null {
  if (!item) return null;
  if (item.quotationFunction?.name && typeof item.quotationFunction.name === 'string') {
    return item.quotationFunction.name.trim();
  }
  if (item.functionName && typeof item.functionName === 'string') {
    return item.functionName.trim();
  }
  const ref = item.quotationFunctionId || item.snapshotExtra?.functionReference || item.snapshotExtra?.resolvedFunctionId;
  if (!ref || ref === 'none' || typeof ref !== 'string') return null;
  const cleanRef = ref.trim();
  if (!cleanRef) return null;

  // 1. Match by Function ID
  const matchedById = functionsList.find((f: any) => f?.id && String(f.id).trim() === cleanRef);
  if (matchedById?.name && typeof matchedById.name === 'string' && matchedById.name.trim().length > 0) {
    return matchedById.name.trim();
  }

  // 2. Match by Function Name (case-insensitive)
  const matchedByName = functionsList.find((f: any) => f?.name && typeof f.name === 'string' && f.name.trim().toLowerCase() === cleanRef.toLowerCase());
  if (matchedByName?.name && typeof matchedByName.name === 'string' && matchedByName.name.trim().length > 0) {
    return matchedByName.name.trim();
  }

  // 3. Fallback: if ref does not look like an internal CUID/UUID, it is already an event name
  const isIdLike = /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(cleanRef) || /^c[a-z0-9]{20,}$/i.test(cleanRef);
  if (!isIdLike) {
    return cleanRef;
  }

  return null;
}

/**
 * Safely cleans and formats description text.
 * If HTML tags are detected (e.g. from rich text editor), converts block tags to newlines
 * and strips other tags cleanly to avoid raw HTML leaking into the luxury UI.
 */
function cleanDescriptionText(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Check if string contains HTML tags
  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return trimmed
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  return trimmed;
}

export function PremiumQuotationDocument({
  quotation,
  isPublic = false,
  className = '',
}: PremiumQuotationDocumentProps) {
  const data = quotation || {};
  const rev = data.latestRevision;
  const items: any[] = data.items || rev?.items || [];

  // 1. Resolve Customer Information
  const customer = data.lead?.customer || data.client;
  const clientName = customer?.name ||
    [customer?.firstName, customer?.lastName].filter(Boolean).join(' ').trim() ||
    data.customerName ||
    data.clientName ||
    data.lead?.customerName ||
    'Valued Client';
  const clientPhone = customer?.phone || data.customerPhone || data.lead?.customerPhone || '';
  const clientEmail = customer?.email || data.customerEmail || data.lead?.customerEmail || '';
  const clientAddress = [customer?.city?.name, customer?.state?.name].filter(Boolean).join(', ');

  // 2. Resolve Studio / Tenant Information
  const tenant = data.tenant || data.lead?.tenant;
  const branch = data.branch || data.lead?.branch;
  const settings = tenant?.settings || {};

  const studioName = settings?.studioName || tenant?.tradeName || tenant?.name || 'Photography Studio';
  const studioAddress = settings?.address || tenant?.address || branch?.address || 'Near Old Water Tank, Tardal Road, Khotwadi, Dist. Kolhapur, Maharashtra, India';
  const studioPhone = settings?.phone || tenant?.phone || branch?.phone || '+91 80872 26509';
  const studioEmail = settings?.email || tenant?.email || branch?.email || 'suhaswagire.photo@gmail.com';
  const studioWebsite = settings?.website || tenant?.website || 'https://pratima-erp.vercel.app';
  const gstNumber = settings?.gstNumber || tenant?.gstNumber || branch?.gstNumber;
  const logoUrl = settings?.logoUrl || tenant?.logoUrl || branch?.logoUrl;

  // 3. Resolve Event Details & Subjects
  const inquiry = data.lead?.inquiry;
  const eventType = data.eventType || inquiry?.eventType || data.lead?.eventType || 'Photography Services';
  const eventTitle = data.title || (eventType ? `${eventType} Photography Package` : 'Commercial Photography Proposal');
  const eventDate = inquiry?.eventDate || data.eventDate || data.lead?.expectedBookingDate;

  const quoteNumber = data.quotationNumber || data.quoteNumber || (data.lead?.leadCode ? `${data.lead.leadCode}-R${rev?.revisionNumber || 1}` : `QT-${data.id?.slice(0, 8) || 'DRAFT'}`);
  const status = (data.status || rev?.status || 'DRAFT').toUpperCase();

  // 4. Resolve Subjects (Bride, Groom, VIPs)
  const subjects: any[] = Array.isArray(data.subjects) ? data.subjects.filter((s: any) => s && s.name) : [];
  const coupleGreeting = subjects.length >= 2 
    ? `${subjects[0].name} & ${subjects[1].name}`
    : subjects.length === 1 
    ? subjects[0].name 
    : clientName;

  // 5. Resolve Functions / Itinerary
  const functions: any[] = Array.isArray(data.functions) ? data.functions.filter((f: any) => f && f.name) : [];

  // 6. Resolve Deliverables
  const deliverables: any[] = Array.isArray(data.deliverables) ? data.deliverables.filter((d: any) => d && d.name) : [];

  // 7. Pricing Mode & Financials
  const pricingMode = data.pricingMode || (rev as any)?.pricingMode || 'ITEMIZED';
  const isLumpSum = pricingMode === 'LUMP_SUM';
  const rawLumpSum = data.lumpSumAmount != null ? Number(data.lumpSumAmount) : (rev as any)?.lumpSumAmount != null ? Number((rev as any).lumpSumAmount) : null;

  const subtotal = Number(data.subtotal || data.subTotal || rev?.subtotal || 0);
  const totalDiscount = Number(data.totalDiscount || data.discountAmount || rev?.discountAmount || 0);
  const totalTax = Number(data.totalTax || data.taxAmount || rev?.taxAmount || 0);
  const grandTotal = Number(data.grandTotal || data.totalAmount || rev?.totalAmount || rawLumpSum || 0);
  const finalDisplayAmount = (isLumpSum && rawLumpSum != null) ? rawLumpSum : grandTotal;
  const advanceRequired = data.advanceRequired ? Number(data.advanceRequired) : Math.round(finalDisplayAmount * 0.5);

  // 8. Showcase: Portfolio, Promo Video, Why Choose Us
  const portfolioUrls: string[] = Array.isArray(data.portfolioUrls) && data.portfolioUrls.length > 0
    ? data.portfolioUrls
    : (Array.isArray(tenant?.defaultPortfolioUrls) ? tenant.defaultPortfolioUrls : []);

  const promoVideoUrl: string | null = data.promoVideoUrl || tenant?.defaultPromoVideoUrl || null;
  const videoPlayer = resolveVideoPlayer(promoVideoUrl);

  const defaultTenets = [
    'Cinematic Master Craft: Filmed on Sony FX3 & A7IV cinema cameras with prime G-Master optics.',
    'Fine-Art Retouching: Color-calibrated laboratory printing with lifetime archival binding.',
    'Express Highlight Reel: 48-hour social teaser delivered to relive the magic instantly.',
    'Unobtrusive Documentary: Candid storytelling that preserves genuine emotions without interrupting your moments.',
  ];

  const whyChooseUs: string[] = Array.isArray(data.whyChooseUs) && data.whyChooseUs.length > 0
    ? data.whyChooseUs
    : (Array.isArray(tenant?.whyChooseUs) && tenant.whyChooseUs.length > 0 ? tenant.whyChooseUs : defaultTenets);

  // 9. Banking & Terms
  const rawBank = tenant?.bankDetails || settings?.bankDetails;
  let bankName = '';
  let accountHolderName = '';
  let accountNumber = '';
  let ifscCode = '';
  let upiId = '';
  let branchName = '';
  let accountType = '';

  if (typeof rawBank === 'object' && rawBank !== null) {
    bankName = rawBank.bankName || '';
    accountHolderName = rawBank.accountHolderName || rawBank.acName || studioName;
    accountNumber = rawBank.accountNumber || rawBank.bankAccountNumber || '';
    ifscCode = rawBank.ifscCode || rawBank.ifsc || '';
    upiId = rawBank.upiId || settings?.upiId || '';
    branchName = rawBank.branchName || branch?.name || '';
    accountType = rawBank.accountType || '';
  } else if (typeof rawBank === 'string' && rawBank.trim().length > 0) {
    upiId = settings?.upiId || '';
  } else {
    upiId = settings?.upiId || '';
  }

  const hasBankingDetails = Boolean(
    (typeof rawBank === 'object' && rawBank !== null && (accountNumber || bankName || upiId || ifscCode)) ||
    (typeof rawBank === 'string' && rawBank.trim().length > 0) ||
    Boolean(upiId)
  );

  const bankDetails = typeof rawBank === 'string' && rawBank.trim().length > 0
    ? rawBank.trim()
    : [
        bankName ? `Bank Name: ${bankName}` : null,
        accountHolderName ? `A/C Name: ${accountHolderName}` : null,
        accountNumber ? `A/C Number: ${accountNumber}` : null,
        ifscCode ? `IFSC Code: ${ifscCode}` : null,
        branchName ? `Branch: ${branchName}` : null,
        accountType ? `A/C Type: ${accountType}` : null,
      ].filter(Boolean).join('\n');

  const terms = data.terms || data.termsAndConditions || quotation?.terms || quotation?.termsAndConditions || quotation?.acceptanceTerms || settings?.quotationTerms || [
    '1. 50% advance booking deposit is required to confirm dates and secure the photography team.',
    '2. Remaining 50% balance must be settled on or prior to the final event shoot day.',
    '3. High-resolution color-graded preview gallery is delivered within 10-14 working days.',
    '4. Complete deliverables, albums, and cinematic films are finalized within 4-6 weeks after selection.',
    '5. In the event of unforeseen rescheduling, dates are subject to team availability.'
  ].join('\n');

  // 10. Special Notes (Client Communication)
  const specialNotes = (
    typeof quotation?.notes === 'string' && quotation.notes.trim().length > 0
      ? quotation.notes.trim()
      : typeof data?.notes === 'string' && data.notes.trim().length > 0
      ? data.notes.trim()
      : typeof rev?.notes === 'string' && rev.notes.trim().length > 0
      ? rev.notes.trim()
      : typeof rev?.revisionComment === 'string' && rev.revisionComment.trim().length > 0 && rev.revisionComment.trim() !== 'Initial creation'
      ? rev.revisionComment.trim()
      : ''
  );

  // Status Styling Badge
  const getStatusBadge = () => {
    switch (status) {
      case 'ACCEPTED':
      case 'APPROVED':
      case 'WON':
        return (
          <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs px-3 py-1 gap-1.5 shadow-2xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Confirmed & Reserved
          </Badge>
        );
      case 'SENT':
      case 'VIEWED':
        return (
          <Badge className="bg-indigo-600 text-white hover:bg-indigo-700 text-xs px-3 py-1 gap-1.5 shadow-2xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Official Proposal
          </Badge>
        );
      case 'REJECTED':
      case 'REVISION_REQUESTED':
        return (
          <Badge className="bg-rose-600 text-white hover:bg-rose-700 text-xs px-3 py-1 gap-1.5 shadow-2xs font-semibold">
            <Clock className="w-3.5 h-3.5" />
            Revision Pending
          </Badge>
        );
      case 'EXPIRED':
        return (
          <Badge className="bg-slate-400 text-white text-xs px-3 py-1 gap-1.5 shadow-2xs font-semibold">
            <Clock className="w-3.5 h-3.5" />
            Offer Expired
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-slate-700 border-slate-300 text-xs px-3 py-1 gap-1.5 font-semibold">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            Proposal Preview
          </Badge>
        );
    }
  };

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Luxury Document Wrapper */}
      <div 
        className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-10 md:p-14 text-slate-900 transition-all print:border-none print:shadow-none print:p-0 print:m-0"
        style={{ colorScheme: 'light' }}
      >
        {/* Top Header & Studio Identity */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 pb-8 border-b border-slate-200/80">
          {/* Studio Brand */}
          <div className="space-y-2.5 max-w-md">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={logoUrl} 
                alt={studioName} 
                className="h-14 md:h-16 w-auto object-contain mb-1" 
              />
            ) : (
              <div className="flex items-center gap-3 mb-1">
                <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-sm tracking-wider">
                  {studioName.charAt(0)}
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase font-sans leading-none">
                    {studioName}
                  </h1>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-indigo-700 mt-1">
                    Fine Art & Cinema Studio
                  </p>
                </div>
              </div>
            )}
            <p className="text-xs text-slate-600 leading-relaxed">{studioAddress}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 pt-1">
              {studioPhone && (
                <span className="flex items-center gap-1 font-medium">
                  <Phone className="w-3 h-3 text-slate-400" /> {studioPhone}
                </span>
              )}
              {studioEmail && (
                <span className="flex items-center gap-1 font-medium">
                  <Mail className="w-3 h-3 text-slate-400" /> {studioEmail}
                </span>
              )}
              {studioWebsite && (
                <span className="flex items-center gap-1 font-medium">
                  <Globe className="w-3 h-3 text-slate-400" /> {studioWebsite}
                </span>
              )}
              {gstNumber && (
                <span className="flex items-center gap-1 font-mono font-medium text-slate-700">
                  <Building2 className="w-3 h-3 text-slate-400" /> GSTIN: {gstNumber}
                </span>
              )}
            </div>
          </div>

          {/* Quotation Metadata Card */}
          <div className="w-full md:w-auto md:text-right flex flex-col md:items-end">
            <div className="mb-2">
              {getStatusBadge()}
            </div>
            <div className="text-2xl md:text-3xl font-black font-mono tracking-tight text-slate-900">
              {quoteNumber}
            </div>
            <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs space-y-1.5 w-full md:min-w-[260px]">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500 font-medium">Date of Issue:</span>
                <span className="text-slate-900 font-semibold" suppressHydrationWarning>{formatDate(data.createdAt, 'dd MMM yyyy')}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500 font-medium">Valid Until:</span>
                <span className="text-slate-900 font-semibold" suppressHydrationWarning>{formatDate(data.validUntil, 'dd MMM yyyy')}</span>
              </div>
              {eventDate && (
                <div className="flex justify-between gap-4 pt-1 border-t border-slate-200">
                  <span className="text-indigo-950 font-bold">Event Date:</span>
                  <span className="text-indigo-950 font-bold font-mono" suppressHydrationWarning>{formatDate(eventDate, 'dd MMM yyyy')}</span>
                </div>
              )}
              <div className="flex justify-between gap-4 pt-1 border-t border-slate-200 text-[11px]">
                <span className="text-slate-500 font-medium">Pricing Mode:</span>
                <span className="text-indigo-900 font-bold uppercase tracking-wider">
                  {isLumpSum ? 'All-Inclusive Collection' : 'Itemized'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Welcome Card: Subject Greeting & Event Scope */}
        <div className="my-8 p-6 md:p-8 bg-linear-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl shadow-sm relative overflow-hidden print:bg-slate-900">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/15 text-[11px] font-semibold text-indigo-200 uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Bespoke Photography Proposal
            </div>
            
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white leading-tight font-sans">
              Crafted for {coupleGreeting}
            </h2>

            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              We are honored by the opportunity to document your celebration. Every film, portrait, and album is curated with timeless storytelling and cinematic artistry.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
              <span className="px-3 py-1 rounded-lg bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 font-semibold flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-indigo-300" />
                {eventType}
              </span>
              {eventDate && (
                <span className="px-3 py-1 rounded-lg bg-white/10 border border-white/15 text-slate-200 font-medium flex items-center gap-1.5" suppressHydrationWarning>
                  <Calendar className="w-3.5 h-3.5 text-slate-300" />
                  {formatDate(eventDate, 'dd MMMM yyyy')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Subjects & Key People (If Defined) */}
        {subjects.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-indigo-700" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Celebrated Subjects & Key Contacts
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {subjects.map((sub: any, idx: number) => (
                <div key={sub.id || idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/60 flex items-center justify-center font-bold text-xs shrink-0">
                    {sub.role === 'Bride' ? <Heart className="w-4 h-4 text-rose-500 fill-rose-500" /> : sub.role.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-indigo-900 bg-indigo-100/60 px-1.5 py-0.5 rounded">
                      {sub.role}
                    </span>
                    <p className="font-bold text-sm text-slate-900 truncate mt-0.5">{sub.name}</p>
                    {sub.phone && <p className="text-[11px] text-slate-500 truncate">{sub.phone}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Studio Showcase: Cinema Showreel Video & Portfolio (The "Mind Game") */}
        {(videoPlayer || portfolioUrls.length > 0) && (
          <div className="my-10 space-y-6 pt-2 border-t border-slate-200/80">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700 block">
                  Studio Craft & Signature Vision
                </span>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  Visual Excellence Showreel
                </h3>
              </div>
              <p className="text-xs text-slate-500 max-w-sm">
                A glimpse into our visual language, lighting philosophy, and genuine emotional candids.
              </p>
            </div>

            {/* Embedded Promo Video */}
            {videoPlayer && (
              <div className="overflow-hidden rounded-2xl bg-slate-950 border border-slate-800 shadow-md">
                {videoPlayer.type === 'iframe' ? (
                  <div className="relative w-full aspect-video">
                    <iframe
                      src={videoPlayer.src}
                      title="Studio Cinema Showreel"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full border-0"
                    />
                  </div>
                ) : (
                  <video 
                    src={videoPlayer.src}
                    controls 
                    playsInline 
                    preload="metadata"
                    className="w-full aspect-video object-cover"
                  />
                )}
              </div>
            )}

            {/* Curated Portfolio Grid */}
            {portfolioUrls.length > 0 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {portfolioUrls.slice(0, 6).map((imgUrl, i) => (
                    <div 
                      key={i} 
                      className="group relative aspect-4/3 overflow-hidden rounded-2xl bg-slate-100 border border-slate-200/80 shadow-2xs"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imgUrl}
                        alt={`Portfolio sample ${i + 1}`}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Why Choose Us ("The Mind Game" / Brand Tenets) */}
        {whyChooseUs.length > 0 && (
          <div className="my-8 p-6 bg-slate-50/90 rounded-2xl border border-slate-200/80">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                The {studioName} Commitment & Craft Tenets
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {whyChooseUs.map((tenet, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span>{tenet}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Event Itinerary / Functions Schedule */}
        {functions.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-indigo-700" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Event Functions & Shooting Itinerary
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {functions.map((fn: any, idx: number) => (
                <div key={fn.id || idx} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                    Phase {idx + 1}
                  </span>
                  <h4 className="font-bold text-sm text-slate-900">{fn.name}</h4>
                  {fn.date && (
                    <p className="text-xs text-indigo-900 font-medium flex items-center gap-1.5" suppressHydrationWarning>
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      {formatDate(fn.date, 'dd MMM yyyy')}
                    </p>
                  )}
                  {fn.venue && (
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {fn.venue}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deliverables & Deliverable Specifications */}
        {deliverables.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-indigo-700" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Deliverables & Fine-Art Album Specifications
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {deliverables.map((del: any, idx: number) => (
                <div key={del.id || idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 bg-indigo-100/70 px-2 py-0.5 rounded">
                      {del.itemType}
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      Qty: {del.quantity || 1}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">{del.name}</h4>
                  {del.basePageLimit && (
                    <p className="text-xs text-slate-600 font-medium">
                      Includes {del.basePageLimit} base pages (Retouched & Color Graded)
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Line Items & Scope of Services (Lump Sum vs Itemized) */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Detailed Scope of Services
            </h3>
            {isLumpSum && (
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                Bespoke Collection • Comprehensive value inclusive of all premium services
              </span>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-2xs">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr 
                  className="bg-slate-900 text-white font-bold text-xs uppercase tracking-wider"
                  style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                >
                  <th className="py-3.5 px-3 w-[6%] text-center">#</th>
                  <th className={`py-3.5 px-4 ${isLumpSum ? 'w-[74%]' : 'w-[44%]'}`}>Service Description & Scope</th>
                  <th className="py-3.5 px-3 w-[10%] text-center">Qty</th>
                  {!isLumpSum && (
                    <>
                      <th className="py-3.5 px-4 w-[20%] text-right">Unit Rate</th>
                      <th className="py-3.5 px-4 w-[20%] text-right">Total (INR)</th>
                    </>
                  )}
                  {isLumpSum && (
                    <th className="py-3.5 px-4 w-[20%] text-center">Status</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.length > 0 ? (
                  items.map((item: any, idx: number) => {
                    const qty = Math.max(1, Number(item.quantity) || 1);
                    const unitPrice = Number(item.unitPrice) || 0;
                    const itemTotal = Number(item.calculatedTotal || item.totalPrice || (qty * unitPrice));
                    const taxPercent = item.taxPercentage ? Number(item.taxPercentage) : null;
                    const functionName = resolveItemFunctionName(item, functions);
                    const rawDescription = 
                      item.description || 
                      item.snapshotExtra?.customDescription || 
                      item.snapshotExtra?.description || 
                      item.package?.description || 
                      item.package?.notes || 
                      item.packageDetails || 
                      item.snapshotExtra?.packageDetails;
                    const itemDescription = cleanDescriptionText(rawDescription);

                    return (
                      <tr 
                        key={item.id || idx} 
                        className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}
                        style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                      >
                        <td className="py-4 px-3 text-center text-xs text-slate-400 font-mono align-top">
                          {idx + 1}
                        </td>
                        <td className="py-4 px-4 align-top">
                          <div className="font-semibold text-slate-800">
                            {item.itemName || item.name || 'Photography Service'}
                          </div>
                          {functionName && (
                            <div className="text-xs text-amber-600 mt-1 font-medium flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>{functionName}</span>
                            </div>
                          )}
                          {itemDescription && (
                            <div className="text-sm text-slate-500 mt-1.5 leading-relaxed whitespace-pre-line">
                              {itemDescription}
                            </div>
                          )}
                          {!isLumpSum && taxPercent !== null && taxPercent > 0 && (
                            <div className="text-[11px] text-slate-400 mt-1 font-mono">
                              GST Applicable: {taxPercent}%
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-3 text-center text-xs font-semibold text-slate-700 align-top">
                          {qty}
                        </td>
                        {!isLumpSum && (
                          <>
                            <td className="py-4 px-4 text-right text-xs font-mono text-slate-700 align-top">
                              {formatMoney(unitPrice, 'INR')}
                            </td>
                            <td className="py-4 px-4 text-right text-sm font-bold font-mono text-slate-900 align-top">
                              {formatMoney(itemTotal, 'INR')}
                            </td>
                          </>
                        )}
                        {isLumpSum && (
                          <td className="py-4 px-4 text-center align-top">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-full text-[11px] font-bold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Premium Inclusion
                            </span>
                          </td>
                        )}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={isLumpSum ? 4 : 5} className="py-8 text-center text-slate-500 text-sm italic">
                      All inclusive comprehensive event photography package as detailed above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Totals & Banking Details */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-8">
          {/* Left Column: Direct Wire & UPI Details */}
          <div className="md:col-span-6 space-y-4">
            {hasBankingDetails ? (
              <div 
                className="bg-slate-50/90 border border-slate-200 p-4 rounded-2xl text-xs space-y-2"
                style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
              >
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider pb-1 border-b border-slate-200">
                  <CreditCard className="w-4 h-4 text-indigo-900" />
                  <span>Direct Bank Wire Details</span>
                </div>
                {bankDetails && (
                  <div className="text-slate-700 font-mono whitespace-pre-line text-xs leading-relaxed">
                    {bankDetails}
                  </div>
                )}
                {upiId && (
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-700">UPI ID:</span>
                    <span 
                      className="font-mono font-bold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded text-xs"
                      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                    >
                      {upiId}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div 
                className="bg-slate-50/90 border border-slate-200 p-4 rounded-2xl text-xs space-y-2"
                style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
              >
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider pb-1 border-b border-slate-200">
                  <CreditCard className="w-4 h-4 text-indigo-900" />
                  <span>Payment Instructions</span>
                </div>
                <p className="text-slate-600 text-xs italic">
                  Payment instructions and banking details will be shared directly by the studio team.
                </p>
              </div>
            )}

            {advanceRequired > 0 && (
              <div 
                className="bg-amber-50/80 border border-amber-200 p-4 rounded-2xl text-amber-950 text-xs flex items-center justify-between"
                style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
              >
                <div>
                  <p className="font-bold uppercase tracking-wider text-[10px] text-amber-800">Booking Advance Required</p>
                  <p className="text-xs text-amber-900">Required to block dates & schedule the crew</p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-base md:text-lg font-black text-amber-950">
                    {formatMoney(advanceRequired, 'INR')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Pricing Summary Card */}
          <div className="md:col-span-6 flex flex-col justify-start">
            <div className="space-y-2 text-xs">
              {!isLumpSum ? (
                <>
                  <div className="flex justify-between py-1.5 text-slate-600 border-b border-slate-100">
                    <span className="font-medium">Subtotal Amount:</span>
                    <span className="font-semibold font-mono text-slate-800">{formatMoney(subtotal, 'INR')}</span>
                  </div>

                  {totalDiscount > 0 && (
                    <div className="flex justify-between py-1.5 text-emerald-700 border-b border-slate-100">
                      <span className="font-medium">Special Discount:</span>
                      <span className="font-semibold font-mono">-{formatMoney(totalDiscount, 'INR')}</span>
                    </div>
                  )}

                  {totalTax > 0 && (
                    <div className="flex justify-between py-1.5 text-slate-600 border-b border-slate-100">
                      <span className="font-medium">Applicable Taxes / GST:</span>
                      <span className="font-semibold font-mono text-slate-800">+{formatMoney(totalTax, 'INR')}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 mb-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Package Scope</span>
                  <p className="text-xs text-slate-700">
                    Complete bundled package including crew, multi-day coverage, fine art retouched deliverables, and aerial recording.
                  </p>
                </div>
              )}

              {/* Grand Total Box */}
              <div 
                className="flex justify-between items-center p-4 bg-slate-900 text-white rounded-2xl mt-2 shadow-sm"
                style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
              >
                <div>
                  <span className="text-xs uppercase font-extrabold tracking-wider block text-slate-300">
                    {isLumpSum ? 'All-Inclusive Collection' : 'Grand Total'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">All inclusive net investment</span>
                </div>
                <div className="font-mono text-xl md:text-2xl font-black text-white">
                  {formatMoney(finalDisplayAmount, 'INR')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Special Studio Notes (Client Communication) */}
        {specialNotes ? (
          <div className="border-t border-slate-200 pt-6 mb-8">
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl shadow-2xs relative">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <h4 className="font-serif text-base font-bold text-slate-900 tracking-tight">
                  A Personal Note for You
                </h4>
              </div>
              <div className="text-slate-700 text-xs sm:text-sm whitespace-pre-line leading-relaxed font-sans">
                {specialNotes}
              </div>
            </div>
          </div>
        ) : null}

        {/* Terms & Conditions Section */}
        <div className="border-t border-slate-200 pt-6 mb-8 text-xs">
          <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs mb-2.5 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-slate-600" />
            Terms & Studio Policies
          </h4>
          <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl text-slate-600 whitespace-pre-line leading-relaxed text-[11px]">
            {terms}
          </div>
        </div>

        {/* Signatures & Approval Section */}
        <div className="grid grid-cols-2 gap-8 border-t border-slate-200 pt-8 mt-6">
          <div className="space-y-6">
            <div className="border-b border-slate-300 pb-1 w-48"></div>
            <div>
              <p className="font-bold text-slate-900 text-xs">Authorized Signatory</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">{studioName}</p>
            </div>
          </div>

          <div className="space-y-3 text-right flex flex-col items-end justify-end">
            {data.clientSignature ? (
              <div className="flex flex-col items-end">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.clientSignature}
                  alt="Client Digital Signature"
                  className="h-14 max-w-[180px] object-contain border-b border-emerald-500 pb-1"
                />
                <div className="mt-1">
                  <p className="font-bold text-emerald-800 text-xs flex items-center justify-end gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
                    Digitally Accepted
                  </p>
                  <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider">{clientName}</p>
                  {data.acceptedAt && (
                    <p className="text-[9px] text-slate-500" suppressHydrationWarning>
                      {formatDate(data.acceptedAt, 'dd MMM yyyy, hh:mm a')}
                    </p>
                  )}
                  {data.clientIpAddress && (
                    <p className="text-[8px] text-slate-400 font-mono">
                      IP: {data.clientIpAddress}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="border-b border-slate-300 pb-1 w-48"></div>
                <div>
                  <p className="font-bold text-slate-900 text-xs">Client Acceptance</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">{clientName}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 mt-10 pt-4 text-center text-[10px] text-slate-400">
          <p suppressHydrationWarning>
            Thank you for choosing {studioName}. This is an official digital proposal valid until {formatDate(data.validUntil, 'dd MMM yyyy')}.
          </p>
        </div>
      </div>
    </div>
  );
}
