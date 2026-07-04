 
 
'use client';

import { Bell } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { BranchSwitcher } from './branch-switcher';

export function Header({ context }: { context?: any }) {
  const { setTheme, theme } = useTheme();

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b bg-background">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold">Dashboard</h2>
        <BranchSwitcher context={context} />
      </div>
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <span className="sr-only">Toggle theme</span>
          {/* Placeholder for actual Sun/Moon icons to avoid hydration issues */}
          <div className="h-5 w-5 rounded-full bg-foreground/20" />
        </Button>
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5 text-muted-foreground" />
        </Button>
        <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
          SA
        </div>
      </div>
    </header>
  );
}
