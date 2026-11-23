'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRouter } from 'next/navigation';

export function PackageDetailClient({ pkg }: { pkg: any }) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex gap-4 mb-4">
        <Button variant="outline" onClick={() => router.push('/sales/packages')}>Back to Packages</Button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="border rounded-md p-6 bg-white shadow-sm space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">Package Information</h2>
          <div className="grid grid-cols-2 gap-y-4 text-sm">
            <div>
              <p className="text-muted-foreground">Code</p>
              <p className="font-medium">{pkg.packageCode}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Name</p>
              <p className="font-medium">{pkg.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Category</p>
              <p className="font-medium">{pkg.category?.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${pkg.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {pkg.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div>
              <p className="text-muted-foreground">Version</p>
              <p className="font-medium">v{pkg.version}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Tax Rate</p>
              <p className="font-medium">{pkg.taxRate ? `${pkg.taxRate.name} (${Number(pkg.taxRate.rate)}%)` : 'No Tax'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground">Notes</p>
              <p className="font-medium whitespace-pre-line">{pkg.notes || 'None'}</p>
            </div>
          </div>
        </div>

        <div className="border rounded-md p-6 bg-white shadow-sm flex flex-col justify-center items-center text-center space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2 w-full text-left">Summary</h2>
          <div className="flex justify-between w-full px-8 py-2">
            <span className="text-muted-foreground">Base Price (Fixed):</span>
            <span className="font-medium">₹{Number(pkg.basePrice).toFixed(2)}</span>
          </div>
          <div className="flex justify-between w-full px-8 py-2 border-t">
            <span className="text-muted-foreground">Items Subtotal:</span>
            <span className="font-medium">₹{Number(pkg.totals.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between w-full px-8 py-2">
            <span className="text-muted-foreground">Tax Amount:</span>
            <span className="font-medium">₹{Number(pkg.totals.taxAmount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between w-full px-8 py-4 bg-gray-50 border rounded-md">
            <span className="font-bold text-lg">Total Amount:</span>
            <span className="font-bold text-lg text-blue-700">₹{Number(pkg.totals.totalAmount).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="border rounded-md bg-white shadow-sm">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold">Service Components</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service Component</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Effective Unit Price</TableHead>
              <TableHead className="text-right font-bold">Line Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pkg.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                  No components in this package.
                </TableCell>
              </TableRow>
            )}
            {pkg.items.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.serviceComponent?.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{item.description || '-'}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">
                  ₹{Number(item.effectivePrice).toFixed(2)}
                  {item.priceOverride !== null && <span className="ml-2 text-xs text-orange-500 font-semibold">(Override)</span>}
                </TableCell>
                <TableCell className="text-right font-bold">₹{Number(item.lineTotal).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

    </div>
  );
}
