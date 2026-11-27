'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useOptionalAppContext } from '@/providers/app-context';
import { PlanFeatureKey } from '@/lib/constants/plan-features';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Settings,
  Building2,
  Package,
  FileText,
  CalendarCheck,
  Film,
  Landmark,
  Receipt,
  FileSpreadsheet,
  Banknote,
  Boxes,
  Sparkles,
  Clock,
  BadgeIndianRupee,
  Car,
  Network,
  HardDrive,
  Lock,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredFeature?: PlanFeatureKey;
}

interface NavGroup {
  title: string;
  items: NavItem[];
  isAuthorized?: (context: {
    isOwnerOrAdmin: boolean;
    allRoles: string[];
    isFinanceAuthorized: boolean;
    isFranchisor: boolean;
  }) => boolean;
}

const navGroups: NavGroup[] = [
  {
    title: 'Core Pipeline',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Inquiries', href: '/inquiries', icon: Users },
      { name: 'Leads', href: '/leads', icon: Users },
      { name: 'Quotations', href: '/sales/quotations', icon: FileSpreadsheet },
      { name: 'Bookings', href: '/operations/bookings', icon: CalendarCheck },
      { name: 'Follow-ups', href: '/operations/follow-ups', icon: Clock },
      { name: 'Customers', href: '/customers', icon: Building2 },
      {
        name: 'AI Marketing Hub',
        href: '/dashboard/marketing',
        icon: Sparkles,
              },
    ],
  },
  {
    title: 'Studio Operations',
    items: [
      { name: 'Operations', href: '/operations', icon: FolderKanban },
      {
        name: 'Photo Proofing',
        href: '/operations/selections',
        icon: Sparkles,
              },
      {
        name: 'HR & Payroll',
        href: '/hr',
        icon: BadgeIndianRupee,
              },
      { name: 'Warehouse & Equipment', href: '/operations/inventory', icon: Boxes },
      {
        name: 'Vehicle Fleet',
        href: '/operations/vehicles',
        icon: Car,
              },
      { name: 'Post-Production', href: '/operations/post-production', icon: Film },
      { name: 'Packages', href: '/packages', icon: Package },
    ],
  },
  {
    title: 'Finance & Accounts',
    isAuthorized: ({ isFinanceAuthorized }) => isFinanceAuthorized,
    items: [
      { name: 'Invoices & Receivables', href: '/finance/invoices', icon: Receipt },
      { name: 'Vouchers & Daybook', href: '/finance/vouchers', icon: FileText },
      { name: 'Crew Payouts & TDS', href: '/finance/payouts', icon: Banknote },
      { name: 'Chart of Accounts', href: '/finance/ledgers', icon: Landmark },
      {
        name: 'CA Financial Reports',
        href: '/finance/reports',
        icon: FileSpreadsheet,
              },
    ],
  },
  {
    title: 'Enterprise & Network',
    isAuthorized: ({ isFranchisor }) => isFranchisor,
    items: [
      {
        name: 'Franchise Network',
        href: '/franchise',
        icon: Network,
        requiredFeature: 'FRANCHISE_NETWORK',
      },
    ],
  },
  {
    title: 'Administration',
    isAuthorized: ({ isOwnerOrAdmin, allRoles }) =>
      isOwnerOrAdmin ||
      allRoles.includes('ADMIN') ||
      allRoles.includes('SUPER_ADMIN') ||
      allRoles.includes('TENANT_OWNER'),
    items: [
      { name: 'Master Data', href: '/masters', icon: Settings },
      {
        name: 'Cloud Storage (BYOS)',
        href: '/settings/storage',
        icon: HardDrive,
              },
      { name: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const appContext = useOptionalAppContext();

  const isOwnerOrAdmin = Boolean(appContext?.isOwnerOrAdmin);
  const currentUser = appContext?.currentUser;
  const userSystemRole = (currentUser?.role || '').toUpperCase();
  const userAssignedRoles = (currentUser?.roles || []).map((r) => r.toUpperCase());
  const allRoles = [userSystemRole, ...userAssignedRoles].filter(Boolean);

  const isFinanceAuthorized =
    isOwnerOrAdmin ||
    allRoles.some((r) =>
      [
        'SUPER_ADMIN',
        'TENANT_OWNER',
        'ADMIN',
        'ACCOUNTANT',
        'FINANCE',
        'FINANCE_MANAGER',
      ].includes(r)
    );

  const isFranchisor = Boolean(
    appContext?.currentTenant?.isFranchisor ||
    allRoles.includes('SUPER_ADMIN')
  );

  const authContext = { isOwnerOrAdmin, allRoles, isFinanceAuthorized, isFranchisor };

  const isSuperAdmin = allRoles.includes('SUPER_ADMIN');
  const tenantFeatures = (appContext?.currentTenant?.features || []) as string[];

  const isFeatureLocked = (requiredFeature?: PlanFeatureKey) => {
    if (!requiredFeature) return false;
    if (isSuperAdmin) return false;
    return !tenantFeatures.includes(requiredFeature);
  };

  const visibleGroups = navGroups.filter((group) => {
    if (!group.isAuthorized) return true;
    if (!currentUser && !isOwnerOrAdmin) return false;
    return group.isAuthorized(authContext);
  });

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col h-screen border-r border-sidebar-border print:hidden">
      <div className="h-14 flex items-center px-6 border-b border-sidebar-border">
        <div className="flex flex-col">
          <h1 className="text-lg font-black tracking-tight text-sidebar-primary leading-none">FRAMIQ</h1>
          <span className="text-[9px] text-sidebar-foreground/60 font-medium tracking-tight mt-0.5">by Pratima Tech</span>
        </div>
      </div>
      <nav className="flex-1 py-3 overflow-y-auto space-y-4">
        {visibleGroups.map((group) => (
          <div key={group.title} className="px-3">
            <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/50">
              {group.title}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/' &&
                    item.href !== '/operations' &&
                    pathname.startsWith(`${item.href}/`)) ||
                  (item.href === '/operations' &&
                    (pathname === '/operations' ||
                      pathname === '/operations/calendar' ||
                      pathname === '/operations/dispatch'));
                const isLocked = isFeatureLocked(item.requiredFeature);

                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`flex items-center justify-between px-3 py-2 rounded-md transition-colors ${
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <item.icon className="h-4 w-4 opacity-80 shrink-0" />
                        <span className="text-sm truncate">{item.name}</span>
                      </div>
                      {isLocked && (
                        <span
                          title="Premium feature (Upgrade required)"
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 shrink-0 ml-1"
                        >
                          <Lock className="h-2.5 w-2.5" />
                          <span>PRO</span>
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="p-4 border-t border-sidebar-border text-center">
        <div className="text-[11px] text-sidebar-foreground/50 font-medium">FRAMIQ by Pratima Entertainment &amp; Technology</div>
      </div>
    </aside>
  );
}
