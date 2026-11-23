'use client';

import * as React from 'react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Users,
  FileText,
  Camera,
  Loader2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { globalSearchAction, SearchResultItem } from '@/actions/search.actions';

interface CommandPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CommandPalette({
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: CommandPaletteProps = {}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Local state for dialog overlay (removes reliance on external uninitialized stores)
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = useCallback(
    (nextState: boolean | ((prev: boolean) => boolean)) => {
      const resolved = typeof nextState === 'function' ? nextState(open) : nextState;
      if (setControlledOpen) {
        setControlledOpen(resolved);
      }
      setInternalOpen(resolved);
    },
    [open, setControlledOpen]
  );

  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [customers, setCustomers] = useState<SearchResultItem[]>([]);
  const [leads, setLeads] = useState<SearchResultItem[]>([]);
  const [bookings, setBookings] = useState<SearchResultItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // Clean useEffect to listen for Ctrl+K and Cmd+K to safely toggle open state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setOpen]);

  // Debounced search query execution with comprehensive error handling
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setCustomers([]);
      setLeads([]);
      setBookings([]);
      setIsSearching(false);
      setSelectedIndex(0);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await globalSearchAction(trimmed);
        if (res?.success && res?.data) {
          setCustomers(res.data.customers || []);
          setLeads(res.data.leads || []);
          setBookings(res.data.bookings || []);
          setSelectedIndex(0);
        } else {
          setCustomers([]);
          setLeads([]);
          setBookings([]);
        }
      } catch (err) {
        console.error('[CommandPalette] Global search error:', err);
        setCustomers([]);
        setLeads([]);
        setBookings([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Reset state whenever the palette is closed
  useEffect(() => {
    if (!open) {
      setQuery('');
      setCustomers([]);
      setLeads([]);
      setBookings([]);
      setIsSearching(false);
      setSelectedIndex(0);
    } else {
      // Focus search input after animation
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [open]);

  const allItems = useMemo(() => {
    return [
      ...customers.map((c) => ({ ...c, group: 'clients' as const })),
      ...leads.map((l) => ({ ...l, group: 'leads' as const })),
      ...bookings.map((b) => ({ ...b, group: 'bookings' as const })),
    ];
  }, [customers, leads, bookings]);

  const handleSelect = useCallback(
    (url: string) => {
      setOpen(false);
      router.push(url);
    },
    [router, setOpen]
  );

  // Keyboard navigation inside the palette
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (allItems.length > 0 ? (prev + 1) % allItems.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (allItems.length > 0 ? (prev - 1 + allItems.length) % allItems.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        handleSelect(allItems[selectedIndex].url);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const hasResults = allItems.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="sm:max-w-xl p-0 overflow-hidden border bg-popover shadow-2xl rounded-xl gap-0 top-[25%] translate-y-0"
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Global Studio Search</DialogTitle>
          <DialogDescription>
            Search clients, sales leads, and event bookings across the studio.
          </DialogDescription>
        </DialogHeader>

        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-border bg-background gap-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search clients, leads, bookings, venues... (⌘K)"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground"
          />
          {isSearching && (
            <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results / Suggestions Container */}
        <div className="max-h-96 overflow-y-auto p-2">
          {/* Loading Indicator */}
          {isSearching && (
            <div className="flex items-center justify-center p-6 text-sm text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Searching studio records...</span>
            </div>
          )}

          {/* Empty Results State */}
          {!isSearching && query.trim() !== '' && !hasResults && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No matching clients, leads, or bookings found.
            </div>
          )}

          {/* Initial Search Hint */}
          {!isSearching && query.trim() === '' && (
            <div className="p-6 text-center text-xs text-muted-foreground space-y-1">
              <Sparkles className="h-5 w-5 mx-auto mb-1 text-primary opacity-70" />
              <p className="font-medium text-foreground">Instant Studio Omnibar</p>
              <p>Type a client name, phone number, lead ID, or event booking title.</p>
            </div>
          )}

          {/* CLIENTS GROUP */}
          {customers.length > 0 && (
            <div className="mb-2">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Clients & Contacts
              </div>
              <div className="space-y-1">
                {customers.map((item) => {
                  const globalIdx = allItems.findIndex((x) => x.id === item.id);
                  const isSelected = globalIdx === selectedIndex;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelect(item.url)}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-muted/50 text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 shrink-0">
                          <Users className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{item.title}</div>
                          <div className="text-xs text-muted-foreground truncate">{item.subtitle}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <Badge variant="outline" className="text-[10px] text-blue-700 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900">
                          Client
                        </Badge>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* LEADS GROUP */}
          {leads.length > 0 && (
            <div className="mb-2">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Sales Leads
              </div>
              <div className="space-y-1">
                {leads.map((item) => {
                  const globalIdx = allItems.findIndex((x) => x.id === item.id);
                  const isSelected = globalIdx === selectedIndex;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelect(item.url)}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-muted/50 text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{item.title}</div>
                          <div className="text-xs text-muted-foreground truncate">{item.subtitle}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <Badge variant="outline" className="text-[10px] text-purple-700 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900">
                          {item.badge}
                        </Badge>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* EVENT BOOKINGS GROUP */}
          {bookings.length > 0 && (
            <div className="mb-2">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Event Bookings & Shoots
              </div>
              <div className="space-y-1">
                {bookings.map((item) => {
                  const globalIdx = allItems.findIndex((x) => x.id === item.id);
                  const isSelected = globalIdx === selectedIndex;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelect(item.url)}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-muted/50 text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 shrink-0">
                          <Camera className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{item.title}</div>
                          <div className="text-xs text-muted-foreground truncate">{item.subtitle}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900">
                          {item.badge}
                        </Badge>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-muted/40 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Navigate with <kbd className="font-mono bg-background px-1 py-0.5 rounded border">↑</kbd> <kbd className="font-mono bg-background px-1 py-0.5 rounded border">↓</kbd></span>
          <span>Select with <kbd className="font-mono bg-background px-1.5 py-0.5 rounded border">Enter</kbd></span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
