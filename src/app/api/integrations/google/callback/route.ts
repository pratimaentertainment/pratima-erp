import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { encryptJSON } from '@/lib/security/encryption';
import { OAuth2Client } from 'google-auth-library';
import { StorageProvider } from '@prisma/client';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

/**
 * Handles the Google OAuth 2.0 redirect callback.
 * Exchanges authorization code for tokens, extracts the refresh_token,
 * encrypts it with AES-256-GCM, and upserts the StorageIntegration record for the tenant.
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // Contains tenantId passed during init
    const errorParam = searchParams.get('error');

    if (errorParam) {
      console.error('[GOOGLE_OAUTH_CALLBACK_ERROR_PARAM]', errorParam);
      const targetUrl = new URL('/settings/storage', req.url);
      targetUrl.searchParams.set('error', errorParam);
      return NextResponse.redirect(targetUrl);
    }

    if (!code) {
      const targetUrl = new URL('/settings/storage', req.url);
      targetUrl.searchParams.set('error', 'missing_auth_code');
      return NextResponse.redirect(targetUrl);
    }

    // Authenticate session to verify user context
    const session = await auth();
    const user = session?.user as any;

    const tenantId = state || user?.tenantId;
    if (!tenantId) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('error', 'session_expired');
      return NextResponse.redirect(loginUrl);
    }

    // Security check: if session user belongs to different tenant, reject
    if (user?.tenantId && state && user.tenantId !== state) {
      console.error('[GOOGLE_OAUTH_TENANT_MISMATCH]', { sessionTenant: user.tenantId, stateTenant: state });
      const targetUrl = new URL('/settings/storage', req.url);
      targetUrl.searchParams.set('error', 'tenant_mismatch');
      return NextResponse.redirect(targetUrl);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('[GOOGLE_OAUTH_CALLBACK_ERROR] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
      const targetUrl = new URL('/settings/storage', req.url);
      targetUrl.searchParams.set('error', 'google_credentials_missing');
      return NextResponse.redirect(targetUrl);
    }

    const redirectUri = `${req.nextUrl.origin}/api/integrations/google/callback`;

    const oauth2Client = new OAuth2Client(
      clientId,
      clientSecret,
      redirectUri
    );

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    let refreshToken = tokens.refresh_token;

    // Check if an existing integration exists for this tenant
    const existingIntegration = await prisma.storageIntegration.findFirst({
      where: {
        tenantId,
        provider: StorageProvider.GOOGLE_DRIVE,
        deletedAt: null,
      },
    });

    if (!refreshToken && existingIntegration) {
      // If re-authenticating and Google did not return a new refresh token, preserve existing
      try {
        const { decryptJSON } = await import('@/lib/security/encryption');
        const existingCreds = decryptJSON<{ refresh_token?: string }>(existingIntegration.encryptedCredentials);
        refreshToken = existingCreds.refresh_token;
      } catch (err) {
        console.warn('[GOOGLE_OAUTH_CALLBACK] Failed to decrypt previous refresh token');
      }
    }

    if (!refreshToken) {
      console.error('[GOOGLE_OAUTH_NO_REFRESH_TOKEN] Google did not return a refresh token');
      const targetUrl = new URL('/settings/storage', req.url);
      targetUrl.searchParams.set('error', 'no_refresh_token_returned');
      return NextResponse.redirect(targetUrl);
    }

    // Encrypt the token using encryption.ts (JSON format: { "refresh_token": "..." })
    const encryptedCredentials = encryptJSON({
      refresh_token: refreshToken,
    });

    // Check if default integration exists
    const existingCount = await prisma.storageIntegration.count({
      where: { tenantId, deletedAt: null },
    });

    if (existingIntegration) {
      await prisma.storageIntegration.update({
        where: { id: existingIntegration.id },
        data: {
          encryptedCredentials,
          isActive: true,
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.storageIntegration.create({
        data: {
          tenantId,
          provider: StorageProvider.GOOGLE_DRIVE,
          encryptedCredentials,
          isActive: true,
          isDefault: existingCount === 0,
        },
      });
    }

    const targetUrl = new URL('/settings/storage', req.url);
    targetUrl.searchParams.set('success', 'google_connected');
    return NextResponse.redirect(targetUrl);
  } catch (error: any) {
    console.error('[GOOGLE_OAUTH_CALLBACK_FATAL]', error);
    const targetUrl = new URL('/settings/storage', req.url);
    targetUrl.searchParams.set('error', 'token_exchange_failed');
    return NextResponse.redirect(targetUrl);
  }
}
