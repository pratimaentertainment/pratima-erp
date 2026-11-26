import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function SuperAdminLoading() {
  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-pulse">
      {/* Super Admin Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-60 rounded-lg" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-36 rounded-lg" />
          <Skeleton className="h-9 w-40 rounded-lg" />
        </div>
      </div>

      {/* Platform SaaS Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border border-border/70 rounded-xl shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </CardHeader>
            <CardContent className="space-y-2 pt-1">
              <Skeleton className="h-8 w-24 rounded-md" />
              <Skeleton className="h-3 w-40 rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Studio Tenant Directory Table Skeleton */}
      <Card className="border border-border/70 rounded-xl shadow-xs">
        <CardHeader className="space-y-2 pb-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48 rounded-md" />
            <Skeleton className="h-9 w-56 rounded-lg" />
          </div>
          <Skeleton className="h-4 w-80 rounded-md" />
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="h-10 w-full bg-muted/40 rounded-lg flex items-center px-4 gap-4">
            <Skeleton className="h-4 w-1/5 rounded-md" />
            <Skeleton className="h-4 w-1/5 rounded-md" />
            <Skeleton className="h-4 w-1/5 rounded-md" />
            <Skeleton className="h-4 w-1/5 rounded-md" />
            <Skeleton className="h-4 w-1/5 rounded-md" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-16 w-full border-b border-border/40 flex items-center px-4 gap-4"
            >
              <Skeleton className="h-5 w-1/5 rounded-md" />
              <Skeleton className="h-4 w-1/5 rounded-md" />
              <Skeleton className="h-5 w-1/5 rounded-full" />
              <Skeleton className="h-4 w-1/5 rounded-md" />
              <Skeleton className="h-8 w-1/5 rounded-lg" />
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
