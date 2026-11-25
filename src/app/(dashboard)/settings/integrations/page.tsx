import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getIntegrationsAction } from '@/actions/integration.actions';
import { IntegrationClient } from './integration-client';
import { FeatureLockGate } from '@/components/billing/feature-lock-gate';
import { getTenantEntitlements } from '@/services/billing/entitlement.service';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export const metadata = {
  title: 'Omnichannel Lead Integrations | FRAMIQ',
  description: 'Connect Facebook Ads, Instagram, Google Ads, Zapier, and custom webhooks to your CRM.',
};

export default async function IntegrationsSettingsPage() {
  const session = await auth();
  const user = session?.user as any;

  if (!user?.tenantId) {
    redirect('/login');
  }

  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  let isUnlocked = isSuperAdmin;
  if (!isUnlocked && user.tenantId) {
    const entitlements = await getTenantEntitlements(user.tenantId);
    isUnlocked = entitlements.features.includes('META_LEADS');
  }

  const result = await getIntegrationsAction();
  const initialIntegrations = result.success && result.data ? (result.data as any[]) : [];

  const headersList = await headers();
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || 'localhost:3000';
  const proto = headersList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;

  return (
    <FeatureLockGate featureKey="META_LEADS" isUnlocked={isUnlocked}>
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
            <h1 className="text-3xl font-bold tracking-tight">Omnichannel Lead Integrations</h1>
            <p className="text-muted-foreground mt-1">
              Connect your studio ad campaigns, social media, Zapier, and custom landing page webhooks.
            </p>
          </div>
        </div>

        <IntegrationClient initialIntegrations={initialIntegrations} appUrl={appUrl} />
      </div>
    </FeatureLockGate>
  );
}
