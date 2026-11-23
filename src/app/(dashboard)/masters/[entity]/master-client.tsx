'use client';

import * as React from 'react';
import { MasterConfig } from '@/lib/master-config';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { createMasterEntity, updateMasterEntity, deleteMasterEntity } from '@/actions/master.actions';
import { toast } from 'sonner';

export function MasterClient({ config, initialData }: { config: MasterConfig, initialData: any[] }) {
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
      // Initialize default values
      const defaults: Record<string, any> = {};
      config.fields.forEach(f => {
        if (f.type === 'boolean') defaults[f.name] = true;
        else if (f.type === 'number') defaults[f.name] = 0;
        else defaults[f.name] = '';
      });
      setFormData(defaults);
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Clean up formData based on config (convert types if necessary)
      const payload = { ...formData };
      config.fields.forEach(f => {
        if (f.type === 'number') payload[f.name] = parseFloat(payload[f.name] || '0');
      });

      if (editingId) {
        const res = await updateMasterEntity(config.entity, editingId, payload);
        if (res.success) {
          toast.success("Updated successfully");
          setData(data.map(item => item.id === editingId ? { ...item, ...payload } : item));
        } else {
          toast.error(res.error || "Failed to update");
        }
      } else {
        const res = await createMasterEntity(config.entity, payload);
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
    if (!confirm("Are you sure you want to delete this record?")) return;
    const res = await deleteMasterEntity(config.entity, id);
    if (res.success) {
      toast.success("Deleted successfully");
      setData(data.filter(item => item.id !== id));
    } else {
      toast.error(res.error || "Failed to delete");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" /> Add {config.title}
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              {config.fields.map(f => (
                <TableHead key={f.name}>{f.label}</TableHead>
              ))}
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={config.fields.length + 1} className="text-center py-6 text-muted-foreground">
                  No records found.
                </TableCell>
              </TableRow>
            )}
            {data.map(item => (
              <TableRow key={item.id}>
                {config.fields.map(f => (
                  <TableCell key={f.name}>
                    {f.type === 'boolean' ? (item[f.name] ? 'Yes' : 'No') : String(item[f.name] ?? '')}
                  </TableCell>
                ))}
                <TableCell className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item)}>
                    <Edit className="w-4 h-4 text-blue-500" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit' : 'Add'} {config.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {config.fields.map(f => (
              <div key={f.name} className="flex flex-col gap-2">
                <Label htmlFor={f.name}>{f.label} {f.required && <span className="text-red-500">*</span>}</Label>
                {f.type === 'boolean' ? (
                  <Switch 
                    id={f.name} 
                    checked={formData[f.name] || false}
                    onCheckedChange={(c) => setFormData({...formData, [f.name]: c})}
                  />
                ) : (
                  <Input 
                    id={f.name}
                    type={f.type === 'number' ? 'number' : f.type === 'color' ? 'color' : 'text'}
                    value={formData[f.name] || ''}
                    onChange={(e) => setFormData({...formData, [f.name]: e.target.value})}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
