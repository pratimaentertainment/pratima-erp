'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  MapPin,
  Search,
  Star,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  Link2,
  Trash2,
  AlertCircle,
  Building2,
  ArrowRight,
  X,
  HelpCircle,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  checkGmbConfigAction,
  searchPlacesAction,
  extractPlaceIdFromUrlAction,
  getPlaceDetailsAction,
  PlaceSuggestion,
} from '@/actions/gmb.actions';

export interface TenantGmbConnectorProps {
  value?: string | null;
  onChange: (placeId: string) => void;
  studioName?: string;
  className?: string;
}

export function TenantGmbConnector({
  value,
  onChange,
  studioName = 'Studio',
  className,
}: TenantGmbConnectorProps) {
  const [, startTransition] = useTransition();

  // Environment capability state
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);

  // Connected place state
  const [connectedDetails, setConnectedDetails] = useState<PlaceSuggestion | null>(null);
  const [isChanging, setIsChanging] = useState<boolean>(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // Link paste fallback state
  const [showUrlFallback, setShowUrlFallback] = useState<boolean>(false);
  const [urlInput, setUrlInput] = useState<string>('');
  const [isResolvingUrl, setIsResolvingUrl] = useState<boolean>(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Check API key configuration on mount
  useEffect(() => {
    startTransition(async () => {
      try {
        const config = await checkGmbConfigAction();
        setHasApiKey(config.hasApiKey);
        if (!config.hasApiKey) {
          setShowUrlFallback(true);
        }
      } catch (err) {
        console.warn('[GMB_CONNECTOR] Config check notice:', err);
      }
    });
  }, []);

  // Load details of pre-existing value on mount or when value changes
  useEffect(() => {
    if (value && value.trim()) {
      startTransition(async () => {
        const res = await getPlaceDetailsAction(value.trim());
        if (res.success && res.data) {
          setConnectedDetails(res.data);
        } else {
          const isUrl = value.trim().startsWith('http://') || value.trim().startsWith('https://');
          setConnectedDetails({
            placeId: value.trim(),
            name: studioName,
            formattedAddress: '',
            googleMapsUri: isUrl ? value.trim() : undefined,
          });
        }
      });
    } else {
      setConnectedDetails(null);
    }
  }, [value, studioName]);

  // Debounced search places action
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      setSearchError(null);
      setHasSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);
      setHasSearched(true);

      const res = await searchPlacesAction(searchQuery.trim());
      setIsSearching(false);

      if (res.success && res.data) {
        setSuggestions(res.data);
      } else {
        setSuggestions([]);
        if (res.error) {
          setSearchError(res.error);
        }
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Select a place suggestion
  const handleSelectPlace = (place: PlaceSuggestion) => {
    onChange(place.placeId);
    setConnectedDetails(place);
    setIsChanging(false);
    setSearchQuery('');
    setSuggestions([]);
    setShowUrlFallback(false);
    setUrlError(null);
    setSearchError(null);
    setHasSearched(false);
    toast.success(`Connected to Google Business: ${place.name}`);
  };

  // Disconnect place
  const handleDisconnect = () => {
    onChange('');
    setConnectedDetails(null);
    setIsChanging(false);
    setSearchQuery('');
    setSuggestions([]);
    setSearchError(null);
    setHasSearched(false);
    toast.info('Google My Business profile disconnected');
  };

  // Resolve Place ID or Location from pasted link
  const handleResolveUrl = async () => {
    if (!urlInput || !urlInput.trim()) {
      toast.error('Please enter a Google Maps link or Place ID');
      return;
    }

    setIsResolvingUrl(true);
    setUrlError(null);

    try {
      const res = await extractPlaceIdFromUrlAction(urlInput.trim());
      if (res.success && res.data) {
        handleSelectPlace(res.data);
        setUrlInput('');
      } else {
        const errorMsg = res.error || 'Failed to resolve Google Maps link';
        setUrlError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Error resolving Google Maps link';
      setUrlError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsResolvingUrl(false);
    }
  };

  // 1. Render Connected Business State
  if (value && value.trim() && !isChanging) {
    const isUrl = value.trim().startsWith('http://') || value.trim().startsWith('https://');
    const mapsUrl =
      connectedDetails?.googleMapsUri ||
      (isUrl
        ? value.trim()
        : `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${encodeURIComponent(value.trim())}`);

    return (
      <div className={cn('space-y-3', className)}>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{connectedDetails?.name || studioName}</span>
                </span>
                <Badge
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-semibold"
                >
                  Verified on Google
                </Badge>
              </div>

              {connectedDetails?.formattedAddress && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span>{connectedDetails.formattedAddress}</span>
                </p>
              )}

              {/* Rating metrics if available */}
              {connectedDetails?.rating !== undefined && (
                <div className="flex items-center gap-2 pt-0.5">
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                    <span className="text-xs font-bold text-foreground">
                      {connectedDetails.rating.toFixed(1)}
                    </span>
                  </div>
                  {connectedDetails.userRatingCount !== undefined && (
                    <span className="text-[11px] text-muted-foreground">
                      ({connectedDetails.userRatingCount} Reviews)
                    </span>
                  )}
                </div>
              )}

              <div className="pt-1 flex items-center gap-2">
                <span className="text-[11px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/60 max-w-sm sm:max-w-md truncate">
                  {isUrl ? 'Google Maps Link Connected' : `Place ID: ${value}`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 sm:pt-0 shrink-0">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex"
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1 border-border/80 hover:bg-muted"
                >
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                  <span>View on Maps</span>
                </Button>
              </a>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsChanging(true)}
                className="h-8 text-xs hover:bg-muted"
              >
                Change
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                className="h-8 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                title="Disconnect Google Business profile"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Render Search / Connector Input State
  return (
    <div className={cn('space-y-3', className)}>
      {/* Mode Guidance Note */}
      {!hasApiKey && (
        <div className="p-3.5 rounded-xl bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-blue-950 dark:text-blue-100">
              Dual-Mode Google Integration: Direct Share Link Active
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Connect your studio immediately by pasting your Google Maps share link or Place ID below. Your public storefront will display a verified Google trust card with direct links for clients to read and leave reviews.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {hasApiKey && (
          <div className="relative">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search studio by name (e.g., Pratima Photography Mumbai)..."
              className="pl-9 pr-9 text-xs h-10 border-border/80 shadow-xs focus-visible:ring-primary"
              autoComplete="off"
            />
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />

            {isSearching ? (
              <RefreshCw className="w-4 h-4 text-primary animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
            ) : searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSuggestions([]);
                  setSearchError(null);
                  setHasSearched(false);
                }}
                className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>
        )}

        {/* Loading State Dropdown */}
        {isSearching && (
          <div className="rounded-xl border border-border bg-card shadow-lg p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2 animate-in fade-in-50 duration-150">
            <RefreshCw className="w-4 h-4 text-primary animate-spin" />
            <span>Searching Google Places for &ldquo;{searchQuery}&rdquo;...</span>
          </div>
        )}

        {/* Search Results Dropdown List */}
        {!isSearching && suggestions.length > 0 && (
          <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden divide-y divide-border/60 max-h-64 overflow-y-auto animate-in fade-in-50 duration-200">
            {suggestions.map((item) => (
              <button
                key={item.placeId}
                type="button"
                onClick={() => handleSelectPlace(item)}
                className="w-full text-left p-3 hover:bg-muted/60 transition-colors flex items-start gap-3 group"
              >
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {item.name}
                    </span>
                    {item.rating !== undefined && (
                      <span className="text-[11px] font-bold text-amber-500 shrink-0 flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-amber-500" />
                        {item.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {item.formattedAddress}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Empty Results State */}
        {!isSearching && hasSearched && suggestions.length === 0 && !searchError && searchQuery.trim().length >= 2 && (
          <div className="rounded-xl border border-border bg-card shadow-lg p-4 text-center text-xs text-muted-foreground space-y-1.5 animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-center gap-1.5 font-medium text-foreground">
              <HelpCircle className="w-4 h-4 text-muted-foreground" />
              <span>No Google Places found for &ldquo;{searchQuery}&rdquo;</span>
            </div>
            <p className="text-[11px] leading-relaxed max-w-sm mx-auto">
              Try adding your city name (e.g. &ldquo;{searchQuery} Mumbai&rdquo;) or paste your Google Maps link directly below.
            </p>
          </div>
        )}

        {/* Informational Notice (Non-blocking) */}
        {searchError && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2 text-amber-950 dark:text-amber-200 animate-in fade-in-50 duration-200">
            <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Google Places Search Notice</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {searchError}
            </p>
          </div>
        )}
      </div>

      {/* Fallback / Direct Link Connector */}
      <div className="pt-1">
        {!showUrlFallback && hasApiKey ? (
          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => setShowUrlFallback(true)}
              className="text-primary hover:underline text-[11px] font-medium flex items-center gap-1.5"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Paste Google Maps Link or Place ID directly</span>
            </button>

            {value && isChanging && (
              <button
                type="button"
                onClick={() => {
                  setIsChanging(false);
                  setSearchQuery('');
                  setSuggestions([]);
                  setSearchError(null);
                  setHasSearched(false);
                }}
                className="text-muted-foreground hover:text-foreground text-[11px]"
              >
                Cancel
              </button>
            )}
          </div>
        ) : (
          <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30 space-y-3 animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                <Link2 className="w-3.5 h-3.5 text-primary" />
                <span>Paste Google Maps Share Link or Place ID</span>
              </span>
              {hasApiKey && (
                <button
                  type="button"
                  onClick={() => {
                    setShowUrlFallback(false);
                    setUrlError(null);
                  }}
                  className="text-muted-foreground hover:text-foreground text-[11px]"
                >
                  Hide
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <Input
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  if (urlError) setUrlError(null);
                }}
                placeholder="https://maps.app.goo.gl/... or google.com/maps/place/... or ChIJ..."
                className="text-xs h-9 bg-background font-mono"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleResolveUrl}
                disabled={isResolvingUrl || !urlInput.trim()}
                className="h-9 px-3 text-xs gap-1.5 shrink-0 font-medium"
              >
                {isResolvingUrl ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5" />
                )}
                <span>Connect</span>
              </Button>
            </div>

            {urlError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-950 dark:text-rose-200 text-[11px] leading-relaxed flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <span>{urlError}</span>
              </div>
            )}

            <p className="text-[10px] text-muted-foreground">
              Tip: Open Google Maps on mobile or desktop, search your studio, tap &ldquo;Share&rdquo;, and copy the link.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
