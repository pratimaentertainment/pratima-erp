'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { 
  Package as PackageIcon, 
  Search, 
  Plus, 
  Check, 
  Loader2, 
  Layers, 
  Tag, 
  Sparkles 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { getActivePackagesWithItemsAction } from '@/actions/package.actions';
import { formatMoney } from '@/lib/currency';

export interface PackagePickerItem {
  packageId?: string | null;
  itemName: string;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  discountType: 'PERCENTAGE' | 'FIXED' | 'NONE';
  discountValue: number;
}

export interface PackagePickerProps {
  /**
   * The append method from useFieldArray({ control, name: 'items' }).
   * Adds the package items to the existing items without clearing them.
   */
  append: (item: PackagePickerItem) => void;
  tenantId?: string;
  onPackageSelected?: (pkg: any) => void;
  className?: string;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
  buttonLabel?: string;
}

export function PackagePicker({
  append,
  tenantId,
  onPackageSelected,
  className,
  disabled = false,
  variant = 'outline',
  size = 'sm',
  buttonLabel = 'Add from Package Catalog',
}: PackagePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [packages, setPackages] = React.useState<any[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedPackageId, setSelectedPackageId] = React.useState<string | null>(null);

  // Fetch active packages on dialog open
  const fetchPackages = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await getActivePackagesWithItemsAction(tenantId);
      setPackages(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error('Failed to load packages catalog.');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  React.useEffect(() => {
    if (isOpen) {
      fetchPackages();
    }
  }, [isOpen, fetchPackages]);

  // Filter packages by search query
  const filteredPackages = React.useMemo(() => {
    if (!searchQuery.trim()) return packages;
    const q = searchQuery.toLowerCase().trim();
    return packages.filter((pkg) => {
      const name = pkg.name?.toLowerCase() || '';
      const code = pkg.packageCode?.toLowerCase() || '';
      const category = pkg.category?.name?.toLowerCase() || pkg.categoryName?.toLowerCase() || '';
      const notes = pkg.notes?.toLowerCase() || '';
      return name.includes(q) || code.includes(q) || category.includes(q) || notes.includes(q);
    });
  }, [packages, searchQuery]);

  // Handle selection and append items without clearing existing
  const handleSelectPackage = (pkg: any) => {
    setSelectedPackageId(pkg.id);
    let itemsAppendedCount = 0;

    // Case 1: Package has configured items with service components
    if (pkg.items && pkg.items.length > 0) {
      pkg.items.forEach((item: any) => {
        append({
          packageId: pkg.id,
          itemName: item.serviceComponent?.name || item.description || pkg.name,
          description: item.description || item.serviceComponent?.description || null,
          quantity: Math.max(1, Number(item.quantity) || 1),
          unitPrice: Math.max(0, Number(item.priceOverride ?? item.unitPrice ?? 0)),
          discountType: 'NONE',
          discountValue: 0,
        });
        itemsAppendedCount++;
      });
    } 
    // Case 2: Package has deliverables configured
    else if (pkg.deliverables && pkg.deliverables.length > 0) {
      pkg.deliverables.forEach((del: any, idx: number) => {
        append({
          packageId: pkg.id,
          itemName: del.itemName,
          description: idx === 0 ? pkg.notes || null : null,
          quantity: Math.max(1, Number(del.quantity) || 1),
          unitPrice: idx === 0 ? Math.max(0, Number(pkg.basePrice) || 0) : 0,
          discountType: 'NONE',
          discountValue: 0,
        });
        itemsAppendedCount++;
      });
    } 
    // Case 3: Package has base price and notes only
    else {
      append({
        packageId: pkg.id,
        itemName: pkg.name,
        description: pkg.notes || null,
        quantity: 1,
        unitPrice: Math.max(0, Number(pkg.basePrice) || 0),
        discountType: 'NONE',
        discountValue: 0,
      });
      itemsAppendedCount = 1;
    }

    toast.success(`Appended ${pkg.name} (${itemsAppendedCount} line item${itemsAppendedCount > 1 ? 's' : ''}) to quotation`);
    onPackageSelected?.(pkg);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant={variant}
            size={size}
            disabled={disabled}
            className={`flex items-center gap-1.5 ${className || ''}`}
          >
            <PackageIcon className="w-4 h-4 text-primary shrink-0" />
            <span>{buttonLabel}</span>
          </Button>
        }
      />

      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <PackageIcon className="w-5 h-5 text-primary" />
            Select Package Template
          </DialogTitle>
          <DialogDescription>
            Choose a package to append its bundled deliverables and rates into your quotation.
            Existing line items will not be overwritten.
          </DialogDescription>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative my-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by package name, code, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>

        {/* Packages List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 py-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-sm">Loading studio packages...</span>
            </div>
          ) : filteredPackages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2 border border-dashed rounded-lg">
              <PackageIcon className="w-8 h-8 opacity-40" />
              <span className="text-sm font-medium">No packages found</span>
              <p className="text-xs text-muted-foreground/80 max-w-sm text-center">
                {searchQuery
                  ? 'No packages matched your search query. Try different keywords.'
                  : 'No active packages are currently configured for this studio.'}
              </p>
            </div>
          ) : (
            filteredPackages.map((pkg) => {
              const itemCount = pkg.items?.length || pkg.deliverables?.length || 1;
              const hasDeliverables = (pkg.deliverables && pkg.deliverables.length > 0) || (pkg.items && pkg.items.length > 0);

              return (
                <div
                  key={pkg.id}
                  onClick={() => handleSelectPackage(pkg)}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between p-3.5 border rounded-lg hover:border-primary/50 hover:bg-muted/40 transition-all cursor-pointer gap-3"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {pkg.packageCode}
                      </span>
                      <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                        {pkg.name}
                      </h4>
                      {pkg.category?.name && (
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-medium">
                          {pkg.category.name}
                        </Badge>
                      )}
                    </div>

                    {pkg.notes && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {pkg.notes}
                      </p>
                    )}

                    {hasDeliverables && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                          <Layers className="w-3 h-3 text-muted-foreground/70" />
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}:
                        </span>
                        {pkg.deliverables?.slice(0, 3).map((d: any, i: number) => (
                          <span
                            key={i}
                            className="inline-flex items-center text-[10px] bg-background border px-1.5 py-0.5 rounded text-muted-foreground"
                          >
                            {d.itemName} ({d.quantity}x)
                          </span>
                        ))}
                        {pkg.items?.slice(0, 3).map((it: any, i: number) => (
                          <span
                            key={i}
                            className="inline-flex items-center text-[10px] bg-background border px-1.5 py-0.5 rounded text-muted-foreground"
                          >
                            {it.serviceComponent?.name || it.description} ({it.quantity}x)
                          </span>
                        ))}
                        {(pkg.deliverables?.length || pkg.items?.length || 0) > 3 && (
                          <span className="text-[10px] text-muted-foreground/80 font-medium">
                            +{(pkg.deliverables?.length || pkg.items?.length || 0) - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 gap-1 shrink-0">
                    <div className="text-sm font-bold text-foreground">
                      {formatMoney(Number(pkg.basePrice) || 0)}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2.5 text-xs group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Add to Quote
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
