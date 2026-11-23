import * as React from 'react';
import { cn } from '@/lib/utils';
import type { FileRecord } from './types';
import { FileThumbnail } from './FileThumbnail';
import { ActionDropdown } from '@/components/actions';
import { Eye, Download, Trash, RefreshCw } from 'lucide-react';

interface FileCardProps {
  file: FileRecord;
  onPreview?: (file: FileRecord) => void;
  onDownload?: (file: FileRecord) => void;
  onDelete?: (file: FileRecord) => void;
  className?: string;
}

export function FileCard({ file, onPreview, onDownload, onDelete, className }: FileCardProps) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getStatusColor = (state: string) => {
    switch(state) {
      case 'Uploading': return 'text-warning';
      case 'Processing': return 'text-primary';
      case 'Failed': return 'text-destructive';
      case 'Uploaded': return 'text-success';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className={cn("group flex flex-col border rounded-lg overflow-hidden bg-background hover:border-primary/50 transition-colors", className)}>
      <div 
        className="h-32 w-full border-b relative cursor-pointer"
        onClick={() => onPreview?.(file)}
      >
        <FileThumbnail type={file.type} url={file.url} />
        
        {file.state !== 'Uploaded' && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
            {file.state === 'Uploading' && <RefreshCw className="h-5 w-5 animate-spin text-primary mb-2" />}
            <span className={cn("text-xs font-semibold uppercase tracking-wider", getStatusColor(file.state))}>
              {file.state}
            </span>
          </div>
        )}
      </div>
      
      <div className="p-3 flex items-start justify-between gap-2">
        <div className="flex flex-col min-w-0">
          <p className="text-sm font-medium truncate" title={file.filename}>
            {file.filename}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
            {file.version && (
              <span className="text-[10px] font-semibold bg-muted px-1.5 rounded text-muted-foreground">
                v{file.version}
              </span>
            )}
          </div>
        </div>
        
        <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <ActionDropdown
            actions={[
              { id: 'preview', label: 'Preview', icon: <Eye className="h-4 w-4" />, onClick: () => onPreview?.(file), hidden: !onPreview },
              { id: 'download', label: 'Download', icon: <Download className="h-4 w-4" />, onClick: () => onDownload?.(file), hidden: !onDownload },
              { id: 'delete', label: 'Delete', icon: <Trash className="h-4 w-4" />, onClick: () => onDelete?.(file), variant: 'danger', hidden: !onDelete },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
