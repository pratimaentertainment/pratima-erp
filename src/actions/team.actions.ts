'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { EmploymentType, UserStatus, UserAgreementStatus, Prisma } from '@prisma/client';
import { serializePrisma } from '@/lib/serialize';
import { compileAgreementContent } from '@/lib/agreements/interpolation';
import bcrypt from 'bcryptjs';
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

const createTeamMemberSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  address: z.string().optional(),
  companyName: z.string().optional(),
  designation: z.string().optional(),
  employmentType: z.nativeEnum(EmploymentType).default(EmploymentType.IN_HOUSE),
  monthlySalary: z.coerce.number().min(0, 'Monthly salary cannot be negative').optional().nullable(),
  skills: z.array(z.string()).default([]),
  equipmentList: z.string().optional(),
  password: z.string().min(6).optional(),
  templateId: z.string().uuid().optional(),
});

const updateTeamMemberSchema = z.object({
  id: z.string().uuid('Invalid user ID'),
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  companyName: z.string().optional(),
  designation: z.string().optional(),
  employmentType: z.nativeEnum(EmploymentType).optional(),
  monthlySalary: z.coerce.number().min(0, 'Monthly salary cannot be negative').optional().nullable(),
  skills: z.array(z.string()).optional(),
  equipmentList: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  isBlacklisted: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

import { TeamService } from '@/services/team.service';

export const addTeamMemberSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable().or(z.literal('')),
  companyName: z.string().optional().nullable().or(z.literal('')),
  designation: z.string().optional().nullable().or(z.literal('')),
  department: z.string().optional().nullable().or(z.literal('')),
  employmentType: z.nativeEnum(EmploymentType).default(EmploymentType.IN_HOUSE),
  monthlySalary: z.coerce.number().min(0, 'Monthly salary cannot be negative').optional().nullable(),
  skills: z.array(z.string()).default([]),
  equipmentList: z.string().optional().nullable().or(z.literal('')),
  password: z.string().min(6).optional().nullable().or(z.literal('')),
  role: z.string().optional().nullable().or(z.literal('')),
  branchId: z.string().uuid().optional().nullable().or(z.literal('')),
  templateId: z.string().uuid().optional().nullable().or(z.literal('')),
});

/**
 * Enterprise Team Member Creation Action:
 * Auto-provisions credentials for in-house staff, creates contracts, and links roles.
 */
export async function addTeamMemberAction(
  tenantIdOrInput: string | z.infer<typeof addTeamMemberSchema>,
  maybeInput?: z.infer<typeof addTeamMemberSchema>
) {
  try {
    let tenantId: string;
    let input: z.infer<typeof addTeamMemberSchema>;

    if (typeof tenantIdOrInput === 'string') {
      tenantId = tenantIdOrInput;
      input = maybeInput!;
    } else {
      const session = await validateSession();
      tenantId = session.tenantId;
      input = tenantIdOrInput;
    }

    const session = await validateSession().catch(() => null);
    const validated = addTeamMemberSchema.parse(input);

    const result = await TeamService.addTeamMember(
      tenantId,
      {
        ...validated,
        email: validated.email || null,
        phone: validated.phone || null,
        address: validated.address || null,
        companyName: validated.companyName || null,
        designation: validated.designation || null,
        department: validated.department || null,
        equipmentList: validated.equipmentList || null,
        password: validated.password || null,
        role: validated.role || null,
        branchId: validated.branchId || null,
        templateId: validated.templateId || null,
      },
      session?.userId
    );

    revalidatePath('/settings/team');
    revalidatePath('/users');
    revalidatePath('/customers');

    return {
      success: true,
      data: serializePrisma(result.user),
      credentials: result.credentials,
    };
  } catch (error: any) {
    console.error('[ADD_TEAM_MEMBER_ERROR]', error);
    return { success: false, error: error.message || 'Failed to add team member' };
  }
}

/**
 * Backwards-compatible alias for team creation
 */
export async function createTeamMemberAction(input: z.infer<typeof addTeamMemberSchema>) {
  return addTeamMemberAction(input);
}

/**
 * Owner-only administrative capability to recover or reset an in-house staff member's password.
 */
export async function resetStaffPasswordAction(
  tenantIdOrUserId: string,
  maybeTargetUserId?: string,
  maybeNewPassword?: string
) {
  try {
    let tenantId: string;
    let targetUserId: string;
    let newPassword: string | undefined;

    if (maybeTargetUserId) {
      tenantId = tenantIdOrUserId;
      targetUserId = maybeTargetUserId;
      newPassword = maybeNewPassword;
    } else {
      const session = await validateSession();
      tenantId = session.tenantId;
      targetUserId = tenantIdOrUserId;
      newPassword = maybeTargetUserId;
    }

    const session = await validateSession().catch(() => null);
    const result = await TeamService.resetStaffPassword(
      tenantId,
      targetUserId,
      newPassword,
      session?.userId
    );

    revalidatePath('/settings/team');
    revalidatePath('/users');

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    console.error('[RESET_STAFF_PASSWORD_ERROR]', error);
    return { success: false, error: error.message || 'Failed to reset staff password' };
  }
}

export async function updateTeamMemberAction(input: z.infer<typeof updateTeamMemberSchema>) {
  try {
    const { tenantId } = await validateSession();
    const validated = updateTeamMemberSchema.parse(input);

    const existingUser = await prisma.user.findFirst({
      where: { id: validated.id, tenantId, deletedAt: null },
    });

    if (!existingUser) {
      return { success: false, error: 'User not found or unauthorized' };
    }

    // If updating email, check for duplicate
    if (validated.email && validated.email.toLowerCase() !== existingUser.email.toLowerCase()) {
      const emailClean = validated.email.trim().toLowerCase();
      const duplicate = await prisma.user.findFirst({
        where: {
          email: emailClean,
          id: { not: existingUser.id },
          deletedAt: null,
        },
      });
      if (duplicate) {
        return { success: false, error: `Email "${emailClean}" is already in use.` };
      }
    }

    const salaryDecimal =
      validated.monthlySalary !== undefined
        ? validated.monthlySalary !== null
          ? new Prisma.Decimal(validated.monthlySalary)
          : null
        : undefined;

    const updated = await prisma.user.update({
      where: { id: validated.id },
      data: {
        name: validated.name !== undefined ? validated.name.trim() : undefined,
        email: validated.email !== undefined ? validated.email.trim().toLowerCase() : undefined,
        phone: validated.phone !== undefined ? validated.phone.trim() || null : undefined,
        address: validated.address !== undefined ? validated.address.trim() || null : undefined,
        companyName: validated.companyName !== undefined ? validated.companyName.trim() || null : undefined,
        designation: validated.designation !== undefined ? validated.designation.trim() || null : undefined,
        employmentType: validated.employmentType !== undefined ? validated.employmentType : undefined,
        monthlySalary: salaryDecimal,
        isActive: validated.isActive !== undefined ? validated.isActive : undefined,
        skills: validated.skills !== undefined ? validated.skills : undefined,
        equipmentList: validated.equipmentList !== undefined ? validated.equipmentList.trim() || null : undefined,
        rating: validated.rating !== undefined ? validated.rating : undefined,
        isBlacklisted: validated.isBlacklisted !== undefined ? validated.isBlacklisted : undefined,
      },
    });

    revalidatePath('/settings/team');
    revalidatePath('/users');
    revalidatePath('/customers');

    return { success: true, data: serializePrisma(updated) };
  } catch (error: any) {
    console.error('[UPDATE_TEAM_MEMBER_ERROR]', error);
    return { success: false, error: error.message || 'Failed to update team member' };
  }
}

export async function toggleTeamMemberStatusAction(userId: string, isActive: boolean) {
  try {
    const { tenantId, userId: currentUserId } = await validateSession();

    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    if (userId === currentUserId && !isActive) {
      return { success: false, error: 'You cannot deactivate your own account.' };
    }

    const targetUser = await prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
    });

    if (!targetUser) {
      return { success: false, error: 'User not found or unauthorized' };
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        isActive,
        status: isActive ? UserStatus.ACTIVE : UserStatus.INACTIVE,
      },
    });

    revalidatePath('/settings/team');
    revalidatePath('/users');
    revalidatePath('/customers');
    revalidatePath('/inquiries');
    revalidatePath('/leads');

    return { success: true, data: serializePrisma(updated) };
  } catch (error: any) {
    console.error('[TOGGLE_TEAM_MEMBER_STATUS_ERROR]', error);
    return { success: false, error: error.message || 'Failed to toggle member status' };
  }
}

export async function toggleUserBlacklistAction(userId: string, isBlacklisted: boolean) {
  try {
    const { tenantId } = await validateSession();

    const targetUser = await prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
    });

    if (!targetUser) {
      return { success: false, error: 'User not found or unauthorized' };
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isBlacklisted },
      select: { id: true, name: true, isBlacklisted: true },
    });

    revalidatePath('/settings/team');
    revalidatePath('/users');
    revalidatePath('/customers');

    return { success: true, data: serializePrisma(updated) };
  } catch (error: any) {
    console.error('[TOGGLE_BLACKLIST_ERROR]', error);
    return { success: false, error: error.message || 'Failed to toggle blacklist status' };
  }
}

export async function updateUserEmploymentAction(
  userId: string,
  data: {
    employmentType?: EmploymentType;
    skills?: string[];
    equipmentList?: string;
    rating?: number;
    address?: string;
    companyName?: string;
  }
) {
  try {
    const { tenantId } = await validateSession();

    const targetUser = await prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
    });

    if (!targetUser) {
      return { success: false, error: 'User not found or unauthorized' };
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        employmentType: data.employmentType,
        skills: data.skills,
        equipmentList: data.equipmentList !== undefined ? data.equipmentList : undefined,
        rating: data.rating !== undefined ? data.rating : undefined,
        address: data.address !== undefined ? data.address : undefined,
        companyName: data.companyName !== undefined ? data.companyName : undefined,
      },
    });

    revalidatePath('/settings/team');
    revalidatePath('/users');

    return { success: true, data: serializePrisma(updated) };
  } catch (error: any) {
    console.error('[UPDATE_EMPLOYMENT_ERROR]', error);
    return { success: false, error: error.message || 'Failed to update employment details' };
  }
}
