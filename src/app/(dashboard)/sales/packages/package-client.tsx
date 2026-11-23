'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Copy, Power, PowerOff, Eye } from 'lucide-react';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { clonePackageAction, activatePackageAction, deactivatePackageAction, deletePackageAction } from '@/actions/package.actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function PackageClient({ initialData, total }: { initialData: any[], total: number }) {
  const [data, setData] = React.useState(initialData);
  const [search, setSearch] = React.useState('');
  const router = useRouter();

  const handleSearch = () => {
    router.push(`/sales/packages?search=${search}`);
  };

  const handleClone = async (id: string) => {
    if (!confirm("Are you sure you want to clone this package?")) return;
    try {
      const res = await clonePackageAction(id);
      if (res) {
        toast.success("Cloned successfully");
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to clone");
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      if (isActive) {
        await deactivatePackageAction(id);
        toast.success("Package deactivated");
      } else {
        await activatePackageAction(id);
        toast.success("Package activated");
      }
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle status");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this package?")) return;
    try {
      await deletePackageAction(id);
      toast.success("Deleted successfully");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input 
          placeholder="Search packages by name, code, category..." 
          className="max-w-sm" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button onClick={handleSearch}>Search</Button>
        <Link href="/sales/packages/create">
          <Button variant="default">Create Package</Button>
        </Link>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Base Price</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                  No packages found.
                </TableCell>
              </TableRow>
            )}
            {data.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-mono text-xs">
                  <Link href={`/sales/packages/${item.id}`} className="text-blue-600 hover:underline">
                    {item.packageCode}
                  </Link>
                </TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.category?.name}</TableCell>
                <TableCell>₹{Number(item.basePrice).toFixed(2)}</TableCell>
                <TableCell>{item._count?.items || 0} items</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {item.isActive ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell className="flex gap-1">
                  <Link href={`/sales/packages/${item.id}`}>
                    <Button variant="ghost" size="icon" title="View">
                      <Eye className="w-4 h-4 text-blue-500" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={() => handleClone(item.id)} title="Clone">
                    <Copy className="w-4 h-4 text-purple-500" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleToggleActive(item.id, item.isActive)} title={item.isActive ? "Deactivate" : "Activate"}>
                    {item.isActive ? <PowerOff className="w-4 h-4 text-orange-500" /> : <Power className="w-4 h-4 text-green-500" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} title="Delete">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
