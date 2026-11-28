import { unstable_cache } from 'next/cache';

export interface GmbReview {
  id: string;
  authorName: string;
  authorPhotoUrl?: string | null;
  authorUrl?: string | null;
  rating: number;
  text: string;
  relativeTime: string;
  publishTime?: string | null;
}

export interface GmbPhoto {
  id: string;
  url: string;
  width?: number;
  height?: number;
  attribution?: string | null;
}

export interface GmbPlaceData {
  placeId: string;
  name?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  writeReviewUri: string;
  reviews: GmbReview[];
  photos: GmbPhoto[];
}

/**
 * Lead Enterprise Google My Business (GMB) Integration Service
 * Uses Google Places API (New & Legacy with automatic fallback)
 * Cached with Next.js revalidation (1 hour) to protect quota and optimize TTFB.
 */
class GoogleMyBusinessService {
  private getApiKey(): string | null {
    return (
      process.env.GOOGLE_PLACES_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
      null
    );
  }

  /**
   * Internal uncached fetcher for raw place data from Google
   */
  private async fetchRawPlaceData(placeId: string): Promise<GmbPlaceData | null> {
    if (!placeId || typeof placeId !== 'string' || placeId.trim() === '') {
      return null;
    }

    const cleanPlaceId = placeId.trim();
    const apiKey = this.getApiKey();
    const isUrl = cleanPlaceId.startsWith('http://') || cleanPlaceId.startsWith('https://');
    const googleMapsUri = isUrl
      ? cleanPlaceId
      : `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${encodeURIComponent(cleanPlaceId)}`;
    const writeReviewUri = isUrl
      ? cleanPlaceId
      : `https://search.google.com/local/writereview?placeid=${encodeURIComponent(cleanPlaceId)}`;

    if (isUrl || !apiKey) {
      // Graceful degradation when Google Places API key is not configured or direct URL is stored
      return {
        placeId: cleanPlaceId,
        googleMapsUri,
        writeReviewUri,
        reviews: [],
        photos: [],
      };
    }

    try {
      // 1. Primary: Google Places API (New)
      const newApiUrl = `https://places.googleapis.com/v1/places/${encodeURIComponent(cleanPlaceId)}`;
      const newResponse = await fetch(newApiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'id,displayName,rating,userRatingCount,googleMapsUri,reviews,photos',
        },
        next: { revalidate: 3600 },
      });

      if (newResponse.ok) {
        const data = await newResponse.json();

        // Extract and sort reviews (highest rating first, max 5)
        const rawReviews: any[] = Array.isArray(data.reviews) ? data.reviews : [];
        const reviews: GmbReview[] = rawReviews
          .map((rev, idx) => ({
            id: rev.name || `rev-${idx}`,
            authorName: rev.authorAttribution?.displayName || 'Verified Client',
            authorPhotoUrl: rev.authorAttribution?.photoUri || null,
            authorUrl: rev.authorAttribution?.uri || null,
            rating: typeof rev.rating === 'number' ? rev.rating : 5,
            text: rev.text?.text || rev.originalText?.text || '',
            relativeTime: rev.relativePublishTimeDescription || 'Recently',
            publishTime: rev.publishTime || null,
          }))
          .filter((rev) => rev.text.length > 0)
          .sort((a, b) => b.rating - a.rating)
          .slice(0, 5);

        // Extract photos (New API media endpoint)
        const rawPhotos: any[] = Array.isArray(data.photos) ? data.photos : [];
        const photos: GmbPhoto[] = rawPhotos.slice(0, 12).map((photo, idx) => {
          const photoName = photo.name; // e.g. "places/{placeId}/photos/{photoId}"
          const mediaUrl = `/api/gmb/photo?name=${encodeURIComponent(photoName)}&maxWidth=1200`;
          return {
            id: photoName || `photo-${idx}`,
            url: mediaUrl,
            width: photo.widthPx,
            height: photo.heightPx,
            attribution: photo.authorAttributions?.[0]?.displayName || null,
          };
        });

        return {
          placeId: cleanPlaceId,
          name: data.displayName?.text,
          rating: data.rating,
          userRatingCount: data.userRatingCount,
          googleMapsUri: data.googleMapsUri,
          writeReviewUri,
          reviews,
          photos,
        };
      }

      // 2. Fallback: Google Places API (Legacy Place Details)
      const legacyUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
        cleanPlaceId
      )}&fields=name,rating,user_ratings_total,url,reviews,photos&key=${apiKey}`;

      const legacyResponse = await fetch(legacyUrl, {
        method: 'GET',
        next: { revalidate: 3600 },
      });

      if (legacyResponse.ok) {
        const legacyData = await legacyResponse.json();
        if (legacyData.result) {
          const result = legacyData.result;

          const rawReviews: any[] = Array.isArray(result.reviews) ? result.reviews : [];
          const reviews: GmbReview[] = rawReviews
            .map((rev, idx) => ({
              id: `leg-rev-${idx}`,
              authorName: rev.author_name || 'Verified Client',
              authorPhotoUrl: rev.profile_photo_url || null,
              authorUrl: rev.author_url || null,
              rating: typeof rev.rating === 'number' ? rev.rating : 5,
              text: rev.text || '',
              relativeTime: rev.relative_time_description || 'Recently',
              publishTime: rev.time ? new Date(rev.time * 1000).toISOString() : null,
            }))
            .filter((rev) => rev.text.length > 0)
            .sort((a, b) => b.rating - a.rating)
            .slice(0, 5);

          const rawPhotos: any[] = Array.isArray(result.photos) ? result.photos : [];
          const photos: GmbPhoto[] = rawPhotos.slice(0, 12).map((photo, idx) => ({
            id: photo.photo_reference || `leg-photo-${idx}`,
            url: `/api/gmb/photo?name=${encodeURIComponent(photo.photo_reference)}&maxWidth=1200`,
            width: photo.width,
            height: photo.height,
            attribution: photo.html_attributions?.[0] || null,
          }));

          return {
            placeId: cleanPlaceId,
            name: result.name,
            rating: result.rating,
            userRatingCount: result.user_ratings_total,
            googleMapsUri: result.url,
            writeReviewUri,
            reviews,
            photos,
          };
        }
      }

      // If both fail gracefully return fallback shell
      return {
        placeId: cleanPlaceId,
        writeReviewUri,
        reviews: [],
        photos: [],
      };
    } catch (error) {
      // Return safe degradation object on network or parsing error
      console.error('[GMB Service] Error fetching Google Place details:', error);
      return {
        placeId: cleanPlaceId,
        writeReviewUri,
        reviews: [],
        photos: [],
      };
    }
  }

  /**
   * Cached Place Data Fetcher (TTL: 3600 seconds)
   */
  public async getPlaceData(placeId: string | null | undefined): Promise<GmbPlaceData | null> {
    if (!placeId) return null;
    const cleanId = placeId.trim();
    if (!cleanId) return null;

    const cachedFetcher = unstable_cache(
      async (id: string) => this.fetchRawPlaceData(id),
      [`gmb-place-data-${cleanId}`],
      {
        revalidate: 3600,
        tags: ['gmb', `gmb-${cleanId}`],
      }
    );

    return cachedFetcher(cleanId);
  }

  /**
   * Fetch top 5 highest-rated reviews for a Place ID
   */
  /**
   * Fetch fresh uncached place data directly from Google (bypasses Next.js cache)
   */
  public async fetchFreshPlaceData(placeId: string | null | undefined): Promise<GmbPlaceData | null> {
    if (!placeId) return null;
    const cleanId = placeId.trim();
    if (!cleanId) return null;
    return this.fetchRawPlaceData(cleanId);
  }

  public async fetchGmbReviews(placeId: string | null | undefined): Promise<GmbReview[]> {
    const data = await this.getPlaceData(placeId);
    return data?.reviews || [];
  }

  /**
   * Fetch high-res photo URLs for a Place ID
   */
  public async fetchGmbPhotos(placeId: string | null | undefined): Promise<GmbPhoto[]> {
    const data = await this.getPlaceData(placeId);
    return data?.photos || [];
  }
}

export const GmbService = new GoogleMyBusinessService();
