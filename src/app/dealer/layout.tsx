import * as React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth, signOut } from '@/auth';
import { Handshake, LogOut, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { AutoLogoutProvider } from '@/components/providers/auto-logout-provider';

export default async function DealerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const role = (session.user as any)?.role;
  if (role !== 'DEALER' && role !== 'SUPER_ADMIN') {
    redirect('/dashboard');
  }

  const dealerName = session.user.name || 'Partner';
  const dealerEmail = session.user.email || '';

  return (
    <AutoLogoutProvider>
      <div className="min-h-screen bg-background flex flex-col antialiased">
        {/* Dealer Isolated Header */}
        <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur-md supports-backdrop-filter:bg-background/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <Link href="/dealer" className="flex items-center gap-2.5 group">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs group-hover:scale-105 transition-transform">
                  <Handshake className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm font-heading tracking-tight text-foreground">
                      FRAMIQ
                    </span>
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[9px] px-1.5 py-0 uppercase font-mono font-bold"
                    >
                      Partner Portal
                    </Badge>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    by Pratima Entertainment &amp; Technology
                  </span>
                </div>
              </Link>
            </div>

            {/* Profile & Controls */}
            <div className="flex items-center gap-3">
              <ThemeToggle />

              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-foreground">{dealerName}</span>
                <span className="text-[11px] text-muted-foreground font-mono">{dealerEmail}</span>
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
                  title="Sign out of Dealer Portal"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </form>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
          FRAMIQ Partner Network • by Pratima Entertainment &amp; Technology
        </footer>
      </div>
    </AutoLogoutProvider>
  );
}
