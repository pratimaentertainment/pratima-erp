'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Camera,
  Lock,
  Phone,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  MessageSquare,
  AlertCircle,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';
import { loginClientPortalAction } from '@/actions/portal-auth.actions';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface ClientLoginTenant {
  id: string;
  name: string;
  logoUrl: string | null;
  slug: string | null;
  email: string | null;
  phone: string | null;
}

interface ClientLoginFormProps {
  tenant: ClientLoginTenant;
}

export function ClientLoginForm({ tenant }: ClientLoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/portal/dashboard';

  const [mobile, setMobile] = useState('');
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Clear splash seen flag on landing at client login
  React.useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('pratima_tenant_splash_seen');
      }
    } catch {}
  }, []);

  const cleanPhone = (tenant.phone || '').replace(/[^0-9]/g, '');
  const whatsAppUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        `Hi ${tenant.name}, I need assistance accessing my client portal.`
      )}`
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      setErrorMsg('Please enter a valid 10-digit registered mobile number.');
      setIsSubmitting(false);
      return;
    }

    if (!pin || pin.trim().length < 4) {
      setErrorMsg('Please enter your 4-6 digit security PIN.');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await loginClientPortalAction({
        mobile: cleanMobile,
        pin: pin.trim(),
        tenantSlug: tenant.slug || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Authentication failed. Please verify your mobile and PIN.');
        setIsSubmitting(false);
        return;
      }

      toast.success(`Welcome back, ${res.customer?.name || 'Client'}!`);
      try {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('pratima_tenant_splash_seen');
        }
      } catch {}
      window.location.href = callbackUrl;
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred during login. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Back to Storefront Link */}
      <div>
        <Link
          href={`/${tenant.slug || ''}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to {tenant.name} Storefront</span>
        </Link>
      </div>

      {/* White-labeled Card */}
      <Card className="border-border/80 shadow-lg rounded-2xl overflow-hidden backdrop-blur-xs">
        {/* Studio Branding Header */}
        <CardHeader className="text-center pb-4 pt-8 bg-muted/20 border-b border-border/60">
          <div className="mx-auto mb-3">
            {tenant.logoUrl ? (
              <img
                src={tenant.logoUrl}
                alt={tenant.name}
                className="w-14 h-14 rounded-2xl object-cover border border-border/80 shadow-xs mx-auto"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xl shadow-xs mx-auto">
                <Camera className="w-7 h-7" />
              </div>
            )}
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold mx-auto mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Secure 2FA Client Portal</span>
          </div>

          <CardTitle className="text-xl font-extrabold tracking-tight text-foreground">
            {tenant.name}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-1">
            Access your shoot schedule, photo selections, and invoices with your registered mobile and PIN.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-tight">{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Mobile Number Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Registered Mobile Number</span>
                <span className="text-[10px] text-muted-foreground font-normal">Use your booking number</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="pl-9 text-sm rounded-xl h-10 font-mono"
                  autoComplete="tel"
                />
              </div>
            </div>

            {/* 6-Digit Secure PIN Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">6-Digit Secure PIN</label>
                <span className="text-[10px] text-muted-foreground">Provided on WhatsApp / Voucher</span>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  required
                  maxLength={10}
                  placeholder="••••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="pl-9 text-sm rounded-xl h-10 font-mono tracking-widest"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full font-bold h-10 rounded-xl gap-2 mt-2"
            >
              {isSubmitting ? (
                <span>Validating Credentials...</span>
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Security Notice */}
          <div className="p-2.5 rounded-lg bg-muted/40 border text-[11px] text-muted-foreground flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-primary shrink-0" />
            <span>Protected by automated brute-force lockout after 5 incorrect attempts.</span>
          </div>
        </CardContent>

        <CardFooter className="bg-muted/15 border-t border-border/60 p-4 sm:p-5 flex flex-col gap-3 text-center text-xs text-muted-foreground">
          <div>
            Need your PIN or assistance? Contact{' '}
            <strong className="text-foreground">{tenant.name}</strong> directly.
          </div>

          <div className="flex items-center justify-center gap-3">
            {whatsAppUrl && (
              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp Studio</span>
              </a>
            )}

            {tenant.phone && (
              <>
                <span>•</span>
                <a
                  href={`tel:${tenant.phone}`}
                  className="inline-flex items-center gap-1.5 hover:text-foreground font-medium"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{tenant.phone}</span>
                </a>
              </>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
