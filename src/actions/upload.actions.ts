'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { StorageProvider, StorageRecordStatus, SelectionItemStatus, SelectionStatus } from '@prisma/client';
import { serializePrisma } from '@/lib/serialize';
import { getDecryptedStorageCredentialsInternal } from '@/actions/storage.actions';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { OAuth2Client } from 'google-auth-library';
import { headers } from 'next/headers';
import { z } from 'zod';
import {
  convertToDirectDriveLink,
  makeFilePublic,
  extractGoogleDriveId,
  getOrCreateCustomerFolder,
} from '@/services/storage/google-drive.service';

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
 * Cleans filename to be safe for cloud object storage keys.
 */
function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

// ============================================================================
// SCHEMAS
// ============================================================================

const initiateUploadSchema = z.object({
  fileName: z.string().min(1, 'Filename is required'),
  mimeType: z.string().min(1, 'Mime type is required'),
  sizeBytes: z.number().positive('File size must be greater than 0'),
  customerId: z.string().uuid().optional().nullable(),
  eventBookingId: z.string().uuid().optional().nullable(),
  selectionBoardId: z.string().uuid().optional().nullable(),
  galleryMode: z.enum(['SELECTION', 'DELIVERY']).optional().nullable(),
});

const confirmUploadSchema = z.object({
  integrationId: z.string().uuid('Invalid storage integration ID'),
  externalFileId: z.string().min(1, 'External file key/ID is required'),
  fileName: z.string().min(1, 'Filename is required'),
  mimeType: z.string().min(1, 'Mime type is required'),
  sizeBytes: z.number().positive('File size must be positive'),
  url: z.string().min(1, 'Delivered file URL is required'),
  customerId: z.string().uuid().optional().nullable(),
  eventBookingId: z.string().uuid().optional().nullable(),
  selectionBoardId: z.string().uuid().optional().nullable(),
  galleryMode: z.enum(['SELECTION', 'DELIVERY']).optional().nullable(),
});

// ============================================================================
// SERVER ACTIONS
// ============================================================================

/**
 * Initiates a direct-to-cloud upload.
 * Generates an AWS S3 / Cloudflare R2 Pre-Signed PUT URL or Google Drive Resumable Upload URL.
 * Bypasses Next.js server payload limitations entirely.
 */
export async function initiateUploadAction(input: z.infer<typeof initiateUploadSchema>) {
  try {
    const { tenantId } = await validateSession();
    const validated = initiateUploadSchema.parse(input);

    const integration = await getDecryptedStorageCredentialsInternal(tenantId);
    if (!integration) {
      return {
        success: false,
        error: 'No active cloud storage provider configured. Please configure AWS S3, Cloudflare R2, or Google Drive in Master Settings -> Storage.',
      };
    }

    const { provider, credentials, id: integrationId } = integration;
    const safeName = sanitizeFileName(validated.fileName);
    const folderPrefix = validated.customerId ? `customers/${validated.customerId}` : 'general';
    const objectKey = `${tenantId}/${folderPrefix}/${Date.now()}-${safeName}`;

    // 1. AWS S3 or Cloudflare R2
    if (provider === StorageProvider.AWS_S3 || provider === StorageProvider.CLOUDFLARE_R2) {
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

      // Calculate final delivered public/worker asset URL
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
          provider,
          integrationId,
          uploadUrl,
          method: 'PUT' as const,
          headers: {
            'Content-Type': validated.mimeType,
          },
          externalFileId: objectKey,
          finalUrl,
        },
      };
    }

    // 2. Google Drive Resumable Upload (Platform OAuth 2.0)
    if (provider === StorageProvider.GOOGLE_DRIVE) {
      const refreshToken = credentials.refresh_token || credentials.refreshToken;

      if (!refreshToken) {
        return {
          success: false,
          error: 'Google Drive refresh token is missing. Please connect Google Drive via OAuth in Master Settings -> Storage.',
        };
      }

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return {
          success: false,
          error: 'Platform Google OAuth credentials (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) are not configured in system environment.',
        };
      }

      const oauth2Client = new OAuth2Client(clientId, clientSecret);
      oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      const tokenResponse = await oauth2Client.getAccessToken();
      const accessToken = tokenResponse.token;

      if (!accessToken) {
        return {
          success: false,
          error: 'Failed to refresh Google Drive OAuth2 access token. Please reconnect Google Drive in Settings.',
        };
      }

      // Extract client origin dynamically for Google Drive CORS preflight authorization
      let origin = '';
      try {
        const reqHeaders = await headers();
        origin = reqHeaders.get('origin') || '';
        if (!origin) {
          const referer = reqHeaders.get('referer');
          if (referer) {
            origin = new URL(referer).origin;
          }
        }
      } catch (err) {
        // Fallback for non-request environments
      }

      if (!origin) {
        origin = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
      }

      // Dynamic customer & project folder routing
      let destinationFolderId: string | null = credentials.folderId || null;

      if (validated.selectionBoardId || validated.customerId) {
        let customerName = 'Customer';
        let selectionTitle = 'Selection Gallery';

        if (validated.selectionBoardId) {
          const board = await prisma.clientSelection.findFirst({
            where: { id: validated.selectionBoardId, tenantId, deletedAt: null },
            select: {
              title: true,
              customer: {
                select: { firstName: true, lastName: true },
              },
            },
          });
          if (board) {
            selectionTitle = board.title?.trim() || selectionTitle;
            if (board.customer) {
              customerName = [board.customer.firstName, board.customer.lastName].filter(Boolean).join(' ').trim() || customerName;
            }
          }
        } else if (validated.customerId) {
          const customer = await prisma.customer.findFirst({
            where: { id: validated.customerId, tenantId },
            select: { firstName: true, lastName: true },
          });
          if (customer) {
            customerName = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim() || customerName;
          }
          if (validated.eventBookingId) {
            const booking = await prisma.eventBooking.findFirst({
              where: { id: validated.eventBookingId, tenantId },
              select: { title: true },
            });
            if (booking?.title) {
              selectionTitle = booking.title.trim();
            }
          }
        }

        const dynamicFolderName = `${customerName} - ${selectionTitle}`;
        try {
          destinationFolderId = await getOrCreateCustomerFolder(
            credentials.folderId || null,
            dynamicFolderName,
            credentials
          );
        } catch (fErr: any) {
          console.warn('[UPLOAD_GDRIVE_CUSTOMER_FOLDER_WARN] Falling back to root BYOS folder:', fErr?.message);
        }
      }

      // Initiate Google Drive Resumable Upload session
      const metadata: Record<string, any> = {
        name: validated.fileName,
      };
      if (destinationFolderId) {
        metadata.parents = [destinationFolderId];
      }

      const initiateRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'Origin': origin,
          'X-Upload-Content-Type': validated.mimeType,
          'X-Upload-Content-Length': validated.sizeBytes.toString(),
        },
        body: JSON.stringify(metadata),
      });

      const resumableUploadUrl = initiateRes.headers.get('location');
      if (!initiateRes.ok || !resumableUploadUrl) {
        const errText = await initiateRes.text();
        return { success: false, error: `Google Drive upload session failed: ${errText}` };
      }

      return {
        success: true,
        data: {
          provider,
          integrationId,
          uploadUrl: resumableUploadUrl,
          method: 'PUT' as const,
          headers: {}, // Do NOT send custom headers like Content-Type for Google Drive to prevent CORS preflight failures
          externalFileId: `gdrive-${Date.now()}-${safeName}`,
          finalUrl: '', // Google Drive resumable session URLs must never be saved as finalUrl. Final URL is constructed upon upload completion.
        },
      };
    }

    return { success: false, error: `Unsupported storage provider: ${provider}` };
  } catch (error: any) {
    console.error('[INITIATE_UPLOAD_ERROR]', error);
    return {
      success: false,
      error: error.message || 'Failed to initiate direct cloud upload.',
    };
  }
}

/**
 * Confirms a successful direct-to-cloud upload and creates the StorageRecord in PostgreSQL.
 * If selectionBoardId is specified, also creates a SelectionItem on that board.
 */
export async function confirmUploadAction(input: z.infer<typeof confirmUploadSchema>) {
  try {
    const { tenantId } = await validateSession();
    const validated = confirmUploadSchema.parse(input);

    // Verify integration belongs to tenant
    const integration = await prisma.storageIntegration.findFirst({
      where: { id: validated.integrationId, tenantId, deletedAt: null },
    });

    if (!integration) {
      return { success: false, error: 'Storage integration not found or unauthorized.' };
    }

    let finalUrlToSave = validated.url;
    let finalExternalFileId = validated.externalFileId;

    // Strict validation: Reject temporary resumable session URLs or resolve via externalFileId
    if (finalUrlToSave.includes('googleapis.com/upload')) {
      const driveFileId = extractGoogleDriveId(finalExternalFileId);
      if (driveFileId) {
        finalUrlToSave = `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w2500`;
      } else {
        return {
          success: false,
          error: 'Corrupted upload URL rejected: Temporary Google Drive resumable session URLs cannot be saved. Drive file ID must be extracted upon upload completion.',
        };
      }
    }

    // Convert Google Drive links to direct rendering format
    const directUrl = convertToDirectDriveLink(finalUrlToSave);

    // If Google Drive, ensure public read permission asynchronously
    if (integration.provider === StorageProvider.GOOGLE_DRIVE) {
      const decryptedIntegration = await getDecryptedStorageCredentialsInternal(tenantId);
      if (decryptedIntegration?.credentials) {
        const driveFileId = extractGoogleDriveId(directUrl) || extractGoogleDriveId(finalExternalFileId);
        if (driveFileId) {
          makeFilePublic(driveFileId, decryptedIntegration.credentials).catch((err) =>
            console.warn('[FINALIZE_UPLOAD_DRIVE_PUBLIC_WARN]', err?.message)
          );
        }
      }
    }

    const storageRecord = await prisma.storageRecord.create({
      data: {
        tenantId,
        integrationId: validated.integrationId,
        customerId: validated.customerId || null,
        eventBookingId: validated.eventBookingId || null,
        fileName: validated.fileName,
        externalFileId: finalExternalFileId,
        mimeType: validated.mimeType,
        sizeBytes: BigInt(validated.sizeBytes),
        url: directUrl,
        status: StorageRecordStatus.ACTIVE,
      },
    });

    // Resolve or Auto-create Selection Board if linked or if galleryMode is specified
    let targetBoardId = validated.selectionBoardId;
    if (!targetBoardId && validated.customerId && validated.galleryMode) {
      const autoBoard = await prisma.clientSelection.findFirst({
        where: {
          tenantId,
          customerId: validated.customerId,
          ...(validated.eventBookingId ? { eventBookingId: validated.eventBookingId } : {}),
          galleryMode: validated.galleryMode,
          deletedAt: null,
        },
      });

      if (autoBoard) {
        targetBoardId = autoBoard.id;
      } else {
        const isDelivery = validated.galleryMode === 'DELIVERY';
        const newBoard = await prisma.clientSelection.create({
          data: {
            tenantId,
            customerId: validated.customerId,
            eventBookingId: validated.eventBookingId || null,
            title: isDelivery ? 'Final Soft Copy Delivery' : 'Client Photo Selection',
            galleryMode: validated.galleryMode,
            allowDownloads: isDelivery,
            applyWatermark: !isDelivery,
            status: SelectionStatus.DRAFT,
          },
        });
        targetBoardId = newBoard.id;
      }
    }

    // If linked to a selection board, generate SelectionItem immediately
    if (targetBoardId) {
      const board = await prisma.clientSelection.findFirst({
        where: { id: targetBoardId, tenantId, deletedAt: null },
      });

      if (board) {
        await prisma.selectionItem.create({
          data: {
            tenantId,
            selectionId: targetBoardId,
            storageRecordId: storageRecord.id,
            status: SelectionItemStatus.PENDING,
            isFavorite: false,
          },
        });
        revalidatePath(`/gallery/selection/${targetBoardId}`);
      }
    }

    if (validated.customerId) {
      revalidatePath(`/customers/${validated.customerId}`);
    }
    revalidatePath('/operations/selections');

    return {
      success: true,
      data: serializePrisma(storageRecord),
    };
  } catch (error: any) {
    console.error('[CONFIRM_UPLOAD_ERROR]', error);
    return {
      success: false,
      error: error.message || 'Failed to confirm cloud upload record.',
    };
  }
}

/**
 * Checks whether an active cloud storage provider (BYOS) is configured for the tenant.
 * Used as a critical fail-safe to block uploads if cloud storage is unconfigured.
 */
export async function checkStorageConfiguredAction() {
  try {
    const { tenantId } = await validateSession();
    const integration = await prisma.storageIntegration.findFirst({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        provider: true,
        isDefault: true,
      },
    });

    return {
      success: true,
      isConfigured: Boolean(integration),
      provider: integration?.provider || null,
    };
  } catch (error: any) {
    console.error('[CHECK_STORAGE_CONFIGURED_ERROR]', error);
    return {
      success: false,
      isConfigured: false,
      provider: null,
      error: error.message || 'Failed to check storage configuration.',
    };
  }
}

/**
 * Fetches customers and their active bookings to provide context for the universal uploader modal.
 */
export async function getUploaderContextOptionsAction() {
  try {
    const { tenantId } = await validateSession();

    const customers = await prisma.customer.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        customerCode: true,
        phone: true,
        eventBookings: {
          where: { deletedAt: null },
          select: {
            id: true,
            bookingNumber: true,
            title: true,
            startDate: true,
          },
          orderBy: { startDate: 'desc' },
        },
      },
      orderBy: { firstName: 'asc' },
    });

    return {
      success: true,
      data: serializePrisma(customers),
    };
  } catch (error: any) {
    console.error('[GET_UPLOADER_CONTEXT_ERROR]', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch customer and booking options.',
    };
  }
}

/**
 * Resolves or creates an appropriate ClientSelection board for the specified customer, booking, and mode.
 */
export async function getOrCreateSelectionBoardAction(input: {
  customerId: string;
  eventBookingId?: string | null;
  galleryMode: 'SELECTION' | 'DELIVERY';
  title?: string | null;
}) {
  try {
    const { tenantId } = await validateSession();

    const existingBoard = await prisma.clientSelection.findFirst({
      where: {
        tenantId,
        customerId: input.customerId,
        ...(input.eventBookingId ? { eventBookingId: input.eventBookingId } : {}),
        galleryMode: input.galleryMode,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingBoard) {
      return {
        success: true,
        data: serializePrisma(existingBoard),
      };
    }

    let boardTitle = input.title;
    if (!boardTitle) {
      if (input.eventBookingId) {
        const booking = await prisma.eventBooking.findFirst({
          where: { id: input.eventBookingId, tenantId },
          select: { title: true, bookingNumber: true },
        });
        boardTitle = input.galleryMode === 'DELIVERY'
          ? `${booking?.title || 'Event'} - Final Delivery`
          : `${booking?.title || 'Event'} - Photo Selection`;
      } else {
        const customer = await prisma.customer.findFirst({
          where: { id: input.customerId, tenantId },
          select: { firstName: true, lastName: true },
        });
        boardTitle = input.galleryMode === 'DELIVERY'
          ? `${customer?.firstName || 'Client'} - Deliverables Vault`
          : `${customer?.firstName || 'Client'} - Photo Proofs`;
      }
    }

    const isDelivery = input.galleryMode === 'DELIVERY';
    const newBoard = await prisma.clientSelection.create({
      data: {
        tenantId,
        customerId: input.customerId,
        eventBookingId: input.eventBookingId || null,
        title: boardTitle,
        galleryMode: input.galleryMode,
        allowDownloads: isDelivery,
        applyWatermark: !isDelivery,
        status: SelectionStatus.DRAFT,
      },
    });

    return {
      success: true,
      data: serializePrisma(newBoard),
    };
  } catch (error: any) {
    console.error('[GET_OR_CREATE_SELECTION_BOARD_ERROR]', error);
    return {
      success: false,
      error: error.message || 'Failed to resolve or create selection board.',
    };
  }
}

/**
 * Fetches all media storage records belonging to a customer.
 */
export async function getCustomerMediaRecordsAction(
  customerId: string,
  params?: { take?: number; skip?: number }
) {
  try {
    const { tenantId } = await validateSession();
    const take = params?.take ?? 50;
    const skip = params?.skip ?? 0;

    const records = await prisma.storageRecord.findMany({
      where: {
        customerId,
        tenantId,
        deletedAt: null,
      },
      take,
      skip,
      include: {
        integration: {
          select: {
            provider: true,
          },
        },
        eventBooking: {
          select: {
            bookingNumber: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: serializePrisma(records),
    };
  } catch (error: any) {
    console.error('[GET_CUSTOMER_MEDIA_RECORDS_ERROR]', error);
    return {
      success: false,
      error: error.message || 'Failed to load customer media records.',
    };
  }
}
