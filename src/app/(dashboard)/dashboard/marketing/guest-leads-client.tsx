'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Search,
  Users,
  Sparkles,
  Calendar,
  MessageSquare,
  Copy,
  Check,
  QrCode,
  Filter,
  Clock,
  ArrowUpDown,
  ImageIcon,
  Send,
  Eye,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { WhatsAppButton } from '@/components/ui/whatsapp-button';
import { buildGuestLeadPromoMessage } from '@/utils/whatsapp.utils';
import type { MarketingGuestLeadItem } from '@/actions/marketing.actions';

interface GuestLeadsClientProps {
  initialLeads: MarketingGuestLeadItem[];
  studioName: string;
  tenantSlug?: string;
  universalQrCode?: string;
}

export function GuestLeadsClient({
  initialLeads,
  studioName,
  tenantSlug,
  universalQrCode,
}: GuestLeadsClientProps) {
  const [leads, setLeads] = React.useState<MarketingGuestLeadItem[]>(initialLeads);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | 'MATCHED' | 'PENDING'>('ALL');
  const [eventFilter, setEventFilter] = React.useState<string>('ALL');
  const [sortBy, setSortBy] = React.useState<'NEWEST' | 'OLDEST' | 'NAME_ASC'>('NEWEST');
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // Lightbox selfie preview state
  const [previewLead, setPreviewLead] = React.useState<MarketingGuestLeadItem | null>(null);

  // Custom promotional message dialog state
  const [promoLead, setPromoLead] = React.useState<MarketingGuestLeadItem | null>(null);
  const [customDiscount, setCustomDiscount] = React.useState<number>(10);
  const [customMessage, setCustomMessage] = React.useState<string>('');

  // Extract distinct event titles for filter dropdown
  const uniqueEvents = React.useMemo(() => {
    const map = new Map<string, string>();
    leads.forEach((l) => {
      if (l.booking?.id && l.booking?.title) {
        map.set(l.booking.id, l.booking.title);
      }
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [leads]);

  // Executive KPI summary calculations
  const kpis = React.useMemo(() => {
    const total = leads.length;
    const matched = leads.filter((l) => l.isMatched).length;
    const pending = total - matched;
    const eventsCovered = new Set(leads.map((l) => l.bookingId).filter(Boolean)).size;
    const totalPhotosDelivered = leads.reduce((acc, curr) => acc + (curr.matchedPhotosCount || 0), 0);
    return { total, matched, pending, eventsCovered, totalPhotosDelivered };
  }, [leads]);

  // Filtered and sorted leads list
  const filteredLeads = React.useMemo(() => {
    let result = [...leads];

    // Search query across name, phone, and event title
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (l) =>
          l.guestName.toLowerCase().includes(q) ||
          l.whatsappNumber.includes(q) ||
          (l.booking?.title && l.booking.title.toLowerCase().includes(q)) ||
          (l.booking?.bookingNumber && l.booking.bookingNumber.toLowerCase().includes(q))
      );
    }

    // Match status filter
    if (statusFilter === 'MATCHED') {
      result = result.filter((l) => l.isMatched);
    } else if (statusFilter === 'PENDING') {
      result = result.filter((l) => !l.isMatched);
    }

    // Event filter
    if (eventFilter !== 'ALL') {
      result = result.filter((l) => l.bookingId === eventFilter);
    }

    // Sort order
    result.sort((a, b) => {
      if (sortBy === 'NEWEST') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'OLDEST') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'NAME_ASC') {
        return a.guestName.localeCompare(b.guestName);
      }
      return 0;
    });

    return result;
  }, [leads, searchQuery, statusFilter, eventFilter, sortBy]);

  const handleCopyPhone = (leadId: string, phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedId(leadId);
    toast.success(`Copied +${phone} to clipboard`);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const handleOpenPromoModal = (lead: MarketingGuestLeadItem) => {
    setPromoLead(lead);
    setCustomDiscount(10);
    setCustomMessage(
      buildGuestLeadPromoMessage({
        guestName: lead.guestName,
        studioName,
        discountPercentage: 10,
      })
    );
  };

  const handleDiscountChange = (newDiscount: number) => {
    setCustomDiscount(newDiscount);
    if (promoLead) {
      setCustomMessage(
        buildGuestLeadPromoMessage({
          guestName: promoLead.guestName,
          studioName,
          discountPercentage: newDiscount,
        })
      );
    }
  };

  const universalQrUrl = React.useMemo(() => {
    if (typeof window === 'undefined') return '';
    const identifier = universalQrCode || tenantSlug || '';
    return `${window.location.origin}/guest/${identifier}`;
  }, [tenantSlug, universalQrCode]);

  const handleCopyQrLink = () => {
    if (!universalQrUrl) return;
    navigator.clipboard.writeText(universalQrUrl);
    toast.success('Universal Studio QR Link copied to clipboard');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-heading">
              AI Leads &amp; Marketing Hub
            </h1>
            <Badge variant="outline" className="text-primary border-primary/30 text-xs">
              Phase 11 CRM
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Review guest leads captured via Universal Studio QR, track AI face matching status, and dispatch
            Click-to-WhatsApp promotional campaigns with zero Meta API costs.
          </p>
        </div>

        {universalQrUrl && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyQrLink}
              className="gap-1.5 shrink-0"
              title="Copy public QR link to test or generate acrylic standees"
            >
              <QrCode className="h-4 w-4 text-primary" />
              <span>Copy Guest QR Link</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => window.open(universalQrUrl, '_blank', 'noopener,noreferrer')}
              className="gap-1.5 shrink-0"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Open Public Portal</span>
            </Button>
          </div>
        )}
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Guest Leads
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">{kpis.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Captured across {kpis.eventsCovered} event{kpis.eventsCovered === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              AI Face Matched
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading text-emerald-600 dark:text-emerald-400">
              {kpis.matched}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpis.total > 0 ? Math.round((kpis.matched / kpis.total) * 100) : 0}% recognition rate
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending AI Matching
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading text-amber-600 dark:text-amber-400">
              {kpis.pending}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting gallery upload / Rekognition
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              WhatsApp Reachable
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <MessageSquare className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">
              {leads.filter((l) => l.whatsappNumber).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              100% verified Indian mobile numbers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-card p-4 rounded-xl border border-border/60 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by guest name, phone, or event..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={(val) => setStatusFilter((val as 'ALL' | 'MATCHED' | 'PENDING') || 'ALL')}
          >
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="MATCHED">✓ Matched</SelectItem>
              <SelectItem value="PENDING">⏳ Pending</SelectItem>
            </SelectContent>
          </Select>

          {/* Event Filter */}
          {uniqueEvents.length > 0 && (
            <Select value={eventFilter} onValueChange={(val) => setEventFilter(val || 'ALL')}>
              <SelectTrigger className="w-[160px] h-9 text-xs truncate">
                <SelectValue placeholder="All Events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Events</SelectItem>
                {uniqueEvents.map((evt) => (
                  <SelectItem key={evt.id} value={evt.id} className="text-xs truncate">
                    {evt.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Sort Filter */}
          <Select
            value={sortBy}
            onValueChange={(val) => setSortBy((val as 'NEWEST' | 'OLDEST' | 'NAME_ASC') || 'NEWEST')}
          >
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NEWEST">Newest First</SelectItem>
              <SelectItem value="OLDEST">Oldest First</SelectItem>
              <SelectItem value="NAME_ASC">Name (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Guest Leads Table */}
      <Card className="border-border/60 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-[260px] font-semibold text-foreground">Guest</TableHead>
                <TableHead className="w-[190px] font-semibold text-foreground">WhatsApp Number</TableHead>
                <TableHead className="w-[240px] font-semibold text-foreground">Source Event</TableHead>
                <TableHead className="w-[180px] font-semibold text-foreground">Match Status</TableHead>
                <TableHead className="w-[220px] text-right font-semibold text-foreground pr-6">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                        <Users className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-base font-medium text-foreground">No guest leads found</p>
                        <p className="text-sm text-muted-foreground max-w-sm">
                          {searchQuery || statusFilter !== 'ALL' || eventFilter !== 'ALL'
                            ? 'Try clearing your search filters to view all leads.'
                            : 'Place your Universal Studio QR acrylic standee at event entrance desks to collect leads.'}
                        </p>
                      </div>
                      {universalQrUrl && !searchQuery && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyQrLink}
                          className="mt-2 gap-1.5"
                        >
                          <QrCode className="h-4 w-4" />
                          <span>Copy Standee QR Link</span>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads.map((lead) => {
                  const defaultPromoText = buildGuestLeadPromoMessage({
                    guestName: lead.guestName,
                    studioName,
                    discountPercentage: 10,
                  });

                  return (
                    <TableRow key={lead.id} className="hover:bg-muted/30 transition-colors">
                      {/* Guest Details */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setPreviewLead(lead)}
                            className="relative group rounded-full ring-2 ring-primary/20 hover:ring-primary/60 transition-all focus:outline-none focus:ring-2 focus:ring-primary"
                            title="Click to view full selfie"
                          >
                            <Avatar size="default" className="h-10 w-10">
                              <AvatarImage
                                src={lead.selfieImageUrl}
                                alt={lead.guestName}
                                className="object-cover"
                              />
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                                {lead.guestName
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="h-3.5 w-3.5 text-white" />
                            </div>
                          </button>

                          <div className="space-y-0.5">
                            <p className="text-sm font-semibold text-foreground leading-tight">
                              {lead.guestName}
                            </p>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{format(new Date(lead.createdAt), 'dd MMM yyyy, hh:mm a')}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* WhatsApp Contact */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 rounded-md">
                            🇮🇳 +91
                          </span>
                          <span className="font-mono text-xs font-medium text-foreground">
                            {lead.whatsappNumber.startsWith('91')
                              ? lead.whatsappNumber.slice(2)
                              : lead.whatsappNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyPhone(lead.id, lead.whatsappNumber)}
                            className="text-muted-foreground hover:text-foreground transition-colors p-1"
                            title="Copy number"
                          >
                            {copiedId === lead.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </TableCell>

                      {/* Source Event */}
                      <TableCell>
                        {lead.booking ? (
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium text-foreground truncate max-w-[220px]" title={lead.booking.title}>
                              {lead.booking.title}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-mono text-[11px] text-muted-foreground/80">
                                {lead.booking.bookingNumber}
                              </span>
                              <span>•</span>
                              <span>
                                {lead.booking.startDate
                                  ? format(new Date(lead.booking.startDate), 'dd MMM yyyy')
                                  : 'Active'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center text-xs text-muted-foreground italic">
                            Universal Studio Walk-in
                          </span>
                        )}
                      </TableCell>

                      {/* AI Face Match Status */}
                      <TableCell>
                        {lead.isMatched ? (
                          <div className="space-y-1">
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 gap-1 text-[11px] font-medium">
                              <Sparkles className="h-3 w-3" />
                              <span>Matched ({lead.matchedPhotosCount} photos)</span>
                            </Badge>
                          </div>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 text-[11px] font-normal"
                          >
                            <Clock className="h-3 w-3" />
                            <span>Pending Matching</span>
                          </Badge>
                        )}
                      </TableCell>

                      {/* Actions Column with Click-to-WhatsApp Integration */}
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <WhatsAppButton
                            phone={lead.whatsappNumber}
                            messageText={defaultPromoText}
                            label="Send Promo"
                            size="sm"
                            title={`Send 10% promo to ${lead.guestName}`}
                          />

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenPromoModal(lead)}
                            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                            title="Customize promotional message & discount"
                          >
                            Customize
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Lightbox Selfie Modal */}
      {previewLead && (
        <Dialog open={Boolean(previewLead)} onOpenChange={(open) => !open && setPreviewLead(null)}>
          <DialogContent className="max-w-md p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-heading">
                {previewLead.guestName}&apos;s Reference Selfie
              </DialogTitle>
              <DialogDescription className="text-xs">
                Captured for biometric face indexing.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-2">
              <div className="relative aspect-square w-full rounded-xl overflow-hidden border bg-muted shadow-inner flex items-center justify-center">
                {previewLead.selfieImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewLead.selfieImageUrl}
                    alt={previewLead.guestName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="text-center text-muted-foreground text-sm">
                    <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    No image available
                  </div>
                )}
              </div>

              <div className="bg-muted/40 rounded-lg p-3 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">WhatsApp:</span>
                  <span className="font-mono font-medium">+{previewLead.whatsappNumber}</span>
                </div>
                {previewLead.booking && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Event:</span>
                    <span className="font-medium text-right">{previewLead.booking.title}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium">
                    {previewLead.isMatched
                      ? `Matched (${previewLead.matchedPhotosCount} photos)`
                      : 'Pending AI Rekognition Indexing'}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="flex sm:justify-between items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPreviewLead(null)}>
                Close
              </Button>
              <WhatsAppButton
                phone={previewLead.whatsappNumber}
                messageText={buildGuestLeadPromoMessage({
                  guestName: previewLead.guestName,
                  studioName,
                  discountPercentage: 10,
                })}
                label="Send WhatsApp"
                size="sm"
              />
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Customize Promo Message Dialog */}
      {promoLead && (
        <Dialog open={Boolean(promoLead)} onOpenChange={(open) => !open && setPromoLead(null)}>
          <DialogContent className="max-w-lg p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-heading">
                Customize WhatsApp Message
              </DialogTitle>
              <DialogDescription className="text-xs">
                Fine-tune the promotional offer before launching Click-to-WhatsApp.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Discount Percentage
                </label>
                <div className="flex items-center gap-2 mt-1.5">
                  {[10, 15, 20, 25].map((discount) => (
                    <Button
                      key={discount}
                      type="button"
                      variant={customDiscount === discount ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleDiscountChange(discount)}
                      className="h-8 text-xs font-semibold"
                    >
                      {discount}% OFF
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Message Preview
                </label>
                <textarea
                  rows={4}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full mt-1.5 p-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-sans leading-relaxed resize-none"
                />
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                <span>
                  Clicking <strong>Launch WhatsApp</strong> opens WhatsApp Web or the WhatsApp Desktop/Mobile app
                  with the recipient and message pre-filled. No Meta API credits are consumed.
                </span>
              </div>
            </div>

            <DialogFooter className="flex sm:justify-between items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPromoLead(null)}>
                Cancel
              </Button>
              <WhatsAppButton
                phone={promoLead.whatsappNumber}
                messageText={customMessage}
                label="Launch WhatsApp"
                size="sm"
                onClick={() => setPromoLead(null)}
              />
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
