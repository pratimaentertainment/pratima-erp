'use client';

import * as React from 'react';
import { useState } from 'react';
import {
  Film,
  UploadCloud,
  HardDrive,
  FileVideo,
  ImageIcon,
  FolderOpen,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ResumableVideoUploader } from './resumable-video-uploader';
import { UniversalUploaderModal } from '@/components/media/universal-uploader-modal';
import { formatDate } from '@/lib/date';

export interface BookingMediaManagerProps {
  customerId?: string;
  bookingId?: string;
  customerName?: string;
  bookingTitle?: string;
  initialStorageRecords?: any[];
  className?: string;
}

export function BookingMediaManager({
  customerId,
  bookingId,
  customerName,
  bookingTitle,
  initialStorageRecords = [],
  className,
}: BookingMediaManagerProps) {
  const [records, setRecords] = useState<any[]>(initialStorageRecords);
  const [activeMediaTab, setActiveMediaTab] = useState<'video' | 'gallery'>('video');

  const videoRecords = records.filter(
    (r) =>
      r.mimeType?.startsWith('video/') ||
      /\.(mp4|mov|mkv|braw|zip)$/i.test(r.fileName || '')
  );

  const photoRecords = records.filter(
    (r) =>
      !r.mimeType?.startsWith('video/') &&
      !/\.(mp4|mov|mkv|braw|zip)$/i.test(r.fileName || '')
  );

  const handleNewRecordUploaded = (newRecord: any) => {
    setRecords((prev) => [newRecord, ...prev]);
  };

  const formatFileSize = (bytes: number | string | bigint) => {
    const num = Number(bytes || 0);
    if (num === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(num) / Math.log(k));
    return `${parseFloat((num / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Top Media Command Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border/80 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <HardDrive className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold text-foreground">
              BYOS Cloud Storage & Native Media Center
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            {bookingTitle ? `Project: ${bookingTitle}` : customerName ? `Client: ${customerName}` : 'Centralized Media Vault'} • Direct browser-to-cloud transfers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <UniversalUploaderModal
            preSelectedCustomerId={customerId}
            preSelectedEventBookingId={bookingId}
            title={`Upload Photos for ${customerName || 'Project'}`}
            triggerButton={
              <Button size="sm" variant="outline" className="h-8 text-xs font-semibold gap-1.5 border-border">
                <UploadCloud className="w-3.5 h-3.5 text-primary" />
                <span>Upload Photos</span>
              </Button>
            }
          />
        </div>
      </div>

      {/* Media Type Sub-Tabs */}
      <Tabs value={activeMediaTab} onValueChange={(val) => setActiveMediaTab(val as any)} className="space-y-4">
        <TabsList className="bg-muted/60 p-1 border border-border/60">
          <TabsTrigger value="video" className="text-xs gap-1.5 font-semibold">
            <Film className="w-3.5 h-3.5 text-indigo-500" />
            <span>RAW Video Uploader (Resumable)</span>
            <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0 h-4">
              {videoRecords.length}
            </Badge>
          </TabsTrigger>

          <TabsTrigger value="gallery" className="text-xs gap-1.5 font-semibold">
            <ImageIcon className="w-3.5 h-3.5 text-primary" />
            <span>All Cloud Storage Assets</span>
            <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0 h-4">
              {records.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Resumable Video Uploader */}
        <TabsContent value="video" className="space-y-5">
          <ResumableVideoUploader
            bookingId={bookingId}
            customerId={customerId}
            bookingTitle={bookingTitle}
            customerName={customerName}
            onUploadComplete={handleNewRecordUploaded}
            autoSyncToEditor={true}
          />

          {/* List of uploaded video masters for this booking/customer */}
          {videoRecords.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Uploaded Video Deliverables & RAW Masters ({videoRecords.length})</span>
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {videoRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3.5 rounded-xl border border-border bg-card shadow-2xs hover:border-primary/50 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <FileVideo className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold font-mono truncate text-foreground" title={rec.fileName}>
                          {rec.fileName}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                          <span>{formatFileSize(rec.sizeBytes)}</span>
                          <span>•</span>
                          <span>{rec.integration?.name || rec.integration?.provider || 'BYOS Cloud'}</span>
                          {rec.createdAt && (
                            <>
                              <span>•</span>
                              <span>{formatDate(rec.createdAt, 'dd MMM yyyy')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {rec.url && (
                      <a
                        href={rec.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-8 px-2.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted inline-flex items-center gap-1 shrink-0"
                      >
                        <span>Open Vault</span>
                        <ExternalLink className="w-3 h-3 text-muted-foreground" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab 2: All Cloud Storage Assets */}
        <TabsContent value="gallery" className="space-y-4">
          {records.length === 0 ? (
            <Card className="border-dashed border-2 bg-card/40">
              <CardContent className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                <div className="p-3.5 rounded-2xl bg-primary/10 text-primary">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="max-w-md space-y-1">
                  <h4 className="text-sm font-semibold">No Cloud Media Uploaded Yet</h4>
                  <p className="text-xs text-muted-foreground">
                    Upload raw video footage or event photo proofs directly to your BYOS storage bucket.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {records.map((rec: any) => {
                const isVideo =
                  rec.mimeType?.startsWith('video/') ||
                  /\.(mp4|mov|mkv|braw|zip)$/i.test(rec.fileName || '');

                return (
                  <div
                    key={rec.id}
                    className="group relative rounded-xl border border-border bg-card overflow-hidden shadow-2xs hover:border-primary/50 transition-all flex flex-col justify-between"
                  >
                    <div className="relative aspect-square w-full bg-slate-900 overflow-hidden flex items-center justify-center">
                      {!isVideo && rec.url ? (
                        <img
                          src={rec.url}
                          alt={rec.fileName}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-muted-foreground text-xs p-2 text-center">
                          {isVideo ? (
                            <FileVideo className="w-8 h-8 text-indigo-400 mb-1" />
                          ) : (
                            <ImageIcon className="w-8 h-8 opacity-50 mb-1" />
                          )}
                          <span className="truncate w-full font-mono text-[10px]">{rec.fileName}</span>
                        </div>
                      )}

                      <div className="absolute top-1.5 right-1.5">
                        <Badge
                          variant="outline"
                          className="bg-black/70 text-white border-white/20 text-[9px] px-1 py-0 font-bold"
                        >
                          {rec.integration?.provider || 'BYOS'}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-2 space-y-1 text-xs">
                      <span className="font-mono text-[11px] truncate block font-medium" title={rec.fileName}>
                        {rec.fileName}
                      </span>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{formatFileSize(rec.sizeBytes)}</span>
                        {rec.url && (
                          <a
                            href={rec.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary underline flex items-center gap-0.5"
                          >
                            View <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
