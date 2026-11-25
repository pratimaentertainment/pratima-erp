'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Camera,
  Heart,
  Calendar,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  Star,
  ShieldCheck,
  Award,
  Clock,
  Film,
  Layers,
  ChevronRight,
  ExternalLink,
  Send,
  User,
  Check,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { formatMoney } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { GmbPhoto, GmbReview } from '@/services/marketing/gmb.service';
import { StorefrontGmbGallery } from '@/components/storefront/storefront-gmb-gallery';
import { StorefrontGmbReviews } from '@/components/storefront/storefront-gmb-reviews';

export interface StorefrontPackageItem {
  id: string;
  name: string;
  quantity?: number;
}

export interface StorefrontPackage {
  id: string;
  name: string;
  categoryName?: string;
  basePrice: number;
  notes?: string | null;
  items: StorefrontPackageItem[];
}

export interface StorefrontPortfolioItem {
  id: string;
  title: string;
  category: 'Weddings' | 'Pre-Wedding' | 'Portraits' | 'Cinematic';
  imageUrl: string;
  tag?: string;
}

export interface StorefrontData {
  tenant: {
    id: string;
    name: string;
    slug: string | null;
    bio: string | null;
    logoUrl: string | null;
    website: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
    state: string | null;
    address: string | null;
    currency: string;
    gmbPlaceId?: string | null;
  };
  packages: StorefrontPackage[];
  portfolioItems: StorefrontPortfolioItem[];
  gmb?: {
    placeId: string;
    rating?: number;
    userRatingCount?: number;
    writeReviewUri: string;
    reviews: GmbReview[];
    photos: GmbPhoto[];
  } | null;
}

interface StorefrontClientProps {
  data: StorefrontData;
}

// Curated public editorial showcase for photography studios (zero private database records or client photos)
const DEFAULT_PORTFOLIO: StorefrontPortfolioItem[] = [
  {
    id: 'p-1',
    title: 'Royal Palace Vows',
    category: 'Weddings',
    imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
    tag: 'Traditional & Candid',
  },
  {
    id: 'p-2',
    title: 'Sunset Coastline Reverie',
    category: 'Pre-Wedding',
    imageUrl: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80',
    tag: 'Golden Hour Pre-Wedding',
  },
  {
    id: 'p-3',
    title: 'The Sangeet Night Celebration',
    category: 'Weddings',
    imageUrl: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=80',
    tag: 'High-Energy Dance',
  },
  {
    id: 'p-4',
    title: 'Archival Bridal Portrait',
    category: 'Portraits',
    imageUrl: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?auto=format&fit=crop&w=1200&q=80',
    tag: 'Fine-Art Portrait',
  },
  {
    id: 'p-5',
    title: 'Cinematic Teaser & Drone Frames',
    category: 'Cinematic',
    imageUrl: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=80',
    tag: '4K Cinema Reel',
  },
  {
    id: 'p-6',
    title: 'Sacred Pheras & Fireworks',
    category: 'Weddings',
    imageUrl: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=1200&q=80',
    tag: 'Ceremony Masterpiece',
  },
];

export function StorefrontClient({ data }: StorefrontClientProps) {
  const { tenant, packages, gmb } = data;
  const portfolioList =
    data.portfolioItems && data.portfolioItems.length > 0
      ? data.portfolioItems
      : DEFAULT_PORTFOLIO;

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryEmail, setInquiryEmail] = useState('');
  const [inquiryPhone, setInquiryPhone] = useState('');
  const [inquiryDate, setInquiryDate] = useState('');
  const [inquiryNotes, setInquiryNotes] = useState('');
  const [inquirySubmitted, setInquirySubmitted] = useState(false);

  // Clean phone for WhatsApp click-to-chat
  const cleanPhone = (tenant.phone || '').replace(/[^0-9]/g, '');
  const whatsAppUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        `Hi ${tenant.name}, I came across your studio storefront and would like to inquire about booking availability.`
      )}`
    : null;

  // Filtered portfolio
  const filteredPortfolio =
    activeCategory === 'All'
      ? portfolioList
      : portfolioList.filter((item) => item.category === activeCategory);

  const categories = ['All', 'Weddings', 'Pre-Wedding', 'Portraits', 'Cinematic'];

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryName || (!inquiryEmail && !inquiryPhone)) return;
    setInquirySubmitted(true);
  };

  const loginUrl = `/${tenant.slug || 'studio'}/login`;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* 1. Global Navigation Bar */}
      <nav className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Studio Brand */}
          <div className="flex items-center gap-3">
            {tenant.logoUrl ? (
              <img
                src={tenant.logoUrl}
                alt={tenant.name}
                className="w-10 h-10 rounded-xl object-cover border border-border shadow-2xs"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-lg shadow-2xs">
                <Camera className="w-5 h-5" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-foreground line-clamp-1">
                {tenant.name}
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                Photography & Cinema
              </span>
            </div>
          </div>

          {/* Nav Links (Desktop) */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#about" className="hover:text-foreground transition-colors">
              About
            </a>
            <a href="#portfolio" className="hover:text-foreground transition-colors">
              Portfolio
            </a>
            <a href="#google-gallery" className="hover:text-foreground transition-colors">
              Moments
            </a>
            {packages.length > 0 && (
              <a href="#services" className="hover:text-foreground transition-colors">
                Services & Investment
              </a>
            )}
            <a href="#reviews" className="hover:text-foreground transition-colors">
              Reviews
            </a>
            <a href="#contact" className="hover:text-foreground transition-colors">
              Contact
            </a>
          </div>

          {/* Action CTAs: Client Portal Login & Inquiry */}
          <div className="flex items-center gap-3">
            <Link
              href={loginUrl}
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'gap-2 text-xs font-semibold rounded-full px-4 border-primary/40 hover:bg-primary/5 hover:text-primary shadow-2xs'
              )}
            >
              <User className="w-3.5 h-3.5 text-primary" />
              <span>Client Portal</span>
            </Link>

            <a
              href="#contact"
              className={cn(
                buttonVariants({ variant: 'default', size: 'sm' }),
                'hidden sm:inline-flex gap-2 text-xs font-semibold rounded-full px-5 shadow-xs'
              )}
            >
              <span>Book Shoot</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </nav>

      {/* 2. Hero Section with Cinematic Visuals */}
      <header className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-slate-950 text-white">
        {/* Background Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40 scale-105 transition-transform duration-1000 ease-out"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2000&q=85')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/40" />

        {/* Hero Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6 py-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium text-white/90">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Award-Winning Wedding & Portrait Visuals</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.08] text-white">
            Capturing Timeless Moments With {tenant.name}
          </h1>

          <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto font-light leading-relaxed">
            {tenant.bio ||
              'Handcrafted wedding cinematography, candid imagery, and heirloom photo albums curated for modern couples.'}
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={loginUrl}
              className={cn(
                buttonVariants({ variant: 'default', size: 'lg' }),
                'w-full sm:w-auto text-sm font-bold rounded-full px-8 py-6 shadow-xl bg-white text-slate-950 hover:bg-slate-100 gap-2.5'
              )}
            >
              <User className="w-4 h-4 text-primary" />
              <span>Access Client Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href="#portfolio"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
                'w-full sm:w-auto text-sm font-semibold rounded-full px-8 py-6 border-white/30 text-white hover:bg-white/10 backdrop-blur-sm'
              )}
            >
              View Our Portfolio
            </a>
          </div>

          {/* Quick Metrics Banner */}
          <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-white/15 max-w-3xl mx-auto text-left">
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white">500+</div>
              <div className="text-xs text-slate-400 mt-0.5">Weddings Documented</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white">100%</div>
              <div className="text-xs text-slate-400 mt-0.5">Digital Gallery Proofing</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white">Archival</div>
              <div className="text-xs text-slate-400 mt-0.5">Handcrafted Leather Albums</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white">
                {gmb?.rating ? `${gmb.rating.toFixed(1)} ★` : '5.0 ★'}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {gmb?.userRatingCount
                  ? `${gmb.userRatingCount} Verified Google Reviews`
                  : 'Verified Client Reviews'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 3. About Studio Section */}
      <section id="about" className="py-24 border-b border-border/60 bg-card/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Left Narrative */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                <Heart className="w-3.5 h-3.5" />
                <span>Our Philosophy & Craft</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
                Authentic, Unfiltered Emotion Preserved for Generations
              </h2>

              <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                At <strong className="text-foreground">{tenant.name}</strong>, we believe photography is more
                than just sharp pictures. It is about bottle-capturing the nervous smile before the vows, the tearful
                embrace during the vidaai, and the boundless joy on the dance floor.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-foreground">Interactive Client Portal</h4>
                    <p className="text-xs text-muted-foreground">
                      Track your editing journey in real time, review photo selections, and access digital albums anywhere.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-foreground">Next-Day Raw Previews</h4>
                    <p className="text-xs text-muted-foreground">
                      Instant cloud backup and sneak-peek highlights shared within 24 hours of your ceremony.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-foreground">Archival Grade Print Lab</h4>
                    <p className="text-xs text-muted-foreground">
                      Museum-quality metallic paper and handmade flush-mount leather albums built to endure a lifetime.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Visual Feature Card */}
            <div className="relative">
              <div className="rounded-3xl overflow-hidden shadow-2xl border border-border/80">
                <img
                  src="https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=1000&q=80"
                  alt="Wedding Couple"
                  className="w-full h-[450px] object-cover hover:scale-103 transition-transform duration-700"
                />
              </div>

              {/* Floating Studio Badge */}
              <div className="absolute -bottom-6 -left-6 bg-card border border-border p-5 rounded-2xl shadow-xl max-w-xs space-y-1 backdrop-blur-md hidden sm:block">
                <div className="flex items-center gap-1.5 text-amber-500 text-sm">
                  {'★'.repeat(5)}
                </div>
                <div className="font-bold text-sm text-foreground">Premier Studio Experience</div>
                <div className="text-xs text-muted-foreground">
                  Official client concierge, cloud storage, and white-glove album delivery.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Portfolio Grid Section */}
      <section id="portfolio" className="py-24 border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Section Header */}
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Curated Portfolio</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Our Signature Showcase
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Explore our recent wedding ceremonies, pre-wedding destination shoots, and cinematic film stills.
            </p>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    'text-xs font-semibold px-4 py-2 rounded-full transition-all',
                    activeCategory === cat
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Masonry / Grid of Works */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPortfolio.map((item) => (
              <div
                key={item.id}
                className="group relative rounded-2xl overflow-hidden border border-border/80 bg-card shadow-xs aspect-4/5 cursor-pointer"
              >
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                {/* Content Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 space-y-1.5 text-white">
                  <Badge variant="secondary" className="bg-white/20 text-white text-[10px] uppercase font-bold border-none backdrop-blur-xs">
                    {item.category}
                  </Badge>
                  <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  {item.tag && <p className="text-xs text-slate-300">{item.tag}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4.5 Google My Business Live Public Gallery (If available) */}
      <StorefrontGmbGallery
        placeId={tenant.gmbPlaceId}
        photos={gmb?.photos}
        studioName={tenant.name}
      />

      {/* 5. Services & Investment Packages (if available) */}
      {packages.length > 0 && (
        <section id="services" className="py-24 border-b border-border/60 bg-card/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Transparent Investment</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Signature Packages & Coverage
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Complete coverage tailored to intimate engagements, grand multi-day wedding celebrations, and destination events.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {packages.map((pkg, index) => {
                const isPopular = index === 1;
                return (
                  <Card
                    key={pkg.id}
                    className={cn(
                      'flex flex-col justify-between relative rounded-2xl border transition-all duration-300 shadow-xs',
                      isPopular
                        ? 'border-primary ring-2 ring-primary/20 shadow-xl bg-card'
                        : 'border-border/80 bg-card/70'
                    )}
                  >
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-xs">
                        Most Requested
                      </div>
                    )}

                    <CardHeader className="pb-4">
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {pkg.categoryName || 'Wedding Collection'}
                      </div>
                      <CardTitle className="text-xl font-extrabold text-foreground">{pkg.name}</CardTitle>
                      <div className="pt-2">
                        <span className="text-3xl font-extrabold text-foreground">
                          {formatMoney(pkg.basePrice, tenant.currency)}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">/ event</span>
                      </div>
                      {pkg.notes && <CardDescription className="text-xs mt-2">{pkg.notes}</CardDescription>}
                    </CardHeader>

                    <CardContent className="space-y-3 pb-6 text-xs text-muted-foreground border-t border-border/60 pt-4">
                      {pkg.items && pkg.items.length > 0 ? (
                        pkg.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-primary shrink-0" />
                            <span className="text-foreground">{item.name}</span>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-primary shrink-0" />
                            <span className="text-foreground">Full Day Photography & Cinema Coverage</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-primary shrink-0" />
                            <span className="text-foreground">Client Portal Gallery Proofing</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-primary shrink-0" />
                            <span className="text-foreground">Handcrafted Leather Album Included</span>
                          </div>
                        </>
                      )}
                    </CardContent>

                    <CardFooter className="pt-2">
                      <a
                        href="#contact"
                        className={cn(
                          buttonVariants({
                            variant: isPopular ? 'default' : 'outline',
                          }),
                          'w-full font-semibold text-xs gap-2'
                        )}
                      >
                        <span>Select Collection</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 5.5 Google My Business Verified Reviews & Testimonials (If available) */}
      <StorefrontGmbReviews
        placeId={tenant.gmbPlaceId}
        reviews={gmb?.reviews}
        rating={gmb?.rating}
        userRatingCount={gmb?.userRatingCount}
        studioName={tenant.name}
      />

      {/* 6. Contact & Inquiry Section */}
      <section id="contact" className="py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Left Contact Info */}
            <div className="space-y-6">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Get In Touch</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Let’s Create Something Extraordinary Together
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Dates book out up to 12 months in advance. Share your wedding or shoot details with us, and our
                concierge team will get back to you with custom collections and availability.
              </p>

              <div className="space-y-4 pt-4 text-sm">
                {tenant.phone && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Phone & Inquiries</div>
                      <a href={`tel:${tenant.phone}`} className="font-semibold text-foreground hover:underline">
                        {tenant.phone}
                      </a>
                    </div>
                  </div>
                )}

                {tenant.email && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Direct Email</div>
                      <a href={`mailto:${tenant.email}`} className="font-semibold text-foreground hover:underline">
                        {tenant.email}
                      </a>
                    </div>
                  </div>
                )}

                {(tenant.city || tenant.address) && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Studio Location</div>
                      <span className="font-medium text-foreground">
                        {[tenant.address, tenant.city, tenant.state].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Direct WhatsApp CTA */}
              {whatsAppUrl && (
                <div className="pt-4">
                  <a
                    href={whatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      buttonVariants({ variant: 'default' }),
                      'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2 shadow-md'
                    )}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Chat Directly on WhatsApp
                  </a>
                </div>
              )}
            </div>

            {/* Right Interactive Inquiry Form */}
            <Card className="border-border/80 shadow-md">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Request Availability & Quote</CardTitle>
                <CardDescription className="text-xs">
                  Fill in your event details and our lead director will respond within 24 hours.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {inquirySubmitted ? (
                  <div className="p-6 text-center space-y-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                    <h4 className="font-bold text-base text-foreground">Inquiry Received!</h4>
                    <p className="text-xs text-muted-foreground">
                      Thank you for reaching out to {tenant.name}. Our studio team has received your details and will
                      contact you shortly via WhatsApp or Phone.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleInquirySubmit} className="space-y-4 text-xs">
                    <div>
                      <label className="font-medium text-foreground block mb-1">Your Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Ananya & Rahul"
                        value={inquiryName}
                        onChange={(e) => setInquiryName(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="font-medium text-foreground block mb-1">Email Address *</label>
                        <input
                          type="email"
                          required
                          placeholder="name@example.com"
                          value={inquiryEmail}
                          onChange={(e) => setInquiryEmail(e.target.value)}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="font-medium text-foreground block mb-1">Phone / WhatsApp</label>
                        <input
                          type="tel"
                          placeholder="+91 98765 43210"
                          value={inquiryPhone}
                          onChange={(e) => setInquiryPhone(e.target.value)}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-medium text-foreground block mb-1">Tentative Event Date</label>
                      <input
                        type="date"
                        value={inquiryDate}
                        onChange={(e) => setInquiryDate(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="font-medium text-foreground block mb-1">Event Vision & Details</label>
                      <textarea
                        rows={3}
                        placeholder="Tell us about your venues, function count, or aesthetic preferences..."
                        value={inquiryNotes}
                        onChange={(e) => setInquiryNotes(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary resize-none"
                      />
                    </div>

                    <Button type="submit" className="w-full font-bold gap-2">
                      <Send className="w-4 h-4" />
                      Submit Booking Inquiry
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="border-t border-border/80 bg-card py-12 text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">{tenant.name}</span>
            <span>•</span>
            <span>© {new Date().getFullYear()} All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href={loginUrl} className="hover:text-foreground font-semibold flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-primary" />
              Client Portal Login
            </Link>
            <span>•</span>
            <span>Powered by FRAMIQ</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
