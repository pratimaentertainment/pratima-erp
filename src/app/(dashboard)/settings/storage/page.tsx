import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getStorageIntegrationsAction } from '@/actions/storage.actions';
import { StorageIntegrationClient } from './storage-integration-client';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export const metadata = {
  title: 'Cloud Storage (BYOS) | Pratima ERP',
  description: 'Connect your own Google Drive, AWS S3, or Cloudflare R2 storage accounts.',
};

export default async function StorageSettingsPage() {
  const session = await auth();
  const user = session?.user as any;

  if (!user?.tenantId) {
    redirect('/login');
  }

  const result = await getStorageIntegrationsAction();
  const initialIntegrations = result.success && result.data ? (result.data as any[]) : [];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/settings"
          className="p-2 border rounded-lg hover:bg-accent transition-colors"
          title="Back to Settings"
        >
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cloud Storage (BYOS)</h1>
          <p className="text-muted-foreground mt-1">
            Bring Your Own Storage: Connect AWS S3, Cloudflare R2, or Google Drive for media, album delivery, and raw assets.
          </p>
        </div>
      </div>

      <StorageIntegrationClient initialIntegrations={initialIntegrations} />
    </div>
  );
}
