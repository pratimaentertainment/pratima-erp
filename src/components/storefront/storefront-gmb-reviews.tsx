import React from 'react';
import { Star, MessageSquarePlus, CheckCircle2, ExternalLink } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { GmbReview } from '@/services/marketing/gmb.service';
import { cn } from '@/lib/utils';

export interface StorefrontGmbReviewsProps {
  placeId?: string | null;
  reviews?: GmbReview[];
  rating?: number;
  userRatingCount?: number;
  studioName?: string;
  className?: string;
}

export function StorefrontGmbReviews({
  placeId,
  reviews,
  rating = 5.0,
  userRatingCount,
  studioName = 'Studio',
  className,
}: StorefrontGmbReviewsProps) {
  const writeReviewUrl = placeId
    ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`
    : null;

  const hasReviews = Boolean(reviews && reviews.length > 0);

  return (
    <section
      id="reviews"
      className={cn('py-24 border-b border-border/60 bg-card/40 relative overflow-hidden', className)}
      aria-label="Google Client Reviews"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header with Google Rating Badge & Write Review CTA */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>Verified Google Reviews</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Loved by Couples & Families
            </h2>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Real testimonials published publicly by clients on Google Maps for{' '}
              <strong className="text-foreground">{studioName}</strong>.
            </p>

            {/* Google Rating Counter Badge */}
            <div className="flex items-center gap-3 pt-1">
              <div className="flex items-center gap-1 text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-500" />
                ))}
              </div>
              <span className="text-sm font-bold text-foreground">
                {rating.toFixed(1)} / 5.0
              </span>
              {userRatingCount !== undefined && (
                <span className="text-xs text-muted-foreground">
                  ({userRatingCount} Verified Reviews)
                </span>
              )}
            </div>
          </div>

          {/* Prominent "Write a Review on Google" CTA */}
          {writeReviewUrl && (
            <div className="shrink-0">
              <a
                href={writeReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: 'default', size: 'lg' }),
                  'bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-2.5 rounded-full px-6 shadow-md transition-all duration-200'
                )}
              >
                <MessageSquarePlus className="w-4 h-4" />
                <span>Write a Review on Google</span>
                <ExternalLink className="w-3.5 h-3.5 ml-0.5 opacity-80" />
              </a>
            </div>
          )}
        </div>

        {/* Dynamic Content: Reviews Grid or Graceful Empty State */}
        {hasReviews ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews!.map((rev) => (
              <Card
                key={rev.id}
                className="flex flex-col justify-between border-border/80 bg-card/80 shadow-xs hover:border-primary/40 transition-colors p-6 rounded-2xl relative"
              >
                <div className="space-y-4">
                  {/* Author Info & Star Rating Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {rev.authorPhotoUrl ? (
                        <img
                          src={rev.authorPhotoUrl}
                          alt={rev.authorName}
                          className="w-10 h-10 rounded-full object-cover border border-border"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">
                          {rev.authorName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-sm text-foreground line-clamp-1">
                          {rev.authorName}
                        </h4>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span>Google Reviewer</span>
                        </div>
                      </div>
                    </div>

                    {/* Rating Stars */}
                    <div className="flex items-center gap-0.5 text-amber-500">
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-500" />
                      ))}
                    </div>
                  </div>

                  {/* Review Text */}
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-6 italic">
                    &ldquo;{rev.text}&rdquo;
                  </p>
                </div>

                {/* Timestamp Footer */}
                <div className="pt-4 border-t border-border/50 text-[11px] text-muted-foreground flex items-center justify-between">
                  <span>{rev.relativeTime}</span>
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-blue-600 dark:text-blue-400">
                    Google Maps
                  </span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          /* Graceful Fallback / Empty State UI */
          <div className="max-w-xl mx-auto rounded-3xl border border-dashed border-border/80 bg-card/50 p-10 sm:p-12 text-center space-y-5 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center shadow-inner">
              <Star className="w-7 h-7 fill-amber-500 text-amber-500" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-foreground">
                Google Reviews Coming Soon
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Be the first to share your experience with{' '}
                <strong className="text-foreground">{studioName}</strong> on Google Maps.
              </p>
            </div>

            {writeReviewUrl && (
              <div className="pt-2">
                <a
                  href={writeReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'sm' }),
                    'rounded-full px-5 gap-2 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-semibold'
                  )}
                >
                  <MessageSquarePlus className="w-4 h-4" />
                  <span>Be the First to Review</span>
                  <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
