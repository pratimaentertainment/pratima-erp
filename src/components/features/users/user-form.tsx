 
 
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userSchema, UserFormValues } from '@/lib/validations/user.schema';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { createUser, updateUser } from '@/actions/user.actions';

interface UserFormProps {
  roles: any[];
  user?: any;
  onSuccess: () => void;
}

export function UserForm({ roles, user, onSuccess }: UserFormProps) {
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      password: '',
      roles: user?.roles?.map((r: any) => r.roleId) || [],
      branches: user?.branches?.map((b: any) => b.branchId) || [],
      status: user?.status || 'PENDING_INVITATION',
    },
  });

  const onSubmit = async (data: UserFormValues) => {
    // Basic implementation for now - roles and branches are hardcoded if missing in UI form
    if (data.roles.length === 0 && roles.length > 0) {
      data.roles = [roles[0].id];
    }
    // Branches are optional for MVP if not provided in UI
    data.branches = [];
    
    let res;
    if (user) {
      res = await updateUser(user.id, data);
    } else {
      res = await createUser(data);
    }
    
    if (res.success) {
      onSuccess();
    } else {
      alert(res.error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="john@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="roles"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <FormControl>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={field.value[0] || ''}
                  onChange={(e) => field.onChange(e.target.value ? [e.target.value] : [])}
                >
                  <option value="" disabled>Select a role...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          Create User
        </Button>
      </form>
    </Form>
  );
}
