'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { createPackageAction, updatePackageAction } from '@/actions/package.actions';
import { toast } from 'sonner';

export function PackageFormClient({ 
  categories, 
  taxRates, 
  serviceComponents, 
  initialData = null 
}: { 
  categories: any[], 
  taxRates: any[], 
  serviceComponents: any[],
  initialData?: any 
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: initialData?.name || '',
    categoryId: initialData?.categoryId || '',
    taxRateId: initialData?.taxRateId || 'none',
    basePrice: initialData?.basePrice?.toString() || '0',
    notes: initialData?.notes || '',
    isActive: initialData ? initialData.isActive : true,
    items: initialData?.items?.map((i: any) => ({
      serviceComponentId: i.serviceComponentId,
      quantity: i.quantity,
      unitPrice: i.unitPrice?.toString(),
      priceOverride: i.priceOverride?.toString() || '',
      description: i.description || ''
    })) || []
  });

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { serviceComponentId: '', quantity: 1, unitPrice: '0', priceOverride: '', description: '' }
      ]
    });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.categoryId || formData.items.length === 0) {
      toast.error('Please fill all required fields and add at least one item.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        basePrice: parseFloat(formData.basePrice) || 0,
        taxRateId: formData.taxRateId === 'none' ? null : formData.taxRateId,
        items: formData.items.map((i: any) => ({
          serviceComponentId: i.serviceComponentId,
          quantity: parseInt(i.quantity, 10),
          unitPrice: parseFloat(i.unitPrice) || 0,
          priceOverride: i.priceOverride ? parseFloat(i.priceOverride) : null,
          description: i.description || null
        }))
      };

      if (initialData) {
        await updatePackageAction(initialData.id, payload);
        toast.success("Package updated successfully");
      } else {
        await createPackageAction(payload);
        toast.success("Package created successfully");
      }
      router.push('/sales/packages');
    } catch (err: any) {
      toast.error(err.message || "Failed to save package");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-8">
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4 border p-4 rounded-md bg-white">
          <h2 className="text-lg font-semibold">Basic Information</h2>
          <div className="space-y-2">
            <Label>Package Name <span className="text-red-500">*</span></Label>
            <Input 
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category <span className="text-red-500">*</span></Label>
              <Select value={formData.categoryId} onValueChange={v => setFormData({ ...formData, categoryId: v })}>
                <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tax Rate</Label>
              <Select value={formData.taxRateId} onValueChange={v => setFormData({ ...formData, taxRateId: v })}>
                <SelectTrigger><SelectValue placeholder="No Tax" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Tax</SelectItem>
                  {taxRates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name} ({Number(t.rate)}%)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Base Price (₹) <span className="text-red-500">*</span></Label>
            <Input 
              type="number"
              min="0"
              step="0.01"
              value={formData.basePrice}
              onChange={e => setFormData({ ...formData, basePrice: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea 
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-4 border p-4 rounded-md bg-white">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Service Components <span className="text-red-500">*</span></h2>
            <Button type="button" size="sm" variant="outline" onClick={handleAddItem}>
              <Plus className="w-4 h-4 mr-2" /> Add Item
            </Button>
          </div>
          
          <div className="space-y-4">
            {formData.items.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-4">
                No items added. Click &apos;Add Item&apos; to configure package services.
              </div>
            )}
            {formData.items.map((item: any, index: number) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end border-b pb-4">
                <div className="col-span-4 space-y-1">
                  <Label className="text-xs">Component</Label>
                  <Select 
                    value={item.serviceComponentId} 
                    onValueChange={v => handleItemChange(index, 'serviceComponentId', v)}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {serviceComponents.map(sc => (
                        <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Qty</Label>
                  <Input 
                    type="number" min="1" className="h-8 text-xs"
                    value={item.quantity}
                    onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Unit Px</Label>
                  <Input 
                    type="number" min="0" step="0.01" className="h-8 text-xs"
                    value={item.unitPrice}
                    onChange={e => handleItemChange(index, 'unitPrice', e.target.value)}
                  />
                </div>
                <div className="col-span-3 space-y-1">
                  <Label className="text-xs">Override Px (Opt)</Label>
                  <Input 
                    type="number" min="0" step="0.01" className="h-8 text-xs"
                    value={item.priceOverride}
                    onChange={e => handleItemChange(index, 'priceOverride', e.target.value)}
                  />
                </div>
                <div className="col-span-1 text-right">
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleRemoveItem(index)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="col-span-12">
                  <Input 
                    placeholder="Optional description for this component..." 
                    className="h-8 text-xs"
                    value={item.description}
                    onChange={e => handleItemChange(index, 'description', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Package'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/sales/packages')}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
