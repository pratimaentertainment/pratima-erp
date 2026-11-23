import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, ExternalLink } from 'lucide-react';
import { IconButton } from '@/components/buttons/IconButton';
import { DocumentViewer } from './DocumentViewer';
import type { DocumentViewerProps } from './types';

interface FilePreviewDialogProps extends DocumentViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FilePreviewDialog({ open, onOpenChange, ...documentProps }: FilePreviewDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-6xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg md:w-full h-[90vh] flex flex-col overflow-hidden">
          
          <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
            <Dialog.Title className="text-lg font-semibold truncate pr-4">
              {documentProps.filename}
            </Dialog.Title>
            <div className="flex items-center gap-2">
              <IconButton 
                aria-label="Open in new tab" 
                variant="ghost" 
                icon={<ExternalLink className="h-4 w-4" />} 
                onClick={() => window.open(documentProps.url, '_blank')} 
              />
              <Dialog.Close asChild>
                <IconButton aria-label="Close dialog" variant="ghost" icon={<X className="h-4 w-4" />} />
              </Dialog.Close>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto p-4 bg-muted/10">
            <DocumentViewer {...documentProps} />
          </div>
          
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
