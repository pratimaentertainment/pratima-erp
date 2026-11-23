'use client';

import { ThemeProvider } from './theme-provider';
import { SessionProvider } from 'next-auth/react';
import { DialogProvider } from '@/components/providers/DialogProvider';
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // (future)
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <DialogProvider>
          {children}
          <Toaster position="top-right" richColors />
        </DialogProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
