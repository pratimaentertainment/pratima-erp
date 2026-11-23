'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { roleSchema, cloneRoleSchema, RoleInput, CloneRoleInput } from '@/lib/validations/role.schema';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RoleColumnData } from './columns';
import { createRoleAction, updateRoleAction, cloneRoleAction } from '@/actions/role.actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { z } from 'zod';

type FormValues = {
  name: string;
  description?: string;
};

export function RoleForm({ 
  role, 
  isCloning,
  onSuccess 
}: { 
  role: RoleColumnData | null, 
  isCloning: boolean,
  onSuccess: () => void 
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(isCloning ? cloneRoleSchema : roleSchema) as any,
    defaultValues: {
      name: isCloning ? `${role?.name || ''} (Copy)` : role?.name || '',
      description: isCloning ? undefined : role?.description || '',
    },
  });

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    let res;

    if (isCloning && role) {
      res = await cloneRoleAction(role.id, data.name);
    } else if (role && !isCloning) {
      res = await updateRoleAction(role.id, data);
    } else {
      res = await createRoleAction(data);
    }

    setLoading(false);

    if (res.success) {
      toast.success(`Role ${isCloning ? 'cloned' : role ? 'updated' : 'created'} successfully`);
      form.reset();
      onSuccess();
      router.refresh();
    } else {
      toast.error(res.error);
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
              <FormLabel>Role Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Lead Photographer" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {!isCloning && (
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input placeholder="Optional description..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Role'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
