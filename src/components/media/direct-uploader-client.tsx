'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  UploadCloud,
  FileImage,
  FileVideo,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Clock,
  Sparkles,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import { initiateUploadAction, confirmUploadAction } from '@/actions/upload.actions';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface FileQueueItem {
  id: string;
  file: File;
  fileName: string;
  sizeBytes: number;
  progress: number;
  speed: string;
  status: 'QUEUED' | 'UPLOADING' | 'COMPLETED' | 'ERROR';
  errorMessage?: string;
  xhr?: XMLHttpRequest;
}

interface DirectUploaderClientProps {
  customerId?: string | null;
  eventBookingId?: string | null;
  projectId?: string | null;
  selectionBoardId?: string | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerButton?: React.ReactNode;
  title?: string;
  description?: string;
  onUploadFinished?: (records: any[]) => void;
}

export function DirectUploaderClient({
  customerId,
  eventBookingId,
  projectId,
  selectionBoardId,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  triggerButton,
  title = 'Direct-to-Cloud Media Uploader',
  description = 'Upload high-resolution proofs directly to your BYOS cloud bucket with zero server bottlenecks.',
  onUploadFinished,
}: DirectUploaderClientProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? setControlledOpen! : setInternalOpen;

  const [queue, setQueue] = useState<FileQueueItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Formatting helpers
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Add files to queue
  const handleAddFiles = useCallback((files: FileList | File[]) => {
    const newItems: FileQueueItem[] = Array.from(files).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      file,
      fileName: file.name,
      sizeBytes: file.size,
      progress: 0,
      speed: '0 KB/s',
      status: 'QUEUED',
    }));

    setQueue((prev) => [...prev, ...newItems]);
  }, []);

  // Drag and Drop event handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  // Upload a single file using XMLHttpRequest to track live upload progress
  const uploadSingleFile = async (item: FileQueueItem) => {
    // 1. Request presigned upload URL from server
    const initRes = await initiateUploadAction({
      fileName: item.fileName,
      mimeType: item.file.type || 'application/octet-stream',
      sizeBytes: item.sizeBytes,
      customerId,
      eventBookingId,
      selectionBoardId,
    });

    if (!initRes.success || !initRes.data) {
      setQueue((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, status: 'ERROR', errorMessage: initRes.error || 'Initiate failed' }
            : i
        )
      );
      return;
    }

    const { uploadUrl, method, headers, externalFileId, finalUrl, integrationId, provider } = initRes.data;

    // 2. Perform direct-to-cloud upload from browser
    return new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest();
      item.xhr = xhr;
      let lastLoaded = 0;
      let lastTime = Date.now();

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          const currentTime = Date.now();
          const timeDiff = (currentTime - lastTime) / 1000;
          let currentSpeed = '—';

          if (timeDiff >= 0.5) {
            const bytesPerSec = (e.loaded - lastLoaded) / timeDiff;
            currentSpeed = `${formatBytes(bytesPerSec)}/s`;
            lastLoaded = e.loaded;
            lastTime = currentTime;
          }

          setQueue((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? {
                    ...i,
                    progress: percent,
                    speed: currentSpeed !== '—' ? currentSpeed : i.speed,
                    status: 'UPLOADING',
                  }
                : i
            )
          );
        }
      };

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          let resolvedUrl = finalUrl;
          let resolvedFileId = externalFileId;

          // Parse Google Drive response to extract the uploaded file ID
          if (uploadUrl.includes('googleapis.com') || provider === 'GOOGLE_DRIVE') {
            try {
              const resData = JSON.parse(xhr.responseText);
              if (resData && resData.id) {
                resolvedFileId = resData.id;
                resolvedUrl = `https://drive.google.com/thumbnail?id=${resData.id}&sz=w2500`;
              }
            } catch {
              const match = xhr.responseText.match(/"id"\s*:\s*"([^"]+)"/);
              if (match && match[1]) {
                resolvedFileId = match[1];
                resolvedUrl = `https://drive.google.com/thumbnail?id=${match[1]}&sz=w2500`;
              }
            }
          }

          if (!resolvedUrl || resolvedUrl.includes('googleapis.com/upload')) {
            setQueue((prev) =>
              prev.map((i) =>
                i.id === item.id
                  ? {
                      ...i,
                      status: 'ERROR',
                      errorMessage: 'Failed to extract valid storage file ID from Google Drive response.',
                    }
                  : i
              )
            );
            resolve();
            return;
          }

          // 3. Confirm upload with PostgreSQL
          const confirmRes = await confirmUploadAction({
            integrationId,
            externalFileId: resolvedFileId,
            fileName: item.fileName,
            mimeType: item.file.type || 'application/octet-stream',
            sizeBytes: item.sizeBytes,
            url: resolvedUrl,
            customerId,
            eventBookingId,
            selectionBoardId,
          });

          if (confirmRes.success) {
            setQueue((prev) =>
              prev.map((i) =>
                i.id === item.id ? { ...i, progress: 100, status: 'COMPLETED' } : i
              )
            );
          } else {
            setQueue((prev) =>
              prev.map((i) =>
                i.id === item.id
                  ? { ...i, status: 'ERROR', errorMessage: confirmRes.error || 'Failed to sync DB record' }
                  : i
              )
            );
          }
        } else {
          setQueue((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? { ...i, status: 'ERROR', errorMessage: `Cloud upload failed with status ${xhr.status}` }
                : i
            )
          );
        }
        resolve();
      };

      xhr.onerror = () => {
        setQueue((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: 'ERROR', errorMessage: 'Network error during cloud transfer.' }
              : i
          )
        );
        resolve();
      };

      const isGoogleDrive =
        provider === 'GOOGLE_DRIVE' ||
        uploadUrl.includes('googleapis.com') ||
        uploadUrl.includes('drive.google.com');

      xhr.open(method, uploadUrl, true);

      // Google Drive's resumable session URLs are inherently authenticated and pre-signed for the specific content type.
      // Do NOT send custom headers like Authorization or Content-Type for Google Drive to prevent CORS preflight failures.
      if (!isGoogleDrive && headers) {
        Object.entries(headers).forEach(([key, val]) => {
          if (val) {
            xhr.setRequestHeader(key, val as string);
          }
        });
      }

      xhr.send(item.file);
    });
  };

  // Process the upload queue with concurrency limit of 3
  const startUpload = async () => {
    setIsProcessing(true);

    const queuedItems = queue.filter((i) => i.status === 'QUEUED' || i.status === 'ERROR');
    const CONCURRENCY = 3;

    for (let i = 0; i < queuedItems.length; i += CONCURRENCY) {
      const chunk = queuedItems.slice(i, i + CONCURRENCY);
      await Promise.all(chunk.map((item) => uploadSingleFile(item)));
    }

    setIsProcessing(false);
    toast.success('Batch cloud upload finished!');

    if (onUploadFinished) {
      onUploadFinished(queue.filter((i) => i.status === 'COMPLETED'));
    }
  };

  // Remove single item from queue
  const handleRemoveItem = (id: string) => {
    setQueue((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item?.xhr && item.status === 'UPLOADING') {
        item.xhr.abort();
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  // Clear completed items
  const handleClearCompleted = () => {
    setQueue((prev) => prev.filter((i) => i.status !== 'COMPLETED'));
  };

  // Queue summaries
  const totalFiles = queue.length;
  const completedCount = queue.filter((i) => i.status === 'COMPLETED').length;
  const errorCount = queue.filter((i) => i.status === 'ERROR').length;
  const totalBytes = queue.reduce((acc, i) => acc + i.sizeBytes, 0);

  return (
    <>
      {triggerButton ? (
        <span onClick={() => setIsOpen(true)} className="cursor-pointer inline-flex">
          {triggerButton}
        </span>
      ) : (
        <Button size="sm" onClick={() => setIsOpen(true)} className="flex items-center gap-1.5">
          <UploadCloud className="w-4 h-4" />
          <span>Upload Media</span>
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <UploadCloud className="w-5 h-5 text-primary" />
            <span>{title}</span>
          </DialogTitle>
          <DialogDescription className="text-xs">{description}</DialogDescription>
        </DialogHeader>

        {/* Drag-and-Drop Zone */}
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-primary bg-primary/10 scale-[1.01]'
              : 'border-border/80 hover:border-primary/50 hover:bg-muted/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleAddFiles(e.target.files);
              }
            }}
          />

          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">
                Drag & drop photos or videos here, or <span className="text-primary underline">browse</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Supports High-Res JPG, PNG, WebP, RAW, MP4, MOV. Direct streaming to cloud bucket.
              </p>
            </div>
          </div>
        </div>

        {/* Upload Queue View */}
        {queue.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs border-b pb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Upload Queue ({totalFiles})</span>
                <span className="text-muted-foreground">({formatBytes(totalBytes)})</span>
              </div>
              <div className="flex items-center gap-3">
                {completedCount > 0 && (
                  <button
                    type="button"
                    onClick={handleClearCompleted}
                    className="text-muted-foreground hover:text-foreground text-[11px] underline"
                  >
                    Clear Completed ({completedCount})
                  </button>
                )}
                {errorCount > 0 && (
                  <Badge variant="destructive" className="text-[10px] py-0">
                    {errorCount} Failed
                  </Badge>
                )}
              </div>
            </div>

            {/* List of files */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {queue.map((item) => {
                const isVideo = item.file.type.startsWith('video/');

                return (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-lg border bg-card/60 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="p-1.5 rounded-md bg-muted text-muted-foreground shrink-0">
                        {isVideo ? <FileVideo className="w-4 h-4 text-purple-500" /> : <FileImage className="w-4 h-4 text-blue-500" />}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate font-mono text-[11px]">{item.fileName}</span>
                          <span className="text-muted-foreground text-[11px] shrink-0 font-mono">
                            {formatBytes(item.sizeBytes)}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full transition-all duration-200 ${
                              item.status === 'COMPLETED'
                                ? 'bg-emerald-500'
                                : item.status === 'ERROR'
                                ? 'bg-rose-500'
                                : 'bg-primary'
                            }`}
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>

                        {/* Sub-status */}
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>
                            {item.status === 'QUEUED' && 'Ready to upload'}
                            {item.status === 'UPLOADING' && `Uploading (${item.speed})`}
                            {item.status === 'COMPLETED' && 'Delivered to Cloud ✓'}
                            {item.status === 'ERROR' && (
                              <span className="text-destructive font-medium">{item.errorMessage}</span>
                            )}
                          </span>
                          <span>{item.progress}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Status icon / Remove button */}
                    <div className="shrink-0 flex items-center">
                      {item.status === 'COMPLETED' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : item.status === 'UPLOADING' ? (
                        <RefreshCw className="w-4 h-4 text-primary animate-spin" />
                      ) : item.status === 'ERROR' ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(false)}
            disabled={isProcessing}
          >
            {completedCount > 0 ? 'Close' : 'Cancel'}
          </Button>

          {queue.some((i) => i.status === 'QUEUED' || i.status === 'ERROR') && (
            <Button
              type="button"
              size="sm"
              onClick={startUpload}
              disabled={isProcessing || queue.length === 0}
              className="flex items-center gap-1.5"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />
                  Streaming to Cloud...
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5 mr-1" />
                  Start Upload ({queue.filter((i) => i.status === 'QUEUED' || i.status === 'ERROR').length})
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
