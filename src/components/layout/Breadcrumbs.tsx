'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return <div className="text-sm font-medium text-foreground">Dashboard</div>;
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-sm text-muted-foreground">
      <Link
        href="/"
        className="hover:text-foreground transition-colors flex items-center"
        aria-label="Home"
      >
        <Home size={14} />
      </Link>
      
      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join('/')}`;
        const isLast = index === segments.length - 1;
        const formattedSegment = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');

        return (
          <React.Fragment key={href}>
            <ChevronRight size={14} className="mx-1 opacity-50" />
            {isLast ? (
              <span className="font-medium text-foreground" aria-current="page">
                {formattedSegment}
              </span>
            ) : (
              <Link href={href} className="hover:text-foreground transition-colors">
                {formattedSegment}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
