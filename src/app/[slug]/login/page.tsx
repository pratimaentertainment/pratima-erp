import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ClientLoginForm } from './client-login-form';

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

interface ClientLoginPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: ClientLoginPageProps): Promise<Metadata> {
  const { slug } = await params;

  if (!slug || RESERVED_SLUGS.has(slug.toLowerCase())) {
    return {
      title: 'Client Portal Login | Pratima ERP',
      description: 'Secure client portal login.',
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
      logoUrl: true,
    },
  });

  if (!tenant) {
    return {
      title: 'Client Portal Login | Pratima ERP',
      description: 'Secure client portal login.',
    };
  }

  return {
    title: `Client Portal Sign In | ${tenant.name}`,
    description: `Access your photo selections, event milestone tracker, and invoices with ${tenant.name}.`,
    openGraph: {
      title: `Client Portal | ${tenant.name}`,
      description: `Sign in to view your wedding and event deliverables with ${tenant.name}.`,
      images: tenant.logoUrl ? [{ url: tenant.logoUrl }] : [],
    },
  };
}

export default async function ClientLoginPage({ params }: ClientLoginPageProps) {
  const { slug } = await params;

  if (!slug || RESERVED_SLUGS.has(slug.toLowerCase())) {
    redirect('/login');
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
      id: true,
      name: true,
      logoUrl: true,
      slug: true,
      email: true,
      phone: true,
    },
  });

  if (!tenant) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="text-center text-sm text-muted-foreground">Loading portal login...</div>}>
        <ClientLoginForm tenant={tenant} />
      </Suspense>
    </div>
  );
}
