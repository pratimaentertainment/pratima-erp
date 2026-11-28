import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Strict regex validators for Google Places Photo identifiers.
 * Prevents SSRF / URL injection.
 */
const NEW_PLACES_PHOTO_REGEX = /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/;
const LEGACY_PHOTO_REF_REGEX = /^[A-Za-z0-9_=-]{20,2000}$/;

function getGoogleApiKey(): string | null {
  return (
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    null
  );
}

/**
 * Secure Server-Side Proxy for Google Places Photos.
 * Eliminates client-side API key leakage in browser HTML/DOM and network calls.
 * Implements edge caching headers: s-maxage=86400 (24h) and stale-while-revalidate=604800 (7d).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const photoName = searchParams.get('name');
    const rawMaxWidth = searchParams.get('maxWidth');

    if (!photoName || typeof photoName !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request: Missing photo "name" query parameter.' },
        { status: 400 }
      );
    }

    const trimmedName = photoName.trim();

    // Check valid identifier format
    const isNewApi = NEW_PLACES_PHOTO_REGEX.test(trimmedName);
    const isLegacyApi = !isNewApi && LEGACY_PHOTO_REF_REGEX.test(trimmedName);

    if (!isNewApi && !isLegacyApi) {
      return NextResponse.json(
        { error: 'Bad Request: Invalid photo resource identifier format.' },
        { status: 400 }
      );
    }

    // Clamp maxWidth between 400 and 1600 px (default 1200)
    let maxWidth = 1200;
    if (rawMaxWidth) {
      const parsed = parseInt(rawMaxWidth, 10);
      if (!isNaN(parsed)) {
        maxWidth = Math.max(400, Math.min(1600, parsed));
      }
    }

    const apiKey = getGoogleApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Server Configuration: Missing Google Places API Key.' },
        { status: 503 }
      );
    }

    // Build upstream Google URL based on API version
    let upstreamUrl: string;
    if (isNewApi) {
      upstreamUrl = `https://places.googleapis.com/v1/${trimmedName}/media?maxWidthPx=${maxWidth}&key=${apiKey}`;
    } else {
      upstreamUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${encodeURIComponent(
        trimmedName
      )}&key=${apiKey}`;
    }

    // Fetch binary photo from Google with redirect following
    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'User-Agent': 'FRAMIQ-ERP/1.0 (Google Business Photos Proxy)',
      },
    });

    if (!upstreamResponse.ok) {
      console.error(
        `[GMB_PHOTO_PROXY] Upstream Google error: HTTP ${upstreamResponse.status} ${upstreamResponse.statusText}`
      );
      return NextResponse.json(
        { error: `Upstream Google error: HTTP ${upstreamResponse.status}` },
        { status: upstreamResponse.status }
      );
    }

    const contentType = upstreamResponse.headers.get('content-type') || 'image/jpeg';
    const imageBuffer = await upstreamResponse.arrayBuffer();

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: any) {
    console.error('[GMB_PHOTO_PROXY_EXCEPTION]', error?.message || error);
    return NextResponse.json(
      { error: 'Internal server error proxying Google Place photo.' },
      { status: 500 }
    );
  }
}
