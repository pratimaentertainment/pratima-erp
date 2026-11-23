'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  UploadCloud,
  FileImage,
  FileVideo,
  CheckCircle2,
  AlertTriangle,
  CloudOff,
  Settings,
  X,
  RefreshCw,
  Clock,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  User,
  Calendar,
  Lock,
  Download,
  Check,
} from 'lucide-react';
import {
  checkStorageConfiguredAction,
  getUploaderContextOptionsAction,
  initiateUploadAction,
  confirmUploadAction,
  getOrCreateSelectionBoardAction,
} from '@/actions/upload.actions';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

export interface UniversalUploaderModalProps {
  preSelectedCustomerId?: string | null;
  preSelectedEventBookingId?: string | null;
  preSelectedSelectionBoardId?: string | null;
  defaultGalleryMode?: 'SELECTION' | 'DELIVERY';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerButton?: React.ReactNode;
  title?: string;
  description?: string;
  onUploadFinished?: (records: any[]) => void;
}

export function UniversalUploaderModal({
  preSelectedCustomerId,
  preSelectedEventBookingId,
  preSelectedSelectionBoardId,
  defaultGalleryMode = 'SELECTION',
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  triggerButton,
  title = 'Direct-to-Cloud Media Uploader',
  description = 'Upload high-resolution proofs or delivery files directly to your BYOS cloud bucket with zero server bottlenecks.',
  onUploadFinished,
}: UniversalUploaderModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? setControlledOpen! : setInternalOpen;

  // 1. Storage Configuration Verification
  const [storageCheckStatus, setStorageCheckStatus] = useState<'IDLE' | 'LOADING' | 'CONFIGURED' | 'NOT_CONFIGURED'>('IDLE');
  const [configuredProvider, setConfiguredProvider] = useState<string | null>(null);

  // 2. Customer & Booking Context
  const [customerId, setCustomerId] = useState<string>(preSelectedCustomerId || '');
  const [eventBookingId, setEventBookingId] = useState<string>(preSelectedEventBookingId || '');
  const [customerOptions, setCustomerOptions] = useState<any[]>([]);
  const [isLoadingContext, setIsLoadingContext] = useState(false);

  // 3. Dual-Mode Gallery Selection
  const [galleryMode, setGalleryMode] = useState<'SELECTION' | 'DELIVERY'>(defaultGalleryMode);

  // 4. File Queue & Upload State
  const [queue, setQueue] = useState<FileQueueItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize incoming props
  useEffect(() => {
    if (preSelectedCustomerId) setCustomerId(preSelectedCustomerId);
    if (preSelectedEventBookingId) setEventBookingId(preSelectedEventBookingId);
    if (defaultGalleryMode) setGalleryMode(defaultGalleryMode);
  }, [preSelectedCustomerId, preSelectedEventBookingId, defaultGalleryMode]);

  // Check storage configuration on open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const verifyStorage = async () => {
      setStorageCheckStatus('LOADING');
      try {
        const res = await checkStorageConfiguredAction();
        if (!isMounted) return;

        if (res.success && res.isConfigured) {
          setStorageCheckStatus('CONFIGURED');
          setConfiguredProvider(res.provider);
        } else {
          setStorageCheckStatus('NOT_CONFIGURED');
          setConfiguredProvider(null);
        }
      } catch (err) {
        if (!isMounted) return;
        setStorageCheckStatus('NOT_CONFIGURED');
      }
    };

    verifyStorage();

    // If customer is not pre-selected, fetch options
    if (!preSelectedCustomerId) {
      setIsLoadingContext(true);
      getUploaderContextOptionsAction()
        .then((res) => {
          if (isMounted && res.success && res.data) {
            setCustomerOptions(res.data);
          }
        })
        .finally(() => {
          if (isMounted) setIsLoadingContext(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, preSelectedCustomerId]);

  // Selected customer object
  const selectedCustomer = customerOptions.find((c) => c.id === customerId);
  const availableBookings = selectedCustomer?.eventBookings || [];

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

  // Upload single file directly from browser to cloud
  const uploadSingleFile = async (item: FileQueueItem, resolvedBoardId?: string | null) => {
    // 1. Request presigned upload URL from server
    const initRes = await initiateUploadAction({
      fileName: item.fileName,
      mimeType: item.file.type || 'application/octet-stream',
      sizeBytes: item.sizeBytes,
      customerId: customerId || null,
      eventBookingId: eventBookingId || null,
      selectionBoardId: resolvedBoardId || preSelectedSelectionBoardId || null,
      galleryMode,
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
            customerId: customerId || null,
            eventBookingId: eventBookingId || null,
            selectionBoardId: resolvedBoardId || preSelectedSelectionBoardId || null,
            galleryMode,
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

      xhr.open(method, uploadUrl, true);

      // Set headers for S3/R2 (Google Drive does not use Content-Type in PUT session)
      const isGoogleDrive =
        provider === 'GOOGLE_DRIVE' ||
        uploadUrl.includes('googleapis.com') ||
        uploadUrl.includes('drive.google.com');

      if (!isGoogleDrive && headers) {
        Object.entries(headers).forEach(([k, v]) => {
          if (v) xhr.setRequestHeader(k, v);
        });
      }

      xhr.send(item.file);
    });
  };

  // Process all files in queue
  const handleStartUpload = async () => {
    if (!customerId) {
      toast.error('Please select a customer before uploading.');
      return;
    }

    const queued = queue.filter((i) => i.status === 'QUEUED' || i.status === 'ERROR');
    if (queued.length === 0) {
      toast.error('No files in queue to upload.');
      return;
    }

    setIsProcessing(true);

    try {
      // Pre-resolve or auto-create the selection board if not specified
      let targetBoardId = preSelectedSelectionBoardId;
      if (!targetBoardId && customerId) {
        const boardRes = await getOrCreateSelectionBoardAction({
          customerId,
          eventBookingId: eventBookingId || null,
          galleryMode,
        });
        if (boardRes.success && boardRes.data) {
          targetBoardId = boardRes.data.id;
        }
      }

      // Stream each file to cloud
      for (const item of queued) {
        await uploadSingleFile(item, targetBoardId);
      }

      toast.success('Media upload finished successfully!');
      if (onUploadFinished) {
        onUploadFinished(queue);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error occurred during cloud upload.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Remove item from queue
  const handleRemoveQueueItem = (id: string) => {
    const item = queue.find((i) => i.id === id);
    if (item?.xhr && item.status === 'UPLOADING') {
      item.xhr.abort();
    }
    setQueue((prev) => prev.filter((i) => i.id !== id));
  };

  // Clear completed
  const handleClearCompleted = () => {
    setQueue((prev) => prev.filter((i) => i.status !== 'COMPLETED'));
  };

  const completedCount = queue.filter((i) => i.status === 'COMPLETED').length;
  const totalCount = queue.length;

  return (
    <>
      {triggerButton ? (
        <div onClick={() => setIsOpen(true)} className="inline-block cursor-pointer">
          {triggerButton}
        </div>
      ) : (
        <Button
          onClick={() => setIsOpen(true)}
          size="sm"
          className="flex items-center gap-1.5 shadow-sm"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Media</span>
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
                  <DialogDescription className="text-xs">{description}</DialogDescription>
                </div>
              </div>

              {configuredProvider && (
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs hidden sm:flex">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                  {configuredProvider}
                </Badge>
              )}
            </div>
          </DialogHeader>

          {/* CRITICAL FAIL-SAFE: STORAGE NOT CONFIGURED */}
          {storageCheckStatus === 'LOADING' ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Verifying BYOS cloud storage connection...</p>
            </div>
          ) : storageCheckStatus === 'NOT_CONFIGURED' ? (
            <div className="py-8 px-4 flex flex-col items-center justify-center text-center space-y-4 rounded-xl border-2 border-dashed border-destructive/40 bg-destructive/5">
              <div className="w-14 h-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center ring-8 ring-destructive/5">
                <CloudOff className="w-7 h-7" />
              </div>

              <div className="max-w-md space-y-1.5">
                <h3 className="text-base font-bold text-destructive">Cloud Storage Not Configured</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Cloud Storage Not Configured. Please configure your AWS S3, Cloudflare R2, or Google Drive in Settings to upload media. Direct-to-cloud transfers require an active bucket integration.
                </p>
              </div>

              <div className="pt-2">
                <Link href="/settings/storage" onClick={() => setIsOpen(false)}>
                  <Button variant="destructive" size="sm" className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    <span>Configure Cloud Storage in Settings</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            /* CONFIGURED STATE: RENDER FULL UPLOAD INTERFACE */
            <div className="space-y-5 py-2">
              {/* STEP 1: CONTEXT SELECTION (CUSTOMER & EVENT BOOKING) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border bg-card/60">
                {/* Customer Dropdown */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-primary" />
                    <span>Customer *</span>
                  </Label>
                  {preSelectedCustomerId ? (
                    <div className="h-9 px-3 rounded-md border bg-muted/40 text-xs flex items-center font-medium">
                      Customer Pre-Selected ({preSelectedCustomerId.slice(0, 8)}...)
                    </div>
                  ) : (
                    <Select
                      value={customerId}
                      onValueChange={(val) => {
                        setCustomerId(val || '');
                        setEventBookingId('');
                      }}
                      disabled={isLoadingContext || isProcessing}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder={isLoadingContext ? 'Loading clients...' : 'Select Customer...'} />
                      </SelectTrigger>
                      <SelectContent>
                        {customerOptions.map((cust) => (
                          <SelectItem key={cust.id} value={cust.id}>
                            {cust.firstName} {cust.lastName} ({cust.customerCode || 'Client'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Event Booking Dropdown */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>Event Booking</span>
                  </Label>
                  {preSelectedEventBookingId ? (
                    <div className="h-9 px-3 rounded-md border bg-muted/40 text-xs flex items-center font-medium">
                      Event Pre-Selected
                    </div>
                  ) : (
                    <Select
                      value={eventBookingId}
                      onValueChange={(val) => {
                        setEventBookingId(val && val !== 'NONE' ? val : '');
                      }}
                      disabled={!customerId || isProcessing}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder={customerId ? 'Link to Event (optional)...' : 'Select Customer First'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">General Media (No Specific Event)</SelectItem>
                        {availableBookings.map((b: any) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.title} ({b.bookingNumber})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* STEP 2: DUAL-MODE GALLERY TOGGLE */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Upload Type & Client Access Permissions *</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => !isProcessing && setGalleryMode('SELECTION')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      galleryMode === 'SELECTION'
                        ? 'border-purple-600 bg-purple-500/10 ring-2 ring-purple-600/20'
                        : 'border-border/80 hover:border-border hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-1">
                      <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        Photo Selection (Proofing)
                      </span>
                      {galleryMode === 'SELECTION' && (
                        <div className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Watermark applied. Downloads blocked. Client reviews, shortlists favorites, and leaves notes for album design.
                    </p>
                  </div>

                  <div
                    onClick={() => !isProcessing && setGalleryMode('DELIVERY')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      galleryMode === 'DELIVERY'
                        ? 'border-emerald-600 bg-emerald-500/10 ring-2 ring-emerald-600/20'
                        : 'border-border/80 hover:border-border hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-1">
                      <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                        <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        Soft Copy Delivery (Master Vault)
                      </span>
                      {galleryMode === 'DELIVERY' && (
                        <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Zero watermarks. Original resolution. Client can download full-size photos individually or as delivery vaults.
                    </p>
                  </div>
                </div>
              </div>

              {/* STEP 3: DIRECT-TO-CLOUD DRAG & DROP ZONE */}
              <div
                onDragEnter={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (!customerId) {
                    toast.error('Please select a customer first.');
                    return;
                  }
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleAddFiles(e.dataTransfer.files);
                  }
                }}
                onClick={() => {
                  if (!customerId) {
                    toast.error('Please select a customer before adding files.');
                    return;
                  }
                  fileInputRef.current?.click();
                }}
                className={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                  !customerId
                    ? 'opacity-50 cursor-not-allowed bg-muted/20 border-border/60'
                    : isDragging
                    ? 'border-primary bg-primary/10'
                    : 'border-border/80 hover:border-primary/50 bg-card/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*,.cr2,.cr3,.nef,.arw,.dng"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleAddFiles(e.target.files);
                    }
                  }}
                  disabled={!customerId || isProcessing}
                />

                <div className="p-3 rounded-full bg-primary/10 text-primary mb-2">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-foreground">
                    {!customerId
                      ? 'Select Customer above to enable file drop'
                      : 'Click to browse or drag & drop high-res media here'}
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Supports JPG, PNG, RAW (CR2, NEF, ARW, DNG), MP4, MOV. Direct browser-to-cloud upload.
                  </p>
                </div>
              </div>

              {/* STEP 4: FILE QUEUE & PROGRESS TABLE */}
              {queue.length > 0 && (
                <div className="space-y-2 border rounded-xl p-3 bg-muted/20">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">
                      Upload Queue ({completedCount}/{totalCount} Completed)
                    </span>
                    <div className="flex items-center gap-2">
                      {completedCount > 0 && !isProcessing && (
                        <button
                          type="button"
                          onClick={handleClearCompleted}
                          className="text-primary hover:underline text-[11px]"
                        >
                          Clear Completed
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {queue.map((item) => (
                      <div
                        key={item.id}
                        className="p-2 rounded-lg border bg-card text-xs flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {item.file.type.startsWith('video/') ? (
                            <FileVideo className="w-4 h-4 text-primary shrink-0" />
                          ) : (
                            <FileImage className="w-4 h-4 text-primary shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-mono text-[11px] truncate">{item.fileName}</div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                              <span>{formatBytes(item.sizeBytes)}</span>
                              {item.status === 'UPLOADING' && <span>• {item.speed}</span>}
                              {item.status === 'ERROR' && (
                                <span className="text-destructive truncate">
                                  • {item.errorMessage || 'Failed'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.status === 'UPLOADING' && (
                            <div className="w-20 sm:w-28 flex items-center gap-1.5">
                              <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary transition-all duration-200"
                                  style={{ width: `${item.progress}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-mono text-muted-foreground">
                                {item.progress}%
                              </span>
                            </div>
                          )}

                          {item.status === 'COMPLETED' && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          )}

                          {item.status === 'ERROR' && (
                            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                          )}

                          {!isProcessing && (
                            <button
                              type="button"
                              onClick={() => handleRemoveQueueItem(item.id)}
                              className="text-muted-foreground hover:text-foreground p-0.5"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
              {completedCount === totalCount && totalCount > 0 ? 'Close' : 'Cancel'}
            </Button>

            {storageCheckStatus === 'CONFIGURED' && (
              <Button
                type="button"
                size="sm"
                onClick={handleStartUpload}
                disabled={
                  isProcessing ||
                  !customerId ||
                  queue.filter((i) => i.status === 'QUEUED' || i.status === 'ERROR').length === 0
                }
                className="bg-primary text-primary-foreground font-medium"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Streaming to Cloud...
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
                    Start Cloud Upload ({queue.filter((i) => i.status === 'QUEUED').length})
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
