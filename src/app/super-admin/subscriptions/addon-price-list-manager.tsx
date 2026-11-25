'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Pencil, Loader2, IndianRupee, Layers } from 'lucide-react';
import { upsertAddonPriceAction } from '@/actions/subscription.actions';
import { toast } from 'sonner';

export interface PlanAddonConfigItem {
  id: string;
  featureKey: string;
  name: string;
  description: string | null;
  originalMonthlyPrice: number | string | null;
  monthlyPrice: number | string;
  originalAnnualPrice: number | string | null;
  annualPrice: number | string;
  isActive: boolean;
  sortOrder: number;
}

interface AddonPriceListManagerProps {
  addons: PlanAddonConfigItem[];
}

export function AddonPriceListManager({ addons }: AddonPriceListManagerProps) {
  const router = useRouter();
  const [editingAddon, setEditingAddon] = useState<PlanAddonConfigItem | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form states for modal
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [originalMonthlyPrice, setOriginalMonthlyPrice] = useState<string>('');
  const [monthlyPrice, setMonthlyPrice] = useState<string>('0');
  const [originalAnnualPrice, setOriginalAnnualPrice] = useState<string>('');
  const [annualPrice, setAnnualPrice] = useState<string>('0');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [sortOrder, setSortOrder] = useState<string>('0');

  const openEditModal = (addon: PlanAddonConfigItem) => {
    setEditingAddon(addon);
    setName(addon.name);
    setDescription(addon.description || '');
    setOriginalMonthlyPrice(addon.originalMonthlyPrice ? String(Number(addon.originalMonthlyPrice)) : '');
    setMonthlyPrice(String(Number(addon.monthlyPrice || 0)));
    setOriginalAnnualPrice(addon.originalAnnualPrice ? String(Number(addon.originalAnnualPrice)) : '');
    setAnnualPrice(String(Number(addon.annualPrice || 0)));
    setIsActive(addon.isActive);
    setSortOrder(String(addon.sortOrder || 0));
    setIsOpen(true);
  };

  const handleSave = () => {
    if (!editingAddon) return;

    startTransition(async () => {
      try {
        const res = await upsertAddonPriceAction({
          featureKey: editingAddon.featureKey,
          name: name.trim(),
          description: description.trim() || undefined,
          originalMonthlyPrice: originalMonthlyPrice ? Number(originalMonthlyPrice) : undefined,
          monthlyPrice: Number(monthlyPrice) || 0,
          originalAnnualPrice: originalAnnualPrice ? Number(originalAnnualPrice) : undefined,
          annualPrice: Number(annualPrice) || 0,
          isActive,
          sortOrder: Number(sortOrder) || 0,
        });

        if (res.success) {
          toast.success(res.message || 'Add-on pricing updated successfully');
          setIsOpen(false);
          setEditingAddon(null);
          router.refresh();
        } else {
          toast.error(res.error || 'Failed to update add-on pricing');
        }
      } catch (err: any) {
        toast.error(err.message || 'An error occurred while saving.');
      }
    });
  };

  const handleToggleActive = (addon: PlanAddonConfigItem, checked: boolean) => {
    startTransition(async () => {
      try {
        const res = await upsertAddonPriceAction({
          featureKey: addon.featureKey,
          name: addon.name,
          description: addon.description || undefined,
          originalMonthlyPrice: addon.originalMonthlyPrice ? Number(addon.originalMonthlyPrice) : undefined,
          monthlyPrice: Number(addon.monthlyPrice),
          originalAnnualPrice: addon.originalAnnualPrice ? Number(addon.originalAnnualPrice) : undefined,
          annualPrice: Number(addon.annualPrice),
          isActive: checked,
          sortOrder: addon.sortOrder,
        });

        if (res.success) {
          toast.success(`${addon.name} status updated.`);
          router.refresh();
        } else {
          toast.error(res.error || 'Failed to toggle status.');
        }
      } catch (err: any) {
        toast.error(err.message || 'Failed to update status.');
      }
    });
  };

  return (
    <Card className="border-border/60 bg-card/60 shadow-xs">
      <CardHeader className="p-6 pb-4 border-b border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg font-bold font-heading">
                Modular Add-on Price Catalog ({addons.length})
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Configure standalone MRP vs Offer pricing for all 9 ERP capabilities. Studios can subscribe to these individually on top of any base plan or via Super Admin studio assignment.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs font-mono w-fit">
            Automatic Catalog Sync Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[180px] font-semibold text-xs">Capability</TableHead>
                <TableHead className="w-[200px] font-semibold text-xs">Description</TableHead>
                <TableHead className="font-semibold text-xs text-right">Monthly (MRP / Offer)</TableHead>
                <TableHead className="font-semibold text-xs text-right">Annual (MRP / Offer)</TableHead>
                <TableHead className="font-semibold text-xs text-center w-[100px]">Order</TableHead>
                <TableHead className="font-semibold text-xs text-center w-[120px]">Status</TableHead>
                <TableHead className="font-semibold text-xs text-right w-[90px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {addons.map((addon) => {
                const origM = addon.originalMonthlyPrice ? Number(addon.originalMonthlyPrice) : null;
                const curM = Number(addon.monthlyPrice || 0);
                const origA = addon.originalAnnualPrice ? Number(addon.originalAnnualPrice) : null;
                const curA = Number(addon.annualPrice || 0);

                return (
                  <TableRow key={addon.featureKey} className="hover:bg-muted/20">
                    <TableCell className="font-medium">
                      <div className="space-y-0.5">
                        <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                          {addon.name}
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground px-1.5 py-0.2 rounded bg-muted/60">
                          {addon.featureKey}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {addon.description || 'Standard ERP modular capability.'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {origM && origM > curM && (
                          <span className="text-xs line-through text-muted-foreground">
                            ₹{origM.toLocaleString('en-IN')}
                          </span>
                        )}
                        <span className="text-sm font-bold text-foreground">
                          ₹{curM.toLocaleString('en-IN')}/mo
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {origA && origA > curA && (
                          <span className="text-xs line-through text-muted-foreground">
                            ₹{origA.toLocaleString('en-IN')}
                          </span>
                        )}
                        <span className="text-sm font-bold text-foreground">
                          ₹{curA.toLocaleString('en-IN')}/yr
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs">
                      {addon.sortOrder}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={addon.isActive}
                          disabled={isPending}
                          onCheckedChange={(checked) => handleToggleActive(addon, checked)}
                          title={addon.isActive ? 'Active for purchase' : 'Inactive'}
                        />
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {addon.isActive ? 'Active' : 'Off'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => openEditModal(addon)}
                        title="Edit Add-on Pricing"
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Edit Addon Pricing Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Pencil className="h-4 w-4 text-primary" />
              Edit Add-on Pricing: {editingAddon?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Set MRP (strike-through) and active Offer prices in INR for monthly and annual billing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="addon-name" className="text-xs font-semibold">
                Display Name
              </Label>
              <Input
                id="addon-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Finance & Invoicing"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="addon-desc" className="text-xs font-semibold">
                Feature Description
              </Label>
              <Textarea
                id="addon-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of what this add-on unlocks..."
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
              <div className="space-y-1.5">
                <Label htmlFor="addon-orig-monthly" className="text-xs text-muted-foreground">
                  Monthly MRP (₹)
                </Label>
                <Input
                  id="addon-orig-monthly"
                  type="number"
                  min="0"
                  step="1"
                  value={originalMonthlyPrice}
                  onChange={(e) => setOriginalMonthlyPrice(e.target.value)}
                  placeholder="e.g. 799"
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="addon-monthly" className="text-xs font-semibold text-foreground">
                  Monthly Offer (₹) *
                </Label>
                <Input
                  id="addon-monthly"
                  type="number"
                  min="0"
                  step="1"
                  value={monthlyPrice}
                  onChange={(e) => setMonthlyPrice(e.target.value)}
                  placeholder="e.g. 499"
                  className="h-9 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="addon-orig-annual" className="text-xs text-muted-foreground">
                  Annual MRP (₹)
                </Label>
                <Input
                  id="addon-orig-annual"
                  type="number"
                  min="0"
                  step="1"
                  value={originalAnnualPrice}
                  onChange={(e) => setOriginalAnnualPrice(e.target.value)}
                  placeholder="e.g. 7990"
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="addon-annual" className="text-xs font-semibold text-foreground">
                  Annual Offer (₹) *
                </Label>
                <Input
                  id="addon-annual"
                  type="number"
                  min="0"
                  step="1"
                  value={annualPrice}
                  onChange={(e) => setAnnualPrice(e.target.value)}
                  placeholder="e.g. 4990"
                  className="h-9 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50 items-center">
              <div className="space-y-1.5">
                <Label htmlFor="addon-sort" className="text-xs font-semibold">
                  Display Order
                </Label>
                <Input
                  id="addon-sort"
                  type="number"
                  min="0"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <Label htmlFor="addon-active" className="text-xs font-semibold cursor-pointer">
                  Available in Catalog
                </Label>
                <Switch
                  id="addon-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isPending || !name.trim()}
              className="gap-1.5"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Add-on Pricing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
