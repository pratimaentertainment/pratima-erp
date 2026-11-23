'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  MapPin,
  Send,
  Sparkles,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { addAlbumPageCommentAction } from '@/actions/album.actions';

interface PinCommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string;
  pageNumber: number;
  coords: { xPos: number; yPos: number } | null;
  accessCode?: string | null;
  defaultAuthorName?: string;
  onSuccess: (newComment: any) => void;
}

export function PinCommentModal({
  isOpen,
  onClose,
  pageId,
  pageNumber,
  coords,
  accessCode,
  defaultAuthorName = '',
  onSuccess,
}: PinCommentModalProps) {
  const [commentText, setCommentText] = useState('');
  const [authorName, setAuthorName] = useState(defaultAuthorName);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!coords) {
      toast.error('Pin coordinates missing. Please click on the spread.');
      return;
    }

    const cleanText = commentText.trim();
    if (!cleanText) {
      toast.error('Please enter your revision instructions.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await addAlbumPageCommentAction({
          pageId,
          xPos: coords.xPos,
          yPos: coords.yPos,
          commentText: cleanText,
          authorName: authorName.trim() || undefined,
          authorRole: 'CLIENT',
          accessCode,
        });

        if (res.success && res.data) {
          toast.success('Pin comment placed on spread!');
          setCommentText('');
          onSuccess(res.data);
          onClose();
        } else {
          toast.error(res.error || 'Failed to place comment pin.');
        }
      } catch (err: any) {
        console.error('Add pin comment error:', err);
        toast.error('Unexpected error while placing comment pin.');
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md sm:rounded-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Drop Pin on Spread #{pageNumber}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Provide specific modification notes for the album designer at this exact photo position.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Spatial Coordinates Pill Preview */}
          {coords && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/60 text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                <MapPin className="h-3.5 w-3.5 text-amber-500" />
                <span>Selected Pin Position:</span>
              </span>
              <Badge variant="outline" className="font-mono text-[11px] bg-background">
                X: {coords.xPos.toFixed(1)}% | Y: {coords.yPos.toFixed(1)}%
              </Badge>
            </div>
          )}

          {/* Comment Instructions Textarea */}
          <div className="space-y-1.5">
            <Label htmlFor="pin-comment-text" className="text-xs font-semibold">
              Designer Revision Instructions <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="pin-comment-text"
              rows={4}
              placeholder="e.g. Please remove the glare on the groom's glasses, swap this shot with the ceremony ring close-up, or lighten the shadow on the left corner..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="text-xs leading-relaxed"
              required
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground">
              Tip: Be specific about skin tones, photo swaps, framing, or background retouching.
            </p>
          </div>

          {/* Reviewer / Author Name (Optional) */}
          <div className="space-y-1">
            <Label htmlFor="pin-author-name" className="text-xs font-medium">
              Your Name (Optional)
            </Label>
            <Input
              id="pin-author-name"
              placeholder="e.g. Priya & Rahul"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="text-xs h-8"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending || !commentText.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              <span>{isPending ? 'Placing Pin...' : 'Place Pin on Spread'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
