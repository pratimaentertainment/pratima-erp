import * as React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  MessageSquare,
  ShieldCheck,
  Building2,
  UserCheck,
  ArrowRight,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Contact Us & Official Support | FRAMIQ by Pratima Entertainment & Technology',
  description:
    'Contact the official support, sales, and billing desk for FRAMIQ Photography Studio ERP by Pratima Entertainment & Technology.',
};

export default function ContactPage() {
  return (
    <div className="py-12 sm:py-16 lg:py-20 bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header Hero */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Official Support &amp; Corporate Desk</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight font-heading text-foreground">
            Get in Touch with Us
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Have questions about FRAMIQ, studio onboarding, custom enterprise plans, or billing?
            We are here to help your photography business thrive.
          </p>
        </div>

        {/* Contact Channels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Channel 1: WhatsApp Support */}
          <Card className="shadow-xs border-emerald-500/30 bg-emerald-500/5 flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                <MessageSquare className="h-5 w-5" />
              </div>
              <CardTitle className="text-base font-bold">WhatsApp Direct Chat</CardTitle>
              <CardDescription className="text-xs">
                Fastest support for quick studio onboarding, demo walkthroughs, and technical questions.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <a
                href={siteConfig.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: 'default', size: 'sm' }),
                  'w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 shadow-xs'
                )}
              >
                <span>Chat on WhatsApp</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <p className="text-[10px] text-center text-muted-foreground mt-2">
                Typical reply time: Under 1 hour
              </p>
            </CardContent>
          </Card>

          {/* Channel 2: Phone & Calling Support */}
          <Card className="shadow-xs border-border/80 flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
                <Phone className="h-5 w-5" />
              </div>
              <CardTitle className="text-base font-bold">Telephone Support</CardTitle>
              <CardDescription className="text-xs">
                Speak directly with our studio support specialists during working business hours.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <a
                href={`tel:${siteConfig.phone}`}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'w-full font-bold text-xs gap-1.5'
                )}
              >
                <Phone className="h-3.5 w-3.5" />
                <span>{siteConfig.phoneFormatted}</span>
              </a>
              <p className="text-[10px] text-center text-muted-foreground mt-2">
                Mon – Sat, 10:00 AM – 7:00 PM IST
              </p>
            </CardContent>
          </Card>

          {/* Channel 3: Official Email Desk */}
          <Card className="shadow-xs border-border/80 flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2">
                <Mail className="h-5 w-5" />
              </div>
              <CardTitle className="text-base font-bold">Email Help Desk</CardTitle>
              <CardDescription className="text-xs">
                For billing inquiries, GST invoice requests, legal notices, and official correspondence.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <a
                href={`mailto:${siteConfig.email}`}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'w-full font-medium text-xs gap-1.5 truncate'
                )}
              >
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{siteConfig.email}</span>
              </a>
              <p className="text-[10px] text-center text-muted-foreground mt-2">
                Response within 24 business hours
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Corporate Legal Entity & Registered Office Dossier */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-border/60 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold uppercase">
                  Corporate Headquarters
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">
                  Established in {siteConfig.establishedYear}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-heading text-foreground">
                Pratima Entertainment &amp; Technology
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sole Proprietary Entity Operating <strong>FRAMIQ Photography Studio ERP</strong>
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg self-start sm:self-auto">
              <ShieldCheck className="h-4 w-4" />
              <span>Razorpay KYC Verified Merchant</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Left: Address & Founder */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <UserCheck className="h-4 w-4 text-primary" />
                  <span>Founder &amp; Proprietor:</span>
                </div>
                <p className="text-muted-foreground pl-6 font-medium text-foreground">
                  {siteConfig.founder}
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>Registered Business Address:</span>
                </div>
                <p className="text-muted-foreground pl-6 leading-relaxed">
                  {siteConfig.address}
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span>Legal Jurisdiction:</span>
                </div>
                <p className="text-muted-foreground pl-6">
                  {siteConfig.jurisdiction}
                </p>
              </div>
            </div>

            {/* Right: Operational Details */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>Business Working Hours:</span>
                </div>
                <p className="text-muted-foreground pl-6">
                  {siteConfig.supportHours}
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <Mail className="h-4 w-4 text-primary" />
                  <span>Official Support &amp; Billing Email:</span>
                </div>
                <p className="text-muted-foreground pl-6 font-mono text-primary">
                  <a href={`mailto:${siteConfig.email}`} className="hover:underline">
                    {siteConfig.email}
                  </a>
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <Phone className="h-4 w-4 text-primary" />
                  <span>Official Support Phone / WhatsApp:</span>
                </div>
                <p className="text-muted-foreground pl-6 font-mono font-medium text-foreground">
                  <a href={`tel:${siteConfig.phone}`} className="hover:underline">
                    {siteConfig.phoneFormatted}
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="rounded-xl border border-primary/20 bg-linear-to-r from-primary/10 via-card to-background p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold font-heading text-foreground">
              Ready to automate your photography studio?
            </h3>
            <p className="text-xs text-muted-foreground">
              Start your 15-day free trial with full feature access. No credit card required.
            </p>
          </div>
          <Link
            href="/signup"
            className={cn(buttonVariants({ variant: 'default', size: 'lg' }), 'text-xs font-bold gap-2 shrink-0 shadow-xs')}
          >
            <span>Start 15-Day Free Trial</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
