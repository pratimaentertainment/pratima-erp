'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import {
  SelectionStatus,
  SelectionItemStatus,
  StorageProvider,
  PostProductionStatus,
  TaskStatus,
  WorkflowType,
  JourneyStatus,
  Prisma,
} from '@prisma/client';
import { serializePrisma } from '@/lib/serialize';
import { z } from 'zod';
import { getDecryptedStorageCredentialsInternal } from '@/actions/storage.actions';
import {
  extractGoogleDriveId,
  batchDeleteDriveAssets,
  deleteDriveFolder,
  getGoogleDriveClient,
} from '@/services/storage/google-drive.service';
import { S3Client, DeleteObjectsCommand } from '@aws-sdk/client-s3';

/**
 * Validates active tenant user session for internal studio actions.
 */
async function validateSession() {
  const session = await auth();
  const user = session?.user as { tenantId?: string; activeBranchId?: string; branchId?: string; id?: string } | undefined;
  if (!user?.tenantId) {
    throw new Error('Unauthorized: No active tenant session found.');
  }
  return {
    tenantId: user.tenantId as string,
    userId: user.id as string,
  };
}

/**
 * Generates a random secure 6-digit numeric PIN for client portal access.
 */
function generateSecurePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ============================================================================
// SCHEMAS
// ============================================================================

const createSelectionBoardSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  eventBookingId: z.string().uuid('Invalid booking ID').optional().nullable(),
  title: z.string().min(2, 'Title must be at least 2 characters').max(150, 'Title cannot exceed 150 characters'),
  pinCode: z.string().min(4, 'PIN must be at least 4 digits').max(10, 'PIN cannot exceed 10 digits').optional().nullable(),
  selectionDeadline: z.union([z.string().datetime(), z.date(), z.string().length(0)]).optional().nullable(),
  instructions: z.string().optional().nullable(),
  minSelections: z.number().int().positive().optional().nullable(),
  maxSelections: z.number().int().positive().optional().nullable(),
  galleryMode: z.enum(['SELECTION', 'DELIVERY']).optional().default('SELECTION'),
  allowDownloads: z.boolean().optional(),
  applyWatermark: z.boolean().optional(),
});

const addPhotosToSelectionSchema = z.object({
  selectionId: z.string().uuid('Invalid selection board ID'),
  storageRecordIds: z.array(z.string().uuid('Invalid storage record ID')).min(1, 'At least one photo must be provided'),
});

const updateSelectionItemStatusSchema = z.object({
  itemId: z.string().uuid('Invalid selection item ID'),
  status: z.nativeEnum(SelectionItemStatus).optional(),
  isFavorite: z.boolean().optional(),
  clientNote: z.string().optional().nullable(),
});

const updateSelectionBoardStatusSchema = z.object({
  selectionId: z.string().uuid('Invalid selection board ID'),
  status: z.nativeEnum(SelectionStatus),
});

const updateSelectionDeadlineSchema = z.object({
  selectionId: z.string().uuid('Invalid selection board ID'),
  selectionDeadline: z.union([z.string(), z.date()]).optional().nullable(),
  isSelectionLocked: z.boolean().optional(),
});

// ============================================================================
// STUDIO ADMIN ACTIONS
// ============================================================================

/**
 * Creates a new ClientSelection board with a secure PIN code and optional expiry.
 */
export async function createSelectionBoardAction(input: z.infer<typeof createSelectionBoardSchema>) {
  try {
    const { tenantId } = await validateSession();
    const validated = createSelectionBoardSchema.parse(input);

    const customer = await prisma.customer.findFirst({
      where: { id: validated.customerId, tenantId, deletedAt: null },
    });

    if (!customer) {
      return { success: false, error: 'Customer not found or access denied.' };
    }

    if (validated.eventBookingId) {
      const booking = await prisma.eventBooking.findFirst({
        where: { id: validated.eventBookingId, tenantId, deletedAt: null },
      });
      if (!booking) {
        return { success: false, error: 'Event booking not found or access denied.' };
      }
    }

    const pinCode = validated.pinCode && validated.pinCode.trim() !== ''
      ? validated.pinCode.trim()
      : generateSecurePin();

    const selectionDeadline = validated.selectionDeadline
      ? new Date(validated.selectionDeadline)
      : null;

    const board = await prisma.clientSelection.create({
      data: {
        tenantId,
        customerId: validated.customerId,
        eventBookingId: validated.eventBookingId || null,
        title: validated.title.trim(),
        pinCode,
        selectionDeadline,
        instructions: validated.instructions ? validated.instructions.trim() : null,
        minSelections: validated.minSelections ?? null,
        maxSelections: validated.maxSelections ?? null,
        galleryMode: validated.galleryMode || 'SELECTION',
        allowDownloads: validated.allowDownloads ?? (validated.galleryMode === 'DELIVERY'),
        applyWatermark: validated.applyWatermark ?? (validated.galleryMode !== 'DELIVERY'),
        status: SelectionStatus.DRAFT,
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        eventBooking: {
          select: {
            id: true,
            bookingNumber: true,
            title: true,
          },
        },
      },
    });

    revalidatePath(`/customers/${validated.customerId}`);
    revalidatePath('/operations');
    revalidatePath('/operations/selections');

    return {
      success: true,
      data: serializePrisma(board),
    };
  } catch (error: unknown) {
    console.error('[CREATE_SELECTION_BOARD_ERROR]', error);
    return {
      success: false,
      error: (error as Error).message || 'Failed to create selection board.',
    };
  }
}

/**
 * Links multiple StorageRecord items to a ClientSelection board.
 */
export async function addPhotosToSelectionAction(input: z.infer<typeof addPhotosToSelectionSchema>) {
  try {
    const { tenantId } = await validateSession();
    const validated = addPhotosToSelectionSchema.parse(input);

    const selection = await prisma.clientSelection.findFirst({
      where: { id: validated.selectionId, tenantId, deletedAt: null },
    });

    if (!selection) {
      return { success: false, error: 'Selection board not found or access denied.' };
    }

    const records = await prisma.storageRecord.findMany({
      where: {
        id: { in: validated.storageRecordIds },
        tenantId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (records.length === 0) {
      return { success: false, error: 'No valid storage records found to add.' };
    }

    const itemsToCreate = records.map((record) => ({
      tenantId,
      selectionId: validated.selectionId,
      storageRecordId: record.id,
      status: SelectionItemStatus.PENDING,
      isFavorite: false,
    }));

    const result = await prisma.selectionItem.createMany({
      data: itemsToCreate,
      skipDuplicates: true,
    });

    revalidatePath(`/customers/${selection.customerId}`);
    revalidatePath('/operations');
    revalidatePath('/operations/selections');

    return {
      success: true,
      count: result.count,
    };
  } catch (error: unknown) {
    console.error('[ADD_PHOTOS_TO_SELECTION_ERROR]', error);
    return {
      success: false,
      error: (error as Error).message || 'Failed to add photos to selection board.',
    };
  }
}

/**
 * Updates a selection item's status, favorite toggle, or note (Admin / Internal).
 */
export async function updateSelectionItemStatusAction(input: z.infer<typeof updateSelectionItemStatusSchema>) {
  try {
    const { tenantId } = await validateSession();
    const validated = updateSelectionItemStatusSchema.parse(input);

    const existingItem = await prisma.selectionItem.findFirst({
      where: {
        id: validated.itemId,
        selection: { tenantId, deletedAt: null },
      },
      include: {
        selection: {
          select: { id: true, customerId: true, status: true },
        },
      },
    });

    if (!existingItem) {
      return { success: false, error: 'Selection item not found or access denied.' };
    }

    const updateData: Prisma.SelectionItemUpdateInput = {};
    if (validated.status !== undefined) updateData.status = validated.status;
    if (validated.isFavorite !== undefined) updateData.isFavorite = validated.isFavorite;
    if (validated.clientNote !== undefined) updateData.clientNote = validated.clientNote ? validated.clientNote.trim() : null;

    const updated = await prisma.selectionItem.update({
      where: { id: validated.itemId },
      data: updateData,
    });

    if (existingItem.selection.status === SelectionStatus.SHARED && validated.status === SelectionItemStatus.SELECTED) {
      await prisma.clientSelection.update({
        where: { id: existingItem.selection.id },
        data: { status: SelectionStatus.IN_PROGRESS },
      });
    }

    revalidatePath(`/customers/${existingItem.selection.customerId}`);
    revalidatePath(`/gallery/selection/${existingItem.selection.id}`);

    return {
      success: true,
      data: serializePrisma(updated),
    };
  } catch (error: unknown) {
    console.error('[UPDATE_SELECTION_ITEM_STATUS_ERROR]', error);
    return {
      success: false,
      error: (error as Error).message || 'Failed to update selection item.',
    };
  }
}

/**
 * Updates the overall status of a selection board.
 */
export async function updateSelectionBoardStatusAction(input: z.infer<typeof updateSelectionBoardStatusSchema>) {
  try {
    const { tenantId } = await validateSession();
    const validated = updateSelectionBoardStatusSchema.parse(input);

    const selection = await prisma.clientSelection.findFirst({
      where: { id: validated.selectionId, tenantId, deletedAt: null },
    });

    if (!selection) {
      return { success: false, error: 'Selection board not found or access denied.' };
    }

    const updated = await prisma.clientSelection.update({
      where: { id: validated.selectionId },
      data: { status: validated.status },
    });

    revalidatePath(`/customers/${selection.customerId}`);
    revalidatePath('/operations');
    revalidatePath('/operations/selections');
    revalidatePath(`/gallery/selection/${validated.selectionId}`);

    return {
      success: true,
      data: serializePrisma(updated),
    };
  } catch (error: unknown) {
    console.error('[UPDATE_SELECTION_BOARD_STATUS_ERROR]', error);
    return {
      success: false,
      error: (error as Error).message || 'Failed to update selection board status.',
    };
  }
}

/**
 * Removes a single photo item from a selection board.
 */
export async function removePhotoFromSelectionAction(selectionId: string, storageRecordId: string) {
  try {
    const { tenantId } = await validateSession();

    const selection = await prisma.clientSelection.findFirst({
      where: { id: selectionId, tenantId, deletedAt: null },
    });

    if (!selection) {
      return { success: false, error: 'Selection board not found.' };
    }

    await prisma.selectionItem.deleteMany({
      where: {
        selectionId,
        storageRecordId,
      },
    });

    revalidatePath(`/customers/${selection.customerId}`);
    revalidatePath(`/gallery/selection/${selectionId}`);

    return { success: true };
  } catch (error: unknown) {
    console.error('[REMOVE_PHOTO_FROM_SELECTION_ERROR]', error);
    return {
      success: false,
      error: (error as Error).message || 'Failed to remove photo from selection.',
    };
  }
}

/**
 * Studio Admin: Grants an expiry extension to a selection board.
 */
export async function grantSelectionExtensionAction(selectionId: string, additionalDays: number = 7) {
  try {
    const { tenantId } = await validateSession();

    const board = await prisma.clientSelection.findFirst({
      where: { id: selectionId, tenantId, deletedAt: null },
      include: {
        _count: {
          select: {
            items: {
              where: { status: SelectionItemStatus.SELECTED },
            },
          },
        },
      },
    });

    if (!board) {
      return { success: false, error: 'Selection board not found or unauthorized.' };
    }

    const baseDate = board.selectionDeadline && board.selectionDeadline > new Date()
      ? board.selectionDeadline
      : new Date();

    const newDeadline = new Date(baseDate.getTime() + additionalDays * 24 * 60 * 60 * 1000);
    const newStatus = board._count.items > 0 ? SelectionStatus.IN_PROGRESS : SelectionStatus.SHARED;

    const updated = await prisma.clientSelection.update({
      where: { id: selectionId },
      data: {
        selectionDeadline: newDeadline,
        status: newStatus,
        isSelectionLocked: false,
        extensionRequested: false,
        extensionReason: null,
      },
    });

    revalidatePath(`/customers/${board.customerId}`);
    revalidatePath('/operations');
    revalidatePath('/operations/selections');
    revalidatePath(`/gallery/selection/${selectionId}`);

    return {
      success: true,
      data: serializePrisma(updated),
    };
  } catch (error: unknown) {
    console.error('[GRANT_SELECTION_EXTENSION_ERROR]', error);
    return {
      success: false,
      error: (error as Error).message || 'Failed to extend selection board expiry.',
    };
  }
}

/**
 * Studio Admin: Sets, updates, or removes selection deadline and controls lock state.
 */
export async function updateSelectionDeadlineAction(
  selectionId: string,
  selectionDeadline?: Date | string | null,
  isSelectionLocked?: boolean
) {
  try {
    const { tenantId } = await validateSession();
    const validated = updateSelectionDeadlineSchema.parse({ selectionId, selectionDeadline, isSelectionLocked });

    const board = await prisma.clientSelection.findFirst({
      where: { id: validated.selectionId, tenantId, deletedAt: null },
      include: {
        _count: {
          select: {
            items: {
              where: { status: SelectionItemStatus.SELECTED },
            },
          },
        },
      },
    });

    if (!board) {
      return { success: false, error: 'Selection board not found or access denied.' };
    }

    let parsedDeadline: Date | null = null;
    if (validated.selectionDeadline) {
      parsedDeadline = typeof validated.selectionDeadline === 'string' ? new Date(validated.selectionDeadline) : validated.selectionDeadline;
      if (isNaN(parsedDeadline.getTime())) {
        return { success: false, error: 'Invalid deadline date format.' };
      }
    }

    const isPastDeadline = parsedDeadline ? new Date() > parsedDeadline : false;
    let nextStatus = board.status;

    // Transition status appropriately
    if (parsedDeadline && !isPastDeadline) {
      if (board.status === SelectionStatus.EXPIRED || board.status === SelectionStatus.EXTENSION_REQUESTED) {
        nextStatus = board._count.items > 0 ? SelectionStatus.IN_PROGRESS : SelectionStatus.SHARED;
      }
    } else if (isPastDeadline && (board.status === SelectionStatus.SHARED || board.status === SelectionStatus.IN_PROGRESS)) {
      nextStatus = SelectionStatus.EXPIRED;
    }

    const updatePayload: Prisma.ClientSelectionUpdateInput = {
      selectionDeadline: parsedDeadline,
      status: nextStatus,
    };

    if (parsedDeadline && !isPastDeadline) {
      updatePayload.extensionRequested = false;
      updatePayload.extensionReason = null;
    }

    if (validated.isSelectionLocked !== undefined) {
      updatePayload.isSelectionLocked = validated.isSelectionLocked;
    } else if (parsedDeadline && !isPastDeadline && board.isSelectionLocked) {
      updatePayload.isSelectionLocked = false;
    }

    const updated = await prisma.clientSelection.update({
      where: { id: validated.selectionId },
      data: updatePayload,
    });

    revalidatePath(`/customers/${board.customerId}`);
    revalidatePath('/operations');
    revalidatePath('/operations/selections');
    revalidatePath(`/gallery/selection/${validated.selectionId}`);

    return {
      success: true,
      data: serializePrisma(updated),
    };
  } catch (error: unknown) {
    console.error('[UPDATE_SELECTION_DEADLINE_ERROR]', error);
    return {
      success: false,
      error: (error as Error).message || 'Failed to update selection deadline.',
    };
  }
}

/**
 * Editor Export: Generates Lightroom-compatible comma-separated query and CSV/JSON metadata.
 */
export async function exportSelectionDataAction(selectionId: string) {
  try {
    const { tenantId } = await validateSession();

    const board = await prisma.clientSelection.findFirst({
      where: { id: selectionId, tenantId, deletedAt: null },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            customerCode: true,
          },
        },
        eventBooking: {
          select: {
            bookingNumber: true,
            title: true,
          },
        },
        items: {
          where: {
            status: SelectionItemStatus.SELECTED,
          },
          include: {
            storageRecord: {
              select: {
                id: true,
                fileName: true,
                mimeType: true,
                sizeBytes: true,
                url: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!board) {
      return { success: false, error: 'Selection board not found or access denied.' };
    }

    const selectedItems = board.items.map((item) => ({
      fileName: item.storageRecord.fileName,
      baseName: item.storageRecord.fileName.replace(/\.[^/.]+$/, ''),
      isFavorite: item.isFavorite,
      clientNote: item.clientNote || '',
      url: item.storageRecord.url || '',
      storageRecordId: item.storageRecordId,
    }));

    // Lightroom search strings
    const lightroomQuery = selectedItems.map((i) => i.fileName).join(', ');
    const lightroomQueryWithoutExt = selectedItems.map((i) => i.baseName).join(', ');

    // CSV format for album designers and photo retouchers
    const csvRows = [
      ['File Name', 'Base Name', 'Favorite', 'Client Note'].join(','),
      ...selectedItems.map((item) =>
        [
          `"${item.fileName}"`,
          `"${item.baseName}"`,
          item.isFavorite ? 'YES' : 'NO',
          `"${(item.clientNote || '').replace(/"/g, '""')}"`,
        ].join(',')
      ),
    ];
    const csvContent = csvRows.join('\n');

    // Structured JSON for automation pipelines
    const jsonPayload = {
      boardId: board.id,
      boardTitle: board.title,
      customerName: `${board.customer.firstName} ${board.customer.lastName}`,
      customerCode: board.customer.customerCode,
      eventBooking: board.eventBooking ? `${board.eventBooking.bookingNumber} - ${board.eventBooking.title}` : null,
      exportedAt: new Date().toISOString(),
      totalSelected: selectedItems.length,
      favoritesCount: selectedItems.filter((i) => i.isFavorite).length,
      withNotesCount: selectedItems.filter((i) => i.clientNote.length > 0).length,
      lightroomQuery,
      items: selectedItems,
    };

    return {
      success: true,
      data: serializePrisma({
        lightroomQuery,
        lightroomQueryWithoutExt,
        totalSelected: selectedItems.length,
        csvContent,
        jsonContent: JSON.stringify(jsonPayload, null, 2),
        items: selectedItems,
      }),
    };
  } catch (error: unknown) {
    console.error('[EXPORT_SELECTION_DATA_ERROR]', error);
    return {
      success: false,
      error: (error as Error).message || 'Failed to export selection data for editors.',
    };
  }
}

/**
 * Fetches all selection boards across the tenant for the Studio Operations View.
 */
export async function listAllSelectionBoardsAction(params?: { take?: number; skip?: number }) {
  try {
    const { tenantId } = await validateSession();
    const take = params?.take ?? 50;
    const skip = params?.skip ?? 0;

    const boards = await prisma.clientSelection.findMany({
      where: { tenantId, deletedAt: null },
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
            email: true,
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
        items: {
          select: {
            id: true,
            status: true,
            isFavorite: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enriched = boards.map((board) => {
      const totalItems = board.items.length;
      const selectedCount = board.items.filter((i) => i.status === SelectionItemStatus.SELECTED).length;
      const rejectedCount = board.items.filter((i) => i.status === SelectionItemStatus.REJECTED).length;
      const favoriteCount = board.items.filter((i) => i.isFavorite).length;

      // Auto-check expiry if still in progress/shared
      const isExpired = board.selectionDeadline ? new Date() > new Date(board.selectionDeadline) : false;
      let effectiveStatus = board.status;
      if (isExpired && (board.status === SelectionStatus.SHARED || board.status === SelectionStatus.IN_PROGRESS)) {
        effectiveStatus = SelectionStatus.EXPIRED;
      }

      return {
        id: board.id,
        title: board.title,
        status: effectiveStatus,
        rawStatus: board.status,
        pinCode: board.pinCode,
        selectionDeadline: board.selectionDeadline,
        expiresAt: board.selectionDeadline,
        isSelectionLocked: board.isSelectionLocked || isExpired,
        isLocked: board.isSelectionLocked || isExpired,
        extensionRequested: board.extensionRequested,
        extensionReason: board.extensionReason,
        isStoragePurged: board.isStoragePurged,
        purgedAt: board.purgedAt,
        minSelections: board.minSelections,
        maxSelections: board.maxSelections,
        instructions: board.instructions,
        operatorNotes: board.operatorNotes,
        customer: board.customer,
        eventBooking: board.eventBooking,
        stats: {
          totalItems,
          selectedCount,
          rejectedCount,
          favoriteCount,
        },
        createdAt: board.createdAt,
        updatedAt: board.updatedAt,
      };
    });

    return {
      success: true,
      data: serializePrisma(enriched),
    };
  } catch (error: unknown) {
    console.error('[LIST_ALL_SELECTION_BOARDS_ERROR]', error);
    return {
      success: false,
      error: (error as Error).message || 'Failed to list selection boards.',
    };
  }
}

/**
 * Fetches a single selection board by ID for internal studio view.
 */
export async function getSelectionBoardAction(selectionId: string) {
  try {
    const { tenantId } = await validateSession();

    const board = await prisma.clientSelection.findFirst({
      where: { id: selectionId, tenantId, deletedAt: null },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            customerCode: true,
            email: true,
            phone: true,
          },
        },
        eventBooking: {
          select: {
            id: true,
            bookingNumber: true,
            title: true,
            startDate: true,
            endDate: true,
          },
        },
        items: {
          include: {
            storageRecord: {
              select: {
                id: true,
                fileName: true,
                externalFileId: true,
                mimeType: true,
                sizeBytes: true,
                url: true,
                status: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!board) {
      return { success: false, error: 'Selection board not found or access denied.' };
    }

    const totalItems = board.items.length;
    const selectedCount = board.items.filter((i) => i.status === SelectionItemStatus.SELECTED).length;
    const rejectedCount = board.items.filter((i) => i.status === SelectionItemStatus.REJECTED).length;
    const pendingCount = board.items.filter((i) => i.status === SelectionItemStatus.PENDING).length;
    const favoriteCount = board.items.filter((i) => i.isFavorite).length;

    return {
      success: true,
      data: serializePrisma({
        ...board,
        summary: {
          totalItems,
          selectedCount,
          rejectedCount,
          pendingCount,
          favoriteCount,
        },
      }),
    };
  } catch (error: unknown) {
    console.error('[GET_SELECTION_BOARD_ERROR]', error);
    return {
      success: false,
      error: (error as Error).message || 'Failed to load selection board.',
    };
  }
}

/**
 * Fetches all selection boards belonging to a customer.
 */
export async function getSelectionsByCustomerAction(
  customerId: string,
  params?: { take?: number; skip?: number }
) {
  try {
    const { tenantId } = await validateSession();
    const take = params?.take ?? 20;
    const skip = params?.skip ?? 0;

    const boards = await prisma.clientSelection.findMany({
      where: {
        customerId,
        tenantId,
        deletedAt: null,
      },
      take,
      skip,
      include: {
        eventBooking: {
          select: {
            id: true,
            bookingNumber: true,
            title: true,
          },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: serializePrisma(boards),
    };
  } catch (error: unknown) {
    console.error('[GET_SELECTIONS_BY_CUSTOMER_ERROR]', error);
    return {
      success: false,
      error: (error as Error).message || 'Failed to load client selections.',
    };
  }
}

// ============================================================================
// PUBLIC CLIENT PORTAL ACTIONS (NO STUDIO AUTH REQUIRED)
// ============================================================================

/**
 * Public Client Action: Retrieves public selection board with PIN & Expiry verification.
 */
export async function getPublicSelectionBoardAction(selectionId: string, pinCode?: string) {
  try {
    const board = await prisma.clientSelection.findFirst({
      where: { id: selectionId, deletedAt: null },
      include: {
        tenant: {
          select: {
            name: true,
            tradeName: true,
            logoUrl: true,
            phone: true,
            email: true,
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        eventBooking: {
          select: {
            id: true,
            title: true,
            bookingNumber: true,
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
                grandTotal: true,
                paidAmount: true,
                balanceDue: true,
                status: true,
              },
            },
          },
        },
        items: {
          include: {
            storageRecord: {
              select: {
                id: true,
                fileName: true,
                mimeType: true,
                sizeBytes: true,
                url: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        galleryFolders: {
          orderBy: { order: 'asc' },
          include: {
            photos: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (!board) {
      return { success: false, error: 'Selection gallery not found or link has expired.' };
    }

    // Check PIN requirement
    if (board.pinCode && board.pinCode.trim() !== '') {
      if (!pinCode || pinCode.trim() === '') {
        return {
          success: true,
          requiresPin: true,
          boardTitle: board.title,
          customerName: `${board.customer.firstName} ${board.customer.lastName}`,
          studioName: board.tenant.tradeName || board.tenant.name,
        };
      }

      if (pinCode.trim() !== board.pinCode.trim()) {
        return {
          success: false,
          error: 'Incorrect PIN code entered. Please check your invitation message.',
        };
      }
    }

    // Check Expiry & Lock
    const isPastDeadline = board.selectionDeadline ? new Date() > new Date(board.selectionDeadline) : false;
    let currentStatus = board.status;

    if (
      isPastDeadline &&
      (board.status === SelectionStatus.SHARED || board.status === SelectionStatus.IN_PROGRESS)
    ) {
      currentStatus = SelectionStatus.EXPIRED;
      // Mark as EXPIRED in DB
      await prisma.clientSelection.update({
        where: { id: selectionId },
        data: { status: SelectionStatus.EXPIRED, isSelectionLocked: true },
      });
    }

    const totalItems = board.items.length;
    const selectedCount = board.items.filter((i) => i.status === SelectionItemStatus.SELECTED).length;
    const rejectedCount = board.items.filter((i) => i.status === SelectionItemStatus.REJECTED).length;
    const favoriteCount = board.items.filter((i) => i.isFavorite).length;

    const isLockedEffective = Boolean(
      board.isSelectionLocked ||
      isPastDeadline ||
      currentStatus === SelectionStatus.EXPIRED ||
      currentStatus === SelectionStatus.SUBMITTED ||
      currentStatus === SelectionStatus.COMPLETED
    );

    // Strict Payment Gatekeeper: If linked booking invoice has balanceDue > 0, suppress download capability
    const invoice = board.eventBooking?.invoice;
    const balanceDue = invoice?.balanceDue ? Number(invoice.balanceDue) : 0;
    const isPaymentPending = balanceDue > 0;
    const allowDownloadsEffective = (board.allowDownloads ?? false) && !isPaymentPending;

    const sanitizedData = {
      id: board.id,
      title: board.title,
      status: currentStatus,
      instructions: board.instructions,
      operatorNotes: board.operatorNotes,
      selectionDeadline: board.selectionDeadline,
      isExpired: isPastDeadline && currentStatus !== SelectionStatus.SUBMITTED && currentStatus !== SelectionStatus.COMPLETED,
      isSelectionLocked: isLockedEffective,
      extensionRequested: board.extensionRequested,
      extensionReason: board.extensionReason,
      isStoragePurged: board.isStoragePurged,
      purgedAt: board.purgedAt,
      minSelections: board.minSelections,
      maxSelections: board.maxSelections,
      galleryMode: board.galleryMode || 'SELECTION',
      allowDownloads: allowDownloadsEffective,
      applyWatermark: board.applyWatermark ?? true,
      paymentRequired: isPaymentPending,
      balanceDue: balanceDue,
      invoiceNumber: invoice?.invoiceNumber || null,
      paymentGateReason: isPaymentPending
        ? `Full payment of invoice balance (₹${balanceDue.toLocaleString('en-IN')}) is required before high-resolution downloads are released.`
        : null,
      customer: {
        firstName: board.customer.firstName,
        lastName: board.customer.lastName,
      },
      studio: {
        name: board.tenant.tradeName || board.tenant.name,
        logoUrl: board.tenant.logoUrl,
        phone: board.tenant.phone,
        email: board.tenant.email,
      },
      eventBooking: board.eventBooking,
      stats: {
        totalItems,
        selectedCount,
        rejectedCount,
        favoriteCount,
      },
      items: board.items.map((item) => ({
        id: item.id,
        storageRecordId: item.storageRecordId,
        fileName: item.storageRecord.fileName,
        url: item.storageRecord.url,
        mimeType: item.storageRecord.mimeType,
        sizeBytes: item.storageRecord.sizeBytes,
        status: item.status,
        isFavorite: item.isFavorite,
        clientNote: item.clientNote,
      })),
      galleryFolders: board.galleryFolders?.map((f) => ({
        id: f.id,
        name: f.name,
        order: f.order,
        photos: f.photos.map((p) => ({
          id: p.id,
          url: p.url,
          filename: p.filename,
          isSelected: p.isSelected,
          clientNote: p.clientNote,
          aspectRatio: p.aspectRatio,
          width: p.width,
          height: p.height,
        })),
      })) || [],
    };

    return {
      success: true,
      requiresPin: false,
      data: serializePrisma(sanitizedData),
    };
  } catch (error: unknown) {
    console.error('[GET_PUBLIC_SELECTION_BOARD_ERROR]', error);
    return {
      success: false,
      error: (error as Error).message || 'Failed to load public selection gallery.',
    };
  }
}

/**
 * Public Client Action: Auto-saves item selection/favorite/note in real-time.
 */
export async function updatePublicSelectionItemStatusAction(
  selectionId: string,
  itemId: string,
  update: {
    status?: SelectionItemStatus;
    isFavorite?: boolean;
    clientNote?: string | null;
  },
  pinCode?: string
) {
  try {
    const board = await prisma.clientSelection.findFirst({
      where: { id: selectionId, deletedAt: null },
    });

    if (!board) {
      return { success: false, error: 'Selection board not found.' };
    }

    // Verify PIN if required
    if (board.pinCode && board.pinCode.trim() !== '') {
      if (!pinCode || pinCode.trim() !== board.pinCode.trim()) {
        return { success: false, error: 'Invalid PIN code.' };
      }
    }

    // Guard: changes cannot be made if expired or already submitted or locked
    const isPastDeadline = board.selectionDeadline ? new Date() > new Date(board.selectionDeadline) : false;
    if (
      board.isSelectionLocked ||
      board.status === SelectionStatus.EXPIRED ||
      board.status === SelectionStatus.EXTENSION_REQUESTED ||
      (isPastDeadline && board.status !== SelectionStatus.SUBMITTED && board.status !== SelectionStatus.COMPLETED)
    ) {
      return { success: false, error: 'Selection window has expired or is locked. Please request an extension.' };
    }

    if (board.status === SelectionStatus.SUBMITTED || board.status === SelectionStatus.COMPLETED) {
      return { success: false, error: 'Selection has already been finalized and locked.' };
    }

    // Verify item belongs to this selection board
    const item = await prisma.selectionItem.findFirst({
      where: { id: itemId, selectionId },
    });

    if (!item) {
      return { success: false, error: 'Item not found on this board.' };
    }

    const updateData: Prisma.SelectionItemUpdateInput = {};
    if (update.status !== undefined) updateData.status = update.status;
    if (update.isFavorite !== undefined) updateData.isFavorite = update.isFavorite;
    if (update.clientNote !== undefined) updateData.clientNote = update.clientNote ? update.clientNote.trim() : null;

    const updated = await prisma.selectionItem.update({
      where: { id: itemId },
      data: updateData,
    });

    // Auto transition to IN_PROGRESS if first selection occurs
    if (board.status === SelectionStatus.SHARED && update.status === SelectionItemStatus.SELECTED) {
      await prisma.clientSelection.update({
        where: { id: selectionId },
        data: { status: SelectionStatus.IN_PROGRESS },
      });
    }

    return {
      success: true,
      data: serializePrisma(updated),
    };
  } catch (error: unknown) {
    console.error('[UPDATE_PUBLIC_SELECTION_ITEM_ERROR]', error);
    return {
      success: false,
      error: (error as Error).message || 'Failed to auto-save item update.',
    };
  }
}

/**
 * Public Client Action: Toggles selection on a GalleryPhoto.
 */
export async function toggleGalleryPhotoSelectionAction(
  photoId: string,
  isSelected: boolean,
  pinCode?: string
) {
  try {
    const photo = await prisma.galleryPhoto.findUnique({
      where: { id: photoId },
      include: {
        folder: {
          include: {
            selection: true,
          },
        },
      },
    });

    if (!photo) {
      return { success: false, error: 'Photo not found.' };
    }

    const board = photo.folder?.selection;
    if (board && board.pinCode && board.pinCode.trim() !== '') {
      if (!pinCode || pinCode.trim() !== board.pinCode.trim()) {
        return { success: false, error: 'Invalid PIN code.' };
      }
    }

    if (board) {
      const isPastDeadline = board.selectionDeadline ? new Date() > new Date(board.selectionDeadline) : false;
      const isLocked = Boolean(
        board.isSelectionLocked ||
        isPastDeadline ||
        board.status === SelectionStatus.EXPIRED ||
        board.status === SelectionStatus.SUBMITTED ||
        board.status === SelectionStatus.COMPLETED
      );

      if (isLocked) {
        if (isPastDeadline && board.status !== SelectionStatus.EXPIRED && board.status !== SelectionStatus.SUBMITTED && board.status !== SelectionStatus.COMPLETED) {
          await prisma.clientSelection.update({
            where: { id: board.id },
            data: { status: SelectionStatus.EXPIRED, isSelectionLocked: true },
          }).catch((e) => console.warn('[AUTO_EXPIRE_BOARD_WARN]', e));
        }

        return {
          success: false,
          error: 'Selection locked: The deadline has expired or the gallery has been locked by the studio.',
        };
      }
    }

    const updated = await prisma.galleryPhoto.update({
      where: { id: photoId },
      data: { isSelected },
    });

    return {
      success: true,
      data: serializePrisma(updated),
    };
  } catch (error: unknown) {
    console.error('[TOGGLE_GALLERY_PHOTO_SELECTION_ERROR]', error);
    return {
      success: false,
      error: (error as Error).message || 'Failed to toggle photo selection.',
    };
  }
}

/**
 * Public Client Action: Requests an expiry extension from the studio with a mandatory reason.
 */
export async function requestSelectionExtensionAction(
  selectionId: string,
  reason: string,
  pinCode?: string
) {
  try {
    if (!reason || reason.trim().length < 5) {
      return { success: false, error: 'Please provide a valid reason for the extension request (minimum 5 characters).' };
    }

    const board = await prisma.clientSelection.findFirst({
      where: { id: selectionId, deletedAt: null },
    });

    if (!board) {
      return { success: false, error: 'Selection board not found.' };
    }

    if (board.pinCode && board.pinCode.trim() !== '') {
      if (!pinCode || pinCode.trim() !== board.pinCode.trim()) {
        return { success: false, error: 'Invalid PIN code.' };
      }
    }

    if (board.status === SelectionStatus.SUBMITTED || board.status === SelectionStatus.COMPLETED) {
      return { success: false, error: 'Selection has already been finalized and locked.' };
    }

    const updated = await prisma.clientSelection.update({
      where: { id: selectionId },
      data: {
        status: SelectionStatus.EXTENSION_REQUESTED,
        extensionRequested: true,
        extensionReason: reason.trim(),
      },
    });

    revalidatePath(`/customers/${board.customerId}`);
    revalidatePath('/operations');
    revalidatePath('/operations/selections');
    revalidatePath(`/gallery/selection/${selectionId}`);

    return {
      success: true,
      message: 'Extension request submitted. Pending studio approval.',
      data: serializePrisma(updated),
    };
  } catch (error: unknown) {
    console.error('[REQUEST_SELECTION_EXTENSION_ERROR]', error);
    return {
      success: false,
      error: (error as Error).message || 'Failed to request extension.',
    };
  }
}

/**
 * Public Client Action: Submits and locks the photo selection.
 * Triggers the automatic operational handoff:
 * - Transitions linked PostProductionJob to EDITING
 * - Transitions ALBUM_DESIGN workflow task to READY
 * - Transitions EventBooking journeyStatus to EDITING_IN_PROGRESS
 * - Logs milestone to ActivityTimeline
 */
export async function submitClientSelectionAction(selectionId: string, pinCode?: string) {
  try {
    const board = await prisma.clientSelection.findFirst({
      where: { id: selectionId, deletedAt: null },
      include: {
        customer: true,
        eventBooking: true,
        items: {
          where: { status: SelectionItemStatus.SELECTED },
        },
      },
    });

    if (!board) {
      return { success: false, error: 'Selection board not found.' };
    }

    if (board.pinCode && board.pinCode.trim() !== '') {
      if (!pinCode || pinCode.trim() !== board.pinCode.trim()) {
        return { success: false, error: 'Invalid PIN code.' };
      }
    }

    const isPastDeadline = board.selectionDeadline ? new Date() > new Date(board.selectionDeadline) : false;
    if (board.isSelectionLocked || isPastDeadline || board.status === SelectionStatus.EXPIRED) {
      return { success: false, error: 'Selection locked: The deadline has expired.' };
    }

    const selectedCount = board.items.length;

    if (board.minSelections && selectedCount < board.minSelections) {
      return {
        success: false,
        error: `Minimum requirement not met: please select at least ${board.minSelections} photos (currently selected: ${selectedCount}).`,
      };
    }

    if (board.maxSelections && selectedCount > board.maxSelections) {
      return {
        success: false,
        error: `Maximum selections exceeded: please select at most ${board.maxSelections} photos (currently selected: ${selectedCount}).`,
      };
    }

    // Execute handoff across Post-Production and Journey pipelines in a single atomic transaction
    const updated = await prisma.$transaction(async (tx) => {
      const updatedBoard = await tx.clientSelection.update({
        where: { id: selectionId },
        data: {
          status: SelectionStatus.SUBMITTED,
          isSelectionLocked: true,
          submittedAt: new Date(),
        },
      });

      // 1. Resolve and transition linked PostProductionJob
      let targetJobId = board.jobId;
      if (!targetJobId && board.eventBookingId) {
        const foundJob = await tx.postProductionJob.findUnique({
          where: { bookingId: board.eventBookingId },
          select: { id: true },
        });
        if (foundJob) targetJobId = foundJob.id;
      }

      if (targetJobId) {
        await tx.postProductionJob.update({
          where: { id: targetJobId },
          data: {
            status: PostProductionStatus.EDITING,
            notes: `Client submitted selection of ${selectedCount} photos. Pipeline automatically advanced to EDITING.`,
          },
        });

        // 2. Transition ALBUM_DESIGN task in WorkflowTask to READY
        await tx.workflowTask.updateMany({
          where: {
            jobId: targetJobId,
            OR: [
              { taskType: 'ALBUM_DESIGN' },
              { type: WorkflowType.ALBUM_DESIGN },
            ],
            status: { in: [TaskStatus.PENDING, TaskStatus.TODO] },
          },
          data: {
            status: TaskStatus.READY,
            notes: `Client selection finalized (${selectedCount} photos). Ready for album design layout.`,
          },
        });
      }

      // 3. Update EventBooking journeyStatus to EDITING_IN_PROGRESS
      if (board.eventBookingId) {
        await tx.eventBooking.update({
          where: { id: board.eventBookingId },
          data: {
            journeyStatus: JourneyStatus.EDITING_IN_PROGRESS,
          },
        });

        // Also transition any tasks directly attached to eventBookingId
        await tx.workflowTask.updateMany({
          where: {
            eventBookingId: board.eventBookingId,
            OR: [
              { taskType: 'ALBUM_DESIGN' },
              { type: WorkflowType.ALBUM_DESIGN },
            ],
            status: { in: [TaskStatus.PENDING, TaskStatus.TODO] },
          },
          data: {
            status: TaskStatus.READY,
            notes: `Client selection finalized (${selectedCount} photos). Ready for album design layout.`,
          },
        });
      }

      // 4. Log Milestone to ActivityTimeline
      await tx.activityTimeline.create({
        data: {
          tenantId: board.tenantId,
          entityType: 'CUSTOMER',
          entityId: board.customerId,
          action: 'CLIENT_SELECTION_SUBMITTED',
          notes: `Client submitted ${selectedCount} selected photos for "${board.title}". Project moved to Editing & Album Design.`,
          metadata: {
            selectionId: board.id,
            boardTitle: board.title,
            selectedCount,
            eventBookingId: board.eventBookingId,
            jobId: targetJobId,
          },
        },
      });

      return updatedBoard;
    });

    revalidatePath(`/customers/${board.customerId}`);
    revalidatePath('/operations');
    revalidatePath('/operations/selections');
    revalidatePath('/operations/post-production');
    revalidatePath(`/gallery/selection/${selectionId}`);

    return {
      success: true,
      message: 'Selection submitted successfully. Your album design layout has been queued with our studio team.',
      data: serializePrisma(updated),
    };
  } catch (error: unknown) {
    console.error('[SUBMIT_CLIENT_SELECTION_ERROR]', error);
    return {
      success: false,
      error: (error as Error).message || 'Failed to submit selection.',
    };
  }
}

/**
 * High-Resolution Master Download Gatekeeper:
 * Strictly enforces finance verification before releasing high-resolution master archives.
 * If the linked EventBooking has an Invoice with balanceDue > 0, halts delivery with PaymentRequiredError.
 */
export async function downloadMasterZipAction(selectionId: string, pinCode?: string) {
  try {
    if (!selectionId) {
      return { success: false, error: 'Selection gallery ID is required.' };
    }

    const board = await prisma.clientSelection.findFirst({
      where: { id: selectionId, deletedAt: null },
      include: {
        eventBooking: {
          include: {
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
                balanceDue: true,
                grandTotal: true,
                status: true,
              },
            },
          },
        },
        items: {
          where: { status: SelectionItemStatus.SELECTED },
          include: {
            storageRecord: true,
          },
        },
      },
    });

    if (!board) {
      return { success: false, error: 'Selection gallery not found.' };
    }

    // Verify PIN if set
    if (board.pinCode && board.pinCode.trim() !== '') {
      if (!pinCode || pinCode.trim() !== board.pinCode.trim()) {
        return { success: false, error: 'Invalid PIN code entered.' };
      }
    }

    // Strict Payment Gatekeeper Check
    const invoice = board.eventBooking?.invoice;
    const balanceDue = invoice?.balanceDue ? Number(invoice.balanceDue) : 0;

    if (balanceDue > 0) {
      return {
        success: false,
        error: `PaymentRequiredError: Full payment of invoice balance (₹${balanceDue.toLocaleString('en-IN')}) is required before high-resolution master downloads can be released.`,
        paymentRequired: true,
        balanceDue,
        invoiceNumber: invoice?.invoiceNumber,
      };
    }

    if (!board.allowDownloads) {
      return {
        success: false,
        error: 'High-resolution downloads are not enabled for this gallery by the studio.',
      };
    }

    const downloadAssets = board.items.map((i) => ({
      id: i.id,
      fileName: i.storageRecord.fileName,
      url: i.storageRecord.url,
      sizeBytes: i.storageRecord.sizeBytes,
      mimeType: i.storageRecord.mimeType,
    }));

    return {
      success: true,
      data: {
        selectionId: board.id,
        title: board.title,
        totalPhotos: downloadAssets.length,
        assets: downloadAssets,
      },
    };
  } catch (error: unknown) {
    console.error('[DOWNLOAD_MASTER_ZIP_ERROR]', error);
    return {
      success: false,
      error: (error as Error).message || 'Failed to process master download request.',
    };
  }
}

/**
 * One-Click Storage Purge Action.
 * Studio Admin: Permanently purges large cloud storage assets (Google Drive folder, S3/R2 objects)
 * after album delivery to eliminate ongoing cloud storage costs, while keeping all database records
 * (customer details, event bookings, selection decisions, notes, Lightroom metadata, and accounting) 100% intact.
 */
export async function purgeSelectionStorageAction(selectionId: string) {
  try {
    const { tenantId } = await validateSession();

    if (!selectionId) {
      return { success: false, error: 'Selection board ID is required.' };
    }

    const board = await prisma.clientSelection.findFirst({
      where: { id: selectionId, tenantId, deletedAt: null },
      include: {
        customer: true,
        galleryFolders: {
          include: {
            photos: true,
          },
        },
        items: {
          include: {
            storageRecord: true,
          },
        },
      },
    });

    if (!board) {
      return { success: false, error: 'Selection board not found or access denied.' };
    }

    if (board.isStoragePurged) {
      return {
        success: false,
        error: `Cloud storage for "${board.title}" has already been purged.`,
      };
    }

    // 1. Collect all cloud asset references (Google Drive IDs and S3/R2 keys)
    const allUrls: string[] = [];

    // From GalleryPhoto records
    board.galleryFolders.forEach((folder) => {
      folder.photos.forEach((photo) => {
        if (photo.url) allUrls.push(photo.url);
      });
    });

    // From SelectionItem -> StorageRecord
    board.items.forEach((item) => {
      if (item.storageRecord?.url) allUrls.push(item.storageRecord.url);
    });

    const uniqueUrls = Array.from(new Set(allUrls.map((u) => u.trim()).filter(Boolean)));

    // 2. Resolve tenant storage integration credentials
    const integration = await getDecryptedStorageCredentialsInternal(tenantId);
    let deletedFilesCount = 0;

    if (integration) {
      // Google Drive BYOS
      if (integration.provider === StorageProvider.GOOGLE_DRIVE && integration.credentials) {
        // 1. Locate and permanently delete the dedicated project folder from Google Drive
        let folderDeleted = false;
        try {
          const driveClient = getGoogleDriveClient(integration.credentials);
          const customerName = board.customer
            ? [board.customer.firstName, board.customer.lastName].filter(Boolean).join(' ').trim() || 'Customer'
            : 'Customer';
          const selectionTitle = board.title?.trim() || 'Selection Gallery';
          const customerFolderName = `${customerName} - ${selectionTitle}`;
          const cleanParentId = integration.credentials.folderId
            ? extractGoogleDriveId(integration.credentials.folderId) || integration.credentials.folderId.trim()
            : null;

          const escapedName = customerFolderName.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
          let query = `mimeType = 'application/vnd.google-apps.folder' and trashed = false and name = '${escapedName}'`;
          if (cleanParentId) {
            query += ` and '${cleanParentId}' in parents`;
          }

          const listRes = await driveClient.files.list({
            q: query,
            fields: 'files(id, name)',
            spaces: 'drive',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
            pageSize: 5,
          });

          if (listRes.data.files && listRes.data.files.length > 0) {
            for (const folder of listRes.data.files) {
              if (folder.id) {
                await deleteDriveFolder(folder.id, integration.credentials);
                folderDeleted = true;
              }
            }
          }
        } catch (folderDelErr: unknown) {
          console.warn('[PURGE_GDRIVE_PROJECT_FOLDER_WARN]', (folderDelErr as Error)?.message || folderDelErr);
        }

        // 2. Also batch-delete individual file IDs to guarantee no orphaned assets remain
        const driveFileIds = uniqueUrls
          .map((url) => extractGoogleDriveId(url))
          .filter((id): id is string => Boolean(id));

        if (driveFileIds.length > 0) {
          const result = await batchDeleteDriveAssets(driveFileIds, integration.credentials);
          deletedFilesCount += result.successCount;
        }

        if (folderDeleted && deletedFilesCount === 0) {
          deletedFilesCount = uniqueUrls.length;
        }
      } else if (
        (integration.provider === StorageProvider.AWS_S3 || integration.provider === StorageProvider.CLOUDFLARE_R2) &&
        integration.credentials
      ) {
        // S3 or Cloudflare R2
        const { credentials, provider } = integration;
        const isR2 = provider === StorageProvider.CLOUDFLARE_R2;
        const endpoint = isR2
          ? `https://${credentials.accountId}.r2.cloudflarestorage.com`
          : credentials.endpoint || undefined;
        const region = isR2 ? 'auto' : credentials.region || 'ap-south-1';

        const s3Client = new S3Client({
          region,
          endpoint,
          credentials: {
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey,
          },
        });

        // Extract object keys
        const objectKeys = uniqueUrls
          .map((url) => {
            try {
              if (url.startsWith('http')) {
                const parsed = new URL(url);
                return parsed.pathname.replace(/^\/+/, '');
              }
              return url.replace(/^\/+/, '');
            } catch {
              return null;
            }
          })
          .filter((key): key is string => Boolean(key && key.includes(tenantId)));

        if (objectKeys.length > 0) {
          try {
            const deleteResult = await s3Client.send(
              new DeleteObjectsCommand({
                Bucket: credentials.bucket,
                Delete: {
                  Objects: objectKeys.map((Key) => ({ Key })),
                  Quiet: true,
                },
              })
            );
            deletedFilesCount += objectKeys.length - (deleteResult.Errors?.length || 0);
          } catch (s3Err: unknown) {
            console.error('[PURGE_S3_STORAGE_ERROR]', (s3Err as Error)?.message || s3Err);
          }
        }
      }
    }

    // 3. Mark the selection board as storage purged in DB
    const now = new Date();
    const updated = await prisma.clientSelection.update({
      where: { id: selectionId },
      data: {
        isStoragePurged: true,
        purgedAt: now,
      },
    });

    // 4. Revalidate paths
    revalidatePath('/operations');
    revalidatePath('/operations/selections');
    revalidatePath(`/gallery/selection/${selectionId}`);
    revalidatePath(`/customers/${board.customerId}`);

    return {
      success: true,
      data: serializePrisma({
        id: updated.id,
        title: updated.title,
        isStoragePurged: updated.isStoragePurged,
        purgedAt: updated.purgedAt,
        deletedFilesCount,
        totalTracked: uniqueUrls.length,
      }),
    };
  } catch (error: unknown) {
    console.error('[PURGE_SELECTION_STORAGE_ERROR]', error);
    return {
      success: false,
      error: (error as Error).message || 'Failed to purge cloud storage for this selection board.',
    };
  }
}

const unlockClientSelectionSchema = z.object({
  selectionId: z.string().uuid('Invalid selection ID'),
  operatorNotes: z.string().min(1, 'Please provide notes/instructions for the client explaining what needs to be changed.'),
});

/**
 * Studio Operator Action: Unlocks a submitted or locked client selection board,
 * reverting status to IN_PROGRESS and setting operator notes so the client can modify selections.
 */
export async function unlockClientSelectionAction(selectionId: string, operatorNotes: string) {
  try {
    const { tenantId } = await validateSession();
    const validated = unlockClientSelectionSchema.parse({ selectionId, operatorNotes });

    const board = await prisma.clientSelection.findFirst({
      where: { id: validated.selectionId, tenantId, deletedAt: null },
    });

    if (!board) {
      return { success: false, error: 'Selection board not found or access denied.' };
    }

    const updated = await prisma.clientSelection.update({
      where: { id: validated.selectionId },
      data: {
        isSelectionLocked: false,
        status: SelectionStatus.IN_PROGRESS,
        operatorNotes: validated.operatorNotes.trim(),
      },
    });

    revalidatePath('/operations');
    revalidatePath('/operations/selections');
    revalidatePath(`/gallery/selection/${validated.selectionId}`);
    revalidatePath(`/customers/${board.customerId}`);

    return {
      success: true,
      message: 'Selection board has been unlocked and sent back to the client for revisions.',
      data: serializePrisma(updated),
    };
  } catch (error: unknown) {
    console.error('[UNLOCK_CLIENT_SELECTION_ERROR]', error);
    return {
      success: false,
      error: (error as Error).message || 'Failed to unlock selection board.',
    };
  }
}
