'use server';

import { auth } from '@/auth';
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
      const missingKeyMsg =
        'Missing Google Places API Key: Please configure GOOGLE_PLACES_API_KEY in your server environment (.env) to enable live Google Places search.';
      console.error(`[GMB_ACTION_SEARCH_ERROR] ${missingKeyMsg}`);
      throw new Error(missingKeyMsg);
    }

    // Google Places API (New) Text Search exclusively
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
        // Google Places API (New) error format:
        // { "error": { "code": 400, "message": "API key not valid. Please pass a valid API key.", "status": "INVALID_ARGUMENT", "details": [...] } }
        googleErrorMessage =
          errorJson.error?.message ||
          errorJson.error?.status ||
          errorJson.message ||
          '';
      } catch {
        // Fall back to errText if non-JSON
        googleErrorMessage = errText.trim();
      }

      if (!googleErrorMessage) {
        googleErrorMessage = `Google Places API HTTP ${response.status}: ${response.statusText}`;
      }

      // Strict error propagation: Throw the exact Google error without generic wrapping
      throw new Error(googleErrorMessage);
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
 * Server action to resolve a Google Place ID from various Google Maps URLs or direct Place ID strings.
 * Supports:
 * - maps.app.goo.gl / goo.gl/maps short links (following HTTP 301/302 redirects)
 * - google.com/maps/place/... links
 * - google.com/maps?cid=... or data=... links
 * - Direct Place ID input (e.g. ChIJ...)
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

    // 1. Direct Place ID Detection (e.g., "ChIJ..." or alphanumeric ID without slashes/protocol)
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
          googleMapsUri: details?.googleMapsUri,
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
            'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
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
          googleMapsUri: details?.googleMapsUri,
        },
      };
    }

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

    // Step C: Pass this extracted name into searchPlacesAction to reliably resolve the exact placeId
    if (extractedName && extractedName.length > 1) {
      console.log('[GMB_ACTION] Extracted business name from Google Maps link:', extractedName);
      const searchRes = await searchPlacesAction(extractedName);
      if (searchRes.success && searchRes.data && searchRes.data.length > 0) {
        return {
          success: true,
          data: searchRes.data[0],
        };
      } else if (!searchRes.success) {
        return {
          success: false,
          error:
            searchRes.error ||
            `Found business name "${extractedName}" from the link, but Google Places search failed.`,
        };
      }
    }

    return {
      success: false,
      error:
        'Could not automatically resolve a Google Place ID from the provided link. Please ensure this is a link to a verified business on Google Maps, or use the search box to find your studio by name.',
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
 * Server action to get full details of an already saved placeId.
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
    const details = await GmbService.getPlaceData(cleanId);

    if (!details) {
      return {
        success: true,
        data: {
          placeId: cleanId,
          name: 'Connected Google Business',
          formattedAddress: '',
        },
      };
    }

    return {
      success: true,
      data: {
        placeId: cleanId,
        name: details.name || 'Connected Google Business',
        formattedAddress: '',
        rating: details.rating,
        userRatingCount: details.userRatingCount,
        googleMapsUri: details.googleMapsUri,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to fetch place details.',
    };
  }
}
