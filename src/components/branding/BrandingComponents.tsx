import * as React from 'react';
import { cn } from '@/lib/utils';

export function CompanyLogo({ url, alt, className }: { url?: string, alt?: string, className?: string }) {
  if (!url) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt || 'Company Logo'} className={cn("h-12 object-contain", className)} />
  );
}

export function CompanyHeader({ name, address, taxId, className }: { name: string, address?: string, taxId?: string, className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1 text-sm text-gray-600", className)}>
      <h2 className="text-lg font-bold text-gray-900">{name}</h2>
      {address && <p className="whitespace-pre-wrap">{address}</p>}
      {taxId && <p>Tax ID: {taxId}</p>}
    </div>
  );
}

export function BranchHeader({ name, address, className }: { name: string, address?: string, className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1 text-sm text-gray-600", className)}>
      <h3 className="font-semibold text-gray-800">{name}</h3>
      {address && <p className="whitespace-pre-wrap">{address}</p>}
    </div>
  );
}

export function CompanyFooter({ text, className }: { text?: string, className?: string }) {
  if (!text) return null;
  return (
    <div className={cn("text-xs text-gray-500 text-center w-full", className)}>
      {text}
    </div>
  );
}

// Stubs for others
export const SignatureBlock = () => null;
export const Stamp = () => null;
export const Watermark = () => null;
