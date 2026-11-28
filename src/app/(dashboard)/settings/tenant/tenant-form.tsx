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
import { Star, Sparkles, Building2, Film, Plus, Trash2, Video, Play } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
      defaultPromoVideoUrl: initialData?.defaultPromoVideoUrl || '',
      storefrontMedia: initialData?.storefrontMedia || { videos: [], featuredPhotos: [] },
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

  const storefrontMedia = form.watch('storefrontMedia') || { videos: [], featuredPhotos: [] };
  const videos: Array<{ id: string; title: string; url: string; category: string }> = storefrontMedia.videos || [];

  const handleAddVideo = () => {
    if (videos.length >= 6) {
      toast.error('You can add up to 6 featured videos.');
      return;
    }
    const newVideos = [
      ...videos,
      {
        id: `vid-${Date.now()}`,
        title: 'Wedding Highlights',
        url: '',
        category: 'Weddings',
      },
    ];
    form.setValue(
      'storefrontMedia',
      {
        ...storefrontMedia,
        videos: newVideos,
      },
      { shouldDirty: true }
    );
  };

  const handleRemoveVideo = (index: number) => {
    const newVideos = videos.filter((_, idx) => idx !== index);
    form.setValue(
      'storefrontMedia',
      {
        ...storefrontMedia,
        videos: newVideos,
      },
      { shouldDirty: true }
    );
  };

  const handleUpdateVideo = (index: number, field: string, value: string) => {
    const newVideos = [...videos];
    newVideos[index] = { ...newVideos[index], [field]: value };
    form.setValue(
      'storefrontMedia',
      {
        ...storefrontMedia,
        videos: newVideos,
      },
      { shouldDirty: true }
    );
  };

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

        {/* 3. Storefront Videos & Featured Media Card */}
        <Card className="border-border/80 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500" />
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Film className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <span>Storefront Videos & Featured Media</span>
                    <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wider">
                      Reels & YouTube
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Showcase cinematic wedding films, teasers, and Instagram Reels directly on your public studio storefront.
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Primary Promo Video URL */}
            <FormField
              control={form.control}
              name="defaultPromoVideoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Primary Featured Hero Film URL</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ''}
                      placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                      className="text-xs h-9"
                    />
                  </FormControl>
                  <FormDescription className="text-[11px] leading-relaxed">
                    Paste a YouTube link or Instagram Reel URL to feature as the centerpiece film trailer on your storefront banner.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Featured Videos List */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-purple-500" />
                    <span>Featured Films & Reels Showcase ({videos.length}/6)</span>
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Embed up to 6 YouTube videos or Instagram Reels across weddings, pre-wedding teasers, and portraits.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddVideo}
                  disabled={videos.length >= 6}
                  className="h-8 text-xs gap-1 border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Video</span>
                </Button>
              </div>

              {videos.length === 0 ? (
                <div className="p-6 rounded-xl border border-dashed border-border/80 text-center space-y-2 bg-muted/20">
                  <Play className="w-8 h-8 text-muted-foreground/60 mx-auto" />
                  <p className="text-xs font-medium text-foreground">No featured films or reels added yet</p>
                  <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                    Click &quot;Add Video&quot; above to embed YouTube cinematic highlights or Instagram Reels directly onto your public portfolio.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {videos.map((vid, index) => (
                    <div
                      key={vid.id || `v-${index}`}
                      className="p-3.5 rounded-xl border border-border/70 bg-card/60 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <Film className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Video #{index + 1}</span>
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveVideo(index)}
                          className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                          title="Remove video"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <div className="sm:col-span-4 space-y-1">
                          <label className="text-[11px] font-medium text-muted-foreground">Title</label>
                          <Input
                            value={vid.title}
                            onChange={(e) => handleUpdateVideo(index, 'title', e.target.value)}
                            placeholder="e.g. Royal Udaipur Wedding Highlights"
                            className="text-xs h-8"
                          />
                        </div>

                        <div className="sm:col-span-3 space-y-1">
                          <label className="text-[11px] font-medium text-muted-foreground">Category</label>
                          <Select
                            value={vid.category || 'Weddings'}
                            onValueChange={(val) => handleUpdateVideo(index, 'category', val || 'Weddings')}
                          >
                            <SelectTrigger className="text-xs h-8">
                              <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Weddings">Weddings</SelectItem>
                              <SelectItem value="Pre-Wedding">Pre-Wedding</SelectItem>
                              <SelectItem value="Teasers">Teasers</SelectItem>
                              <SelectItem value="Reels">Reels</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="sm:col-span-5 space-y-1">
                          <label className="text-[11px] font-medium text-muted-foreground">
                            Video URL (YouTube / Instagram Reel)
                          </label>
                          <Input
                            value={vid.url}
                            onChange={(e) => handleUpdateVideo(index, 'url', e.target.value)}
                            placeholder="https://youtu.be/... or https://www.instagram.com/reel/..."
                            className="text-xs h-8"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/20 text-xs space-y-1 text-purple-950 dark:text-purple-200">
                <p className="font-semibold text-xs text-purple-900 dark:text-purple-100 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                  <span>Supports YouTube &amp; Instagram Reels</span>
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  YouTube standard links (<code>youtube.com/watch?v=...</code>), shortlinks (<code>youtu.be/...</code>), Shorts (<code>youtube.com/shorts/...</code>), and Instagram Reels (<code>instagram.com/reel/...</code>) are automatically transformed into fast, responsive embeds without consuming any ERP storage quota.
                </p>
              </div>
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
