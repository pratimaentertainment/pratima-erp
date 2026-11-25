'use client';

import * as React from 'react';
import { useState, useEffect, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Film,
  Calendar,
  User,
  HardDrive,
  Eye,
  CheckCircle2,
  KeyRound,
  MessageSquare,
  Copy,
  ExternalLink,
  Plus,
  Trash2,
  AlertCircle,
  Sparkles,
  Link as LinkIcon,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  assignVideoTaskAction,
  createVideoDeliverableTaskAction,
} from '@/actions/video-editing.actions';
import { TaskStatus, WorkflowType } from '@prisma/client';
import { KanbanCardTask } from './kanban-card';

interface VideoTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: KanbanCardTask | null;
  editors: Array<{
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
    designation: string | null;
    employmentType: string | null;
  }>;
  activeBookings: Array<{
    id: string;
    bookingNumber: string | null;
    title: string | null;
    startDate: string | Date | null;
  }>;
  onSuccess: () => void;
}

export function VideoTaskModal({
  isOpen,
  onClose,
  task,
  editors,
  activeBookings,
  onSuccess,
}: VideoTaskModalProps) {
  const isEditing = Boolean(task);
  const [isPending, startTransition] = useTransition();

  // Form states
  const [bookingId, setBookingId] = useState('');
  const [taskType, setTaskType] = useState('');
  const [workflowType, setWorkflowType] = useState<WorkflowType>(WorkflowType.VIDEO_EDITING);
  const [editorType, setEditorType] = useState<'IN_HOUSE' | 'FREELANCER'>('IN_HOUSE');
  const [editorId, setEditorId] = useState<string>('');
  const [freelancerName, setFreelancerName] = useState('');
  const [freelancerPhone, setFreelancerPhone] = useState('');
  const [assetsUrl, setAssetsUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [deliveryUrl, setDeliveryUrl] = useState('');
  const [directorNotes, setDirectorNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [referenceLinksText, setReferenceLinksText] = useState('');

  // Brief dispatch output state
  const [whatsappResult, setWhatsappResult] = useState<{
    message: string;
    whatsappUrl: string | null;
    magicPortalUrl: string | null;
  } | null>(null);

  // Synchronize form on modal open or task change
  useEffect(() => {
    if (task) {
      setBookingId(task.eventBooking?.id || '');
      setTaskType(task.taskType || '');
      setWorkflowType((task.type as WorkflowType) || WorkflowType.VIDEO_EDITING);
      
      const isFreelanceEditor =
        task.user?.employmentType === 'FREELANCE' ||
        (!task.assignedTo && Boolean(task.editorToken));

      if (isFreelanceEditor) {
        setEditorType('FREELANCER');
        setEditorId(task.assignedTo || '');
        setFreelancerName(task.user?.name || '');
        setFreelancerPhone(task.user?.phone || '');
      } else {
        setEditorType('IN_HOUSE');
        setEditorId(task.assignedTo || '');
        setFreelancerName('');
        setFreelancerPhone('');
      }

      setAssetsUrl(task.assetsUrl || '');
      setPreviewUrl(task.previewUrl || '');
      setDeliveryUrl(task.deliveryUrl || '');
      setDirectorNotes(task.directorNotes || '');
      setDueDate(
        task.dueDate
          ? new Date(task.dueDate).toISOString().split('T')[0]
          : ''
      );
      setReferenceLinksText((task.referenceLinks || []).join('\n'));
      setWhatsappResult(null);
    } else {
      // New task default
      setBookingId(activeBookings[0]?.id || '');
      setTaskType('');
      setWorkflowType(WorkflowType.VIDEO_EDITING);
      setEditorType('IN_HOUSE');
      setEditorId('');
      setFreelancerName('');
      setFreelancerPhone('');
      setAssetsUrl('');
      setPreviewUrl('');
      setDeliveryUrl('');
      setDirectorNotes('');
      setDueDate('');
      setReferenceLinksText('');
      setWhatsappResult(null);
    }
  }, [task, isOpen, activeBookings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanTitle = taskType.trim();
    if (!cleanTitle) {
      toast.error('Please enter a deliverable title or cut name.');
      return;
    }

    const referenceLinks = referenceLinksText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('http://') || l.startsWith('https://'));

    startTransition(async () => {
      try {
        if (isEditing && task) {
          // Editing / Assigning existing task
          const res = await assignVideoTaskAction({
            taskId: task.id,
            editorId: editorType === 'IN_HOUSE' && editorId ? editorId : null,
            isFreelancer: editorType === 'FREELANCER',
            freelancerName: editorType === 'FREELANCER' ? freelancerName : null,
            freelancerPhone: editorType === 'FREELANCER' ? freelancerPhone : null,
            assetsUrl: assetsUrl.trim() || null,
            previewUrl: previewUrl.trim() || null,
            deliveryUrl: deliveryUrl.trim() || null,
            directorNotes: directorNotes.trim() || null,
            referenceLinks,
            dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          });

          if (res.success) {
            toast.success(res.message);
            if (res.whatsappBriefMessage) {
              setWhatsappResult({
                message: res.whatsappBriefMessage,
                whatsappUrl: res.whatsappUrl || null,
                magicPortalUrl: res.magicPortalUrl || null,
              });
            } else {
              onSuccess();
              onClose();
            }
          } else {
            toast.error(res.error || 'Failed to update video deliverable.');
          }
        } else {
          // Creating brand new deliverable cut
          if (!bookingId) {
            toast.error('Please select an active project booking.');
            return;
          }

          const res = await createVideoDeliverableTaskAction({
            bookingId,
            taskType: cleanTitle,
            type: workflowType,
            assignedEditorId: editorType === 'IN_HOUSE' && editorId ? editorId : null,
            dueDate: dueDate ? new Date(dueDate).toISOString() : null,
            assetsUrl: assetsUrl.trim() || null,
            directorNotes: directorNotes.trim() || null,
            referenceLinks,
          });

          if (res.success) {
            toast.success(res.message);
            onSuccess();
            onClose();
          } else {
            toast.error(res.error || 'Failed to create deliverable cut.');
          }
        }
      } catch (err: any) {
        console.error('Error submitting video task modal:', err);
        toast.error(err?.message || 'Unexpected server error occurred.');
      }
    });
  };

  const copyBriefToClipboard = () => {
    if (whatsappResult?.message) {
      navigator.clipboard.writeText(whatsappResult.message);
      toast.success('Creative brief copied to clipboard!');
    }
  };

  const copyMagicLinkToClipboard = () => {
    if (whatsappResult?.magicPortalUrl) {
      navigator.clipboard.writeText(whatsappResult.magicPortalUrl);
      toast.success('Freelancer magic link copied to clipboard!');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:rounded-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Film className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-lg">
                {isEditing ? 'Edit Video Deliverable & Creative Brief' : 'New Video Deliverable Cut'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {isEditing
                  ? 'Assign editors, manage RAW asset vaults, configure Magic Links, and generate creative briefs.'
                  : 'Add a new video cut (Teaser, Highlight, Traditional Film) to the post-production pipeline.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* WhatsApp Dispatch Success Banner View (if brief generated) */}
        {whatsappResult ? (
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Creative Brief Generated Successfully!</span>
                </div>
                {whatsappResult.magicPortalUrl && (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px]">
                    Magic Link Active
                  </Badge>
                )}
              </div>

              {whatsappResult.magicPortalUrl && (
                <div className="rounded-lg bg-card p-3 border border-border/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5 text-amber-500" />
                      Freelancer Magic Link (Zero Login Required):
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs"
                      onClick={copyMagicLinkToClipboard}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy Link
                    </Button>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground truncate select-all">
                    {whatsappResult.magicPortalUrl}
                  </p>
                </div>
              )}

              {/* WhatsApp Brief Preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">WhatsApp Markdown Brief Preview:</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-xs"
                    onClick={copyBriefToClipboard}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy Text
                  </Button>
                </div>
                <pre className="text-[11px] font-mono bg-zinc-950 text-zinc-100 p-3 rounded-lg overflow-x-auto max-h-48 whitespace-pre-wrap leading-relaxed">
                  {whatsappResult.message}
                </pre>
              </div>

              {/* WhatsApp CTA Action */}
              <div className="flex items-center gap-2 pt-1">
                {whatsappResult.whatsappUrl ? (
                  <a
                    href={whatsappResult.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 h-9 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs transition-colors"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Send Directly via WhatsApp</span>
                  </a>
                ) : (
                  <Button
                    type="button"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={copyBriefToClipboard}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Brief to Clipboard
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onSuccess();
                    onClose();
                  }}
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Booking / Project Context */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Event Project Booking</Label>
              {isEditing && task?.eventBooking ? (
                <div className="p-2.5 rounded-lg bg-muted/60 border text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Film className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium text-foreground">{task.eventBooking.title}</span>
                    <span className="font-mono text-muted-foreground">({task.eventBooking.bookingNumber})</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Associated
                  </Badge>
                </div>
              ) : (
                <Select value={bookingId} onValueChange={(val) => setBookingId(val || '')}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select active booking" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeBookings.map((b) => (
                      <SelectItem key={b.id} value={b.id} className="text-xs">
                        {b.title} ({b.bookingNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Title & Deliverable Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="taskType" className="text-xs font-semibold">
                  Deliverable Cut Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="taskType"
                  placeholder="e.g. 60s Instagram Reel, Full Film"
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Workflow Deliverable Type</Label>
                <Select
                  value={workflowType}
                  onValueChange={(val) => val && setWorkflowType(val as WorkflowType)}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={WorkflowType.VIDEO_EDITING} className="text-xs">
                      Video Editing (General)
                    </SelectItem>
                    <SelectItem value={WorkflowType.TEASER_REEL} className="text-xs">
                      Teaser / Reel (Short Cut)
                    </SelectItem>
                    <SelectItem value={WorkflowType.CINEMATIC_FILM} className="text-xs">
                      Cinematic Film (Full Cut)
                    </SelectItem>
                    <SelectItem value={WorkflowType.COLOR_GRADING} className="text-xs">
                      Color Grading / Finishing
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Editor Assignment: In-House vs Freelancer */}
            <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-primary" />
                  <span>Editor Allocation & Dispatch Strategy</span>
                </Label>
                <Tabs
                  value={editorType}
                  onValueChange={(val) => setEditorType(val as any)}
                  className="w-auto"
                >
                  <TabsList className="h-7 p-0.5">
                    <TabsTrigger value="IN_HOUSE" className="text-[11px] px-2.5 h-6">
                      In-House Staff
                    </TabsTrigger>
                    <TabsTrigger value="FREELANCER" className="text-[11px] px-2.5 h-6">
                      External Freelancer (Magic Link)
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {editorType === 'IN_HOUSE' ? (
                <div className="space-y-1.5">
                  <Select value={editorId} onValueChange={(val) => setEditorId(val === 'unassigned' ? '' : val || '')}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select an in-house editor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned" className="text-xs italic text-muted-foreground">
                        -- Leave Unassigned --
                      </SelectItem>
                      {editors.map((ed) => (
                        <SelectItem key={ed.id} value={ed.id} className="text-xs">
                          {ed.name} {ed.designation ? `(${ed.designation})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    In-house editors log in via their standard FRAMIQ user account.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <Label htmlFor="freelancerName" className="text-[11px] font-medium">
                      Freelancer Name
                    </Label>
                    <Input
                      id="freelancerName"
                      placeholder="e.g. Vikram Joshi"
                      value={freelancerName}
                      onChange={(e) => setFreelancerName(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="freelancerPhone" className="text-[11px] font-medium">
                      WhatsApp Phone Number
                    </Label>
                    <Input
                      id="freelancerPhone"
                      placeholder="e.g. 9876543210"
                      value={freelancerPhone}
                      onChange={(e) => setFreelancerPhone(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                  <p className="sm:col-span-2 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                    A secure UUID Magic Link will be generated and formatted into the WhatsApp brief. The freelancer can submit draft review links without an ERP login.
                  </p>
                </div>
              )}
            </div>

            {/* Target Due Date */}
            <div className="space-y-1.5">
              <Label htmlFor="dueDate" className="text-xs font-semibold flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span>Target Due Date</span>
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="text-xs"
              />
            </div>

            {/* RAW Media Vault URL (Editor Only) */}
            <div className="space-y-1.5 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="assetsUrl" className="text-xs font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                  <HardDrive className="h-3.5 w-3.5 text-blue-600" />
                  <span>RAW Asset Vault URL (Editors Only)</span>
                </Label>
                <Badge variant="outline" className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300">
                  Strictly Confidential
                </Badge>
              </div>
              <Input
                id="assetsUrl"
                placeholder="https://drive.google.com/drive/folders/... or Dropbox link"
                value={assetsUrl}
                onChange={(e) => setAssetsUrl(e.target.value)}
                className="text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Raw camera footage & audio stems. Strictly hidden from the client portal.
              </p>
            </div>

            {/* Director Notes / Creative Guidelines */}
            <div className="space-y-1.5">
              <Label htmlFor="directorNotes" className="text-xs font-semibold flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Director&apos;s Creative Brief & Editing Guidelines</span>
              </Label>
              <Textarea
                id="directorNotes"
                placeholder="Specify pacing, color LUTs, dual-system audio sync, key client moments, music instructions..."
                value={directorNotes}
                onChange={(e) => setDirectorNotes(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>

            {/* Reference Links */}
            <div className="space-y-1.5">
              <Label htmlFor="referenceLinks" className="text-xs font-semibold flex items-center gap-1.5">
                <LinkIcon className="h-3.5 w-3.5 text-primary" />
                <span>Inspiration & Reference Links (One per line)</span>
              </Label>
              <Textarea
                id="referenceLinks"
                placeholder="https://instagram.com/reel/...&#10;https://vimeo.com/..."
                value={referenceLinksText}
                onChange={(e) => setReferenceLinksText(e.target.value)}
                rows={2}
                className="text-xs font-mono"
              />
            </div>

            {/* Review & Delivery Links (Visible in Edit Mode) */}
            {isEditing && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t">
                <div className="space-y-1.5">
                  <Label htmlFor="previewUrl" className="text-xs font-semibold flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5 text-purple-600" />
                    <span>Client Review Preview URL</span>
                  </Label>
                  <Input
                    id="previewUrl"
                    placeholder="https://vimeo.com/... or Frame.io"
                    value={previewUrl}
                    onChange={(e) => setPreviewUrl(e.target.value)}
                    className="text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Draft render streamed to client for feedback.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="deliveryUrl" className="text-xs font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Master HD Delivery URL</span>
                  </Label>
                  <Input
                    id="deliveryUrl"
                    placeholder="https://drive.google.com/... (Master 4K)"
                    value={deliveryUrl}
                    onChange={(e) => setDeliveryUrl(e.target.value)}
                    className="text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Unlocked for client download once approved.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isPending} className="bg-primary text-primary-foreground">
                {isPending ? 'Saving...' : isEditing ? 'Save & Generate Brief' : 'Create Deliverable Cut'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
