'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  User,
  Phone,
  Mail,
  Building,
  MapPin,
  Calendar,
  CreditCard,
  Receipt,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  ArrowLeft,
  CalendarCheck2,
  Briefcase,
  Eye,
  Printer,
  Copy,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  UploadCloud,
  Image as ImageIcon,
  KeyRound,
  MessageSquare,
  RefreshCw,
  Send,
  Trash2,
  AlertTriangle,
  Check,
  FolderUp,
  Lock,
} from 'lucide-react';
import { generateOrResetPortalPinAction } from '@/actions/portal-auth.actions';
import { purgeSelectionStorageAction } from '@/actions/selection.actions';
import { formatMoney } from '@/lib/currency';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { CustomerFinancePanel } from '@/features/finance/components/CustomerFinancePanel';
import { CustomerEventPanel } from '@/features/customers/components/CustomerEventPanel';
import { UniversalUploaderModal } from '@/components/media/universal-uploader-modal';
import { ByosFolderUploader } from '@/components/gallery/byos-folder-uploader';
import { BookingMediaManager } from '@/components/features/crm/bookings/media/booking-media-manager';

export interface CustomerInvoiceItem {
  id: string;
  invoiceNumber: string;
  issueDate?: string | Date | null;
  dueDate?: string | Date | null;
  grandTotal: number | string;
  paidAmount: number | string;
  status: string;
  payments?: Array<{
    id: string;
    amount: number | string;
    paymentDate: string | Date;
    paymentMethod: string;
    transactionRef?: string | null;
  }>;
  items?: Array<{
    id: string;
    description?: string | null;
    quantity: number;
    unitPrice: number;
    total?: number;
    totalPrice?: number;
    [key: string]: any;
  }>;
  [key: string]: any;
}

export interface CustomerPaymentItem {
  id: string;
  amount: number | string;
  paymentDate: string | Date;
  paymentMethod: string;
  transactionRef?: string | null;
  invoice?: {
    id: string;
    invoiceNumber: string;
  } | null;
  [key: string]: any;
}

export interface CustomerEventBookingItem {
  id: string;
  bookingNumber: string;
  title: string;
  startDate: string | Date;
  endDate?: string | Date | null;
  status: string;
  journeyStatus?: string;
  location?: string | null;
  venue?: string | null;
  subEvents?: Array<{
    id: string;
    name: string;
    eventDate: string | Date;
    startTime?: string | null;
    endTime?: string | null;
    venue?: string | null;
    locationVenue?: string | null;
    staffAssignments?: Array<{
      id: string;
      role?: string | null;
      status?: string | null;
      payoutAmount?: number | string | null;
      notes?: string | null;
      user?: {
        id: string;
        name: string;
        email?: string | null;
        phone?: string | null;
        designation?: string | null;
        skills?: string[];
        employmentType?: string | null;
      } | null;
    }>;
  }>;
  [key: string]: any;
}

export interface CustomerLeadItem {
  id: string;
  leadNumber?: string | null;
  leadCode?: string | null;
  title: string;
  status: string;
  createdAt: string | Date;
  eventDate?: string | Date | null;
  budget?: number | null;
  assignedTo?: { name?: string | null } | null;
  quotations?: Array<{
    id: string;
    quotationNumber?: string;
    quotationCode?: string;
    title?: string;
    totalAmount: number | string;
    status: string;
    createdAt: string | Date;
    quotationRevisions?: Array<{
      grandTotal?: number | string | null;
      revisionNumber?: number | null;
      [key: string]: any;
    }> | null;
    [key: string]: any;
  }>;
  [key: string]: any;
}

export interface CustomerSelectionItem {
  id: string;
  title: string;
  status: string;
  isSelectionLocked?: boolean;
  isStoragePurged?: boolean;
  purgedAt?: string | Date | null;
  selectionDeadline?: string | Date | null;
  pinCode?: string | null;
  createdAt?: string | Date;
  eventBooking?: {
    id: string;
    title: string;
    bookingNumber: string;
  } | null;
  galleryFolders?: Array<{
    id: string;
    name: string;
    _count?: { photos: number };
  }>;
  _count?: { items: number; galleryFolders: number };
  [key: string]: any;
}

export interface Customer360Profile {
  id: string;
  firstName: string;
  lastName: string;
  name?: string;
  companyName?: string | null;
  customerCode?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  portalPin?: string | null;
  portalAccessCode?: string | null;
  isPortalActive?: boolean;
  portalAccessGranted?: boolean;
  isConfirmed?: boolean;
  tenant?: { id: string; name: string; [key: string]: any } | null;
  branch?: { id: string; name: string; code?: string | null; [key: string]: any } | null;
  createdAt: string | Date;
  address?: string | null;
  city?: { id: string; name: string } | null;
  state?: { id: string; name: string } | null;
  invoices?: CustomerInvoiceItem[];
  payments?: CustomerPaymentItem[];
  creditNotes?: Array<Record<string, unknown>>;
  leads?: CustomerLeadItem[];
  eventBookings?: CustomerEventBookingItem[];
  storageRecords?: Array<Record<string, unknown>>;
  clientSelections?: CustomerSelectionItem[];
  _count?: {
    leads?: number;
    invoices?: number;
    creditNotes?: number;
    payments?: number;
    eventBookings?: number;
    storageRecords?: number;
    clientSelections?: number;
  };
  [key: string]: any;
}

export interface CustomerStaffMember {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  designation?: string | null;
  skills?: string[];
  employmentType?: string | null;
}

export interface Customer360ClientProps {
  customer: Customer360Profile;
  staffList?: CustomerStaffMember[];
}

export function Customer360Client({
  customer,
  staffList = [],
}: Customer360ClientProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const fullName =
    [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim() ||
    customer.name ||
    'Customer Profile';

  const invoices = customer.invoices || [];
  const payments = customer.payments || [];
  const creditNotes = customer.creditNotes || [];
  const leads = customer.leads || [];
  const eventBookings = customer.eventBookings || [];
  const storageRecords = customer.storageRecords || [];
  const [selections, setSelections] = useState<CustomerSelectionItem[]>(customer.clientSelections || []);

  // One-Click Storage Purge Dialog State
  const [purgingSelection, setPurgingSelection] = useState<CustomerSelectionItem | null>(null);
  const [purgeConfirmationText, setPurgeConfirmationText] = useState('');
  const [isPendingPurge, startPurgeTransition] = useTransition();

  const handleConfirmPurgeStorage = () => {
    if (!purgingSelection) return;

    startPurgeTransition(async () => {
      const result = await purgeSelectionStorageAction(purgingSelection.id);
      if (!result.success || !result.data) {
        toast.error(result.error || 'Failed to purge cloud storage.');
        return;
      }

      const purgeData = result.data as { purgedAt?: string | Date; deletedFilesCount?: number };
      setSelections((prev) =>
        prev.map((s) =>
          s.id === purgingSelection.id
            ? {
                ...s,
                isStoragePurged: true,
                purgedAt: purgeData.purgedAt || new Date(),
              }
            : s
        )
      );

      const deletedCount = purgeData.deletedFilesCount ?? 0;
      toast.success(
        `Cloud storage for "${purgingSelection.title}" successfully purged. ${deletedCount} cloud asset(s) deleted permanently.`
      );
      setPurgingSelection(null);
      setPurgeConfirmationText('');
    });
  };

  // Financial aggregates
  const totalInvoiced = invoices.reduce(
    (sum: number, inv: CustomerInvoiceItem) => sum + Number(inv.grandTotal || 0),
    0
  );
  const totalPaid = invoices.reduce(
    (sum: number, inv: CustomerInvoiceItem) => sum + Number(inv.paidAmount || 0),
    0
  );
  const totalBalanceDue = Math.max(0, totalInvoiced - totalPaid);

  // Portal credentials state
  const [portalPin, setPortalPin] = useState<string | null>(customer.portalPin || null);
  const [portalAccessCode, setPortalAccessCode] = useState<string | null>(customer.portalAccessCode || null);
  const [isGeneratingPin, setIsGeneratingPin] = useState(false);

  // Generate or reset secure 6-digit PIN
  const handleGeneratePin = async () => {
    setIsGeneratingPin(true);
    try {
      const res = await generateOrResetPortalPinAction(customer.id);
      if (res.success && res.pin) {
        setPortalPin(res.pin);
        if (res.portalAccessCode) {
          setPortalAccessCode(res.portalAccessCode);
        }
        toast.success(`Secure 6-Digit PIN generated: ${res.pin}`);
      } else {
        toast.error(res.error || 'Failed to generate PIN');
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Error generating PIN');
    } finally {
      setIsGeneratingPin(false);
    }
  };

  // Copy full portal URL
  const handleCopyPortalLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const code = portalAccessCode || customer.portalAccessCode || customer.customerCode;
    const portalUrl = `${origin}/portal/${code}`;
    navigator.clipboard.writeText(portalUrl);
    toast.success('Direct portal access link copied to clipboard!');
  };

  // Share portal credentials via WhatsApp
  const handleShareOnWhatsApp = () => {
    const rawPhone = customer.whatsapp || customer.phone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const code = portalAccessCode || customer.portalAccessCode || customer.customerCode;
    const portalLink = `${origin}/portal/${code}`;
    const studioName = customer.tenant?.name || 'our studio';

    const message = `Hello *${fullName}*,\n\nHere are your private client portal credentials with *${studioName}*:\n\n🔗 *Portal Link:* ${portalLink}\n📱 *Registered Mobile:* ${customer.phone || customer.whatsapp || 'Your Mobile'}\n🔑 *Secure PIN:* ${portalPin || 'Contact Studio'}\n\nYou can track your event milestones, view invoices, and review your photo selections anytime.\n\nWarm regards,\n*${studioName}*`;

    const encodedMessage = encodeURIComponent(message);
    const waUrl = targetPhone
      ? `https://wa.me/${targetPhone}?text=${encodedMessage}`
      : `https://wa.me/?text=${encodedMessage}`;

    window.open(waUrl, '_blank');
  };

  // Copy portal code
  const handleCopyPortalCode = () => {
    const code = portalAccessCode || customer.portalAccessCode;
    if (code) {
      navigator.clipboard.writeText(code);
      toast.success('Portal access code copied to clipboard!');
    }
  };

  // Lead status badge
  const getLeadStatusColor = (status: string) => {
    switch (status) {
      case 'NEW':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
      case 'QUALIFIED':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300';
      case 'QUOTATION_SENT':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300';
      case 'NEGOTIATION':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300';
      case 'WON':
        return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300';
      case 'LOST':
        return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Back link & Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/customers"
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Customers
        </Link>
        <div className="flex items-center gap-2">
          {customer.portalAccessGranted ? (
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 gap-1 font-medium">
              <ShieldCheck className="w-3 h-3" />
              Client Portal Active
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Portal Pending
            </Badge>
          )}
        </div>
      </div>

      {/* Customer 360 Header Profile Card */}
      <div className="bg-card p-6 rounded-2xl border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xl font-mono shrink-0">
            {customer.firstName?.[0] || 'C'}
            {customer.lastName?.[0] || ''}
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {fullName}
              </h1>
              <Badge variant="outline" className="font-mono text-xs">
                {customer.customerCode}
              </Badge>
              {customer.isConfirmed && (
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 text-[10px]">
                  Confirmed Client
                </Badge>
              )}
            </div>

            {/* Contact details */}
            <div
              className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground pt-1"
              suppressHydrationWarning
            >
              {customer.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-primary" />
                  {customer.phone}
                </span>
              )}
              {customer.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-primary" />
                  {customer.email}
                </span>
              )}
              {(customer.city?.name || customer.state?.name) && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  {[customer.city?.name, customer.state?.name]
                    .filter(Boolean)
                    .join(', ')}
                </span>
              )}
              {customer.branch?.name && (
                <span className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-primary" />
                  {customer.branch.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Balance & Upload Media */}
        <div className="flex flex-wrap items-center gap-4 self-start md:self-auto">
          <div className="flex items-center gap-6 bg-muted/40 p-3.5 rounded-xl border">
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Total Invoiced
              </div>
              <div
                className="text-base font-bold font-mono text-foreground"
                suppressHydrationWarning
              >
                {formatMoney(totalInvoiced)}
              </div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Balance Due
              </div>
              <div
                className={`text-base font-bold font-mono ${
                  totalBalanceDue > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
                suppressHydrationWarning
              >
                {formatMoney(totalBalanceDue)}
              </div>
            </div>
          </div>

          <UniversalUploaderModal
            preSelectedCustomerId={customer.id}
            title={`Upload Media for ${fullName}`}
            description="Upload event photos, raw assets, or customer deliverable albums directly to your BYOS cloud bucket."
          />
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-6 max-w-[950px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financials" className="relative">
            Financials
            {invoices.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                {invoices.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="events" className="relative">
            Events & Roster
            {eventBookings.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {eventBookings.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="leads" className="relative">
            Leads & Quotes
            {leads.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
                {leads.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="selections" className="relative">
            Selections & Gallery
            {selections.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                {selections.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="media" className="relative">
            Media & Proofs
            {storageRecords.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                {storageRecords.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* 4 Overview KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>Lifetime Revenue</span>
                  <Receipt className="w-4 h-4 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="text-2xl font-bold text-foreground font-mono"
                  suppressHydrationWarning
                >
                  {formatMoney(totalInvoiced)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across {invoices.length} commercial billings
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>Collected / Advances</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono"
                  suppressHydrationWarning
                >
                  {formatMoney(totalPaid)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {payments.length} verified transaction{payments.length === 1 ? '' : 's'}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>Outstanding Balance</span>
                  <AlertCircle
                    className={`w-4 h-4 ${
                      totalBalanceDue > 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold font-mono ${
                    totalBalanceDue > 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                  suppressHydrationWarning
                >
                  {formatMoney(totalBalanceDue)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalBalanceDue <= 0
                    ? 'All dues settled in full'
                    : 'Pending customer receivables'}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>Active Bookings</span>
                  <CalendarCheck2 className="w-4 h-4 text-primary" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground font-mono">
                  {eventBookings.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {eventBookings.reduce(
                    (acc: number, b: CustomerEventBookingItem) => acc + (b.subEvents?.length || 0),
                    0
                  )}{' '}
                  scheduled ceremonies
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Client Details & Portal */}
            <div className="lg:col-span-1 space-y-6">
              {/* Profile Details Card */}
              <Card className="shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Customer Record
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Customer Code</span>
                    <span className="font-mono font-medium text-foreground">
                      {customer.customerCode}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Client Name</span>
                    <span className="font-medium text-foreground">{fullName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Phone</span>
                    <span className="font-medium text-foreground">
                      {customer.phone || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Email</span>
                    <span className="font-medium text-foreground">
                      {customer.email || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">WhatsApp</span>
                    <span className="font-medium text-foreground">
                      {customer.whatsapp || customer.phone || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Branch</span>
                    <span className="font-medium text-foreground">
                      {customer.branch?.name || 'Default Branch'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Member Since</span>
                    <span className="font-medium text-foreground" suppressHydrationWarning>
                      {customer.createdAt
                        ? format(new Date(customer.createdAt), 'PP')
                        : 'N/A'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Secure 2FA Client Portal Credentials Card */}
              <Card className="shadow-xs bg-card border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      <span>Client Portal Access (2FA)</span>
                    </CardTitle>
                    {portalPin ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                        2FA Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px]">
                        PIN Pending
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3.5 text-xs">
                  <p className="text-muted-foreground leading-relaxed">
                    Clients can securely log in using their registered mobile number and 6-digit PIN to review contracts, track milestones, and view invoices.
                  </p>

                  {/* Credentials Box */}
                  <div className="space-y-2 p-3 rounded-xl bg-muted/30 border">
                    {/* Registered Mobile */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">Mobile (Login ID):</span>
                      <span className="font-mono font-semibold text-foreground">
                        {customer.phone || customer.whatsapp || 'No mobile set'}
                      </span>
                    </div>

                    {/* Secure PIN */}
                    <div className="flex items-center justify-between pt-1 border-t border-border/50">
                      <span className="text-[11px] text-muted-foreground">Secure PIN:</span>
                      {portalPin ? (
                        <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 tracking-widest">
                          {portalPin}
                        </span>
                      ) : (
                        <span className="text-[11px] text-amber-600 italic">Not Generated</span>
                      )}
                    </div>

                    {/* Access Code */}
                    <div className="flex items-center justify-between pt-1 border-t border-border/50">
                      <span className="text-[11px] text-muted-foreground">Direct Access Code:</span>
                      <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-primary">
                        <span>{portalAccessCode || customer.portalAccessCode || customer.customerCode}</span>
                        <button
                          type="button"
                          onClick={handleCopyPortalLink}
                          className="hover:text-foreground p-0.5"
                          title="Copy Direct Portal Link"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-1">
                    {/* WhatsApp Share Button */}
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleShareOnWhatsApp}
                      disabled={!portalPin && !portalAccessCode}
                      className="w-full h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Share on WhatsApp</span>
                    </Button>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Generate / Reset PIN Button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGeneratePin}
                        disabled={isGeneratingPin}
                        className="h-8 text-[11px] flex items-center justify-center gap-1"
                      >
                        {isGeneratingPin ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <KeyRound className="w-3 h-3" />
                        )}
                        <span>{portalPin ? 'Reset PIN' : 'Generate PIN'}</span>
                      </Button>

                      {/* Preview Portal Link */}
                      <a
                        href={`/portal/${portalAccessCode || customer.portalAccessCode || customer.customerCode}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-8 text-[11px] inline-flex items-center justify-center gap-1 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground font-medium"
                      >
                        <span>Preview</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Recent Activity Feed */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Customer Timeline & Activity Feed
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Consolidated record of recent payments, bookings, and commercial
                    milestones
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {payments.length === 0 &&
                  eventBookings.length === 0 &&
                  leads.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground text-sm">
                      No recent activity recorded for this customer profile.
                    </div>
                  ) : (
                    <div className="relative border-l border-border ml-3 space-y-6 py-2">
                      {/* Recent Payments */}
                      {payments.slice(0, 5).map((pmt: CustomerPaymentItem & { receiptNumber?: string }) => (
                        <div key={pmt.id} className="ml-6 relative">
                          <span className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-300 flex items-center justify-center">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                          </span>
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1">
                            <h4 className="text-sm font-semibold text-foreground">
                              Payment of {formatMoney(Number(pmt.amount))} Received
                            </h4>
                            <span
                              className="text-xs text-muted-foreground"
                              suppressHydrationWarning
                            >
                              {pmt.paymentDate
                                ? format(new Date(pmt.paymentDate), 'dd MMM yyyy, p')
                                : ''}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                            Receipt #{pmt.receiptNumber} via {pmt.paymentMethod}
                            {pmt.transactionRef ? ` • Ref: ${pmt.transactionRef}` : ''}
                          </p>
                        </div>
                      ))}

                      {/* Event Bookings */}
                      {eventBookings.slice(0, 3).map((b: CustomerEventBookingItem & { createdAt?: string | Date; endDate?: string | Date | null }) => (
                        <div key={b.id} className="ml-6 relative">
                          <span className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-blue-100 text-blue-600 border border-blue-300 flex items-center justify-center">
                            <CalendarCheck2 className="w-2.5 h-2.5" />
                          </span>
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1">
                            <h4 className="text-sm font-semibold text-foreground">
                              Event Booking Confirmed: {b.title}
                            </h4>
                            <span
                              className="text-xs text-muted-foreground"
                              suppressHydrationWarning
                            >
                              {b.createdAt ? format(new Date(b.createdAt), 'PP') : ''}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Booking #{b.bookingNumber} • Locked from{' '}
                            {format(new Date(b.startDate), 'PP')} to{' '}
                            {b.endDate ? format(new Date(b.endDate), 'PP') : 'N/A'}
                          </p>
                        </div>
                      ))}

                      {/* Leads */}
                      {leads.slice(0, 3).map((ld: CustomerLeadItem) => (
                        <div key={ld.id} className="ml-6 relative">
                          <span className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-purple-100 text-purple-600 border border-purple-300 flex items-center justify-center">
                            <Briefcase className="w-2.5 h-2.5" />
                          </span>
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1">
                            <h4 className="text-sm font-semibold text-foreground">
                              Lead Created: {ld.leadCode}
                            </h4>
                            <span
                              className="text-xs text-muted-foreground"
                              suppressHydrationWarning
                            >
                              {ld.createdAt ? format(new Date(ld.createdAt), 'PP') : ''}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Stage: <strong className="text-primary">{ld.status}</strong> •
                            Assigned to: {ld.assignedTo?.name || 'Unassigned'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: FINANCIALS */}
        <TabsContent value="financials" className="space-y-6 mt-6">
          <CustomerFinancePanel
            customerId={customer.id}
            customerName={fullName}
            invoices={invoices}
            allPayments={payments}
            creditNotes={creditNotes}
          />
        </TabsContent>

        {/* TAB 3: EVENTS & ROSTER */}
        <TabsContent value="events" className="space-y-6 mt-6">
          <CustomerEventPanel
            customerId={customer.id}
            customerName={fullName}
            eventBookings={eventBookings}
            staffList={staffList}
          />
        </TabsContent>

        {/* TAB 4: LEADS & QUOTATIONS */}
        <TabsContent value="leads" className="space-y-6 mt-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold">Historical Leads & Quotations</h2>
              <p className="text-xs text-muted-foreground">
                All sales opportunities and commercial quotes linked to this client
              </p>
            </div>
          </div>

          {leads.length === 0 ? (
            <Card className="border-dashed shadow-xs">
              <CardContent className="py-12 text-center text-muted-foreground text-sm">
                No leads or commercial quotations found for this customer record.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {leads.map((ld: CustomerLeadItem) => {
                const quotes = ld.quotations || [];

                return (
                  <Card key={ld.id} className="shadow-xs overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b p-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-foreground">
                              {ld.leadCode}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-semibold ${getLeadStatusColor(
                                ld.status
                              )}`}
                            >
                              {ld.status}
                            </span>
                          </div>
                          <div
                            className="text-xs text-muted-foreground"
                            suppressHydrationWarning
                          >
                            Executive: {ld.assignedTo?.name || 'Unassigned'} • Created:{' '}
                            {ld.createdAt ? format(new Date(ld.createdAt), 'PP') : ''}
                          </div>
                        </div>

                        <Link href={`/leads/${ld.id}`}>
                          <Button variant="outline" size="sm" className="gap-1 text-xs">
                            <Eye className="w-3.5 h-3.5" />
                            View Lead Pipeline
                          </Button>
                        </Link>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 space-y-3">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Quotations ({quotes.length})
                      </h4>

                      {quotes.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">
                          No commercial quotations generated for this lead opportunity.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {quotes.map((q: NonNullable<CustomerLeadItem['quotations']>[number]) => {
                            const latestRev = q.quotationRevisions?.[0];
                            const grandTotal =
                              latestRev?.grandTotal || q.totalAmount || 0;

                            return (
                              <div
                                key={q.id}
                                className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3 rounded-lg border bg-card text-xs hover:border-primary/40 transition-colors"
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-semibold text-primary">
                                      {q.quotationCode || q.id.slice(0, 8)}
                                    </span>
                                    <Badge
                                      variant={
                                        q.status === 'ACCEPTED' ||
                                        q.status === 'APPROVED'
                                          ? 'default'
                                          : 'outline'
                                      }
                                      className="text-[10px]"
                                    >
                                      {q.status}
                                    </Badge>
                                    <span className="text-muted-foreground">
                                      Rev #{latestRev?.revisionNumber || 1}
                                    </span>
                                  </div>
                                  <div
                                    className="text-sm font-bold text-foreground font-mono"
                                    suppressHydrationWarning
                                  >
                                    {formatMoney(Number(grandTotal))}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Link href={`/sales/quotations/${q.id}`}>
                                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                                      <Eye className="w-3 h-3" />
                                      View
                                    </Button>
                                  </Link>
                                  <Link
                                    href={`/sales/quotations/${q.id}/print`}
                                    target="_blank"
                                  >
                                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                                      <Printer className="w-3 h-3" />
                                      Print
                                    </Button>
                                  </Link>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 5: MEDIA & CLOUD STORAGE */}
        <TabsContent value="media" className="space-y-6 mt-6">
          <BookingMediaManager
            customerId={customer.id}
            customerName={fullName}
            bookingId={eventBookings[0]?.id}
            bookingTitle={eventBookings[0]?.title}
            initialStorageRecords={storageRecords}
          />
        </TabsContent>

        {/* TAB: SELECTIONS & PHOTO GALLERIES */}
        <TabsContent value="selections" className="space-y-6 mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border/80">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                <FolderUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span>Client Selection Galleries</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Manage online photo selection boards, BYOS cloud storage folders, and post-delivery storage purges.
              </p>
            </div>

            <Link href="/operations/selections">
              <Button size="sm" variant="outline" className="flex items-center gap-1.5 text-xs">
                <ExternalLink className="w-3.5 h-3.5" />
                <span>All Operations Boards</span>
              </Button>
            </Link>
          </div>

          {selections.length === 0 ? (
            <Card className="border-dashed border-2 bg-card/40">
              <CardContent className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                <div className="p-4 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <FolderUp className="w-8 h-8" />
                </div>
                <div className="max-w-md space-y-1">
                  <h3 className="text-base font-semibold">No Selection Boards Created Yet</h3>
                  <p className="text-xs text-muted-foreground">
                    Create photo selection galleries from the Operations → Selections dashboard to allow this client to pick their album photos online.
                  </p>
                </div>
                <Link href="/operations/selections">
                  <Button size="sm" className="gap-1.5">
                    <span>Go to Operations Selections</span>
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {selections.map((board: CustomerSelectionItem) => {
                const totalPhotos =
                  board.galleryFolders?.reduce(
                    (acc: number, f: { _count?: { photos: number } }) => acc + (f._count?.photos || 0),
                    0
                  ) ||
                  board._count?.items ||
                  0;

                return (
                  <Card key={board.id} className="shadow-xs overflow-hidden border border-border/80">
                    <CardHeader className="bg-muted/30 border-b p-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm text-foreground">
                              {board.title}
                            </span>
                            <Badge
                              variant={board.status === 'COMPLETED' || board.status === 'SUBMITTED' ? 'default' : 'outline'}
                              className="text-[10px]"
                            >
                              {board.status}
                            </Badge>
                            {board.isSelectionLocked && (
                              <Badge variant="destructive" className="text-[10px] flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" /> Locked
                              </Badge>
                            )}
                            {board.isStoragePurged && (
                              <Badge
                                variant="outline"
                                className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-semibold flex items-center gap-1"
                              >
                                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                <span>Storage Cleared ({board.purgedAt ? format(new Date(board.purgedAt), 'PP') : 'Purged'})</span>
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3">
                            {board.eventBooking && (
                              <span>
                                Event: <strong>{board.eventBooking.title}</strong> ({board.eventBooking.bookingNumber})
                              </span>
                            )}
                            {board.pinCode && (
                              <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px]">
                                PIN: {board.pinCode}
                              </span>
                            )}
                            {board.createdAt && (
                              <span>Created: {format(new Date(board.createdAt), 'PP')}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* Open Gallery */}
                          <a
                            href={`/gallery/selection/${board.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs gap-1">
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Open Gallery</span>
                            </Button>
                          </a>

                          {/* BYOS Folder Uploader */}
                          <ByosFolderUploader
                            selectionId={board.id}
                            selectionTitle={board.title}
                            triggerButton={
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2 text-xs flex items-center gap-1 border-violet-500/30 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10"
                                title="Auto-Mirror Local Folders (Haldi, Reception, Portraits, etc.)"
                              >
                                <FolderUp className="w-3.5 h-3.5" />
                                <span>Folder Upload</span>
                              </Button>
                            }
                          />

                          {/* Direct Upload */}
                          <UniversalUploaderModal
                            preSelectedCustomerId={customer.id}
                            preSelectedEventBookingId={board.eventBooking?.id}
                            preSelectedSelectionBoardId={board.id}
                            defaultGalleryMode="SELECTION"
                            title={`Upload Photos: ${board.title}`}
                            description="Photos will stream directly to your BYOS cloud storage and will be linked to this selection board."
                            triggerButton={
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2 text-xs flex items-center gap-1 border-primary/30 text-primary hover:bg-primary/10"
                                title="Upload Photos directly to this Selection Board"
                              >
                                <UploadCloud className="w-3.5 h-3.5" />
                                <span>Upload</span>
                              </Button>
                            }
                          />

                          {/* One-Click Storage Purge Action */}
                          {board.isStoragePurged ? (
                            <Badge
                              variant="outline"
                              className="h-8 px-2.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 flex items-center gap-1.5 cursor-default shrink-0"
                              title={`Cloud storage was permanently cleared on ${board.purgedAt ? format(new Date(board.purgedAt), 'PP') : 'recently'}.`}
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Storage Cleared</span>
                            </Badge>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPurgingSelection(board);
                                setPurgeConfirmationText('');
                              }}
                              disabled={isPendingPurge}
                              className="h-8 px-2.5 text-xs flex items-center gap-1.5 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/50 shrink-0 font-medium"
                              title="Permanently Delete Google Drive Photo Folders to Free Cloud Storage"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              <span>🧹 Clear Cloud Storage</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="p-2.5 rounded-lg bg-muted/40 border">
                          <span className="text-[11px] text-muted-foreground block">Total Photos</span>
                          <span className="font-mono font-bold text-sm text-foreground">{totalPhotos} Assets</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-muted/40 border">
                          <span className="text-[11px] text-muted-foreground block">Folders Structure</span>
                          <span className="font-mono font-bold text-sm text-foreground">
                            {board.galleryFolders?.length || 1} Folder(s)
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-muted/40 border">
                          <span className="text-[11px] text-muted-foreground block">Client Selections</span>
                          <span className="font-mono font-bold text-sm text-purple-600 dark:text-purple-400">
                            {board._count?.items || 0} Picked
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-muted/40 border">
                          <span className="text-[11px] text-muted-foreground block">Cloud Storage</span>
                          <span className={`font-semibold text-xs ${board.isStoragePurged ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {board.isStoragePurged ? 'Cleaned (0 GB)' : 'Active Cloud Files'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Strict Confirmation Alert Dialog: One-Click Storage Purge */}
      <Dialog
        open={Boolean(purgingSelection)}
        onOpenChange={(open) => {
          if (!open) {
            setPurgingSelection(null);
            setPurgeConfirmationText('');
          }
        }}
      >
        <DialogContent className="max-w-md border-rose-500/50 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
              <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-rose-600 dark:text-rose-400">
                  Permanently Clear Cloud Storage?
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground whitespace-pre-line mt-1">
                  This will permanently delete all high-resolution photos and folders for this project from your cloud storage to free up space.

Your project details, client selection history, and billing records will remain 100% safe in the database. This action cannot be undone.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {purgingSelection && (
            <div className="space-y-4 py-2">
              {/* Target Project Summary */}
              <div className="p-3 rounded-lg bg-muted/50 border text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Selection Board:</span>
                  <span className="font-semibold text-foreground">{purgingSelection.title}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-semibold text-foreground">
                    {fullName} ({customer.customerCode})
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Photos in Gallery:</span>
                  <span className="font-mono font-bold text-foreground">
                    {purgingSelection.galleryFolders?.reduce(
                      (acc: number, f: { _count?: { photos: number } }) => acc + (f._count?.photos || 0),
                      0
                    ) ||
                      purgingSelection._count?.items ||
                      0}{' '}
                    Assets
                  </span>
                </div>
              </div>

              {/* High Alert Warning Box */}
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2 text-xs">
                <div className="flex items-start gap-2 text-rose-700 dark:text-rose-300 font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Important: This action cannot be undone</span>
                </div>
                <p className="text-[11px] text-rose-900/80 dark:text-rose-200/80 leading-relaxed pl-6">
                  This will permanently delete all high-resolution photos and folders for this project from your cloud storage to free up space.
                </p>
                <div className="pt-1.5 border-t border-rose-500/20 text-[11px] text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Your project details, client selection history, and billing records will remain 100% safe in the database.</span>
                </div>
              </div>

              {/* Safety Confirmation Input */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  To confirm permanent deletion, type <strong className="font-mono text-rose-600 select-all">PURGE</strong> below:
                </Label>
                <Input
                  value={purgeConfirmationText}
                  onChange={(e) => setPurgeConfirmationText(e.target.value)}
                  placeholder="Type PURGE to confirm"
                  className="h-9 text-xs font-mono border-rose-500/30 focus-visible:ring-rose-500"
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 gap-2 sm:justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPurgingSelection(null);
                setPurgeConfirmationText('');
              }}
              disabled={isPendingPurge}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isPendingPurge || purgeConfirmationText.trim().toUpperCase() !== 'PURGE'}
              onClick={handleConfirmPurgeStorage}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs gap-1.5 shadow-sm"
            >
              {isPendingPurge ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Purging Cloud Files...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Permanently Delete Cloud Data</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
