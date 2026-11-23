'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { PostProductionService } from '@/services/post-production.service';
import { PostProductionStatus, TaskStatus } from '@prisma/client';
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

const initializeJobSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID'),
});

const assignTaskSchema = z.object({
  jobId: z.string().uuid('Invalid job ID'),
  assignedEditorId: z.string().uuid().nullable().optional(),
  taskType: z.string().min(2, 'Task type must be at least 2 characters'),
  dueDate: z.string().nullable().optional(),
  notes: z.string().optional(),
});

const updateTaskStatusSchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
  status: z.nativeEnum(TaskStatus),
  notes: z.string().optional(),
});

const updateJobStatusSchema = z.object({
  jobId: z.string().uuid('Invalid job ID'),
  status: z.nativeEnum(PostProductionStatus),
  cloudFolderLink: z.string().url('Invalid URL').or(z.string().length(0)).nullable().optional(),
  notes: z.string().optional(),
});

const submitSelectionSchema = z.object({
  jobId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
  accessCode: z.string().optional(),
  photoNames: z.string().min(1, 'Please enter photo filenames'),
  clientNotes: z.string().optional(),
});

/**
 * Initializes a post-production editing workflow job for a booking.
 */
export async function initializePostProductionJobAction(input: z.infer<typeof initializeJobSchema>) {
  try {
    const { tenantId } = await validateSession();
    const validated = initializeJobSchema.parse(input);

    const job = await PostProductionService.initializePostProductionJob(validated.bookingId, tenantId);

    revalidatePath('/operations/post-production');
    revalidatePath('/operations');
    revalidatePath('/portal/dashboard');

    return { success: true, data: job };
  } catch (error: any) {
    console.error('[INIT_POST_PRODUCTION_ERROR]', error);
    return { success: false, error: error.message || 'Failed to initialize post-production job' };
  }
}

/**
 * Assigns an editing deliverable task to an editor staff member.
 */
export async function assignDeliverableTaskAction(input: z.infer<typeof assignTaskSchema>) {
  try {
    const { tenantId } = await validateSession();
    const validated = assignTaskSchema.parse(input);

    const task = await PostProductionService.assignDeliverableTask({
      ...validated,
      tenantId,
    });

    revalidatePath('/operations/post-production');

    return { success: true, data: task };
  } catch (error: any) {
    console.error('[ASSIGN_DELIVERABLE_TASK_ERROR]', error);
    return { success: false, error: error.message || 'Failed to assign editing task' };
  }
}

/**
 * Updates deliverable task status (PENDING, IN_PROGRESS, REVIEW, COMPLETED).
 */
export async function updateTaskStatusAction(input: z.infer<typeof updateTaskStatusSchema>) {
  try {
    const { tenantId } = await validateSession();
    const validated = updateTaskStatusSchema.parse(input);

    const updated = await PostProductionService.updateTaskStatus({
      ...validated,
      tenantId,
    });

    revalidatePath('/operations/post-production');
    revalidatePath('/portal/dashboard');

    return { success: true, data: updated };
  } catch (error: any) {
    console.error('[UPDATE_TASK_STATUS_ERROR]', error);
    return { success: false, error: error.message || 'Failed to update task status' };
  }
}

/**
 * Updates post-production job status & Google Drive / Cloud storage delivery link.
 */
export async function updateJobStatusAction(input: z.infer<typeof updateJobStatusSchema>) {
  try {
    const { tenantId } = await validateSession();
    const validated = updateJobStatusSchema.parse(input);

    const updated = await PostProductionService.updateJobStatus({
      jobId: validated.jobId,
      status: validated.status,
      cloudFolderLink: validated.cloudFolderLink || null,
      notes: validated.notes,
      tenantId,
    });

    revalidatePath('/operations/post-production');
    revalidatePath('/operations');
    revalidatePath('/portal/dashboard');

    return { success: true, data: updated };
  } catch (error: any) {
    console.error('[UPDATE_JOB_STATUS_ERROR]', error);
    return { success: false, error: error.message || 'Failed to update post-production status' };
  }
}

/**
 * Submits client photo selection (comma-separated list of filenames/numbers).
 * Accessible publicly via accessCode or portal session.
 */
export async function submitClientSelectionAction(input: z.infer<typeof submitSelectionSchema>) {
  try {
    const validated = submitSelectionSchema.parse(input);

    const result = await PostProductionService.submitClientSelection(validated);

    revalidatePath('/operations/post-production');
    revalidatePath('/portal/dashboard');
    if (validated.accessCode) {
      revalidatePath(`/portal/${validated.accessCode}`);
    }

    return { success: true, data: result };
  } catch (error: any) {
    console.error('[SUBMIT_CLIENT_SELECTION_ERROR]', error);
    return { success: false, error: error.message || 'Failed to submit photo selections' };
  }
}

/**
 * Lists all post-production jobs for the active tenant.
 */
export async function getPostProductionJobsAction() {
  try {
    const { tenantId } = await validateSession();
    const data = await PostProductionService.getPostProductionJobs(tenantId);
    return { success: true, data };
  } catch (error: any) {
    console.error('[GET_POST_PRODUCTION_JOBS_ERROR]', error);
    return { success: false, error: error.message || 'Failed to fetch post-production jobs' };
  }
}

/**
 * Fetches available staff members for editor assignment.
 */
export async function getAvailableEditorsAction() {
  try {
    const { tenantId } = await validateSession();
    const data = await PostProductionService.getAvailableEditors(tenantId);
    return { success: true, data };
  } catch (error: any) {
    console.error('[GET_AVAILABLE_EDITORS_ERROR]', error);
    return { success: false, error: error.message || 'Failed to fetch available editors' };
  }
}
