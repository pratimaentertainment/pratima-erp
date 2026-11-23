'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { serializePrisma } from '@/lib/serialize';
import { getDecryptedStorageCredentialsInternal } from '@/actions/storage.actions';
import { StorageProvider } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  convertToDirectDriveLink,
  makeFolderPublic,
  batchMakeDriveAssetsPublic,
  extractGoogleDriveId,
  getOrCreateCustomerFolder,
} from '@/services/storage/google-drive.service';
import { createGoogleDriveResumableUploadSession } from '@/lib/storage.service';

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
 * Sanitizes filename to prevent cloud storage key anomalies.
 */
function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

// ============================================================================
// SCHEMAS
// ============================================================================

const generatePresignedUrlSchema = z.object({
  selectionId: z.string().uuid('Invalid selection board ID'),
  filename: z.string().min(1, 'Filename is required'),
  mimeType: z.string().optional().default('image/jpeg'),
  folderName: z.string().optional().default('General'),
});

const byosPhotoSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  byosUrl: z.string().min(1, 'BYOS Cloud URL is required'),
  aspectRatio: z.number().optional().nullable(),
  width: z.number().optional().nullable(),
  height: z.number().optional().nullable(),
});

const byosFolderSchema = z.object({
  folderName: z.string().min(1, 'Folder name is required'),
  externalFolderId: z.string().optional().nullable(),
  photos: z.array(byosPhotoSchema),
});

const syncByosGalleryMetadataSchema = z.object({
  selectionId: z.string().uuid('Invalid selection board ID'),
  foldersData: z.array(byosFolderSchema).min(1, 'At least one folder must be provided'),
});

export type ByosPhotoInput = z.infer<typeof byosPhotoSchema>;
export type ByosFolderInput = z.infer<typeof byosFolderSchema>;

// ============================================================================
// SERVER ACTIONS
// ============================================================================

/**
 * Generates a direct-to-cloud BYOS Pre-signed PUT URL.
 * STRICT BYOS RULE: Image binaries are uploaded directly from the browser to cloud storage.
 * Zero bytes touch the Next.js API or Server Action runtime.
 */
export async function generateByosPresignedUrlAction(input: z.infer<typeof generatePresignedUrlSchema>) {
  try {
    const { tenantId } = await validateSession();
    const validated = generatePresignedUrlSchema.parse(input);

    const safeName = sanitizeFileName(validated.filename);
    const cleanFolder = validated.folderName.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'General';
    const objectKey = `${tenantId}/selections/${validated.selectionId}/${cleanFolder}/${Date.now()}-${safeName}`;

    // Check if tenant has BYOS cloud storage configured
    const integration = await getDecryptedStorageCredentialsInternal(tenantId);

    if (integration && (integration.provider === StorageProvider.AWS_S3 || integration.provider === StorageProvider.CLOUDFLARE_R2)) {
      const { provider, credentials } = integration;
      const isR2 = provider === StorageProvider.CLOUDFLARE_R2;
      const endpoint = isR2
        ? `https://${credentials.accountId}.r2.cloudflarestorage.com`
        : credentials.endpoint || undefined;
      const region = isR2 ? 'auto' : credentials.region || 'ap-south-1';

      const s3Client = new S3Client({
        region,
        endpoint,
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
        },
      });

      const putCommand = new PutObjectCommand({
        Bucket: credentials.bucket,
        Key: objectKey,
        ContentType: validated.mimeType,
      });

      const uploadUrl = await getSignedUrl(s3Client, putCommand, { expiresIn: 3600 });

      let finalUrl = '';
      if (isR2 && credentials.publicUrl) {
        finalUrl = `${credentials.publicUrl.replace(/\/$/, '')}/${objectKey}`;
      } else if (credentials.endpoint) {
        finalUrl = `${credentials.endpoint.replace(/\/$/, '')}/${credentials.bucket}/${objectKey}`;
      } else {
        finalUrl = `https://${credentials.bucket}.s3.${region}.amazonaws.com/${objectKey}`;
      }

      return {
        success: true,
        data: {
          isSimulated: false,
          uploadUrl,
          finalUrl,
          objectKey,
          method: 'PUT' as const,
          headers: { 'Content-Type': validated.mimeType },
        },
      };
    }

    // Google Drive BYOS: Resumable direct-to-cloud upload session with Dynamic Folder Routing
    if (integration && integration.provider === StorageProvider.GOOGLE_DRIVE) {
      const refreshToken = integration.credentials.refresh_token || integration.credentials.refreshToken;
      if (refreshToken) {
        try {
          let destinationFolderId: string | null = integration.credentials.folderId || null;

          // Resolve Selection Board and Customer to dynamically create/retrieve dedicated project folder
          if (validated.selectionId) {
            const board = await prisma.clientSelection.findFirst({
              where: { id: validated.selectionId, tenantId, deletedAt: null },
              select: {
                title: true,
                customer: {
                  select: { firstName: true, lastName: true },
                },
              },
            });

            if (board) {
              const customerName = board.customer
                ? [board.customer.firstName, board.customer.lastName].filter(Boolean).join(' ').trim() || 'Customer'
                : 'Customer';
              const selectionTitle = board.title?.trim() || 'Selection Gallery';
              const customerFolderName = `${customerName} - ${selectionTitle}`;

              try {
                // Get or create the main customer selection folder under the root BYOS folder
                destinationFolderId = await getOrCreateCustomerFolder(
                  integration.credentials.folderId || null,
                  customerFolderName,
                  integration.credentials
                );

                // If a subfolder name (e.g. "Haldi", "Wedding") is provided and not "General", route inside
                const subfolderName = validated.folderName?.trim();
                if (subfolderName && subfolderName.toLowerCase() !== 'general') {
                  destinationFolderId = await getOrCreateCustomerFolder(
                    destinationFolderId,
                    subfolderName,
                    integration.credentials
                  );
                }
              } catch (folderErr: any) {
                console.warn('[BYOS_GDRIVE_CUSTOMER_FOLDER_WARN] Falling back to default root folder:', folderErr?.message);
              }
            }
          }

          const resumableSessionUrl = await createGoogleDriveResumableUploadSession({
            refreshToken,
            fileName: safeName,
            mimeType: validated.mimeType,
            sizeBytes: 15 * 1024 * 1024,
            folderId: destinationFolderId,
          });

          // Ensure destination folder is public
          if (destinationFolderId) {
            makeFolderPublic(destinationFolderId, integration.credentials).catch((err) =>
              console.warn('[BYOS_GDRIVE_MAKE_DESTINATION_PUBLIC_WARN]', err?.message)
            );
          }

          return {
            success: true,
            data: {
              isSimulated: false,
              uploadUrl: resumableSessionUrl,
              finalUrl: '', // Google Drive resumable session URLs must never be stored as finalUrl. Final URL is constructed from the returned file ID.
              objectKey,
              method: 'PUT' as const,
              headers: {},
              destinationFolderId: destinationFolderId || undefined,
            },
          };
        } catch (gErr: any) {
          console.warn('[BYOS_GDRIVE_SESSION_WARN] Falling back to direct URL mode:', gErr?.message);
        }
      }
    }

    // Default / Simulation Mode:
    // When BYOS credentials are being tested or in local dev, provide direct simulation URLs
    const simulatedEndpoint = `https://byos-simulated-cloud.pratimaerp.com/upload/${objectKey}`;
    const simulatedFinalUrl = `https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80`;

    return {
      success: true,
      data: {
        isSimulated: true,
        uploadUrl: simulatedEndpoint,
        finalUrl: simulatedFinalUrl,
        objectKey,
        method: 'PUT' as const,
        headers: { 'Content-Type': validated.mimeType },
      },
    };
  } catch (error: any) {
    console.error('[GENERATE_BYOS_PRESIGNED_URL_ERROR]', error);
    return {
      success: false,
      error: error.message || 'Failed to generate BYOS upload authorization.',
    };
  }
}

/**
 * Bulk metadata synchronization action.
 * Receives ONLY structured metadata (folder names, filenames, cloud URLs, dimensions).
 * ZERO binary image data is received or processed here.
 * Executes within a high-performance Prisma transaction.
 */
export async function syncByosGalleryMetadataAction(
  selectionId: string,
  foldersData: ByosFolderInput[]
) {
  try {
    const { tenantId } = await validateSession();
    const validated = syncByosGalleryMetadataSchema.parse({ selectionId, foldersData });

    // Verify tenant ownership of this selection board
    const board = await prisma.clientSelection.findFirst({
      where: { id: validated.selectionId, tenantId, deletedAt: null },
      select: { id: true, eventBookingId: true, status: true },
    });

    if (!board) {
      return { success: false, error: 'Selection board not found or access denied.' };
    }

    // Strict Sanitization: Reject temporary resumable session URLs
    for (const folder of validated.foldersData) {
      for (const photo of folder.photos) {
        if (photo.byosUrl.includes('googleapis.com/upload')) {
          return {
            success: false,
            error: `Corrupted upload URL rejected for "${photo.filename}": Temporary Google Drive resumable session URLs cannot be saved to the database. The client must extract the Drive file ID upon upload completion.`,
          };
        }
      }
    }

    // 1. Google Drive Automation: Intercept payload and check for Google Drive storage
    const integration = await getDecryptedStorageCredentialsInternal(tenantId);
    const isGoogleDrive =
      integration?.provider === StorageProvider.GOOGLE_DRIVE ||
      validated.foldersData.some((f) =>
        f.photos.some(
          (p) =>
            p.byosUrl.includes('drive.google.com') ||
            p.byosUrl.includes('googleusercontent.com')
        )
      );

    // 2. Automate Google Drive Permissions (role: reader, type: anyone) asynchronously
    if (isGoogleDrive && integration?.credentials) {
      // Make integration's configured parent folder public if present
      if (integration.credentials.folderId) {
        makeFolderPublic(integration.credentials.folderId, integration.credentials).catch((err) =>
          console.warn('[BYOS_SYNC_MAKE_PARENT_FOLDER_PUBLIC_WARN]', err?.message)
        );
      }

      // Make any subfolder externalFolderIds public if present
      for (const f of validated.foldersData) {
        if (f.externalFolderId) {
          makeFolderPublic(f.externalFolderId, integration.credentials).catch((err) =>
            console.warn('[BYOS_SYNC_MAKE_SUBFOLDER_PUBLIC_WARN]', err?.message)
          );
        }
      }

      // Collect Google Drive file IDs from photo URLs and batch-update permissions asynchronously
      const driveAssetIds = validated.foldersData
        .flatMap((f) => f.photos.map((p) => extractGoogleDriveId(p.byosUrl)))
        .filter((id): id is string => Boolean(id));

      if (driveAssetIds.length > 0) {
        batchMakeDriveAssetsPublic(driveAssetIds, integration.credentials).catch((err) =>
          console.warn('[BYOS_SYNC_BATCH_DRIVE_PUBLIC_WARN]', err?.message)
        );
      }
    }

    const transactionResult = await prisma.$transaction(
      async (tx) => {
        let totalFoldersSynced = 0;
        let totalPhotosSynced = 0;

        // Fetch all existing folders for this selection board in a single query
        const existingFolders = await tx.galleryFolder.findMany({
          where: { selectionId: board.id },
          select: { id: true, name: true },
        });

        const folderMap = new Map<string, { id: string; name: string }>(
          existingFolders.map((f) => [f.name.toLowerCase().trim(), f])
        );

        const allPhotosToInsert: Array<{
          tenantId: string;
          folderId: string;
          filename: string;
          url: string;
          isSelected: boolean;
          aspectRatio: number;
          width: number | null;
          height: number | null;
        }> = [];

        for (let folderIdx = 0; folderIdx < validated.foldersData.length; folderIdx++) {
          const folderData = validated.foldersData[folderIdx];
          const cleanFolderName = folderData.folderName.trim() || 'General';
          const key = cleanFolderName.toLowerCase();

          // 1. Locate existing folder in memory or create new GalleryFolder
          let folder = folderMap.get(key);

          if (!folder) {
            const createdFolder = await tx.galleryFolder.create({
              data: {
                tenantId,
                selectionId: board.id,
                eventBookingId: board.eventBookingId,
                name: cleanFolderName,
                order: folderIdx,
              },
              select: { id: true, name: true },
            });
            folder = createdFolder;
            folderMap.set(key, folder);
            totalFoldersSynced++;
          }

          // 2. Accumulate photos in memory with converted direct URLs
          if (folderData.photos.length > 0) {
            for (const photo of folderData.photos) {
              allPhotosToInsert.push({
                tenantId,
                folderId: folder.id,
                filename: photo.filename,
                url: convertToDirectDriveLink(photo.byosUrl),
                isSelected: false,
                aspectRatio: photo.aspectRatio || 1.0,
                width: photo.width ? Math.round(photo.width) : null,
                height: photo.height ? Math.round(photo.height) : null,
              });
            }
          }
        }

        // 3. Bulk insert all photos across folders in a single operation
        if (allPhotosToInsert.length > 0) {
          const res = await tx.galleryPhoto.createMany({
            data: allPhotosToInsert,
          });
          totalPhotosSynced = res.count;
        }

        // 4. Transition board status if in DRAFT
        if (board.status === 'DRAFT') {
          await tx.clientSelection.update({
            where: { id: board.id },
            data: { status: 'SHARED', updatedAt: new Date() },
          });
        } else {
          await tx.clientSelection.update({
            where: { id: board.id },
            data: { updatedAt: new Date() },
          });
        }

        return {
          totalFoldersSynced,
          totalPhotosSynced,
        };
      },
      { timeout: 15000 }
    );

    revalidatePath(`/gallery/selection/${validated.selectionId}`);
    revalidatePath(`/operations/selections`);

    return {
      success: true,
      data: serializePrisma(transactionResult),
    };
  } catch (error: any) {
    console.error('[SYNC_BYOS_GALLERY_METADATA_ERROR]', error);
    return {
      success: false,
      error: error.message || 'Failed to synchronize BYOS gallery metadata.',
    };
  }
}

/**
 * Automatically repairs and patches any legacy Google Drive URLs in the database
 * from 'uc?export=view&id=FILE_ID' to the reliable Google Drive Thumbnail API format:
 * 'https://drive.google.com/thumbnail?id=FILE_ID&sz=w2500'.
 */
export async function patchLegacyGoogleDriveUrlsAction() {
  try {
    const { tenantId } = await validateSession();

    const legacyPhotos = await prisma.galleryPhoto.findMany({
      where: {
        tenantId,
        OR: [
          { url: { contains: 'uc?export=view' } },
          { url: { contains: 'drive.google.com/uc' } },
        ],
      },
      select: {
        id: true,
        url: true,
      },
    });

    let patchedCount = 0;
    const CHUNK_SIZE = 50;

    const photoUpdates: Array<{ id: string; url: string }> = [];
    for (const photo of legacyPhotos) {
      const newUrl = convertToDirectDriveLink(photo.url);
      if (newUrl && newUrl !== photo.url) {
        photoUpdates.push({ id: photo.id, url: newUrl });
      }
    }

    for (let i = 0; i < photoUpdates.length; i += CHUNK_SIZE) {
      const chunk = photoUpdates.slice(i, i + CHUNK_SIZE);
      await prisma.$transaction(
        chunk.map((item) =>
          prisma.galleryPhoto.update({
            where: { id: item.id },
            data: { url: item.url },
          })
        )
      );
    }
    patchedCount += photoUpdates.length;

    // Also patch StorageRecord records if any
    const legacyStorageRecords = await prisma.storageRecord.findMany({
      where: {
        tenantId,
        OR: [
          { url: { contains: 'uc?export=view' } },
          { url: { contains: 'drive.google.com/uc' } },
        ],
      },
      select: {
        id: true,
        url: true,
      },
    });

    const recordUpdates: Array<{ id: string; url: string }> = [];
    for (const record of legacyStorageRecords) {
      const newUrl = convertToDirectDriveLink(record.url);
      if (newUrl && newUrl !== record.url) {
        recordUpdates.push({ id: record.id, url: newUrl });
      }
    }

    for (let i = 0; i < recordUpdates.length; i += CHUNK_SIZE) {
      const chunk = recordUpdates.slice(i, i + CHUNK_SIZE);
      await prisma.$transaction(
        chunk.map((item) =>
          prisma.storageRecord.update({
            where: { id: item.id },
            data: { url: item.url },
          })
        )
      );
    }
    patchedCount += recordUpdates.length;

    if (patchedCount > 0) {
      revalidatePath('/operations/selections');
    }

    return {
      success: true,
      data: {
        patchedCount,
      },
    };
  } catch (error: any) {
    console.error('[PATCH_LEGACY_DRIVE_URLS_ERROR]', error);
    return {
      success: false,
      error: error.message || 'Failed to patch legacy Google Drive URLs.',
    };
  }
}

/**
 * Strictly audits and force-publicizes Google Drive permissions for all folders and photos
 * associated with a specific ClientSelection gallery.
 * Guarantees that any legacy upload or skipped folder/file permission is converted to
 * public ('anyone with the link' reader) and URLs are normalized to the Thumbnail API.
 */
export async function forcePublicizeGalleryAction(selectionId: string) {
  try {
    const { tenantId } = await validateSession();

    if (!selectionId) {
      return { success: false, error: 'Selection ID is required.' };
    }

    // 1. Fetch selection board with its folders and photos
    const board = await prisma.clientSelection.findFirst({
      where: { id: selectionId, tenantId, deletedAt: null },
      include: {
        galleryFolders: {
          include: {
            photos: true,
          },
        },
        items: {
          include: {
            storageRecord: true,
          },
        },
      },
    });

    if (!board) {
      return { success: false, error: 'Selection board not found or access denied.' };
    }

    // 2. Resolve Google Drive credentials
    const integration = await getDecryptedStorageCredentialsInternal(tenantId);
    if (!integration || integration.provider !== StorageProvider.GOOGLE_DRIVE || !integration.credentials) {
      return {
        success: true,
        data: {
          message: 'Tenant storage is not Google Drive (or BYOS credentials not configured). No Drive permissions to update.',
          foldersProcessed: 0,
          photosAudited: 0,
          permissionsGranted: 0,
        },
      };
    }

    let foldersProcessed = 0;
    let permissionsGranted = 0;

    // 3. Make parent storage folder public if configured
    if (integration.credentials.folderId) {
      const parentOk = await makeFolderPublic(integration.credentials.folderId, integration.credentials);
      if (parentOk) foldersProcessed++;
    }

    // 4. Collect all photo URLs from GalleryPhotos and SelectionItems
    const allUrls: string[] = [];

    // GalleryPhoto records
    board.galleryFolders.forEach((folder) => {
      folder.photos.forEach((photo) => {
        if (photo.url) allUrls.push(photo.url);
      });
    });

    // SelectionItem -> StorageRecord
    board.items.forEach((item) => {
      if (item.storageRecord?.url) allUrls.push(item.storageRecord.url);
    });

    const uniqueUrls = Array.from(new Set(allUrls.map((u) => u.trim()).filter(Boolean)));

    // 5. Extract Google Drive file IDs
    const driveAssetIds = uniqueUrls
      .map((url) => extractGoogleDriveId(url))
      .filter((id): id is string => Boolean(id));

    // 6. Batch update permissions to public reader
    if (driveAssetIds.length > 0) {
      const batchResult = await batchMakeDriveAssetsPublic(driveAssetIds, integration.credentials, 5);
      permissionsGranted = batchResult.successCount;
    }

    // 7. Normalize any legacy URLs to Thumbnail API format in database using batched updates
    const photoUpdates: Array<{ id: string; url: string }> = [];
    for (const folder of board.galleryFolders) {
      for (const photo of folder.photos) {
        const normalized = convertToDirectDriveLink(photo.url);
        if (normalized && normalized !== photo.url) {
          photoUpdates.push({ id: photo.id, url: normalized });
        }
      }
    }

    for (let i = 0; i < photoUpdates.length; i += 50) {
      const chunk = photoUpdates.slice(i, i + 50);
      await prisma.$transaction(
        chunk.map((p) =>
          prisma.galleryPhoto.update({
            where: { id: p.id },
            data: { url: p.url },
          })
        )
      );
    }

    revalidatePath(`/gallery/selection/${selectionId}`);
    revalidatePath('/operations/selections');

    return {
      success: true,
      data: {
        message: 'Gallery permissions successfully verified and publicized.',
        foldersProcessed,
        photosAudited: driveAssetIds.length,
        permissionsGranted,
      },
    };
  } catch (error: any) {
    console.error('[FORCE_PUBLICIZE_GALLERY_ERROR]', error);
    return {
      success: false,
      error: error.message || 'Failed to force public permissions for gallery assets.',
    };
  }
}

/**
 * Self-healing action to identify and purge corrupted Google Drive resumable session URLs
 * from GalleryPhoto and StorageRecord tables.
 */
export async function cleanupCorruptedUploadUrlsAction() {
  try {
    const { tenantId } = await validateSession();

    // 1. Identify corrupted GalleryPhoto records
    const corruptedPhotos = await prisma.galleryPhoto.findMany({
      where: {
        tenantId,
        url: { contains: 'googleapis.com/upload' },
      },
      select: { id: true, filename: true },
    });

    const deletedPhotoCount = corruptedPhotos.length;
    if (deletedPhotoCount > 0) {
      await prisma.galleryPhoto.deleteMany({
        where: {
          id: { in: corruptedPhotos.map((p) => p.id) },
        },
      });
    }

    // 2. Identify corrupted StorageRecord records
    const corruptedRecords = await prisma.storageRecord.findMany({
      where: {
        tenantId,
        url: { contains: 'googleapis.com/upload' },
      },
      select: { id: true },
    });

    const deletedRecordCount = corruptedRecords.length;
    if (deletedRecordCount > 0) {
      // First delete associated SelectionItem records to preserve referential integrity
      await prisma.selectionItem.deleteMany({
        where: {
          storageRecordId: { in: corruptedRecords.map((r) => r.id) },
        },
      });

      await prisma.storageRecord.deleteMany({
        where: {
          id: { in: corruptedRecords.map((r) => r.id) },
        },
      });
    }

    return {
      success: true,
      data: {
        deletedPhotos: deletedPhotoCount,
        deletedRecords: deletedRecordCount,
      },
    };
  } catch (error: any) {
    console.error('[CLEANUP_CORRUPTED_UPLOAD_URLS_ERROR]', error);
    return {
      success: false,
      error: error.message || 'Failed to clean up corrupted upload URLs.',
    };
  }
}

