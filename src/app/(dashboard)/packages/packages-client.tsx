'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Package,
  Tag,
  Plus,
  Trash2,
  Copy,
  Power,
  PowerOff,
  Eye,
  Send,
  Sparkles,
  Percent,
  Calendar,
  Layers,
  FileCheck,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  Search,
  IndianRupee,
  Clock,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  createPackageAction,
  clonePackageAction,
  activatePackageAction,
  deactivatePackageAction,
  deletePackageAction,
} from '@/actions/package.actions';
import {
  createPromotionalOfferAction,
  deletePromotionalOfferAction,
  broadcastOfferToCustomersAction,
} from '@/actions/offer.actions';
import { DiscountType } from '@prisma/client';

interface DeliverableRow {
  itemName: string;
  quantity: number;
}

interface PackageItemRecord {
  id: string;
  packageCode: string;
  name: string;
  categoryName?: string | null;
  category?: { name: string } | null;
  basePrice: number | string;
  advancePercentage?: number;
  notes?: string | null;
  isActive: boolean;
  deliverables?: Array<{ id: string; itemName: string; quantity: number }>;
  _count?: { deliverables?: number; items?: number };
}

interface PromotionalOfferRecord {
  id: string;
  title: string;
  description?: string | null;
  discountType: DiscountType;
  discountValue: number | string;
  validUntil: string | Date;
  isActive: boolean;
  createdAt: string | Date;
}

interface BroadcastResultData {
  success: boolean;
  offerId: string;
  offerTitle: string;
  totalEligible: number;
  dispatchedCount: number;
  integrationConnected: boolean;
  recipients: Array<{
    customerId: string;
    customerName: string;
    phone: string;
    directWhatsAppUrl: string;
    status: string;
  }>;
}

interface PackagesClientProps {
  initialPackages: PackageItemRecord[];
  initialOffers: PromotionalOfferRecord[];
  totalPackages: number;
}

const DEFAULT_DELIVERABLES: DeliverableRow[] = [
  { itemName: 'Candid Photography Coverage (2 Photographers)', quantity: 1 },
  { itemName: 'Cinematic 4K Wedding Teaser (3-5 Minutes)', quantity: 1 },
  { itemName: 'Full Length Traditional Film (30-45 Minutes)', quantity: 1 },
  { itemName: 'Handcrafted Premium Flushmount Photobook (40 Sheets)', quantity: 1 },
  { itemName: 'Aerial Drone 4K Cinematography', quantity: 1 },
];

export function PackagesClient({
  initialPackages,
  initialOffers,
  totalPackages,
}: PackagesClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'packages' | 'offers'>('packages');

  // Search
  const [packageSearch, setPackageSearch] = useState('');
  const [offerSearch, setOfferSearch] = useState('');

  // Packages state
  const [packages, setPackages] = useState<PackageItemRecord[]>(initialPackages);

  // Offers state
  const [offers, setOffers] = useState<PromotionalOfferRecord[]>(initialOffers);

  // Modal 1: Package Builder Modal
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [isSubmittingPackage, setIsSubmittingPackage] = useState(false);
  const [packageName, setPackageName] = useState('');
  const [packageCategory, setPackageCategory] = useState('Wedding');
  const [packageBasePrice, setPackageBasePrice] = useState<string>('75000');
  const [packageAdvancePercent, setPackageAdvancePercent] = useState<string>('25');
  const [packageNotes, setPackageNotes] = useState('');
  const [deliverables, setDeliverables] = useState<DeliverableRow[]>([
    { itemName: 'Candid Photography Coverage (2 Photographers)', quantity: 1 },
    { itemName: 'Cinematic 4K Highlights Film (3-5 Mins)', quantity: 1 },
    { itemName: 'Premium Flushmount Wedding Album (40 Sheets)', quantity: 1 },
  ]);

  // Modal 2: View Deliverables Modal
  const [selectedPackageForView, setSelectedPackageForView] = useState<PackageItemRecord | null>(null);
  const [isViewDeliverablesOpen, setIsViewDeliverablesOpen] = useState(false);

  // Modal 3: Create Promotional Offer Modal
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDescription, setOfferDescription] = useState('');
  const [offerDiscountType, setOfferDiscountType] = useState<DiscountType>(DiscountType.PERCENTAGE);
  const [offerDiscountValue, setOfferDiscountValue] = useState<string>('15');
  const [offerValidUntil, setOfferValidUntil] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [offerIsActive, setOfferIsActive] = useState<boolean>(true);

  // Modal 4: Broadcast WhatsApp Results Modal
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastingOfferId, setBroadcastingOfferId] = useState<string | null>(null);
  const [broadcastResult, setBroadcastResult] = useState<BroadcastResultData | null>(null);

  // ----------------------------------------------------
  // PACKAGE BUILDER HANDLERS
  // ----------------------------------------------------
  const handleOpenPackageModal = () => {
    setPackageName('');
    setPackageCategory('Wedding');
    setPackageBasePrice('75000');
    setPackageAdvancePercent('25');
    setPackageNotes('');
    setDeliverables([
      { itemName: 'Candid Photography Coverage (2 Photographers)', quantity: 1 },
      { itemName: 'Cinematic 4K Highlights Film (3-5 Mins)', quantity: 1 },
      { itemName: 'Premium Flushmount Wedding Album (40 Sheets)', quantity: 1 },
    ]);
    setIsPackageModalOpen(true);
  };

  const handleAddDeliverableRow = () => {
    setDeliverables((prev) => [...prev, { itemName: '', quantity: 1 }]);
  };

  const handleRemoveDeliverableRow = (index: number) => {
    setDeliverables((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateDeliverable = (
    index: number,
    field: keyof DeliverableRow,
    value: any
  ) => {
    setDeliverables((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleApplyPresetDeliverables = () => {
    setDeliverables(DEFAULT_DELIVERABLES);
    toast.success('Applied standard studio deliverables preset');
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageName.trim()) {
      toast.error('Please enter a package name');
      return;
    }

    const price = Number(packageBasePrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid base price');
      return;
    }

    const advance = Number(packageAdvancePercent);
    if (isNaN(advance) || advance < 0 || advance > 100) {
      toast.error('Advance percentage must be between 0 and 100%');
      return;
    }

    // Filter non-empty deliverables
    const validDeliverables = deliverables
      .filter((d) => d.itemName.trim().length > 0)
      .map((d) => ({
        itemName: d.itemName.trim(),
        quantity: Math.max(1, Number(d.quantity) || 1),
      }));

    if (validDeliverables.length === 0) {
      toast.error('Please add at least one deliverable item');
      return;
    }

    setIsSubmittingPackage(true);
    try {
      const newPkg = await createPackageAction({
        name: packageName.trim(),
        categoryName: packageCategory,
        basePrice: price,
        advancePercentage: advance,
        notes: packageNotes.trim() || undefined,
        isActive: true,
        deliverables: validDeliverables,
      });

      toast.success(`Package "${packageName}" created successfully!`);
      setIsPackageModalOpen(false);

      // Optimistically update or refresh
      startTransition(() => {
        router.refresh();
      });
      setPackages((prev) => [newPkg as any, ...prev]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create package');
    } finally {
      setIsSubmittingPackage(false);
    }
  };

  const handleClone = async (id: string) => {
    if (!confirm('Are you sure you want to clone this package?')) return;
    try {
      const res = await clonePackageAction(id);
      if (res) {
        toast.success('Package cloned successfully');
        startTransition(() => {
          router.refresh();
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to clone package');
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      if (isActive) {
        await deactivatePackageAction(id);
        toast.success('Package deactivated');
      } else {
        await activatePackageAction(id);
        toast.success('Package activated');
      }
      setPackages((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isActive: !isActive } : p))
      );
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle package status');
    }
  };

  const handleDeletePackage = async (id: string) => {
    if (!confirm('Are you sure you want to archive/delete this package?')) return;
    try {
      await deletePackageAction(id);
      toast.success('Package archived successfully');
      setPackages((prev) => prev.filter((p) => p.id !== id));
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete package');
    }
  };

  // ----------------------------------------------------
  // PROMOTIONAL OFFER HANDLERS
  // ----------------------------------------------------
  const handleOpenOfferModal = () => {
    setOfferTitle('');
    setOfferDescription('');
    setOfferDiscountType(DiscountType.PERCENTAGE);
    setOfferDiscountValue('15');
    setOfferValidUntil(
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    setOfferIsActive(true);
    setIsOfferModalOpen(true);
  };

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerTitle.trim()) {
      toast.error('Offer campaign title is required');
      return;
    }

    const discountNum = Number(offerDiscountValue);
    if (isNaN(discountNum) || discountNum <= 0) {
      toast.error('Please enter a valid discount value');
      return;
    }

    if (!offerValidUntil) {
      toast.error('Please select an expiration date');
      return;
    }

    setIsSubmittingOffer(true);
    try {
      const res = await createPromotionalOfferAction({
        title: offerTitle.trim(),
        description: offerDescription.trim() || undefined,
        discountType: offerDiscountType,
        discountValue: discountNum,
        validUntil: offerValidUntil,
        isActive: offerIsActive,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || 'Failed to create offer campaign');
        return;
      }

      toast.success(`Offer campaign "${offerTitle}" launched!`);
      setIsOfferModalOpen(false);
      setOffers((prev) => [res.data as any, ...prev]);
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to create offer campaign');
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    if (!confirm('Are you sure you want to delete this promotional offer?')) return;
    try {
      const res = await deletePromotionalOfferAction(offerId);
      if (res.success) {
        toast.success('Offer removed');
        setOffers((prev) => prev.filter((o) => o.id !== offerId));
      } else {
        toast.error(res.error || 'Failed to remove offer');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete offer');
    }
  };

  const handleBroadcastWhatsApp = async (offerId: string, offerTitleStr: string) => {
    setBroadcastingOfferId(offerId);
    try {
      toast.info(`Preparing WhatsApp broadcast for "${offerTitleStr}"...`);
      const res = await broadcastOfferToCustomersAction(offerId);

      if (!res.success || !res.data) {
        toast.error(res.error || 'Failed to dispatch broadcast');
        return;
      }

      setBroadcastResult(res.data as BroadcastResultData);
      setIsBroadcastModalOpen(true);
      toast.success(`Broadcast generated for ${res.data.dispatchedCount} client contacts!`);
    } catch (err: any) {
      toast.error(err.message || 'Error occurred during WhatsApp broadcast');
    } finally {
      setBroadcastingOfferId(null);
    }
  };

  // Filter packages
  const filteredPackages = packages.filter((p) => {
    const q = packageSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.packageCode.toLowerCase().includes(q) ||
      (p.categoryName && p.categoryName.toLowerCase().includes(q)) ||
      (p.category?.name && p.category.name.toLowerCase().includes(q))
    );
  });

  // Filter offers
  const filteredOffers = offers.filter((o) => {
    const q = offerSearch.toLowerCase();
    return (
      o.title.toLowerCase().includes(q) ||
      (o.description && o.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border rounded-xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Packages & Promotional Campaigns</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Design master client packages with customizable deliverables and broadcast promotional offers via WhatsApp.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {activeTab === 'packages' ? (
            <Button
              onClick={handleOpenPackageModal}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-xs"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Package Builder
            </Button>
          ) : (
            <Button
              onClick={handleOpenOfferModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
            >
              <Sparkles className="h-4 w-4 mr-1.5" />
              Create Offer Campaign
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as 'packages' | 'offers')}
        className="space-y-4"
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b pb-3">
          <TabsList className="grid grid-cols-2 w-full sm:w-80">
            <TabsTrigger value="packages" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              <span>Master Packages</span>
              <Badge variant="secondary" className="ml-1 text-xs">
                {packages.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="offers" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              <span>Promotional Offers</span>
              <Badge variant="secondary" className="ml-1 text-xs">
                {offers.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Search Inputs */}
          {activeTab === 'packages' ? (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search packages..."
                value={packageSearch}
                onChange={(e) => setPackageSearch(e.target.value)}
                className="pl-8 text-sm"
              />
            </div>
          ) : (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={offerSearch}
                onChange={(e) => setOfferSearch(e.target.value)}
                className="pl-8 text-sm"
              />
            </div>
          )}
        </div>

        {/* TAB 1: MASTER PACKAGES */}
        <TabsContent value="packages" className="space-y-4">
          <Card className="border rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[120px]">Code</TableHead>
                    <TableHead>Package Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Base Investment</TableHead>
                    <TableHead className="text-center">Advance Req.</TableHead>
                    <TableHead className="text-center">Deliverables</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right w-[150px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPackages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="font-medium">No master packages found</p>
                        <p className="text-xs mt-1">
                          Click &quot;Package Builder&quot; above to create your studio&apos;s first standard package.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPackages.map((pkg) => {
                      const deliverablesCount =
                        pkg.deliverables?.length ?? pkg._count?.deliverables ?? 0;
                      const displayCategory =
                        pkg.categoryName || pkg.category?.name || 'General';

                      return (
                        <TableRow key={pkg.id} className="hover:bg-muted/30">
                          <TableCell className="font-mono text-xs font-semibold text-primary">
                            {pkg.packageCode}
                          </TableCell>

                          <TableCell>
                            <div className="font-medium text-foreground">{pkg.name}</div>
                            {pkg.notes && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {pkg.notes}
                              </p>
                            )}
                          </TableCell>

                          <TableCell>
                            <Badge variant="outline" className="text-xs font-normal">
                              {displayCategory}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-right font-medium">
                            ₹{Number(pkg.basePrice).toLocaleString('en-IN')}
                          </TableCell>

                          <TableCell className="text-center">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {pkg.advancePercentage ?? 25}%
                            </span>
                          </TableCell>

                          <TableCell className="text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPackageForView(pkg);
                                setIsViewDeliverablesOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
                              title="Click to view deliverables breakdown"
                            >
                              <FileCheck className="h-3 w-3" />
                              <span>{deliverablesCount} Inclusions</span>
                            </button>
                          </TableCell>

                          <TableCell className="text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                pkg.isActive
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-muted text-muted-foreground border'
                              }`}
                            >
                              {pkg.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedPackageForView(pkg);
                                  setIsViewDeliverablesOpen(true);
                                }}
                                title="View Deliverables"
                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleClone(pkg.id)}
                                title="Clone Package"
                                className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleActive(pkg.id, pkg.isActive)}
                                title={pkg.isActive ? 'Deactivate Package' : 'Activate Package'}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              >
                                {pkg.isActive ? (
                                  <PowerOff className="h-4 w-4 text-orange-600" />
                                ) : (
                                  <Power className="h-4 w-4 text-emerald-600" />
                                )}
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeletePackage(pkg.id)}
                                title="Delete Package"
                                className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              >
                                <Trash2 className="h-4 w-4" />
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
        </TabsContent>

        {/* TAB 2: PROMOTIONAL OFFERS */}
        <TabsContent value="offers" className="space-y-4">
          <Card className="border rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Campaign Title</TableHead>
                    <TableHead>Privilege / Discount</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOffers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-40 text-emerald-500" />
                        <p className="font-medium">No promotional offers created yet</p>
                        <p className="text-xs mt-1">
                          Create an offer campaign to re-engage past leads and broadcast on WhatsApp.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOffers.map((offer) => {
                      const isExpired = new Date(offer.validUntil) < new Date();
                      const expiryFormatted = new Date(offer.validUntil).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      });

                      const discountBadgeText =
                        offer.discountType === DiscountType.PERCENTAGE
                          ? `${Number(offer.discountValue)}% OFF`
                          : `Flat ₹${Number(offer.discountValue).toLocaleString('en-IN')} OFF`;

                      return (
                        <TableRow key={offer.id} className="hover:bg-muted/30">
                          <TableCell>
                            <div className="font-semibold text-foreground flex items-center gap-2">
                              <span>{offer.title}</span>
                              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] font-bold tracking-wider uppercase px-2">
                                {discountBadgeText}
                              </Badge>
                            </div>
                            {offer.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                {offer.description}
                              </p>
                            )}
                          </TableCell>

                          <TableCell>
                            <span className="text-sm font-medium text-foreground">
                              {offer.discountType === DiscountType.PERCENTAGE ? 'Percentage' : 'Flat Cash Discount'}
                            </span>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-1.5 text-xs">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className={isExpired ? 'text-rose-600 font-semibold' : 'text-foreground'}>
                                {expiryFormatted}
                              </span>
                              {isExpired && (
                                <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                                  Expired
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                offer.isActive && !isExpired
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-muted text-muted-foreground border'
                              }`}
                            >
                              {offer.isActive && !isExpired ? 'Active' : 'Inactive'}
                            </span>
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* 1-Click WhatsApp Broadcast */}
                              <Button
                                size="sm"
                                onClick={() => handleBroadcastWhatsApp(offer.id, offer.title)}
                                disabled={broadcastingOfferId === offer.id || !offer.isActive || isExpired}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 shadow-xs gap-1.5"
                                title="Broadcast offer via WhatsApp to confirmed clients"
                              >
                                {broadcastingOfferId === offer.id ? (
                                  <>
                                    <Clock className="h-3.5 w-3.5 animate-spin" />
                                    <span>Dispatching...</span>
                                  </>
                                ) : (
                                  <>
                                    <MessageSquare className="h-3.5 w-3.5" />
                                    <span>Broadcast via WhatsApp</span>
                                  </>
                                )}
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteOffer(offer.id)}
                                title="Delete Campaign"
                                className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              >
                                <Trash2 className="h-4 w-4" />
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
        </TabsContent>
      </Tabs>

      {/* -------------------------------------------------- */}
      {/* MODAL 1: ENTERPRISE PACKAGE BUILDER MODAL         */}
      {/* -------------------------------------------------- */}
      <Dialog open={isPackageModalOpen} onOpenChange={setIsPackageModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleCreatePackage}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <span>Enterprise Package Builder</span>
              </DialogTitle>
              <DialogDescription>
                Configure master photography/cinematography package pricing, advance deposit, and client deliverables.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Row 1: Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pkg-name">Package Name *</Label>
                  <Input
                    id="pkg-name"
                    placeholder="e.g. Royal Cinematic Wedding Suite"
                    value={packageName}
                    onChange={(e) => setPackageName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pkg-category">Category</Label>
                  <Select value={packageCategory} onValueChange={(val) => { if (val) setPackageCategory(val); }}>
                    <SelectTrigger id="pkg-category">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Wedding">Wedding</SelectItem>
                      <SelectItem value="Pre-Wedding">Pre-Wedding</SelectItem>
                      <SelectItem value="Engagement">Engagement</SelectItem>
                      <SelectItem value="Reception">Reception</SelectItem>
                      <SelectItem value="Maternity & Baby">Maternity & Baby</SelectItem>
                      <SelectItem value="Corporate & Commercial">Corporate & Commercial</SelectItem>
                      <SelectItem value="Fashion & Editorial">Fashion & Editorial</SelectItem>
                      <SelectItem value="Birthday & Anniversaries">Birthday & Anniversaries</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: Base Price & Advance Deposit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pkg-price">Base Investment (₹) *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">₹</span>
                    <Input
                      id="pkg-price"
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="75000"
                      className="pl-7"
                      value={packageBasePrice}
                      onChange={(e) => setPackageBasePrice(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pkg-advance">Advance Deposit (%) *</Label>
                  <div className="relative">
                    <Input
                      id="pkg-advance"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="25"
                      className="pr-8"
                      value={packageAdvancePercent}
                      onChange={(e) => setPackageAdvancePercent(e.target.value)}
                      required
                    />
                    <span className="absolute right-3 top-2.5 text-muted-foreground text-sm">%</span>
                  </div>
                </div>
              </div>

              {/* Row 3: Notes / Special Instructions */}
              <div className="space-y-1.5">
                <Label htmlFor="pkg-notes">Package Inclusions Notes & Policies (Optional)</Label>
                <Textarea
                  id="pkg-notes"
                  placeholder="Includes high-resolution color-graded photos, aerial drone footage, and studio transport within city limits..."
                  rows={2}
                  value={packageNotes}
                  onChange={(e) => setPackageNotes(e.target.value)}
                />
              </div>

              {/* DELIVERABLES REPEATER */}
              <div className="border rounded-lg p-4 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-primary" />
                      <span>Deliverable Items & Quantities</span>
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Specify deliverable line items promised to the client in this package.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleApplyPresetDeliverables}
                      className="text-xs h-7"
                    >
                      Use Studio Preset
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleAddDeliverableRow}
                      className="text-xs h-7"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Row
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 mt-2">
                  {deliverables.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-background p-2 rounded-md border"
                    >
                      <span className="text-xs font-mono text-muted-foreground w-6 text-center">
                        {index + 1}.
                      </span>

                      <Input
                        placeholder="e.g. 4K Drone Teaser or Flushmount Photobook"
                        value={item.itemName}
                        onChange={(e) =>
                          handleUpdateDeliverable(index, 'itemName', e.target.value)
                        }
                        className="flex-1 text-sm h-8"
                        required
                      />

                      <div className="w-24">
                        <Input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateDeliverable(
                              index,
                              'quantity',
                              parseInt(e.target.value) || 1
                            )
                          }
                          className="text-sm h-8 text-center"
                          title="Quantity"
                          required
                        />
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveDeliverableRow(index)}
                        disabled={deliverables.length <= 1}
                        className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                        title="Remove deliverable"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPackageModalOpen(false)}
                disabled={isSubmittingPackage}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingPackage}>
                {isSubmittingPackage ? 'Saving Package...' : 'Save Master Package'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* -------------------------------------------------- */}
      {/* MODAL 2: VIEW DELIVERABLES BREAKDOWN               */}
      {/* -------------------------------------------------- */}
      <Dialog open={isViewDeliverablesOpen} onOpenChange={setIsViewDeliverablesOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <FileCheck className="h-5 w-5 text-amber-600" />
              <span>{selectedPackageForView?.name}</span>
            </DialogTitle>
            <DialogDescription>
              Deliverables and inclusions manifest for package {selectedPackageForView?.packageCode}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <div className="flex justify-between items-center bg-muted/40 p-3 rounded-lg text-sm">
              <div>
                <span className="text-xs text-muted-foreground block">Base Investment</span>
                <span className="font-semibold text-foreground">
                  ₹{Number(selectedPackageForView?.basePrice || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Advance Booking</span>
                <span className="font-semibold text-blue-600">
                  {selectedPackageForView?.advancePercentage ?? 25}%
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Category</span>
                <span className="font-semibold text-foreground">
                  {selectedPackageForView?.categoryName ||
                    selectedPackageForView?.category?.name ||
                    'General'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Deliverables & Inclusions List
              </h5>
              {(!selectedPackageForView?.deliverables ||
                selectedPackageForView.deliverables.length === 0) ? (
                <p className="text-xs text-muted-foreground italic py-3 text-center">
                  No deliverables registered under this package.
                </p>
              ) : (
                <ul className="divide-y border rounded-md">
                  {selectedPackageForView.deliverables.map((del, i) => (
                    <li
                      key={del.id || i}
                      className="flex items-center justify-between p-2.5 text-sm"
                    >
                      <span className="text-foreground">{del.itemName}</span>
                      <Badge variant="secondary" className="font-mono text-xs">
                        Qty: {del.quantity}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {selectedPackageForView?.notes && (
              <div className="text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-md">
                <span className="font-semibold block mb-0.5 text-foreground">Terms / Notes:</span>
                {selectedPackageForView.notes}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsViewDeliverablesOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -------------------------------------------------- */}
      {/* MODAL 3: CREATE PROMOTIONAL OFFER CAMPAIGN        */}
      {/* -------------------------------------------------- */}
      <Dialog open={isOfferModalOpen} onOpenChange={setIsOfferModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateOffer}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-600" />
                <span>Create Offer Campaign</span>
              </DialogTitle>
              <DialogDescription>
                Launch an exclusive promotional campaign and broadcast discount vouchers to confirmed clients.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="offer-title">Campaign Title *</Label>
                <Input
                  id="offer-title"
                  placeholder="e.g. Festive Early-Bird 2026 Special"
                  value={offerTitle}
                  onChange={(e) => setOfferTitle(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="offer-type">Discount Type *</Label>
                  <Select
                    value={offerDiscountType}
                    onValueChange={(val) => { if (val) setOfferDiscountType(val as DiscountType); }}
                  >
                    <SelectTrigger id="offer-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={DiscountType.PERCENTAGE}>Percentage (%)</SelectItem>
                      <SelectItem value={DiscountType.FLAT}>Flat Cash (₹)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="offer-val">Discount Value *</Label>
                  <div className="relative">
                    <Input
                      id="offer-val"
                      type="number"
                      min="1"
                      placeholder={offerDiscountType === DiscountType.PERCENTAGE ? '15' : '10000'}
                      value={offerDiscountValue}
                      onChange={(e) => setOfferDiscountValue(e.target.value)}
                      className={offerDiscountType === DiscountType.PERCENTAGE ? 'pr-8' : 'pl-7'}
                      required
                    />
                    {offerDiscountType === DiscountType.PERCENTAGE ? (
                      <span className="absolute right-3 top-2.5 text-muted-foreground text-sm">%</span>
                    ) : (
                      <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">₹</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="offer-expiry">Valid Until (Expiry Date) *</Label>
                <Input
                  id="offer-expiry"
                  type="date"
                  value={offerValidUntil}
                  onChange={(e) => setOfferValidUntil(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="offer-desc">Campaign Narrative / Message (Optional)</Label>
                <Textarea
                  id="offer-desc"
                  placeholder="Enjoy an exclusive 15% discount on all premium wedding and pre-wedding packages booked before the festival..."
                  rows={3}
                  value={offerDescription}
                  onChange={(e) => setOfferDescription(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOfferModalOpen(false)}
                disabled={isSubmittingOffer}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingOffer}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSubmittingOffer ? 'Creating...' : 'Launch Campaign'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* -------------------------------------------------- */}
      {/* MODAL 4: WHATSAPP BROADCAST SUMMARY               */}
      {/* -------------------------------------------------- */}
      <Dialog open={isBroadcastModalOpen} onOpenChange={setIsBroadcastModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <MessageSquare className="h-5 w-5" />
              <span>WhatsApp Campaign Dispatched</span>
            </DialogTitle>
            <DialogDescription>
              Campaign: &quot;{broadcastResult?.offerTitle}&quot;
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/40 p-3 rounded-lg text-center">
                <span className="text-xs text-muted-foreground block">Eligible Clients</span>
                <span className="text-xl font-bold text-foreground">
                  {broadcastResult?.totalEligible ?? 0}
                </span>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 p-3 rounded-lg text-center">
                <span className="text-xs text-emerald-700 dark:text-emerald-300 block">
                  Dispatched Contacts
                </span>
                <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                  {broadcastResult?.dispatchedCount ?? 0}
                </span>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 p-3 rounded-lg text-center">
                <span className="text-xs text-blue-700 dark:text-blue-300 block">Gateway</span>
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 block mt-1">
                  {broadcastResult?.integrationConnected ? 'API Connected' : 'Direct Link Mode'}
                </span>
              </div>
            </div>

            {/* Recipient list with direct 1-click open */}
            <div className="space-y-2">
              <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Client Contact Broadcast Links ({broadcastResult?.recipients.length || 0})
              </h5>

              {(!broadcastResult?.recipients || broadcastResult.recipients.length === 0) ? (
                <div className="text-xs text-muted-foreground bg-muted/20 p-4 rounded-md text-center">
                  No confirmed clients with phone numbers found in the system yet.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto border rounded-md divide-y">
                  {broadcastResult.recipients.map((rec) => (
                    <div
                      key={rec.customerId}
                      className="flex items-center justify-between p-2.5 text-sm hover:bg-muted/30"
                    >
                      <div>
                        <span className="font-medium text-foreground block">
                          {rec.customerName}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          +{rec.phone}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            rec.status === 'DISPATCHED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px]'
                              : 'bg-amber-50 text-amber-700 border-amber-300 text-[10px]'
                          }
                        >
                          {rec.status}
                        </Badge>

                        <a
                          href={rec.directWhatsAppUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors"
                        >
                          <span>Open Chat</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsBroadcastModalOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
