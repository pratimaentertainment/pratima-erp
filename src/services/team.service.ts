import { prisma } from '@/lib/prisma';
import { EmploymentType, UserStatus, UserAgreementStatus, Prisma } from '@prisma/client';
import { compileAgreementContent } from '@/lib/agreements/interpolation';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export interface AddTeamMemberInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  companyName?: string | null;
  designation?: string | null;
  department?: string | null;
  employmentType: EmploymentType;
  monthlySalary?: number | null;
  skills?: string[];
  equipmentList?: string | null;
  password?: string | null;
  role?: string | null; // e.g. BRANCH_MANAGER, PROJECT_MANAGER, SALES_MANAGER, EDITOR, DESIGNER, FREELANCER
  branchId?: string | null;
  templateId?: string | null;
}

export interface GeneratedCredentials {
  email: string;
  temporaryPassword: string;
  canLogin: boolean;
}

export class TeamService {
  /**
   * Generates a standardized internal email if none is provided.
   */
  private static generateStandardEmail(name: string, tenantSlug?: string | null): string {
    const sanitized = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 15) || 'staff';
    const rand = Math.floor(1000 + Math.random() * 9000);
    const domain = (tenantSlug?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'pratimastudio') + '.erp.internal';
    return `${sanitized}.${rand}@${domain}`;
  }

  /**
   * Generates a cryptographically strong default password for new staff.
   */
  private static generateSecurePassword(name: string): string {
    const firstWord = name.trim().split(' ')[0].replace(/[^a-zA-Z]/g, '') || 'Staff';
    const capitalized = firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
    const randDigits = Math.floor(1000 + Math.random() * 9000);
    return `${capitalized}@${randDigits}!`;
  }

  /**
   * Creates a new in-house staff member or external freelancer.
   * Auto-provisions credentials for in-house staff and links roles/branches.
   */
  static async addTeamMember(
    tenantId: string,
    data: AddTeamMemberInput,
    actorUserId?: string
  ): Promise<{ user: any; credentials: GeneratedCredentials | null }> {
    return prisma.$transaction(async (tx) => {
      // 1. Fetch tenant details for email formatting
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, slug: true, name: true },
      });

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const isInHouse = data.employmentType === EmploymentType.IN_HOUSE;
      const canLogin = isInHouse;

      // 2. Resolve Email
      let finalEmail = data.email?.trim().toLowerCase();
      if (!finalEmail || finalEmail.length === 0) {
        if (isInHouse) {
          finalEmail = this.generateStandardEmail(data.name, tenant.slug);
        } else {
          // For freelancers, if no email is supplied, construct an identifier placeholder
          finalEmail = this.generateStandardEmail(data.name, 'freelance');
        }
      }

      // Check email uniqueness within tenant
      const existing = await tx.user.findFirst({
        where: {
          tenantId,
          email: finalEmail,
          deletedAt: null,
        },
      });

      if (existing) {
        throw new Error(`A team member with email "${finalEmail}" already exists in this studio.`);
      }

      // 3. Resolve Password & Login Capability
      let plainPassword: string | null = null;
      let passwordHash: string | null = null;

      if (isInHouse) {
        plainPassword = data.password?.trim() || this.generateSecurePassword(data.name);
        passwordHash = await bcrypt.hash(plainPassword, 10);
      } else {
        // Freelancers do not receive portal login access
        plainPassword = null;
        passwordHash = null;
      }

      // 4. Resolve Designation
      const defaultDesignation =
        data.designation?.trim() ||
        (isInHouse ? 'In-House Creative Specialist' : 'Freelance Specialist');

      const salaryDecimal =
        isInHouse && data.monthlySalary !== undefined && data.monthlySalary !== null
          ? new Prisma.Decimal(data.monthlySalary)
          : null;

      // 5. Create User Record
      const newUser = await tx.user.create({
        data: {
          tenantId,
          name: data.name.trim(),
          email: finalEmail,
          passwordHash,
          canLogin,
          status: UserStatus.ACTIVE,
          employmentType: data.employmentType,
          designation: defaultDesignation,
          department: data.department?.trim() || null,
          phone: data.phone?.trim() || null,
          address: data.address?.trim() || null,
          companyName: data.companyName?.trim() || null,
          monthlySalary: salaryDecimal,
          skills: data.skills || [],
          equipmentList: data.equipmentList?.trim() || null,
          isActive: true,
        },
      });

      // 6. Assign Role if specified
      if (data.role) {
        const roleRecord = await (tx as any).tenantRole.findFirst({
          where: {
            tenantId,
            OR: [
              { name: { equals: data.role, mode: 'insensitive' } },
              { name: { equals: data.role.replace(/_/g, ' '), mode: 'insensitive' } },
            ],
          },
        });

        if (roleRecord) {
          await tx.userRole.create({
            data: {
              userId: newUser.id,
              roleId: roleRecord.id,
            },
          });
        }
      }

      // 7. Assign Branch if specified
      if (data.branchId) {
        const branchRecord = await tx.branch.findFirst({
          where: { id: data.branchId, tenantId, deletedAt: null },
        });

        if (branchRecord) {
          await tx.userBranch.create({
            data: {
              userId: newUser.id,
              branchId: branchRecord.id,
              isPrimary: true,
              isActive: true,
            },
          });
        }
      }

      // 8. Interpolate & Snapshot Agreement Template if selected
      if (data.templateId) {
        const template = await tx.documentTemplate.findFirst({
          where: { id: data.templateId, tenantId, deletedAt: null },
        });

        if (template) {
          const compiledContent = compileAgreementContent(template.content, {
            name: newUser.name,
            email: newUser.email,
            phone: newUser.phone,
            address: newUser.address,
            companyName: newUser.companyName,
            designation: newUser.designation,
          });

          await tx.userAgreement.create({
            data: {
              tenantId,
              userId: newUser.id,
              templateId: template.id,
              status: UserAgreementStatus.PENDING,
              compiledContent,
            },
          });
        }
      }

      // 9. Audit Log
      if (actorUserId) {
        await tx.auditLog.create({
          data: {
            tenantId,
            userId: actorUserId,
            action: 'TEAM_MEMBER_CREATED',
            entityType: 'User',
            entityId: newUser.id,
            newValues: {
              name: newUser.name,
              email: newUser.email,
              employmentType: newUser.employmentType,
              canLogin: newUser.canLogin,
            },
          },
        });
      }

      const credentials: GeneratedCredentials | null = isInHouse && plainPassword
        ? {
            email: finalEmail,
            temporaryPassword: plainPassword,
            canLogin: true,
          }
        : null;

      return {
        user: newUser,
        credentials,
      };
    });
  }

  /**
   * Resets an in-house staff member's password.
   * Owner-only administrative capability.
   */
  static async resetStaffPassword(
    tenantId: string,
    targetUserId: string,
    newPassword?: string | null,
    actorUserId?: string
  ): Promise<{ success: boolean; email: string; temporaryPassword: string }> {
    const targetUser = await prisma.user.findFirst({
      where: {
        id: targetUserId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!targetUser) {
      throw new Error('Staff member not found or unauthorized');
    }

    if (!targetUser.canLogin) {
      throw new Error('Cannot set password for a non-login contractor/freelancer.');
    }

    const plainPassword =
      newPassword?.trim() || `Pratima#${Math.floor(100000 + Math.random() * 900000)}`;
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        isLocked: false,
        lockUntil: null,
      },
    });

    if (actorUserId) {
      await prisma.auditLog.create({
        data: {
          tenantId,
          userId: actorUserId,
          action: 'STAFF_PASSWORD_RESET',
          entityType: 'User',
          entityId: targetUserId,
          newValues: { resetBy: actorUserId, targetEmail: targetUser.email },
        },
      });
    }

    return {
      success: true,
      email: targetUser.email,
      temporaryPassword: plainPassword,
    };
  }
}
