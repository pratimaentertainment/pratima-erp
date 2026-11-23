'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { 
  BookmarkPlus, 
  Loader2, 
  PackageCheck, 
  Sparkles, 
  CheckCircle2, 
  Layers 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { saveQuotationAsPackageAction } from '@/actions/package.actions';
import { formatMoney } from '@/lib/currency';

export interface SaveAsPackageDialogProps {
  /**
   * Array of quotation line items or a callback to get them dynamically (e.g. form.getValues('items'))
   */
  items?: any[];
  getItems?: () => any[];
  tenantId?: string;
  onSuccess?: (pkg: any) => void;
  className?: string;
  disabled?: boolean;
}

export function SaveAsPackageDialog({
  items,
  getItems,
  tenantId,
  onSuccess,
  className,
  disabled = false,
}: SaveAsPackageDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [packageName, setPackageName] = React.useState('');
  const [packageDescription, setPackageDescription] = React.useState('');

  // Resolve current active items from either prop or getter
  const currentItems = React.useMemo(() => {
    const raw = getItems ? getItems() : items || [];
    return Array.isArray(raw)
      ? raw.filter((it) => it && typeof it.itemName === 'string' && it.itemName.trim().length > 0)
      : [];
  }, [items, getItems, isOpen]);

  const totalBasePrice = React.useMemo(() => {
    return currentItems.reduce(
      (acc, it) => acc + (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
      0
    );
  }, [currentItems]);

  const handleOpenAttempt = (open: boolean) => {
    if (open) {
      const liveItems = getItems ? getItems() : items || [];
      const valid = (liveItems || []).filter(
        (it) => it && typeof it.itemName === 'string' && it.itemName.trim().length > 0
      );
      if (valid.length === 0) {
        toast.warning('Please add at least one line item with a service name before saving as a package template.');
        return;
      }
      setPackageName('');
      setPackageDescription('');
    }
    setIsOpen(open);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageName.trim()) {
      toast.error('Please provide a package name.');
      return;
    }

    if (currentItems.length === 0) {
      toast.error('No valid line items to save as a package.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await saveQuotationAsPackageAction({
        name: packageName.trim(),
        description: packageDescription.trim() || null,
        items: currentItems.map((it) => ({
          itemName: it.itemName.trim(),
          description: it.description || null,
          quantity: Math.max(1, Number(it.quantity) || 1),
          unitPrice: Math.max(0, Number(it.unitPrice) || 0),
          serviceComponentId: it.serviceComponentId || null,
        })),
        tenantId,
        basePrice: totalBasePrice,
      });

      if (res.success) {
        toast.success(`Package "${packageName}" successfully saved to catalog!`);
        setIsOpen(false);
        onSuccess?.(res.package);
      } else {
        toast.error(res.error || 'Failed to save quotation as package.');
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred while saving the package.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenAttempt}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            className={`flex items-center gap-1.5 text-xs text-foreground font-medium hover:text-primary hover:border-primary/50 transition-all ${className || ''}`}
          >
            <BookmarkPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Save as New Package</span>
          </Button>
        }
      />

      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSave} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <PackageCheck className="w-5 h-5 text-emerald-600" />
              Save as New Package Template
            </DialogTitle>
            <DialogDescription>
              Convert these current quotation line items into a reusable package template for your
              studio catalog.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="pkg-name" className="text-xs font-semibold">
                Package Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pkg-name"
                placeholder="e.g. Royal Candid Photography Combo"
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                className="text-sm h-9"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pkg-desc" className="text-xs font-semibold">
                Description / Notes <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Textarea
                id="pkg-desc"
                placeholder="Included cameras, delivery timeline, or special terms..."
                value={packageDescription}
                onChange={(e) => setPackageDescription(e.target.value)}
                rows={2}
                className="text-xs resize-y"
              />
            </div>

            {/* Included Items Preview */}
            <div className="rounded-md border bg-muted/40 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold border-b pb-1.5">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Layers className="w-3.5 h-3.5" />
                  Line Items to Bundle ({currentItems.length})
                </span>
                <span className="text-foreground">
                  Total: {formatMoney(totalBasePrice)}
                </span>
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1 text-xs pr-1">
                {currentItems.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between py-0.5 text-muted-foreground">
                    <span className="truncate max-w-[240px] font-medium text-foreground">
                      {it.itemName} <span className="text-[11px] text-muted-foreground font-normal">(x{it.quantity || 1})</span>
                    </span>
                    <span className="font-mono text-xs font-semibold">
                      {formatMoney((Number(it.quantity) || 1) * (Number(it.unitPrice) || 0))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !packageName.trim()}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving Package...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Save Package Template
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
