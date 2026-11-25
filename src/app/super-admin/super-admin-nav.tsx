'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, CreditCard, ShieldCheck, IndianRupee, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SuperAdminNav() {
  const pathname = usePathname();

  const navItems = [
    {
      name: 'Studios',
      href: '/super-admin',
      icon: Building2,
      isActive: pathname === '/super-admin',
    },
    {
      name: 'Subscriptions',
      href: '/super-admin/subscriptions',
      icon: CreditCard,
      isActive: pathname.startsWith('/super-admin/subscriptions'),
    },
    {
      name: 'Revenue & Billing',
      href: '/super-admin/revenue',
      icon: IndianRupee,
      isActive: pathname.startsWith('/super-admin/revenue'),
    },
    {
      name: 'Dealers & Payouts',
      href: '/super-admin/dealers',
      icon: Users,
      isActive: pathname.startsWith('/super-admin/dealers'),
    },
    {
      name: 'Governance & Audit',
      href: '/super-admin/settings',
      icon: ShieldCheck,
      isActive: pathname.startsWith('/super-admin/settings'),
    },
  ];

  return (
    <nav className="hidden md:flex items-center gap-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
              item.isActive
                ? 'bg-muted text-foreground font-semibold shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
