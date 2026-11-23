import { OAuth2Client } from 'google-auth-library';
import { StorageService } from '@/services/storage.service';

export { StorageService };

/**
 * Initializes an authenticated Google OAuth2Client using platform environment credentials
 * and a tenant's decrypted refresh_token.
 */
export function getGoogleOAuth2Client(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('FATAL: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is not configured in environment variables.');
  }

  const oauth2Client = new OAuth2Client(clientId, clientSecret);
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  return oauth2Client;
}

/**
 * Obtains a fresh access token for a tenant's Google Drive integration.
 */
export async function getGoogleDriveAccessToken(refreshToken: string): Promise<string> {
  const oauth2Client = getGoogleOAuth2Client(refreshToken);
  const tokenResponse = await oauth2Client.getAccessToken();
  const token = tokenResponse.token;

  if (!token) {
    throw new Error('Failed to acquire valid Google Drive access token from refresh token.');
  }

  return token;
}

/**
 * Initiates a Google Drive Resumable Upload session for a direct browser-to-cloud upload.
 */
export async function createGoogleDriveResumableUploadSession(options: {
  refreshToken: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  folderId?: string | null;
  origin?: string;
}): Promise<string> {
  const accessToken = await getGoogleDriveAccessToken(options.refreshToken);

  const metadata: Record<string, any> = {
    name: options.fileName,
  };

  if (options.folderId) {
    metadata.parents = [options.folderId];
  }

  const origin = options.origin || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'Origin': origin,
      'X-Upload-Content-Type': options.mimeType,
      'X-Upload-Content-Length': options.sizeBytes.toString(),
    },
    body: JSON.stringify(metadata),
  });

  const uploadUrl = response.headers.get('location');
  if (!response.ok || !uploadUrl) {
    const errorText = await response.text();
    throw new Error(`Google Drive resumable upload session creation failed: ${errorText}`);
  }

  return uploadUrl;
}
