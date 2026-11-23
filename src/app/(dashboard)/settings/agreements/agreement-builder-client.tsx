'use client';

import React, { useState, useTransition, useMemo, useRef } from 'react';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Tag,
  Copy,
  Calendar,
  Sparkles,
  Loader2,
  FileCheck2,
  HelpCircle,
} from 'lucide-react';
import { DocumentTemplateType } from '@prisma/client';
import {
  createDocumentTemplateAction,
  updateDocumentTemplateAction,
  deleteDocumentTemplateAction,
} from '@/actions/agreement.actions';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface DocumentTemplateItem {
  id: string;
  name: string;
  content: string;
  type: DocumentTemplateType;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  userAgreements?: any[];
}

interface AgreementBuilderClientProps {
  initialTemplates: DocumentTemplateItem[];
}

const SMART_TAGS = [
  { tag: '{{freelancer_name}}', label: 'Freelancer Name', description: 'Full name of the artist/technician' },
  { tag: '{{freelancer_phone}}', label: 'Phone Number', description: 'Contact phone' },
  { tag: '{{company_name}}', label: 'Company Name', description: 'Your studio/enterprise name' },
  { tag: '{{role}}', label: 'Shoot Role', description: 'Candid, Cinematographer, etc.' },
  { tag: '{{event_date}}', label: 'Event Date', description: 'Ceremony date' },
  { tag: '{{sub_event_name}}', label: 'Ceremony / Sub-Event', description: 'Haldi, Sangeet, Wedding' },
  { tag: '{{payout_amount}}', label: 'Payout Amount', description: 'Agreed event fee (₹)' },
  { tag: '{{date_signed}}', label: 'Signature Date', description: 'Timestamp of acceptance' },
];

const DEFAULT_NDA_SAMPLE = `NON-DISCLOSURE & FREELANCE SERVICE AGREEMENT

This Agreement is entered into between {{company_name}} ("Studio") and {{freelancer_name}} ("Contractor").

1. ENGAGEMENT & ROLE:
Contractor agrees to perform the services of {{role}} for the designated event: {{sub_event_name}} on {{event_date}}.

2. COMPENSATION & PAYOUT:
Studio agrees to pay Contractor an agreed fee of {{payout_amount}} upon satisfactory completion and handover of all uncompressed raw media files.

3. CONFIDENTIALITY & MEDIA OWNERSHIP:
Contractor acknowledges that all photographs, footage, audio recordings, and creative work captured during the engagement are the exclusive intellectual property of {{company_name}}.
Contractor shall not publish, distribute, or post any images or raw files on social media, portfolios, or online channels prior to client delivery and explicit written consent from Studio.

4. CONDUCT & EQUIPMENT:
Contractor agrees to arrive at the venue on time, maintain professional etiquette, and bring reliable equipment required for the assignment.

Date: {{date_signed}}
Contractor: {{freelancer_name}}
`;

export function AgreementBuilderClient({ initialTemplates = [] }: AgreementBuilderClientProps) {
  const [templates, setTemplates] = useState<DocumentTemplateItem[]>(initialTemplates);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplateItem | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<DocumentTemplateType>(DocumentTemplateType.AGREEMENT);
  const [content, setContent] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Preview Modal State
  const [previewTemplate, setPreviewTemplate] = useState<DocumentTemplateItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Open Create Dialog
  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setName('');
    setType(DocumentTemplateType.AGREEMENT);
    setContent(DEFAULT_NDA_SAMPLE);
    setIsActive(true);
    setFormError(null);
    setIsEditorOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (template: DocumentTemplateItem) => {
    setEditingTemplate(template);
    setName(template.name);
    setType(template.type);
    setContent(template.content);
    setIsActive(template.isActive);
    setFormError(null);
    setIsEditorOpen(true);
  };

  // Insert Smart Tag into Textarea
  const handleInsertTag = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((prev) => prev + tag);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const textBefore = content.substring(0, start);
    const textAfter = content.substring(end);

    const newContent = textBefore + tag + textAfter;
    setContent(newContent);

    // Restore cursor position after the tag
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  // Save Template (Create / Update)
  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setFormError('Please provide a template title.');
      return;
    }
    if (!content.trim() || content.trim().length < 10) {
      setFormError('Contract content must contain at least 10 characters.');
      return;
    }

    setFormError(null);
    startSaveTransition(async () => {
      try {
        if (editingTemplate) {
          const res = await updateDocumentTemplateAction({
            id: editingTemplate.id,
            name: name.trim(),
            type,
            content: content.trim(),
            isActive,
          });

          if (res.success && res.data) {
            setTemplates((prev) =>
              prev.map((t) => (t.id === editingTemplate.id ? { ...t, ...res.data } : t))
            );
            toast.success('Document template updated successfully!');
            setIsEditorOpen(false);
          } else {
            setFormError(res.error || 'Failed to update template');
            toast.error(res.error || 'Failed to update template');
          }
        } else {
          const res = await createDocumentTemplateAction({
            name: name.trim(),
            type,
            content: content.trim(),
            isActive,
          });

          if (res.success && res.data) {
            setTemplates((prev) => [res.data, ...prev]);
            toast.success('New document template created successfully!');
            setIsEditorOpen(false);
          } else {
            setFormError(res.error || 'Failed to create template');
            toast.error(res.error || 'Failed to create template');
          }
        }
      } catch (err: any) {
        setFormError(err?.message || 'An unexpected error occurred');
        toast.error(err?.message || 'An unexpected error occurred');
      }
    });
  };

  // Delete Template
  const handleDeleteTemplate = (templateId: string) => {
    if (!confirm('Are you sure you want to deactivate and remove this document template?')) return;

    startDeleteTransition(async () => {
      try {
        const res = await deleteDocumentTemplateAction(templateId);
        if (res.success) {
          setTemplates((prev) => prev.filter((t) => t.id !== templateId));
          toast.success('Template removed successfully.');
        } else {
          toast.error(res.error || 'Failed to delete template');
        }
      } catch (err: any) {
        toast.error(err?.message || 'Failed to delete template');
      }
    });
  };

  // Preview compiled with sample values
  const compiledPreviewContent = useMemo(() => {
    if (!previewTemplate) return '';
    let compiled = previewTemplate.content;
    compiled = compiled.replace(/{{freelancer_name}}/g, 'Rahul Sharma');
    compiled = compiled.replace(/{{freelancer_phone}}/g, '+91 98765 43210');
    compiled = compiled.replace(/{{company_name}}/g, 'Pratima Photography Studio');
    compiled = compiled.replace(/{{role}}/g, 'Lead Candid Photographer');
    compiled = compiled.replace(/{{event_date}}/g, '15 Nov 2026');
    compiled = compiled.replace(/{{sub_event_name}}/g, 'Grand Wedding & Reception');
    compiled = compiled.replace(/{{payout_amount}}/g, '₹8,500');
    compiled = compiled.replace(/{{date_signed}}/g, new Date().toLocaleDateString('en-IN'));
    return compiled;
  }, [previewTemplate]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/30 p-5 rounded-xl border">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Dynamic Legal & Agreement Templates
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
            Design master agreements, freelancer NDAs, and event quotation terms. Dynamic smart
            tags auto-populate artist rates and ceremony milestones upon deployment.
          </p>
        </div>

        <Button onClick={handleOpenCreate} className="gap-1.5 shadow-xs shrink-0">
          <Plus className="w-4 h-4" />
          Create Template
        </Button>
      </div>

      {/* Templates Table */}
      <div className="border rounded-xl bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-[300px]">Template Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Active Signatures</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  <FileText className="w-8 h-8 mx-auto opacity-40 mb-2" />
                  <p className="font-semibold text-sm">No Document Templates Created</p>
                  <p className="text-xs">
                    Click &quot;Create Template&quot; above to author your first Freelancer NDA or Service Contract.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              templates.map((tpl) => (
                <TableRow key={tpl.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-semibold text-sm text-foreground block">
                          {tpl.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground line-clamp-1 max-w-[280px]">
                          {tpl.content.substring(0, 70)}...
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {tpl.type.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                      {tpl.userAgreements?.length || 0} user assignment{(tpl.userAgreements?.length || 0) === 1 ? '' : 's'}
                    </span>
                  </TableCell>

                  <TableCell>
                    {tpl.isActive ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded font-medium">
                        Draft / Inactive
                      </span>
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setPreviewTemplate(tpl);
                          setIsPreviewOpen(true);
                        }}
                        className="h-8 px-2 text-xs gap-1"
                        title="Preview with sample tags"
                      >
                        <Eye className="w-3.5 h-3.5 text-primary" />
                        Preview
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(tpl)}
                        className="h-8 px-2 text-xs gap-1 text-blue-600 hover:text-blue-700"
                        title="Edit Template"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Edit
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTemplate(tpl.id)}
                        disabled={isDeleting}
                        className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                        title="Delete Template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Template Editor Modal */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {editingTemplate ? 'Edit Document Template' : 'Create New Document Template'}
            </DialogTitle>
            <DialogDescription>
              Write contract clauses and insert smart tags to dynamically substitute artist details.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveTemplate} className="space-y-4 pt-1">
            {formError && (
              <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-lg flex items-center gap-2 border border-destructive/20">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Template Name */}
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="tplName">Template Title *</Label>
                <Input
                  id="tplName"
                  placeholder="e.g., Master Freelancer NDA & Terms"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Template Type */}
              <div className="space-y-1.5">
                <Label htmlFor="tplType">Document Type</Label>
                <Select
                  value={type}
                  onValueChange={(val) => setType((val as DocumentTemplateType) || DocumentTemplateType.AGREEMENT)}
                >
                  <SelectTrigger id="tplType" className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DocumentTemplateType.AGREEMENT}>Agreement</SelectItem>
                    <SelectItem value={DocumentTemplateType.NDA}>NDA</SelectItem>
                    <SelectItem value={DocumentTemplateType.QUOTATION_TERMS}>Quotation Terms</SelectItem>
                    <SelectItem value={DocumentTemplateType.INVOICE_TERMS}>Invoice Terms</SelectItem>
                    <SelectItem value={DocumentTemplateType.OTHER}>Other Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Smart Placeholder Tag Toolbar */}
            <div className="space-y-1.5 p-3 rounded-lg bg-muted/40 border">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold flex items-center gap-1.5 text-foreground">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Smart Substitution Tags (Click to insert):
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {SMART_TAGS.map((st) => (
                  <button
                    key={st.tag}
                    type="button"
                    onClick={() => handleInsertTag(st.tag)}
                    title={st.description}
                    className="text-[11px] px-2 py-0.5 rounded bg-background border hover:border-primary hover:text-primary transition-colors cursor-pointer font-mono shadow-2xs"
                  >
                    {st.tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="tplContent">Contract Content / Clauses *</Label>
                <span className="text-[11px] text-muted-foreground">
                  Plain text formatted contract text
                </span>
              </div>
              <Textarea
                ref={textareaRef}
                id="tplContent"
                rows={12}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type or paste legal contract text with {{tags}}..."
                className="font-mono text-xs leading-relaxed"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditorOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="gap-1.5">
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving Template...
                  </>
                ) : (
                  <>
                    <FileCheck2 className="w-4 h-4" />
                    {editingTemplate ? 'Update Template' : 'Save Template'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {previewTemplate && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" />
                  Live Preview: {previewTemplate.name}
                </DialogTitle>
                <DialogDescription>
                  Demonstrating dynamic substitution using dummy artist and event data.
                </DialogDescription>
              </DialogHeader>

              <div className="p-4 bg-muted/20 border rounded-xl font-mono text-xs whitespace-pre-wrap leading-relaxed">
                {compiledPreviewContent}
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                  Close Preview
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
