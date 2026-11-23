import { FollowUpRepository } from '@/repositories/follow-up.repository';
import { RoleService } from './role.service';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { getActiveContext } from '@/lib/context';
import { Prisma, FollowUpType, FollowUpStatus, FollowUpOutcome, Priority, ReminderStatus } from '@prisma/client';
import { z } from 'zod';
import { serializePrisma } from '@/lib/serialize';

const CreateFollowUpSchema = z.object({
  leadId: z.string().uuid(),
  assignedToId: z.string().uuid().optional().nullable(),
  type: z.nativeEnum(FollowUpType),
  followUpDate: z.coerce.date(),
  reminderDate: z.coerce.date().optional().nullable(),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  notes: z.string().optional().nullable(),
});

const UpdateFollowUpSchema = z.object({
  assignedToId: z.string().uuid().optional().nullable(),
  type: z.nativeEnum(FollowUpType).optional(),
  status: z.nativeEnum(FollowUpStatus).optional(),
  followUpDate: z.coerce.date().optional(),
  reminderDate: z.coerce.date().optional().nullable(),
  priority: z.nativeEnum(Priority).optional(),
  notes: z.string().optional().nullable(),
  outcome: z.string().optional().nullable(),
  nextFollowUpDate: z.coerce.date().optional().nullable(),
  completedAt: z.coerce.date().optional().nullable(),
});

const AUDIT_ACTIONS = {
  CREATED: 'FOLLOW_UP_CREATED',
  UPDATED: 'FOLLOW_UP_UPDATED',
  DELETED: 'FOLLOW_UP_DELETED',
  COMPLETED: 'FOLLOW_UP_COMPLETED',
};

export class FollowUpService {
  static async validateSession() {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.tenantId) throw new Error("Unauthorized");
    
    const context = await getActiveContext();
    if (!context?.activeBranch?.id) throw new Error("No active branch selected");

    return {
      tenantId: user.tenantId,
      userId: user.id,
      branchId: context.activeBranch.id
    };
  }

  static async logAction(tx: Prisma.TransactionClient, tenantId: string, userId: string, leadId: string, followUpId: string, action: string, notes?: string, oldValues?: any, newValues?: any) {
    await tx.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'FOLLOW_UP',
        entityId: followUpId,
        action,
        oldValues: oldValues ? JSON.parse(JSON.stringify(oldValues)) : undefined,
        newValues: newValues ? JSON.parse(JSON.stringify(newValues)) : undefined,
      }
    });

    // Record activity against the Lead, as follow-ups are sub-entities of a lead in context
    await tx.activityTimeline.create({
      data: {
        tenantId,
        entityType: 'LEAD',
        entityId: leadId,
        action,
        notes,
        createdById: userId,
      }
    });
  }

  static async findAll(filters?: any) {
    const { tenantId, branchId, userId } = await this.validateSession();
    const hasPerm = await RoleService.hasPermission(userId, 'FOLLOW_UP', 'READ', branchId);
    if (!hasPerm) throw new Error("Permission denied");
    
    const followUps = await FollowUpRepository.findAll(tenantId, branchId, filters);
    return serializePrisma(followUps);
  }

  static async getPendingFollowUps(filters?: any) {
    const { tenantId, branchId, userId } = await this.validateSession();
    const hasPerm = await RoleService.hasPermission(userId, 'FOLLOW_UP', 'READ', branchId);
    if (!hasPerm) {
      const hasLeadPerm = await RoleService.hasPermission(userId, 'LEAD', 'READ', branchId);
      if (!hasLeadPerm) throw new Error("Permission denied");
    }

    const followUps = await FollowUpRepository.findPending(tenantId, branchId, filters);
    return serializePrisma(followUps);
  }

  static async findByLeadId(leadId: string) {
    const { tenantId, branchId, userId } = await this.validateSession();
    const hasPerm = await RoleService.hasPermission(userId, 'FOLLOW_UP', 'READ', branchId);
    // Alternatively, if they have LEAD READ permission, they can read follow-ups
    if (!hasPerm) {
      const hasLeadPerm = await RoleService.hasPermission(userId, 'LEAD', 'READ', branchId);
      if (!hasLeadPerm) throw new Error("Permission denied");
    }
    
    const followUps = await FollowUpRepository.findByLeadId(tenantId, leadId);
    return serializePrisma(followUps);
  }

  static async create(payload: any) {
    const { tenantId, userId, branchId } = await this.validateSession();
    
    const hasPerm = await RoleService.hasPermission(userId, 'FOLLOW_UP', 'CREATE', branchId);
    if (!hasPerm) throw new Error("Permission denied");

    const data = CreateFollowUpSchema.parse(payload);

    return prisma.$transaction(async (tx) => {
      const lead = await tx.lead.findUnique({ where: { id: data.leadId, tenantId } });
      if (!lead) throw new Error("Lead not found");

      const followUp = await FollowUpRepository.create(tx, {
        tenantId,
        branchId,
        leadId: data.leadId,
        assignedToId: data.assignedToId,
        type: data.type,
        status: FollowUpStatus.PENDING,
        followUpDate: data.followUpDate,
        reminderDate: data.reminderDate,
        reminderStatus: data.reminderDate ? ReminderStatus.PENDING : null,
        priority: data.priority,
        notes: data.notes,
        createdById: userId,
      });

      await this.logAction(
        tx, tenantId, userId, lead.id, followUp.id, AUDIT_ACTIONS.CREATED, 
        `Scheduled ${data.type} follow-up for ${data.followUpDate.toLocaleDateString()}`, 
        null, followUp
      );

      return followUp;
    });
  }

  static async update(id: string, payload: any) {
    const { tenantId, userId, branchId } = await this.validateSession();
    
    const hasPerm = await RoleService.hasPermission(userId, 'FOLLOW_UP', 'UPDATE', branchId);
    if (!hasPerm) {
      const hasLeadPerm = await RoleService.hasPermission(userId, 'LEAD', 'UPDATE', branchId);
      if (!hasLeadPerm) throw new Error("Permission denied");
    }

    const data = UpdateFollowUpSchema.parse(payload);

    return prisma.$transaction(async (tx) => {
      const old = await FollowUpRepository.findById(tenantId, id);
      if (!old) throw new Error("FollowUp not found");

      // Handle reminder status
      let reminderStatus = old.reminderStatus;
      if (data.reminderDate && data.reminderDate !== old.reminderDate) {
        reminderStatus = ReminderStatus.PENDING;
      } else if (data.reminderDate === null) {
        reminderStatus = null;
      }

      // Automatically set completedAt if changing to COMPLETED
      let completedAt = data.completedAt;
      if (data.status === FollowUpStatus.COMPLETED && !completedAt && !old.completedAt) {
        completedAt = new Date();
      }

      const updated = await FollowUpRepository.update(tx, id, tenantId, {
        ...data,
        completedAt,
        reminderStatus,
        updatedById: userId,
      });

      let notes = 'Follow-up details updated.';
      if (old.status !== updated.status) {
        notes = `Follow-up status changed from ${old.status} to ${updated.status}.`;
        if (updated.outcome) {
          notes += ` Outcome: ${updated.outcome}`;
        }
      }

      await this.logAction(
        tx, 
        tenantId, 
        userId, 
        old.leadId, 
        updated.id, 
        updated.status === FollowUpStatus.COMPLETED ? AUDIT_ACTIONS.COMPLETED : AUDIT_ACTIONS.UPDATED, 
        notes, 
        old, 
        updated
      );
      return serializePrisma(updated);
    });
  }

  static async markCompleted(id: string, outcome?: string | null, notes?: string | null) {
    const { tenantId, userId, branchId } = await this.validateSession();
    
    const hasPerm = await RoleService.hasPermission(userId, 'FOLLOW_UP', 'UPDATE', branchId);
    if (!hasPerm) {
      const hasLeadPerm = await RoleService.hasPermission(userId, 'LEAD', 'UPDATE', branchId);
      if (!hasLeadPerm) throw new Error("Permission denied");
    }

    return prisma.$transaction(async (tx) => {
      const old = await FollowUpRepository.findById(tenantId, id);
      if (!old) throw new Error("FollowUp not found");

      const completedAt = new Date();

      const updated = await FollowUpRepository.update(tx, id, tenantId, {
        status: FollowUpStatus.COMPLETED,
        completedAt,
        outcome: outcome ?? old.outcome,
        notes: notes ? (old.notes ? `${old.notes}\n${notes}` : notes) : old.notes,
        reminderStatus: null,
        updatedById: userId,
      });

      const auditNotes = `Follow-up marked as completed on ${completedAt.toLocaleDateString()}.${outcome ? ` Outcome: ${outcome}.` : ''}${notes ? ` Notes: ${notes}` : ''}`;

      await this.logAction(
        tx, 
        tenantId, 
        userId, 
        old.leadId, 
        updated.id, 
        AUDIT_ACTIONS.COMPLETED, 
        auditNotes, 
        old, 
        updated
      );

      return serializePrisma(updated);
    });
  }

  static async softDelete(id: string) {
    const { tenantId, userId, branchId } = await this.validateSession();
    
    const hasPerm = await RoleService.hasPermission(userId, 'FOLLOW_UP', 'DELETE', branchId);
    if (!hasPerm) throw new Error("Permission denied");

    return prisma.$transaction(async (tx) => {
      const old = await FollowUpRepository.findById(tenantId, id);
      if (!old) throw new Error("FollowUp not found");

      const deleted = await FollowUpRepository.softDelete(tx, tenantId, id, userId);

      await this.logAction(tx, tenantId, userId, old.leadId, deleted.id, AUDIT_ACTIONS.DELETED, 'Follow-up was deleted.', old, null);
      return true;
    });
  }
}
