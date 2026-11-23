import * as React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth, signOut } from '@/auth';
import {
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SuperAdminNav } from './super-admin-nav';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { AutoLogoutProvider } from '@/components/providers/auto-logout-provider';
import { SuperAdminSplashScreen } from '@/components/layout/super-admin-splash-screen';
import { getActiveImpersonationState } from '@/lib/impersonation';
import { ImpersonationBanner } from '@/components/layout/impersonation-banner';

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const role = (session.user as any)?.role;
  if (role !== 'SUPER_ADMIN') {
    // Non-super-admins are strictly forbidden from the SaaS super-admin console
    redirect('/dashboard');
  }

  const adminName = session.user.name || 'Platform Admin';
  const adminEmail = session.user.email || 'admin@pratimaerp.com';

  const impersonation = await getActiveImpersonationState();

  return (
    <AutoLogoutProvider>
      <SuperAdminSplashScreen>
        <div className="min-h-screen bg-background flex flex-col antialiased">
          {impersonation && <ImpersonationBanner impersonation={impersonation} />}
          {/* Super Admin Isolated SaaS Header */}
          <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur-md supports-backdrop-filter:bg-background/80">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
              {/* Brand Identity */}
              <div className="flex items-center gap-6">
                <Link href="/super-admin" className="flex items-center gap-2.5 group">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs group-hover:scale-105 transition-transform">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm font-heading tracking-tight text-foreground">
                        Pratima Cloud
                      </span>
                      <Badge
                        variant="outline"
                        className="bg-primary/10 text-primary border-primary/30 text-[9px] px-1.5 py-0 uppercase font-mono font-bold"
                      >
                        Root Admin
                      </Badge>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      SaaS Control Console
                    </span>
                  </div>
                </Link>

                {/* SaaS Management Navigation */}
                <SuperAdminNav />
              </div>

              {/* Right Side: Theme Toggle, Admin Profile & Sign Out */}
              <div className="flex items-center gap-3">
                <ThemeToggle />

                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-semibold text-foreground">{adminName}</span>
                  <span className="text-[11px] text-muted-foreground font-mono">{adminEmail}</span>
                </div>

                <form
                  action={async () => {
                    'use server';
                    await signOut({ redirectTo: '/login' });
                  }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    type="submit"
                    className="text-xs gap-1.5 text-muted-foreground hover:text-foreground h-8 px-2.5"
                    title="Sign out of Super Admin"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </Button>
                </form>
              </div>
            </div>
          </header>

          {/* Main SaaS Administration Area */}
          <main className="flex-1 bg-muted/10">
            {children}
          </main>
        </div>
      </SuperAdminSplashScreen>
    </AutoLogoutProvider>
  );
}
