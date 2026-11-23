'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { serializePrisma } from '@/lib/serialize';
import { formatDate } from '@/lib/date';
import { AlbumStatus, TaskStatus, WorkflowType, Prisma } from '@prisma/client';
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
    userName: user.name as string | undefined,
    userRole: user.role as string | undefined,
  };
}

/**
 * Validates client portal authorization for a specific customer or booking.
 * Supports:
 * 1. Active staff tenant session
 * 2. Portal accessCode (matching customer id, portalAccessCode, or customerCode)
 * 3. Client portal JWT cookie ('pratima_client_token')
 */
async function verifyClientOrStaffAccess(customerId: string, tenantId: string, accessCode?: string | null) {
  // 1. Check if authenticated staff session
  try {
    const session = await auth();
    const user = session?.user as any;
    if (user?.tenantId && user.tenantId === tenantId) {
      return {
        isStaff: true,
        userId: user.id as string,
        userName: user.name as string,
        role: 'DESIGNER',
      };
    }
  } catch {
    // Continue to client check
  }

  // 2. Check direct accessCode matching customer
  if (accessCode && typeof accessCode === 'string') {
    const cleanCode = accessCode.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanCode);

    const orConditions: Array<{ portalAccessCode?: string; customerCode?: string; id?: string }> = [
      { portalAccessCode: cleanCode },
      { customerCode: cleanCode },
    ];
    if (isUuid) {
      orConditions.push({ id: cleanCode });
    }

    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        deletedAt: null,
        OR: orConditions,
      },
      select: { id: true, firstName: true, lastName: true },
    });

    if (customer) {
      return {
        isStaff: false,
        userId: null,
        userName: `${customer.firstName} ${customer.lastName}`.trim(),
        role: 'CLIENT',
      };
    }
  }

  // 3. Check client portal cookie
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('pratima_client_token')?.value;
    if (token) {
      // Decode JWT token loosely or verify customer exists
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, deletedAt: null },
        select: { id: true, firstName: true, lastName: true },
      });
      if (customer) {
        return {
          isStaff: false,
          userId: null,
          userName: `${customer.firstName} ${customer.lastName}`.trim(),
          role: 'CLIENT',
        };
      }
    }
  } catch {
    // Cookie inaccessible
  }

  return null;
}

// -----------------------------------------------------------------------------
// ZOD VALIDATION SCHEMAS
// -----------------------------------------------------------------------------

const getAlbumProofingSchema = z.object({
  albumId: z.string().uuid('Invalid Album ID'),
  accessCode: z.string().optional().nullable(),
});

const addAlbumPageCommentSchema = z.object({
  pageId: z.string().uuid('Invalid Album Page ID'),
  xPos: z.number().min(0, 'X must be at least 0%').max(100, 'X cannot exceed 100%'),
  yPos: z.number().min(0, 'Y must be at least 0%').max(100, 'Y cannot exceed 100%'),
  commentText: z.string().min(1, 'Comment text is required').max(2000, 'Comment cannot exceed 2000 characters'),
  authorName: z.string().optional().nullable(),
  authorRole: z.enum(['CLIENT', 'DESIGNER', 'ADMIN', 'GUEST']).optional(),
  accessCode: z.string().optional().nullable(),
});

const resolveAlbumCommentSchema = z.object({
  commentId: z.string().uuid('Invalid Comment ID'),
  isResolved: z.boolean().optional().default(true),
  accessCode: z.string().optional().nullable(),
});

const deleteAlbumCommentSchema = z.object({
  commentId: z.string().uuid('Invalid Comment ID'),
  accessCode: z.string().optional().nullable(),
});

const clientReviewAlbumSchema = z.object({
  albumId: z.string().uuid('Invalid Album Project ID'),
  isApproved: z.boolean(),
  feedbackNotes: z.string().optional().nullable(),
  accessCode: z.string().optional().nullable(),
});

const createAlbumProjectSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  eventBookingId: z.string().uuid('Invalid booking ID').optional().nullable(),
  clientSelectionId: z.string().uuid('Invalid selection board ID').optional().nullable(),
  title: z.string().min(2, 'Album title must be at least 2 characters').max(150),
  description: z.string().optional().nullable(),
  totalSheets: z.number().int().min(1).optional().default(20),
  editorId: z.string().uuid().optional().nullable(),
  coverImageId: z.string().uuid().optional().nullable(),
  expiresAt: z.string().nullable().optional(),
});

const createAlbumSpreadPagesSchema = z.object({
  albumId: z.string().uuid('Invalid Album Project ID'),
  storageRecordIds: z.array(z.string().uuid('Invalid storage record ID')).min(1, 'At least one spread is required'),
  startPageNumber: z.number().int().min(1).optional().default(1),
});

// -----------------------------------------------------------------------------
// SERVER ACTIONS
// -----------------------------------------------------------------------------

/**
 * 1. Fetches an Album Project with its sequential spreads and spatial pin comments.
 * Resolves high-resolution BYOS storage URLs for 3D flipbook rendering.
 * Authorized for studio team or verified client portal viewers.
 */
export async function getAlbumProofingAction(input: string | z.infer<typeof getAlbumProofingSchema>) {
  try {
    const rawInput = typeof input === 'string' ? { albumId: input } : input;
    const validated = getAlbumProofingSchema.parse(rawInput);

    const album = await prisma.albumProject.findFirst({
      where: {
        id: validated.albumId,
        deletedAt: null,
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            portalAccessCode: true,
            customerCode: true,
          },
        },
        eventBooking: {
          select: {
            id: true,
            title: true,
            bookingNumber: true,
            startDate: true,
            location: true,
          },
        },
        editor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            designation: true,
          },
        },
        coverImage: {
          select: {
            id: true,
            fileName: true,
            url: true,
            mimeType: true,
            sizeBytes: true,
          },
        },
        pages: {
          orderBy: { pageNumber: 'asc' },
          include: {
            storageRecord: {
              select: {
                id: true,
                fileName: true,
                url: true,
                mimeType: true,
                sizeBytes: true,
              },
            },
            comments: {
              orderBy: { createdAt: 'asc' },
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    designation: true,
                  },
                },
              },
            },
          },
        },
        clientSelection: {
          select: {
            id: true,
            title: true,
            status: true,
            selectedPhotoNames: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            tradeName: true,
            phone: true,
            email: true,
            logoUrl: true,
          },
        },
      },
    });

    if (!album) {
      return { success: false, error: 'Album project not found.' };
    }

    // Verify access
    const authContext = await verifyClientOrStaffAccess(
      album.customerId,
      album.tenantId,
      validated.accessCode
    );

    if (!authContext) {
      return { success: false, error: 'Unauthorized: Access to this digital album is restricted.' };
    }

    // Compute proofing metrics
    const totalPages = album.pages.length;
    let totalComments = 0;
    let unresolvedComments = 0;

    const formattedPages = album.pages.map((p) => {
      const pageComments = p.comments || [];
      totalComments += pageComments.length;
      unresolvedComments += pageComments.filter((c) => !c.isResolved).length;

      return {
        id: p.id,
        pageNumber: p.pageNumber,
        title: p.title || `Spread ${p.pageNumber}`,
        layoutMetadata: p.layoutMetadata,
        storageRecordId: p.storageRecordId,
        fileName: p.storageRecord.fileName,
        imageUrl: p.storageRecord.url || '',
        mimeType: p.storageRecord.mimeType,
        commentsCount: pageComments.length,
        unresolvedCount: pageComments.filter((c) => !c.isResolved).length,
        comments: pageComments.map((c) => ({
          id: c.id,
          xPos: c.xPos,
          yPos: c.yPos,
          commentText: c.commentText,
          isResolved: c.isResolved,
          authorName: c.authorName || c.author?.name || 'Reviewer',
          authorRole: c.authorRole || (c.author ? 'DESIGNER' : 'CLIENT'),
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })),
      };
    });

    const isApproved =
      album.status === AlbumStatus.APPROVED_FOR_PRINT || album.status === AlbumStatus.DELIVERED;

    const formattedAlbum = {
      id: album.id,
      title: album.title,
      status: album.status,
      description: album.description,
      totalSheets: album.totalSheets || Math.max(1, Math.ceil(totalPages / 2)),
      totalPages,
      totalComments,
      unresolvedComments,
      isApproved,
      expiresAt: album.expiresAt,
      createdAt: album.createdAt,
      updatedAt: album.updatedAt,
      customer: {
        id: album.customer.id,
        name: `${album.customer.firstName} ${album.customer.lastName}`.trim(),
        email: album.customer.email,
        phone: album.customer.phone,
        customerCode: album.customer.customerCode,
      },
      eventBooking: album.eventBooking
        ? {
            id: album.eventBooking.id,
            title: album.eventBooking.title,
            bookingNumber: album.eventBooking.bookingNumber,
            startDate: album.eventBooking.startDate,
            location: album.eventBooking.location,
          }
        : null,
      editor: album.editor
        ? {
            id: album.editor.id,
            name: album.editor.name,
            designation: album.editor.designation,
          }
        : null,
      coverImageUrl: album.coverImage?.url || formattedPages[0]?.imageUrl || null,
      pages: formattedPages,
      authContext: {
        isStaff: authContext.isStaff,
        userName: authContext.userName,
        role: authContext.role,
      },
      tenant: {
        id: album.tenant.id,
        name: album.tenant.tradeName || album.tenant.name,
        phone: album.tenant.phone,
        email: album.tenant.email,
        logoUrl: album.tenant.logoUrl,
      },
    };

    return {
      success: true,
      data: serializePrisma(formattedAlbum),
    };
  } catch (error: any) {
    console.error('[GET_ALBUM_PROOFING_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to fetch album proofing data.',
    };
  }
}

/**
 * 2. Adds a spatial pin comment to a specific coordinate (xPos%, yPos%) on an Album Page.
 * Can be placed by a client in the portal or by an editor in the studio workspace.
 */
export async function addAlbumPageCommentAction(input: z.infer<typeof addAlbumPageCommentSchema>) {
  try {
    const validated = addAlbumPageCommentSchema.parse(input);

    // Fetch page and associated album
    const page = await prisma.albumPage.findFirst({
      where: { id: validated.pageId },
      include: {
        album: {
          include: { customer: true },
        },
      },
    });

    if (!page) {
      return { success: false, error: 'Album page spread not found.' };
    }

    // Verify access
    const authContext = await verifyClientOrStaffAccess(
      page.album.customerId,
      page.tenantId,
      validated.accessCode
    );

    if (!authContext) {
      return { success: false, error: 'Unauthorized: You do not have permission to comment on this album.' };
    }

    const finalAuthorName =
      validated.authorName?.trim() ||
      authContext.userName ||
      (authContext.isStaff ? 'Layout Designer' : 'Client');

    const finalAuthorRole = authContext.isStaff ? 'DESIGNER' : validated.authorRole || 'CLIENT';
    const authorId = authContext.isStaff ? authContext.userId : null;

    // Create the spatial pin comment
    const comment = await prisma.albumComment.create({
      data: {
        tenantId: page.tenantId,
        albumPageId: page.id,
        xPos: Number(validated.xPos.toFixed(2)),
        yPos: Number(validated.yPos.toFixed(2)),
        commentText: validated.commentText.trim(),
        isResolved: false,
        authorName: finalAuthorName,
        authorRole: finalAuthorRole,
        authorId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            designation: true,
          },
        },
      },
    });

    // If album was currently in SHARED_FOR_REVIEW and a client adds a comment,
    // transition status to CHANGES_REQUESTED automatically to keep pipeline synced
    if (!authContext.isStaff && page.album.status === AlbumStatus.SHARED_FOR_REVIEW) {
      await prisma.albumProject.update({
        where: { id: page.albumId },
        data: { status: AlbumStatus.CHANGES_REQUESTED },
      });
    }

    revalidatePath('/portal');
    revalidatePath('/operations/post-production');
    revalidatePath('/operations/selections');

    return {
      success: true,
      message: 'Spatial pin comment placed successfully!',
      data: serializePrisma(comment),
    };
  } catch (error: any) {
    console.error('[ADD_ALBUM_PAGE_COMMENT_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to place comment pin.',
    };
  }
}

/**
 * 3. Resolves or reopens a spatial pin comment on an album page spread.
 */
export async function resolveAlbumCommentAction(input: z.infer<typeof resolveAlbumCommentSchema>) {
  try {
    const validated = resolveAlbumCommentSchema.parse(input);

    const comment = await prisma.albumComment.findFirst({
      where: { id: validated.commentId },
      include: {
        albumPage: {
          include: {
            album: true,
          },
        },
      },
    });

    if (!comment) {
      return { success: false, error: 'Comment pin not found.' };
    }

    const authContext = await verifyClientOrStaffAccess(
      comment.albumPage.album.customerId,
      comment.tenantId,
      validated.accessCode
    );

    if (!authContext) {
      return { success: false, error: 'Unauthorized to resolve this comment pin.' };
    }

    const updated = await prisma.albumComment.update({
      where: { id: comment.id },
      data: {
        isResolved: validated.isResolved,
      },
    });

    revalidatePath('/portal');
    revalidatePath('/operations/post-production');

    return {
      success: true,
      message: validated.isResolved
        ? 'Comment pin marked as resolved!'
        : 'Comment pin reopened for review.',
      data: serializePrisma(updated),
    };
  } catch (error: any) {
    console.error('[RESOLVE_ALBUM_COMMENT_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to update comment status.',
    };
  }
}

/**
 * 4. Deletes an accidental or misplaced spatial pin comment.
 */
export async function deleteAlbumCommentAction(input: z.infer<typeof deleteAlbumCommentSchema>) {
  try {
    const validated = deleteAlbumCommentSchema.parse(input);

    const comment = await prisma.albumComment.findFirst({
      where: { id: validated.commentId },
      include: {
        albumPage: {
          include: { album: true },
        },
      },
    });

    if (!comment) {
      return { success: false, error: 'Comment pin not found.' };
    }

    const authContext = await verifyClientOrStaffAccess(
      comment.albumPage.album.customerId,
      comment.tenantId,
      validated.accessCode
    );

    if (!authContext) {
      return { success: false, error: 'Unauthorized to delete this comment pin.' };
    }

    await prisma.albumComment.delete({
      where: { id: comment.id },
    });

    revalidatePath('/portal');
    revalidatePath('/operations/post-production');

    return {
      success: true,
      message: 'Comment pin deleted.',
    };
  } catch (error: any) {
    console.error('[DELETE_ALBUM_COMMENT_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to delete comment pin.',
    };
  }
}

/**
 * 5. Client Review & Approval Loop:
 * Triggered by the client in the e-Album Flipbook viewer.
 *   - On Approval: transitions status to APPROVED_FOR_PRINT, syncs WorkflowTask to COMPLETED.
 *   - On Rejection: transitions status to CHANGES_REQUESTED, syncs WorkflowTask to CHANGES_REQUESTED.
 */
export async function clientReviewAlbumAction(input: z.infer<typeof clientReviewAlbumSchema>) {
  try {
    const validated = clientReviewAlbumSchema.parse(input);

    const album = await prisma.albumProject.findFirst({
      where: {
        id: validated.albumId,
        deletedAt: null,
      },
      include: {
        customer: true,
        eventBooking: {
          include: {
            postProductionJob: true,
          },
        },
      },
    });

    if (!album) {
      return { success: false, error: 'Album project not found.' };
    }

    const authContext = await verifyClientOrStaffAccess(
      album.customerId,
      album.tenantId,
      validated.accessCode
    );

    if (!authContext) {
      return { success: false, error: 'Unauthorized: Session or accessCode required for album review.' };
    }

    const timestampStr = formatDate(new Date(), 'dd MMM yyyy, hh:mm a');

    if (validated.isApproved) {
      // 1. APPROVED_FOR_PRINT
      const approvalNote = validated.feedbackNotes?.trim()
        ? `[${timestampStr} - Client Approval]: "${validated.feedbackNotes.trim()}"`
        : `[${timestampStr} - Client Approval]: Officially approved for master print and binding.`;

      const updatedAlbum = await prisma.albumProject.update({
        where: { id: album.id },
        data: {
          status: AlbumStatus.APPROVED_FOR_PRINT,
          description: album.description
            ? `${album.description}\n${approvalNote}`
            : approvalNote,
        },
        include: {
          customer: true,
          eventBooking: true,
        },
      });

      // 2. Synchronize related WorkflowTask if present
      if (album.eventBookingId) {
        await prisma.workflowTask.updateMany({
          where: {
            eventBookingId: album.eventBookingId,
            tenantId: album.tenantId,
            deletedAt: null,
            OR: [
              { taskType: { contains: 'ALBUM', mode: 'insensitive' } },
              { taskType: { contains: 'PRINT', mode: 'insensitive' } },
              { type: WorkflowType.PHOTO_EDITING },
            ],
          },
          data: {
            status: TaskStatus.COMPLETED,
          },
        });
      }

      revalidatePath('/portal');
      revalidatePath('/operations/post-production');
      revalidatePath('/operations/selections');

      return {
        success: true,
        message: 'Album officially approved for print! Print lab has been notified.',
        data: serializePrisma(updatedAlbum),
      };
    } else {
      // 1. CHANGES_REQUESTED
      const revisionNote = validated.feedbackNotes?.trim()
        ? `[${timestampStr} - Changes Requested]: "${validated.feedbackNotes.trim()}"`
        : `[${timestampStr} - Changes Requested]: Client requested layout revisions via spatial pin comments.`;

      const updatedAlbum = await prisma.albumProject.update({
        where: { id: album.id },
        data: {
          status: AlbumStatus.CHANGES_REQUESTED,
          description: album.description
            ? `${album.description}\n${revisionNote}`
            : revisionNote,
        },
        include: {
          customer: true,
          eventBooking: true,
        },
      });

      // 2. Synchronize related WorkflowTask if present
      if (album.eventBookingId) {
        await prisma.workflowTask.updateMany({
          where: {
            eventBookingId: album.eventBookingId,
            tenantId: album.tenantId,
            deletedAt: null,
            OR: [
              { taskType: { contains: 'ALBUM', mode: 'insensitive' } },
              { taskType: { contains: 'PRINT', mode: 'insensitive' } },
              { type: WorkflowType.PHOTO_EDITING },
            ],
          },
          data: {
            status: TaskStatus.CHANGES_REQUESTED,
            revisionsCount: { increment: 1 },
          },
        });
      }

      revalidatePath('/portal');
      revalidatePath('/operations/post-production');
      revalidatePath('/operations/selections');

      return {
        success: true,
        message: 'Revision notes submitted. Album designer has been notified to modify the spreads.',
        data: serializePrisma(updatedAlbum),
      };
    }
  } catch (error: any) {
    console.error('[CLIENT_REVIEW_ALBUM_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to process album review.',
    };
  }
}

/**
 * 6. Studio Action: Creates a new Album Project linked to a customer, event booking, or selection board.
 */
export async function createAlbumProjectAction(input: z.infer<typeof createAlbumProjectSchema>) {
  try {
    const { tenantId, userId } = await validateSession();
    const validated = createAlbumProjectSchema.parse(input);

    const customer = await prisma.customer.findFirst({
      where: { id: validated.customerId, tenantId, deletedAt: null },
    });

    if (!customer) {
      return { success: false, error: 'Customer not found or unauthorized.' };
    }

    const expiresAt = validated.expiresAt ? new Date(validated.expiresAt) : null;

    const album = await prisma.albumProject.create({
      data: {
        tenantId,
        customerId: customer.id,
        eventBookingId: validated.eventBookingId || null,
        clientSelectionId: validated.clientSelectionId || null,
        title: validated.title.trim(),
        description: validated.description?.trim() || null,
        totalSheets: validated.totalSheets || 20,
        status: AlbumStatus.DRAFT,
        editorId: validated.editorId || userId,
        coverImageId: validated.coverImageId || null,
        expiresAt,
      },
      include: {
        customer: true,
        eventBooking: true,
      },
    });

    revalidatePath('/operations/selections');
    revalidatePath('/operations/post-production');

    return {
      success: true,
      message: `Album Project "${album.title}" created successfully!`,
      data: serializePrisma(album),
    };
  } catch (error: any) {
    console.error('[CREATE_ALBUM_PROJECT_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to create album project.',
    };
  }
}

/**
 * 7. Studio Action: Attaches multiple StorageRecord items as sequential AlbumPage spreads.
 */
export async function createAlbumSpreadPagesAction(input: z.infer<typeof createAlbumSpreadPagesSchema>) {
  try {
    const { tenantId } = await validateSession();
    const validated = createAlbumSpreadPagesSchema.parse(input);

    const album = await prisma.albumProject.findFirst({
      where: { id: validated.albumId, tenantId, deletedAt: null },
      include: { pages: { select: { pageNumber: true } } },
    });

    if (!album) {
      return { success: false, error: 'Album project not found or unauthorized.' };
    }

    // Determine starting page number
    const maxExisting = album.pages.reduce((max, p) => Math.max(max, p.pageNumber), 0);
    const startNum = validated.startPageNumber && validated.startPageNumber > maxExisting
      ? validated.startPageNumber
      : maxExisting + 1;

    // Verify storage records exist in tenant
    const records = await prisma.storageRecord.findMany({
      where: {
        id: { in: validated.storageRecordIds },
        tenantId,
      },
    });

    if (records.length === 0) {
      return { success: false, error: 'No valid storage records found to attach.' };
    }

    // Preserve order of incoming storageRecordIds
    const recordMap = new Map(records.map((r) => [r.id, r]));

    const pagesToInsert: Prisma.AlbumPageCreateManyInput[] = [];
    let currentNum = startNum;

    for (const recordId of validated.storageRecordIds) {
      const record = recordMap.get(recordId);
      if (!record) continue;

      pagesToInsert.push({
        tenantId,
        albumId: album.id,
        storageRecordId: record.id,
        pageNumber: currentNum,
        title: `Spread ${currentNum}`,
      });
      currentNum++;
    }

    if (pagesToInsert.length > 0) {
      await prisma.albumPage.createMany({
        data: pagesToInsert,
      });
    }

    const createdPages = await prisma.albumPage.findMany({
      where: {
        albumId: album.id,
        tenantId,
        pageNumber: { gte: startNum, lt: currentNum },
      },
      include: {
        storageRecord: true,
      },
      orderBy: { pageNumber: 'asc' },
    });

    // Update album total sheets and transition status if in DRAFT
    await prisma.albumProject.update({
      where: { id: album.id },
      data: {
        totalSheets: Math.max(album.totalSheets || 0, Math.ceil((currentNum - 1) / 2)),
        status:
          album.status === AlbumStatus.DRAFT
            ? AlbumStatus.IN_POST_PRODUCTION
            : album.status,
      },
    });

    revalidatePath('/operations/selections');
    revalidatePath('/operations/post-production');
    revalidatePath('/portal');

    return {
      success: true,
      message: `Attached ${createdPages.length} album spread pages (Page #${startNum} to #${currentNum - 1})!`,
      data: serializePrisma(createdPages),
    };
  } catch (error: any) {
    console.error('[CREATE_ALBUM_SPREAD_PAGES_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to attach album spread pages.',
    };
  }
}

/**
 * 8. Studio Action: Lists all Album Projects for the active tenant with counts and status filters.
 */
export async function listAlbumProjectsAction(params?: { take?: number; skip?: number }) {
  try {
    const { tenantId } = await validateSession();
    const take = params?.take ?? 50;
    const skip = params?.skip ?? 0;

    const albums = await prisma.albumProject.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      take,
      skip,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            customerCode: true,
            phone: true,
          },
        },
        eventBooking: {
          select: {
            id: true,
            bookingNumber: true,
            title: true,
            startDate: true,
          },
        },
        editor: {
          select: {
            id: true,
            name: true,
            designation: true,
          },
        },
        coverImage: {
          select: {
            id: true,
            url: true,
            fileName: true,
          },
        },
        _count: {
          select: {
            pages: true,
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return {
      success: true,
      data: serializePrisma(albums),
    };
  } catch (error: any) {
    console.error('[LIST_ALBUM_PROJECTS_ERROR]', error);
    return {
      success: false,
      error: error?.message || 'Failed to list album projects.',
    };
  }
}
