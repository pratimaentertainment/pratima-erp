/**
 * Centralized Enterprise Feature & Add-on Catalog for Pratima ERP
 * Strongly typed registry mapping SaaS subscription features to real ERP modules.
 */

export const PLAN_FEATURE_KEYS = [
  'CLIENT_PROOFING',
  'CLOUD_STORAGE_BYOS',
  'META_LEADS',
  'GOOGLE_BUSINESS',
  'CUSTOM_BRANDING',
  'ADVANCED_ANALYTICS',
  'FRANCHISE_NETWORK',
  'FLEET_DISPATCH',
  'HR_PAYROLL',
] as const;

export type PlanFeatureKey = (typeof PLAN_FEATURE_KEYS)[number];

export type FeatureCategory =
  | 'Operations'
  | 'Growth & Marketing'
  | 'Storage & Branding'
  | 'Enterprise & Scale';

export interface PlanFeatureDefinition {
  key: PlanFeatureKey;
  label: string;
  shortDescription: string;
  description: string;
  category: FeatureCategory;
  recommendedTier: 'Starter Studio' | 'Pro Studio' | 'Enterprise Franchise';
  minTierSlug: 'starter-studio' | 'pro-studio' | 'enterprise-franchise';
  route?: string;
  highlightIcon?: string;
}

export const PLAN_FEATURES_CATALOG: PlanFeatureDefinition[] = [
  {
    key: 'CLIENT_PROOFING',
    label: 'Client Proofing & Photo Selection',
    shortDescription: 'Digital photo selection & watermark client portal',
    description:
      'Digital client gallery selection portal with OTP authorization, photo favoriting, comments, and real-time selection lockdown.',
    category: 'Operations',
    recommendedTier: 'Starter Studio',
    minTierSlug: 'starter-studio',
    route: '/operations/selections',
    highlightIcon: 'Sparkles',
  },
  {
    key: 'CUSTOM_BRANDING',
    label: 'Custom Branding & White-Label Docs',
    shortDescription: 'Studio logo on print quotes, invoices & agreements',
    description:
      'White-label quotation generator, print-ready GST invoices, custom studio contracts with digital signatures, and watermark styling.',
    category: 'Storage & Branding',
    recommendedTier: 'Starter Studio',
    minTierSlug: 'starter-studio',
    route: '/settings/tenant',
    highlightIcon: 'FileText',
  },
  {
    key: 'CLOUD_STORAGE_BYOS',
    label: 'BYOS Cloud Storage & Auto-Mirroring',
    shortDescription: 'Connect your own Google Drive & AWS S3 buckets',
    description:
      'Bring-Your-Own-Storage (BYOS) engine enabling automatic client gallery photo mirroring to your studio Google Drive and AWS S3 accounts.',
    category: 'Storage & Branding',
    recommendedTier: 'Pro Studio',
    minTierSlug: 'pro-studio',
    route: '/settings/storage',
    highlightIcon: 'HardDrive',
  },
  {
    key: 'META_LEADS',
    label: 'Meta Lead Ads Inbound Ingestion',
    shortDescription: 'Instant Facebook & Instagram lead webhook capture',
    description:
      'Direct HMAC SHA-256 webhook ingestion syncing inbound leads from Meta Graph API into your CRM with zero manual data entry.',
    category: 'Growth & Marketing',
    recommendedTier: 'Pro Studio',
    minTierSlug: 'pro-studio',
    route: '/settings/integrations',
    highlightIcon: 'Share2',
  },
  {
    key: 'GOOGLE_BUSINESS',
    label: 'Google My Business & Maps Location Sync',
    shortDescription: 'Live Places API shoot venue autocomplete & reviews',
    description:
      'Google Maps Places search and geocoding for event venue scheduling, travel distance calculations, and GMB marketing review sync.',
    category: 'Growth & Marketing',
    recommendedTier: 'Pro Studio',
    minTierSlug: 'pro-studio',
    route: '/dashboard/marketing',
    highlightIcon: 'MapPin',
  },
  {
    key: 'FLEET_DISPATCH',
    label: 'Vehicle Fleet & Shoot Dispatch',
    shortDescription: 'Studio vehicle scheduling, drivers & dispatch sheets',
    description:
      'Live fleet tracking, shoot dispatch boards, driver trip logs, and vehicle clash prevention for multi-crew destination shoots.',
    category: 'Operations',
    recommendedTier: 'Pro Studio',
    minTierSlug: 'pro-studio',
    route: '/operations/vehicles',
    highlightIcon: 'Car',
  },
  {
    key: 'HR_PAYROLL',
    label: 'Staff Attendance & Payroll Engine',
    shortDescription: 'Biometric attendance, leave approvals & salary slips',
    description:
      'Comprehensive studio HR suite: monthly staff salaries, freelance per-day wages, overtime bonuses, and automated payroll pay slips.',
    category: 'Operations',
    recommendedTier: 'Pro Studio',
    minTierSlug: 'pro-studio',
    route: '/hr',
    highlightIcon: 'BadgeIndianRupee',
  },
  {
    key: 'ADVANCED_ANALYTICS',
    label: 'CA Financial Ledgers & Profit Desk',
    shortDescription: 'P&L statements, journal daybooks & GST returns',
    description:
      'Auditor-ready double-entry chart of accounts, monthly profit & loss breakdown, shoot-level margin analytics, and GST tax liability summaries.',
    category: 'Enterprise & Scale',
    recommendedTier: 'Enterprise Franchise',
    minTierSlug: 'enterprise-franchise',
    route: '/finance/reports',
    highlightIcon: 'LineChart',
  },
  {
    key: 'FRANCHISE_NETWORK',
    label: 'Franchise Network & Auto-Royalty',
    shortDescription: 'Multi-franchise hub, lead transfer & royalty ledger',
    description:
      'Parent franchisor command center: provision branch franchisees, push master packages, transfer regional customer leads, and track automated monthly royalties.',
    category: 'Enterprise & Scale',
    recommendedTier: 'Enterprise Franchise',
    minTierSlug: 'enterprise-franchise',
    route: '/franchise',
    highlightIcon: 'Network',
  },
];

/**
 * Standard tier feature bundles
 */
export const STARTER_DEFAULT_FEATURES: PlanFeatureKey[] = [
  'CLIENT_PROOFING',
  'CUSTOM_BRANDING',
];

export const PRO_DEFAULT_FEATURES: PlanFeatureKey[] = [
  'CLIENT_PROOFING',
  'CUSTOM_BRANDING',
  'CLOUD_STORAGE_BYOS',
  'META_LEADS',
  'GOOGLE_BUSINESS',
  'FLEET_DISPATCH',
  'HR_PAYROLL',
];

export const ENTERPRISE_DEFAULT_FEATURES: PlanFeatureKey[] = [
  'CLIENT_PROOFING',
  'CUSTOM_BRANDING',
  'CLOUD_STORAGE_BYOS',
  'META_LEADS',
  'GOOGLE_BUSINESS',
  'FLEET_DISPATCH',
  'HR_PAYROLL',
  'ADVANCED_ANALYTICS',
  'FRANCHISE_NETWORK',
];

/**
 * Helper to resolve human-readable feature information
 */
export function getFeatureDefinition(key: string): PlanFeatureDefinition | undefined {
  return PLAN_FEATURES_CATALOG.find((f) => f.key === key);
}

/**
 * Returns features grouped by category
 */
export function getFeaturesByCategory(): Record<FeatureCategory, PlanFeatureDefinition[]> {
  const groups: Record<FeatureCategory, PlanFeatureDefinition[]> = {
    Operations: [],
    'Growth & Marketing': [],
    'Storage & Branding': [],
    'Enterprise & Scale': [],
  };

  for (const feature of PLAN_FEATURES_CATALOG) {
    if (groups[feature.category]) {
      groups[feature.category].push(feature);
    }
  }

  return groups;
}
