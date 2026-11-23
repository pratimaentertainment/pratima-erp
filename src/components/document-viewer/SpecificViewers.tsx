import * as React from 'react';
import { cn } from '@/lib/utils';
import { FileQuestion } from 'lucide-react';
import type { DocumentViewerProps } from './types';

// Concrete implementations would use advanced libraries like react-pdf, video.js, etc.
// These are purely structural stubs for the presentation tier.

export function ImageViewer({ url, filename, className }: DocumentViewerProps) {
  return (
    <div className={cn("relative flex items-center justify-center bg-muted/20 w-full h-full min-h-[300px]", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={filename} className="max-w-full max-h-full object-contain" loading="lazy" />
    </div>
  );
}

export function PdfViewer({ url, filename, className }: DocumentViewerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center bg-muted/20 w-full h-full min-h-[300px]", className)}>
      <object data={url} type="application/pdf" className="w-full h-full min-h-[600px]">
        <p>PDF preview not available. <a href={url} target="_blank" rel="noreferrer" className="text-primary hover:underline">Download {filename}</a></p>
      </object>
    </div>
  );
}

export function VideoViewer({ url, className }: DocumentViewerProps) {
  return (
    <div className={cn("flex items-center justify-center bg-black w-full h-full", className)}>
      <video controls className="max-w-full max-h-full">
        <source src={url} />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}

export function AudioPlayer({ url, className }: DocumentViewerProps) {
  return (
    <div className={cn("flex items-center justify-center bg-muted/20 w-full p-8 rounded-md", className)}>
      <audio controls className="w-full max-w-md">
        <source src={url} />
        Your browser does not support the audio element.
      </audio>
    </div>
  );
}

export function UnknownViewer({ filename, url, className }: DocumentViewerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center bg-muted/10 w-full h-full p-8 min-h-[300px]", className)}>
      <FileQuestion className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
      <p className="text-sm font-medium mb-2">No preview available</p>
      <a href={url} download className="text-primary hover:underline text-sm font-medium bg-primary/10 px-4 py-2 rounded-md">
        Download {filename}
      </a>
    </div>
  );
}
