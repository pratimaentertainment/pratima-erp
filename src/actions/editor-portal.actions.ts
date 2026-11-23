'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { serializePrisma } from '@/lib/serialize';
import { formatDate } from '@/lib/date';
import {
  TaskStatus,
  WorkflowType,
  AlbumStatus,
  SelectionItemStatus,
  StorageProvider,
  Prisma,
} from '@prisma/client';
import { z } from 'zod';
import { getDecryptedStorageCredentialsInternal } from '@/actions/storage.actions';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// -----------------------------------------------------------------------------
// ZOD SCHEMAS
// -----------------------------------------------------------------------------

const submitAlbumSpreadsByTokenSchema = z.object({
  token: z.string().uuid('Invalid editor token'),
  spreads: z
    .array(
      z.object({
        fileName: z.string().min(1, 'Spread filename is required'),
        url: z.string().url('A valid spread image URL is required'),
        sizeBytes: z.number().optional().default(0),
        mimeType: z.string().optional().default('image/jpeg'),
        pageNumber: z.number().int().min(1).optional(),
      })
    )
    .min(1, 'At least one album spread is required'),
  notes: z.string().optional().nullable(),
});

const generateDesignerUploadUrlSchema = z.object({
  token: z.string().uuid('Invalid editor token'),
  filename: z.string().min(1, 'Filename is required'),
  mimeType: z.string().optional().default('image/jpeg'),
});

// -----------------------------------------------------------------------------
// SERVER ACTIONS
// -----------------------------------------------------------------------------

/**
 * 1. Fetches a WorkflowTask and all related design context using an external editor Magic Link token.
 * Exposes:
 *   - Deliverable cut name, status, due date, director notes
 *   - RAW BYOS Vault URL (assetsUrl)
 *   - Client photo selection Lightroom export string (comma-separated filenames)
 *   - Existing AlbumProject spreads (if already uploaded or in revision cycle)
 *   - Client revision feedback notes (if in CHANGES_REQUESTED status)
 * Strictly zero ERP account creation required. Zero financial data exposed.
 */
export async function getDesignerTaskByTokenAction(token: string) {
  try {
    if (!token || typeof token !== 'string') {
      return { success: false, error: 'A valid editor token is required.' };
    }

    // 1. Fetch WorkflowTask
    const task = await prisma.workflowTask.findFirst({
      where: {
        editorToken: token,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            designation: true,
          },
        },
        eventBooking: {
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                customerCode: true,
              },
            },
            tenant: {
              select: {
                id: true,
                tradeName: true,
                name: true,
                phone: true,
                email: true,
                logoUrl: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      return { success: false, error: 'Magic link is invalid or has expired.' };
    }

    const booking = task.eventBooking;
    const tenantId = task.tenantId;

    // 2. Fetch associated ClientSelection and all storage assets
    let lightroomQuery = '';
    let lightroomQueryWithoutExt = '';
    let selectedPhotosCount = 0;
    let favoritesCount = 0;
    let selectionBoardTitle = '';

    const selection = await prisma.clientSelection.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        OR: [
          { eventBookingId: task.eventBookingId },
          { jobId: task.jobId },
          ...(booking?.customerId ? [{ customerId: booking.customerId }] : []),
        ],
      },
      include: {
        items: {
          include: {
            storageRecord: {
              select: {
                id: true,
                fileName: true,
                url: true,
                sizeBytes: true,
                mimeType: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    let additionalStorageRecords: Array<{
      id: string;
      fileName: string;
      url: string | null;
      sizeBytes: bigint;
      mimeType: string;
    }> = [];

    if (task.allowFullDataAccess && task.eventBookingId) {
      additionalStorageRecords = await prisma.storageRecord.findMany({
        where: {
          tenantId,
          eventBookingId: task.eventBookingId,
          deletedAt: null,
        },
        select: {
          id: true,
          fileName: true,
          url: true,
          sizeBytes: true,
          mimeType: true,
        },
        orderBy: { createdAt: 'asc' },
      });
    }

    const selectedAssets: Array<{
      id: string;
      fileName: string;
      url: string;
      sizeBytes: number;
      mimeType: string;
      isFavorite: boolean;
      clientNote?: string | null;
    }> = [];

    const unselectedAssets: Array<{
      id: string;
      fileName: string;
      url: string;
      sizeBytes: number;
      mimeType: string;
      isFavorite: boolean;
      clientNote?: string | null;
    }> = [];

    const recordedStorageIds = new Set<string>();

    if (selection) {
      selectionBoardTitle = selection.title;

      selection.items.forEach((item) => {
        const sr = item.storageRecord;
        if (!sr) return;
        recordedStorageIds.add(sr.id);

        const assetObj = {
          id: sr.id,
          fileName: sr.fileName,
          url: sr.url || '',
          sizeBytes: Number(sr.sizeBytes || 0),
          mimeType: sr.mimeType || 'image/jpeg',
          isFavorite: Boolean(item.isFavorite),
          clientNote: item.clientNote,
        };

        if (item.status === SelectionItemStatus.SELECTED) {
          selectedAssets.push(assetObj);
        } else {
          unselectedAssets.push(assetObj);
        }
      });

      selectedPhotosCount = selectedAssets.length;
      favoritesCount = selectedAssets.filter((i) => i.isFavorite).length;

      if (selectedAssets.length > 0) {
        lightroomQuery = selectedAssets.map((i) => i.fileName).join(', ');
        lightroomQueryWithoutExt = selectedAssets
          .map((i) => i.fileName.replace(/\.[^/.]+$/, ''))
          .join(', ');
      } else if (selection.selectedPhotoNames) {
        // Fallback to manual selection string
        lightroomQuery = selection.selectedPhotoNames;
        lightroomQueryWithoutExt = selection.selectedPhotoNames
          .split(/[\n,;]+/)
          .map((s) => s.trim().replace(/\.[^/.]+$/, ''))
          .filter(Boolean)
          .join(', ');
        selectedPhotosCount = selection.selectedPhotoNames.split(/[\n,;]+/).filter(Boolean).length;
      }
    }

    // Add any remaining booking storage records to unselectedAssets (B-Roll)
    additionalStorageRecords.forEach((sr) => {
      if (!recordedStorageIds.has(sr.id)) {
        recordedStorageIds.add(sr.id);
        unselectedAssets.push({
          id: sr.id,
          fileName: sr.fileName,
          url: sr.url || '',
          sizeBytes: Number(sr.sizeBytes || 0),
          mimeType: sr.mimeType || 'image/jpeg',
          isFavorite: false,
          clientNote: null,
        });
      }
    });

    // 3. Fetch associated AlbumProject (if exists)
    let albumProject: any = null;
    if (task.eventBookingId) {
      albumProject = await prisma.albumProject.findFirst({
        where: {
          tenantId,
          eventBookingId: task.eventBookingId,
          deletedAt: null,
        },
        include: {
          pages: {
            orderBy: { pageNumber: 'asc' },
            include: {
              storageRecord: {
                select: {
                  id: true,
                  fileName: true,
                  url: true,
                  sizeBytes: true,
                },
              },
              comments: {
                select: {
                  id: true,
                  xPos: true,
                  yPos: true,
                  commentText: true,
                  isResolved: true,
                  authorName: true,
                  authorRole: true,
                },
              },
            },
          },
        },
      });
    }

    const isAlbumDesignTask =
      task.type === WorkflowType.PHOTO_EDITING ||
      (task.taskType && task.taskType.toLowerCase().includes('album'));

    const responseData = {
      task: {
        id: task.id,
        editorToken: task.editorToken,
        type: task.type,
        taskType: task.taskType || (isAlbumDesignTask ? 'Album Layout Design' : 'Deliverable Edit'),
        status: task.status,
        dueDate: task.dueDate,
        assetsUrl: task.assetsUrl,
        previewUrl: task.previewUrl,
        deliveryUrl: task.deliveryUrl,
        directorNotes: task.directorNotes,
        clientFeedback: task.clientFeedback,
        referenceLinks: task.referenceLinks,
        revisionsCount: task.revisionsCount,
        allowFullDataAccess: Boolean(task.allowFullDataAccess),
        notes: task.notes,
        createdAt: task.createdAt,
      },
      allowFullDataAccess: Boolean(task.allowFullDataAccess),
      selectedAssets,
      unselectedAssets,
      isAlbumDesignTask,
      booking: booking
        ? {
            id: booking.id,
            title: booking.title,
            bookingNumber: booking.bookingNumber,
            startDate: booking.startDate,
            location: booking.location,
            customer: booking.customer
              ? {
                  name: `${booking.customer.firstName} ${booking.customer.lastName}`.trim(),
                  customerCode: booking.customer.customerCode,
                }
              : null,
          }
        : null,
      selectionExport: {
        boardTitle: selectionBoardTitle,
        totalSelected: selectedPhotosCount,
        favoritesCount,
        lightroomQuery,
        lightroomQueryWithoutExt,
      },
      albumProject: albumProject
        ? {
            id: albumProject.id,
            title: albumProject.title,
            status: albumProject.status,
            totalSheets: albumProject.totalSheets,
            totalPages: albumProject.pages.length,
            pages: albumProject.pages.map((p: any) => ({
              id: p.id,
              pageNumber: p.pageNumber,
              title: p.title,
              imageUrl: p.storageRecord?.url || '',
              fileName: p.storageRecord?.fileName || '',
              commentsCount: p.comments?.length || 0,
              unresolvedComments: p.comments?.filter((c: any) => !c.isResolved) || [],
            })),
          }
        : null,
      studio: {
        name: booking?.tenant?.tradeName || booking?.tenant?.name || 'Pratima Photography',
        phone: booking?.tenant?.phone,
        email: booking?.tenant?.email,
        logoUrl: booking?.tenant?.logoUrl,
      },
    };

    return {
      success: true,
      data: serializePrisma(responseData),
    };
  } catch (error: any) {
    console.error('[GET_DESIGNER_TASK_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to fetch designer task details.',
    };
  }
}

/**
 * 2. Generates a pre-signed cloud upload URL for the external designer.
 * Validates the editorToken and uploads directly to the studio's BYOS storage.
 * Zero image bytes touch the ERP server runtime.
 */
export async function generateDesignerUploadUrlAction(input: z.infer<typeof generateDesignerUploadUrlSchema>) {
  try {
    const validated = generateDesignerUploadUrlSchema.parse(input);

    const task = await prisma.workflowTask.findFirst({
      where: {
        editorToken: validated.token,
        deletedAt: null,
      },
      select: {
        id: true,
        tenantId: true,
        eventBookingId: true,
      },
    });

    if (!task) {
      return { success: false, error: 'Unauthorized: Invalid editor token.' };
    }

    const tenantId = task.tenantId;
    const cleanFileName = validated.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectKey = `${tenantId}/albums/${task.eventBookingId || 'general'}/${Date.now()}-${cleanFileName}`;

    // Check tenant BYOS storage configuration
    const integration = await getDecryptedStorageCredentialsInternal(tenantId);

    if (
      integration &&
      (integration.provider === StorageProvider.AWS_S3 ||
        integration.provider === StorageProvider.CLOUDFLARE_R2)
    ) {
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
        ContentType: validated.mimeType || 'image/jpeg',
      });

      const uploadUrl = await getSignedUrl(s3Client, putCommand, { expiresIn: 3600 });
      const publicUrl = credentials.cdnUrl
        ? `${credentials.cdnUrl.replace(/\/$/, '')}/${objectKey}`
        : isR2
        ? `https://${credentials.bucket}.${credentials.accountId}.r2.dev/${objectKey}`
        : `https://${credentials.bucket}.s3.${region}.amazonaws.com/${objectKey}`;

      return {
        success: true,
        uploadUrl,
        publicUrl,
        key: objectKey,
      };
    }

    // Direct cloud simulated fallback for testing environments
    const fallbackUrl = `https://storage.googleapis.com/pratima-erp-vaults/${objectKey}`;
    return {
      success: true,
      uploadUrl: fallbackUrl,
      publicUrl: fallbackUrl,
      key: objectKey,
    };
  } catch (error: any) {
    console.error('[GENERATE_DESIGNER_UPLOAD_URL_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to generate designer upload authorization.',
    };
  }
}

/**
 * 3. Submits uploaded high-resolution JPEG spreads for an Album Project.
 * Validates the editor token, ensures AlbumProject exists, sequentially creates AlbumPage records,
 * and advances the workflow pipeline to CLIENT_REVIEW / SHARED_FOR_REVIEW.
 */
export async function submitAlbumSpreadsByTokenAction(input: z.infer<typeof submitAlbumSpreadsByTokenSchema>) {
  try {
    const validated = submitAlbumSpreadsByTokenSchema.parse(input);

    // 1. Validate editor token
    const task = await prisma.workflowTask.findFirst({
      where: {
        editorToken: validated.token,
        deletedAt: null,
      },
      include: {
        eventBooking: {
          include: { customer: true },
        },
      },
    });

    if (!task) {
      return { success: false, error: 'Unauthorized: Invalid or expired editor token.' };
    }

    const tenantId = task.tenantId;
    const booking = task.eventBooking;

    if (!booking) {
      return { success: false, error: 'Associated event booking not found for this task.' };
    }

    // 2. Resolve or create primary StorageIntegration for foreign key integrity
    let integration = await prisma.storageIntegration.findFirst({
      where: { tenantId, isActive: true },
    });

    if (!integration) {
      integration = await prisma.storageIntegration.create({
        data: {
          tenantId,
          provider: StorageProvider.GOOGLE_DRIVE,
          encryptedCredentials: '{}',
          isActive: true,
          isDefault: true,
        },
      });
    }

    // 3. Resolve or create AlbumProject
    let album = await prisma.albumProject.findFirst({
      where: {
        tenantId,
        eventBookingId: booking.id,
        deletedAt: null,
      },
    });

    if (!album) {
      album = await prisma.albumProject.create({
        data: {
          tenantId,
          customerId: booking.customerId,
          eventBookingId: booking.id,
          title: `${booking.title} - Digital Photobook`,
          status: AlbumStatus.SHARED_FOR_REVIEW,
          totalSheets: Math.max(1, Math.ceil(validated.spreads.length / 2)),
          description: `Initial spreads submitted by external designer.`,
        },
      });
    }

    // 4. Delete existing pages to cleanly overwrite with new spread revisions
    await prisma.albumPage.deleteMany({
      where: { albumId: album.id },
    });

    // 5. Sequentially create StorageRecord and AlbumPage records
    let currentNum = 1;
    const createdPages: any[] = [];

    for (const spread of validated.spreads) {
      const pageNumber = spread.pageNumber || currentNum;

      const record = await prisma.storageRecord.create({
        data: {
          tenantId,
          integrationId: integration.id,
          customerId: booking.customerId,
          eventBookingId: booking.id,
          fileName: spread.fileName,
          externalFileId: `spread-${album.id}-${Date.now()}-${pageNumber}`,
          mimeType: spread.mimeType || 'image/jpeg',
          sizeBytes: BigInt(spread.sizeBytes || 0),
          url: spread.url,
        },
      });

      const page = await prisma.albumPage.create({
        data: {
          tenantId,
          albumId: album.id,
          storageRecordId: record.id,
          pageNumber,
          title: `Spread ${pageNumber}`,
        },
      });

      createdPages.push(page);
      currentNum++;
    }

    const timestampStr = formatDate(new Date(), 'dd MMM yyyy, hh:mm a');
    const submissionNote = validated.notes?.trim()
      ? `Designer Note: "${validated.notes.trim()}"`
      : 'Designer uploaded revised spreads.';

    // 6. Update AlbumProject status & cover image
    const firstSpreadUrl = validated.spreads[0]?.url;
    await prisma.albumProject.update({
      where: { id: album.id },
      data: {
        status: AlbumStatus.SHARED_FOR_REVIEW,
        totalSheets: Math.max(1, Math.ceil(validated.spreads.length / 2)),
        description: `${album.description ? `${album.description}\n` : ''}[${timestampStr}]: ${submissionNote}`,
      },
    });

    // 7. Update WorkflowTask status to CLIENT_REVIEW
    await prisma.workflowTask.update({
      where: { id: task.id },
      data: {
        status: TaskStatus.CLIENT_REVIEW,
        previewUrl: firstSpreadUrl || task.previewUrl,
        notes: `${task.notes ? `${task.notes}\n` : ''}[${timestampStr}]: Album designer submitted ${validated.spreads.length} spreads for client review. ${submissionNote}`,
      },
    });

    revalidatePath('/portal');
    revalidatePath('/operations/post-production');
    revalidatePath('/operations/selections');

    return {
      success: true,
      message: `Successfully published ${validated.spreads.length} album spreads! Client review is now active.`,
      albumId: album.id,
      spreadsCount: validated.spreads.length,
    };
  } catch (error: any) {
    console.error('[SUBMIT_ALBUM_SPREADS_BY_TOKEN_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to submit album spreads.',
    };
  }
}
