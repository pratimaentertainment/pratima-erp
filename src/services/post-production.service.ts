import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { getActiveContext } from '@/lib/context';
import { serializePrisma } from '@/lib/serialize';
import {
  PostProductionStatus,
  TaskStatus,
  WorkflowType,
  JourneyStatus,
  SelectionStatus,
  Prisma,
} from '@prisma/client';

export interface AssignDeliverableTaskParams {
  jobId: string;
  assignedEditorId?: string | null;
  taskType: string;
  type?: WorkflowType;
  dueDate?: Date | string | null;
  notes?: string;
  tenantId?: string;
}

export interface UpdateDeliverableTaskParams {
  taskId: string;
  status: TaskStatus;
  notes?: string;
  tenantId?: string;
}

export interface UpdateJobStatusParams {
  jobId: string;
  status: PostProductionStatus;
  cloudFolderLink?: string | null;
  notes?: string;
  tenantId?: string;
}

export interface SubmitClientSelectionParams {
  jobId?: string;
  bookingId?: string;
  accessCode?: string;
  photoNames: string;
  clientNotes?: string;
  tenantId?: string;
}

export class PostProductionService {
  /**
   * Resolves active user session and tenant context.
   */
  private static async resolveSession(overrides?: { tenantId?: string }) {
    if (overrides?.tenantId) {
      return {
        tenantId: overrides.tenantId,
        userId: 'system',
      };
    }

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

  /**
   * Map post-production status to client journey tracker status
   */
  public static mapPostProdToJourneyStatus(status: PostProductionStatus): JourneyStatus {
    switch (status) {
      case PostProductionStatus.PENDING:
        return JourneyStatus.SHOOT_COMPLETED;
      case PostProductionStatus.DATA_DUMPED:
        return JourneyStatus.SHOOT_COMPLETED;
      case PostProductionStatus.CLIENT_SELECTION:
        return JourneyStatus.SELECTION_PENDING;
      case PostProductionStatus.EDITING:
        return JourneyStatus.EDITING_IN_PROGRESS;
      case PostProductionStatus.REVIEW:
        return JourneyStatus.ALBUM_PRINTING;
      case PostProductionStatus.DELIVERED:
        return JourneyStatus.DELIVERED;
      default:
        return JourneyStatus.SHOOT_COMPLETED;
    }
  }

  /**
   * Initializes a post-production job for an EventBooking once an event wraps up or is confirmed.
   * Also provisions a ClientSelection record and auto-seeds initial tasks if requested.
   */
  static async initializePostProductionJob(bookingId: string, tenantIdOverride?: string) {
    const { tenantId, userId } = await this.resolveSession({ tenantId: tenantIdOverride });

    if (!bookingId) throw new Error('Booking ID is required');

    // 1. Fetch EventBooking
    const booking = await prisma.eventBooking.findFirst({
      where: { id: bookingId, tenantId, deletedAt: null },
      include: {
        customer: true,
        postProductionJob: {
          include: {
            workflowTasks: {
              include: { user: true },
            },
            clientSelection: true,
          },
        },
      },
    });

    if (!booking) {
      throw new Error('Event booking not found or unauthorized');
    }

    // If job already exists, return it
    if (booking.postProductionJob) {
      return serializePrisma(booking.postProductionJob);
    }

    // 2. Create PostProductionJob
    const job = await prisma.postProductionJob.create({
      data: {
        tenantId,
        bookingId: booking.id,
        status: PostProductionStatus.PENDING,
        notes: `Post-production initialized for booking ${booking.bookingNumber} (${booking.title}).`,
      },
    });

    // 3. Create or link 1:1 ClientSelection record
    let selection = await prisma.clientSelection.findFirst({
      where: {
        OR: [
          { jobId: job.id },
          { eventBookingId: booking.id },
        ],
      },
    });

    if (!selection) {
      selection = await prisma.clientSelection.create({
        data: {
          tenantId,
          customerId: booking.customerId,
          eventBookingId: booking.id,
          jobId: job.id,
          title: `${booking.title} - Photo Selection`,
          status: SelectionStatus.DRAFT,
          instructions: 'Please submit your selected file names (e.g. DSC_0012, DSC_0045) separated by commas for album retouching.',
        },
      });
    } else if (!selection.jobId) {
      selection = await prisma.clientSelection.update({
        where: { id: selection.id },
        data: { jobId: job.id },
      });
    }

    // 4. Pre-populate standard editing tasks
    const defaultTasks: { taskType: string; notes: string; type: WorkflowType }[] = [
      { taskType: 'RAW_INGEST_AND_DUMP', notes: 'Dump all camera cards, checksum verify & generate proxies', type: WorkflowType.RAW_INGEST },
      { taskType: 'COLOR_CORRECTION', notes: 'Master color grading and exposure balancing across all shots', type: WorkflowType.COLOR_GRADING },
      { taskType: 'HIGHLIGHT_TEASER', notes: '60-second teaser reel for social media & client preview', type: WorkflowType.TEASER_REEL },
      { taskType: 'ALBUM_DESIGN', notes: 'Photo selection curation & storybook album layout design', type: WorkflowType.ALBUM_DESIGN },
      { taskType: 'CINEMATIC_FILM', notes: 'Full cinematic event film with audio mixing', type: WorkflowType.CINEMATIC_FILM },
    ];

    await prisma.workflowTask.createMany({
      data: defaultTasks.map((t) => ({
        tenantId,
        jobId: job.id,
        eventBookingId: booking.id,
        type: t.type,
        taskType: t.taskType,
        status: TaskStatus.PENDING,
        notes: t.notes,
      })),
    });

    // 5. Sync EventBooking journey status
    await prisma.eventBooking.update({
      where: { id: booking.id },
      data: {
        journeyStatus: JourneyStatus.SHOOT_COMPLETED,
      },
    });

    // 6. Record timeline activity
    await prisma.activityTimeline.create({
      data: {
        tenantId,
        entityType: 'EVENT_BOOKING',
        entityId: booking.id,
        action: 'POST_PRODUCTION_INITIALIZED',
        notes: `Post-production job created for event ${booking.bookingNumber} (${booking.title}). Default editing pipeline seeded.`,
        metadata: {
          jobId: job.id,
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
        },
        createdById: userId !== 'system' ? userId : null,
      },
    });

    // Return full job with tasks and selection
    const fullJob = await prisma.postProductionJob.findUnique({
      where: { id: job.id },
      include: {
        booking: {
          include: {
            customer: true,
          },
        },
        workflowTasks: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                designation: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        clientSelection: true,
      },
    });

    return serializePrisma(fullJob);
  }

  /**
   * Assigns a specific deliverable task to an editor staff member with a target due date.
   */
  static async assignDeliverableTask(params: AssignDeliverableTaskParams) {
    const { tenantId, userId: actorUserId } = await this.resolveSession({ tenantId: params.tenantId });

    if (!params.jobId) throw new Error('Job ID is required');
    if (!params.taskType) throw new Error('Task type is required');

    // Verify job exists
    const job = await prisma.postProductionJob.findFirst({
      where: { id: params.jobId, tenantId, deletedAt: null },
      include: {
        booking: true,
      },
    });

    if (!job) {
      throw new Error('Post-production job not found or unauthorized');
    }

    let parsedDueDate: Date | null = null;
    if (params.dueDate) {
      const d = new Date(params.dueDate);
      if (!isNaN(d.getTime())) {
        parsedDueDate = d;
      }
    }

    let assignedEditor = null;
    if (params.assignedEditorId) {
      assignedEditor = await prisma.user.findFirst({
        where: { id: params.assignedEditorId, tenantId, deletedAt: null },
      });
      if (!assignedEditor) {
        throw new Error('Assigned editor not found or unauthorized');
      }
    }

    const task = await prisma.workflowTask.create({
      data: {
        tenantId,
        jobId: job.id,
        eventBookingId: job.bookingId,
        assignedTo: assignedEditor ? assignedEditor.id : null,
        taskType: params.taskType.trim(),
        type: params.type || WorkflowType.DELIVERABLE,
        status: TaskStatus.PENDING,
        dueDate: parsedDueDate,
        notes: params.notes?.trim() || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            designation: true,
          },
        },
      },
    });

    // Record activity
    await prisma.activityTimeline.create({
      data: {
        tenantId,
        entityType: 'EVENT_BOOKING',
        entityId: job.bookingId,
        action: 'DELIVERABLE_TASK_ASSIGNED',
        notes: `Created editing task "${task.taskType || task.type}"${assignedEditor ? ` assigned to ${assignedEditor.name}` : ''}. Due: ${parsedDueDate ? parsedDueDate.toLocaleDateString('en-GB') : 'Flexible'}.`,
        metadata: {
          jobId: job.id,
          taskId: task.id,
          taskType: task.taskType || task.type,
          assignedEditorId: task.assignedTo,
        },
        createdById: actorUserId !== 'system' ? actorUserId : null,
      },
    });

    return serializePrisma(task);
  }

  /**
   * Updates an individual deliverable task status (PENDING, IN_PROGRESS, REVIEW, COMPLETED).
   */
  static async updateTaskStatus(params: UpdateDeliverableTaskParams) {
    const { tenantId } = await this.resolveSession({ tenantId: params.tenantId });

    if (!params.taskId) throw new Error('Task ID is required');

    const task = await prisma.workflowTask.findFirst({
      where: {
        id: params.taskId,
        tenantId,
      },
      include: {
        postProductionJob: {
          include: {
            booking: true,
            workflowTasks: true,
          },
        },
        user: true,
      },
    });

    if (!task) {
      throw new Error('Deliverable task not found or unauthorized');
    }

    const updatedTask = await prisma.workflowTask.update({
      where: { id: task.id },
      data: {
        status: params.status,
        notes: params.notes !== undefined ? params.notes?.trim() || null : task.notes,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            designation: true,
          },
        },
      },
    });

    // If task was marked IN_PROGRESS and job is still PENDING/DATA_DUMPED, advance job to EDITING
    if (
      params.status === TaskStatus.IN_PROGRESS &&
      task.postProductionJob &&
      (task.postProductionJob.status === PostProductionStatus.PENDING ||
        task.postProductionJob.status === PostProductionStatus.DATA_DUMPED)
    ) {
      await this.updateJobStatus({
        jobId: task.postProductionJob.id,
        status: PostProductionStatus.EDITING,
        tenantId,
      });
    }

    return serializePrisma(updatedTask);
  }

  /**
   * Updates post-production job status and cloud storage links,
   * synchronizing with EventBooking.journeyStatus.
   */
  static async updateJobStatus(params: UpdateJobStatusParams) {
    const { tenantId, userId: actorUserId } = await this.resolveSession({ tenantId: params.tenantId });

    if (!params.jobId) throw new Error('Job ID is required');

    const job = await prisma.postProductionJob.findFirst({
      where: { id: params.jobId, tenantId, deletedAt: null },
      include: {
        booking: true,
      },
    });

    if (!job) {
      throw new Error('Post-production job not found or unauthorized');
    }

    const updatedJob = await prisma.postProductionJob.update({
      where: { id: job.id },
      data: {
        status: params.status,
        cloudFolderLink:
          params.cloudFolderLink !== undefined
            ? params.cloudFolderLink?.trim() || null
            : job.cloudFolderLink,
        notes: params.notes !== undefined ? params.notes?.trim() || null : job.notes,
      },
      include: {
        booking: {
          include: {
            customer: true,
          },
        },
        workflowTasks: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                designation: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        clientSelection: true,
      },
    });

    // Synchronize booking journey status
    const targetJourneyStatus = this.mapPostProdToJourneyStatus(params.status);
    await prisma.eventBooking.update({
      where: { id: job.bookingId },
      data: {
        journeyStatus: targetJourneyStatus,
      },
    });

    // Record activity
    await prisma.activityTimeline.create({
      data: {
        tenantId,
        entityType: 'LEAD',
        entityId: job.booking.leadId || job.bookingId,
        action: 'POST_PRODUCTION_STATUS_CHANGED',
        notes: `Post-production status updated to "${params.status}". Client journey status synced to "${targetJourneyStatus}".${params.cloudFolderLink ? ` Delivery Link: ${params.cloudFolderLink}` : ''}`,
        metadata: {
          jobId: job.id,
          status: params.status,
          cloudFolderLink: params.cloudFolderLink,
        },
        createdById: actorUserId !== 'system' ? actorUserId : null,
      },
    });

    return serializePrisma(updatedJob);
  }

  /**
   * Submits client photo selection (comma-separated list of filenames/numbers).
   * Can be submitted via authenticated client portal, accessCode, or jobId.
   */
  static async submitClientSelection(params: SubmitClientSelectionParams) {
    if (!params.photoNames || !params.photoNames.trim()) {
      throw new Error('Please provide at least one photo filename or number');
    }

    const cleanPhotoNames = params.photoNames.trim();

    // 1. Resolve PostProductionJob
    let job: any = null;

    if (params.jobId) {
      job = await prisma.postProductionJob.findFirst({
        where: { id: params.jobId, ...(params.tenantId ? { tenantId: params.tenantId } : {}), deletedAt: null },
        include: {
          booking: {
            include: { customer: true },
          },
          clientSelection: true,
        },
      });
    } else if (params.bookingId) {
      job = await prisma.postProductionJob.findFirst({
        where: { bookingId: params.bookingId, ...(params.tenantId ? { tenantId: params.tenantId } : {}), deletedAt: null },
        include: {
          booking: {
            include: { customer: true },
          },
          clientSelection: true,
        },
      });
    } else if (params.accessCode) {
      const customer = await prisma.customer.findFirst({
        where: { portalAccessCode: params.accessCode, ...(params.tenantId ? { tenantId: params.tenantId } : {}), deletedAt: null },
        include: {
          eventBookings: {
            where: { deletedAt: null },
            orderBy: { startDate: 'desc' },
            include: {
              postProductionJob: {
                include: {
                  booking: { include: { customer: true } },
                  clientSelection: true,
                },
              },
            },
          },
        },
      });

      const firstBooking = customer?.eventBookings?.[0];
      if (firstBooking?.postProductionJob) {
        job = firstBooking.postProductionJob;
      } else if (firstBooking) {
        // Auto-initialize if booking exists
        job = await this.initializePostProductionJob(firstBooking.id, customer.tenantId);
      }
    }

    if (!job) {
      throw new Error('Post-production job or client assignment could not be resolved');
    }

    // 2. Save or update ClientSelection
    const submittedAt = new Date();
    const selection = await prisma.clientSelection.upsert({
      where: { jobId: job.id },
      update: {
        selectedPhotoNames: cleanPhotoNames,
        submittedAt,
        status: SelectionStatus.SUBMITTED,
        instructions: params.clientNotes?.trim() || undefined,
      },
      create: {
        tenantId: job.tenantId,
        customerId: job.booking.customerId,
        eventBookingId: job.bookingId,
        jobId: job.id,
        title: `${job.booking.title} - Photo Selection`,
        selectedPhotoNames: cleanPhotoNames,
        submittedAt,
        status: SelectionStatus.SUBMITTED,
        instructions: params.clientNotes?.trim() || 'Client submitted file numbers for retouching.',
      },
    });

    // 3. Automatically advance PostProductionJob status to EDITING
    await prisma.postProductionJob.update({
      where: { id: job.id },
      data: {
        status: PostProductionStatus.EDITING,
      },
    });

    // 4. Update EventBooking journeyStatus to EDITING_IN_PROGRESS
    await prisma.eventBooking.update({
      where: { id: job.bookingId },
      data: {
        journeyStatus: JourneyStatus.EDITING_IN_PROGRESS,
      },
    });

    // 5. Record activity timeline
    await prisma.activityTimeline.create({
      data: {
        tenantId: job.tenantId,
        entityType: 'LEAD',
        entityId: job.booking.leadId || job.bookingId,
        action: 'CLIENT_SELECTION_SUBMITTED',
        notes: `Client submitted photo selections (${cleanPhotoNames.split(',').length} items). Pipeline moved to EDITING.`,
        metadata: {
          jobId: job.id,
          selectionId: selection.id,
          submittedCount: cleanPhotoNames.split(',').length,
        },
      },
    });

    return serializePrisma({
      success: true,
      selection,
      jobId: job.id,
      submittedCount: cleanPhotoNames.split(',').length,
    });
  }

  /**
   * Fetches all post-production jobs for the active tenant,
   * including booking, customer, deliverable tasks, and client selection.
   */
  static async getPostProductionJobs(tenantIdOverride?: string) {
    const { tenantId } = await this.resolveSession({ tenantId: tenantIdOverride });

    const jobs = await prisma.postProductionJob.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      include: {
        booking: {
          include: {
            customer: {
              select: {
                id: true,
                customerCode: true,
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
                portalAccessCode: true,
              },
            },
            assignments: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    designation: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
        workflowTasks: {
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
          },
          orderBy: { createdAt: 'asc' },
        },
        clientSelection: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Also fetch confirmed bookings that don't yet have a post-production job
    const uninitializedBookings = await prisma.eventBooking.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: { in: ['CONFIRMED', 'COMPLETED'] },
        postProductionJob: null,
      },
      include: {
        customer: {
          select: {
            id: true,
            customerCode: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    return serializePrisma({
      jobs,
      uninitializedBookings,
    });
  }

  /**
   * Fetches single post-production job details.
   */
  static async getJobById(jobId: string, tenantIdOverride?: string) {
    const { tenantId } = await this.resolveSession({ tenantId: tenantIdOverride });

    const job = await prisma.postProductionJob.findFirst({
      where: { id: jobId, tenantId, deletedAt: null },
      include: {
        booking: {
          include: {
            customer: true,
          },
        },
        workflowTasks: {
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
          },
          orderBy: { createdAt: 'asc' },
        },
        clientSelection: true,
      },
    });

    if (!job) {
      throw new Error('Post-production job not found or unauthorized');
    }

    return serializePrisma(job);
  }

  /**
   * Fetches active editors / staff members for task assignment.
   */
  static async getAvailableEditors(tenantIdOverride?: string) {
    const { tenantId } = await this.resolveSession({ tenantId: tenantIdOverride });

    const editors = await prisma.user.findMany({
      where: {
        tenantId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        designation: true,
        employmentType: true,
        skills: true,
      },
      orderBy: { name: 'asc' },
    });

    return serializePrisma(editors);
  }
}
