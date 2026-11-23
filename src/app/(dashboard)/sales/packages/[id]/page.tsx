import { getPackageAction } from '@/actions/package.actions';
import { PackageDetailClient } from './package-detail-client';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PackageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pkg = await getPackageAction(id);

  if (!pkg) {
    notFound();
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Package Details</h1>
        <p className="text-muted-foreground">View and manage package configuration.</p>
      </div>
      <PackageDetailClient pkg={pkg} />
    </div>
  );
}
