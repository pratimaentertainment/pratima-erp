'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TenantUpdateInput, tenantUpdateSchema } from '@/lib/validations/tenant.schema';
import { updateTenantProfileAction } from '@/actions/tenant.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Star, Sparkles, Building2 } from 'lucide-react';
import { TenantGmbConnector } from '@/components/forms/tenant-gmb-connector';

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
      gmbPlaceId: initialData?.gmbPlaceId || '',
      isActive: initialData?.isActive ?? true,
    },
  });

  async function onSubmit(data: TenantUpdateInput) {
    setLoading(true);
    const result = await updateTenantProfileAction(data);
    setLoading(false);

    if (result.success) {
      toast.success('Tenant profile & GMB configuration updated successfully');
    } else {
      toast.error(result.error || 'Failed to update profile');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* 1. Main Company Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              <span>Company Details</span>
            </CardTitle>
            <CardDescription>Manage your main organization settings and business identity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tenant / Brand Name *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
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
                    <FormControl>
                      <Input {...field} value={field.value || ''} />
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
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} />
                    </FormControl>
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
                    <FormControl>
                      <Input {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} placeholder="https://yourstudio.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gstNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GST / Tax ID</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} />
                    </FormControl>
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
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
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
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} />
                    </FormControl>
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
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* 2. Google My Business (GMB) Integration Card */}
        <Card className="border-border/80 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-emerald-500 to-blue-500" />
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Star className="w-4 h-4 fill-amber-500" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <span>Google My Business Integration</span>
                    <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wider">
                      Local SEO & Reviews
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Connect your verified Google Business profile to automatically display 5-star reviews and public photos on your Storefront.
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="gmbPlaceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Google Business Location</FormLabel>
                  <FormControl>
                    <TenantGmbConnector
                      value={field.value}
                      onChange={(placeId) => {
                        field.onChange(placeId);
                      }}
                      studioName={form.watch('name') || initialData?.name || 'Studio'}
                    />
                  </FormControl>
                  <FormDescription className="text-[11px] leading-relaxed">
                    Search for your studio by name or paste your Google Maps link. Your public storefront will automatically fetch and display your highest-rated 5-star Google Reviews and public photos.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Zero Server Storage & Maximum SEO</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                By loading photos and reviews directly from Google&apos;s edge cache, your storefront loads with zero cloud storage bandwidth costs and signals high local relevance for Google Search and Maps rankings.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="submit" disabled={loading} className="px-6 font-semibold">
            {loading ? 'Saving Changes...' : 'Save Configuration'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
