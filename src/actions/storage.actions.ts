'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { StorageProvider } from '@prisma/client';
import { encryptData, decryptData } from '@/lib/security/encryption';
import { serializePrisma } from '@/lib/serialize';
import { z } from 'zod';

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

// Schemas
const s3CredentialsSchema = z.object({
  accessKeyId: z.string().min(3, 'Access Key ID is required'),
  secretAccessKey: z.string().min(5, 'Secret Access Key is required'),
  bucket: z.string().min(2, 'Bucket name is required'),
  region: z.string().min(2, 'Region is required'),
  endpoint: z.string().url().optional(),
});

const r2CredentialsSchema = z.object({
  accountId: z.string().min(5, 'Cloudflare Account ID is required'),
  accessKeyId: z.string().min(5, 'Access Key ID is required'),
  secretAccessKey: z.string().min(5, 'Secret Access Key is required'),
  bucket: z.string().min(2, 'Bucket name is required'),
  publicUrl: z.string().url().optional(),
});

const googleDriveCredentialsSchema = z.object({
  refresh_token: z.string().optional(),
  refreshToken: z.string().optional(),
  folderId: z.string().optional(),
}).refine(
  (data) => Boolean(data.refresh_token || data.refreshToken),
  { message: 'Google Drive OAuth refresh token is required.' }
);

const saveStorageIntegrationSchema = z.object({
  id: z.string().uuid().optional().nullable().or(z.literal('')),
  provider: z.nativeEnum(StorageProvider),
  credentials: z.record(z.string(), z.any()),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

/**
 * Saves or updates a Bring-Your-Own-Storage (BYOS) cloud integration.
 * The credentials payload is strictly encrypted at rest with AES-256-GCM.
 */
export async function saveStorageIntegrationAction(input: z.infer<typeof saveStorageIntegrationSchema>) {
  try {
    const { tenantId } = await validateSession();
    const validated = saveStorageIntegrationSchema.parse(input);

    // Validate provider-specific credential structure
    switch (validated.provider) {
      case StorageProvider.AWS_S3:
        s3CredentialsSchema.parse(validated.credentials);
        break;
      case StorageProvider.CLOUDFLARE_R2:
        r2CredentialsSchema.parse(validated.credentials);
        break;
      case StorageProvider.GOOGLE_DRIVE:
        googleDriveCredentialsSchema.parse(validated.credentials);
        break;
      default:
        throw new Error(`Unsupported storage provider: ${validated.provider}`);
    }

    // Encrypt the credentials payload before database persistence
    const serializedCreds = JSON.stringify(validated.credentials);
    const encryptedCredentials = encryptData(serializedCreds);

    let savedRecord;

    // If marked as default, unset existing defaults for this tenant
    if (validated.isDefault) {
      await prisma.storageIntegration.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    if (validated.id && validated.id.trim() !== '') {
      // Verify ownership before update
      const existing = await prisma.storageIntegration.findFirst({
        where: { id: validated.id, tenantId, deletedAt: null },
      });

      if (!existing) {
        return { success: false, error: 'Storage integration not found or unauthorized.' };
      }

      savedRecord = await prisma.storageIntegration.update({
        where: { id: validated.id },
        data: {
          provider: validated.provider,
          encryptedCredentials,
          isActive: validated.isActive,
          isDefault: validated.isDefault,
        },
      });
    } else {
      // Auto-set as default if this is the first active integration
      const existingCount = await prisma.storageIntegration.count({
        where: { tenantId, deletedAt: null },
      });

      const makeDefault = validated.isDefault || existingCount === 0;

      savedRecord = await prisma.storageIntegration.create({
        data: {
          tenantId,
          provider: validated.provider,
          encryptedCredentials,
          isActive: validated.isActive,
          isDefault: makeDefault,
        },
      });
    }

    revalidatePath('/settings');
    revalidatePath('/settings/storage');

    // Never return encrypted or raw credentials across RSC boundary
    return {
      success: true,
      data: serializePrisma({
        id: savedRecord.id,
        provider: savedRecord.provider,
        isActive: savedRecord.isActive,
        isDefault: savedRecord.isDefault,
        createdAt: savedRecord.createdAt,
        updatedAt: savedRecord.updatedAt,
      }),
    };
  } catch (error: any) {
    console.error('[SAVE_STORAGE_INTEGRATION_ERROR]', error);
    return {
      success: false,
      error: error.message || 'Failed to save storage integration.',
    };
  }
}

/**
 * Fetches all active storage integrations for the tenant.
 * Strips out encrypted credentials to prevent leaking security keys to the UI.
 */
export async function getStorageIntegrationsAction() {
  try {
    const { tenantId } = await validateSession();

    const integrations = await prisma.storageIntegration.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            storageRecords: true,
          },
        },
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    const sanitized = integrations.map((item) => ({
      id: item.id,
      provider: item.provider,
      isActive: item.isActive,
      isDefault: item.isDefault,
      recordCount: item._count.storageRecords,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    return {
      success: true,
      data: serializePrisma(sanitized),
    };
  } catch (error: any) {
    console.error('[GET_STORAGE_INTEGRATIONS_ERROR]', error);
    return {
      success: false,
      error: error.message || 'Failed to load storage integrations.',
    };
  }
}

/**
 * Toggles an integration active/inactive status.
 */
export async function toggleStorageIntegrationAction(id: string, isActive: boolean) {
  try {
    const { tenantId } = await validateSession();

    const existing = await prisma.storageIntegration.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!existing) {
      return { success: false, error: 'Integration not found.' };
    }

    const updated = await prisma.storageIntegration.update({
      where: { id },
      data: { isActive },
    });

    revalidatePath('/settings');
    revalidatePath('/settings/storage');

    return {
      success: true,
      data: serializePrisma({
        id: updated.id,
        provider: updated.provider,
        isActive: updated.isActive,
        isDefault: updated.isDefault,
      }),
    };
  } catch (error: any) {
    console.error('[TOGGLE_STORAGE_INTEGRATION_ERROR]', error);
    return {
      success: false,
      error: error.message || 'Failed to update integration status.',
    };
  }
}

/**
 * Sets a storage integration as the default provider for the tenant.
 */
export async function setDefaultStorageIntegrationAction(id: string) {
  try {
    const { tenantId } = await validateSession();

    const existing = await prisma.storageIntegration.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!existing) {
      return { success: false, error: 'Storage integration not found.' };
    }

    // Unset all existing defaults
    await prisma.storageIntegration.updateMany({
      where: { tenantId, isDefault: true },
      data: { isDefault: false },
    });

    // Mark this one as default and ensure it is active
    const updated = await prisma.storageIntegration.update({
      where: { id },
      data: { isDefault: true, isActive: true },
    });

    revalidatePath('/settings');
    revalidatePath('/settings/storage');

    return {
      success: true,
      data: serializePrisma({
        id: updated.id,
        provider: updated.provider,
        isActive: updated.isActive,
        isDefault: updated.isDefault,
      }),
    };
  } catch (error: any) {
    console.error('[SET_DEFAULT_STORAGE_INTEGRATION_ERROR]', error);
    return {
      success: false,
      error: error.message || 'Failed to set default storage integration.',
    };
  }
}

/**
 * Soft-deletes a storage integration.
 */
export async function deleteStorageIntegrationAction(id: string) {
  try {
    const { tenantId } = await validateSession();

    const existing = await prisma.storageIntegration.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!existing) {
      return { success: false, error: 'Integration not found.' };
    }

    await prisma.storageIntegration.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        isDefault: false,
      },
    });

    revalidatePath('/settings');
    revalidatePath('/settings/storage');

    return { success: true };
  } catch (error: any) {
    console.error('[DELETE_STORAGE_INTEGRATION_ERROR]', error);
    return {
      success: false,
      error: error.message || 'Failed to delete storage integration.',
    };
  }
}

/**
 * Internal server-only method: Retrieves and decrypts the active storage credentials for file operations.
 * NEVER expose this function directly as a client-callable server action.
 */
export async function getDecryptedStorageCredentialsInternal(
  tenantId: string,
  integrationId?: string
): Promise<{
  id: string;
  provider: StorageProvider;
  credentials: Record<string, any>;
} | null> {
  const whereClause: any = {
    tenantId,
    isActive: true,
    deletedAt: null,
  };

  if (integrationId) {
    whereClause.id = integrationId;
  } else {
    whereClause.isDefault = true;
  }

  let record = await prisma.storageIntegration.findFirst({
    where: whereClause,
  });

  // Fallback to any active integration if no default is designated
  if (!record && !integrationId) {
    record = await prisma.storageIntegration.findFirst({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  if (!record) {
    return null;
  }

  const decryptedJson = decryptData(record.encryptedCredentials);
  const credentials = JSON.parse(decryptedJson);

  return {
    id: record.id,
    provider: record.provider,
    credentials,
  };
}
