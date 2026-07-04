'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Building } from 'lucide-react';
import { BranchDrawer } from './branch-drawer';

export function BranchTable({ data }: { data: any[] }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<any>(null);

  const openCreate = () => {
    setSelectedBranch(null);
    setDrawerOpen(true);
  };

  const openEdit = (branch: any) => {
    setSelectedBranch(branch);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Branch
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Branch Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">No branches found.</TableCell>
              </TableRow>
            ) : (
              data.map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      {branch.isHeadOffice && <Building className="h-4 w-4 text-primary" />}
                      <span>{branch.name}</span>
                      {branch.isHeadOffice && <Badge variant="outline" className="ml-2">Head Office</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>{branch.code || '-'}</TableCell>
                  <TableCell>{branch.city || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={branch.isActive ? 'default' : 'secondary'}>
                      {branch.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" onClick={() => openEdit(branch)}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <BranchDrawer 
        open={drawerOpen} 
        onOpenChange={setDrawerOpen} 
        branch={selectedBranch} 
      />
    </div>
  );
}
