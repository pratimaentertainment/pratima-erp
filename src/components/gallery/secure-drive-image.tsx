'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

export const FALLBACK_PHOTO_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" fill="none">
  <defs>
    <linearGradient id="proofBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#18181b"/>
      <stop offset="50%" stop-color="#27272a"/>
      <stop offset="100%" stop-color="#09090b"/>
    </linearGradient>
    <radialGradient id="lensGlow" cx="50%" cy="45%" r="45%">
      <stop offset="0%" stop-color="rgba(147, 51, 234, 0.18)"/>
      <stop offset="60%" stop-color="rgba(59, 130, 246, 0.08)"/>
      <stop offset="100%" stop-color="rgba(0, 0, 0, 0)"/>
    </radialGradient>
    <pattern id="proofGrid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(255, 255, 255, 0.025)" stroke-width="1"/>
    </pattern>
  </defs>
  
  <rect width="1200" height="800" fill="url(#proofBg)"/>
  <rect width="1200" height="800" fill="url(#lensGlow)"/>
  <rect width="1200" height="800" fill="url(#proofGrid)"/>

  <g transform="translate(600, 360)">
    <circle cx="0" cy="0" r="84" fill="rgba(24, 24, 27, 0.8)" stroke="rgba(255, 255, 255, 0.15)" stroke-width="2"/>
    <circle cx="0" cy="0" r="74" fill="none" stroke="rgba(168, 85, 247, 0.4)" stroke-width="1.5" stroke-dasharray="4 6"/>
    <circle cx="0" cy="0" r="56" fill="rgba(39, 39, 42, 0.9)" stroke="rgba(255, 255, 255, 0.1)" stroke-width="2"/>
    <circle cx="0" cy="0" r="32" fill="rgba(147, 51, 234, 0.25)"/>
    <circle cx="0" cy="0" r="14" fill="rgba(255, 255, 255, 0.4)"/>
    <path d="M -30 -30 Q 0 -45 30 -30 Q 0 -38 -30 -30 Z" fill="rgba(255, 255, 255, 0.3)"/>
    <path d="M -50 -84 L -35 -110 L 35 -110 L 50 -84 Z" fill="rgba(39, 39, 42, 0.8)" stroke="rgba(255, 255, 255, 0.12)" stroke-width="1.5"/>
    <circle cx="36" cy="-97" r="4" fill="#ef4444"/>
  </g>

  <text x="600" y="500" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="700" fill="#f4f4f5" letter-spacing="1.5">PHOTO PROOF ASSET</text>
  <text x="600" y="534" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="500" fill="#a1a1aa" letter-spacing="0.5">High-Resolution BYOS Cloud Storage Preview</text>
  <rect x="500" y="562" width="200" height="26" rx="13" fill="rgba(255, 255, 255, 0.06)" stroke="rgba(255, 255, 255, 0.1)"/>
  <text x="600" y="579" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="600" fill="#d4d4d8" letter-spacing="0.5">STUDIO PROOFING</text>
</svg>
`)}`;

export interface SecureDriveImageProps {
  src: string;
  alt: string;
  fallbackSrc?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  containerClassName?: string;
  priority?: boolean;
  loading?: 'lazy' | 'eager';
  unoptimized?: boolean;
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
  sizes?: string;
}

export function SecureDriveImage({
  src,
  alt,
  fallbackSrc = FALLBACK_PHOTO_SVG,
  width = 800,
  height = 600,
  fill = false,
  className,
  containerClassName,
  priority = false,
  loading = 'lazy',
  unoptimized,
  referrerPolicy = 'no-referrer',
  draggable = false,
  onDragStart,
  onContextMenu,
  onClick,
  sizes,
}: SecureDriveImageProps) {
  const isDrive = Boolean(
    src &&
      (src.includes('drive.google.com') ||
        src.includes('googleusercontent.com'))
  );

  const shouldBypassOptimization = unoptimized !== undefined ? unoptimized : isDrive;

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [activeSrc, setActiveSrc] = useState<string>(src);

  useEffect(() => {
    if (!src || src.trim() === '') {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setHasError(false);
    setActiveSrc(src);

    // Pre-test image loading in memory to catch 403, CORS, and network aborts
    // before Next.js <Image> renders a broken browser icon
    if (typeof window !== 'undefined') {
      const testImg = new window.Image();
      testImg.referrerPolicy = (referrerPolicy as any) || 'no-referrer';
      testImg.src = src;

      testImg.onload = () => {
        if (isMounted) {
          setIsLoading(false);
          setHasError(false);
        }
      };

      testImg.onerror = () => {
        if (isMounted) {
          console.warn('[SecureDriveImage] Image load blocked or failed:', src);
          setHasError(true);
          setIsLoading(false);
        }
      };

      return () => {
        isMounted = false;
        testImg.onload = null;
        testImg.onerror = null;
      };
    }
  }, [src, referrerPolicy]);

  // If error occurred (403 Forbidden / CORS / dead link), COMPLETELY UNMOUNT Next.js <Image>
  // and render the robust fallback container. This guarantees zero browser broken image icons.
  if (hasError) {
    return (
      <div
        className={cn(
          'relative overflow-hidden flex flex-col items-center justify-center bg-zinc-950 border border-zinc-800/80 text-zinc-400 select-none rounded-lg',
          containerClassName || className
        )}
        style={{
          backgroundImage: `url("${fallbackSrc}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          minHeight: '200px',
          width: fill ? '100%' : width ? `${width}px` : '100%',
          maxWidth: '100%',
        }}
        onClick={onClick}
        onContextMenu={onContextMenu}
        onDragStart={onDragStart}
        role="img"
        aria-label={alt}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
        <div className="relative z-10 flex flex-col items-center justify-center p-4 text-center space-y-1.5 max-w-[85%]">
          <div className="p-2.5 rounded-full bg-zinc-900/80 border border-zinc-700/60 text-zinc-300 shadow-md">
            <Camera className="w-5 h-5 text-zinc-300" />
          </div>
          <span className="text-[11px] font-mono font-medium text-zinc-200 truncate max-w-full block">
            {alt || 'Photo Preview'}
          </span>
          <span className="text-[10px] text-zinc-400 font-sans tracking-wide">
            Protected Studio Proof
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('relative overflow-hidden flex items-center justify-center', containerClassName)}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onDragStart={onDragStart}
    >
      {/* Loading Skeleton Pulse */}
      {isLoading && (
        <div className="absolute inset-0 z-10 bg-muted/60 animate-pulse flex items-center justify-center">
          <Camera className="w-6 h-6 text-muted-foreground/30 animate-pulse" />
        </div>
      )}

      <Image
        src={activeSrc}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        priority={priority}
        loading={priority ? undefined : loading}
        unoptimized={shouldBypassOptimization}
        referrerPolicy={referrerPolicy}
        draggable={draggable}
        onDragStart={onDragStart}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        onLoad={() => {
          setIsLoading(false);
        }}
        sizes={sizes}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          className
        )}
      />
    </div>
  );
}
