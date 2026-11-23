import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function TenantSettingsLoading() {
  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 max-w-6xl mx-auto animate-pulse">
      {/* Page Title Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-64 rounded-md" />
        <Skeleton className="h-4 w-96 rounded-md" />
      </div>

      {/* Tabs Skeleton */}
      <div className="flex gap-2 max-w-md">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 flex-1 rounded-lg" />
      </div>

      {/* Card Content Skeleton */}
      <Card className="border rounded-xl">
        <CardHeader className="space-y-2">
          <Skeleton className="h-6 w-56 rounded-md" />
          <Skeleton className="h-4 w-80 rounded-md" />
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-36 rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </div>

          {/* Logo Section Skeleton */}
          <div className="pt-4 border-t space-y-3">
            <Skeleton className="h-4 w-36 rounded-md" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>

          {/* Save Button Skeleton */}
          <div className="pt-4 border-t flex justify-end">
            <Skeleton className="h-10 w-36 rounded-md" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
