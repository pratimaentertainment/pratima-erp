'use server';

import crypto from 'crypto';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { serializePrisma } from '@/lib/serialize';
import { formatDate, formatDateTime } from '@/lib/date';
import { TaskStatus, WorkflowType, Prisma } from '@prisma/client';
import { z } from 'zod';

/**
 * Validates active tenant user session and retrieves user & tenant context.
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
// ZOD VALIDATION SCHEMAS
// -----------------------------------------------------------------------------

const assignVideoTaskSchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
  editorId: z.string().uuid('Invalid editor ID').nullable().optional(),
  isFreelancer: z.boolean().optional(),
  freelancerName: z.string().optional().nullable(),
  freelancerPhone: z.string().optional().nullable(),
  assetsUrl: z.string().url('Invalid Asset URL').or(z.string().length(0)).nullable().optional(),
  previewUrl: z.string().url('Invalid Preview URL').or(z.string().length(0)).nullable().optional(),
  deliveryUrl: z.string().url('Invalid Delivery URL').or(z.string().length(0)).nullable().optional(),
  directorNotes: z.string().optional().nullable(),
  referenceLinks: z.array(z.string().url('Invalid Reference URL')).optional().default([]),
  dueDate: z.string().nullable().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  allowFullDataAccess: z.boolean().optional(),
});

const submitVideoForReviewSchema = z
  .object({
    taskId: z.string().uuid('Invalid task ID').optional(),
    editorToken: z.string().uuid('Invalid Editor Token').optional(),
    previewUrl: z.string().url('A valid preview video URL (Vimeo, Frame.io, Drive, YouTube Unlisted) is required'),
    notes: z.string().optional().nullable(),
  })
  .refine((data) => data.taskId || data.editorToken, {
    message: 'Either taskId (for in-house editors) or editorToken (for external freelancers) must be provided.',
  });

const clientReviewVideoSchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
  isApproved: z.boolean(),
  feedbackNotes: z.string().optional().nullable(),
  finalDeliveryUrl: z.string().url('Invalid Delivery URL').or(z.string().length(0)).nullable().optional(),
});

const updateVideoTaskStatusSchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
  status: z.nativeEnum(TaskStatus),
  previewUrl: z.string().url('Invalid Preview URL').or(z.string().length(0)).nullable().optional(),
  deliveryUrl: z.string().url('Invalid Delivery URL').or(z.string().length(0)).nullable().optional(),
  notes: z.string().optional().nullable(),
  clientFeedback: z.string().optional().nullable(),
  incrementRevisions: z.boolean().optional().default(false),
});

const createVideoDeliverableTaskSchema = z.object({
  bookingId: z.string().uuid('Invalid Booking ID'),
  taskType: z.string().min(2, 'Task title/cut name is required'),
  type: z.nativeEnum(WorkflowType).default(WorkflowType.VIDEO_EDITING),
  assignedEditorId: z.string().uuid().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  assetsUrl: z.string().url('Invalid Asset URL').or(z.string().length(0)).nullable().optional(),
  directorNotes: z.string().optional().nullable(),
  referenceLinks: z.array(z.string()).optional().default([]),
});

// -----------------------------------------------------------------------------
// SERVER ACTIONS
// -----------------------------------------------------------------------------

/**
 * 1. Assigns a video deliverable task to an in-house editor or external freelancer.
 * Implements the "Magic Link" strategy for freelancers to eliminate ERP user account bloat.
 * Strictly separates raw assets from client review media and formats a WhatsApp brief.
 */
export async function assignVideoTaskAction(input: z.infer<typeof assignVideoTaskSchema>) {
  try {
    const { tenantId } = await validateSession();
    const validated = assignVideoTaskSchema.parse(input);

    // 1. Fetch task and ensure tenant ownership
    const task = await prisma.workflowTask.findFirst({
      where: { id: validated.taskId, tenantId },
      include: {
        eventBooking: {
          include: {
            customer: true,
            tenant: true,
            dataIngestionJobs: {
              where: { deletedAt: null },
              select: { primaryStoragePath: true, totalSizeGb: true, status: true },
            },
          },
        },
        user: true,
      },
    });

    if (!task) {
      return { success: false, error: 'Video deliverable task not found or unauthorized.' };
    }

    // 2. Resolve editor user if assigned
    let editorUser = task.user;
    if (validated.editorId) {
      editorUser = await prisma.user.findFirst({
        where: { id: validated.editorId, tenantId, deletedAt: null },
      });
    }

    // 3. Determine if external freelancer or magic link needed
    const isFreelanceAssignment =
      validated.isFreelancer ||
      Boolean(validated.freelancerPhone) ||
      editorUser?.employmentType === 'FREELANCE' ||
      (!validated.editorId && !task.assignedTo);

    const editorToken = isFreelanceAssignment
      ? task.editorToken || crypto.randomUUID()
      : task.editorToken;

    const parsedDueDate = validated.dueDate ? new Date(validated.dueDate) : task.dueDate;
    const cleanAssetsUrl = validated.assetsUrl?.trim() || null;
    const cleanPreviewUrl = validated.previewUrl?.trim() || null;
    const cleanDeliveryUrl = validated.deliveryUrl?.trim() || null;
    const cleanDirectorNotes = validated.directorNotes?.trim() || null;

    // Filter valid reference links
    const validReferenceLinks = (validated.referenceLinks || [])
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    // 4. Update the WorkflowTask record
    const updatedTask = await prisma.workflowTask.update({
      where: { id: task.id },
      data: {
        assignedTo: validated.editorId !== undefined ? validated.editorId : task.assignedTo,
        editorToken,
        dueDate: parsedDueDate,
        assetsUrl: cleanAssetsUrl,
        previewUrl: cleanPreviewUrl,
        deliveryUrl: cleanDeliveryUrl,
        directorNotes: cleanDirectorNotes,
        referenceLinks: validReferenceLinks.length > 0 ? validReferenceLinks : task.referenceLinks,
        allowFullDataAccess:
          validated.allowFullDataAccess !== undefined
            ? validated.allowFullDataAccess
            : task.allowFullDataAccess,
        status: validated.status || (validated.editorId ? TaskStatus.IN_PROGRESS : task.status),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            designation: true,
            employmentType: true,
          },
        },
        eventBooking: {
          select: {
            id: true,
            title: true,
            bookingNumber: true,
            startDate: true,
          },
        },
      },
    });

    // 5. Construct Director's WhatsApp Creative Brief
    const studioName =
      task.eventBooking?.tenant?.tradeName ||
      task.eventBooking?.tenant?.companyLegalName ||
      task.eventBooking?.tenant?.name ||
      'Pratima Photography & Cinematography';

    const bookingTitle = task.eventBooking?.title || 'Wedding Project';
    const bookingCode = task.eventBooking?.bookingNumber || 'BK';
    const shootDateStr = formatDate(task.eventBooking?.startDate, 'dd MMMM yyyy');
    const dueDateStr = parsedDueDate ? formatDate(parsedDueDate, 'dd MMMM yyyy (hh:mm a)') : 'To Be Discussed';
    const editorName = validated.freelancerName || editorUser?.name || 'Creative Editor';
    const deliverableName = task.taskType || task.type.replace(/_/g, ' ');

    // Compile verified NAS primary storage hint if available (Internal only)
    const verifiedIngestion = task.eventBooking?.dataIngestionJobs?.find(
      (j) => j.status === 'VERIFIED'
    );
    const nasHint = verifiedIngestion?.primaryStoragePath
      ? `  • *Local Studio NAS:* \`${verifiedIngestion.primaryStoragePath}\` (${verifiedIngestion.totalSizeGb || 0} GB)`
      : null;

    const referenceLinksFormatted =
      validReferenceLinks.length > 0
        ? validReferenceLinks.map((link, idx) => `  ${idx + 1}. ${link}`).join('\n')
        : '  • _Director will share references in chat_';

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pratima-erp.vercel.app';
    const magicPortalUrl = editorToken ? `${appUrl}/portal/editor/${editorToken}` : null;

    const whatsappBriefMessage = `🎬 *${studioName.toUpperCase()} — VIDEO EDITING CREATIVE BRIEF*
━━━━━━━━━━━━━━━━━━━━━━━━
📌 *Project:* ${bookingTitle} (${bookingCode})
📅 *Shoot Date:* ${shootDateStr}
🎯 *Deliverable Cut:* ${deliverableName}
👤 *Assigned Editor:* ${editorName}
⏰ *Target Due Date:* ${dueDateStr}

${
  magicPortalUrl
    ? `🔑 *FREELANCER SECURE PORTAL (MAGIC LINK):*
  • ${magicPortalUrl}
  _(No login required. Submit draft render links and track feedback here)_\n`
    : ''
}📦 *RAW ASSET VAULT / DOWNLOAD LINK (CONFIDENTIAL):*
${cleanAssetsUrl ? `  • *Cloud Drive Link:* ${cleanAssetsUrl}` : '  • _Cloud link pending upload_'}${nasHint ? `\n${nasHint}` : ''}

📝 *DIRECTOR'S EDITING GUIDELINES & BRIEF:*
${cleanDirectorNotes ? cleanDirectorNotes.split('\n').map((l) => `  • ${l.trim()}`).join('\n') : '  • Maintain cinematic pacing, dual-audio sync, color grade according to brand LUTs.'}

🔗 *INSPIRATION & REFERENCE REELS:*
${referenceLinksFormatted}

⚠️ *Submission Workflow:*
  • Upload review draft link (Vimeo / Frame.io / Drive) via the Magic Link or portal.
  • Client review will be initiated automatically upon submission.
━━━━━━━━━━━━━━━━━━━━━━━━
_Generated via FRAMIQ Video Editing Pipeline_`;

    // 6. Construct Direct Click-to-Chat WhatsApp URL
    const targetPhone = validated.freelancerPhone || editorUser?.phone;
    let whatsappUrl: string | null = null;
    if (targetPhone) {
      let cleanPhone = targetPhone.replace(/\D/g, '');
      if (cleanPhone.length === 10) {
        cleanPhone = `91${cleanPhone}`;
      } else if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
        cleanPhone = `91${cleanPhone.slice(1)}`;
      }
      whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappBriefMessage)}`;
    }

    revalidatePath('/operations/post-production');
    revalidatePath('/operations');

    return {
      success: true,
      message: `Video task assigned to ${editorName}! Creative brief generated.`,
      data: serializePrisma(updatedTask),
      editorToken,
      magicPortalUrl,
      whatsappBriefMessage,
      whatsappUrl,
    };
  } catch (error: any) {
    console.error('[ASSIGN_VIDEO_TASK_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to assign video deliverable task.',
    };
  }
}

/**
 * 2. Submits a draft video render link for client review.
 * Can be called by:
 *   a) In-house editors with an authenticated ERP session (supplying `taskId`)
 *   b) External freelancers via their secure Magic Link token (supplying `editorToken` without ERP login)
 * Sets status to CLIENT_REVIEW and saves the preview link.
 */
export async function submitVideoForReviewAction(input: z.infer<typeof submitVideoForReviewSchema>) {
  try {
    const validated = submitVideoForReviewSchema.parse(input);

    let task: any = null;

    if (validated.editorToken) {
      // Freelancer Magic Link path - zero login friction
      task = await prisma.workflowTask.findFirst({
        where: {
          editorToken: validated.editorToken,
          deletedAt: null,
        },
        include: {
          eventBooking: {
            include: { customer: true, tenant: true },
          },
        },
      });

      if (!task) {
        return { success: false, error: 'Invalid or expired freelancer editor token.' };
      }
    } else if (validated.taskId) {
      // In-house editor authenticated path
      const { tenantId } = await validateSession();
      task = await prisma.workflowTask.findFirst({
        where: {
          id: validated.taskId,
          tenantId,
          deletedAt: null,
        },
        include: {
          eventBooking: {
            include: { customer: true, tenant: true },
          },
        },
      });

      if (!task) {
        return { success: false, error: 'Task not found or unauthorized.' };
      }
    }

    const cleanPreviewUrl = validated.previewUrl.trim();
    const submissionNote = validated.notes?.trim();

    const updatedTask = await prisma.workflowTask.update({
      where: { id: task.id },
      data: {
        previewUrl: cleanPreviewUrl,
        status: TaskStatus.CLIENT_REVIEW,
        notes: submissionNote
          ? `${task.notes ? `${task.notes}\n` : ''}[${formatDate(new Date(), 'dd MMM yyyy')}] Draft Render Submitted: ${submissionNote}`
          : task.notes,
      },
      include: {
        eventBooking: {
          select: {
            id: true,
            title: true,
            bookingNumber: true,
            customer: {
              select: { firstName: true, lastName: true, phone: true },
            },
          },
        },
      },
    });

    revalidatePath('/operations/post-production');
    revalidatePath('/operations');
    revalidatePath('/portal');

    return {
      success: true,
      message: 'Draft video preview submitted for client review!',
      data: serializePrisma(updatedTask),
    };
  } catch (error: any) {
    console.error('[SUBMIT_VIDEO_REVIEW_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to submit video draft for review.',
    };
  }
}

/**
 * 3. Client Review & Approval Loop:
 * Triggered from the Client Portal (or by studio manager on behalf of the client).
 *   - If Approved: sets status to APPROVED, updates deliveryUrl if provided.
 *   - If Rejected: sets status to CHANGES_REQUESTED, logs clientFeedback, and increments revisionsCount.
 */
export async function clientReviewVideoAction(input: z.infer<typeof clientReviewVideoSchema>) {
  try {
    const validated = clientReviewVideoSchema.parse(input);

    // Verify session (supports either tenant admin or portal user session)
    const session = await auth();
    const user = session?.user as any;
    if (!user) {
      return { success: false, error: 'Unauthorized: Session required for client review action.' };
    }

    const task = await prisma.workflowTask.findFirst({
      where: {
        id: validated.taskId,
        deletedAt: null,
      },
      include: {
        eventBooking: {
          include: { customer: true },
        },
      },
    });

    if (!task) {
      return { success: false, error: 'Deliverable task not found.' };
    }

    // Strict Multi-Tenant & Customer Ownership Authorization Check
    const isStaffAuthorized = Boolean(user.tenantId && task.tenantId === user.tenantId);
    const isClientAuthorized = Boolean(
      (user.customerId && task.eventBooking?.customerId === user.customerId) ||
      (user.id && task.eventBooking?.customerId === user.id) ||
      (user.portalAccessCode && task.eventBooking?.customer?.portalAccessCode === user.portalAccessCode)
    );

    if (!isStaffAuthorized && !isClientAuthorized) {
      return { success: false, error: 'Unauthorized: Access to this deliverable task is restricted.' };
    }

    if (validated.isApproved) {
      // APPROVED
      const updated = await prisma.workflowTask.update({
        where: { id: task.id },
        data: {
          status: TaskStatus.APPROVED,
          deliveryUrl: validated.finalDeliveryUrl?.trim() || task.deliveryUrl || task.previewUrl,
          clientFeedback: null,
          notes: `${task.notes ? `${task.notes}\n` : ''}[${formatDate(new Date(), 'dd MMM yyyy')} - Client Approval]: Approved${validated.feedbackNotes ? ` - "${validated.feedbackNotes.trim()}"` : ''}`,
        },
        include: {
          eventBooking: true,
          user: true,
        },
      });

      revalidatePath('/portal');
      revalidatePath('/operations/post-production');
      revalidatePath('/operations');

      return {
        success: true,
        message: 'Video deliverable has been successfully approved by the client!',
        data: serializePrisma(updated),
      };
    } else {
      // CHANGES_REQUESTED
      const feedbackNotes = validated.feedbackNotes?.trim() || 'Client requested revisions.';

      const updated = await prisma.workflowTask.update({
        where: { id: task.id },
        data: {
          status: TaskStatus.CHANGES_REQUESTED,
          clientFeedback: feedbackNotes,
          revisionsCount: { increment: 1 },
          notes: `${task.notes ? `${task.notes}\n` : ''}[${formatDate(new Date(), 'dd MMM yyyy')} - Revisions Requested (Cycle #${task.revisionsCount + 1})]: ${feedbackNotes}`,
        },
        include: {
          eventBooking: true,
          user: true,
        },
      });

      revalidatePath('/portal');
      revalidatePath('/operations/post-production');
      revalidatePath('/operations');

      return {
        success: true,
        message: `Revision cycle #${task.revisionsCount + 1} logged. Editor will be notified of changes requested.`,
        data: serializePrisma(updated),
      };
    }
  } catch (error: any) {
    console.error('[CLIENT_REVIEW_VIDEO_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to process client review decision.',
    };
  }
}

/**
 * 4. Secure Read-Only Task Fetcher for Freelancer Magic Link Portal:
 * Allows an external editor to fetch deliverable specifications, raw asset vault links,
 * director notes, and client feedback WITHOUT requiring an ERP login or exposing financial data.
 */
export async function getEditorPortalTaskAction(editorToken: string) {
  try {
    if (!editorToken || typeof editorToken !== 'string') {
      return { success: false, error: 'A valid editor token is required.' };
    }

    const task = await prisma.workflowTask.findFirst({
      where: {
        editorToken,
        deletedAt: null,
      },
      select: {
        id: true,
        editorToken: true,
        type: true,
        taskType: true,
        status: true,
        dueDate: true,
        assetsUrl: true,
        previewUrl: true,
        deliveryUrl: true,
        directorNotes: true,
        clientFeedback: true,
        referenceLinks: true,
        revisionsCount: true,
        allowFullDataAccess: true,
        createdAt: true,
        updatedAt: true,
        eventBooking: {
          select: {
            title: true,
            bookingNumber: true,
            startDate: true,
            location: true,
            tenant: {
              select: {
                tradeName: true,
                companyLegalName: true,
                name: true,
                phone: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      return { success: false, error: 'No active video task found for this magic link.' };
    }

    return {
      success: true,
      data: serializePrisma(task),
    };
  } catch (error: any) {
    console.error('[GET_EDITOR_PORTAL_TASK_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to retrieve editor portal task.',
    };
  }
}

/**
 * 5. Fetches the complete Video Editing Kanban board data for the tenant:
 * Queries all video deliverable tasks with booking info, assigned editor,
 * data ingestion storage paths, and status counts.
 */
export async function getVideoPipelineBoardAction() {
  try {
    const { tenantId } = await validateSession();

    const videoTypes = [
      WorkflowType.VIDEO_EDITING,
      WorkflowType.TEASER_REEL,
      WorkflowType.CINEMATIC_FILM,
      WorkflowType.COLOR_GRADING,
      WorkflowType.RAW_INGEST,
    ];

    const [tasks, editors, activeBookings] = await Promise.all([
      // Tasks for the Kanban board
      prisma.workflowTask.findMany({
        where: {
          tenantId,
          deletedAt: null,
          OR: [
            { type: { in: videoTypes } },
            { taskType: { contains: 'VIDEO', mode: 'insensitive' } },
            { taskType: { contains: 'TEASER', mode: 'insensitive' } },
            { taskType: { contains: 'FILM', mode: 'insensitive' } },
            { taskType: { contains: 'REEL', mode: 'insensitive' } },
          ],
        },
        include: {
          eventBooking: {
            select: {
              id: true,
              bookingNumber: true,
              title: true,
              startDate: true,
              location: true,
              customer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
              dataIngestionJobs: {
                where: { deletedAt: null },
                select: {
                  id: true,
                  status: true,
                  primaryStoragePath: true,
                  backupStoragePath: true,
                  totalSizeGb: true,
                },
                take: 2,
              },
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              designation: true,
              employmentType: true,
            },
          },
          postProductionJob: {
            select: {
              id: true,
              cloudFolderLink: true,
              status: true,
            },
          },
        },
        orderBy: [{ dueDate: 'asc' }, { updatedAt: 'desc' }],
      }),

      // Editors list
      prisma.user.findMany({
        where: {
          tenantId,
          deletedAt: null,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          designation: true,
          employmentType: true,
          skills: true,
        },
        orderBy: { name: 'asc' },
      }),

      // Active event bookings for deliverable creation
      prisma.eventBooking.findMany({
        where: {
          tenantId,
          deletedAt: null,
          status: { in: ['CONFIRMED', 'COMPLETED'] },
        },
        select: {
          id: true,
          bookingNumber: true,
          title: true,
          startDate: true,
          postProductionJob: { select: { id: true } },
        },
        orderBy: { startDate: 'desc' },
        take: 40,
      }),
    ]);

    return {
      success: true,
      data: serializePrisma({
        tasks,
        editors,
        activeBookings,
      }),
    };
  } catch (error: any) {
    console.error('[GET_VIDEO_PIPELINE_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to fetch video editing pipeline data.',
    };
  }
}

/**
 * 6. Updates a video deliverable task's status directly from the Kanban board.
 */
export async function updateVideoTaskStatusAction(input: z.infer<typeof updateVideoTaskStatusSchema>) {
  try {
    const { tenantId } = await validateSession();
    const validated = updateVideoTaskStatusSchema.parse(input);

    const task = await prisma.workflowTask.findFirst({
      where: { id: validated.taskId, tenantId },
    });

    if (!task) {
      return { success: false, error: 'Task not found or unauthorized.' };
    }

    const isRevision =
      validated.status === TaskStatus.CHANGES_REQUESTED || validated.incrementRevisions;

    const updated = await prisma.workflowTask.update({
      where: { id: task.id },
      data: {
        status: validated.status,
        previewUrl: validated.previewUrl?.trim() || task.previewUrl,
        deliveryUrl: validated.deliveryUrl?.trim() || task.deliveryUrl,
        clientFeedback: validated.clientFeedback?.trim() || task.clientFeedback,
        revisionsCount: isRevision ? { increment: 1 } : undefined,
        notes: validated.notes?.trim()
          ? `${task.notes ? `${task.notes}\n` : ''}[${validated.status}]: ${validated.notes.trim()}`
          : task.notes,
      },
      include: {
        user: true,
        eventBooking: true,
      },
    });

    revalidatePath('/operations/post-production');
    revalidatePath('/operations');

    return {
      success: true,
      message: `Task advanced to ${validated.status}${isRevision ? ' (Revision count incremented)' : ''}.`,
      data: serializePrisma(updated),
    };
  } catch (error: any) {
    console.error('[UPDATE_VIDEO_TASK_STATUS_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to update video task status.',
    };
  }
}

/**
 * 7. Creates a custom video deliverable cut for a project (e.g. Save the Date, 60s Reel, Full Cut).
 */
export async function createVideoDeliverableTaskAction(input: z.infer<typeof createVideoDeliverableTaskSchema>) {
  try {
    const { tenantId } = await validateSession();
    const validated = createVideoDeliverableTaskSchema.parse(input);

    // Verify booking
    const booking = await prisma.eventBooking.findFirst({
      where: { id: validated.bookingId, tenantId, deletedAt: null },
      include: { postProductionJob: true },
    });

    if (!booking) {
      return { success: false, error: 'Target event booking not found or unauthorized.' };
    }

    const parsedDueDate = validated.dueDate ? new Date(validated.dueDate) : null;
    const cleanAssetsUrl = validated.assetsUrl?.trim() || null;
    const cleanDirectorNotes = validated.directorNotes?.trim() || null;
    const cleanReferences = (validated.referenceLinks || []).map((l) => l.trim()).filter(Boolean);

    const task = await prisma.workflowTask.create({
      data: {
        tenantId,
        eventBookingId: booking.id,
        jobId: booking.postProductionJob?.id || null,
        type: validated.type,
        taskType: validated.taskType.trim(),
        status: validated.assignedEditorId ? TaskStatus.IN_PROGRESS : TaskStatus.TODO,
        assignedTo: validated.assignedEditorId || null,
        dueDate: parsedDueDate,
        assetsUrl: cleanAssetsUrl,
        directorNotes: cleanDirectorNotes,
        referenceLinks: cleanReferences,
      },
      include: {
        user: true,
        eventBooking: true,
      },
    });

    revalidatePath('/operations/post-production');
    revalidatePath('/operations');

    return {
      success: true,
      message: `Created video deliverable cut "${task.taskType}"!`,
      data: serializePrisma(task),
    };
  } catch (error: any) {
    console.error('[CREATE_VIDEO_TASK_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to create video deliverable task.',
    };
  }
}
