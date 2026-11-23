import * as React from 'react';
import { cn } from '@/lib/utils';
import { ContentCard } from '@/components/cards';
import { Paperclip, Download, Trash2 } from 'lucide-react';
import { IconButton } from '@/components/buttons/IconButton';
import { Button } from '@/components/buttons/Button';

export interface EntityAttachment {
  id: string;
  filename: string;
  size: string;
  url: string;
  uploadedAt: string | Date;
  uploadedBy?: string;
}

interface EntityAttachmentsProps {
  attachments: EntityAttachment[];
  onUpload?: () => void;
  onDelete?: (id: string) => void;
  readOnly?: boolean;
  className?: string;
}

export function EntityAttachments({ attachments, onUpload, onDelete, readOnly = false, className }: EntityAttachmentsProps) {
  return (
    <ContentCard className={cn("w-full", className)}>
      <div className="flex items-center justify-between mb-4 pb-2 border-b">
        <h3 className="text-sm font-medium">Attachments</h3>
        {!readOnly && onUpload && (
          <Button variant="outline" size="sm" onClick={onUpload}>
            <Paperclip className="h-4 w-4 mr-2" />
            Upload File
          </Button>
        )}
      </div>
      
      {attachments.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-4">No attachments found.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {attachments.map((file) => (
            <div key={file.id} className="flex items-center justify-between p-2 rounded-md border bg-muted/20 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3 overflow-hidden">
                <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex flex-col truncate">
                  <span className="text-sm font-medium truncate">{file.filename}</span>
                  <span className="text-xs text-muted-foreground">{file.size} • {new Date(file.uploadedAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-4">
                <IconButton aria-label="Download attachment" variant="ghost" size="sm" icon={<Download className="h-4 w-4" />} onClick={() => window.open(file.url, '_blank')} />
                {!readOnly && onDelete && (
                  <IconButton aria-label="Delete attachment" variant="ghost" size="sm" className="text-danger hover:text-danger hover:bg-danger/10" icon={<Trash2 className="h-4 w-4" />} onClick={() => onDelete(file.id)} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </ContentCard>
  );
}
