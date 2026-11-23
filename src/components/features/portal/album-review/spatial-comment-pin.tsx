'use client';

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  CheckCircle2,
  Trash2,
  X,
  User,
  Clock,
  Check,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/date';

export interface SpatialCommentItem {
  id: string;
  xPos: number;
  yPos: number;
  commentText: string;
  isResolved: boolean;
  authorName: string;
  authorRole: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

interface SpatialCommentPinProps {
  comment: SpatialCommentItem;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onResolve: (commentId: string, isResolved: boolean) => void;
  onDelete: (commentId: string) => void;
}

export function SpatialCommentPin({
  comment,
  index,
  isSelected,
  onSelect,
  onResolve,
  onDelete,
}: SpatialCommentPinProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click if selected
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        // let parent handle selection
      }
    }
    if (isSelected) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSelected]);

  const isDesigner = comment.authorRole === 'DESIGNER' || comment.authorRole === 'ADMIN';

  return (
    <div
      style={{
        left: `${comment.xPos}%`,
        top: `${comment.yPos}%`,
      }}
      className="absolute -translate-x-1/2 -translate-y-1/2 z-30 select-none"
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Visual Marker Pin */}
      <button
        type="button"
        title={`Pin #${index + 1}: ${comment.commentText.slice(0, 30)}...`}
        className={`group relative flex items-center justify-center transition-all duration-200 focus:outline-hidden ${
          comment.isResolved
            ? 'h-6 w-6 rounded-full bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300'
            : isSelected
            ? 'h-7 w-7 rounded-full bg-amber-500 text-white shadow-lg ring-4 ring-amber-300 scale-110'
            : 'h-6 w-6 rounded-full bg-amber-600 hover:bg-amber-500 text-white shadow-md ring-2 ring-white/90 hover:scale-105'
        }`}
      >
        {/* Pulsing ring for unresolved pins */}
        {!comment.isResolved && !isSelected && (
          <span className="absolute -inset-1 rounded-full bg-amber-400/40 animate-ping pointer-events-none" />
        )}

        {comment.isResolved ? (
          <Check className="h-3.5 w-3.5 stroke-[2.5]" />
        ) : (
          <span className="text-[11px] font-bold font-mono tracking-tighter">
            {index + 1}
          </span>
        )}
      </button>

      {/* Floating Popover Card (Revealed when pin is selected) */}
      {isSelected && (
        <div
          ref={popoverRef}
          onClick={(e) => e.stopPropagation()}
          className="absolute left-1/2 bottom-full mb-3 -translate-x-1/2 w-64 sm:w-72 rounded-xl border border-border/80 bg-card/95 p-3.5 shadow-2xl backdrop-blur-md z-50 text-foreground animate-in fade-in-50 zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="h-4 w-4 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[10px] font-bold font-mono">
                #{index + 1}
              </span>
              <span className="font-semibold text-xs truncate max-w-[120px]">
                {comment.authorName}
              </span>
              <Badge
                variant="outline"
                className={`text-[9px] px-1 py-0 h-4 uppercase tracking-wider font-mono ${
                  isDesigner
                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
                    : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300'
                }`}
              >
                {comment.authorRole}
              </Badge>
            </div>

            <button
              type="button"
              onClick={onSelect}
              className="text-muted-foreground hover:text-foreground p-0.5 rounded-sm"
              title="Close note"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Comment Body */}
          <div className="py-2.5">
            <p className="text-xs text-foreground/90 leading-relaxed italic bg-muted/30 p-2 rounded-lg border border-border/40 max-h-32 overflow-y-auto whitespace-pre-wrap">
              &ldquo;{comment.commentText}&rdquo;
            </p>
          </div>

          {/* Footer Info & Actions */}
          <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground border-t border-border/50">
            <div className="flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              <span>{formatDate(comment.createdAt, 'dd MMM, hh:mm a')}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant={comment.isResolved ? 'outline' : 'default'}
                className={`h-6 px-2 text-[10px] font-medium ${
                  comment.isResolved
                    ? 'border-zinc-300 text-zinc-700 dark:text-zinc-300'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
                onClick={() => onResolve(comment.id, !comment.isResolved)}
              >
                {comment.isResolved ? (
                  <>
                    <RotateCcw className="h-2.5 w-2.5 mr-1" />
                    <span>Reopen</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                    <span>Resolve</span>
                  </>
                )}
              </Button>

              <button
                type="button"
                onClick={() => onDelete(comment.id)}
                className="text-muted-foreground hover:text-destructive p-1 rounded-sm transition-colors"
                title="Delete comment pin"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Caret pointing to pin */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-6 border-x-transparent border-t-6 border-t-card/95" />
        </div>
      )}
    </div>
  );
}
