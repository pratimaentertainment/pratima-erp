'use client';

import * as React from 'react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, X, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export interface ImageUploadProps {
  value?: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  maxSizeMB?: number;
  className?: string;
  accept?: string;
  label?: string;
  description?: string;
}

export function ImageUpload({
  value,
  onChange,
  disabled = false,
  maxSizeMB = 2,
  className = '',
  accept = 'image/png, image/jpeg, image/webp, image/svg+xml',
  label = 'Upload Image',
  description = 'PNG, JPEG, WebP, or SVG up to 2MB',
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasLoadError, setHasLoadError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep stable reference to onChange to prevent re-render cascades
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Reset load error whenever the image value prop changes
  useEffect(() => {
    setHasLoadError(false);
    setErrorMessage(null);
  }, [value]);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const processFile = useCallback(
    (file: File) => {
      setErrorMessage(null);
      setHasLoadError(false);

      // Validate file size
      if (file.size > maxSizeBytes) {
        const error = `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum allowed ${maxSizeMB} MB.`;
        setErrorMessage(error);
        toast.error(error);
        return;
      }

      // Validate MIME type
      const acceptedTypes = accept.split(',').map((t) => t.trim().toLowerCase());
      const isAccepted = acceptedTypes.some((type) => {
        if (type.endsWith('/*')) {
          const prefix = type.split('/')[0];
          return file.type.startsWith(`${prefix}/`);
        }
        return file.type.toLowerCase() === type;
      });

      if (!isAccepted && file.type) {
        const error = `Unsupported file format. Please upload ${description}.`;
        setErrorMessage(error);
        toast.error(error);
        return;
      }

      // Read file into Base64 Data URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          onChangeRef.current(result);
          toast.success('Image loaded successfully');
        }
      };
      reader.onerror = () => {
        const error = 'Failed to read image file. Please try again.';
        setErrorMessage(error);
        toast.error(error);
      };

      reader.readAsDataURL(file);
    },
    [maxSizeBytes, maxSizeMB, accept, description]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        processFile(file);
      }
    },
    [disabled, processFile]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processFile(file);
      e.target.value = '';
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    onChangeRef.current('');
    setErrorMessage(null);
    setHasLoadError(false);
  };

  const triggerSelect = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
      />

      {value ? (
        // Preview Active Image
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border rounded-xl bg-card shadow-xs">
          <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-lg border bg-muted/30 p-1 flex items-center justify-center overflow-hidden shrink-0 group">
            {hasLoadError ? (
              <div className="flex flex-col items-center justify-center text-muted-foreground p-1 text-center">
                <ImageIcon className="h-6 w-6 opacity-40 mb-1 text-destructive" />
                <span className="text-[10px] text-destructive/80 font-medium">Invalid Image</span>
              </div>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={value}
                alt="Uploaded Preview"
                className="h-full w-full object-contain rounded"
                onError={() => {
                  // Prevent continuous re-render loop by replacing img with fallback UI
                  setHasLoadError(true);
                }}
              />
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground truncate">
                Active Logo Selected
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                Ready
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              This logo will be displayed on quotations, invoices, client galleries, and staff portals.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={triggerSelect}
                disabled={disabled}
                className="h-7 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Replace
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={disabled}
                className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <X className="h-3 w-3 mr-1.5" />
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        // Dropzone Area
        <div
          onClick={triggerSelect}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors text-center ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="p-3 rounded-full bg-muted/60 text-muted-foreground mb-2">
            <UploadCloud className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              <span className="text-primary hover:underline">{label}</span> or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-1.5 text-xs text-destructive mt-1.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
