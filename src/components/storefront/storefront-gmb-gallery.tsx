import React from 'react';
import { Camera, MapPin, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
  const googleMapsUrl = placeId
    ? `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${encodeURIComponent(placeId)}`
    : null;

  const hasPhotos = Boolean(photos && photos.length > 0);

  return (
    <section
      id="google-gallery"
      className={cn('py-24 border-b border-border/60 bg-muted/15', className)}
      aria-label="Google My Business Gallery"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold">
            <MapPin className="w-3.5 h-3.5 text-blue-500" />
            <span>Google Verified Public Gallery</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Moments on Google Maps
          </h2>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Live public photography and behind-the-scenes captures synchronized directly from{' '}
            <strong className="text-foreground">{studioName}&apos;s</strong> official Google My Business profile.
          </p>
        </div>

        {/* Dynamic Content: Photos Grid or Graceful Empty State */}
        {hasPhotos ? (
          <>
            {/* Masonry / Responsive Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos!.map((photo, index) => {
                // Varied aspect ratios for an authentic masonry feel
                const isTall = index % 5 === 0 || index % 7 === 0;

                return (
                  <div
                    key={photo.id}
                    className={cn(
                      'group relative rounded-2xl overflow-hidden border border-border/70 bg-card/60 shadow-xs transition-all duration-300 hover:shadow-md cursor-pointer',
                      isTall ? 'aspect-3/4 sm:row-span-2' : 'aspect-square'
                    )}
                  >
                    <img
                      src={photo.url}
                      alt={`Google Business capture by ${photo.attribution || studioName}`}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />

                    {/* Subtle dark gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3.5" />

                    {/* Hover details */}
                    <div className="absolute bottom-2 left-2 right-2 text-white text-[11px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-between">
                      <span className="truncate font-medium flex items-center gap-1">
                        <Camera className="w-3 h-3 text-blue-400 shrink-0" />
                        <span>{photo.attribution || 'Verified Google Photo'}</span>
                      </span>
                      <Badge variant="secondary" className="bg-white/20 text-white text-[9px] px-1.5 py-0 border-none">
                        GMB
                      </Badge>
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
                  className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted/60"
                >
                  <span>View full photo stream on Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </>
        ) : (
          /* Graceful Fallback / Empty State UI */
          <div className="max-w-xl mx-auto rounded-3xl border border-dashed border-border/80 bg-card/50 p-10 sm:p-12 text-center space-y-5 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center shadow-inner">
              <Camera className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-foreground">
                Google Public Photos Coming Soon
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Verified Google Maps captures and public event highlights for{' '}
                <strong className="text-foreground">{studioName}</strong> will be synchronized automatically here once connected.
              </p>
            </div>

            {googleMapsUrl && (
              <div className="pt-2">
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <span>Check location on Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
