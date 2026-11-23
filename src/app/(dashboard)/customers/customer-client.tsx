'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createCustomer, updateCustomer, deleteCustomer } from '@/actions/customer.actions';
import { toast } from 'sonner';

export function CustomerClient({ initialData, states, cities }: { initialData: any[], states: any[], cities: any[] }) {
  const [data, setData] = React.useState(initialData);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState<Record<string, any>>({});
  const [loading, setLoading] = React.useState(false);

  const handleOpenDialog = (record?: any) => {
    if (record) {
      setEditingId(record.id);
      setFormData(record);
    } else {
      setEditingId(null);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        stateId: '',
        cityId: ''
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (editingId) {
        const res = await updateCustomer(editingId, formData);
        if (res.success) {
          toast.success("Updated successfully");
          setData(data.map(item => item.id === editingId ? res.data : item));
        } else {
          toast.error(res.error || "Failed to update");
        }
      } else {
        const res = await createCustomer(formData);
        if (res.success) {
          toast.success("Created successfully");
          setData([res.data, ...data]);
        } else {
          toast.error(res.error || "Failed to create");
        }
      }
      setIsDialogOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;
    const res = await deleteCustomer(id);
    if (res.success) {
      toast.success("Deleted successfully");
      setData(data.filter(item => item.id !== id));
    } else {
      toast.error(res.error || "Failed to delete");
    }
  };

  // Filter cities by selected state
  const availableCities = formData.stateId 
    ? cities.filter(c => c.stateId === formData.stateId) 
    : cities;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" /> Add Customer
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Portal Access</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                  No confirmed customers found. Confirmed bookings will automatically appear here.
                </TableCell>
              </TableRow>
            )}
            {data.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-mono text-xs font-medium">
                  <Link
                    href={`/customers/${item.id}`}
                    className="hover:underline text-primary font-semibold"
                  >
                    {item.customerCode}
                  </Link>
                </TableCell>
                <TableCell className="font-medium">
                  <Link
                    href={`/customers/${item.id}`}
                    className="hover:underline hover:text-primary transition-colors flex items-center gap-1.5"
                  >
                    {item.firstName} {item.lastName}
                  </Link>
                </TableCell>
                <TableCell>{item.email || 'N/A'}</TableCell>
                <TableCell>{item.phone || 'N/A'}</TableCell>
                <TableCell>
                  {item.city?.name} {item.state?.name ? `, ${item.state.name}` : ''}
                </TableCell>
                <TableCell>
                  {item.portalAccessGranted ? (
                    <div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Active
                      </span>
                      {item.portalAccessCode && (
                        <div className="font-mono text-[10px] text-muted-foreground mt-0.5">
                          {item.portalAccessCode}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                      Pending
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/customers/${item.id}`} title="View 360 Profile">
                      <Button variant="ghost" size="icon" type="button">
                        <Eye className="w-4 h-4 text-primary" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item)} title="Edit Details">
                      <Edit className="w-4 h-4 text-blue-500" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} title="Delete Customer">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit' : 'Add'} Customer</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name <span className="text-red-500">*</span></Label>
              <Input 
                id="firstName"
                value={formData.firstName || ''}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name <span className="text-red-500">*</span></Label>
              <Input 
                id="lastName"
                value={formData.lastName || ''}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="email">Email Address</Label>
              <Input 
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input 
                id="phone"
                value={formData.phone || ''}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label>State</Label>
              <Select 
                value={formData.stateId || ''} 
                onValueChange={(val) => setFormData({...formData, stateId: val, cityId: ''})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select State" />
                </SelectTrigger>
                <SelectContent>
                  {states.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>City</Label>
              <Select 
                value={formData.cityId || ''} 
                onValueChange={(val) => setFormData({...formData, cityId: val})}
                disabled={!formData.stateId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select City" />
                </SelectTrigger>
                <SelectContent>
                  {availableCities.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading || !formData.firstName || !formData.lastName}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
