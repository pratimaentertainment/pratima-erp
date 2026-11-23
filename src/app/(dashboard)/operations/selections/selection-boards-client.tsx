'use client';

import React, { useState, useTransition, useMemo } from 'react';
import {
  Camera,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  Copy,
  ExternalLink,
  Plus,
  Search,
  Lock,
  Star,
  RefreshCw,
  FileSpreadsheet,
  FileCode,
  Calendar,
  Check,
  User,
  SlidersHorizontal,
  UploadCloud,
  FolderUp,
  MessageSquare,
  Trash2,
  ShieldCheck,
  Eye,
  Unlock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  exportSelectionDataAction,
  grantSelectionExtensionAction,
  updateSelectionDeadlineAction,
  createSelectionBoardAction,
  updateSelectionBoardStatusAction,
  purgeSelectionStorageAction,
  unlockClientSelectionAction,
} from '@/actions/selection.actions';
import { forcePublicizeGalleryAction } from '@/actions/byos-sync.actions';
import { UniversalUploaderModal } from '@/components/media/universal-uploader-modal';
import { ByosFolderUploader } from '@/components/gallery/byos-folder-uploader';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface SelectionBoardItem {
  id: string;
  title: string;
  status: 'DRAFT' | 'SHARED' | 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED' | 'EXTENSION_REQUESTED' | 'COMPLETED';
  rawStatus: string;
  pinCode?: string | null;
  expiresAt?: string | Date | null;
  selectionDeadline?: string | Date | null;
  isLocked?: boolean;
  isSelectionLocked?: boolean;
  extensionRequested?: boolean;
  extensionReason?: string | null;
  operatorNotes?: string | null;
  isStoragePurged?: boolean;
  purgedAt?: string | Date | null;
  minSelections?: number | null;
  maxSelections?: number | null;
  instructions?: string | null;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    customerCode: string;
    phone?: string | null;
    email?: string | null;
  };
  eventBooking?: {
    id: string;
    bookingNumber: string;
    title: string;
    startDate: string | Date;
  } | null;
  stats: {
    totalItems: number;
    selectedCount: number;
    rejectedCount: number;
    favoriteCount: number;
  };
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface SelectionBoardsClientProps {
  initialBoards: SelectionBoardItem[];
}

export interface SelectionExportItem {
  fileName: string;
  baseName: string;
  isFavorite: boolean;
  clientNote?: string;
  url?: string;
  storageRecordId?: string;
  [key: string]: unknown;
}

export interface SelectionExportData {
  board?: {
    id: string;
    title: string;
    customerName?: string;
  };
  items: SelectionExportItem[];
  filenamesCsv?: string;
  totalSelected: number;
  lightroomQuery?: string;
  lightroomQueryWithoutExt?: string;
  csvContent?: string;
  jsonContent?: string;
  [key: string]: unknown;
}

export function SelectionBoardsClient({ initialBoards }: SelectionBoardsClientProps) {
  const [boards, setBoards] = useState<SelectionBoardItem[]>(initialBoards);
  const [isPending, startTransition] = useTransition();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Export Modal state
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportData, setExportData] = useState<SelectionExportData | null>(null);
  const [exportingBoard, setExportingBoard] = useState<SelectionBoardItem | null>(null);

  // Extend Expiry & Set Deadline Dialog
  const [extendingBoard, setExtendingBoard] = useState<SelectionBoardItem | null>(null);
  const [deadlineInput, setDeadlineInput] = useState<string>('');
  const [isLockedManual, setIsLockedManual] = useState<boolean>(false);

  // Create Board Dialog
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCustomerId, setNewCustomerId] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [newMinSelections, setNewMinSelections] = useState('');
  const [newInstructions, setNewInstructions] = useState('');

  // Review Extension Request Dialog
  const [reviewingExtensionBoard, setReviewingExtensionBoard] = useState<SelectionBoardItem | null>(null);
  const [extensionDaysPreset, setExtensionDaysPreset] = useState<number>(7);

  // One-Click Storage Purge Dialog
  const [purgingBoard, setPurgingBoard] = useState<SelectionBoardItem | null>(null);
  const [purgeConfirmationText, setPurgeConfirmationText] = useState('');

  // Operator Review & Selection Unlock Dialog
  const [reviewingBoard, setReviewingBoard] = useState<SelectionBoardItem | null>(null);
  const [reviewPhotos, setReviewPhotos] = useState<any[]>([]);
  const [isLoadingReviewPhotos, setIsLoadingReviewPhotos] = useState(false);
  const [operatorNotesInput, setOperatorNotesInput] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  const handleOpenReview = (board: SelectionBoardItem) => {
    setReviewingBoard(board);
    setOperatorNotesInput(board.operatorNotes || '');
    setIsLoadingReviewPhotos(true);
    setReviewPhotos([]);

    startTransition(async () => {
      try {
        const res = await exportSelectionDataAction(board.id);
        if (res.success && res.data) {
          setReviewPhotos(res.data.items || []);
        } else {
          toast.error(res.error || 'Failed to load submitted photos.');
        }
      } catch (err: unknown) {
        console.error('Failed to load review items:', err);
        toast.error((err as Error).message || 'Failed to load submitted photos.');
      } finally {
        setIsLoadingReviewPhotos(false);
      }
    });
  };

  const handleUnlockSelection = async () => {
    if (!reviewingBoard) return;
    if (!operatorNotesInput.trim()) {
      toast.error('Please enter instructions for the client explaining what needs to be changed.');
      return;
    }

    setIsUnlocking(true);
    try {
      const res = await unlockClientSelectionAction(reviewingBoard.id, operatorNotesInput.trim());
      if (res.success) {
        toast.success(res.message || 'Selection unlocked and returned to client.');
        setBoards((prev) =>
          prev.map((b) =>
            b.id === reviewingBoard.id
              ? {
                  ...b,
                  status: 'IN_PROGRESS',
                  rawStatus: 'IN_PROGRESS',
                  isSelectionLocked: false,
                  isLocked: false,
                  operatorNotes: operatorNotesInput.trim(),
                }
              : b
          )
        );
        setReviewingBoard(null);
        setOperatorNotesInput('');
      } else {
        toast.error(res.error || 'Failed to unlock selection.');
      }
    } catch (err: unknown) {
      console.error('Unlock selection error:', err);
      toast.error((err as Error).message || 'Failed to unlock selection.');
    } finally {
      setIsUnlocking(false);
    }
  };

  // Derived counts
  const extensionRequests = useMemo(
    () => boards.filter((b) => b.extensionRequested || b.status === 'EXTENSION_REQUESTED'),
    [boards]
  );
  const submittedBoards = useMemo(
    () => boards.filter((b) => b.status === 'SUBMITTED'),
    [boards]
  );

  // Filtered Boards
  const filteredBoards = useMemo(() => {
    return boards.filter((b) => {
      const matchesSearch =
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.customer.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.customer.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.customer.customerCode.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'EXTENSION_REQUESTED') return Boolean(b.extensionRequested || b.status === 'EXTENSION_REQUESTED');
      if (statusFilter === 'SUBMITTED') return b.status === 'SUBMITTED';
      if (statusFilter === 'IN_PROGRESS') return b.status === 'IN_PROGRESS' || b.status === 'SHARED';
      if (statusFilter === 'EXPIRED') return b.status === 'EXPIRED';
      return true;
    });
  }, [boards, searchQuery, statusFilter]);

  // Open Export Modal
  const handleOpenExport = (board: SelectionBoardItem) => {
    setExportingBoard(board);
    setExportData(null);
    setExportModalOpen(true);

    startTransition(async () => {
      const result = await exportSelectionDataAction(board.id);
      if (!result.success || !result.data) {
        toast.error(result.error || 'Failed to export selection data.');
        return;
      }
      setExportData(result.data);
    });
  };

  // Copy Lightroom query to clipboard
  const handleCopyLightroom = (query: string) => {
    navigator.clipboard.writeText(query);
    toast.success('Copied Lightroom query string to clipboard!');
  };

  // Download CSV
  const handleDownloadCSV = () => {
    if (!exportData || !exportingBoard) return;
    const csvStr = exportData.csvContent || exportData.filenamesCsv || '';
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${exportingBoard.title.replace(/\s+/g, '_')}_selections.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Downloaded CSV selection report.');
  };

  // Download JSON
  const handleDownloadJSON = () => {
    if (!exportData || !exportingBoard) return;
    const jsonStr = exportData.jsonContent || JSON.stringify(exportData.items || [], null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${exportingBoard.title.replace(/\s+/g, '_')}_metadata.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Downloaded JSON metadata.');
  };

  // Open Set/Extend Deadline Modal
  const handleOpenDeadlineModal = (board: SelectionBoardItem) => {
    setExtendingBoard(board);
    setIsLockedManual(Boolean(board.isSelectionLocked ?? board.isLocked));
    const currentDeadline = board.selectionDeadline || board.expiresAt;
    if (currentDeadline) {
      const d = new Date(currentDeadline);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      setDeadlineInput(`${year}-${month}-${day}T${hours}:${minutes}`);
    } else {
      const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      setDeadlineInput(`${year}-${month}-${day}T23:59`);
    }
  };

  // Apply Quick Preset Days
  const handleApplyQuickDays = (days: number) => {
    const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setDeadlineInput(`${year}-${month}-${day}T23:59`);
  };

  // Save Deadline & Lock
  const handleSaveDeadline = () => {
    if (!extendingBoard) return;

    startTransition(async () => {
      const targetDate = deadlineInput ? new Date(deadlineInput) : null;
      const result = await updateSelectionDeadlineAction(
        extendingBoard.id,
        targetDate,
        isLockedManual
      );

      if (!result.success || !result.data) {
        toast.error(result.error || 'Failed to update selection deadline.');
        return;
      }

      const deadlineData = result.data as {
        selectionDeadline?: string | Date | null;
        isSelectionLocked?: boolean;
        status?: string;
      };
      const updatedDeadline = deadlineData.selectionDeadline ?? targetDate;
      setBoards((prev) =>
        prev.map((b) =>
          b.id === extendingBoard.id
            ? {
                ...b,
                selectionDeadline: updatedDeadline,
                expiresAt: updatedDeadline,
                isSelectionLocked: deadlineData.isSelectionLocked ?? isLockedManual,
                isLocked: deadlineData.isSelectionLocked ?? isLockedManual,
                extensionRequested: false,
                extensionReason: null,
                status: (deadlineData.status as SelectionBoardItem['status']) || b.status,
                rawStatus: deadlineData.status || b.rawStatus,
              }
            : b
        )
      );

      toast.success(
        targetDate
          ? `Updated selection deadline to ${targetDate.toLocaleDateString()}.`
          : 'Selection deadline updated.'
      );
      setExtendingBoard(null);
      setReviewingExtensionBoard(null);
    });
  };

  // Quick Approve Extension (+N days)
  const handleApproveExtension = (boardId: string, days: number = 7) => {
    startTransition(async () => {
      const result = await grantSelectionExtensionAction(boardId, days);
      if (!result.success || !result.data) {
        toast.error(result.error || 'Failed to extend expiry.');
        return;
      }

      const extData = result.data as {
        selectionDeadline?: string | Date | null;
        expiresAt?: string | Date | null;
        status?: string;
      };
      const updatedDeadline = extData.selectionDeadline || extData.expiresAt;
      setBoards((prev) =>
        prev.map((b) =>
          b.id === boardId
            ? {
                ...b,
                status: (extData.status as SelectionBoardItem['status']) || b.status,
                rawStatus: extData.status || b.rawStatus,
                selectionDeadline: updatedDeadline,
                expiresAt: updatedDeadline,
                isSelectionLocked: false,
                isLocked: false,
                extensionRequested: false,
                extensionReason: null,
              }
            : b
        )
      );

      toast.success(`Extended selection deadline by +${days} days.`);
      setExtendingBoard(null);
      setReviewingExtensionBoard(null);
    });
  };

  // One-Click Storage Purge Action
  const handleConfirmPurgeStorage = () => {
    if (!purgingBoard) return;

    startTransition(async () => {
      const result = await purgeSelectionStorageAction(purgingBoard.id);
      if (!result.success || !result.data) {
        toast.error(result.error || 'Failed to purge cloud storage.');
        return;
      }

      const purgeData = result.data as {
        purgedAt?: string | Date | null;
        deletedFilesCount?: number;
      };
      setBoards((prev) =>
        prev.map((b) =>
          b.id === purgingBoard.id
            ? {
                ...b,
                isStoragePurged: true,
                purgedAt: purgeData.purgedAt || new Date(),
              }
            : b
        )
      );

      const deletedCount = purgeData.deletedFilesCount ?? 0;
      toast.success(
        `Cloud storage for "${purgingBoard.title}" successfully purged. ${deletedCount} cloud asset(s) deleted permanently.`
      );
      setPurgingBoard(null);
      setPurgeConfirmationText('');
    });
  };

  // Force Publicize Google Drive Permissions
  const handleForcePublicize = (boardId: string) => {
    startTransition(async () => {
      const res = await forcePublicizeGalleryAction(boardId);
      if (res.success && res.data) {
        toast.success(
          `${res.data.message} (${res.data.permissionsGranted} photos verified public)`
        );
      } else {
        toast.error(res.error || 'Failed to force public permissions.');
      }
    });
  };

  // Copy Public Client Gallery Link
  const handleCopyPublicLink = (boardId: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const publicUrl = `${origin}/gallery/selection/${boardId}`;
    navigator.clipboard.writeText(publicUrl);
    toast.success('Client gallery link copied to clipboard!');
  };

  // Status Badge Component
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'EXTENSION_REQUESTED':
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 flex items-center gap-1 font-semibold animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            Extension Requested
          </Badge>
        );
      case 'SUBMITTED':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1 font-semibold">
            <CheckCircle2 className="w-3 h-3" />
            Submitted
          </Badge>
        );
      case 'IN_PROGRESS':
        return (
          <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
            In Progress
          </Badge>
        );
      case 'SHARED':
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
            Shared
          </Badge>
        );
      case 'EXPIRED':
        return (
          <Badge variant="destructive" className="flex items-center gap-1 font-semibold">
            <Lock className="w-3 h-3" />
            Expired
          </Badge>
        );
      case 'COMPLETED':
        return (
          <Badge className="bg-emerald-600 text-white flex items-center gap-1">
            <Check className="w-3 h-3 stroke-[3]" />
            Completed
          </Badge>
        );
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  const formatDate = (date: string | Date | undefined | null) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Total Boards</span>
              <p className="text-2xl font-bold tracking-tight">{boards.length}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Camera className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Ready for Editing</span>
              <p className="text-2xl font-bold tracking-tight text-emerald-600">{submittedBoards.length}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className={`border ${extensionRequests.length > 0 ? 'border-amber-500/50 bg-amber-500/5' : 'border-border/80'}`}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Extension Requests</span>
              <p className={`text-2xl font-bold tracking-tight ${extensionRequests.length > 0 ? 'text-amber-600' : ''}`}>
                {extensionRequests.length}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Active Proofing</span>
              <p className="text-2xl font-bold tracking-tight text-purple-600">
                {boards.filter((b) => b.status === 'IN_PROGRESS' || b.status === 'SHARED').length}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Extension Requests Notice Banner */}
      {extensionRequests.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/10 overflow-hidden">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="font-semibold text-amber-900 dark:text-amber-200">
                  {extensionRequests.length} Client(s) Requested Deadline Extensions:
                </span>
                <p className="text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                  Clients are waiting for extension approval to finalize their photo selections.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setStatusFilter('EXTENSION_REQUESTED')}
              className="border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs shrink-0"
            >
              Filter Extension Requests
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Search by title, client name, code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            All ({boards.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('SUBMITTED')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              statusFilter === 'SUBMITTED'
                ? 'bg-emerald-600 text-white'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Submitted ({submittedBoards.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('EXTENSION_REQUESTED')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              statusFilter === 'EXTENSION_REQUESTED'
                ? 'bg-amber-500 text-white'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Extensions ({extensionRequests.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('IN_PROGRESS')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              statusFilter === 'IN_PROGRESS'
                ? 'bg-purple-600 text-white'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            In Progress
          </button>

          <div className="pl-2 border-l border-border/60">
            <UniversalUploaderModal
              title="Upload Studio Media"
              description="Upload high-res photos or footage directly to your BYOS cloud storage bucket."
              triggerButton={
                <Button size="sm" className="h-8 text-xs flex items-center gap-1.5 shadow-sm">
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload Media</span>
                </Button>
              }
            />
          </div>
        </div>
      </div>

      {/* Boards Data Table */}
      <Card className="border border-border/80 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Selection Board</TableHead>
                <TableHead className="text-xs">Customer</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Selected / Total</TableHead>
                <TableHead className="text-xs">Security PIN</TableHead>
                <TableHead className="text-xs">Expiry Date</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBoards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                    No photo selection boards match the selected criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredBoards.map((board) => {
                  const hasExtensionReq = Boolean(board.extensionRequested || board.status === 'EXTENSION_REQUESTED');
                  return (
                    <TableRow
                      key={board.id}
                      className={cn(
                        'transition-colors',
                        hasExtensionReq
                          ? 'bg-amber-500/10 hover:bg-amber-500/15 border-l-4 border-l-amber-500'
                          : 'hover:bg-muted/40'
                      )}
                    >
                      <TableCell className="font-medium text-xs">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-foreground">{board.title}</span>
                          {board.eventBooking && (
                            <span className="text-[11px] text-muted-foreground block">
                              Event: {board.eventBooking.title} ({board.eventBooking.bookingNumber})
                            </span>
                          )}
                          {hasExtensionReq && (
                            <Badge
                              variant="outline"
                              onClick={() => setReviewingExtensionBoard(board)}
                              className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 text-[10px] font-bold cursor-pointer hover:bg-amber-500/30 flex items-center gap-1 w-fit mt-1 animate-pulse"
                            >
                              <AlertTriangle className="w-3 h-3" />
                              Extension Requested: Review Reason
                            </Badge>
                          )}
                          {board.isStoragePurged && (
                            <Badge
                              variant="outline"
                              className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-semibold flex items-center gap-1 w-fit mt-1"
                            >
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>Storage Cleared ({formatDate(board.purgedAt)})</span>
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs">
                        <div className="space-y-0.5">
                          <span className="font-medium">
                            {board.customer.firstName} {board.customer.lastName}
                          </span>
                          <span className="text-[11px] text-muted-foreground block font-mono">
                            {board.customer.customerCode}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs">
                        {renderStatusBadge(board.status)}
                      </TableCell>

                      <TableCell className="text-xs">
                        <div className="flex items-center gap-2">
                          <div className="font-mono text-xs">
                            <strong className="text-emerald-600">{board.stats.selectedCount}</strong>
                            <span className="text-muted-foreground"> / {board.stats.totalItems}</span>
                          </div>
                          {board.stats.favoriteCount > 0 && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 bg-amber-500/10 text-amber-600 border-amber-500/20">
                              ★ {board.stats.favoriteCount}
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs font-mono">
                        {board.pinCode ? (
                          <span className="bg-muted px-2 py-0.5 rounded text-[11px] font-semibold tracking-wider">
                            {board.pinCode}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">No PIN</span>
                        )}
                      </TableCell>

                      <TableCell className="text-xs">
                        <div className="flex flex-col gap-0.5">
                          <span className={board.status === 'EXPIRED' ? 'text-destructive font-medium' : ''}>
                            {formatDate(board.selectionDeadline || board.expiresAt)}
                          </span>
                          {(board.isSelectionLocked || board.isLocked) && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-destructive font-semibold">
                              <Lock className="w-2.5 h-2.5" /> Locked
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Copy Link */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyPublicLink(board.id)}
                            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                            title="Copy Public Link for Client"
                          >
                            <Copy className="w-3.5 h-3.5 mr-1" />
                            Link
                          </Button>

                          {/* Audit & Force Drive Permissions */}
                          {!board.isStoragePurged && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleForcePublicize(board.id)}
                              disabled={isPending}
                              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                              title="Audit & Force Publicize Google Drive Permissions for All Photos"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-500 mr-1" />
                              <span className="hidden xl:inline">Publicize</span>
                            </Button>
                          )}

                          {/* Open Gallery */}
                          <a
                            href={`/gallery/selection/${board.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-8 px-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent"
                            title="Open Gallery in New Tab"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          {/* Set Deadline / Extend Time / Review Request */}
                          {hasExtensionReq ? (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => setReviewingExtensionBoard(board)}
                              disabled={isPending}
                              className="h-8 px-2 text-xs font-semibold gap-1 bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
                              title="Review Extension Request & Client Reason"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Review Request</span>
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDeadlineModal(board)}
                              disabled={isPending}
                              className="h-8 px-2 text-xs font-medium gap-1 text-muted-foreground hover:text-foreground"
                              title="Set or Extend Selection Deadline"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span>
                                {board.selectionDeadline || board.expiresAt ? 'Extend' : 'Set Deadline'}
                              </span>
                            </Button>
                          )}

                        {/* BYOS Folder Tree Auto-Mirror Uploader */}
                        <ByosFolderUploader
                          selectionId={board.id}
                          selectionTitle={board.title}
                          triggerButton={
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-xs flex items-center gap-1 border-violet-500/30 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10"
                              title="Auto-Mirror Local Folders (Haldi, Reception, Portraits, etc.)"
                            >
                              <FolderUp className="w-3.5 h-3.5" />
                              <span>Folder Upload</span>
                            </Button>
                          }
                        />

                        {/* Direct Upload to this Selection Board */}
                        <UniversalUploaderModal
                          preSelectedCustomerId={board.customer.id}
                          preSelectedEventBookingId={board.eventBooking?.id}
                          preSelectedSelectionBoardId={board.id}
                          defaultGalleryMode="SELECTION"
                          title={`Upload Photos: ${board.title}`}
                          description="Photos will stream directly to your BYOS cloud storage and will be linked to this selection board."
                          triggerButton={
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-xs flex items-center gap-1 border-primary/30 text-primary hover:bg-primary/10"
                              title="Upload Photos directly to this Selection Board"
                            >
                              <UploadCloud className="w-3.5 h-3.5" />
                              <span>Upload</span>
                            </Button>
                          }
                        />

                        {/* Operator Review & Selection Unlock */}
                        <Button
                          variant={board.status === 'SUBMITTED' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleOpenReview(board)}
                          className={cn(
                            'h-8 px-2.5 text-xs flex items-center gap-1 font-medium',
                            board.status === 'SUBMITTED'
                              ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                              : 'border-border text-foreground hover:bg-accent'
                          )}
                          title="Review submitted photos and unlock for changes if needed"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review</span>
                        </Button>

                        {/* Export for Lightroom */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenExport(board)}
                          disabled={board.stats.selectedCount === 0}
                          className="h-8 px-2.5 text-xs flex items-center gap-1 border-primary/30 text-primary hover:bg-primary/10"
                          title="Export Selected Photos for Adobe Lightroom & Editors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Export
                        </Button>

                        {/* One-Click Storage Purge */}
                        {board.isStoragePurged ? (
                          <Badge
                            variant="outline"
                            className="h-8 px-2.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 flex items-center gap-1.5 cursor-default shrink-0"
                            title={`Cloud storage was permanently cleared on ${formatDate(board.purgedAt)}.`}
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Storage Cleared</span>
                          </Badge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPurgingBoard(board);
                              setPurgeConfirmationText('');
                            }}
                            disabled={isPending}
                            className="h-8 px-2 text-xs flex items-center gap-1 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/50 shrink-0"
                            title="Permanently Delete Google Drive Photo Folders to Free Cloud Storage"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            <span>🧹 Clear Cloud Storage</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Editor Export Dialog */}
      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              <span>Editor Export: {exportingBoard?.title}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Lightroom filter query and client retouching notes ready for your post-production editing team.
            </DialogDescription>
          </DialogHeader>

          {isPending || !exportData ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Compiling editor payload...</span>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Lightroom Filter Box */}
              <div className="space-y-1.5 p-4 rounded-xl bg-muted/40 border">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-primary">
                    <Camera className="w-3.5 h-3.5" />
                    Adobe Lightroom Filter Search String ({exportData.totalSelected} Photos)
                  </Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyLightroom(exportData.lightroomQuery || '')}
                    className="h-7 text-xs flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    Copy for Lightroom
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Paste this string in Lightroom Library → Filter Bar (Ctrl+L) → Text → Filename → Contains.
                </p>
                <div className="p-3 bg-background border rounded-lg font-mono text-xs max-h-24 overflow-y-auto break-all select-all">
                  {exportData.lightroomQuery || 'No photos selected'}
                </div>
              </div>

              {/* Download Buttons Bar */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleDownloadCSV}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 text-xs flex-1"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Download Editor CSV (With Notes)</span>
                </Button>
                <Button
                  onClick={handleDownloadJSON}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 text-xs flex-1"
                >
                  <FileCode className="w-4 h-4 text-blue-600" />
                  <span>Download Metadata JSON</span>
                </Button>
              </div>

              {/* Selected Items & Notes Preview */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Selected Files & Client Retouching Notes</Label>
                <div className="border rounded-lg max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[11px]">Filename</TableHead>
                        <TableHead className="text-[11px]">Favorite</TableHead>
                        <TableHead className="text-[11px]">Client Note</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {exportData.items.map((item: SelectionExportItem, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs">{item.fileName}</TableCell>
                          <TableCell className="text-xs">
                            {item.isFavorite && (
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {item.clientNote || <span className="text-muted-foreground/40 italic">None</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setExportModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Deadline & Auto-Lock Dialog */}
      <Dialog open={Boolean(extendingBoard)} onOpenChange={(open) => !open && setExtendingBoard(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Clock className="w-4 h-4 text-primary" />
              <span>Set Selection Deadline & Lock</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure time limits and automatic lock controls for{' '}
              <strong className="text-foreground">{extendingBoard?.title}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Quick Extension Buttons */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Quick Presets</Label>
              <div className="grid grid-cols-4 gap-2">
                {[3, 7, 14, 30].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => handleApplyQuickDays(days)}
                    className="py-1.5 px-2 rounded-lg border border-border/80 hover:border-primary hover:bg-primary/5 text-xs font-semibold transition-all text-muted-foreground hover:text-foreground"
                  >
                    +{days} Days
                  </button>
                ))}
              </div>
            </div>

            {/* Custom DateTime Picker */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Deadline Date & Time</Label>
              <Input
                type="datetime-local"
                value={deadlineInput}
                onChange={(e) => setDeadlineInput(e.target.value)}
                className="h-9 text-xs font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Photo proofing and selection buttons will automatically lock once this deadline passes.
              </p>
            </div>

            {/* Manual Emergency Lock Toggle */}
            <div className="pt-2 border-t border-border/60">
              <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={isLockedManual}
                  onChange={(e) => setIsLockedManual(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                />
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-destructive" />
                  <span>Lock Gallery Immediately (Prevent Selections Now)</span>
                </span>
              </label>
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExtendingBoard(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isPending}
              onClick={handleSaveDeadline}
              className="bg-primary text-primary-foreground font-semibold"
            >
              {isPending && <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              <span>Save Deadline</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Extension Request Modal */}
      <Dialog
        open={Boolean(reviewingExtensionBoard)}
        onOpenChange={(open) => !open && setReviewingExtensionBoard(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <div className="p-2 rounded-lg bg-amber-500/15">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  Client Extension Request
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Review the client's reason and grant additional days to unlock their gallery.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {reviewingExtensionBoard && (
            <div className="space-y-4 py-2">
              {/* Board & Customer Summary */}
              <div className="p-3 rounded-lg bg-muted/50 border text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Client:</span>
                  <span className="font-semibold text-foreground">
                    {reviewingExtensionBoard.customer.firstName} {reviewingExtensionBoard.customer.lastName}
                    <span className="ml-1 text-[11px] font-mono text-muted-foreground">
                      ({reviewingExtensionBoard.customer.customerCode})
                    </span>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Gallery Board:</span>
                  <span className="font-semibold text-foreground">{reviewingExtensionBoard.title}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Previous Deadline:</span>
                  <span className="font-mono text-muted-foreground">
                    {formatDate(reviewingExtensionBoard.selectionDeadline || reviewingExtensionBoard.expiresAt)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Current Status:</span>
                  <Badge variant="destructive" className="text-[10px] py-0 px-1.5 h-5">
                    Locked / Expired
                  </Badge>
                </div>
              </div>

              {/* Client's Submitted Reason */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                  Client's Stated Reason
                </Label>
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs leading-relaxed text-amber-950 dark:text-amber-100 font-medium whitespace-pre-wrap italic">
                  &ldquo;{reviewingExtensionBoard.extensionReason || 'No detailed reason specified by client.'}&rdquo;
                </div>
              </div>

              {/* Extension Preset Selector */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Grant Additional Time</Label>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 7, 14, 30].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setExtensionDaysPreset(days)}
                      className={cn(
                        'py-2 px-2.5 rounded-lg border text-xs font-bold transition-all',
                        extensionDaysPreset === days
                          ? 'border-amber-500 bg-amber-500 text-white shadow-sm'
                          : 'border-border/80 hover:border-amber-500/50 hover:bg-muted text-muted-foreground'
                      )}
                    >
                      +{days} Days
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Approving will automatically reset the lock, grant +{extensionDaysPreset} days, and unlock the client's gallery.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 gap-2 sm:justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReviewingExtensionBoard(null)}
              disabled={isPending}
            >
              Cancel
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (reviewingExtensionBoard) {
                    handleOpenDeadlineModal(reviewingExtensionBoard);
                    setReviewingExtensionBoard(null);
                  }
                }}
                disabled={isPending}
                className="text-xs"
              >
                Custom Date
              </Button>
              <Button
                size="sm"
                disabled={isPending}
                onClick={() => {
                  if (reviewingExtensionBoard) {
                    handleApproveExtension(reviewingExtensionBoard.id, extensionDaysPreset);
                  }
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs"
              >
                {isPending && <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                <span>Approve & Extend (+{extensionDaysPreset}d)</span>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Strict Confirmation Alert Dialog: One-Click Storage Purge */}
      <Dialog
        open={Boolean(purgingBoard)}
        onOpenChange={(open) => {
          if (!open) {
            setPurgingBoard(null);
            setPurgeConfirmationText('');
          }
        }}
      >
        <DialogContent className="max-w-md border-rose-500/50 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
              <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-rose-600 dark:text-rose-400">
                  Permanently Clear Cloud Storage?
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground whitespace-pre-line mt-1">
                  This will permanently delete all high-resolution photos and folders for this project from your cloud storage to free up space.

Your project details, client selection history, and billing records will remain 100% safe in the database. This action cannot be undone.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {purgingBoard && (
            <div className="space-y-4 py-2">
              {/* Target Project Summary */}
              <div className="p-3 rounded-lg bg-muted/50 border text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Selection Board:</span>
                  <span className="font-semibold text-foreground">{purgingBoard.title}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-semibold text-foreground">
                    {purgingBoard.customer.firstName} {purgingBoard.customer.lastName} ({purgingBoard.customer.customerCode})
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Photos in Gallery:</span>
                  <span className="font-mono font-bold text-foreground">{purgingBoard.stats.totalItems} Assets</span>
                </div>
              </div>

              {/* High Alert Warning Box */}
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2 text-xs">
                <div className="flex items-start gap-2 text-rose-700 dark:text-rose-300 font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Important: This action cannot be undone</span>
                </div>
                <p className="text-[11px] text-rose-900/80 dark:text-rose-200/80 leading-relaxed pl-6">
                  This will permanently delete all high-resolution photos and folders for this project from your cloud storage to free up space.
                </p>
                <div className="pt-1.5 border-t border-rose-500/20 text-[11px] text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Your project details, client selection history, and billing records will remain 100% safe in the database.</span>
                </div>
              </div>

              {/* Safety Confirmation Input */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  To confirm permanent deletion, type <strong className="font-mono text-rose-600 select-all">PURGE</strong> below:
                </Label>
                <Input
                  value={purgeConfirmationText}
                  onChange={(e) => setPurgeConfirmationText(e.target.value)}
                  placeholder="Type PURGE to confirm"
                  className="h-9 text-xs font-mono border-rose-500/30 focus-visible:ring-rose-500"
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 gap-2 sm:justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPurgingBoard(null);
                setPurgeConfirmationText('');
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isPending || purgeConfirmationText.trim().toUpperCase() !== 'PURGE'}
              onClick={handleConfirmPurgeStorage}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs gap-1.5 shadow-sm"
            >
              {isPending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Purging Cloud Files...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Permanently Delete Cloud Data</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Operator Review & Selection Unlock Dialog */}
      <Dialog open={Boolean(reviewingBoard)} onOpenChange={(open) => !open && setReviewingBoard(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="shrink-0 pb-3 border-b border-border">
            <div className="flex items-center justify-between gap-4">
              <div>
                <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                  <Eye className="w-5 h-5 text-primary" />
                  <span>Operator Review: {reviewingBoard?.title}</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Client: {reviewingBoard?.customer.firstName} {reviewingBoard?.customer.lastName} ({reviewingBoard?.customer.customerCode}) • Status:{' '}
                  <Badge variant="outline" className="ml-1 text-[10px] uppercase font-semibold">
                    {reviewingBoard?.status}
                  </Badge>
                </DialogDescription>
              </div>
              <Badge variant="outline" className="text-xs px-2.5 py-1 bg-primary/10 text-primary border-primary/20 font-bold shrink-0">
                {reviewPhotos.length} Photos Selected
              </Badge>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-5">
            {/* Gallery Preview Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Submitted Photo Proofs
                </Label>
                <span className="text-xs text-muted-foreground">
                  {reviewPhotos.filter((p) => p.isFavorite).length} Favorited
                </span>
              </div>

              {isLoadingReviewPhotos ? (
                <div className="p-12 text-center text-xs text-muted-foreground">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                  Loading submitted client photos...
                </div>
              ) : reviewPhotos.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                  No photos currently marked as selected for this board.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[340px] overflow-y-auto p-1 border rounded-xl bg-muted/10">
                  {reviewPhotos.map((photo, idx) => (
                    <div
                      key={photo.storageRecordId || photo.fileName || idx}
                      className="group relative rounded-lg border border-border bg-card overflow-hidden shadow-2xs hover:border-primary/50 transition-all"
                    >
                      <div className="aspect-4/3 w-full bg-muted overflow-hidden relative">
                        {photo.url ? (
                          <img
                            src={photo.url}
                            alt={photo.fileName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                            {photo.fileName}
                          </div>
                        )}
                        {photo.isFavorite && (
                          <div className="absolute top-1.5 right-1.5 p-1 rounded-full bg-amber-500 text-white shadow-xs">
                            <Star className="w-3 h-3 fill-current" />
                          </div>
                        )}
                      </div>
                      <div className="p-2 space-y-1">
                        <div className="text-[11px] font-mono truncate text-foreground font-medium" title={photo.fileName}>
                          {photo.fileName}
                        </div>
                        {photo.clientNote ? (
                          <div className="text-[10px] text-muted-foreground line-clamp-1 italic bg-muted/50 p-1 rounded" title={photo.clientNote}>
                            &ldquo;{photo.clientNote}&rdquo;
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Unlock & Request Changes Section */}
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Unlock & Request Selection Changes
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                If the client made an error (e.g., missed family portraits or exceeded max photos), unlock the selection board to revert its status to <strong className="text-foreground">IN_PROGRESS</strong>. The message below will be prominently displayed on their private gallery.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="operator-notes" className="text-xs font-semibold">
                  Instructions for Client (Operator Notes) <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="operator-notes"
                  rows={3}
                  placeholder="e.g., Hi Priya, please select 5 more reception photos with the grandparents so our album designer can complete the family spread."
                  value={operatorNotesInput}
                  onChange={(e) => setOperatorNotesInput(e.target.value)}
                  className="text-xs bg-background"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 pt-3 border-t border-border flex items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReviewingBoard(null)}
              disabled={isUnlocking}
            >
              Close
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleUnlockSelection}
              disabled={isUnlocking || !operatorNotesInput.trim()}
              className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              {isUnlocking ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Unlocking...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Unlock & Request Changes</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
