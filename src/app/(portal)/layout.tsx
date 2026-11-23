import React from 'react';
import { auth, signOut } from '@/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Camera, LogOut, ShieldCheck, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getClientPortalSession, logoutClientPortalAction } from '@/actions/portal-auth.actions';
import { redirect } from 'next/navigation';

export default async function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const clientSession = await getClientPortalSession();

  // Retrieve customer/tenant brand if available
  let studioName = 'Studio Portal';
  let studioLogo: string | null = null;
  let clientName: string | null = null;
  let tenantSlug: string | null = null;

  let customer = null;
  if (clientSession?.customerId) {
    customer = await prisma.customer.findFirst({
      where: {
        id: clientSession.customerId,
        deletedAt: null,
      },
      include: {
        tenant: {
          select: {
            name: true,
            logoUrl: true,
            slug: true,
          },
        },
      },
    });
  } else if (session?.user?.id) {
    customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { userId: session.user.id },
          ...(session.user.email ? [{ email: session.user.email }] : []),
        ],
        deletedAt: null,
      },
      include: {
        tenant: {
          select: {
            name: true,
            logoUrl: true,
            slug: true,
          },
        },
      },
    });
  }

  if (customer) {
    studioName = customer.tenant.name;
    studioLogo = customer.tenant.logoUrl;
    clientName = `${customer.firstName} ${customer.lastName}`;
    tenantSlug = customer.tenant.slug;
  }

  return (
    <div className="min-h-screen bg-muted/20 text-foreground flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/95 backdrop-blur-md shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Studio Brand */}
          <div className="flex items-center gap-3">
            <Link href="/portal/dashboard" className="flex items-center gap-2.5 group">
              {studioLogo ? (
                <img
                  src={studioLogo}
                  alt={studioName}
                  className="w-8 h-8 rounded-lg object-cover border border-border/80"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20 group-hover:scale-105 transition-transform">
                  <Camera className="w-4 h-4" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight text-foreground line-clamp-1">
                  {studioName}
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Client Suite
                </span>
              </div>
            </Link>
          </div>

          {/* User Status & Sign Out */}
          <div className="flex items-center gap-3">
            {clientName && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground border-r border-border pr-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[11px]">
                  {clientName[0]?.toUpperCase()}
                </div>
                <span className="font-medium text-foreground">{clientName}</span>
              </div>
            )}

            {(session?.user || clientSession) && (
              <form
                action={async () => {
                  'use server';
                  if (clientSession) {
                    await logoutClientPortalAction();
                    redirect(tenantSlug ? `/${tenantSlug}/login` : '/login');
                  } else {
                    await signOut({ redirectTo: '/login' });
                  }
                }}
              >
                <Button variant="ghost" size="sm" type="submit" className="text-xs gap-1.5 h-8">
                  <LogOut className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </form>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border/60 bg-background/50 py-6 text-center text-xs text-muted-foreground">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>End-to-End Encrypted Client Experience</span>
          </div>
          <p>© {new Date().getFullYear()} {studioName}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
