'use client';

import * as React from 'react';
import { useState, useRef, useEffect, useCallback, useTransition } from 'react';
import {
  UploadCloud,
  Film,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  HardDrive,
  FileVideo,
  X,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  initiateMultipartUploadAction,
  getMultipartPreSignedUrlsAction,
  completeMultipartUploadAction,
  syncUploadedVideoToEditorAction,
  abortMultipartUploadAction,
} from '@/actions/byos-multipart.actions';

// -----------------------------------------------------------------------------
// CONSTANTS & TYPES
// -----------------------------------------------------------------------------

const DEFAULT_CHUNK_SIZE = 20 * 1024 * 1024; // 20 MB per chunk
const CONCURRENCY_LIMIT = 3; // 3 concurrent chunks

export type UploadStatus =
  | 'IDLE'
  | 'INITIALIZING'
  | 'UPLOADING'
  | 'PAUSED'
  | 'COMPLETING'
  | 'SUCCESS'
  | 'ERROR';

export interface CompletedPart {
  partNumber: number;
  eTag: string;
}

interface PersistedUploadSession {
  uploadId: string;
  key: string;
  integrationId?: string;
  fileName: string;
  fileSize: number;
  chunkSize: number;
  completedParts: CompletedPart[];
  lastUpdated: number;
  bookingId?: string;
  customerId?: string;
}

export interface ResumableVideoUploaderProps {
  bookingId?: string;
  customerId?: string;
  bookingTitle?: string;
  customerName?: string;
  onUploadComplete?: (storageRecord: any) => void;
  autoSyncToEditor?: boolean;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function ResumableVideoUploader({
  bookingId,
  customerId,
  bookingTitle,
  customerName,
  onUploadComplete,
  autoSyncToEditor = true,
}: ResumableVideoUploaderProps) {
  // File & Upload State
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active Session Info
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [integrationId, setIntegrationId] = useState<string | null>(null);
  const [completedParts, setCompletedParts] = useState<CompletedPart[]>([]);

  // Telemetry (Speed, Progress, ETA)
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [uploadedBytes, setUploadedBytes] = useState<number>(0);
  const [speedMBps, setSpeedMBps] = useState<number>(0);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number | null>(null);
  const [isResumedSession, setIsResumedSession] = useState<boolean>(false);
  const [finalAssetUrl, setFinalAssetUrl] = useState<string | null>(null);

  // Refs for loop controls and mutable state across renders
  const isPausedRef = useRef<boolean>(false);
  const isCancelledRef = useRef<boolean>(false);
  const completedPartsRef = useRef<CompletedPart[]>([]);
  const uploadStartTimeRef = useRef<number>(0);
  const bytesAtStartRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize ref
  useEffect(() => {
    completedPartsRef.current = completedParts;
  }, [completedParts]);

  // Unique session storage key generator for resumability
  const getStorageKeyForFile = useCallback(
    (f: File) => {
      const scope = bookingId || customerId || 'general';
      return `pratima_multipart_upload_${f.name}_${f.size}_${f.lastModified}_${scope}`;
    },
    [bookingId, customerId]
  );

  // Check localStorage on file selection
  const checkPersistedSession = useCallback(
    (f: File): PersistedUploadSession | null => {
      try {
        const key = getStorageKeyForFile(f);
        const stored = localStorage.getItem(key);
        if (!stored) return null;
        const parsed: PersistedUploadSession = JSON.parse(stored);
        // Ensure not expired (persist up to 48 hours)
        const isFresh = Date.now() - parsed.lastUpdated < 48 * 60 * 60 * 1000;
        return isFresh ? parsed : null;
      } catch (e) {
        console.warn('Failed to parse localStorage upload session:', e);
        return null;
      }
    },
    [getStorageKeyForFile]
  );

  const savePersistedSession = useCallback(
    (f: File, session: PersistedUploadSession) => {
      try {
        const key = getStorageKeyForFile(f);
        localStorage.setItem(key, JSON.stringify(session));
      } catch (e) {
        console.warn('Failed to save upload state to localStorage:', e);
      }
    },
    [getStorageKeyForFile]
  );

  const clearPersistedSession = useCallback(
    (f: File) => {
      try {
        const key = getStorageKeyForFile(f);
        localStorage.removeItem(key);
      } catch (e) {
        console.warn('Failed to clear localStorage session:', e);
      }
    },
    [getStorageKeyForFile]
  );

  // Handle file drop / input
  const handleFileChange = (selectedFile: File) => {
    // Validate video format or archive
    const isVideo =
      selectedFile.type.startsWith('video/') ||
      /\.(mp4|mov|mkv|avi|braw|r3d|prores|m4v|wmv|zip|tar|rar)$/i.test(selectedFile.name);

    if (!isVideo) {
      toast.error('Please select a valid raw video file (.mp4, .mov, .mkv, .braw, .zip).');
      return;
    }

    setFile(selectedFile);
    setUploadStatus('IDLE');
    setErrorMessage(null);
    setFinalAssetUrl(null);
    setProgressPercent(0);
    setUploadedBytes(0);
    setSpeedMBps(0);
    setTimeRemainingSeconds(null);

    // Check for previous incomplete upload session
    const existing = checkPersistedSession(selectedFile);
    if (existing && existing.completedParts.length > 0) {
      setUploadId(existing.uploadId);
      setStorageKey(existing.key);
      setIntegrationId(existing.integrationId || null);
      setCompletedParts(existing.completedParts);
      setIsResumedSession(true);

      const totalChunks = Math.ceil(selectedFile.size / existing.chunkSize);
      const initialProgress = Math.round((existing.completedParts.length / totalChunks) * 100);
      setProgressPercent(initialProgress);
      setUploadedBytes(existing.completedParts.length * existing.chunkSize);

      toast.info(
        `Found previous upload session! ${existing.completedParts.length} of ${totalChunks} chunks already completed. Click Resume to continue.`
      );
    } else {
      setUploadId(null);
      setStorageKey(null);
      setIntegrationId(null);
      setCompletedParts([]);
      setIsResumedSession(false);
    }
  };

  // ---------------------------------------------------------------------------
  // MULTIPART CHUNK ENGINE
  // ---------------------------------------------------------------------------

  const startOrResumeUpload = async () => {
    if (!file) return;

    isPausedRef.current = false;
    isCancelledRef.current = false;
    setErrorMessage(null);

    let currentUploadId = uploadId;
    let currentStorageKey = storageKey;
    let currentIntegrationId = integrationId;
    const chunkSize = DEFAULT_CHUNK_SIZE;
    const totalChunks = Math.ceil(file.size / chunkSize);

    // 1. Initialize Multipart Upload if not already initiated
    if (!currentUploadId || !currentStorageKey) {
      setUploadStatus('INITIALIZING');
      try {
        const initRes = await initiateMultipartUploadAction({
          filename: file.name,
          sizeBytes: file.size,
          mimeType: file.type || 'video/mp4',
          bookingId: bookingId || null,
          customerId: customerId || null,
          chunkSize,
        });

        if (!initRes.success || !initRes.uploadId || !initRes.key) {
          throw new Error(initRes.error || 'Failed to initialize multipart upload.');
        }

        currentUploadId = initRes.uploadId;
        currentStorageKey = initRes.key;
        currentIntegrationId = initRes.integrationId || null;

        setUploadId(currentUploadId);
        setStorageKey(currentStorageKey);
        setIntegrationId(currentIntegrationId);

        // Save session structure
        savePersistedSession(file, {
          uploadId: currentUploadId,
          key: currentStorageKey,
          integrationId: currentIntegrationId || undefined,
          fileName: file.name,
          fileSize: file.size,
          chunkSize,
          completedParts: [],
          lastUpdated: Date.now(),
          bookingId,
          customerId,
        });
      } catch (err: any) {
        console.error('Multipart Init Error:', err);
        setUploadStatus('ERROR');
        setErrorMessage(err?.message || 'Failed to initialize upload on cloud storage.');
        toast.error(err?.message || 'Initialization failed.');
        return;
      }
    }

    setUploadStatus('UPLOADING');
    uploadStartTimeRef.current = Date.now();
    bytesAtStartRef.current = completedPartsRef.current.length * chunkSize;

    // 2. Determine Missing Chunks
    const completedSet = new Set(completedPartsRef.current.map((p) => p.partNumber));
    const partsToUpload: number[] = [];
    for (let p = 1; p <= totalChunks; p++) {
      if (!completedSet.has(p)) {
        partsToUpload.push(p);
      }
    }

    if (partsToUpload.length === 0) {
      // All parts already uploaded, finalize!
      await finalizeUpload(currentUploadId, currentStorageKey, currentIntegrationId);
      return;
    }

    // 3. Process Chunk Queue with Concurrency
    let queueIndex = 0;
    let activeWorkers = 0;
    let hasEncounteredError = false;

    // Upload worker function
    const uploadWorker = async (): Promise<void> => {
      while (queueIndex < partsToUpload.length) {
        if (isPausedRef.current || isCancelledRef.current || hasEncounteredError) {
          return;
        }

        const partNumber = partsToUpload[queueIndex];
        queueIndex++;

        try {
          // Get pre-signed URL for this chunk
          const signRes = await getMultipartPreSignedUrlsAction({
            uploadId: currentUploadId!,
            key: currentStorageKey!,
            partNumbers: [partNumber],
            integrationId: currentIntegrationId || undefined,
          });

          if (!signRes.success || !signRes.partUrls || !signRes.partUrls[partNumber]) {
            throw new Error(signRes.error || `Failed to sign upload URL for chunk #${partNumber}`);
          }

          const presignedUrl = signRes.partUrls[partNumber];

          // Slice chunk from file
          const start = (partNumber - 1) * chunkSize;
          const end = Math.min(start + chunkSize, file.size);
          const chunkBlob = file.slice(start, end);

          // Upload chunk directly to BYOS provider via PUT
          const uploadRes = await fetch(presignedUrl, {
            method: 'PUT',
            body: chunkBlob,
            headers: {
              'Content-Type': 'application/octet-stream',
            },
          });

          if (!uploadRes.ok && uploadRes.status !== 200) {
            throw new Error(`Cloud storage rejected chunk #${partNumber} with HTTP ${uploadRes.status}`);
          }

          // Extract ETag header
          const rawETag = uploadRes.headers.get('ETag') || `"part-${partNumber}-${Date.now()}"`;
          const cleanETag = rawETag.replace(/^"|"$/g, '');

          // Update completed parts
          const newCompletedPart = { partNumber, eTag: cleanETag };
          completedPartsRef.current.push(newCompletedPart);

          const updatedPartsList = [...completedPartsRef.current];
          setCompletedParts(updatedPartsList);

          // Persist progress to localStorage
          savePersistedSession(file, {
            uploadId: currentUploadId!,
            key: currentStorageKey!,
            integrationId: currentIntegrationId || undefined,
            fileName: file.name,
            fileSize: file.size,
            chunkSize,
            completedParts: updatedPartsList,
            lastUpdated: Date.now(),
            bookingId,
            customerId,
          });

          // Update Progress & Speed Telemetry
          const currentUploadedBytes = Math.min(updatedPartsList.length * chunkSize, file.size);
          setUploadedBytes(currentUploadedBytes);

          const currentPct = Math.min(Math.round((currentUploadedBytes / file.size) * 100), 99);
          setProgressPercent(currentPct);

          const elapsedSec = (Date.now() - uploadStartTimeRef.current) / 1000;
          const deltaBytes = currentUploadedBytes - bytesAtStartRef.current;
          if (elapsedSec > 0.5 && deltaBytes > 0) {
            const speed = deltaBytes / elapsedSec / (1024 * 1024); // MB/s
            setSpeedMBps(Math.round(speed * 10) / 10);

            const remainingBytes = file.size - currentUploadedBytes;
            const bytesPerSec = deltaBytes / elapsedSec;
            if (bytesPerSec > 0) {
              const etaSec = Math.ceil(remainingBytes / bytesPerSec);
              setTimeRemainingSeconds(etaSec);
            }
          }
        } catch (workerErr: any) {
          console.error(`Chunk #${partNumber} failed:`, workerErr);
          hasEncounteredError = true;
          setUploadStatus('ERROR');
          setErrorMessage(workerErr?.message || `Chunk #${partNumber} upload failed.`);
          toast.error(`Chunk #${partNumber} failed. Check network connection and click Resume.`);
          return;
        }
      }
    };

    // Launch worker pool
    const workers = [];
    const poolSize = Math.min(CONCURRENCY_LIMIT, partsToUpload.length);
    for (let i = 0; i < poolSize; i++) {
      workers.push(uploadWorker());
    }

    await Promise.all(workers);

    // Check if stopped or completed
    if (isPausedRef.current) {
      setUploadStatus('PAUSED');
      toast.info('Upload paused. Progress preserved in local storage.');
      return;
    }

    if (hasEncounteredError || isCancelledRef.current) {
      return;
    }

    // 4. All chunks finished -> Complete Multipart Upload
    if (completedPartsRef.current.length >= totalChunks) {
      await finalizeUpload(currentUploadId, currentStorageKey, currentIntegrationId);
    }
  };

  // ---------------------------------------------------------------------------
  // COMPLETE & SYNC WORKFLOW
  // ---------------------------------------------------------------------------

  const finalizeUpload = async (
    activeUploadId: string,
    activeKey: string,
    activeIntegrationId: string | null
  ) => {
    if (!file) return;

    setUploadStatus('COMPLETING');
    setProgressPercent(100);

    try {
      // 1. Complete multipart upload on BYOS
      const completeRes = await completeMultipartUploadAction({
        uploadId: activeUploadId,
        key: activeKey,
        integrationId: activeIntegrationId || undefined,
        parts: completedPartsRef.current,
        filename: file.name,
        sizeBytes: file.size,
        mimeType: file.type || 'video/mp4',
        bookingId: bookingId || null,
        customerId: customerId || null,
      });

      if (!completeRes.success || !completeRes.storageRecord) {
        throw new Error(completeRes.error || 'Failed to assemble video parts on BYOS.');
      }

      const publicUrl = completeRes.publicUrl;
      setFinalAssetUrl(publicUrl);

      // 2. Automatically sync to Editor WorkflowTask
      if (autoSyncToEditor && bookingId && publicUrl) {
        try {
          await syncUploadedVideoToEditorAction({
            bookingId,
            storageRecordId: completeRes.storageRecord.id,
            assetsUrl: publicUrl,
            filename: file.name,
          });
          toast.success('Raw video vault URL mapped directly to Video Editing task!');
        } catch (syncErr) {
          console.warn('Editor sync notice:', syncErr);
        }
      }

      // 3. Clear localStorage session upon complete success
      clearPersistedSession(file);

      setUploadStatus('SUCCESS');
      toast.success(`"${file.name}" uploaded successfully!`);

      if (onUploadComplete) {
        onUploadComplete(completeRes.storageRecord);
      }
    } catch (err: any) {
      console.error('Finalize error:', err);
      setUploadStatus('ERROR');
      setErrorMessage(err?.message || 'Failed to complete multipart assembly.');
      toast.error(err?.message || 'Assembly failed.');
    }
  };

  // ---------------------------------------------------------------------------
  // USER CONTROLS (Pause, Resume, Reset)
  // ---------------------------------------------------------------------------

  const handlePause = () => {
    isPausedRef.current = true;
    setUploadStatus('PAUSED');
  };

  const handleResume = () => {
    isPausedRef.current = false;
    startOrResumeUpload();
  };

  const handleReset = async () => {
    if (uploadId && storageKey && uploadStatus !== 'SUCCESS') {
      try {
        await abortMultipartUploadAction(uploadId, storageKey, integrationId || undefined);
      } catch (e) {
        console.warn('Abort error ignored:', e);
      }
    }

    if (file) {
      clearPersistedSession(file);
    }

    setFile(null);
    setUploadStatus('IDLE');
    setErrorMessage(null);
    setUploadId(null);
    setStorageKey(null);
    setCompletedParts([]);
    setProgressPercent(0);
    setUploadedBytes(0);
    setSpeedMBps(0);
    setTimeRemainingSeconds(null);
    setIsResumedSession(false);
    setFinalAssetUrl(null);
  };

  // Formatting helpers
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatETA = (seconds: number | null) => {
    if (seconds === null || !isFinite(seconds) || seconds <= 0) return '--';
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m < 60) return `${m}m ${s}s`;
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}h ${rm}m`;
  };

  return (
    <Card className="border-border/80 shadow-xs bg-card overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/60 bg-muted/15">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Film className="h-4 w-4" />
              </div>
              <CardTitle className="text-base font-bold text-foreground">
                Resumable Multipart RAW Video Uploader
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Direct-to-BYOS 20MB chunked streaming. Auto-resumes from exact chunk if power or network drops.
            </CardDescription>
          </div>

          <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider self-start sm:self-auto bg-primary/5 text-primary border-primary/20">
            Zero-Server Load
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-5">
        {/* Step 1: File Selection Dropzone (When idle or no file selected) */}
        {!file && (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFileChange(e.dataTransfer.files[0]);
              }
            }}
            className="border-2 border-dashed border-border/80 hover:border-indigo-500/60 rounded-2xl p-8 text-center cursor-pointer transition-all bg-card/60 hover:bg-muted/30 flex flex-col items-center justify-center gap-3 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,.mp4,.mov,.mkv,.avi,.braw,.r3d,.prores,.zip"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileChange(e.target.files[0]);
                }
              }}
            />

            <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <UploadCloud className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">
                Drag & drop massive raw video master files here
              </p>
              <p className="text-xs text-muted-foreground">
                Supports 4K/8K RAW footage, ProRes, BRAW, or ZIP multi-cam packages up to 500GB+
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button type="button" size="sm" variant="outline" className="h-8 text-xs font-semibold pointer-events-none">
                Browse Files
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Active Upload & Resumability Progress View */}
        {file && (
          <div className="space-y-4">
            {/* File Info Card */}
            <div className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <FileVideo className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold truncate text-foreground" title={file.name}>
                    {file.name}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>{formatBytes(file.size)}</span>
                    <span>•</span>
                    <span>{Math.ceil(file.size / DEFAULT_CHUNK_SIZE)} Chunks (20MB each)</span>
                    {isResumedSession && (
                      <>
                        <span>•</span>
                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] px-1.5 py-0">
                          Resumed Session
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="shrink-0 flex items-center gap-2">
                {uploadStatus === 'IDLE' && (
                  <Badge variant="outline" className="text-xs">Ready to Stream</Badge>
                )}
                {uploadStatus === 'INITIALIZING' && (
                  <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-xs">
                    Allocating Cloud Vault...
                  </Badge>
                )}
                {uploadStatus === 'UPLOADING' && (
                  <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 text-xs animate-pulse">
                    Streaming Chunks...
                  </Badge>
                )}
                {uploadStatus === 'PAUSED' && (
                  <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs">
                    Paused (Progress Saved)
                  </Badge>
                )}
                {uploadStatus === 'COMPLETING' && (
                  <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 text-xs animate-pulse">
                    Assembling Video Master...
                  </Badge>
                )}
                {uploadStatus === 'SUCCESS' && (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-semibold">
                    Upload Complete
                  </Badge>
                )}
                {uploadStatus === 'ERROR' && (
                  <Badge variant="destructive" className="text-xs">Interrupted</Badge>
                )}
              </div>
            </div>

            {/* Progress Bar & Telemetry */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-foreground flex items-center gap-1.5">
                  <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>
                    {formatBytes(uploadedBytes)} / {formatBytes(file.size)} ({progressPercent}%)
                  </span>
                </span>

                <div className="flex items-center gap-3 text-muted-foreground">
                  {uploadStatus === 'UPLOADING' && speedMBps > 0 && (
                    <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold">
                      <Zap className="h-3.5 w-3.5" />
                      <span>{speedMBps} MB/s</span>
                    </span>
                  )}
                  {uploadStatus === 'UPLOADING' && timeRemainingSeconds !== null && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>ETA: {formatETA(timeRemainingSeconds)}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                <span>
                  Chunks verified: {completedParts.length} / {Math.ceil(file.size / DEFAULT_CHUNK_SIZE)}
                </span>
                <span>Direct S3/R2 Secure Gateway</span>
              </div>
            </div>

            {/* Error Notice */}
            {errorMessage && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-semibold">Upload Interrupted: </span>
                  <span>{errorMessage}</span>
                  <p className="text-[11px] text-destructive/80 mt-1">
                    Your completed chunks are safely preserved. Click &ldquo;Resume Upload&rdquo; to continue from the interruption point.
                  </p>
                </div>
              </div>
            )}

            {/* Success Vault Notice */}
            {uploadStatus === 'SUCCESS' && finalAssetUrl && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Cloud Video Master Assembly Successful!</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  The video has been safely stored in your BYOS vault and registered in Pratima ERP storage records.
                  {autoSyncToEditor && bookingId && ' The URL has been automatically mapped to the Video Editing deliverable task.'}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={finalAssetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
                  >
                    <span>View Cloud Video</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    className="h-8 text-xs"
                  >
                    Upload Another Video
                  </Button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {uploadStatus !== 'SUCCESS' && (
              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-8 text-xs text-muted-foreground hover:text-destructive"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  Cancel & Reset
                </Button>

                <div className="flex items-center gap-2">
                  {uploadStatus === 'IDLE' && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={startOrResumeUpload}
                      className="h-9 px-4 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-xs"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>{isResumedSession ? 'Resume Upload' : 'Start Resumable Upload'}</span>
                    </Button>
                  )}

                  {uploadStatus === 'UPLOADING' && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handlePause}
                      className="h-9 px-4 text-xs font-semibold gap-1.5"
                    >
                      <Pause className="h-3.5 w-3.5 fill-current" />
                      <span>Pause</span>
                    </Button>
                  )}

                  {uploadStatus === 'PAUSED' && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleResume}
                      className="h-9 px-4 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-xs"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Resume Upload</span>
                    </Button>
                  )}

                  {uploadStatus === 'ERROR' && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleResume}
                      className="h-9 px-4 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white gap-1.5 shadow-xs"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Retry Missing Chunks</span>
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
