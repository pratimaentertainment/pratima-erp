import Link from 'next/link';
import { Building2, Network, Users, FileText, Cloud, Share2, CreditCard, ShieldCheck } from 'lucide-react';
import { buildContextAndAuthorize } from '@/lib/application/utils/context';

export default async function SettingsPage() {
  await buildContextAndAuthorize('Tenants:View');
  
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your organization's core configuration and security.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link 
          href="/settings/billing" 
          className="flex flex-col gap-3 p-6 border rounded-xl hover:border-primary hover:shadow-sm transition-all bg-card text-card-foreground group border-primary/40 ring-1 ring-primary/20"
        >
          <div className="p-3 bg-primary/10 w-fit rounded-lg group-hover:bg-primary/20 transition-colors">
            <CreditCard className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">SaaS Billing &amp; Plans</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded">Razorpay</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Manage active subscription plans, upgrade tiers, quotas, and GST tax invoices.</p>
          </div>
        </Link>

        <Link 
          href="/profile/security" 
          className="flex flex-col gap-3 p-6 border rounded-xl hover:border-primary hover:shadow-sm transition-all bg-card text-card-foreground group border-emerald-500/30 ring-1 ring-emerald-500/10"
        >
          <div className="p-3 bg-emerald-500/10 w-fit rounded-lg group-hover:bg-emerald-500/20 transition-colors">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Login Password &amp; Security</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded">Verified 2FA</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Manage login credentials, 6-digit email verification OTPs, and active login sessions.</p>
          </div>
        </Link>

        <Link 
          href="/settings/tenant" 
          className="flex flex-col gap-3 p-6 border rounded-xl hover:border-primary hover:shadow-sm transition-all bg-card text-card-foreground group"
        >
          <div className="p-3 bg-primary/10 w-fit rounded-lg group-hover:bg-primary/20 transition-colors">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Tenant Profile</h2>
            <p className="text-sm text-muted-foreground mt-1">Manage global organization details and defaults.</p>
          </div>
        </Link>

        <Link 
          href="/settings/branches" 
          className="flex flex-col gap-3 p-6 border rounded-xl hover:border-primary hover:shadow-sm transition-all bg-card text-card-foreground group"
        >
          <div className="p-3 bg-primary/10 w-fit rounded-lg group-hover:bg-primary/20 transition-colors">
            <Network className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Branches</h2>
            <p className="text-sm text-muted-foreground mt-1">Configure and manage organizational branches.</p>
          </div>
        </Link>

        <Link 
          href="/settings/team" 
          className="flex flex-col gap-3 p-6 border rounded-xl hover:border-primary hover:shadow-sm transition-all bg-card text-card-foreground group"
        >
          <div className="p-3 bg-primary/10 w-fit rounded-lg group-hover:bg-primary/20 transition-colors">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Team & Roster</h2>
            <p className="text-sm text-muted-foreground mt-1">Manage in-house crew, freelance talent, skills, and equipment.</p>
          </div>
        </Link>

        <Link 
          href="/settings/agreements" 
          className="flex flex-col gap-3 p-6 border rounded-xl hover:border-primary hover:shadow-sm transition-all bg-card text-card-foreground group"
        >
          <div className="p-3 bg-primary/10 w-fit rounded-lg group-hover:bg-primary/20 transition-colors">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Contract Templates</h2>
            <p className="text-sm text-muted-foreground mt-1">Design master NDA, service agreements, and quotation terms with smart tags.</p>
          </div>
        </Link>

        <Link 
          href="/settings/storage" 
          className="flex flex-col gap-3 p-6 border rounded-xl hover:border-primary hover:shadow-sm transition-all bg-card text-card-foreground group"
        >
          <div className="p-3 bg-primary/10 w-fit rounded-lg group-hover:bg-primary/20 transition-colors">
            <Cloud className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Cloud Storage (BYOS)</h2>
            <p className="text-sm text-muted-foreground mt-1">Connect your Google Drive, AWS S3, or Cloudflare R2 for asset delivery.</p>
          </div>
        </Link>

        <Link 
          href="/settings/integrations" 
          className="flex flex-col gap-3 p-6 border rounded-xl hover:border-primary hover:shadow-sm transition-all bg-card text-card-foreground group"
        >
          <div className="p-3 bg-primary/10 w-fit rounded-lg group-hover:bg-primary/20 transition-colors">
            <Share2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Lead Integrations & Webhooks</h2>
            <p className="text-sm text-muted-foreground mt-1">Connect Facebook Ads, Instagram, Google Ads, Zapier, and custom webhooks.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
