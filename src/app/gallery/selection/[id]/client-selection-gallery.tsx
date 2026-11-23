'use client';

import React, { useState, useTransition, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  CheckCircle2,
  XCircle,
  Star,
  Clock,
  Lock,
  Unlock,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Send,
  Check,
  X,
  RefreshCw,
  Shield,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileArchive,
  ShieldAlert,
  ArrowDownToLine,
  Layers,
  Heart,
  Folder,
} from 'lucide-react';
import {
  getPublicSelectionBoardAction,
  updatePublicSelectionItemStatusAction,
  toggleGalleryPhotoSelectionAction,
  requestSelectionExtensionAction,
  submitClientSelectionAction,
} from '@/actions/selection.actions';
import { toast } from 'sonner';
import JSZip from 'jszip';
import Image from 'next/image';
import { SecureDriveImage } from '@/components/gallery/secure-drive-image';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface GalleryPhotoItem {
  id: string;
  storageRecordId?: string;
  fileName: string;
  url?: string | null;
  mimeType?: string;
  sizeBytes?: number;
  status: 'PENDING' | 'SELECTED' | 'REJECTED';
  isFavorite: boolean;
  clientNote?: string | null;
  folderId?: string | null;
  folderName?: string | null;
}

export interface GalleryFolderItem {
  id: string;
  name: string;
  order: number;
  photos?: Array<{
    id: string;
    url: string;
    filename: string;
    isSelected: boolean;
    clientNote?: string | null;
    width?: number;
    height?: number;
  }>;
}

export interface GalleryBoard {
  id: string;
  title: string;
  status: 'DRAFT' | 'SHARED' | 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED' | 'EXTENSION_REQUESTED' | 'COMPLETED';
  instructions?: string | null;
  selectionDeadline?: string | Date | null;
  isExpired: boolean;
  isSelectionLocked?: boolean;
  operatorNotes?: string | null;
  extensionRequested?: boolean;
  extensionReason?: string | null;
  minSelections?: number | null;
  maxSelections?: number | null;
  galleryMode?: 'SELECTION' | 'DELIVERY' | string;
  allowDownloads?: boolean;
  applyWatermark?: boolean;
  customer: {
    firstName: string;
    lastName: string;
  };
  studio: {
    name: string;
    logoUrl?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  eventBooking?: {
    title: string;
    bookingNumber: string;
  } | null;
  stats: {
    totalItems: number;
    selectedCount: number;
    rejectedCount: number;
    favoriteCount: number;
  };
  items: GalleryPhotoItem[];
  galleryFolders?: GalleryFolderItem[];
}

interface ClientSelectionGalleryProps {
  initialData: any;
  selectionId: string;
}

// Progressive chunk sizes for infinite-scrolling large 1000+ photo collections
const INITIAL_CHUNK_SIZE = 48;
const CHUNK_INCREMENT = 48;

/**
 * Curated high-resolution photography assets for simulated BYOS previews.
 */
export const CURATED_DEMO_PHOTOS = [
  'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=80',
];

/**
 * High-resolution inline SVG placeholder that guarantees 100% offline and network reliability.
 * Prevents black box appearances and broken alt text when mock/broken BYOS URLs fail to load.
 */
export const FALLBACK_PHOTO_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" fill="none">
  <defs>
    <linearGradient id="proofBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#18181b"/>
      <stop offset="50%" stop-color="#27272a"/>
      <stop offset="100%" stop-color="#09090b"/>
    </linearGradient>
    <radialGradient id="lensGlow" cx="50%" cy="45%" r="45%">
      <stop offset="0%" stop-color="rgba(147, 51, 234, 0.18)"/>
      <stop offset="60%" stop-color="rgba(59, 130, 246, 0.08)"/>
      <stop offset="100%" stop-color="rgba(0, 0, 0, 0)"/>
    </radialGradient>
    <pattern id="proofGrid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(255, 255, 255, 0.025)" stroke-width="1"/>
    </pattern>
  </defs>
  
  <rect width="1200" height="800" fill="url(#proofBg)"/>
  <rect width="1200" height="800" fill="url(#lensGlow)"/>
  <rect width="1200" height="800" fill="url(#proofGrid)"/>

  <g transform="translate(600, 360)">
    <circle cx="0" cy="0" r="84" fill="rgba(24, 24, 27, 0.8)" stroke="rgba(255, 255, 255, 0.15)" stroke-width="2"/>
    <circle cx="0" cy="0" r="74" fill="none" stroke="rgba(168, 85, 247, 0.4)" stroke-width="1.5" stroke-dasharray="4 6"/>
    <circle cx="0" cy="0" r="56" fill="rgba(39, 39, 42, 0.9)" stroke="rgba(255, 255, 255, 0.1)" stroke-width="2"/>
    <circle cx="0" cy="0" r="32" fill="rgba(147, 51, 234, 0.25)"/>
    <circle cx="0" cy="0" r="14" fill="rgba(255, 255, 255, 0.4)"/>
    <path d="M -30 -30 Q 0 -45 30 -30 Q 0 -38 -30 -30 Z" fill="rgba(255, 255, 255, 0.3)"/>
    <path d="M -50 -84 L -35 -110 L 35 -110 L 50 -84 Z" fill="rgba(39, 39, 42, 0.8)" stroke="rgba(255, 255, 255, 0.12)" stroke-width="1.5"/>
    <circle cx="36" cy="-97" r="4" fill="#ef4444"/>
  </g>

  <text x="600" y="500" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="700" fill="#f4f4f5" letter-spacing="1.5">PHOTO PROOF ASSET</text>
  <text x="600" y="534" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="500" fill="#a1a1aa" letter-spacing="0.5">High-Resolution BYOS Cloud Storage Preview</text>
  <rect x="500" y="562" width="200" height="26" rx="13" fill="rgba(255, 255, 255, 0.06)" stroke="rgba(255, 255, 255, 0.1)"/>
  <text x="600" y="579" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="600" fill="#d4d4d8" letter-spacing="0.5">STUDIO PROOFING</text>
</svg>
`)}`;

/**
 * Utility check: determines whether a photo or asset is sourced from Google Drive.
 */
export function isGoogleDriveUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  return trimmed.includes('drive.google.com') || trimmed.includes('googleusercontent.com');
}

/**
 * Resolves a safe image URL for BYOS assets, providing instant high-quality Unsplash fallbacks
 * for simulated / mock local storage paths, and direct rendering links for Google Drive assets.
 */
export function getSafeImageUrl(url: string | null | undefined, seedId?: string): string {
  if (!url || url.trim() === '') {
    return FALLBACK_PHOTO_SVG;
  }
  const trimmed = url.trim();

  // Convert Google Drive links to direct rendering format using Thumbnail API: https://drive.google.com/thumbnail?id=FILE_ID&sz=w2500
  if (trimmed.includes('drive.google.com') || trimmed.includes('googleusercontent.com')) {
    if (trimmed.startsWith('https://drive.google.com/thumbnail?id=') && trimmed.includes('&sz=')) {
      return trimmed;
    }
    const fileDMatch = trimmed.match(/\/(?:file\/d|folders|open)\/([a-zA-Z0-9_-]+)/);
    if (fileDMatch && fileDMatch[1]) {
      return `https://drive.google.com/thumbnail?id=${fileDMatch[1]}&sz=w2500`;
    }
    const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
      return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w2500`;
    }
    const userContentMatch = trimmed.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
    if (userContentMatch && userContentMatch[1]) {
      return `https://drive.google.com/thumbnail?id=${userContentMatch[1]}&sz=w2500`;
    }
  }

  // Check if this is a simulated local BYOS upload endpoint or placeholder
  if (
    trimmed.includes('byos-simulated-cloud.pratimaerp.com') ||
    trimmed.includes('example.com') ||
    trimmed.startsWith('/mock/') ||
    trimmed.startsWith('mock-')
  ) {
    const seed = seedId || trimmed;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % CURATED_DEMO_PHOTOS.length;
    return CURATED_DEMO_PHOTOS[index];
  }
  return trimmed;
}

// ============================================================================
// COUNTDOWN HELPERS
// ============================================================================

export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  totalMs: number;
}

export function calculateTimeRemaining(selectionDeadline: string | Date | null | undefined): TimeRemaining | null {
  if (!selectionDeadline) return null;
  const target = new Date(selectionDeadline).getTime();
  if (isNaN(target)) return null;

  const now = Date.now();
  const diff = target - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, totalMs: 0 };
  }

  const seconds = Math.floor((diff / 1000) % 60);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  return { days, hours, minutes, seconds, isExpired: false, totalMs: diff };
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ClientSelectionGallery({ initialData, selectionId }: ClientSelectionGalleryProps) {
  const [board, setBoard] = useState<GalleryBoard | null>(initialData.data || null);
  const [requiresPin, setRequiresPin] = useState<boolean>(initialData.requiresPin || false);
  const [pinInput, setPinInput] = useState('');
  const [currentPin, setCurrentPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const [savingItemId, setSavingItemId] = useState<string | null>(null);

  // Live countdown timer state that refreshes every second
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(() =>
    calculateTimeRemaining(initialData.data?.selectionDeadline || initialData.data?.expiresAt)
  );

  // Filter states
  const [activeFolderId, setActiveFolderId] = useState<string>('ALL');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'SELECTED' | 'FAVORITES' | 'PENDING' | 'REJECTED'>('ALL');

  // Progressive rendering state for 1000+ image performance
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_CHUNK_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Note Dialog state
  const [editingNoteItem, setEditingNoteItem] = useState<GalleryPhotoItem | null>(null);
  const [tempNote, setTempNote] = useState('');

  // Submit confirmation dialog
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);

  // Lightbox state with zoom and swipe
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Bulk ZIP Download state (Delivery Vault mode)
  const [zipProgress, setZipProgress] = useState<{ active: boolean; current: number; total: number } | null>(null);

  // Expiry extension request state
  const [extensionRequested, setExtensionRequested] = useState<boolean>(
    Boolean(initialData.data?.extensionRequested || initialData.data?.status === 'EXTENSION_REQUESTED')
  );
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [extensionReasonInput, setExtensionReasonInput] = useState('');
  const [extensionReasonError, setExtensionReasonError] = useState<string | null>(null);

  // Determine operational modes based on board flags
  const isDeliveryMode = board?.galleryMode === 'DELIVERY';
  const isSelectionMode = !isDeliveryMode;
  const canDownload = Boolean(board?.allowDownloads || isDeliveryMode);
  const showWatermark = Boolean(isSelectionMode && board?.applyWatermark !== false);

  // Interval to update live countdown timer
  useEffect(() => {
    const deadline = board?.selectionDeadline || (board as any)?.expiresAt;
    if (!deadline) {
      setTimeRemaining(null);
      return;
    }

    setTimeRemaining(calculateTimeRemaining(deadline));

    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining(deadline);
      setTimeRemaining(remaining);
      if (remaining?.isExpired && !board?.isExpired) {
        setBoard((prev) => (prev ? { ...prev, isExpired: true, isSelectionLocked: true } : prev));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [board?.selectionDeadline, (board as any)?.expiresAt, board?.isExpired]);

  // Determine if board is locked by admin, expired, or submitted
  const isLockedState = Boolean(
    board?.isSelectionLocked ||
    board?.isExpired ||
    timeRemaining?.isExpired ||
    (board?.selectionDeadline && new Date(board.selectionDeadline).getTime() <= Date.now()) ||
    board?.status === 'EXPIRED' ||
    board?.status === 'SUBMITTED' ||
    board?.status === 'COMPLETED'
  );

  // Reset pagination limit when switching filters
  useEffect(() => {
    setVisibleLimit(INITIAL_CHUNK_SIZE);
  }, [activeFolderId, activeFilter]);

  // Synchronize gallery folders into unified items array if needed
  useEffect(() => {
    if (!board) return;
    if (board.galleryFolders && board.galleryFolders.length > 0) {
      const extraItems: GalleryPhotoItem[] = [];
      for (const f of board.galleryFolders) {
        for (const p of f.photos || []) {
          if (!board.items.some((i) => i.id === p.id)) {
            extraItems.push({
              id: p.id,
              storageRecordId: p.id,
              fileName: p.filename,
              url: p.url,
              mimeType: 'image/jpeg',
              sizeBytes: 0,
              status: p.isSelected ? 'SELECTED' : 'PENDING',
              isFavorite: false,
              clientNote: p.clientNote,
              folderId: f.id,
              folderName: f.name,
            });
          }
        }
      }
      if (extraItems.length > 0) {
        setBoard((prev) => {
          if (!prev) return prev;
          const combined = [...prev.items, ...extraItems];
          return {
            ...prev,
            items: combined,
            stats: {
              ...prev.stats,
              totalItems: combined.length,
              selectedCount: combined.filter((i) => i.status === 'SELECTED').length,
            },
          };
        });
      }
    }
  }, [initialData]);

  // Handle PIN Unlock
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);

    if (!pinInput.trim()) {
      setPinError('Please enter your 4-6 digit PIN.');
      return;
    }

    startTransition(async () => {
      const result = await getPublicSelectionBoardAction(selectionId, pinInput.trim());

      if (!result.success || !result.data) {
        setPinError(result.error || 'Incorrect PIN code entered.');
        return;
      }

      setBoard(result.data as GalleryBoard);
      setCurrentPin(pinInput.trim());
      setRequiresPin(false);
      toast.success('Gallery unlocked successfully!');
    });
  };

  // Toggle Photo Selection (SELECTED / PENDING) with Heart -> Green Tick
  const handleToggleSelect = (item: GalleryPhotoItem) => {
    if (!board || isLockedState) {
      toast.error('Photo selection is locked. The deadline has expired or the gallery has been finalized.');
      return;
    }

    const nextStatus: 'PENDING' | 'SELECTED' = item.status === 'SELECTED' ? 'PENDING' : 'SELECTED';
    const isNowSelected = nextStatus === 'SELECTED';

    // Optimistic UI update
    setBoard((prev) => {
      if (!prev) return prev;
      const updatedItems = prev.items.map((i) =>
        i.id === item.id ? { ...i, status: nextStatus } : i
      );
      const selectedCount = updatedItems.filter((i) => i.status === 'SELECTED').length;
      const rejectedCount = updatedItems.filter((i) => i.status === 'REJECTED').length;

      // Update folder-specific counts if folders exist
      const updatedFolders = prev.galleryFolders?.map((f) => {
        if (f.id === item.folderId) {
          return {
            ...f,
            photos: f.photos?.map((p) =>
              p.id === item.id ? { ...p, isSelected: isNowSelected } : p
            ),
          };
        }
        return f;
      });

      return {
        ...prev,
        status: prev.status === 'SHARED' ? 'IN_PROGRESS' : prev.status,
        items: updatedItems,
        galleryFolders: updatedFolders,
        stats: {
          ...prev.stats,
          selectedCount,
          rejectedCount,
        },
      };
    });

    setSavingItemId(item.id);
    startTransition(async () => {
      let result: any;
      if (item.folderId) {
        // Toggle GalleryPhoto
        result = await toggleGalleryPhotoSelectionAction(item.id, isNowSelected, currentPin);
      } else {
        // Toggle SelectionItem
        result = await updatePublicSelectionItemStatusAction(
          board.id,
          item.id,
          { status: nextStatus },
          currentPin
        );
      }

      setSavingItemId(null);
      if (!result.success) {
        toast.error(result.error || 'Failed to save choice.');
        // Revert on error
        setBoard((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            items: prev.items.map((i) => (i.id === item.id ? item : i)),
          };
        });
      }
    });
  };

  // Toggle Photo Favorite
  const handleToggleFavorite = (item: GalleryPhotoItem) => {
    if (!board || isLockedState) return;

    const nextFav = !item.isFavorite;

    setBoard((prev) => {
      if (!prev) return prev;
      const updatedItems = prev.items.map((i) =>
        i.id === item.id ? { ...i, isFavorite: nextFav } : i
      );
      const favoriteCount = updatedItems.filter((i) => i.isFavorite).length;
      return {
        ...prev,
        items: updatedItems,
        stats: { ...prev.stats, favoriteCount },
      };
    });

    setSavingItemId(item.id);
    startTransition(async () => {
      const result = await updatePublicSelectionItemStatusAction(
        board.id,
        item.id,
        { isFavorite: nextFav },
        currentPin
      );

      setSavingItemId(null);
      if (!result.success) {
        toast.error(result.error || 'Failed to update favorite.');
      }
    });
  };

  // Toggle Photo Reject (REJECTED / PENDING)
  const handleToggleReject = (item: GalleryPhotoItem) => {
    if (!board || isLockedState) return;

    const nextStatus: 'PENDING' | 'REJECTED' = item.status === 'REJECTED' ? 'PENDING' : 'REJECTED';

    setBoard((prev) => {
      if (!prev) return prev;
      const updatedItems = prev.items.map((i) =>
        i.id === item.id ? { ...i, status: nextStatus } : i
      );
      const selectedCount = updatedItems.filter((i) => i.status === 'SELECTED').length;
      const rejectedCount = updatedItems.filter((i) => i.status === 'REJECTED').length;
      return {
        ...prev,
        items: updatedItems,
        stats: { ...prev.stats, selectedCount, rejectedCount },
      };
    });

    setSavingItemId(item.id);
    startTransition(async () => {
      const result = await updatePublicSelectionItemStatusAction(
        board.id,
        item.id,
        { status: nextStatus },
        currentPin
      );

      setSavingItemId(null);
      if (!result.success) {
        toast.error(result.error || 'Failed to save rejection.');
      }
    });
  };

  // Open Retouching Note Dialog
  const handleOpenNote = (item: GalleryPhotoItem) => {
    if (!board || isLockedState) return;
    setEditingNoteItem(item);
    setTempNote(item.clientNote || '');
  };

  // Save Retouching Note
  const handleSaveNote = () => {
    if (!editingNoteItem || !board) return;

    const noteText = tempNote.trim();
    const itemId = editingNoteItem.id;

    setBoard((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((i) =>
          i.id === itemId ? { ...i, clientNote: noteText || null } : i
        ),
      };
    });

    setEditingNoteItem(null);

    startTransition(async () => {
      const result = await updatePublicSelectionItemStatusAction(
        board.id,
        itemId,
        { clientNote: noteText || null },
        currentPin
      );

      if (result.success) {
        toast.success('Retouching note saved.');
      } else {
        toast.error(result.error || 'Failed to save note.');
      }
    });
  };

  // Submit Extension Request with Reason
  const handleSubmitExtensionRequest = () => {
    if (!board) return;
    setExtensionReasonError(null);

    const trimmedReason = extensionReasonInput.trim();
    if (trimmedReason.length < 5) {
      setExtensionReasonError('Please provide a valid reason (minimum 5 characters) explaining why an extension is needed.');
      return;
    }

    startTransition(async () => {
      const result = await requestSelectionExtensionAction(board.id, trimmedReason, currentPin);
      if (result.success) {
        setExtensionRequested(true);
        setBoard((prev) =>
          prev
            ? {
                ...prev,
                status: 'EXTENSION_REQUESTED',
                extensionRequested: true,
                extensionReason: trimmedReason,
              }
            : prev
        );
        setIsExtensionModalOpen(false);
        setExtensionReasonInput('');
        toast.success('Your extension request has been submitted for studio review.');
      } else {
        setExtensionReasonError(result.error || 'Failed to submit extension request.');
        toast.error(result.error || 'Failed to send request.');
      }
    });
  };

  // Submit Final Selection
  const handleSubmitSelection = () => {
    if (!board) return;

    startTransition(async () => {
      const result = await submitClientSelectionAction(board.id, currentPin);
      if (result.success) {
        setIsSubmitDialogOpen(false);
        setBoard((prev) => (prev ? { ...prev, status: 'SUBMITTED' } : prev));
        toast.success('Your selection has been successfully locked and sent to our production editors!');
      } else {
        toast.error(result.error || 'Failed to submit selection.');
      }
    });
  };

  // Delivery Vault: Bulk ZIP Download
  const handleDownloadAllZip = async () => {
    if (!board || !canDownload) return;

    const validItems = board.items.filter((i) => i.url);
    if (validItems.length === 0) {
      toast.error('No downloadable media available.');
      return;
    }

    setZipProgress({ active: true, current: 0, total: validItems.length });
    const zip = new JSZip();

    try {
      for (let i = 0; i < validItems.length; i++) {
        const item = validItems[i];
        try {
          const safeUrl = getSafeImageUrl(item.url, item.id);
          const response = await fetch(safeUrl);
          const blob = await response.blob();
          const cleanName = item.fileName || `photo_${i + 1}.jpg`;
          zip.file(cleanName, blob);
        } catch (fetchErr) {
          console.warn(`Failed to package ${item.fileName}:`, fetchErr);
        }
        setZipProgress({ active: true, current: i + 1, total: validItems.length });
      }

      toast.info('Assembling ZIP archive...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(zipBlob);

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${board.title.replace(/[^a-z0-9]/gi, '_')}_Master_Delivery.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      toast.success('All photos packaged and downloaded successfully!');
    } catch (err: any) {
      console.error('[BULK_ZIP_ERROR]', err);
      toast.error('Failed to bundle ZIP. You can still download individual photos.');
    } finally {
      setZipProgress(null);
    }
  };

  // Compute Folder Tabs with dynamic counts
  const folderTabs = useMemo(() => {
    if (!board) return [];

    const tabs: Array<{ id: string; name: string; totalCount: number; selectedCount: number }> = [
      {
        id: 'ALL',
        name: 'All Folders',
        totalCount: board.items.length,
        selectedCount: board.items.filter((i) => i.status === 'SELECTED').length,
      },
    ];

    if (board.galleryFolders && board.galleryFolders.length > 0) {
      for (const f of board.galleryFolders) {
        const folderPhotos = board.items.filter((item) => item.folderId === f.id);
        tabs.push({
          id: f.id,
          name: f.name,
          totalCount: folderPhotos.length,
          selectedCount: folderPhotos.filter((p) => p.status === 'SELECTED').length,
        });
      }
    }

    return tabs;
  }, [board]);

  const activeFolderTab = useMemo(() => {
    return folderTabs.find((f) => f.id === activeFolderId) || folderTabs[0];
  }, [folderTabs, activeFolderId]);

  // Filter items by folder and status
  const filteredItems = useMemo(() => {
    if (!board) return [];

    let list = board.items;

    // Filter by Folder tab
    if (activeFolderId !== 'ALL') {
      list = list.filter((item) => item.folderId === activeFolderId);
    }

    // Filter by Status tab
    if (activeFilter === 'SELECTED') {
      list = list.filter((item) => item.status === 'SELECTED');
    } else if (activeFilter === 'FAVORITES') {
      list = list.filter((item) => item.isFavorite);
    } else if (activeFilter === 'PENDING') {
      list = list.filter((item) => item.status === 'PENDING');
    } else if (activeFilter === 'REJECTED') {
      list = list.filter((item) => item.status === 'REJECTED');
    }

    return list;
  }, [board, activeFolderId, activeFilter]);

  // Infinite Scroll Slice
  const displayedItems = useMemo(() => {
    return filteredItems.slice(0, visibleLimit);
  }, [filteredItems, visibleLimit]);

  // Infinite Scroll IntersectionObserver
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && visibleLimit < filteredItems.length) {
        setVisibleLimit((prev) => Math.min(prev + CHUNK_INCREMENT, filteredItems.length));
      }
    },
    [visibleLimit, filteredItems.length]
  );

  useEffect(() => {
    const element = sentinelRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '400px',
      threshold: 0.1,
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [handleObserver]);

  // Lightbox Keyboard Navigation (ArrowLeft, ArrowRight, Escape)
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxIndex(null);
        setZoomLevel(1);
      } else if (e.key === 'ArrowLeft' && lightboxIndex > 0) {
        setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
        setZoomLevel(1);
      } else if (e.key === 'ArrowRight' && lightboxIndex < filteredItems.length - 1) {
        setLightboxIndex((prev) => (prev !== null && prev < filteredItems.length - 1 ? prev + 1 : prev));
        setZoomLevel(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, filteredItems.length]);

  // Lightbox touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || lightboxIndex === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;

    if (deltaX > 45 && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
      setZoomLevel(1);
    } else if (deltaX < -45 && lightboxIndex < filteredItems.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
      setZoomLevel(1);
    }
    setTouchStartX(null);
  };

  // Watermark text & repeating SVG data URI pattern
  const watermarkText = `${(board?.studio.name || 'STUDIO').toUpperCase()} • PROOF ONLY • DO NOT REPRODUCE`;
  const repeatingWatermarkSvg = useMemo(() => {
    const encodedText = encodeURIComponent(watermarkText);
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220" viewBox="0 0 320 220"><text x="160" y="110" fill="rgba(255,255,255,0.22)" font-size="11" font-weight="900" font-family="-apple-system,BlinkMacSystemFont,sans-serif" text-anchor="middle" transform="rotate(-30 160 110)" letter-spacing="2.5">${encodedText}</text></svg>`;
  }, [watermarkText]);

  // 1. PIN Lock Screen
  if (requiresPin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/40 flex items-center justify-center p-4 select-none">
        <style>{`@media print { body, html { display: none !important; } }`}</style>

        <Card className="max-w-md w-full border shadow-lg bg-card/90 backdrop-blur-md">
          <CardContent className="p-8 space-y-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto ring-8 ring-primary/5">
              <Lock className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold tracking-tight">Protected Gallery</h1>
              <p className="text-xs text-muted-foreground">
                {initialData.studioName || 'Studio Gallery'} • Photo Portal
              </p>
              <p className="text-sm text-muted-foreground pt-1">
                Please enter the security PIN provided in your invitation message to view your photos.
              </p>
            </div>

            {pinError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                {pinError}
              </div>
            )}

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="password"
                  maxLength={10}
                  placeholder="Enter 4-6 digit PIN"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="text-center tracking-widest text-lg font-mono h-12"
                  autoFocus
                />
              </div>

              <Button type="submit" disabled={isPending} className="w-full h-11 text-sm font-medium">
                {isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Verifying Access...
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4 mr-2" />
                    Unlock Gallery
                  </>
                )}
              </Button>
            </form>

            <div className="text-[11px] text-muted-foreground border-t pt-4 flex items-center justify-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span>AES-256 encrypted digital proofing portal</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!board) return null;

  const isLockedDueToExpiry = isLockedState;

  const activeLightboxItem = lightboxIndex !== null ? filteredItems[lightboxIndex] : null;
  const safeLightboxUrl = activeLightboxItem ? getSafeImageUrl(activeLightboxItem.url, activeLightboxItem.id) : '';
  const isLightboxDriveImage = Boolean(
    (activeLightboxItem?.url && activeLightboxItem.url.includes('drive.google.com')) ||
    isGoogleDriveUrl(safeLightboxUrl)
  );

  return (
    <div
      className={`min-h-screen bg-background text-foreground flex flex-col ${
        isSelectionMode ? 'select-none' : ''
      }`}
      onContextMenu={(e) => {
        if (isSelectionMode) {
          e.preventDefault();
        }
      }}
    >
      {/* Anti-Theft CSS Print Invalidation */}
      {isSelectionMode && (
        <style>{`
          @media print {
            body, html {
              display: none !important;
              visibility: hidden !important;
            }
          }
        `}</style>
      )}

      {/* Top Header & Studio Branding */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Studio Brand and Gallery Title */}
          <div className="flex items-center gap-3 min-w-0">
            {board.studio.logoUrl ? (
              <img
                src={board.studio.logoUrl}
                alt={board.studio.name}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
                className="w-9 h-9 rounded-lg object-cover border border-border/80 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Camera className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-sm sm:text-base truncate leading-tight">
                  {board.title}
                </h1>
                {isDeliveryMode ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] hidden sm:inline-flex">
                    <ArrowDownToLine className="w-3 h-3 mr-1" />
                    Delivery Vault
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] hidden sm:inline-flex">
                    <ShieldAlert className="w-3 h-3 mr-1" />
                    Proofing Mode
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                <span>{board.studio.name}</span>
                <span>•</span>
                <span>{board.customer.firstName} {board.customer.lastName}</span>
                {board.eventBooking?.bookingNumber && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-[11px]">{board.eventBooking.bookingNumber}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-2.5">
            {canDownload && (
              <Button
                variant={isDeliveryMode ? 'default' : 'outline'}
                size="sm"
                onClick={handleDownloadAllZip}
                disabled={Boolean(zipProgress?.active)}
                className={`text-xs h-9 gap-1.5 shadow-xs font-semibold ${
                  isDeliveryMode ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
                }`}
              >
                {zipProgress?.active ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Packing ZIP ({zipProgress.current}/{zipProgress.total})...</span>
                  </>
                ) : (
                  <>
                    <FileArchive className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Download All (ZIP)</span>
                    <span className="sm:hidden">ZIP</span>
                  </>
                )}
              </Button>
            )}

            {isSelectionMode && board.status !== 'SUBMITTED' && !isLockedDueToExpiry && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsSubmitDialogOpen(true)}
                disabled={board.stats.selectedCount === 0}
                className="text-xs h-9 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Submit ({board.stats.selectedCount})</span>
                <span className="sm:hidden">Submit</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Operator Notes Banner on Unlocked Selection */}
      {board.operatorNotes && !isLockedState && (
        <div className="w-full bg-amber-500/15 border-b border-amber-500/30 text-amber-950 dark:text-amber-200 px-4 py-3.5 sm:px-6">
          <div className="max-w-7xl mx-auto flex items-start gap-3 text-left">
            <div className="w-9 h-9 rounded-xl bg-amber-500/25 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-sm text-amber-950 dark:text-amber-100">
                  Studio Note: Selection Unlocked for Changes
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40"
                >
                  Revisions Permitted
                </Badge>
              </div>
              <p className="text-xs text-amber-900/90 dark:text-amber-200/90 whitespace-pre-wrap mt-1 leading-relaxed">
                {board.operatorNotes}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3-Stage VIP Selection Workflow Banner */}
      {isSelectionMode && (
        <div className="w-full border-b">
          {isLockedState ? (
            /* STAGE 2 & 3: EXPIRED / LOCKED STATE */
            <div className="bg-destructive/15 border-b border-destructive/20 text-destructive px-4 py-3 sm:px-6">
              <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4 text-destructive" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm flex items-center justify-center sm:justify-start gap-2">
                      <span>🔒 Selection Window Closed. Studio curation pending.</span>
                      {board.status === 'SUBMITTED' && (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                          Finalized
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground pt-0.5">
                      {board.status === 'SUBMITTED'
                        ? 'Your selections have been submitted and locked for production printing.'
                        : 'The allotted VIP photo proofing window has expired. Interactive selection buttons are disabled while studio curation prepares.'}
                    </p>
                  </div>
                </div>

                {/* Request Extension CTA with Reason Modal */}
                {board.status !== 'SUBMITTED' && board.status !== 'COMPLETED' && (
                  <div className="flex items-center gap-2 shrink-0">
                    {extensionRequested || board.extensionRequested ? (
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                        Pending Studio Approval
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setExtensionReasonError(null);
                          setExtensionReasonInput('');
                          setIsExtensionModalOpen(true);
                        }}
                        disabled={isPending}
                        className="text-xs font-semibold shadow-xs gap-1.5"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Request Extension</span>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (board.selectionDeadline || (board as any).expiresAt) && timeRemaining && !timeRemaining.isExpired ? (
            /* STAGE 1: ACTIVE VIP EXPRESS ALBUM WINDOW */
            <div
              className={`px-4 py-3 sm:px-6 transition-colors ${
                timeRemaining.days < 2
                  ? 'bg-amber-500/15 border-b border-amber-500/30 text-amber-950 dark:text-amber-200'
                  : 'bg-primary/5 border-b border-primary/10 text-foreground'
              }`}
            >
              <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      timeRemaining.days < 2
                        ? 'bg-amber-500/25 text-amber-600 dark:text-amber-400 animate-pulse'
                        : 'bg-primary/10 text-primary'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs sm:text-sm flex items-center justify-center sm:justify-start gap-1.5">
                      <span>⏳ Express Album Window:</span>
                      <span className="font-mono font-bold tracking-tight text-primary">
                        {timeRemaining.days > 0 ? `${timeRemaining.days}d ` : ''}
                        {String(timeRemaining.hours).padStart(2, '0')}h : {String(timeRemaining.minutes).padStart(2, '0')}m : {String(timeRemaining.seconds).padStart(2, '0')}s
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-muted-foreground pt-0.5">
                      Select in time for priority VIP delivery, or our creative team will auto-curate.
                    </p>
                  </div>
                </div>

                {/* Live Countdown Clock Badge (NO extension button in Active state) */}
                <div className="flex items-center gap-1.5 font-mono text-xs sm:text-sm font-bold bg-background/80 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-border shadow-2xs shrink-0">
                  <span className="text-muted-foreground font-sans text-xs font-normal mr-1">Time Left:</span>
                  {timeRemaining.days > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-muted">
                      {timeRemaining.days}d
                    </span>
                  )}
                  <span className="px-1.5 py-0.5 rounded bg-muted">
                    {String(timeRemaining.hours).padStart(2, '0')}h
                  </span>
                  <span>:</span>
                  <span className="px-1.5 py-0.5 rounded bg-muted">
                    {String(timeRemaining.minutes).padStart(2, '0')}m
                  </span>
                  <span>:</span>
                  <span className={`px-1.5 py-0.5 rounded ${timeRemaining.days < 1 ? 'bg-destructive/20 text-destructive' : 'bg-muted'}`}>
                    {String(timeRemaining.seconds).padStart(2, '0')}s
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Instructions & Live Selection Tracker */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 text-xs">
            <div className="font-semibold text-sm flex items-center gap-2">
              {isDeliveryMode ? (
                <>
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>Soft Copy Delivery Vault</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>Digital Photo Proofing & Selection</span>
                </>
              )}
            </div>
            <p className="text-muted-foreground leading-relaxed max-w-2xl">
              {isDeliveryMode
                ? 'Your high-resolution event deliverables are ready. You can download individual full-quality photos or use the Download All (ZIP) button to save your entire library.'
                : board.instructions ||
                  'Click the Heart icon to select your favorite photos for the album spread. Tap any photo to inspect in full-screen lightbox preview.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 text-xs">
            {isSelectionMode ? (
              <div className="px-3.5 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary font-medium flex items-center gap-2">
                <span>Total Selected:</span>
                <span className="font-bold text-base font-mono">{board.stats.selectedCount}</span>
                {board.maxSelections && (
                  <span className="text-[11px] text-muted-foreground font-mono">/ {board.maxSelections}</span>
                )}
              </div>
            ) : (
              <div className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>Total Assets:</span>
                <span className="font-bold text-base font-mono">{board.items.length}</span>
              </div>
            )}
          </div>
        </div>

        {/* 1. Folders Horizontal Scrollable Tabs */}
        {folderTabs.length > 1 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1 shrink-0 flex items-center gap-1">
                <Folder className="w-3.5 h-3.5 text-primary" />
                <span>Folders:</span>
              </div>
              {folderTabs.map((folder) => {
                const isCurrent = activeFolderId === folder.id;
                return (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => setActiveFolderId(folder.id)}
                    className={cn(
                      'flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer border',
                      isCurrent
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground border-border/80'
                    )}
                  >
                    <span>{folder.name}</span>
                    <Badge
                      variant={isCurrent ? 'secondary' : 'outline'}
                      className={cn(
                        'text-[10px] px-1.5 py-0 font-mono font-normal',
                        isCurrent ? 'bg-primary-foreground/20 text-primary-foreground' : ''
                      )}
                    >
                      {folder.selectedCount} / {folder.totalCount}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Status Filter Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border/60 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              activeFilter === 'ALL'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            All in Folder ({filteredItems.length})
          </button>

          {isSelectionMode && (
            <button
              type="button"
              onClick={() => setActiveFilter('SELECTED')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
                activeFilter === 'SELECTED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              <span>Selected ({board.stats.selectedCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveFilter('FAVORITES')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              activeFilter === 'FAVORITES'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
            <span>Favorites ({board.stats.favoriteCount})</span>
          </button>

          {isSelectionMode && (
            <>
              <button
                type="button"
                onClick={() => setActiveFilter('PENDING')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  activeFilter === 'PENDING'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span>Pending ({board.items.filter((i) => i.status === 'PENDING').length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('REJECTED')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
                  activeFilter === 'REJECTED'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <XCircle className="w-3.5 h-3.5 text-rose-300" />
                <span>Rejected ({board.stats.rejectedCount})</span>
              </button>
            </>
          )}
        </div>

        {/* 3. High-Performance Masonry Grid */}
        {filteredItems.length === 0 ? (
          <div className="py-20 text-center space-y-3 border border-dashed rounded-2xl bg-card/40">
            <Camera className="w-10 h-10 mx-auto text-muted-foreground/40" />
            <h3 className="font-semibold text-sm">No photos found in this view</h3>
            <p className="text-xs text-muted-foreground">
              Select &quot;All Folders&quot; or change your status filter to review more photos.
            </p>
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-3 sm:gap-4 [column-fill:_balance]">
            {displayedItems.map((item, index) => {
              const isSelected = item.status === 'SELECTED';
              const isRejected = item.status === 'REJECTED';
              const safeUrl = getSafeImageUrl(item.url, item.id);
              const isDriveImage = Boolean(item.url && item.url.includes('drive.google.com')) || isGoogleDriveUrl(safeUrl);

              return (
                <div
                  key={item.id}
                  className={`break-inside-avoid mb-3 sm:mb-4 group/card relative rounded-xl overflow-hidden border bg-card transition-all duration-200 shadow-xs flex flex-col ${
                    isSelectionMode && isSelected
                      ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                      : isSelectionMode && isRejected
                      ? 'border-rose-300 opacity-60'
                      : 'border-border/80 hover:border-primary/50'
                  }`}
                >
                  {/* Photo Container with Lightbox Trigger on Click */}
                  <div
                    className="relative w-full min-h-[180px] bg-muted/40 dark:bg-zinc-900/60 overflow-hidden cursor-pointer select-none flex items-center justify-center"
                    onClick={() => {
                      setLightboxIndex(index);
                      setZoomLevel(1);
                    }}
                    onContextMenu={(e) => {
                      if (isSelectionMode) e.preventDefault();
                    }}
                  >
                    <SecureDriveImage
                      src={safeUrl}
                      alt={item.fileName}
                      width={800}
                      height={600}
                      unoptimized={isDriveImage}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      draggable={false}
                      onDragStart={(e) => e.preventDefault()}
                      containerClassName="w-full"
                      className="w-full h-auto object-cover transition-transform duration-300 group-hover/card:scale-103 select-none"
                    />

                    {/* Mode A: Diagonal Watermark */}
                    {showWatermark && (
                      <div
                        className="absolute inset-0 pointer-events-none select-none z-10 opacity-70"
                        style={{
                          backgroundImage: `url("${repeatingWatermarkSvg}")`,
                          backgroundRepeat: 'repeat',
                        }}
                        aria-hidden="true"
                      />
                    )}

                    {/* Interactive Grid Selection: Heart to Green Tick Overlay (Top-Right) */}
                    {isSelectionMode && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelect(item);
                        }}
                        disabled={isLockedDueToExpiry || board.status === 'SUBMITTED'}
                        className="absolute top-2 right-2 z-20 transition-transform active:scale-90 focus:outline-none"
                        title={isSelected ? 'Selected (Click to deselect)' : 'Click Heart to select for album'}
                      >
                        {isSelected ? (
                          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg ring-2 ring-emerald-400/80 transition-all scale-100">
                            <Check className="w-4 h-4 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-xs shadow-md border border-white/20 transition-all opacity-85 hover:opacity-100">
                            <Heart className="w-4 h-4 text-white hover:text-rose-400 hover:fill-rose-400 transition-colors" />
                          </div>
                        )}
                      </button>
                    )}

                    {/* Top-Left Status Indicators */}
                    <div className="absolute top-2 left-2 flex items-center gap-1 pointer-events-none z-20">
                      {item.isFavorite && (
                        <span className="p-1 rounded-full bg-amber-500 text-white shadow-sm">
                          <Star className="w-3 h-3 fill-white" />
                        </span>
                      )}
                      {isSelectionMode && isRejected && (
                        <Badge className="bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.5 shadow-sm">
                          <X className="w-3 h-3 mr-0.5 stroke-[3]" />
                          Rejected
                        </Badge>
                      )}
                    </div>

                    {/* Note indicator badge */}
                    {isSelectionMode && item.clientNote && (
                      <div className="absolute bottom-2 left-2 pointer-events-none z-20">
                        <span className="px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-xs text-amber-300 text-[10px] flex items-center gap-1 font-medium shadow-xs">
                          <MessageSquare className="w-2.5 h-2.5" />
                          Note
                        </span>
                      </div>
                    )}

                    {/* Delivery Mode: Hover Overlay Download Icon */}
                    {canDownload && (
                      <div className="absolute bottom-2 right-2 z-20 opacity-90 sm:opacity-0 sm:group-hover/card:opacity-100 transition-opacity">
                        <a
                          href={safeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          referrerPolicy="no-referrer"
                          download={item.fileName}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-lg bg-black/70 hover:bg-emerald-600 text-white transition-colors flex items-center justify-center shadow-md backdrop-blur-xs"
                          title="Download High-Res Original"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Meta & Actions */}
                  <div className="p-2.5 bg-card flex items-center justify-between gap-1 text-xs border-t border-border/60">
                    <span className="truncate text-[11px] text-muted-foreground font-mono" title={item.fileName}>
                      {item.fileName}
                    </span>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Direct Individual Download Icon (Delivery Mode) */}
                      {canDownload && (
                        <a
                          href={safeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          referrerPolicy="no-referrer"
                          download={item.fileName}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                          title="Download Original Quality Asset"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}

                      {/* Favorite Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(item);
                        }}
                        disabled={isLockedDueToExpiry || board.status === 'SUBMITTED'}
                        className={`p-1.5 rounded-md transition-colors ${
                          item.isFavorite
                            ? 'text-amber-500 bg-amber-500/10'
                            : 'text-muted-foreground hover:text-amber-500 hover:bg-muted'
                        }`}
                        title="Mark as Favorite"
                      >
                        <Star className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-amber-500' : ''}`} />
                      </button>

                      {/* Selection Mode Controls */}
                      {isSelectionMode && (
                        <>
                          {/* Note Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenNote(item);
                            }}
                            disabled={isLockedDueToExpiry || board.status === 'SUBMITTED'}
                            className={`p-1.5 rounded-md transition-colors ${
                              item.clientNote
                                ? 'text-primary bg-primary/10'
                                : 'text-muted-foreground hover:text-primary hover:bg-muted'
                            }`}
                            title="Add Retouching Note"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          {/* Reject Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleReject(item);
                            }}
                            disabled={isLockedDueToExpiry || board.status === 'SUBMITTED'}
                            className={`p-1.5 rounded-md transition-colors ${
                              isRejected
                                ? 'bg-rose-600 text-white'
                                : 'text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600'
                            }`}
                            title={isRejected ? 'Unreject Photo' : 'Reject Photo'}
                          >
                            <X className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Sentinel element triggering progressive batch rendering */}
        <div ref={sentinelRef} className="h-10 w-full flex items-center justify-center">
          {visibleLimit < filteredItems.length && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
              <span>Loading more photos ({visibleLimit} of {filteredItems.length})...</span>
            </div>
          )}
        </div>
      </main>

      {/* Mode A: Floating Sticky Bottom Selection Bar with Live Counters */}
      {isSelectionMode && (
        <footer className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border shadow-lg py-3 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-2 font-medium">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  Total Selected:{' '}
                  <strong className="text-foreground font-bold font-mono">
                    {board.stats.selectedCount}
                  </strong>
                  {board.maxSelections ? (
                    <span className="text-muted-foreground ml-1 font-mono">
                      / {board.maxSelections}
                    </span>
                  ) : null}
                </span>
                {activeFolderTab && activeFolderTab.id !== 'ALL' && (
                  <Badge variant="outline" className="text-[11px] font-mono bg-muted/60 ml-2">
                    {activeFolderTab.name}: {activeFolderTab.selectedCount} / {activeFolderTab.totalCount}
                  </Badge>
                )}
              </div>

              <span className="hidden sm:inline text-muted-foreground">•</span>
              <span className="hidden sm:inline text-muted-foreground text-xs font-mono">
                {board.stats.favoriteCount} Favorites • {board.stats.rejectedCount} Rejected
              </span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              {board.status === 'SUBMITTED' ? (
                <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 py-2 px-4 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Selection Finalized & Locked
                </Badge>
              ) : isLockedDueToExpiry ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExtensionModalOpen(true)}
                  disabled={board.status === 'EXTENSION_REQUESTED' || extensionRequested}
                  className="text-xs"
                >
                  {board.status === 'EXTENSION_REQUESTED' || extensionRequested
                    ? 'Extension Pending Studio Approval'
                    : 'Request Extension'}
                </Button>
              ) : (
                <Button
                  onClick={() => setIsSubmitDialogOpen(true)}
                  disabled={isPending || board.stats.selectedCount === 0}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm h-10 px-5 flex items-center gap-2 shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Selection to Studio</span>
                </Button>
              )}
            </div>
          </div>
        </footer>
      )}

      {/* Client Note Dialog */}
      <Dialog open={Boolean(editingNoteItem)} onOpenChange={(open) => !open && setEditingNoteItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span>Add Retouching / Album Note</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Provide specific instructions for photo{' '}
              <span className="font-mono font-medium text-foreground">{editingNoteItem?.fileName}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Textarea
              placeholder="e.g. Please crop tighter on the bride, remove stray hair on the right, convert to black & white for full-page spread..."
              value={tempNote}
              onChange={(e) => setTempNote(e.target.value)}
              rows={4}
              className="text-xs"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingNoteItem(null)}
            >
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleSaveNote}>
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Confirmation Dialog */}
      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Send className="w-4 h-4 text-emerald-600" />
              <span>Finalize & Submit Selection?</span>
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              You are submitting <strong className="text-foreground font-semibold">{board.stats.selectedCount}</strong> selected
              photos to <span className="font-semibold text-foreground">{board.studio.name}</span> for album design and
              post-production. Once submitted, your selection will be locked.
            </DialogDescription>
          </DialogHeader>

          {board.minSelections && board.stats.selectedCount < board.minSelections && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <strong>Requirement:</strong> Please select at least {board.minSelections} photos before submitting (currently {board.stats.selectedCount}).
            </div>
          )}

          {board.maxSelections && board.stats.selectedCount > board.maxSelections && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <strong>Requirement:</strong> You have selected {board.stats.selectedCount} photos, exceeding the maximum allowed ({board.maxSelections}).
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSubmitDialogOpen(false)}
              disabled={isPending}
            >
              Keep Reviewing
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={
                isPending ||
                Boolean(board.minSelections && board.stats.selectedCount < board.minSelections) ||
                Boolean(board.maxSelections && board.stats.selectedCount > board.maxSelections)
              }
              onClick={handleSubmitSelection}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isPending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                  Yes, Submit My Selection
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extension Reason Request Modal */}
      <Dialog open={isExtensionModalOpen} onOpenChange={setIsExtensionModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Clock className="w-4 h-4 text-primary" />
              <span>Request Selection Extension</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              To request additional time for your VIP photo album selection, please provide a brief reason for our studio coordinator.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Reason for Extension <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="e.g., We are reviewing photos together with family this weekend..."
                value={extensionReasonInput}
                onChange={(e) => {
                  setExtensionReasonInput(e.target.value);
                  if (extensionReasonError) setExtensionReasonError(null);
                }}
                rows={4}
                className="text-xs resize-none"
              />
              {extensionReasonError && (
                <p className="text-[11px] text-destructive font-medium">{extensionReasonError}</p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsExtensionModalOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmitExtensionRequest}
              disabled={isPending || extensionReasonInput.trim().length < 5}
              className="bg-primary text-primary-foreground font-semibold"
            >
              {isPending && <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              <span>Submit Request</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk ZIP Progress Modal */}
      {zipProgress && zipProgress.active && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="max-w-md w-full border shadow-2xl bg-card">
            <CardContent className="p-6 space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                <FileArchive className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base">Bundling High-Resolution Gallery</h3>
                <p className="text-xs text-muted-foreground">
                  Downloading photos directly from cloud storage and compiling your ZIP archive...
                </p>
              </div>
              <div className="space-y-2">
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden border border-border/80">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.round((zipProgress.current / Math.max(zipProgress.total, 1)) * 100)}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                  <span>
                    {zipProgress.current} / {zipProgress.total} Photos
                  </span>
                  <span className="font-bold text-foreground">
                    {Math.round((zipProgress.current / Math.max(zipProgress.total, 1)) * 100)}%
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Please keep this browser window open while your ZIP package is assembled.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 4. Full-Screen Interactive Lightbox Preview Mode */}
      {lightboxIndex !== null && filteredItems[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between select-none"
          onContextMenu={(e) => {
            if (isSelectionMode) e.preventDefault();
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Lightbox Header */}
          <div className="p-4 flex items-center justify-between text-white border-b border-white/10 bg-black/50 backdrop-blur-xs">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs opacity-75">
                {lightboxIndex + 1} / {filteredItems.length}
              </span>
              <span className="text-xs font-mono truncate max-w-[200px] sm:max-w-md">
                {filteredItems[lightboxIndex].fileName}
              </span>
              {filteredItems[lightboxIndex].folderName && (
                <Badge variant="outline" className="text-[10px] text-white/80 border-white/20 hidden sm:inline-flex">
                  <Folder className="w-3 h-3 mr-1" />
                  {filteredItems[lightboxIndex].folderName}
                </Badge>
              )}
            </div>

            {/* Zoom Controls & Close Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomLevel((prev) => (prev < 3 ? prev + 0.5 : 1))}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setZoomLevel((prev) => (prev > 1 ? prev - 0.5 : 1))}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              {zoomLevel !== 1 && (
                <button
                  type="button"
                  onClick={() => setZoomLevel(1)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setLightboxIndex(null);
                  setZoomLevel(1);
                }}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors ml-2"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Lightbox Main Photo Container with Next/Prev navigation */}
          <div className="relative flex-1 flex items-center justify-center p-4 overflow-hidden">
            {lightboxIndex > 0 && (
              <button
                type="button"
                onClick={() => {
                  setLightboxIndex(lightboxIndex - 1);
                  setZoomLevel(1);
                }}
                className="absolute left-4 z-20 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-all backdrop-blur-xs flex items-center justify-center shadow-lg hover:scale-105 active:scale-95"
                title="Previous Photo (Left Arrow)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <div
              className="relative max-w-5xl max-h-full flex items-center justify-center transition-transform duration-200"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              <SecureDriveImage
                src={safeLightboxUrl}
                alt={activeLightboxItem?.fileName || 'Photo Preview'}
                width={1600}
                height={1200}
                unoptimized={isLightboxDriveImage}
                referrerPolicy="no-referrer"
                priority
                draggable={false}
                onContextMenu={(e) => {
                  if (isSelectionMode) e.preventDefault();
                }}
                onDragStart={(e) => {
                  if (isSelectionMode) e.preventDefault();
                }}
                containerClassName="max-h-[75vh] max-w-full flex items-center justify-center rounded-lg shadow-2xl"
                className="max-h-[75vh] max-w-full w-auto h-auto object-contain select-none rounded-lg shadow-2xl"
              />

              {/* Mode A: Diagonal Watermark in Lightbox */}
              {showWatermark && (
                <div
                  className="absolute inset-0 pointer-events-none select-none opacity-60 rounded-lg overflow-hidden"
                  style={{
                    backgroundImage: `url("${repeatingWatermarkSvg}")`,
                    backgroundRepeat: 'repeat',
                  }}
                />
              )}
            </div>

            {lightboxIndex < filteredItems.length - 1 && (
              <button
                type="button"
                onClick={() => {
                  setLightboxIndex(lightboxIndex + 1);
                  setZoomLevel(1);
                }}
                className="absolute right-4 z-20 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-all backdrop-blur-xs flex items-center justify-center shadow-lg hover:scale-105 active:scale-95"
                title="Next Photo (Right Arrow)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Lightbox Footer Action Bar with Interactive Heart / Green Tick */}
          <div className="p-4 bg-black/70 border-t border-white/10 flex flex-wrap items-center justify-center gap-3 backdrop-blur-md">
            {canDownload && (
              <a
                href={safeLightboxUrl}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
                download={activeLightboxItem?.fileName || 'photo.jpg'}
                className="inline-flex items-center gap-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 rounded-lg font-semibold transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download High-Res</span>
              </a>
            )}

            {/* Interactive Heart to Green Tick Select / Deselect Button */}
            {isSelectionMode && (
              <Button
                variant={filteredItems[lightboxIndex].status === 'SELECTED' ? 'default' : 'outline'}
                size="sm"
                disabled={isLockedDueToExpiry || board.status === 'SUBMITTED'}
                onClick={() => handleToggleSelect(filteredItems[lightboxIndex])}
                className={cn(
                  'text-xs font-semibold h-10 px-4 gap-2 transition-all shadow-md',
                  filteredItems[lightboxIndex].status === 'SELECTED'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400/50'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/30'
                )}
              >
                {filteredItems[lightboxIndex].status === 'SELECTED' ? (
                  <>
                    <div className="w-5 h-5 rounded-full bg-white text-emerald-700 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <span>Selected for Album</span>
                  </>
                ) : (
                  <>
                    <Heart className="w-4 h-4 text-rose-400 fill-rose-400/20" />
                    <span>Select for Album</span>
                  </>
                )}
              </Button>
            )}

            <Button
              variant={filteredItems[lightboxIndex].isFavorite ? 'default' : 'outline'}
              size="sm"
              disabled={isLockedDueToExpiry || board.status === 'SUBMITTED'}
              onClick={() => handleToggleFavorite(filteredItems[lightboxIndex])}
              className={`text-xs ${
                filteredItems[lightboxIndex].isFavorite
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'text-white border-white/20 hover:bg-white/10'
              }`}
            >
              <Star className="w-3.5 h-3.5 mr-1.5 fill-current" />
              {filteredItems[lightboxIndex].isFavorite ? 'Favorited' : 'Favorite'}
            </Button>

            {isSelectionMode && (
              <Button
                variant={filteredItems[lightboxIndex].clientNote ? 'default' : 'outline'}
                size="sm"
                disabled={isLockedDueToExpiry || board.status === 'SUBMITTED'}
                onClick={() => handleOpenNote(filteredItems[lightboxIndex])}
                className="text-xs text-white border-white/20 hover:bg-white/10"
              >
                <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                {filteredItems[lightboxIndex].clientNote ? 'Edit Note' : 'Add Note'}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
