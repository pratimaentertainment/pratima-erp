'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Share2, Loader2, CheckCircle2, AlertCircle, Building2, User, Phone } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { transferLeadToFranchiseAction } from '@/actions/franchise.actions';

export interface LeadForTransfer {
  id: string;
  leadCode?: string;
  customerName?: string;
  phone?: string | null;
  eventType?: string | null;
}

interface TransferLeadModalProps {
  lead: LeadForTransfer | null;
  franchisees: Array<{
    id: string;
    name: string;
    city?: string;
    state?: string;
  }>;
  onClose: () => void;
}

export function TransferLeadModal({
  lead,
  franchisees,
  onClose,
}: TransferLeadModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedFranchiseeId, setSelectedFranchiseeId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  if (!lead) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFranchiseeId) {
      setFormError('Please select a target franchisee studio.');
      return;
    }

    setFormError(null);
    startTransition(async () => {
      try {
        const res = await transferLeadToFranchiseAction({
          leadId: lead.id,
          targetFranchiseeId: selectedFranchiseeId,
          notes: notes.trim() || undefined,
        });

        if (res.success) {
          toast.success(res.message);
          onClose();
          router.refresh();
        } else {
          setFormError(res.error || 'Failed to transfer lead.');
          toast.error(res.error || 'Failed to transfer lead.');
        }
      } catch (err: any) {
        setFormError(err.message || 'An unexpected error occurred.');
        toast.error(err.message || 'An unexpected error occurred.');
      }
    });
  };

  return (
    <Dialog open={Boolean(lead)} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold font-heading">
                Transfer Lead to Franchisee Studio
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Route this client inquiry to a local network branch studio.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {formError && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Lead Summary Info */}
          <div className="p-3.5 rounded-xl border border-border/70 bg-muted/40 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lead Reference:</span>
              <span className="font-semibold text-foreground">{lead.leadCode || lead.id.slice(0, 8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Client Name:</span>
              <span className="font-semibold text-foreground">{lead.customerName || 'Inquiry Client'}</span>
            </div>
            {lead.phone && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone:</span>
                <span className="font-mono text-foreground">{lead.phone}</span>
              </div>
            )}
            {lead.eventType && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Event Type:</span>
                <span className="font-medium text-foreground">{lead.eventType}</span>
              </div>
            )}
          </div>

          {/* Select Target Franchisee */}
          <div className="space-y-1.5">
            <Label htmlFor="franchiseeSelect" className="text-xs font-semibold flex items-center gap-1">
              <Building2 className="h-3 w-3 text-muted-foreground" />
              <span>Destination Franchise Studio *</span>
            </Label>
            <Select
              value={selectedFranchiseeId}
              onValueChange={(val: any) => setSelectedFranchiseeId(val || '')}
            >
              <SelectTrigger id="franchiseeSelect" className="text-xs h-9">
                <SelectValue placeholder="Choose a franchise branch..." />
              </SelectTrigger>
              <SelectContent>
                {franchisees.length === 0 ? (
                  <div className="p-2 text-xs text-muted-foreground text-center">
                    No active franchisee studios available.
                  </div>
                ) : (
                  franchisees.map((f) => (
                    <SelectItem key={f.id} value={f.id} className="text-xs">
                      {f.name} {f.city ? `(${f.city})` : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Notes for Franchisee */}
          <div className="space-y-1.5">
            <Label htmlFor="transferNotes" className="text-xs font-semibold">
              <span>Handoff Instructions / Notes for Franchisee</span>
            </Label>
            <Input
              id="transferNotes"
              placeholder="e.g. Client requested local shoot in Kalyani Nagar, budget is ₹1.5L"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isPending}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending || !selectedFranchiseeId}
              className="text-xs gap-1.5 font-semibold"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Transferring...</span>
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Execute Transfer</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
