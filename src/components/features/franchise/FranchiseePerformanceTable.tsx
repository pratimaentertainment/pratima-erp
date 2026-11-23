'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  MapPin,
  User,
  Phone,
  Mail,
  RefreshCw,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { syncMissingFranchiseRoyaltiesAction } from '@/actions/franchise.actions';

export interface FranchiseeRow {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  royaltyPercent: number;
  subscriptionStatus: string;
  createdAt: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  totalBookings: number;
  totalGrossVolume: number;
  pendingRoyalty: number;
  settledRoyalty: number;
}

interface FranchiseePerformanceTableProps {
  franchisees: FranchiseeRow[];
}

export function FranchiseePerformanceTable({
  franchisees,
}: FranchiseePerformanceTableProps) {
  const router = useRouter();
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const handleSync = async (franchiseeId: string) => {
    setSyncingId(franchiseeId);
    try {
      const res = await syncMissingFranchiseRoyaltiesAction(franchiseeId);
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to sync royalties.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error syncing royalties.');
    } finally {
      setSyncingId(null);
    }
  };

  if (franchisees.length === 0) {
    return (
      <div className="py-12 text-center rounded-xl border border-dashed border-border/80 bg-card/40 space-y-3">
        <div className="p-3 rounded-full bg-primary/10 text-primary w-fit mx-auto">
          <Building2 className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-foreground">No Franchise Studios Provisioned Yet</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Click &quot;Add Franchise Studio&quot; above to expand your brand network. Child studios inherit your software plan automatically.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card/60 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Franchise Studio
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Owner & Contact
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Shoot Volume
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Royalty Rate
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Royalty Dues
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {franchisees.map((f) => {
              const isSyncing = syncingId === f.id;
              return (
                <TableRow key={f.id} className="border-border/50 hover:bg-muted/20">
                  {/* Studio Details */}
                  <TableCell className="py-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-foreground">
                          {f.name}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 py-0 font-medium text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                        >
                          {f.subscriptionStatus}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span>{f.city}, {f.state}</span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Owner Contact */}
                  <TableCell className="py-3">
                    <div className="space-y-0.5 text-xs">
                      <div className="font-medium text-foreground flex items-center gap-1.5">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span>{f.ownerName}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-mono">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span>{f.ownerEmail}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-mono">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span>{f.ownerPhone}</span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Shoot Volume */}
                  <TableCell className="py-3">
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <CalendarCheck className="h-3.5 w-3.5 text-primary" />
                        <span>{f.totalBookings} Bookings</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground font-semibold">
                        ₹{f.totalGrossVolume.toLocaleString('en-IN')} Gross
                      </div>
                    </div>
                  </TableCell>

                  {/* Royalty Rate */}
                  <TableCell className="py-3">
                    <Badge variant="secondary" className="text-xs font-bold font-mono">
                      {f.royaltyPercent}%
                    </Badge>
                  </TableCell>

                  {/* Royalty Dues */}
                  <TableCell className="py-3">
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                        <Clock className="h-3 w-3" />
                        <span>₹{f.pendingRoyalty.toLocaleString('en-IN')} Pending</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-[11px]">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>₹{f.settledRoyalty.toLocaleString('en-IN')} Settled</span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Action */}
                  <TableCell className="py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSync(f.id)}
                      disabled={isSyncing}
                      className="h-8 text-xs gap-1.5 hover:bg-primary/10 hover:text-primary"
                      title="Scan and calculate missing royalties on confirmed bookings"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Syncing...' : 'Sync Royalties'}</span>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
