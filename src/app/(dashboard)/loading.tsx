import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function DashboardLoading() {
  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 max-w-7xl mx-auto animate-pulse">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>

      {/* KPI Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border border-border/60 rounded-xl shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </CardHeader>
            <CardContent className="space-y-2 pt-1">
              <Skeleton className="h-7 w-28 rounded-md" />
              <Skeleton className="h-3 w-36 rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content / Table Skeleton */}
      <Card className="border border-border/60 rounded-xl shadow-xs">
        <CardHeader className="space-y-2 pb-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-40 rounded-md" />
            <Skeleton className="h-9 w-48 rounded-lg" />
          </div>
          <Skeleton className="h-4 w-64 rounded-md" />
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {/* Table Header */}
          <div className="h-10 w-full bg-muted/40 rounded-lg flex items-center px-4 gap-4">
            <Skeleton className="h-4 w-1/4 rounded-md" />
            <Skeleton className="h-4 w-1/4 rounded-md" />
            <Skeleton className="h-4 w-1/4 rounded-md" />
            <Skeleton className="h-4 w-1/4 rounded-md" />
          </div>

          {/* Table Rows */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-14 w-full border-b border-border/40 flex items-center px-4 gap-4"
            >
              <Skeleton className="h-4 w-1/4 rounded-md" />
              <Skeleton className="h-4 w-1/4 rounded-md" />
              <Skeleton className="h-4 w-1/4 rounded-md" />
              <Skeleton className="h-4 w-1/4 rounded-md" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
