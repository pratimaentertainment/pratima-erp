import { LoginForm } from './login-form';
import { Suspense } from 'react';
import Link from 'next/link';
import { Camera } from 'lucide-react';
import { siteConfig } from '@/config/site';

export const metadata = {
  title: 'Studio Login | FRAMIQ by Pratima Entertainment & Technology',
  description: 'Sign in to your FRAMIQ photography studio ERP workspace.',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-muted/40 flex flex-col justify-between p-4">
      <div className="flex-1 flex items-center justify-center py-10">
        <div className="w-full max-w-md">
          {/* Header Brand Wordmark */}
          <div className="mb-6 text-center space-y-2">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs group-hover:scale-105 transition-transform">
                <Camera className="h-5 w-5" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="text-2xl font-black tracking-tight font-heading">FRAMIQ</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold uppercase">
                    ERP
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">
                  by Pratima Entertainment &amp; Technology
                </span>
              </div>
            </Link>
            <p className="text-xs text-muted-foreground">Sign in to your studio operating system</p>
          </div>

          <Suspense fallback={<div className="text-center text-xs py-8 text-muted-foreground">Loading workspace...</div>}>
            <LoginForm />
          </Suspense>

          <div className="mt-6 text-center text-xs text-muted-foreground">
            Don&apos;t have a studio workspace yet?{' '}
            <Link href="/signup" className="text-primary font-semibold hover:underline">
              Start 15-Day Free Trial
            </Link>
          </div>
        </div>
      </div>

      {/* Login Screen Footer */}
      <footer className="py-4 text-center text-xs text-muted-foreground border-t border-border/40">
        <div className="flex flex-wrap items-center justify-center gap-3 text-[11px]">
          <Link href="/pricing" className="hover:text-primary transition-colors">Pricing</Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
          <span>•</span>
          <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <span>•</span>
          <Link href="/refund-policy" className="hover:text-primary transition-colors">Refund Policy</Link>
          <span>•</span>
          <Link href="/contact" className="hover:text-primary transition-colors">Support &amp; Contact</Link>
        </div>
        <p className="text-[10px] text-muted-foreground/70 mt-2">
          &copy; {siteConfig.establishedYear}&ndash;{new Date().getFullYear()} {siteConfig.fullName}. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
