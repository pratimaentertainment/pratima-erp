'use client';

import * as React from 'react';

type DialogId = string;

interface DialogConfig {
  id: DialogId;
  component: React.ComponentType<any>;
  props?: Record<string, any>;
  resolve?: (value: any) => void;
  reject?: (reason?: any) => void;
}

interface DialogContextValue {
  openDialog: <TResult = any>(component: React.ComponentType<any>, props?: Record<string, any>, id?: string) => Promise<TResult | undefined>;
  closeDialog: (id: DialogId, result?: any) => void;
  closeAll: () => void;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

export function useDialog() {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialogs, setDialogs] = React.useState<DialogConfig[]>([]);

  const openDialog = React.useCallback(
    <TResult = any,>(component: React.ComponentType<any>, props?: Record<string, any>, id?: string): Promise<TResult | undefined> => {
      return new Promise<TResult | undefined>((resolve, reject) => {
        const dialogId = id || Math.random().toString(36).substring(7);
        
        setDialogs((prev) => {
          // Prevent duplicates by ID
          if (prev.some(d => d.id === dialogId)) {
            console.warn(`Dialog with id ${dialogId} is already open.`);
            return prev;
          }
          return [...prev, { id: dialogId, component, props, resolve, reject }];
        });
      });
    },
    []
  );

  const closeDialog = React.useCallback((id: DialogId, result?: any) => {
    setDialogs((prev) => {
      const dialog = prev.find((d) => d.id === id);
      if (dialog && dialog.resolve) {
        dialog.resolve(result);
      }
      return prev.filter((d) => d.id !== id);
    });
  }, []);

  const closeAll = React.useCallback(() => {
    setDialogs((prev) => {
      prev.forEach(d => {
        if (d.resolve) d.resolve(undefined);
      });
      return [];
    });
  }, []);

  return (
    <DialogContext.Provider value={{ openDialog, closeDialog, closeAll }}>
      {children}
      
      {dialogs.map((dialog) => {
        const Component = dialog.component;
        return (
          <Component
            key={dialog.id}
            {...dialog.props}
            open={true}
            onOpenChange={(open: boolean) => {
              if (!open) closeDialog(dialog.id);
            }}
          />
        );
      })}
    </DialogContext.Provider>
  );
}
