'use client';

import * as React from 'react';
import { useState } from 'react';
import {
  FileCheck,
  Clock,
  CheckCircle2,
  Calendar,
  Building2,
  IndianRupee,
  Receipt,
  Search,
} from 'lucide-react';
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
import { Input } from '@/components/ui/input';

export interface RoyaltyLedgerRow {
  id: string;
  bookingTitle: string;
  bookingNumber: string;
  eventDate: string | null;
  franchiseeId: string;
  franchiseeName: string;
  grossAmount: number;
  royaltyPercent: number;
  royaltyAmount: number;
  status: 'PENDING' | 'SETTLED' | 'WAIVED';
  settledAt: string | null;
  settlementRef: string | null;
  notes: string | null;
  createdAt: string;
}

interface RoyaltyLedgerTableProps {
  entries: RoyaltyLedgerRow[];
  onRecordSettlement: (entry: RoyaltyLedgerRow) => void;
}

export function RoyaltyLedgerTable({
  entries,
  onRecordSettlement,
}: RoyaltyLedgerTableProps) {
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'SETTLED'>('ALL');
  const [search, setSearch] = useState('');

  const filteredEntries = entries.filter((r) => {
    if (filter !== 'ALL' && r.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = r.bookingTitle.toLowerCase().includes(q);
      const matchFranchisee = r.franchiseeName.toLowerCase().includes(q);
      const matchRef = r.settlementRef?.toLowerCase().includes(q);
      const matchBookingNum = r.bookingNumber?.toLowerCase().includes(q);
      return matchTitle || matchFranchisee || matchRef || matchBookingNum;
    }
    return true;
  });

  return (
    <div className="space-y-3">
      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant={filter === 'ALL' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('ALL')}
            className="text-xs h-8"
          >
            All Ledger ({entries.length})
          </Button>
          <Button
            variant={filter === 'PENDING' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('PENDING')}
            className="text-xs h-8 text-amber-600 dark:text-amber-400"
          >
            Pending ({entries.filter((r) => r.status === 'PENDING').length})
          </Button>
          <Button
            variant={filter === 'SETTLED' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('SETTLED')}
            className="text-xs h-8 text-emerald-600 dark:text-emerald-400"
          >
            Settled ({entries.filter((r) => r.status === 'SETTLED').length})
          </Button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search bookings, studios, UTR..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs pl-8 h-8"
          />
        </div>
      </div>

      {filteredEntries.length === 0 ? (
        <div className="py-12 text-center rounded-xl border border-dashed border-border/80 bg-card/40 space-y-2">
          <Receipt className="h-6 w-6 text-muted-foreground mx-auto" />
          <p className="text-xs text-muted-foreground">No royalty records match your filter criteria.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 bg-card/60 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Booking / Shoot
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Franchise Studio
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Gross Shoot Value
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Royalty Due
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status & Settlement
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((row) => {
                  const isPending = row.status === 'PENDING';
                  return (
                    <TableRow key={row.id} className="border-border/50 hover:bg-muted/20">
                      {/* Booking Title & Date */}
                      <TableCell className="py-3">
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold text-foreground">
                            {row.bookingTitle}
                          </p>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                            {row.bookingNumber !== '—' && (
                              <span className="font-mono">{row.bookingNumber}</span>
                            )}
                            {row.eventDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-2.5 w-2.5" />
                                {new Date(row.eventDate).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Franchisee Studio */}
                      <TableCell className="py-3">
                        <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          <span>{row.franchiseeName}</span>
                        </div>
                      </TableCell>

                      {/* Gross Value */}
                      <TableCell className="py-3">
                        <span className="text-xs font-semibold text-foreground">
                          ₹{row.grossAmount.toLocaleString('en-IN')}
                        </span>
                      </TableCell>

                      {/* Royalty Amount */}
                      <TableCell className="py-3">
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-foreground">
                            ₹{row.royaltyAmount.toLocaleString('en-IN')}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            ({row.royaltyPercent}% rate)
                          </span>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-3">
                        {isPending ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10 gap-1"
                          >
                            <Clock className="h-3 w-3" />
                            <span>Pending Due</span>
                          </Badge>
                        ) : (
                          <div className="space-y-0.5">
                            <Badge
                              variant="outline"
                              className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 gap-1"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Settled</span>
                            </Badge>
                            {row.settlementRef && (
                              <p className="text-[10px] font-mono text-muted-foreground truncate max-w-[130px]">
                                Ref: {row.settlementRef}
                              </p>
                            )}
                          </div>
                        )}
                      </TableCell>

                      {/* Action */}
                      <TableCell className="py-3 text-right">
                        {isPending ? (
                          <Button
                            size="sm"
                            onClick={() => onRecordSettlement(row)}
                            className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                          >
                            <FileCheck className="h-3.5 w-3.5" />
                            <span>Settle</span>
                          </Button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            {row.settledAt
                              ? new Date(row.settledAt).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                })
                              : 'Settled'}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
