import React from 'react';
import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { StorefrontClient, StorefrontData } from './storefront-client';
import { GmbService } from '@/services/marketing/gmb.service';

/**
 * Strict set of reserved route segments that MUST NOT be resolved as tenant storefront slugs.
 * Guards internal ERP routes from being intercepted by the root dynamic [slug] parameter.
 */
const RESERVED_SLUGS = new Set([
  'dashboard',
  'login',
  'signup',
  'setup',
  'api',
  '_not-found',
  'settings',
  'admin',
  'super-admin',
  'portal',
  'gallery',
  'quote',
  'voucher',
  'clients',
  'customers',
  'finance',
  'inquiries',
  'leads',
  'masters',
  'operations',
  'packages',
  'profile',
  'quotations',
  'roles',
  'sales',
  'users',
  'pricing',
  'terms',
  'privacy',
  'forgot-password',
  'reset-password',
]);

interface StorefrontPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: StorefrontPageProps): Promise<Metadata> {
  const { slug } = await params;

  if (!slug || RESERVED_SLUGS.has(slug.toLowerCase())) {
    return {
      title: 'FRAMIQ by Pratima Entertainment & Technology',
      description: 'Enterprise Resource Planning for Studio and Photography Businesses.',
    };
  }

  const tenant = await prisma.tenant.findFirst({
    where: {
      OR: [
        { slug },
        { subdomain: slug },
      ],
      isActive: true,
      deletedAt: null,
    },
    select: {
      name: true,
      bio: true,
      logoUrl: true,
      city: true,
      state: true,
    },
  });

  if (!tenant) {
    return {
      title: 'Studio Storefront | FRAMIQ',
      description: 'Photography and Cinema Studio Storefront.',
    };
  }

  const locationStr = [tenant.city, tenant.state].filter(Boolean).join(', ');

  return {
    title: `${tenant.name} | Photography & Cinema Studio${locationStr ? ` - ${locationStr}` : ''}`,
    description:
      tenant.bio ||
      `Welcome to the official portfolio and client portal for ${tenant.name}. Explore wedding galleries, cinema films, and book your event coverage.`,
    openGraph: {
      title: `${tenant.name} | Photography & Cinema Studio`,
      description: tenant.bio || `Official studio storefront and client gallery portal for ${tenant.name}.`,
      images: tenant.logoUrl ? [{ url: tenant.logoUrl }] : [],
    },
  };
}

export default async function StorefrontPage({ params }: StorefrontPageProps) {
  const { slug } = await params;

  // Strict Reserved Word Guard: Prevent dynamic slug from intercepting internal ERP routes
  if (!slug || RESERVED_SLUGS.has(slug.toLowerCase())) {
    redirect('/');
  }

  // Query tenant by slug or subdomain
  const tenant = await prisma.tenant.findFirst({
    where: {
      OR: [
        { slug },
        { subdomain: slug },
      ],
      isActive: true,
      deletedAt: null,
    },
    include: {
      packages: {
        where: {
          isActive: true,
          deletedAt: null,
        },
        include: {
          category: true,
          items: {
            include: {
              serviceComponent: true,
            },
          },
        },
        orderBy: {
          basePrice: 'asc',
        },
        take: 6,
      },
    },
  });

  if (!tenant) {
    notFound();
  }

  // Format packages
  const packages = tenant.packages.map((pkg) => ({
    id: pkg.id,
    name: pkg.name,
    categoryName: pkg.category?.name,
    basePrice: Number(pkg.basePrice),
    notes: pkg.notes,
    items: pkg.items.map((item) => ({
      id: item.id,
      name: item.serviceComponent?.name || 'Studio Coverage',
      quantity: item.quantity,
    })),
  }));

  // Zero private client storage records or selection photos are ever exposed to the public storefront.
  // Storefront displays custom featured media configured by the studio, plus live verified Google Business media.
  const storefrontMedia = (tenant.storefrontMedia || {}) as any;
  const configuredVideos = Array.isArray(storefrontMedia.videos) ? storefrontMedia.videos : [];
  const configuredPhotos = Array.isArray(storefrontMedia.featuredPhotos) ? storefrontMedia.featuredPhotos : [];

  const portfolioItems: StorefrontData['portfolioItems'] = configuredPhotos.map((p: any, idx: number) => ({
    id: p.id || `cp-${idx}`,
    title: p.title || 'Featured Capture',
    category: p.category || 'Weddings',
    imageUrl: p.url,
    tag: 'Studio Featured',
  }));

  // Fetch GMB data (Reviews & Photos) with 3600s cache
  const gmbData = tenant.gmbPlaceId ? await GmbService.getPlaceData(tenant.gmbPlaceId) : null;

  const storefrontData: StorefrontData = {
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      bio: tenant.bio,
      logoUrl: tenant.logoUrl,
      website: tenant.website,
      email: tenant.email,
      phone: tenant.phone,
      city: tenant.city,
      state: tenant.state,
      address: tenant.address,
      currency: tenant.currency || 'INR',
      gmbPlaceId: tenant.gmbPlaceId,
      defaultPromoVideoUrl: tenant.defaultPromoVideoUrl,
    },
    packages,
    portfolioItems,
    videos: configuredVideos,
    gmb: gmbData,
  };

  return <StorefrontClient data={storefrontData} />;
}
