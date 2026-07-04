'use client';

import * as React from 'react';
import { useReactTable, getCoreRowModel, flexRender, getPaginationRowModel } from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RoleColumnData, columns } from './columns';
import { Button } from '@/components/ui/button';
import { RoleDrawer } from './role-drawer';
import { deleteRoleAction } from '@/app/actions/role.actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function RoleTable({ data }: { data: RoleColumnData[] }) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState<RoleColumnData | null>(null);
  const [isCloning, setIsCloning] = React.useState(false);

  const handleDelete = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role? This will remove it from all users.')) return;
    const res = await deleteRoleAction(roleId);
    if (res.success) {
      toast.success('Role deleted');
      router.refresh();
    } else {
      toast.error(res.error);
    }
  };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    meta: {
      onEdit: (role: RoleColumnData) => {
        setSelectedRole(role);
        setIsCloning(false);
        setDrawerOpen(true);
      },
      onClone: (role: RoleColumnData) => {
        setSelectedRole(role);
        setIsCloning(true);
        setDrawerOpen(true);
      },
      onDelete: handleDelete,
      onNavigate: (path: string) => router.push(path),
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Roles</h2>
        <Button onClick={() => {
          setSelectedRole(null);
          setIsCloning(false);
          setDrawerOpen(true);
        }}>
          Create Role
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No roles found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>

      <RoleDrawer 
        open={drawerOpen} 
        onOpenChange={setDrawerOpen} 
        role={selectedRole} 
        isCloning={isCloning}
      />
    </div>
  );
}
