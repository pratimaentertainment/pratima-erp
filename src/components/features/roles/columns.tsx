'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from '@/components/ui/dropdown-menu';
import Link from 'next/link';

export type RoleColumnData = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  _count: { permissions: number; users: number };
};

export const columns: ColumnDef<RoleColumnData>[] = [
  {
    accessorKey: 'name',
    header: 'Role Name',
    cell: ({ row }) => {
      return (
        <div className="flex flex-col">
          <span className="font-medium">{row.getValue('name')}</span>
          {row.original.isSystem && (
            <Badge variant="secondary" className="w-fit mt-1 text-xs">System Role</Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'description',
    header: 'Description',
  },
  {
    id: 'users',
    header: 'Assigned Users',
    cell: ({ row }) => row.original._count.users,
  },
  {
    id: 'permissions',
    header: 'Permissions',
    cell: ({ row }) => row.original._count.permissions,
  },
  {
    id: 'actions',
    cell: ({ row, table }) => {
      const role = row.original;
      const meta = table.options.meta as {
        onEdit: (role: RoleColumnData) => void;
        onClone: (role: RoleColumnData) => void;
        onDelete: (roleId: string) => void;
        onNavigate: (path: string) => void;
      };

      return (
        <DropdownMenu>
          <DropdownMenuTrigger className={buttonVariants({ variant: 'ghost', className: 'h-8 w-8 p-0' })}>
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              {!role.isSystem && (
                <>
                  <DropdownMenuItem onClick={() => meta?.onEdit(role)}>
                    Edit Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => meta?.onNavigate(`/roles/${role.id}`)}>
                    Manage Permissions
                  </DropdownMenuItem>
                </>
              )}
              {role.isSystem && (
                <DropdownMenuItem onClick={() => meta?.onNavigate(`/roles/${role.id}`)}>
                  View Permissions
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => meta?.onClone(role)}>
                Clone Role
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {!role.isSystem && (
              <DropdownMenuItem 
                onClick={() => meta?.onDelete(role.id)}
                className="text-destructive focus:bg-destructive/10"
              >
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
