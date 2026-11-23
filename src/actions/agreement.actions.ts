'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { DocumentTemplateType, UserAgreementStatus } from '@prisma/client';
import { serializePrisma } from '@/lib/serialize';
import { compileAgreementContent } from '@/lib/agreements/interpolation';
import { z } from 'zod';

async function validateSession() {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.tenantId) {
    throw new Error('Unauthorized: No active tenant session');
  }
  return {
    tenantId: user.tenantId as string,
    userId: user.id as string,
  };
}

const createTemplateSchema = z.object({
  name: z.string().min(2, 'Template name must be at least 2 characters'),
  content: z.string().min(5, 'Content must be at least 5 characters'),
  type: z.nativeEnum(DocumentTemplateType).default(DocumentTemplateType.AGREEMENT),
  isActive: z.boolean().default(true),
});

const updateTemplateSchema = z.object({
  id: z.string().uuid('Invalid template ID'),
  name: z.string().min(2).optional(),
  content: z.string().min(5).optional(),
  type: z.nativeEnum(DocumentTemplateType).optional(),
  isActive: z.boolean().optional(),
});

export async function createDocumentTemplateAction(input: z.infer<typeof createTemplateSchema>) {
  try {
    const { tenantId } = await validateSession();
    const validated = createTemplateSchema.parse(input);

    const template = await prisma.documentTemplate.create({
      data: {
        tenantId,
        name: validated.name.trim(),
        content: validated.content.trim(),
        type: validated.type,
        isActive: validated.isActive,
      },
    });

    revalidatePath('/settings/agreements');
    revalidatePath('/settings/team');

    return { success: true, data: serializePrisma(template) };
  } catch (error: any) {
    console.error('[CREATE_DOCUMENT_TEMPLATE_ERROR]', error);
    return { success: false, error: error.message || 'Failed to create document template' };
  }
}

export async function updateDocumentTemplateAction(input: z.infer<typeof updateTemplateSchema>) {
  try {
    const { tenantId } = await validateSession();
    const validated = updateTemplateSchema.parse(input);

    const existing = await prisma.documentTemplate.findFirst({
      where: { id: validated.id, tenantId, deletedAt: null },
    });

    if (!existing) {
      return { success: false, error: 'Document template not found or unauthorized' };
    }

    const updated = await prisma.documentTemplate.update({
      where: { id: validated.id },
      data: {
        name: validated.name !== undefined ? validated.name.trim() : undefined,
        content: validated.content !== undefined ? validated.content.trim() : undefined,
        type: validated.type !== undefined ? validated.type : undefined,
        isActive: validated.isActive !== undefined ? validated.isActive : undefined,
      },
    });

    revalidatePath('/settings/agreements');
    revalidatePath('/settings/team');

    return { success: true, data: serializePrisma(updated) };
  } catch (error: any) {
    console.error('[UPDATE_DOCUMENT_TEMPLATE_ERROR]', error);
    return { success: false, error: error.message || 'Failed to update document template' };
  }
}

export async function deleteDocumentTemplateAction(templateId: string) {
  try {
    const { tenantId } = await validateSession();

    const existing = await prisma.documentTemplate.findFirst({
      where: { id: templateId, tenantId, deletedAt: null },
    });

    if (!existing) {
      return { success: false, error: 'Document template not found' };
    }

    await prisma.documentTemplate.update({
      where: { id: templateId },
      data: { deletedAt: new Date(), isActive: false },
    });

    revalidatePath('/settings/agreements');
    revalidatePath('/settings/team');

    return { success: true };
  } catch (error: any) {
    console.error('[DELETE_DOCUMENT_TEMPLATE_ERROR]', error);
    return { success: false, error: error.message || 'Failed to delete template' };
  }
}

export async function assignAgreementToUserAction(
  userId: string,
  templateId: string,
  extraContext?: {
    role?: string;
    eventDate?: string | Date;
    subEventName?: string;
    payoutAmount?: number | string;
  }
) {
  try {
    const { tenantId } = await validateSession();

    if (!userId || !templateId) {
      return { success: false, error: 'User ID and Template ID are required' };
    }

    // Verify user belongs to tenant and fetch profile fields for interpolation
    const targetUser = await prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        companyName: true,
        designation: true,
      },
    });
    if (!targetUser) {
      return { success: false, error: 'Selected user not found' };
    }

    // Verify template belongs to tenant
    const targetTemplate = await prisma.documentTemplate.findFirst({
      where: { id: templateId, tenantId, deletedAt: null },
      select: { id: true, name: true, content: true },
    });
    if (!targetTemplate) {
      return { success: false, error: 'Selected document template not found' };
    }

    // Check if pending agreement already exists
    const existingPending = await prisma.userAgreement.findFirst({
      where: {
        userId,
        templateId,
        tenantId,
        status: UserAgreementStatus.PENDING,
        deletedAt: null,
      },
    });

    if (existingPending) {
      return {
        success: true,
        data: serializePrisma(existingPending),
        message: 'A pending agreement is already assigned to this user.',
      };
    }

    // Generate immutable legal snapshot by interpolating tags
    const compiledContent = compileAgreementContent(
      targetTemplate.content,
      {
        name: targetUser.name,
        email: targetUser.email,
        phone: targetUser.phone,
        address: targetUser.address,
        companyName: targetUser.companyName,
        designation: targetUser.designation,
      },
      extraContext
    );

    const agreement = await prisma.userAgreement.create({
      data: {
        tenantId,
        userId,
        templateId,
        status: UserAgreementStatus.PENDING,
        compiledContent,
      },
      include: {
        template: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    revalidatePath('/settings/team');
    revalidatePath('/settings/agreements');
    revalidatePath('/customers');

    return { success: true, data: serializePrisma(agreement) };
  } catch (error: any) {
    console.error('[ASSIGN_AGREEMENT_ERROR]', error);
    return { success: false, error: error.message || 'Failed to assign agreement' };
  }
}
