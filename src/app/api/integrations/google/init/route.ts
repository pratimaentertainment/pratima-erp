import { auth } from '@/auth';
import { OAuth2Client } from 'google-auth-library';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

/**
 * Initiates the Google OAuth 2.0 flow for Studio Owners (Tenants).
 * Authenticates tenant session, initializes OAuth2Client,
 * and redirects to Google's consent screen requesting offline access to drive.file.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;

    if (!user?.tenantId) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', '/settings/storage');
      loginUrl.searchParams.set('error', 'unauthorized');
      return NextResponse.redirect(loginUrl);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('[GOOGLE_OAUTH_INIT_ERROR] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables');
      const errorUrl = new URL('/settings/storage', req.url);
      errorUrl.searchParams.set('error', 'google_credentials_missing');
      return NextResponse.redirect(errorUrl);
    }

    // Resolve callback URL based on current host or environment
    const redirectUri = `${req.nextUrl.origin}/api/integrations/google/callback`;

    const oauth2Client = new OAuth2Client(
      clientId,
      clientSecret,
      redirectUri
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/drive.file'],
      state: user.tenantId,
    });

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('[GOOGLE_OAUTH_INIT_FATAL]', error);
    const errorUrl = new URL('/settings/storage', req.url);
    errorUrl.searchParams.set('error', 'oauth_initiation_failed');
    return NextResponse.redirect(errorUrl);
  }
}
