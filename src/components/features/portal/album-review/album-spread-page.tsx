'use client';

import * as React from 'react';
import { useRef, useState } from 'react';
import { SpatialCommentPin, SpatialCommentItem } from './spatial-comment-pin';
import { MapPin, Sparkles, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface AlbumPageSpread {
  id: string;
  pageNumber: number;
  title?: string | null;
  imageUrl: string;
  fileName?: string;
  commentsCount: number;
  unresolvedCount: number;
  comments: SpatialCommentItem[];
}

interface AlbumSpreadPageProps {
  page: AlbumPageSpread;
  isPinDropMode: boolean;
  onSpreadClick: (coords: { xPos: number; yPos: number }) => void;
  selectedCommentId: string | null;
  onSelectComment: (id: string | null) => void;
  onResolveComment: (commentId: string, isResolved: boolean) => void;
  onDeleteComment: (commentId: string) => void;
  zoomLevel?: number;
}

export function AlbumSpreadPage({
  page,
  isPinDropMode,
  onSpreadClick,
  selectedCommentId,
  onSelectComment,
  onResolveComment,
  onDeleteComment,
  zoomLevel = 1,
}: AlbumSpreadPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only drop pins when pin drop mode is active, or user clicked directly on spread image
    if (!isPinDropMode) {
      // If clicking outside an active pin, unselect
      onSelectComment(null);
      return;
    }

    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const xPercentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    const yPercentage = Math.max(0, Math.min(100, (clickY / rect.height) * 100));

    onSpreadClick({
      xPos: Number(xPercentage.toFixed(2)),
      yPos: Number(yPercentage.toFixed(2)),
    });
  };

  return (
    <div className="relative w-full flex flex-col items-center select-none">
      {/* Pin Mode Active Guidance Tooltip */}
      {isPinDropMode && (
        <div className="mb-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-semibold animate-pulse">
          <MapPin className="h-3.5 w-3.5" />
          <span>Click anywhere on this spread to drop a modification pin</span>
        </div>
      )}

      {/* Main Spread Book Canvas Container */}
      <div
        style={{
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'center center',
          transition: 'transform 0.2s ease-out',
        }}
        className="relative max-w-5xl w-full mx-auto"
      >
        <div
          ref={containerRef}
          onClick={handleContainerClick}
          className={`relative w-full rounded-2xl overflow-hidden shadow-2xl border border-zinc-700/60 bg-zinc-950 transition-all ${
            isPinDropMode ? 'cursor-crosshair ring-2 ring-amber-500/60' : 'cursor-default'
          }`}
        >
          {/* Subtle Photobook Center Fold Spine Crease (Indian 12x36 spread effect) */}
          <div className="absolute inset-y-0 left-1/2 w-8 -translate-x-1/2 pointer-events-none z-20 bg-gradient-to-r from-transparent via-black/25 to-transparent opacity-80" />
          <div className="absolute inset-y-0 left-1/2 w-[1px] -translate-x-1/2 pointer-events-none z-20 bg-black/40" />

          {/* Book Edge Shadow (Outer binding bevel) */}
          <div className="absolute inset-0 pointer-events-none z-20 shadow-[inset_0_0_24px_rgba(0,0,0,0.6)] rounded-2xl" />

          {/* Spread Image */}
          {page.imageUrl && !hasError ? (
            <div className="relative w-full aspect-[2/1] sm:aspect-[2.4/1] bg-zinc-900 flex items-center justify-center">
              {!imageLoaded && (
                <div className="absolute inset-0 bg-zinc-900 animate-pulse flex items-center justify-center text-zinc-500 text-xs">
                  <BookOpen className="h-6 w-6 mr-2 animate-bounce stroke-1" />
                  <span>Loading spread layout #{page.pageNumber}...</span>
                </div>
              )}

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={page.imageUrl}
                alt={`Spread ${page.pageNumber}`}
                className={`w-full h-full object-contain transition-opacity duration-300 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                referrerPolicy="no-referrer"
                loading="eager"
                onLoad={() => setImageLoaded(true)}
                onError={() => setHasError(true)}
              />
            </div>
          ) : (
            <div className="w-full aspect-[2/1] sm:aspect-[2.4/1] bg-zinc-900 flex flex-col items-center justify-center p-8 text-center text-zinc-400">
              <BookOpen className="h-10 w-10 mb-2 stroke-1 text-zinc-600" />
              <p className="text-sm font-semibold text-zinc-300">Spread #{page.pageNumber}</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                High-resolution layout proof is ready. Image preview will synchronize shortly.
              </p>
            </div>
          )}

          {/* Spatial Comment Pins Layer */}
          {page.comments.map((comment, idx) => (
            <SpatialCommentPin
              key={comment.id}
              comment={comment}
              index={idx}
              isSelected={selectedCommentId === comment.id}
              onSelect={() => onSelectComment(selectedCommentId === comment.id ? null : comment.id)}
              onResolve={onResolveComment}
              onDelete={onDeleteComment}
            />
          ))}

          {/* Page Number Badges at Bottom Corners */}
          <div className="absolute bottom-2 left-4 z-20 pointer-events-none">
            <span className="text-[10px] font-mono text-white/50 bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs">
              Page {(page.pageNumber - 1) * 2 + 1}
            </span>
          </div>
          <div className="absolute bottom-2 right-4 z-20 pointer-events-none">
            <span className="text-[10px] font-mono text-white/50 bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs">
              Page {(page.pageNumber - 1) * 2 + 2}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
