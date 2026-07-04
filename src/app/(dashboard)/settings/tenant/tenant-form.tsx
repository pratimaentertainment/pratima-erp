'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TenantUpdateInput, tenantUpdateSchema } from '@/lib/validations/tenant.schema';
import { updateTenantProfileAction } from '@/app/actions/tenant.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';

export function TenantForm({ initialData }: { initialData: any }) {
  const [loading, setLoading] = useState(false);

  const form = useForm<any>({
    resolver: zodResolver(tenantUpdateSchema),
    defaultValues: {
      name: initialData?.name || '',
      companyLegalName: initialData?.companyLegalName || '',
      tradeName: initialData?.tradeName || '',
      logoUrl: initialData?.logoUrl || '',
      gstNumber: initialData?.gstNumber || '',
      panNumber: initialData?.panNumber || '',
      cinNumber: initialData?.cinNumber || '',
      website: initialData?.website || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      country: initialData?.country || 'US',
      state: initialData?.state || '',
      city: initialData?.city || '',
      address: initialData?.address || '',
      postalCode: initialData?.postalCode || '',
      timezone: initialData?.timezone || 'UTC',
      currency: initialData?.currency || 'USD',
      language: initialData?.language || 'en',
      fiscalYearStartMonth: initialData?.fiscalYearStartMonth || 1,
      isActive: initialData?.isActive ?? true,
    }
  });

  async function onSubmit(data: TenantUpdateInput) {
    setLoading(true);
    const result = await updateTenantProfileAction(data);
    setLoading(false);

    if (result.success) {
      toast.success('Tenant profile updated successfully');
    } else {
      toast.error(result.error || 'Failed to update profile');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Details</CardTitle>
        <CardDescription>Manage your main organization settings</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tenant Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="companyLegalName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Legal Company Name</FormLabel>
                    <FormControl><Input {...field} value={field.value || ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl><Input {...field} value={field.value || ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl><Input {...field} value={field.value || ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gstNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GST / VAT Number</FormLabel>
                    <FormControl><Input {...field} value={field.value || ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="panNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PAN Number</FormLabel>
                    <FormControl><Input {...field} value={field.value || ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency Code</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timezone</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fiscalYearStartMonth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fiscal Year Start Month (1-12)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" disabled={loading} className="mt-4">
              {loading ? 'Saving...' : 'Save Profile'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
