'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath, revalidateTag } from 'next/cache';
import { GmbService } from '@/services/marketing/gmb.service';

/**
 * Validates active tenant user session.
 */
async function validateSession() {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.tenantId) {
    throw new Error('Unauthorized: No active tenant session found.');
  }
  return {
    tenantId: user.tenantId as string,
    userId: user.id as string,
  };
}

/**
 * Retrieves configured Google Places / Maps API key from environment.
 */
function getGooglePlacesApiKey(): string | null {
  const key =
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    null;
  return key ? key.trim() : null;
}

export interface PlaceSuggestion {
  placeId: string;
  name: string;
  formattedAddress: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
}

/**
 * Server action to check whether Google Places API Key is configured.
 */
export async function checkGmbConfigAction(): Promise<{
  success: boolean;
  hasApiKey: boolean;
}> {
  const apiKey = getGooglePlacesApiKey();
  return {
    success: true,
    hasApiKey: Boolean(apiKey),
  };
}

/**
 * Server action to search Google Places using Text Search.
 * Exclusively uses Google Places API (New) via `https://places.googleapis.com/v1/places:searchText`.
 */
export async function searchPlacesAction(query: string): Promise<{
  success: boolean;
  data?: PlaceSuggestion[];
  error?: string;
}> {
  try {
    await validateSession();

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return { success: true, data: [] };
    }

    const cleanQuery = query.trim();
    const apiKey = getGooglePlacesApiKey();

    if (!apiKey) {
      return {
        success: false,
        error:
          'Live search requires GOOGLE_PLACES_API_KEY in server environment. You can connect immediately below by pasting your Google Maps link or Place ID.',
      };
    }

    // Google Places API (New) Text Search
    const newApiUrl = 'https://places.googleapis.com/v1/places:searchText';
    const response = await fetch(newApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.googleMapsUri,places.rating,places.userRatingCount',
      },
      body: JSON.stringify({
        textQuery: cleanQuery,
      }),
      next: { revalidate: 300 }, // 5 min cache
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[GMB_ACTION] Places API (New) HTTP ${response.status}:`, errText);

      let googleErrorMessage = '';
      try {
        const errorJson = JSON.parse(errText);
        googleErrorMessage =
          errorJson.error?.message ||
          errorJson.error?.status ||
          errorJson.message ||
          '';
      } catch {
        googleErrorMessage = errText.trim();
      }

      if (!googleErrorMessage) {
        googleErrorMessage = `Google Places API HTTP ${response.status}: ${response.statusText}`;
      }

      return {
        success: false,
        error: googleErrorMessage,
      };
    }

    const result = await response.json();
    const rawPlaces = Array.isArray(result.places) ? result.places : [];

    const suggestions: PlaceSuggestion[] = rawPlaces.map((p: any) => ({
      placeId: p.id,
      name: p.displayName?.text || 'Studio / Business',
      formattedAddress: p.formattedAddress || '',
      rating: typeof p.rating === 'number' ? p.rating : undefined,
      userRatingCount: typeof p.userRatingCount === 'number' ? p.userRatingCount : undefined,
      googleMapsUri:
        p.googleMapsUri ||
        `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${encodeURIComponent(p.id)}`,
    }));

    return { success: true, data: suggestions };
  } catch (error: any) {
    console.error('[GMB_ACTION_SEARCH_ERROR]', error?.message || error);
    return {
      success: false,
      error: error?.message || 'An unexpected error occurred while searching Google Places.',
    };
  }
}

/**
 * Server action to resolve a Google Place ID or Verified Location from URLs or strings.
 * Supports:
 * - Direct Place ID input (e.g. ChIJ...)
 * - Shortlinks (maps.app.goo.gl / goo.gl/maps) with HTTP redirect expansion
 * - Standard google.com/maps/place/... links
 * - Fallback Mode B direct link storage when no Google Places API key is configured
 */
export async function extractPlaceIdFromUrlAction(url: string): Promise<{
  success: boolean;
  data?: PlaceSuggestion;
  error?: string;
}> {
  try {
    await validateSession();

    if (!url || typeof url !== 'string' || url.trim() === '') {
      return { success: false, error: 'Please enter a valid Google Maps link or Place ID.' };
    }

    const cleanInput = url.trim();

    // 1. Direct Place ID Detection (e.g. ChIJ... or alphanumeric ID without slashes/protocol)
    if (
      /^[a-zA-Z0-9_-]{20,80}$/.test(cleanInput) &&
      !cleanInput.includes('/') &&
      !cleanInput.includes(':') &&
      !cleanInput.includes('.')
    ) {
      const details = await GmbService.getPlaceData(cleanInput);
      return {
        success: true,
        data: {
          placeId: cleanInput,
          name: details?.name || 'Verified Google Place',
          formattedAddress: '',
          rating: details?.rating,
          userRatingCount: details?.userRatingCount,
          googleMapsUri:
            details?.googleMapsUri ||
            `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${encodeURIComponent(cleanInput)}`,
        },
      };
    }

    // 2. Direct Query Param Extraction (query_place_id / placeid / place_id)
    const queryParamMatch = cleanInput.match(/[?&](?:query_place_id|placeid|place_id)=([a-zA-Z0-9_-]+)/i);
    if (queryParamMatch && queryParamMatch[1]) {
      const resolvedId = queryParamMatch[1];
      const details = await GmbService.getPlaceData(resolvedId);
      return {
        success: true,
        data: {
          placeId: resolvedId,
          name: details?.name || 'Verified Google Place',
          formattedAddress: '',
          rating: details?.rating,
          userRatingCount: details?.userRatingCount,
          googleMapsUri:
            details?.googleMapsUri ||
            `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${encodeURIComponent(resolvedId)}`,
        },
      };
    }

    // Step A: Use a native fetch with standard browser User-Agent and redirect: 'follow' to expand shortlinks
    let expandedUrl = cleanInput;
    let htmlContent = '';

    if (
      cleanInput.includes('goo.gl') ||
      cleanInput.includes('maps.app') ||
      cleanInput.includes('google.com') ||
      cleanInput.startsWith('http')
    ) {
      try {
        const response = await fetch(cleanInput, {
          method: 'GET',
          redirect: 'follow',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        });

        if (response.url) {
          expandedUrl = response.url;
        }

        htmlContent = await response.text();
      } catch (redirectErr: any) {
        console.warn('[GMB_ACTION] URL expansion redirect warning:', redirectErr?.message);
      }
    }

    // Check if expandedUrl now contains a query_place_id or placeid
    const expandedParamMatch = expandedUrl.match(/[?&](?:query_place_id|placeid|place_id)=([a-zA-Z0-9_-]+)/i);
    if (expandedParamMatch && expandedParamMatch[1]) {
      const resolvedId = expandedParamMatch[1];
      const details = await GmbService.getPlaceData(resolvedId);
      return {
        success: true,
        data: {
          placeId: resolvedId,
          name: details?.name || 'Verified Google Place',
          formattedAddress: '',
          rating: details?.rating,
          userRatingCount: details?.userRatingCount,
          googleMapsUri:
            details?.googleMapsUri ||
            `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${encodeURIComponent(resolvedId)}`,
        },
      };
    }

    // Look for ChIJ pattern in expanded URL or HTML content
    const chijMatch = (expandedUrl + ' ' + htmlContent).match(/(ChIJ[a-zA-Z0-9_-]{20,80})/);
    const directChij = chijMatch ? chijMatch[1] : null;

    // Step B: Extract the business name from the URL path or HTML content
    let extractedName: string | null = null;

    // Pattern 1: /place/Business+Name/ or /place/Business%20Name/
    const placePathMatch = expandedUrl.match(/\/place\/([^/@?#]+)/i);
    if (placePathMatch && placePathMatch[1]) {
      extractedName = decodeURIComponent(placePathMatch[1].replace(/\+/g, ' ')).trim();
    }

    // Pattern 2: /search/Business+Name/ or /maps/search/Business+Name
    if (!extractedName) {
      const searchPathMatch = expandedUrl.match(/\/search\/([^/@?#]+)/i);
      if (searchPathMatch && searchPathMatch[1]) {
        extractedName = decodeURIComponent(searchPathMatch[1].replace(/\+/g, ' ')).trim();
      }
    }

    // Pattern 3: URL query parameters (q or query)
    if (!extractedName) {
      try {
        const parsed = new URL(expandedUrl);
        const qParam = parsed.searchParams.get('q') || parsed.searchParams.get('query');
        if (qParam && !qParam.startsWith('http') && !/^-?\d+(\.\d+)?,?-?\d+(\.\d+)?$/.test(qParam)) {
          extractedName = qParam.trim();
        }
      } catch {
        // Not a standard URL
      }
    }

    // Pattern 4: HTML meta or title tags if redirected to HTML page
    if (!extractedName && htmlContent) {
      const titleMatch = htmlContent.match(/<title>(.*?)(?:\s*-\s*Google\s*Maps)?<\/title>/i);
      if (
        titleMatch &&
        titleMatch[1] &&
        !titleMatch[1].toLowerCase().includes('google maps') &&
        !titleMatch[1].toLowerCase().includes('before you continue')
      ) {
        extractedName = titleMatch[1].trim();
      }

      if (!extractedName) {
        const ogTitleMatch = htmlContent.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i);
        if (ogTitleMatch && ogTitleMatch[1] && !ogTitleMatch[1].toLowerCase().includes('google maps')) {
          extractedName = ogTitleMatch[1].trim();
        }
      }

      if (!extractedName) {
        const htmlPlaceMatch = htmlContent.match(/\/place\/([^/@?"']+)/i);
        if (htmlPlaceMatch && htmlPlaceMatch[1]) {
          extractedName = decodeURIComponent(htmlPlaceMatch[1].replace(/\+/g, ' ')).trim();
        }
      }
    }

    // Clean up extracted name
    if (extractedName) {
      extractedName = extractedName
        .replace(/@.*$/, '')
        .replace(/,[^,]*$/, (match) => (/[-+]?[0-9]*\.?[0-9]+/.test(match) ? '' : match))
        .trim();
    }

    // If API key is present and we have an extracted name, attempt live resolution
    const apiKey = getGooglePlacesApiKey();
    if (apiKey && extractedName && extractedName.length > 1) {
      const searchRes = await searchPlacesAction(extractedName);
      if (searchRes.success && searchRes.data && searchRes.data.length > 0) {
        return {
          success: true,
          data: searchRes.data[0],
        };
      }
    }

    // Direct Place ID found in regex
    if (directChij) {
      const details = await GmbService.getPlaceData(directChij);
      return {
        success: true,
        data: {
          placeId: directChij,
          name: details?.name || extractedName || 'Verified Google Place',
          formattedAddress: '',
          rating: details?.rating,
          userRatingCount: details?.userRatingCount,
          googleMapsUri:
            details?.googleMapsUri ||
            expandedUrl ||
            `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${encodeURIComponent(directChij)}`,
        },
      };
    }

    // Mode B URL Fallback: Store the full expanded Google Maps link
    if (
      expandedUrl.includes('google.com') ||
      expandedUrl.includes('maps.app') ||
      expandedUrl.includes('goo.gl') ||
      cleanInput.startsWith('http')
    ) {
      return {
        success: true,
        data: {
          placeId: expandedUrl,
          name: extractedName || 'Google Maps Verified Location',
          formattedAddress: '',
          googleMapsUri: expandedUrl,
        },
      };
    }

    return {
      success: false,
      error:
        'Could not automatically resolve a Google Place ID or location link. Please check your link or enter your Place ID directly.',
    };
  } catch (error: any) {
    console.error('[GMB_ACTION_EXTRACT_ERROR]', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred while parsing the Google Maps link.',
    };
  }
}

/**
 * Server action to get full details of an already saved placeId or location URL.
 */
export async function getPlaceDetailsAction(placeId: string): Promise<{
  success: boolean;
  data?: PlaceSuggestion;
  error?: string;
}> {
  try {
    await validateSession();

    if (!placeId || typeof placeId !== 'string' || placeId.trim() === '') {
      return { success: false, error: 'Place ID is required.' };
    }

    const cleanId = placeId.trim();
    const isUrl = cleanId.startsWith('http://') || cleanId.startsWith('https://');
    const details = await GmbService.getPlaceData(cleanId);

    const googleMapsUri =
      details?.googleMapsUri ||
      (isUrl
        ? cleanId
        : `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${encodeURIComponent(cleanId)}`);

    return {
      success: true,
      data: {
        placeId: cleanId,
        name: details?.name || 'Connected Google Business',
        formattedAddress: '',
        rating: details?.rating,
        userRatingCount: details?.userRatingCount,
        googleMapsUri,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to fetch place details.',
    };
  }
}

/**
 * Server action to immediately synchronize Google Business media, reviews, and canonical Place ID.
 * Resolves raw URLs to canonical ChIJ... IDs, refreshes Next.js edge cache tags, and fetches fresh data.
 */
export async function syncTenantGmbMediaAction(): Promise<{
  success: boolean;
  data?: {
    placeId: string;
    name?: string;
    rating?: number;
    userRatingCount?: number;
    photoCount: number;
    reviewCount: number;
  };
  error?: string;
}> {
  try {
    const { tenantId } = await validateSession();

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, slug: true, gmbPlaceId: true, name: true },
    });

    if (!tenant) {
      return { success: false, error: 'Tenant record not found.' };
    }

    if (!tenant.gmbPlaceId || tenant.gmbPlaceId.trim() === '') {
      return {
        success: false,
        error: 'No Google My Business profile or location is currently connected to your studio.',
      };
    }

    const currentPlaceId = tenant.gmbPlaceId.trim();
    let resolvedCanonicalId = currentPlaceId;

    // If currently stored as a URL, attempt to resolve canonical ChIJ... ID
    const isUrl = currentPlaceId.startsWith('http://') || currentPlaceId.startsWith('https://');
    if (isUrl) {
      const resolution = await extractPlaceIdFromUrlAction(currentPlaceId);
      if (resolution.success && resolution.data?.placeId && !resolution.data.placeId.startsWith('http')) {
        resolvedCanonicalId = resolution.data.placeId;
        // Persist the upgraded canonical ChIJ... Place ID
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { gmbPlaceId: resolvedCanonicalId },
        });
      }
    }

    // Invalidate caches
    try {
      (revalidateTag as any)('gmb');
      (revalidateTag as any)(`gmb-${currentPlaceId}`);
      if (resolvedCanonicalId !== currentPlaceId) {
        (revalidateTag as any)(`gmb-${resolvedCanonicalId}`);
      }
      revalidatePath('/[slug]', 'page');
      if (tenant.slug) {
        revalidatePath(`/${tenant.slug}`, 'page');
      }
      revalidatePath('/settings/tenant');
      revalidatePath('/dashboard/settings/tenant');
    } catch (cacheErr) {
      console.warn('[GMB_SYNC_CACHE_REVALIDATE_WARN]', cacheErr);
    }

    // Fetch fresh place data directly from Google Places API
    const freshData = await GmbService.fetchFreshPlaceData(resolvedCanonicalId);

    return {
      success: true,
      data: {
        placeId: resolvedCanonicalId,
        name: freshData?.name || tenant.name,
        rating: freshData?.rating,
        userRatingCount: freshData?.userRatingCount,
        photoCount: freshData?.photos?.length || 0,
        reviewCount: freshData?.reviews?.length || 0,
      },
    };
  } catch (error: any) {
    console.error('[GMB_SYNC_ACTION_ERROR]', error?.message || error);
    return {
      success: false,
      error: error?.message || 'Failed to sync Google Business profile.',
    };
  }
}
