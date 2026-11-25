'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Camera, ArrowRight, Menu, X, Sparkles, Phone, Mail } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/utils';
import { siteConfig } from '@/config/site';

export function PublicHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navLinks = [
    { href: '/pricing#features', label: 'Features' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/terms', label: 'Terms' },
    { href: '/privacy', label: 'Privacy' },
    { href: '/refund-policy', label: 'Refund Policy' },
    { href: '/contact', label: 'Contact' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 transition-colors">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo: FRAMIQ by Pratima Entertainment & Technology */}
        <Link
          href="/"
          className="flex items-center gap-2.5 font-bold tracking-tight text-foreground hover:opacity-95 transition-opacity group"
        >
          <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs group-hover:scale-105 transition-transform">
            <Camera className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-base font-black tracking-tight font-heading">FRAMIQ</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold tracking-wider uppercase">
                ERP
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground font-medium tracking-tight">
              by Pratima Entertainment &amp; Technology
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'text-xs font-semibold tracking-wide transition-colors hover:text-primary',
                  isActive ? 'text-primary font-bold' : 'text-muted-foreground'
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />

          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              'text-xs font-medium hidden sm:inline-flex'
            )}
          >
            Studio Login
          </Link>

          <Link
            href="/signup"
            className={cn(
              buttonVariants({ variant: 'default', size: 'sm' }),
              'text-xs font-semibold gap-1.5 shadow-xs'
            )}
          >
            <span>Start Free Trial</span>
            <ArrowRight className="h-3.5 w-3.5 hidden sm:inline-block" />
          </Link>

          {/* Mobile hamburger toggle */}
          <button
            type="button"
            className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-border/50 bg-background/95 backdrop-blur-md px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-150">
          <nav className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-muted/60',
                  pathname === link.href
                    ? 'bg-muted text-primary font-bold'
                    : 'text-muted-foreground'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="pt-3 border-t border-border/40 flex flex-col gap-2">
            <div className="text-[11px] text-muted-foreground px-3 flex flex-col gap-1">
              <span>Support: {siteConfig.phone}</span>
              <span>Email: {siteConfig.email}</span>
            </div>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-full text-xs font-medium')}
            >
              Studio Login
            </Link>
            <Link
              href="/signup"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'w-full text-xs font-bold')}
            >
              Start 15-Day Free Trial
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
