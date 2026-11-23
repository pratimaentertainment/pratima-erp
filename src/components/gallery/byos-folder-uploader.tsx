'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  FolderUp,
  UploadCloud,
  CheckCircle2,
  Folder,
  FileImage,
  RefreshCw,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Layers,
  HardDrive,
  Check,
  X,
  ArrowRight,
  FolderTree,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { toast } from 'sonner';
import {
  generateByosPresignedUrlAction,
  syncByosGalleryMetadataAction,
  ByosFolderInput,
} from '@/actions/byos-sync.actions';
import { cn } from '@/lib/utils';

export interface ByosFolderUploaderProps {
  selectionId: string;
  selectionTitle?: string;
  onUploadComplete?: () => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerButton?: React.ReactNode;
}

interface ParsedFile {
  file: File;
  folderName: string;
}

interface FolderGroupSummary {
  folderName: string;
  count: number;
  sampleFileName: string;
}

const CONCURRENCY_LIMIT = 4;

/**
 * Extracts clean logical parent folder from webkitRelativePath
 * Examples:
 * - "Wedding/Haldi/IMG_01.jpg" -> "Haldi"
 * - "Haldi/IMG_01.jpg" -> "Haldi"
 * - "IMG_01.jpg" -> "General"
 * - "Wedding/Reception/Portraits/IMG_01.jpg" -> "Reception - Portraits"
 */
export function extractFolderNameFromPath(relativePath: string): string {
  if (!relativePath) return 'General';
  const parts = relativePath.split('/').filter(Boolean);
  if (parts.length <= 1) {
    return 'General';
  }
  if (parts.length === 2) {
    return parts[0].trim() || 'General';
  }
  return parts.slice(1, -1).join(' - ').trim() || parts[0].trim() || 'General';
}

/**
 * Recursively traverses DataTransferItemList entries to support drag-and-drop of directories
 */
async function scanEntryTree(item: any, path = ''): Promise<{ file: File; relativePath: string }[]> {
  const result: { file: File; relativePath: string }[] = [];
  if (item.isFile) {
    const file: File = await new Promise((resolve) => item.file(resolve));
    result.push({ file, relativePath: path + file.name });
  } else if (item.isDirectory) {
    const dirReader = item.createReader();
    const entries: any[] = await new Promise((resolve) => {
      dirReader.readEntries(resolve);
    });
    for (const entry of entries) {
      const nested = await scanEntryTree(entry, path + item.name + '/');
      result.push(...nested);
    }
  }
  return result;
}

export function ByosFolderUploader({
  selectionId,
  selectionTitle = 'Photo Selection Board',
  onUploadComplete,
  isOpen: controlledOpen,
  onOpenChange: setControlledOpen,
  triggerButton,
}: ByosFolderUploaderProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isDialogOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsDialogOpen = setControlledOpen || setInternalOpen;

  const [isDragging, setIsDragging] = useState(false);
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
  const [folderSummary, setFolderSummary] = useState<FolderGroupSummary[]>([]);

  // Upload Progress State
  const [isUploading, setIsUploading] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [totalFilesCount, setTotalFilesCount] = useState(0);
  const [currentFolderLabel, setCurrentFolderLabel] = useState<string>('');
  const [isSyncingMetadata, setIsSyncingMetadata] = useState(false);

  const folderInputRef = useRef<HTMLInputElement>(null);

  // Group files by folder
  const processRawFiles = useCallback((files: Array<{ file: File; relativePath?: string }>) => {
    const validPhotos: ParsedFile[] = [];
    const summaryMap: Record<string, { count: number; sampleFileName: string }> = {};

    for (const item of files) {
      const { file, relativePath } = item;
      const pathToCheck = relativePath || file.webkitRelativePath || file.name;

      // Filter only image assets
      const isImage =
        file.type.startsWith('image/') ||
        Boolean(file.name.match(/\.(jpg|jpeg|png|webp|avif|cr2|cr3|nef|arw|dng)$/i));

      if (!isImage) continue;

      const folderName = extractFolderNameFromPath(pathToCheck);
      validPhotos.push({ file, folderName });

      if (!summaryMap[folderName]) {
        summaryMap[folderName] = { count: 0, sampleFileName: file.name };
      }
      summaryMap[folderName].count++;
    }

    if (validPhotos.length === 0) {
      toast.error('No supported image files detected in selected folder.');
      return;
    }

    const summary: FolderGroupSummary[] = Object.entries(summaryMap).map(([folderName, data]) => ({
      folderName,
      count: data.count,
      sampleFileName: data.sampleFileName,
    }));

    setParsedFiles(validPhotos);
    setFolderSummary(summary);
    toast.success(`Detected ${validPhotos.length} photos across ${summary.length} subfolders.`);
  }, []);

  // Handle Input Change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const rawList: Array<{ file: File; relativePath: string }> = [];
    for (let i = 0; i < e.target.files.length; i++) {
      const file = e.target.files[i];
      rawList.push({ file, relativePath: file.webkitRelativePath });
    }
    processRawFiles(rawList);
  };

  // Drag and drop listeners
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    if (items && items.length > 0 && typeof items[0].webkitGetAsEntry === 'function') {
      const scannedList: Array<{ file: File; relativePath: string }> = [];
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry();
        if (entry) {
          const nested = await scanEntryTree(entry);
          scannedList.push(...nested);
        }
      }
      processRawFiles(scannedList);
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const rawList: Array<{ file: File; relativePath: string }> = [];
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        rawList.push({ file, relativePath: file.webkitRelativePath });
      }
      processRawFiles(rawList);
    }
  };

  // Direct-to-Cloud BYOS Upload Pipeline
  const handleStartByosUpload = async () => {
    if (parsedFiles.length === 0) return;

    setIsUploading(true);
    setCurrentProgress(0);
    setTotalFilesCount(parsedFiles.length);

    // Group files by folder
    const folderGroups: Record<string, File[]> = {};
    for (const item of parsedFiles) {
      if (!folderGroups[item.folderName]) {
        folderGroups[item.folderName] = [];
      }
      folderGroups[item.folderName].push(item.file);
    }

    // Results container to store metadata ONLY
    const completedFoldersData: ByosFolderInput[] = [];
    let completedCount = 0;

    try {
      for (const [folderName, files] of Object.entries(folderGroups)) {
        setCurrentFolderLabel(folderName);
        const folderPhotos: Array<{ filename: string; byosUrl: string; aspectRatio: number }> = [];
        let folderExternalId: string | undefined = undefined;

        // Concurrency queue for memory safety (4 workers max)
        const uploadQueue = [...files];
        const workers = Array(Math.min(CONCURRENCY_LIMIT, uploadQueue.length))
          .fill(null)
          .map(async () => {
            while (uploadQueue.length > 0) {
              const file = uploadQueue.shift();
              if (!file) break;

              try {
                // 1. Fetch direct-to-cloud Pre-signed PUT URL
                const presignedRes = await generateByosPresignedUrlAction({
                  selectionId,
                  filename: file.name,
                  mimeType: file.type || 'image/jpeg',
                  folderName,
                });

                if (!presignedRes.success || !presignedRes.data) {
                  console.warn(`Skipping ${file.name}:`, presignedRes.error);
                  continue;
                }

                if (presignedRes.data.destinationFolderId) {
                  folderExternalId = presignedRes.data.destinationFolderId;
                }

                const { uploadUrl, finalUrl, isSimulated } = presignedRes.data;

                // 2. Execute direct PUT to BYOS Cloud Storage (zero server payload)
                let actualByosUrl = finalUrl;
                const isGoogleDriveUpload = uploadUrl.includes('googleapis.com');

                if (!isSimulated && uploadUrl) {
                  const uploadResponse = await fetch(uploadUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': file.type || 'image/jpeg' },
                    body: file,
                  });

                  if (uploadResponse.ok) {
                    if (isGoogleDriveUpload) {
                      // Google Drive API returns the uploaded file JSON object upon 100% completion
                      const responseText = await uploadResponse.text();
                      let driveFileId: string | null = null;

                      try {
                        const resJson = JSON.parse(responseText);
                        if (resJson && resJson.id) {
                          driveFileId = resJson.id;
                        }
                      } catch {
                        const idMatch = responseText.match(/"id":\s*"([^"]+)"/);
                        if (idMatch && idMatch[1]) {
                          driveFileId = idMatch[1];
                        }
                      }

                      if (driveFileId) {
                        actualByosUrl = `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w2500`;
                      } else {
                        console.error(
                          `[BYOS_UPLOAD_ERROR] Could not extract Google Drive file ID from response for ${file.name}`
                        );
                        continue;
                      }
                    }
                  } else {
                    console.error(`[BYOS_UPLOAD_FAILED] HTTP ${uploadResponse.status} for ${file.name}`);
                    continue;
                  }
                } else if (isSimulated) {
                  // Direct simulated upload latency to mimic fast cloud S3 transfer
                  await new Promise((r) => setTimeout(r, 30));
                }

                // Strict sanity check: Never store temporary resumable upload session URLs
                if (actualByosUrl.includes('googleapis.com/upload')) {
                  console.error(`[BYOS_URL_REJECTED] Rejected resumable upload URL for ${file.name}`);
                  continue;
                }

                // 3. Store metadata
                folderPhotos.push({
                  filename: file.name,
                  byosUrl: actualByosUrl,
                  aspectRatio: 1.5,
                });
              } catch (fileErr) {
                console.error(`Failed to upload ${file.name}:`, fileErr);
              } finally {
                completedCount++;
                setCurrentProgress(completedCount);
              }
            }
          });

        await Promise.all(workers);

        if (folderPhotos.length > 0) {
          completedFoldersData.push({
            folderName,
            externalFolderId: folderExternalId,
            photos: folderPhotos,
          });
        }
      }

      // 4. Send ONLY structured metadata to Next.js server action
      setIsSyncingMetadata(true);
      const syncResult = await syncByosGalleryMetadataAction(selectionId, completedFoldersData);
      setIsSyncingMetadata(false);

      if (syncResult.success) {
        toast.success(
          `Successfully mirrored ${completedCount} photos across ${completedFoldersData.length} folders into your gallery!`
        );
        setParsedFiles([]);
        setFolderSummary([]);
        setIsDialogOpen(false);
        onUploadComplete?.();
      } else {
        toast.error(syncResult.error || 'Failed to sync gallery metadata.');
      }
    } catch (err: any) {
      console.error('[BYOS_FOLDER_UPLOAD_FATAL_ERROR]', err);
      toast.error('An error occurred during direct cloud upload.');
    } finally {
      setIsUploading(false);
      setIsSyncingMetadata(false);
    }
  };

  const percentComplete =
    totalFilesCount > 0 ? Math.round((currentProgress / totalFilesCount) * 100) : 0;

  return (
    <>
      {triggerButton ? (
        <div onClick={() => setIsDialogOpen(true)} className="cursor-pointer inline-block">
          {triggerButton}
        </div>
      ) : (
        <Button
          type="button"
          onClick={() => setIsDialogOpen(true)}
          className="gap-2 font-semibold bg-primary text-primary-foreground shadow-xs"
        >
          <FolderUp className="w-4 h-4" />
          <span>Upload Folder Structure</span>
        </Button>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl p-6">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FolderTree className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <span>Auto-Mirroring Folder Upload</span>
                  <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 border-emerald-500/30">
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    STRICT BYOS
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Target Selection: <strong className="text-foreground">{selectionTitle}</strong>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Hidden Directory File Input */}
          <input
            type="file"
            ref={folderInputRef}
            onChange={handleInputChange}
            {...({ webkitdirectory: '', directory: '', multiple: true } as any)}
            className="hidden"
          />

          <div className="space-y-4 py-2">
            {/* Zero Server Binary Alert */}
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs flex items-start gap-3">
              <HardDrive className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-muted-foreground text-[11px] leading-relaxed">
                <strong className="text-foreground">Direct-to-Cloud Streaming:</strong> Uploads transfer directly from
                your computer to your configured BYOS cloud vault (AWS S3 / Cloudflare R2). Zero image binaries pass
                through our application servers.
              </div>
            </div>

            {/* Dropzone Container */}
            {!isUploading && parsedFiles.length === 0 && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => folderInputRef.current?.click()}
                className={cn(
                  'p-8 rounded-2xl border-2 border-dashed transition-all duration-200 text-center space-y-3 cursor-pointer select-none',
                  isDragging
                    ? 'border-primary bg-primary/5 scale-[1.01]'
                    : 'border-border/80 hover:border-primary/50 bg-card/50'
                )}
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto ring-8 ring-primary/5">
                  <FolderUp className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-foreground">
                    Drag and drop your event folders here
                  </h4>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Or click to browse a root event folder (e.g.,{' '}
                    <code className="text-primary font-mono text-[11px]">Wedding/Haldi</code>,{' '}
                    <code className="text-primary font-mono text-[11px]">Wedding/Reception</code>).
                  </p>
                </div>
                <div className="pt-2">
                  <Button type="button" variant="outline" size="sm" className="text-xs gap-1.5 pointer-events-none">
                    <Folder className="w-3.5 h-3.5 text-primary" />
                    <span>Select Directory</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Folder Pre-Upload Breakdown Preview */}
            {!isUploading && parsedFiles.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">Detected Folders</span>
                    <Badge variant="secondary" className="text-xs font-mono">
                      {parsedFiles.length} Photos total
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setParsedFiles([]);
                      setFolderSummary([]);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground h-8 gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </Button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                  {folderSummary.map((folder) => (
                    <div
                      key={folder.folderName}
                      className="p-3 rounded-xl border border-border/80 bg-card/60 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Folder className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h5 className="font-semibold text-foreground truncate">{folder.folderName}</h5>
                          <span className="text-[10px] text-muted-foreground truncate block">
                            Sample: {folder.sampleFileName}
                          </span>
                        </div>
                      </div>

                      <Badge variant="outline" className="font-mono text-xs shrink-0">
                        {folder.count} Photos
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Uploading Progress View */}
            {isUploading && (
              <div className="p-6 rounded-2xl border border-border/80 bg-card space-y-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-base text-foreground">
                    {isSyncingMetadata ? 'Synchronizing Gallery Records...' : 'Streaming Direct to BYOS Cloud...'}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {isSyncingMetadata ? (
                      'Creating GalleryFolder and GalleryPhoto records in database...'
                    ) : (
                      <>
                        Currently streaming folder:{' '}
                        <strong className="text-foreground">{currentFolderLabel}</strong>
                      </>
                    )}
                  </p>
                </div>

                {/* Progress Meter */}
                <div className="space-y-1.5 text-left">
                  <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                    <span>
                      {currentProgress} of {totalFilesCount} Photos
                    </span>
                    <span className="font-bold text-foreground">{percentComplete}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden border border-border/60">
                    <div
                      className="bg-primary h-2.5 rounded-full transition-all duration-200"
                      style={{ width: `${percentComplete}%` }}
                    />
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground italic">
                  Keep this window open. Photos are streaming via client-side worker queues.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            {!isUploading && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>

                {parsedFiles.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleStartByosUpload}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1.5"
                  >
                    <span>Start Mirror Upload ({parsedFiles.length})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
