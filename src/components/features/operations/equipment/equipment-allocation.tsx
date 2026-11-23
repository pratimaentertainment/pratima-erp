'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { checkoutEquipmentAction, returnEquipmentAction } from '@/actions/equipment.actions';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

export function EquipmentAllocation({ shootId, initialCheckouts, availableEquipment }: any) {
  const [selectedEquipment, setSelectedEquipment] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [returnLoading, setReturnLoading] = useState<string | null>(null);

  const handleCheckout = async () => {
    if (!selectedEquipment) return;

    setLoading(true);
    try {
      const res = await checkoutEquipmentAction({
        shootId,
        equipmentId: selectedEquipment,
      });

      if (res.success) {
        toast.success('Equipment allocated successfully');
        setSelectedEquipment('');
      } else {
        toast.error(res.error || 'Failed to allocate equipment');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error checking out equipment');
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async (checkoutId: string) => {
    setReturnLoading(checkoutId);
    try {
      const res = await returnEquipmentAction(checkoutId, shootId);

      if (res.success) {
        toast.success('Equipment returned successfully');
      } else {
        toast.error(res.error || 'Failed to return equipment');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error returning equipment');
    } finally {
      setReturnLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {initialCheckouts.length > 0 ? (
        <div className="border rounded-md divide-y text-sm">
          {initialCheckouts.map((checkout: any) => (
            <div key={checkout.id} className="flex justify-between items-center p-3">
              <div>
                <span className="font-medium">{checkout.equipment?.name}</span>
                <span className="text-muted-foreground ml-2 text-xs">
                  {checkout.equipment?.serialNumber ? `(S/N: ${checkout.equipment.serialNumber})` : ''}
                </span>
                <div className="text-xs text-muted-foreground mt-1">
                  Checked out: {format(new Date(checkout.checkedOutAt), 'MMM d, yyyy h:mm a')}
                  {checkout.returnedAt && ` • Returned: ${format(new Date(checkout.returnedAt), 'MMM d, yyyy h:mm a')}`}
                </div>
              </div>
              <div>
                {checkout.returnedAt ? (
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded-md">
                    Returned
                  </span>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleReturn(checkout.id)}
                    disabled={returnLoading === checkout.id}
                  >
                    {returnLoading === checkout.id && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                    Return
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">No equipment allocated to this shoot.</p>
      )}

      <div className="flex gap-3 pt-2">
        <Select value={selectedEquipment} onValueChange={(val) => setSelectedEquipment(val || '')}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select equipment to allocate..." />
          </SelectTrigger>
          <SelectContent>
            {availableEquipment.map((eq: any) => (
              <SelectItem key={eq.id} value={eq.id}>
                {eq.name} {eq.serialNumber ? `(${eq.serialNumber})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleCheckout} disabled={!selectedEquipment || loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Allocate
        </Button>
      </div>
    </div>
  );
}
