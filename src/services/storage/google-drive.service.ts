import { drive_v3, drive, auth } from 'googleapis/build/src/apis/drive';

/**
 * Creates an authorized OAuth2 client using googleapis native OAuth2.
 */
function getGoogleOAuth2(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('FATAL: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is not configured in environment variables.');
  }

  const oauth2Client = new auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  return oauth2Client;
}

/**
 * Extracts a Google Drive file or folder ID from various Google Drive URL formats or a raw ID string.
 * Supports:
 * - Direct ID: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2up08"
 * - File link: "https://drive.google.com/file/d/FILE_ID/view"
 * - Folder link: "https://drive.google.com/drive/folders/FOLDER_ID"
 * - Open link: "https://drive.google.com/open?id=FILE_ID"
 * - Usercontent link: "https://lh3.googleusercontent.com/d/FILE_ID"
 * - Query param link: "https://drive.google.com/uc?id=FILE_ID&export=download"
 */
export function extractGoogleDriveId(urlOrId: string | null | undefined): string | null {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const trimmed = urlOrId.trim();

  // If already a raw Drive ID (typically 20-60 alphanumeric, dashes, underscores)
  if (
    /^[a-zA-Z0-9_-]{20,60}$/.test(trimmed) &&
    !trimmed.includes('/') &&
    !trimmed.includes(':') &&
    !trimmed.includes('.')
  ) {
    return trimmed;
  }

  // /file/d/ID or /folders/ID or /open/ID
  const fileDMatch = trimmed.match(/\/(?:file\/d|folders|open)\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    return fileDMatch[1];
  }

  // ?id=ID or &id=ID
  const idQueryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idQueryMatch && idQueryMatch[1]) {
    return idQueryMatch[1];
  }

  // googleusercontent.com/d/ID
  const userContentMatch = trimmed.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (userContentMatch && userContentMatch[1]) {
    return userContentMatch[1];
  }

  return null;
}

/**
 * Converts a Google Drive URL or ID into a direct image rendering link using the
 * Google Drive Thumbnail API: https://drive.google.com/thumbnail?id=FILE_ID&sz=w2500
 *
 * This endpoint consistently returns raw image bytes without Google's virus-scan 302
 * redirects or HTML interstitial wrappers, completely bypassing CORS and redirect blocks
 * with zero server load.
 *
 * If the input is not a Google Drive link, returns the original URL untouched.
 */
export function convertToDirectDriveLink(originalUrlOrId: string | null | undefined): string {
  if (!originalUrlOrId || typeof originalUrlOrId !== 'string') return '';
  const trimmed = originalUrlOrId.trim();

  const id = extractGoogleDriveId(trimmed);
  if (id) {
    return `https://drive.google.com/thumbnail?id=${id}&sz=w2500`;
  }

  // Not a Google Drive URL/ID, return original (e.g. AWS S3, Cloudflare R2, Unsplash)
  return trimmed;
}

/**
 * Creates an authorized google.drive instance using tenant credentials.
 * Accepts:
 * - OAuth2Client instance
 * - Refresh token string
 * - Credentials object: { refresh_token: string } or { refreshToken: string }
 */
export function getGoogleDriveClient(tenantAuth: any): drive_v3.Drive {
  if (!tenantAuth) {
    throw new Error('Google Drive authorization credentials are required.');
  }

  // Already an OAuth2Client instance
  if (
    typeof tenantAuth === 'object' &&
    'credentials' in tenantAuth &&
    typeof tenantAuth.getRequestHeaders === 'function'
  ) {
    return drive({ version: 'v3', auth: tenantAuth as any });
  }

  // Refresh token string
  if (typeof tenantAuth === 'string') {
    const oauth2Client = getGoogleOAuth2(tenantAuth);
    return drive({ version: 'v3', auth: oauth2Client });
  }

  // Credentials object
  const refreshToken = tenantAuth.refresh_token || tenantAuth.refreshToken;
  if (refreshToken && typeof refreshToken === 'string') {
    const oauth2Client = getGoogleOAuth2(refreshToken);
    return drive({ version: 'v3', auth: oauth2Client });
  }

  throw new Error('Unable to construct Google Drive API client: refresh token is missing or invalid.');
}

/**
 * Automatically sets Google Drive folder permissions to public:
 * role: 'reader', type: 'anyone'
 * This completely eliminates the manual operator requirement to set "Anyone with the link" permissions.
 */
export async function makeFolderPublic(folderIdOrUrl: string, tenantAuth: any): Promise<boolean> {
  const folderId = extractGoogleDriveId(folderIdOrUrl) || folderIdOrUrl?.trim();
  if (!folderId) {
    console.warn('[GOOGLE_DRIVE_SERVICE] Cannot make folder public: Invalid or missing folder ID.');
    return false;
  }

  try {
    const drive = getGoogleDriveClient(tenantAuth);

    await drive.permissions.create({
      fileId: folderId,
      supportsAllDrives: true,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    return true;
  } catch (error: any) {
    // If permission already exists (HTTP 409 or message), treat as successful idempotency
    const isAlreadyPublic =
      error?.status === 409 ||
      error?.code === 409 ||
      error?.message?.includes('already exists') ||
      error?.message?.includes('Duplicate');

    if (isAlreadyPublic) {
      return true;
    }

    console.error(
      `[GOOGLE_DRIVE_SERVICE] Failed to set public reader permission on folder ${folderId}:`,
      error?.message || error
    );
    return false;
  }
}

/**
 * Resolves or creates a dedicated Google Drive folder for a customer project/selection board.
 * Searches for an existing folder with `name = folderName` under `parentFolderId`.
 * If it exists, returns its ID. If not, creates the folder under `parentFolderId`,
 * ensures public reader permissions, and returns the new folder's ID.
 */
export async function getOrCreateCustomerFolder(
  parentFolderId: string | null | undefined,
  folderName: string,
  tenantAuth: any
): Promise<string> {
  if (!folderName || !folderName.trim()) {
    throw new Error('Folder name is required for dynamic Google Drive folder creation.');
  }

  const cleanFolderName = folderName.trim().replace(/\s+/g, ' ');
  const driveClient = getGoogleDriveClient(tenantAuth);

  const cleanParentId = parentFolderId
    ? extractGoogleDriveId(parentFolderId) || parentFolderId.trim()
    : null;

  // Escape single quotes and backslashes for Google Drive search query
  const escapedName = cleanFolderName.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  let query = `mimeType = 'application/vnd.google-apps.folder' and trashed = false and name = '${escapedName}'`;
  if (cleanParentId) {
    query += ` and '${cleanParentId}' in parents`;
  }

  try {
    const listResponse = await driveClient.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      pageSize: 1,
    });

    const existingFolder = listResponse.data.files?.[0];
    if (existingFolder?.id) {
      // Ensure the existing folder has public reader permissions
      makeFolderPublic(existingFolder.id, tenantAuth).catch((err) =>
        console.warn('[GOOGLE_DRIVE_SERVICE] Failed to ensure public permissions on existing folder:', err?.message)
      );
      return existingFolder.id;
    }

    // Folder does not exist, create it
    const fileMetadata: drive_v3.Schema$File = {
      name: cleanFolderName,
      mimeType: 'application/vnd.google-apps.folder',
    };

    if (cleanParentId) {
      fileMetadata.parents = [cleanParentId];
    }

    const createResponse = await driveClient.files.create({
      requestBody: fileMetadata,
      fields: 'id, name',
      supportsAllDrives: true,
    });

    const newFolderId = createResponse.data.id;
    if (!newFolderId) {
      throw new Error(`Google Drive API did not return an ID for created folder "${cleanFolderName}".`);
    }

    // Automatically set public reader permissions on the newly created folder
    await makeFolderPublic(newFolderId, tenantAuth).catch((err) =>
      console.warn('[GOOGLE_DRIVE_SERVICE] Failed to set public permission on new customer folder:', err?.message)
    );

    return newFolderId;
  } catch (error: any) {
    console.error(
      `[GOOGLE_DRIVE_SERVICE] Failed in getOrCreateCustomerFolder for "${cleanFolderName}":`,
      error?.message || error
    );
    throw error;
  }
}

/**
 * Automatically sets Google Drive file permissions to public:
 * role: 'reader', type: 'anyone'
 */
export async function makeFilePublic(fileIdOrUrl: string, tenantAuth: any): Promise<boolean> {
  const fileId = extractGoogleDriveId(fileIdOrUrl) || fileIdOrUrl?.trim();
  if (!fileId) {
    console.warn('[GOOGLE_DRIVE_SERVICE] Cannot make file public: Invalid or missing file ID.');
    return false;
  }

  try {
    const drive = getGoogleDriveClient(tenantAuth);

    await drive.permissions.create({
      fileId,
      supportsAllDrives: true,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    return true;
  } catch (error: any) {
    const isAlreadyPublic =
      error?.status === 409 ||
      error?.code === 409 ||
      error?.message?.includes('already exists') ||
      error?.message?.includes('Duplicate');

    if (isAlreadyPublic) {
      return true;
    }

    console.error(
      `[GOOGLE_DRIVE_SERVICE] Failed to set public reader permission on file ${fileId}:`,
      error?.message || error
    );
    return false;
  }
}

/**
 * Batch-updates public reader permissions for a list of Google Drive file or folder IDs.
 * Uses controlled concurrency to prevent hitting Google Drive API rate limits.
 */
export async function batchMakeDriveAssetsPublic(
  assetIdsOrUrls: string[],
  tenantAuth: any,
  concurrency = 4
): Promise<{ successCount: number; failureCount: number }> {
  const uniqueIds = Array.from(
    new Set(
      assetIdsOrUrls
        .map((item) => extractGoogleDriveId(item) || item?.trim())
        .filter((id): id is string => Boolean(id && id.length > 0))
    )
  );

  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < uniqueIds.length; i += concurrency) {
    const chunk = uniqueIds.slice(i, i + concurrency);
    const results = await Promise.all(
      chunk.map((id) => makeFolderPublic(id, tenantAuth))
    );

    for (const res of results) {
      if (res) successCount++;
      else failureCount++;
    }
  }

  return { successCount, failureCount };
}

/**
 * Permanently deletes a Google Drive folder and all of its contents to free cloud storage.
 * Handles 404 (already deleted / not found) idempotently.
 */
export async function deleteDriveFolder(folderIdOrUrl: string, tenantAuth: any): Promise<boolean> {
  const folderId = extractGoogleDriveId(folderIdOrUrl) || folderIdOrUrl?.trim();
  if (!folderId) {
    console.warn('[GOOGLE_DRIVE_SERVICE] Cannot delete folder: Invalid or missing folder ID.');
    return false;
  }

  try {
    const driveClient = getGoogleDriveClient(tenantAuth);

    await driveClient.files.delete({
      fileId: folderId,
      supportsAllDrives: true,
    });

    return true;
  } catch (error: any) {
    // If file/folder is already deleted or not found (HTTP 404), treat as idempotent success
    if (error?.status === 404 || error?.code === 404 || error?.message?.includes('File not found')) {
      return true;
    }

    console.error(
      `[GOOGLE_DRIVE_SERVICE] Failed to delete Google Drive folder ${folderId}:`,
      error?.message || error
    );
    throw new Error(`Google Drive API error while deleting folder: ${error?.message || error}`);
  }
}

/**
 * Batch deletes Google Drive files or folders by ID or URL.
 */
export async function batchDeleteDriveAssets(
  assetIdsOrUrls: string[],
  tenantAuth: any,
  concurrency = 4
): Promise<{ successCount: number; failureCount: number }> {
  const uniqueIds = Array.from(
    new Set(
      assetIdsOrUrls
        .map((item) => extractGoogleDriveId(item) || item?.trim())
        .filter((id): id is string => Boolean(id && id.length > 0))
    )
  );

  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < uniqueIds.length; i += concurrency) {
    const chunk = uniqueIds.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      chunk.map((id) => deleteDriveFolder(id, tenantAuth))
    );

    for (const res of results) {
      if (res.status === 'fulfilled' && res.value) successCount++;
      else failureCount++;
    }
  }

  return { successCount, failureCount };
}
