import * as React from 'react';
import { cn } from '@/lib/utils';
import type { FileRecord } from './types';
import { FileCard } from './FileCard';
import { FolderOpen } from 'lucide-react';

interface FileGridProps {
  files: FileRecord[];
  onPreview?: (file: FileRecord) => void;
  onDownload?: (file: FileRecord) => void;
  onDelete?: (file: FileRecord) => void;
  className?: string;
}

export function FileGrid({ files, onPreview, onDownload, onDelete, className }: FileGridProps) {
  if (!files || files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
        <FolderOpen className="h-10 w-10 mb-4 opacity-50" />
        <p className="text-sm font-medium">No files attached yet</p>
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4", className)}>
      {files.map(file => (
        <FileCard 
          key={file.id} 
          file={file} 
          onPreview={onPreview}
          onDownload={onDownload}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
