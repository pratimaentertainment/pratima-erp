'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  BookOpen,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Check,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlbumStatus } from '@prisma/client';

interface AlbumReviewHeaderProps {
  albumTitle: string;
  bookingTitle?: string | null;
  currentSpread: number;
  totalSpreads: number;
  status: AlbumStatus;
  unresolvedCommentsCount: number;
  isPinDropMode: boolean;
  onTogglePinMode: () => void;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onApproveAlbum: () => void;
  onRequestChanges: () => void;
  isPending: boolean;
  backUrl?: string;
}

export function AlbumReviewHeader({
  albumTitle,
  bookingTitle,
  currentSpread,
  totalSpreads,
  status,
  unresolvedCommentsCount,
  isPinDropMode,
  onTogglePinMode,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  isFullscreen,
  onToggleFullscreen,
  onApproveAlbum,
  onRequestChanges,
  isPending,
  backUrl,
}: AlbumReviewHeaderProps) {
  const isApproved =
    status === AlbumStatus.APPROVED_FOR_PRINT || status === AlbumStatus.DELIVERED;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur-md shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Left: Back Link & Title */}
        <div className="flex items-center gap-3 min-w-0">
          {backUrl && (
            <Link
              href={backUrl}
              className="p-1.5 rounded-lg border border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
              title="Return to Dashboard"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
          )}

          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <BookOpen className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-foreground truncate max-w-[180px] sm:max-w-xs">
                  {albumTitle}
                </h1>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-semibold shrink-0 uppercase tracking-wider font-mono ${
                    isApproved
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : status === AlbumStatus.CHANGES_REQUESTED
                      ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300'
                      : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300'
                  }`}
                >
                  {status.replace(/_/g, ' ')}
                </Badge>
              </div>
              {bookingTitle && (
                <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
                  {bookingTitle}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Center: Spread Navigation & Counter */}
        <div className="hidden md:flex items-center gap-2 bg-muted/60 p-1 rounded-lg border border-border/60">
          <span className="text-xs font-semibold px-2 text-foreground font-mono">
            Spread {currentSpread} of {totalSpreads}
          </span>
          {unresolvedCommentsCount > 0 && (
            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
              {unresolvedCommentsCount} Open {unresolvedCommentsCount === 1 ? 'Pin' : 'Pins'}
            </Badge>
          )}
        </div>

        {/* Right: Interactive Tools & Client Sign-Off CTAs */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Spatial Pin Drop Mode Toggle */}
          {!isApproved && (
            <Button
              type="button"
              variant={isPinDropMode ? 'default' : 'outline'}
              size="sm"
              onClick={onTogglePinMode}
              className={`h-8 px-2.5 text-xs font-semibold gap-1.5 shadow-2xs ${
                isPinDropMode
                  ? 'bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-400'
                  : 'hover:border-amber-500/60 text-foreground'
              }`}
              title="Click to drop spatial pin comments anywhere on the spread"
            >
              <MapPin className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden sm:inline">
                {isPinDropMode ? 'Pin Mode On' : 'Drop Pin'}
              </span>
            </Button>
          )}

          {/* Zoom Controls */}
          <div className="hidden lg:flex items-center border border-border/80 rounded-lg p-0.5 bg-muted/40">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={onZoomOut}
              disabled={zoomLevel <= 0.8}
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <button
              type="button"
              onClick={onResetZoom}
              className="text-[10px] font-mono font-semibold px-1.5 text-muted-foreground hover:text-foreground"
              title="Reset Zoom"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={onZoomIn}
              disabled={zoomLevel >= 2.5}
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Fullscreen Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground hidden sm:flex"
            onClick={onToggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>

          {/* Client Sign-Off Action Buttons */}
          {!isApproved ? (
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRequestChanges}
                disabled={isPending}
                className="h-8 px-2.5 text-xs font-semibold border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Request</span> Changes
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={onApproveAlbum}
                disabled={isPending}
                className="h-8 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                <span>Approve for Print</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Approved for Print</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
