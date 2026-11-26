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
    featureKey: 'AI_FACE_RECOGNITION_SINGLE',
    name: 'AI Face Recognition & Smart Photo Delivery (Single Event)',
    description: 'Unlock AI-powered face indexing, guest selfie matching, and automated private photo delivery for 1 wedding or corporate event.',
    originalMonthlyPrice: 299,
    monthlyPrice: 149,
    originalAnnualPrice: 299,
    annualPrice: 149,
    billingType: 'PER_EVENT',
    creditsIncluded: 1,
    sortOrder: 1,
  },
  {
    featureKey: 'AI_FACE_RECOGNITION_PACK_10',
    name: 'AI Face Recognition Event Pack (10 Events Bundle)',
    description: 'Prepaid credit bundle to unlock AI Face Recognition on 10 client events at just ₹119/event with zero expiry.',
    originalMonthlyPrice: 1490,
    monthlyPrice: 1199,
    originalAnnualPrice: 1490,
    annualPrice: 1199,
    billingType: 'CREDIT_PACK',
    creditsIncluded: 10,
    sortOrder: 2,
  },
  {
    featureKey: 'BROADCAST_MESSAGING',
    name: 'Customer Database Broadcast Messaging',
    description: 'Send bulk promotional WhatsApp & SMS campaigns, festive greetings, and anniversary offers across your entire studio client database.',
    originalMonthlyPrice: 599,
    monthlyPrice: 399,
    originalAnnualPrice: 5990,
    annualPrice: 3990,
    billingType: 'RECURRING',
    creditsIncluded: 0,
    sortOrder: 3,
  },
  {
    featureKey: 'EXTRA_BRANCH',
    name: 'Extra Studio Branch Pack',
    description: 'Add 1 additional studio branch location with independent inventory, crew roster, and regional invoicing.',
    originalMonthlyPrice: 499,
    monthlyPrice: 299,
    originalAnnualPrice: 4990,
    annualPrice: 2990,
    billingType: 'RECURRING',
    creditsIncluded: 0,
    sortOrder: 4,
  },
  {
    featureKey: 'EXTRA_STORAGE',
    name: 'Extra High-Speed Cloud Storage (500GB)',
    description: '500GB additional cloud storage capacity for raw photos, video deliveries, and client proofing galleries.',
    originalMonthlyPrice: 699,
    monthlyPrice: 499,
    originalAnnualPrice: 6990,
    annualPrice: 4990,
    billingType: 'RECURRING',
    creditsIncluded: 0,
    sortOrder: 5,
  },
  {
    featureKey: 'CUSTOM_DOMAIN',
    name: 'Custom White-Label Studio Domain',
    description: 'Deliver client galleries and quotes on your own domain (e.g., gallery.yourstudio.com) with automated SSL certification.',
    originalMonthlyPrice: 399,
    monthlyPrice: 249,
    originalAnnualPrice: 3990,
    annualPrice: 2490,
    billingType: 'RECURRING',
    creditsIncluded: 0,
    sortOrder: 6,
  },
  {
    featureKey: 'CLIENT_PROOFING',
    name: 'Client Proofing & Photo Selection Portal',
    description: 'Digital client photo proofing with OTP authorization, watermarking & favorites.',
    originalMonthlyPrice: 499,
    monthlyPrice: 299,
    originalAnnualPrice: 4990,
    annualPrice: 2990,
    billingType: 'RECURRING',
    creditsIncluded: 0,
    sortOrder: 7,
  },
  {
    featureKey: 'CUSTOM_BRANDING',
    name: 'Custom Branding & White-Label Documents',
    description: 'Studio logo watermark, white-label GST invoices, quotes & legal agreements.',
    originalMonthlyPrice: 399,
    monthlyPrice: 199,
    originalAnnualPrice: 3990,
    annualPrice: 1990,
    billingType: 'RECURRING',
    creditsIncluded: 0,
    sortOrder: 8,
  },
  {
    featureKey: 'CLOUD_STORAGE_BYOS',
    name: 'BYOS Cloud Storage & Auto-Mirroring',
    description: 'Connect studio AWS S3 buckets & Google Drive with automated background sync.',
    originalMonthlyPrice: 699,
    monthlyPrice: 499,
    originalAnnualPrice: 6990,
    annualPrice: 4990,
    billingType: 'RECURRING',
    creditsIncluded: 0,
    sortOrder: 9,
  },
  {
    featureKey: 'META_LEADS',
    name: 'Meta Lead Ads Inbound Webhook Ingestion',
    description: 'Direct HMAC SHA-256 webhook ingestion from Facebook & Instagram ad campaigns.',
    originalMonthlyPrice: 799,
    monthlyPrice: 499,
    originalAnnualPrice: 7990,
    annualPrice: 4990,
    billingType: 'RECURRING',
    creditsIncluded: 0,
    sortOrder: 10,
  },
  {
    featureKey: 'GOOGLE_BUSINESS',
    name: 'Google My Business & Maps Location Sync',
    description: 'Google Places venue autocomplete, shoot location maps & review synchronization.',
    originalMonthlyPrice: 499,
    monthlyPrice: 299,
    originalAnnualPrice: 4990,
    annualPrice: 2990,
    billingType: 'RECURRING',
    creditsIncluded: 0,
    sortOrder: 11,
  },
  {
    featureKey: 'FLEET_DISPATCH',
    name: 'Vehicle Fleet & Shoot Dispatch Board',
    description: 'Studio vehicles, drivers, clash detection, and shoot dispatch worksheets.',
    originalMonthlyPrice: 599,
    monthlyPrice: 399,
    originalAnnualPrice: 5990,
    annualPrice: 3990,
    billingType: 'RECURRING',
    creditsIncluded: 0,
    sortOrder: 12,
  },
  {
    featureKey: 'HR_PAYROLL',
    name: 'Staff Attendance & Monthly Payroll Suite',
    description: 'Staff biometric/selfie attendance, leave management, and monthly salary slips.',
    originalMonthlyPrice: 899,
    monthlyPrice: 599,
    originalAnnualPrice: 8990,
    annualPrice: 5990,
    billingType: 'RECURRING',
    creditsIncluded: 0,
    sortOrder: 13,
  },
  {
    featureKey: 'ADVANCED_ANALYTICS',
    name: 'Chartered Accountant Ledgers & Profit Desk',
    description: 'Double-entry trial balance, P&L statements, balance sheets & shoot margin analytics.',
    originalMonthlyPrice: 999,
    monthlyPrice: 699,
    originalAnnualPrice: 9990,
    annualPrice: 6990,
    billingType: 'RECURRING',
    creditsIncluded: 0,
    sortOrder: 14,
  },
  {
    featureKey: 'FRANCHISE_NETWORK',
    name: 'Franchise Network Governance & Auto-Royalty',
    description: 'Multi-franchisee network command, lead routing, and automated royalty settlements.',
    originalMonthlyPrice: 1499,
    monthlyPrice: 999,
    originalAnnualPrice: 14990,
    annualPrice: 9990,
    billingType: 'RECURRING',
    creditsIncluded: 0,
    sortOrder: 15,
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
    name: 'Starter Studio',
    originalMonthlyPrice: 999,
    monthlyPrice: 499,
    originalAnnualPrice: 9990,
    annualPrice: 4999,
    offerBadgeText: 'Entry Full CRM+ERP',
    isBasePlan: true,
    sortOrder: 1,
    maxBranches: 1,
    maxStaff: 5,
    allowFranchises: false,
    franchiseEnabled: false,
    includedAddons: [],
    features: ['CLIENT_PROOFING', 'CUSTOM_BRANDING'],
  },
  {
    slug: 'pro-studio',
    name: 'Multi-Branch Pro',
    originalMonthlyPrice: 1999,
    monthlyPrice: 1299,
    originalAnnualPrice: 19990,
    annualPrice: 12999,
    offerBadgeText: 'Best for Growing Studios (5 Branches)',
    isBasePlan: false,
    sortOrder: 2,
    maxBranches: 5,
    maxStaff: 20,
    allowFranchises: false,
    franchiseEnabled: false,
    includedAddons: [],
    features: [
      'CLIENT_PROOFING',
      'CUSTOM_BRANDING',
      'CLOUD_STORAGE_BYOS',
      'META_LEADS',
      'GOOGLE_BUSINESS',
      'FLEET_DISPATCH',
      'HR_PAYROLL',
    ],
  },
  {
    slug: 'enterprise-franchise',
    name: 'Franchise Enterprise',
    originalMonthlyPrice: 4999,
    monthlyPrice: 2999,
    originalAnnualPrice: 49990,
    annualPrice: 29999,
    offerBadgeText: 'Unlimited Branches + Broadcast Inbuilt',
    isBasePlan: false,
    sortOrder: 3,
    maxBranches: 9999,
    maxStaff: 9999,
    allowFranchises: true,
    franchiseEnabled: true,
    includedAddons: ['BROADCAST_MESSAGING'],
    features: [
      'CLIENT_PROOFING',
      'CUSTOM_BRANDING',
      'CLOUD_STORAGE_BYOS',
      'META_LEADS',
      'GOOGLE_BUSINESS',
      'FLEET_DISPATCH',
      'HR_PAYROLL',
      'ADVANCED_ANALYTICS',
      'FRANCHISE_NETWORK',
      'BROADCAST_MESSAGING',
    ],
  },
];
