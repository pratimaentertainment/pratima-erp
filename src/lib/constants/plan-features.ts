/**
 * Centralized Enterprise Feature & Add-on Catalog for FRAMIQ
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
  'AI_FACE_RECOGNITION_SINGLE',
  'AI_FACE_RECOGNITION_PACK_10',
  'BROADCAST_MESSAGING',
  'EXTRA_BRANCH',
  'EXTRA_STAFF_5',
  'AI_FACE_RECOGNITION',
  'EXTRA_STORAGE',
  'CUSTOM_DOMAIN',
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


export interface DefaultAddonConfigItem {
  featureKey: string;
  name: string;
  description: string;
  originalMonthlyPrice: number;
  monthlyPrice: number;
  originalAnnualPrice: number;
  annualPrice: number;
  billingType?: 'RECURRING' | 'PER_EVENT' | 'CREDIT_PACK';
  creditsIncluded?: number;
  sortOrder: number;
}

export const DEFAULT_ADDON_CONFIGS: DefaultAddonConfigItem[] = [
  {
    featureKey: 'EXTRA_BRANCH',
    name: '+1 Extra Branch / Franchise',
    description: 'Add +1 studio branch office or franchise location with separate inventory, crew rosters, and location GST billing. Stackable across any plan.',
    originalMonthlyPrice: 499,
    monthlyPrice: 299,
    originalAnnualPrice: 4990,
    annualPrice: 2990,
    billingType: 'RECURRING',
    creditsIncluded: 0,
    sortOrder: 1,
  },
  {
    featureKey: 'EXTRA_STAFF_5',
    name: '+5 Extra In-House Login Staff',
    description: 'Add +5 dedicated in-house login accounts for managers, retouchers, and cinematographers. Stackable across any plan.',
    originalMonthlyPrice: 399,
    monthlyPrice: 199,
    originalAnnualPrice: 3990,
    annualPrice: 1990,
    billingType: 'RECURRING',
    creditsIncluded: 0,
    sortOrder: 2,
  },
  {
    featureKey: 'AI_FACE_RECOGNITION_SINGLE',
    name: 'AI Face Recognition (Single Event)',
    description: 'Unlock AI guest selfie matching & instant private photo delivery for 1 event shoot. (Included free in Higher Plan).',
    originalMonthlyPrice: 299,
    monthlyPrice: 149,
    originalAnnualPrice: 299,
    annualPrice: 149,
    billingType: 'PER_EVENT',
    creditsIncluded: 1,
    sortOrder: 3,
  },
  {
    featureKey: 'AI_FACE_RECOGNITION_PACK_10',
    name: 'AI Face Recognition (10-Event Pack)',
    description: 'Prepaid bundle of 10 AI event unlocks (save 20%). Credits never expire. (Included free in Higher Plan).',
    originalMonthlyPrice: 1490,
    monthlyPrice: 1199,
    originalAnnualPrice: 1490,
    annualPrice: 1199,
    billingType: 'CREDIT_PACK',
    creditsIncluded: 10,
    sortOrder: 4,
  },
  {
    featureKey: 'BROADCAST_MESSAGING',
    name: 'Customer Database Broadcast Messaging',
    description: 'Bulk promotional announcements & festival greetings to your entire client database. (Included free in Higher Plan).',
    originalMonthlyPrice: 599,
    monthlyPrice: 399,
    originalAnnualPrice: 5990,
    annualPrice: 3990,
    billingType: 'RECURRING',
    creditsIncluded: 0,
    sortOrder: 5,
  },
];

export interface DefaultPackagingPlanItem {
  slug: string;
  name: string;
  originalMonthlyPrice: number;
  monthlyPrice: number;
  originalAnnualPrice: number;
  annualPrice: number;
  offerBadgeText: string;
  isBasePlan: boolean;
  sortOrder: number;
  maxBranches: number;
  maxStaff: number;
  allowFranchises: boolean;
  franchiseEnabled: boolean;
  includedAddons: string[];
  features: string[];
  smsCredits?: number;
  whatsappCredits?: number;
  perFranchiseMonthlyPrice?: number;
  perFranchiseAnnualPrice?: number;
  isActive?: boolean;
}

export const DEFAULT_PACKAGING_PLANS: DefaultPackagingPlanItem[] = [
  {
    slug: 'starter-studio',
    name: 'Starter Plan',
    originalMonthlyPrice: 999,
    monthlyPrice: 499,
    originalAnnualPrice: 9990,
    annualPrice: 4999,
    offerBadgeText: 'Launch Price',
    isBasePlan: true,
    sortOrder: 1,
    maxBranches: 1,
    maxStaff: 3,
    allowFranchises: false,
    franchiseEnabled: false,
    includedAddons: [],
    features: [
      'LEADS_MANAGEMENT',
      'QUOTATIONS_ESTIMATES',
      'BOOKINGS_EVENTS',
      'CREW_EQUIPMENT_ROSTER',
      'INVOICING_GST_FINANCE',
      'EXPENSES_VENDOR_PAYOUTS',
      'CLIENT_PORTAL_PROOFING',
    ],
  },
  {
    slug: 'multi-branch-pro',
    name: 'Multi-Branch Plan',
    originalMonthlyPrice: 2499,
    monthlyPrice: 1299,
    originalAnnualPrice: 24990,
    annualPrice: 12999,
    offerBadgeText: 'Most Popular',
    isBasePlan: false,
    sortOrder: 2,
    maxBranches: 3,
    maxStaff: 15,
    allowFranchises: false,
    franchiseEnabled: false,
    includedAddons: [],
    features: [
      'LEADS_MANAGEMENT',
      'QUOTATIONS_ESTIMATES',
      'BOOKINGS_EVENTS',
      'CREW_EQUIPMENT_ROSTER',
      'INVOICING_GST_FINANCE',
      'EXPENSES_VENDOR_PAYOUTS',
      'CLIENT_PORTAL_PROOFING',
      'VEHICLE_LOGISTICS',
      'ADVANCED_REPORTS',
    ],
  },
  {
    slug: 'franchise-higher',
    name: 'Franchise / Higher Plan',
    originalMonthlyPrice: 5999,
    monthlyPrice: 2999,
    originalAnnualPrice: 59990,
    annualPrice: 29999,
    offerBadgeText: 'All Features Inbuilt',
    isBasePlan: false,
    sortOrder: 3,
    maxBranches: 5,
    maxStaff: 30,
    allowFranchises: true,
    franchiseEnabled: true,
    includedAddons: ['AI_FACE_RECOGNITION', 'AI_FACE_RECOGNITION_SINGLE', 'BROADCAST_MESSAGING'],
    features: [
      'LEADS_MANAGEMENT',
      'QUOTATIONS_ESTIMATES',
      'BOOKINGS_EVENTS',
      'CREW_EQUIPMENT_ROSTER',
      'INVOICING_GST_FINANCE',
      'EXPENSES_VENDOR_PAYOUTS',
      'CLIENT_PORTAL_PROOFING',
      'VEHICLE_LOGISTICS',
      'ADVANCED_REPORTS',
      'FRANCHISE_NETWORK',
      'BROADCAST_MESSAGING',
    ],
  },
];
