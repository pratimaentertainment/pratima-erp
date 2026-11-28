'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Camera,
  MapPin,
  ExternalLink,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GmbPhoto } from '@/services/marketing/gmb.service';
import { cn } from '@/lib/utils';

export interface StorefrontGmbGalleryProps {
  placeId?: string | null;
  photos?: GmbPhoto[];
  studioName?: string;
  className?: string;
}

export function StorefrontGmbGallery({
  placeId,
  photos,
  studioName = 'Studio',
  className,
}: StorefrontGmbGalleryProps) {
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);

  const isUrl = placeId?.startsWith('http://') || placeId?.startsWith('https://');
  const googleMapsUrl = placeId
    ? isUrl
      ? placeId
      : `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${encodeURIComponent(placeId)}`
    : null;

  const validPhotos = photos && photos.length > 0 ? photos : [];

  // Keyboard navigation for lightbox
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (activePhotoIndex === null) return;
      if (e.key === 'Escape') {
        setActivePhotoIndex(null);
      } else if (e.key === 'ArrowRight') {
        setActivePhotoIndex((prev) =>
          prev !== null ? (prev + 1) % validPhotos.length : null
        );
      } else if (e.key === 'ArrowLeft') {
        setActivePhotoIndex((prev) =>
          prev !== null ? (prev - 1 + validPhotos.length) % validPhotos.length : null
        );
      }
    },
    [activePhotoIndex, validPhotos.length]
  );

  useEffect(() => {
    if (activePhotoIndex !== null) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activePhotoIndex, handleKeyDown]);

  if (validPhotos.length === 0) {
    return null;
  }

  const activePhoto = activePhotoIndex !== null ? validPhotos[activePhotoIndex] : null;

  return (
    <section
      id="google-gallery"
      className={cn('py-24 border-b border-border/60 bg-muted/15 relative', className)}
      aria-label="Google My Business Gallery"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold border border-blue-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <MapPin className="w-3.5 h-3.5 text-blue-500" />
            <span>Live from Google Business Profile</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Moments on Google Maps
          </h2>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Live public photography and behind-the-scenes captures synchronized directly from{' '}
            <strong className="text-foreground">{studioName}&apos;s</strong> official Google My Business profile.
          </p>
        </div>

        {/* Dynamic Content: Photos Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {validPhotos.map((photo, index) => {
            const isTall = index % 5 === 0 || index % 7 === 0;

            return (
              <div
                key={photo.id}
                onClick={() => setActivePhotoIndex(index)}
                className={cn(
                  'group relative rounded-2xl overflow-hidden border border-border/70 bg-card/60 shadow-xs transition-all duration-300 hover:shadow-lg cursor-pointer',
                  isTall ? 'aspect-3/4 sm:row-span-2' : 'aspect-square'
                )}
              >
                <img
                  src={photo.url}
                  alt={`Google Business capture by ${photo.attribution || studioName}`}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3.5">
                  <div className="flex justify-end">
                    <span className="w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-xs">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  <div className="text-white text-[11px] flex items-center justify-between">
                    <span className="truncate font-medium flex items-center gap-1">
                      <Camera className="w-3 h-3 text-blue-400 shrink-0" />
                      <span>{photo.attribution || 'Verified Google Photo'}</span>
                    </span>
                    <Badge variant="secondary" className="bg-white/20 text-white text-[9px] px-1.5 py-0 border-none shrink-0">
                      GMB
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Link to Google Maps Place */}
        {googleMapsUrl && (
          <div className="flex items-center justify-center pt-4">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors p-2.5 rounded-xl border border-border/60 hover:bg-muted/60"
            >
              <MapPin className="w-3.5 h-3.5 text-blue-500" />
              <span>View complete verified photo stream on Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {activePhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setActivePhotoIndex(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar */}
            <div className="w-full flex items-center justify-between py-2 text-white/90">
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="border-white/30 text-white text-[10px] bg-white/10">
                  Google Business Photo ({activePhotoIndex! + 1} / {validPhotos.length})
                </Badge>
                {activePhoto.attribution && (
                  <span className="text-white/70 text-xs truncate max-w-xs sm:max-w-md">
                    By {activePhoto.attribution}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {googleMapsUrl && (
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-md"
                  >
                    <span>Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setActivePhotoIndex(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Main Image */}
            <div className="relative w-full flex items-center justify-center overflow-hidden rounded-xl max-h-[80vh]">
              <img
                src={activePhoto.url}
                alt={`Google capture by ${activePhoto.attribution || studioName}`}
                className="max-w-full max-h-[78vh] object-contain rounded-lg shadow-2xl"
              />

              {/* Prev Button */}
              {validPhotos.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePhotoIndex(
                      (activePhotoIndex! - 1 + validPhotos.length) % validPhotos.length
                    );
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-colors"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              {/* Next Button */}
              {validPhotos.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePhotoIndex((activePhotoIndex! + 1) % validPhotos.length);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-colors"
                  aria-label="Next photo"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
