'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useOptionalAppContext } from '@/providers/app-context';
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
  BookOpen,
  ShieldAlert,
  Boxes,
  Sparkles,
  Clock,
  BadgeIndianRupee,
  Car,
  Network,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
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
      { name: 'AI Marketing Hub', href: '/dashboard/marketing', icon: Sparkles },
    ],
  },
  {
    title: 'Studio Operations',
    items: [
      { name: 'Operations', href: '/operations', icon: FolderKanban },
      { name: 'HR & Payroll', href: '/hr', icon: BadgeIndianRupee },
      { name: 'Warehouse & Equipment', href: '/operations/inventory', icon: Boxes },
      { name: 'Vehicle Fleet', href: '/operations/vehicles', icon: Car },
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
      { name: 'CA Financial Reports', href: '/finance/reports', icon: FileSpreadsheet },
    ],
  },
  {
    title: 'Enterprise & Network',
    isAuthorized: ({ isFranchisor }) => isFranchisor,
    items: [
      { name: 'Franchise Network', href: '/franchise', icon: Network },
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

  const visibleGroups = navGroups.filter((group) => {
    if (!group.isAuthorized) return true;
    // If user context not yet loaded during SSR/hydration, show if owner/admin or finance flag is true
    if (!currentUser && !isOwnerOrAdmin) return false;
    return group.isAuthorized(authContext);
  });

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col h-screen border-r border-sidebar-border print:hidden">
      <div className="h-14 flex items-center px-6 border-b border-sidebar-border">
        <h1 className="text-xl font-bold tracking-tighter text-sidebar-primary">Pratima ERP</h1>
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
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                      }`}
                    >
                      <item.icon className="h-4 w-4 opacity-80" />
                      <span className="text-sm">{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="p-4 border-t border-sidebar-border text-center">
        <div className="text-xs text-sidebar-foreground/50 font-medium">Pratima ERP v1.0</div>
      </div>
    </aside>
  );
}
