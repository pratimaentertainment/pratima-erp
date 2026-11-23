import * as React from 'react';
import { cn } from '@/lib/utils';
import { UploadCloud } from 'lucide-react';

interface FileDropzoneProps {
  onFilesAdded: (files: File[]) => void;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  className?: string;
}

export function FileDropzone({ onFilesAdded, accept, maxSize, multiple = true, className }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      onFilesAdded(files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      onFilesAdded(files);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={cn(
        "flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
        isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:bg-muted/10",
        className
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={handleChange}
      />
      <UploadCloud className={cn("h-10 w-10 mb-4", isDragging ? "text-primary" : "text-muted-foreground")} />
      <h3 className="text-sm font-semibold mb-1">Click or drag files here</h3>
      <p className="text-xs text-muted-foreground">
        Support for various document types. Max size {maxSize ? `${maxSize / 1024 / 1024}MB` : 'unlimited'}.
      </p>
    </div>
  );
}
