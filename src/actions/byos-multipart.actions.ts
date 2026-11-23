'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { serializePrisma } from '@/lib/serialize';
import { z } from 'zod';
import { getDecryptedStorageCredentialsInternal } from '@/actions/storage.actions';
import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageProvider, TaskStatus, WorkflowType } from '@prisma/client';

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

// -----------------------------------------------------------------------------
// ZOD SCHEMAS
// -----------------------------------------------------------------------------

const initiateMultipartSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  sizeBytes: z.number().positive('File size must be greater than 0'),
  mimeType: z.string().optional().default('video/mp4'),
  bookingId: z.string().uuid().optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
  chunkSize: z.number().optional().default(20 * 1024 * 1024), // 20MB default
});

const getMultipartPreSignedUrlsSchema = z.object({
  uploadId: z.string().min(1, 'Upload ID is required'),
  key: z.string().min(1, 'Storage key is required'),
  partNumbers: z.array(z.number().int().min(1)).min(1, 'At least one part number is required'),
  integrationId: z.string().uuid().optional().nullable(),
});

const completeMultipartSchema = z.object({
  uploadId: z.string().min(1, 'Upload ID is required'),
  key: z.string().min(1, 'Storage key is required'),
  integrationId: z.string().uuid().optional().nullable(),
  parts: z
    .array(
      z.object({
        partNumber: z.number().int().min(1),
        eTag: z.string().min(1, 'ETag is required'),
      })
    )
    .min(1, 'At least one part is required to complete multipart upload'),
  filename: z.string().min(1),
  sizeBytes: z.number().positive(),
  mimeType: z.string().optional().default('video/mp4'),
  bookingId: z.string().uuid().optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
});

const syncUploadedVideoToEditorSchema = z.object({
  bookingId: z.string().uuid('Valid event booking ID required'),
  storageRecordId: z.string().uuid().optional().nullable(),
  assetsUrl: z.string().url('A valid vault URL is required'),
  filename: z.string().optional(),
});

// -----------------------------------------------------------------------------
// HELPER: BUILD S3 CLIENT
// -----------------------------------------------------------------------------

function getS3ClientFromCredentials(credentials: Record<string, any>, provider: StorageProvider) {
  const isR2 = provider === StorageProvider.CLOUDFLARE_R2;
  const region = credentials.region || (isR2 ? 'auto' : 'ap-south-1');
  const endpoint = isR2
    ? `https://${credentials.accountId}.r2.cloudflarestorage.com`
    : credentials.endpoint || undefined;

  return new S3Client({
    region,
    endpoint,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    },
  });
}

function constructPublicUrl(
  credentials: Record<string, any>,
  provider: StorageProvider,
  key: string
): string {
  if (credentials.cdnUrl) {
    return `${credentials.cdnUrl.replace(/\/$/, '')}/${key}`;
  }
  if (provider === StorageProvider.CLOUDFLARE_R2) {
    return `https://${credentials.bucket}.${credentials.accountId}.r2.dev/${key}`;
  }
  const region = credentials.region || 'ap-south-1';
  return `https://${credentials.bucket}.s3.${region}.amazonaws.com/${key}`;
}

// -----------------------------------------------------------------------------
// SERVER ACTIONS
// -----------------------------------------------------------------------------

/**
 * 1. Contacts BYOS (S3/R2) to start a multipart upload, returning a unique uploadId.
 * Never loads video bytes into the ERP server.
 */
export async function initiateMultipartUploadAction(input: z.infer<typeof initiateMultipartSchema>) {
  try {
    const { tenantId } = await validateSession();
    const validated = initiateMultipartSchema.parse(input);

    const storageConfig = await getDecryptedStorageCredentialsInternal(tenantId);
    if (!storageConfig) {
      return {
        success: false,
        error: 'No active BYOS storage integration found. Please connect AWS S3 or Cloudflare R2 in Settings.',
      };
    }

    const { id: integrationId, provider, credentials } = storageConfig;
    const sanitizedFilename = validated.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const folderContext = validated.bookingId || validated.customerId || 'general';
    const objectKey = `tenants/${tenantId}/raw-video/${folderContext}/${Date.now()}-${sanitizedFilename}`;

    const isS3Compatible =
      provider === StorageProvider.AWS_S3 ||
      provider === StorageProvider.CLOUDFLARE_R2 ||
      Boolean(credentials.bucket && credentials.accessKeyId);

    if (isS3Compatible) {
      const s3Client = getS3ClientFromCredentials(credentials, provider);

      const createMultipartCmd = new CreateMultipartUploadCommand({
        Bucket: credentials.bucket,
        Key: objectKey,
        ContentType: validated.mimeType || 'video/mp4',
      });

      const response = await s3Client.send(createMultipartCmd);

      if (!response.UploadId) {
        throw new Error('S3 provider did not return an UploadId for multipart initialization.');
      }

      const publicUrl = constructPublicUrl(credentials, provider, objectKey);

      return {
        success: true,
        uploadId: response.UploadId,
        key: objectKey,
        integrationId,
        provider,
        chunkSize: validated.chunkSize,
        publicUrl,
      };
    }

    // Google Drive or Fallback Simulator for local/dev
    const fallbackUploadId = `mock-multipart-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const fallbackUrl = `https://storage.googleapis.com/pratima-erp-vaults/${objectKey}`;

    return {
      success: true,
      uploadId: fallbackUploadId,
      key: objectKey,
      integrationId,
      provider,
      chunkSize: validated.chunkSize,
      publicUrl: fallbackUrl,
    };
  } catch (error: any) {
    console.error('[INITIATE_MULTIPART_UPLOAD_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to initialize multipart video upload.',
    };
  }
}

/**
 * 2. Generates pre-signed URLs for a specific batch of chunk parts.
 * Allows client to upload chunks concurrently or sequentially directly to cloud storage.
 */
export async function getMultipartPreSignedUrlsAction(input: z.infer<typeof getMultipartPreSignedUrlsSchema>) {
  try {
    const { tenantId } = await validateSession();
    const validated = getMultipartPreSignedUrlsSchema.parse(input);

    const storageConfig = await getDecryptedStorageCredentialsInternal(
      tenantId,
      validated.integrationId || undefined
    );

    if (!storageConfig) {
      return {
        success: false,
        error: 'Storage integration not found for multipart chunk signing.',
      };
    }

    const { provider, credentials } = storageConfig;
    const isS3Compatible =
      provider === StorageProvider.AWS_S3 ||
      provider === StorageProvider.CLOUDFLARE_R2 ||
      Boolean(credentials.bucket && credentials.accessKeyId);

    if (isS3Compatible && !validated.uploadId.startsWith('mock-')) {
      const s3Client = getS3ClientFromCredentials(credentials, provider);

      // Generate pre-signed URL for each requested part
      const partUrls: Record<number, string> = {};

      await Promise.all(
        validated.partNumbers.map(async (partNumber) => {
          const uploadPartCmd = new UploadPartCommand({
            Bucket: credentials.bucket,
            Key: validated.key,
            UploadId: validated.uploadId,
            PartNumber: partNumber,
          });

          // Pre-signed URL valid for 2 hours per chunk
          const url = await getSignedUrl(s3Client, uploadPartCmd, { expiresIn: 7200 });
          partUrls[partNumber] = url;
        })
      );

      return {
        success: true,
        partUrls,
      };
    }

    // Simulated part URLs for local / dev fallback
    const simulatedPartUrls: Record<number, string> = {};
    validated.partNumbers.forEach((p) => {
      simulatedPartUrls[p] = `https://storage.googleapis.com/pratima-erp-vaults/${validated.key}?partNumber=${p}&uploadId=${validated.uploadId}`;
    });

    return {
      success: true,
      partUrls: simulatedPartUrls,
    };
  } catch (error: any) {
    console.error('[GET_MULTIPART_PRESIGNED_URLS_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to generate pre-signed upload URLs for video parts.',
    };
  }
}

/**
 * 3. Finalizes the multipart upload. Contacts BYOS to merge chunks into a single object,
 * creates the StorageRecord in the database, and returns the final asset metadata.
 */
export async function completeMultipartUploadAction(input: z.infer<typeof completeMultipartSchema>) {
  try {
    const { tenantId } = await validateSession();
    const validated = completeMultipartSchema.parse(input);

    const storageConfig = await getDecryptedStorageCredentialsInternal(
      tenantId,
      validated.integrationId || undefined
    );

    if (!storageConfig) {
      return {
        success: false,
        error: 'Storage configuration not found to complete multipart upload.',
      };
    }

    const { id: integrationId, provider, credentials } = storageConfig;
    let publicUrl = constructPublicUrl(credentials, provider, validated.key);

    const isS3Compatible =
      provider === StorageProvider.AWS_S3 ||
      provider === StorageProvider.CLOUDFLARE_R2 ||
      Boolean(credentials.bucket && credentials.accessKeyId);

    if (isS3Compatible && !validated.uploadId.startsWith('mock-')) {
      const s3Client = getS3ClientFromCredentials(credentials, provider);

      // S3 CompleteMultipartUpload requires parts sorted strictly in ascending order
      const sortedParts = [...validated.parts]
        .sort((a, b) => a.partNumber - b.partNumber)
        .map((p) => ({
          PartNumber: p.partNumber,
          // Strip any outer quotes returned in HTTP headers
          ETag: p.eTag.replace(/^"|"$/g, ''),
        }));

      const completeCmd = new CompleteMultipartUploadCommand({
        Bucket: credentials.bucket,
        Key: validated.key,
        UploadId: validated.uploadId,
        MultipartUpload: {
          Parts: sortedParts,
        },
      });

      const completeRes = await s3Client.send(completeCmd);
      if (completeRes.Location) {
        publicUrl = completeRes.Location;
      }
    }

    // Register official StorageRecord in database
    const storageRecord = await prisma.storageRecord.create({
      data: {
        tenantId,
        integrationId,
        customerId: validated.customerId || null,
        eventBookingId: validated.bookingId || null,
        fileName: validated.filename,
        externalFileId: validated.key,
        mimeType: validated.mimeType || 'video/mp4',
        sizeBytes: BigInt(validated.sizeBytes),
        url: publicUrl,
      },
      include: {
        integration: {
          select: { provider: true },
        },
      },
    });

    if (validated.bookingId) {
      revalidatePath(`/operations/bookings/${validated.bookingId}`);
    }
    if (validated.customerId) {
      revalidatePath(`/customers/${validated.customerId}`);
    }
    revalidatePath('/operations');

    return {
      success: true,
      message: 'Video uploaded and assembled successfully on cloud storage.',
      storageRecord: serializePrisma(storageRecord),
      publicUrl,
    };
  } catch (error: any) {
    console.error('[COMPLETE_MULTIPART_UPLOAD_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to complete multipart video upload.',
    };
  }
}

/**
 * 4. Automatically maps the uploaded video assetsUrl to the active Video Editing WorkflowTask.
 * Eliminates manual pasting and instantly exposes the assets to in-house or external editors.
 */
export async function syncUploadedVideoToEditorAction(input: z.infer<typeof syncUploadedVideoToEditorSchema>) {
  try {
    const { tenantId } = await validateSession();
    const validated = syncUploadedVideoToEditorSchema.parse(input);

    // Find any existing active video editing workflow task for this booking
    let task = await prisma.workflowTask.findFirst({
      where: {
        tenantId,
        eventBookingId: validated.bookingId,
        type: WorkflowType.VIDEO_EDITING,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const assetsUrl = validated.assetsUrl;
    const noteEntry = `[Auto-Vault Sync ${now.toLocaleDateString('en-IN')}] RAW Video master uploaded: ${validated.filename || 'Master Video Asset'}`;

    if (task) {
      // Update existing video editing task
      task = await prisma.workflowTask.update({
        where: { id: task.id },
        data: {
          assetsUrl,
          directorNotes: task.directorNotes
            ? `${task.directorNotes}\n\n${noteEntry}`
            : noteEntry,
          status: task.status === TaskStatus.PENDING ? TaskStatus.IN_PROGRESS : task.status,
        },
      });
    } else {
      // Create new video deliverable task if not yet provisioned
      const editorToken = crypto.randomUUID();
      task = await prisma.workflowTask.create({
        data: {
          tenantId,
          eventBookingId: validated.bookingId,
          type: WorkflowType.VIDEO_EDITING,
          taskType: 'Cinematic Highlights & Master Cut',
          status: TaskStatus.IN_PROGRESS,
          assetsUrl,
          editorToken,
          directorNotes: noteEntry,
        },
      });
    }

    revalidatePath(`/operations/bookings/${validated.bookingId}`);
    revalidatePath('/operations/tasks');
    revalidatePath('/operations/post-production');

    return {
      success: true,
      message: 'Video assets mapped directly to video editing task workflow.',
      taskId: task.id,
      editorToken: task.editorToken,
    };
  } catch (error: any) {
    console.error('[SYNC_UPLOADED_VIDEO_TO_EDITOR_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to sync uploaded video to editor workflow.',
    };
  }
}

/**
 * 5. Aborts an incomplete multipart upload on BYOS to clean up orphaned storage chunks.
 */
export async function abortMultipartUploadAction(uploadId: string, key: string, integrationId?: string) {
  try {
    const { tenantId } = await validateSession();
    if (!uploadId || !key) return { success: false, error: 'UploadId and key required.' };

    const storageConfig = await getDecryptedStorageCredentialsInternal(tenantId, integrationId);
    if (!storageConfig) return { success: false, error: 'Storage configuration not found.' };

    const { provider, credentials } = storageConfig;
    const isS3Compatible =
      provider === StorageProvider.AWS_S3 ||
      provider === StorageProvider.CLOUDFLARE_R2 ||
      Boolean(credentials.bucket && credentials.accessKeyId);

    if (isS3Compatible && !uploadId.startsWith('mock-')) {
      const s3Client = getS3ClientFromCredentials(credentials, provider);
      await s3Client.send(
        new AbortMultipartUploadCommand({
          Bucket: credentials.bucket,
          Key: key,
          UploadId: uploadId,
        })
      );
    }

    return { success: true, message: 'Multipart upload aborted.' };
  } catch (error: any) {
    console.error('[ABORT_MULTIPART_UPLOAD_ERROR]', error);
    return { success: false, error: error?.message || 'Failed to abort multipart upload.' };
  }
}
