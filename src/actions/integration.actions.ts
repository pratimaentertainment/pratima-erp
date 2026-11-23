'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';
import { IntegrationProvider } from '@prisma/client';
import { serializePrisma } from '@/lib/serialize';

export type IntegrationActionResponse<T = any> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string };

/**
 * Fetch all integrations configured for the current tenant.
 */
export async function getIntegrationsAction(): Promise<IntegrationActionResponse<any[]>> {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.tenantId) {
      return { success: false, error: 'Unauthorized: No active session' };
    }

    const integrations = await prisma.tenantIntegration.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: serializePrisma(integrations) };
  } catch (error: any) {
    console.error('[GET_INTEGRATIONS_ERROR]', error);
    return { success: false, error: error.message || 'Failed to fetch integrations' };
  }
}

/**
 * Generate or rotate a secure API key for a specified platform provider.
 */
export async function generateIntegrationKeyAction(
  provider: IntegrationProvider,
  name?: string
): Promise<IntegrationActionResponse<any>> {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.tenantId) {
      return { success: false, error: 'Unauthorized: No active session' };
    }

    // High-entropy 64-character hex key with platform identifier prefix
    const randomHex = crypto.randomBytes(32).toString('hex');
    const apiKey = `pratima_${provider.toLowerCase()}_${randomHex}`;

    const defaultName = name || `${provider.charAt(0) + provider.slice(1).toLowerCase()} Integration`;

    const integration = await prisma.tenantIntegration.upsert({
      where: {
        tenantId_provider: {
          tenantId: user.tenantId,
          provider,
        },
      },
      update: {
        apiKey,
        name: defaultName,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        tenantId: user.tenantId,
        provider,
        apiKey,
        name: defaultName,
        isActive: true,
      },
    });

    revalidatePath('/settings/integrations');
    return {
      success: true,
      data: serializePrisma(integration),
      message: `Successfully connected ${provider} integration.`,
    };
  } catch (error: any) {
    console.error('[GENERATE_INTEGRATION_KEY_ERROR]', error);
    return { success: false, error: error.message || 'Failed to generate integration key' };
  }
}

/**
 * Revoke and remove an integration key permanently.
 */
export async function revokeIntegrationKeyAction(id: string): Promise<IntegrationActionResponse<null>> {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.tenantId) {
      return { success: false, error: 'Unauthorized: No active session' };
    }

    const existing = await prisma.tenantIntegration.findFirst({
      where: { id, tenantId: user.tenantId },
    });

    if (!existing) {
      return { success: false, error: 'Integration not found' };
    }

    await prisma.tenantIntegration.delete({
      where: { id },
    });

    revalidatePath('/settings/integrations');
    return { success: true, data: null, message: 'Integration revoked successfully' };
  } catch (error: any) {
    console.error('[REVOKE_INTEGRATION_KEY_ERROR]', error);
    return { success: false, error: error.message || 'Failed to revoke integration key' };
  }
}

/**
 * Pause or resume an integration without deleting its configuration.
 */
export async function toggleIntegrationStatusAction(
  id: string,
  isActive: boolean
): Promise<IntegrationActionResponse<any>> {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.tenantId) {
      return { success: false, error: 'Unauthorized: No active session' };
    }

    const updated = await prisma.tenantIntegration.update({
      where: { id, tenantId: user.tenantId },
      data: { isActive, updatedAt: new Date() },
    });

    revalidatePath('/settings/integrations');
    return {
      success: true,
      data: serializePrisma(updated),
      message: `Integration ${isActive ? 'enabled' : 'disabled'} successfully.`,
    };
  } catch (error: any) {
    console.error('[TOGGLE_INTEGRATION_STATUS_ERROR]', error);
    return { success: false, error: error.message || 'Failed to update integration status' };
  }
}

/**
 * Update integration metadata (such as Meta App Secret, Verify Token, Page Access Token, and Page ID).
 */
export async function updateIntegrationMetadataAction(
  id: string,
  metadataUpdates: {
    appSecret?: string;
    verifyToken?: string;
    pageAccessToken?: string;
    pageId?: string;
  }
): Promise<IntegrationActionResponse<any>> {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.tenantId) {
      return { success: false, error: 'Unauthorized: No active session' };
    }

    const existing = await prisma.tenantIntegration.findFirst({
      where: { id, tenantId: user.tenantId },
    });

    if (!existing) {
      return { success: false, error: 'Integration not found' };
    }

    const currentMetadata = (existing.metadata as Record<string, any>) || {};
    const mergedMetadata = {
      ...currentMetadata,
      ...metadataUpdates,
    };

    const updated = await prisma.tenantIntegration.update({
      where: { id },
      data: {
        metadata: mergedMetadata,
        updatedAt: new Date(),
      },
    });

    revalidatePath('/settings/integrations');
    return {
      success: true,
      data: serializePrisma(updated),
      message: 'Integration credentials saved successfully.',
    };
  } catch (error: any) {
    console.error('[UPDATE_INTEGRATION_METADATA_ERROR]', error);
    return { success: false, error: error.message || 'Failed to update integration metadata' };
  }
}
