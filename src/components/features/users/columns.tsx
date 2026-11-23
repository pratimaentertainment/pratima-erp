'use client';

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash, Key, UserCheck, UserX, Building2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toggleUserStatus, deleteUser, updateUser } from '@/actions/user.actions';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { UserForm } from './user-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const UserActionCell = ({ row, table }: { row: any, table: any }) => {
  const user = row.original;
  const roles = (table.options.meta as any)?.roles || [];
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const handleResetPassword = async () => {
    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }
    const res = await updateUser(user.id, { password: newPassword });
    if (res.success) {
      setResetOpen(false);
      setNewPassword('');
    } else {
      alert(res.error);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.id)}>
              Copy ID
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => window.location.href = `/users/${user.id}/branches`}>
            <Building2 className="mr-2 h-4 w-4" /> Assign Branches
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Edit className="mr-2 h-4 w-4" /> Edit User
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setResetOpen(true)}>
            <Key className="mr-2 h-4 w-4" /> Reset Password
          </DropdownMenuItem>
          {user.status === 'ACTIVE' ? (
            <DropdownMenuItem onClick={() => toggleUserStatus(user.id, 'INACTIVE')}>
              <UserX className="mr-2 h-4 w-4" /> Deactivate
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => toggleUserStatus(user.id, 'ACTIVE')}>
              <UserCheck className="mr-2 h-4 w-4" /> Activate
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => {
              if (confirm('Are you sure you want to delete this user?')) {
                deleteUser(user.id);
              }
            }}
          >
            <Trash className="mr-2 h-4 w-4" /> Delete User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent className="sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle>Edit User</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <UserForm roles={roles} user={user} onSuccess={() => setEditOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password for {user.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="password"
              placeholder="New Password (min 8 chars)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>Cancel</Button>
            <Button onClick={handleResetPassword}>Save Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const columns: ColumnDef<any>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'roles',
    header: 'Roles',
    cell: ({ row }) => {
      const roles = row.getValue('roles') as any[];
      return (
        <div className="flex gap-1 flex-wrap">
          {roles.map((r: any) => (
            <Badge key={r.roleId} variant="secondary">
              {r.role.name}
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      return (
        <Badge
          variant={
            status === 'ACTIVE'
              ? 'default'
              : status === 'INACTIVE'
              ? 'secondary'
              : 'destructive'
          }
        >
          {status}
        </Badge>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row, table }) => <UserActionCell row={row} table={table} />,
  },
];
