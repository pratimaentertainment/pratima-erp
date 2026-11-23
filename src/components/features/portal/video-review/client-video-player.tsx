'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Play,
  Lock,
  ExternalLink,
  Film,
  AlertTriangle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ClientVideoPlayerProps {
  url: string;
  title: string;
  watermarkText?: string;
  studioName?: string;
  allowDownload?: boolean;
}

/**
 * Extracts YouTube video ID from various YouTube URL formats.
 */
function extractYouTubeId(url: string): string | null {
  const regExp =
    /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

/**
 * Extracts Google Drive file ID from view/edit/preview sharing links.
 */
function extractGoogleDriveId(url: string): string | null {
  // Format: /file/d/FILE_ID/...
  const fileDMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    return fileDMatch[1];
  }
  // Format: id=FILE_ID
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    return idMatch[1];
  }
  return null;
}

/**
 * Extracts Vimeo video ID from standard Vimeo links.
 */
function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)/);
  return match && match[3] ? match[3] : null;
}

/**
 * Checks if a URL points directly to an HTML5 playable video stream/file.
 */
function isDirectVideoUrl(url: string): boolean {
  const cleanUrl = url.split('?')[0].toLowerCase();
  return (
    cleanUrl.endsWith('.mp4') ||
    cleanUrl.endsWith('.webm') ||
    cleanUrl.endsWith('.ogg') ||
    cleanUrl.endsWith('.mov') ||
    cleanUrl.endsWith('.m4v')
  );
}

export function ClientVideoPlayer({
  url,
  title,
  watermarkText = 'CONFIDENTIAL CLIENT PREVIEW • DO NOT DISTRIBUTE',
  studioName = 'Pratima Studio',
  allowDownload = false,
}: ClientVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);

  const cleanUrl = url.trim();

  // 1. YouTube Detection
  const youtubeId = useMemo(() => extractYouTubeId(cleanUrl), [cleanUrl]);

  // 2. Google Drive Detection
  const googleDriveId = useMemo(() => extractGoogleDriveId(cleanUrl), [cleanUrl]);

  // 3. Vimeo Detection
  const vimeoId = useMemo(() => extractVimeoId(cleanUrl), [cleanUrl]);

  // 4. Direct HTML5 Media Detection
  const isDirect = useMemo(() => isDirectVideoUrl(cleanUrl), [cleanUrl]);

  // Prevent right-click context menu (Anti-Save)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    return false;
  };

  if (!cleanUrl) {
    return (
      <div className="w-full aspect-video rounded-xl border border-dashed border-border/80 bg-muted/40 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
        <Film className="h-8 w-8 mb-2 stroke-1" />
        <p className="text-xs font-medium">Video preview is being prepared by our editors.</p>
        <p className="text-[11px] text-muted-foreground/70 mt-0.5">
          Once the initial cut is rendered, it will stream here for your review.
        </p>
      </div>
    );
  }

  return (
    <div
      onContextMenu={handleContextMenu}
      className="relative w-full rounded-xl overflow-hidden border border-border/80 bg-black shadow-md select-none group"
    >
      {/* Anti-Download Security Header Ribbon */}
      <div className="absolute top-2 left-2 z-30 flex items-center gap-2 pointer-events-none">
        <Badge
          variant="outline"
          className="bg-black/75 text-zinc-100 border-zinc-700 backdrop-blur-md text-[10px] font-mono px-2 py-0.5 flex items-center gap-1 shadow-sm"
        >
          <Lock className="h-2.5 w-2.5 text-amber-400" />
          <span>STREAM ONLY • DOWNLOAD PROTECTED</span>
        </Badge>
      </div>

      {/* Floating Studio Watermark in Corner */}
      <div className="absolute bottom-3 right-3 z-30 pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity">
        <span className="text-[10px] font-mono tracking-widest text-white/90 bg-black/60 px-2 py-1 rounded backdrop-blur-xs uppercase border border-white/10">
          {studioName}
        </span>
      </div>

      {/* Center Subtle Transparent Screen Watermark */}
      <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center overflow-hidden">
        <p className="text-[13px] sm:text-sm font-black tracking-widest text-white/10 select-none uppercase -rotate-12 whitespace-nowrap text-center">
          {watermarkText}
        </p>
      </div>

      {/* 1. YOUTUBE EMBED PLAYER */}
      {youtubeId && (
        <div className="relative w-full aspect-video bg-black">
          {/* Transparent Overlay to block clicking top YouTube title/share buttons */}
          <div className="absolute top-0 left-0 right-0 h-14 z-20 pointer-events-auto bg-transparent cursor-default" />
          {/* Transparent Overlay to block bottom right "Watch on YouTube" native button */}
          <div className="absolute bottom-0 right-0 w-36 h-10 z-20 pointer-events-auto bg-transparent cursor-default" />

          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&controls=1&playsinline=1`}
            title={title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {/* 2. GOOGLE DRIVE EMBED PREVIEW */}
      {!youtubeId && googleDriveId && (
        <div className="relative w-full aspect-video bg-black">
          {/* Top-Right Corner Blocker: Prevents clicking the Drive "Pop-out in new tab" icon */}
          <div
            className="absolute top-0 right-0 w-16 h-16 z-20 pointer-events-auto bg-transparent cursor-default"
            title="Download & external opening disabled during review"
          />

          <iframe
            src={`https://drive.google.com/file/d/${googleDriveId}/preview`}
            title={title}
            className="w-full h-full border-0"
            allow="autoplay"
          />
        </div>
      )}

      {/* 3. VIMEO EMBED PLAYER */}
      {!youtubeId && !googleDriveId && vimeoId && (
        <div className="relative w-full aspect-video bg-black">
          <iframe
            src={`https://player.vimeo.com/video/${vimeoId}?badge=0&autopause=0&player_id=0&app_id=58479`}
            title={title}
            className="w-full h-full border-0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {/* 4. DIRECT HTML5 VIDEO (Strict Anti-Download Parameters) */}
      {!youtubeId && !googleDriveId && !vimeoId && isDirect && (
        <div className="relative w-full aspect-video bg-black flex items-center justify-center">
          <video
            src={cleanUrl}
            controls
            playsInline
            controlsList="nodownload nofullscreen noplaybackrate"
            disablePictureInPicture
            onContextMenu={handleContextMenu}
            className="w-full h-full object-contain"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onError={() => setHasError(true)}
          >
            Your browser does not support the video tag.
          </video>

          {hasError && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4 text-center text-zinc-300 z-30">
              <AlertTriangle className="h-6 w-6 text-amber-400 mb-2" />
              <p className="text-xs font-semibold">Video format could not be played directly in browser.</p>
              <p className="text-[11px] text-zinc-400 mt-1 max-w-sm">
                Our team is encoding a web-compatible streaming stream. Please check back shortly.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 5. GENERIC SECURE IFRAME FALLBACK (Frame.io or Cloud Preview) */}
      {!youtubeId && !googleDriveId && !vimeoId && !isDirect && (
        <div className="relative w-full aspect-video bg-black">
          {/* Top-Right blocker to minimize external navigation */}
          <div className="absolute top-0 right-0 w-16 h-14 z-20 pointer-events-auto bg-transparent cursor-default" />

          <iframe
            src={cleanUrl}
            title={title}
            className="w-full h-full border-0"
            allow="autoplay; fullscreen"
            sandbox="allow-scripts allow-same-origin allow-presentation"
          />
        </div>
      )}
    </div>
  );
}
