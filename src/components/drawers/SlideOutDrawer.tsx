'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SharedPortal } from '@/components/layout/Portal';

const drawerVariants = cva(
  'fixed z-[var(--z-drawer)] gap-4 bg-background shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500',
  {
    variants: {
      side: {
        top: 'inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
        bottom:
          'inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
        left: 'inset-y-0 left-0 h-full border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
        right:
          'inset-y-0 right-0 h-full border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
      },
      size: {
        sm: '',
        md: '',
        lg: '',
        full: '',
      },
    },
    compoundVariants: [
      { side: ['left', 'right'], size: 'sm', className: 'w-3/4 sm:max-w-sm' },
      { side: ['left', 'right'], size: 'md', className: 'w-3/4 sm:max-w-md' },
      { side: ['left', 'right'], size: 'lg', className: 'w-3/4 sm:max-w-lg' },
      { side: ['left', 'right'], size: 'full', className: 'w-screen' },
      { side: ['top', 'bottom'], size: 'sm', className: 'h-1/4' },
      { side: ['top', 'bottom'], size: 'md', className: 'h-1/2' },
      { side: ['top', 'bottom'], size: 'lg', className: 'h-3/4' },
      { side: ['top', 'bottom'], size: 'full', className: 'h-screen' },
    ],
    defaultVariants: {
      side: 'right',
      size: 'md',
    },
  }
);

interface SlideOutDrawerProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>,
    VariantProps<typeof drawerVariants> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  isDirty?: boolean;
  onCloseRequest?: () => void;
  className?: string;
  hideCloseButton?: boolean;
}

export function SlideOutDrawer({
  side = 'right',
  size = 'md',
  title,
  description,
  footer,
  isDirty = false,
  onCloseRequest,
  className,
  children,
  hideCloseButton,
  ...props
}: SlideOutDrawerProps) {
  const handleInteractOutside = (e: Event) => {
    if (isDirty) {
      e.preventDefault();
      const confirmClose = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (confirmClose) {
        onCloseRequest?.();
      }
    } else {
      onCloseRequest?.();
    }
  };

  const handleEscapeKeyDown = (e: KeyboardEvent) => {
    if (isDirty) {
      e.preventDefault();
      const confirmClose = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (confirmClose) {
        onCloseRequest?.();
      }
    } else {
      onCloseRequest?.();
    }
  };

  return (
    <DialogPrimitive.Root {...props} onOpenChange={(open) => !open && onCloseRequest?.()}>
      <SharedPortal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[var(--z-drawer)] bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onInteractOutside={handleInteractOutside}
          onEscapeKeyDown={handleEscapeKeyDown}
          className={cn(drawerVariants({ side, size }), "flex flex-col", className)}
        >
          {(title || description || !hideCloseButton) && (
            <div className="sticky top-0 z-[var(--z-sticky)] flex flex-col space-y-1.5 p-6 border-b bg-background">
              {title && (
                <DialogPrimitive.Title className="text-lg font-semibold leading-none tracking-tight">
                  {title}
                </DialogPrimitive.Title>
              )}
              {description && (
                <DialogPrimitive.Description className="text-sm text-muted-foreground">
                  {description}
                </DialogPrimitive.Description>
              )}
              {!hideCloseButton && (
                <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </DialogPrimitive.Close>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6">
            {children}
          </div>

          {footer && (
            <div className="sticky bottom-0 z-[var(--z-sticky)] flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 border-t p-6 bg-background">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </SharedPortal>
    </DialogPrimitive.Root>
  );
}
