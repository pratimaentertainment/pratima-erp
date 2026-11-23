import * as React from 'react';
import { cn } from '@/lib/utils';
import { FileText, FileImage, FileAudio, FileVideo, FileQuestion } from 'lucide-react';
import type { DocumentType } from '../document-viewer';

export function FileThumbnail({ type, url, className }: { type: DocumentType, url?: string, className?: string }) {
  if (type === 'image' && url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="Thumbnail" className={cn("object-cover h-full w-full", className)} loading="lazy" />;
  }

  const getIcon = () => {
    switch (type) {
      case 'image': return <FileImage className="h-6 w-6 opacity-50" />;
      case 'pdf': return <FileText className="h-6 w-6 text-destructive opacity-80" />;
      case 'audio': return <FileAudio className="h-6 w-6 opacity-50" />;
      case 'video': return <FileVideo className="h-6 w-6 opacity-50" />;
      case 'office': return <FileText className="h-6 w-6 text-primary opacity-80" />;
      default: return <FileQuestion className="h-6 w-6 opacity-50" />;
    }
  };

  return (
    <div className={cn("flex items-center justify-center bg-muted w-full h-full text-muted-foreground", className)}>
      {getIcon()}
    </div>
  );
}
