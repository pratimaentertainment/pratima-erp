'use client';

import * as React from 'react';
import { useState, useTransition, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Eye,
  FileJson,
  UserCheck,
  Building2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Code2,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getGlobalAuditLogsAction } from '@/actions/super-admin-governance.actions';

export interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues: any;
  newValues: any;
  ipAddress?: string | null;
  createdAt: string;
  tenant?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  user?: {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
  } | null;
}

interface AuditLogViewerProps {
  initialLogs: AuditLogItem[];
  totalCount: number;
}

export function AuditLogViewer({ initialLogs, totalCount: initialTotal }: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLogItem[]>(initialLogs);
  const [totalCount, setTotalCount] = useState<number>(initialTotal);
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [isPending, startTransition] = useTransition();

  // Selected Log for JSON Metadata Inspection Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = (targetPage = page, targetSearch = search, targetAction = actionFilter) => {
    startTransition(async () => {
      try {
        const res = await getGlobalAuditLogsAction({
          limit: pageSize,
          offset: targetPage * pageSize,
          search: targetSearch || undefined,
          action: targetAction !== 'ALL' ? targetAction : undefined,
        });

        if (res.success && res.logs) {
          setLogs(res.logs as AuditLogItem[]);
          setTotalCount(res.totalCount);
          setPage(targetPage);
        } else {
          toast.error(res.error || 'Failed to query audit logs.');
        }
      } catch (err: any) {
        toast.error(err.message || 'Error querying audit trail.');
      }
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(0, search, actionFilter);
  };

  const handleActionChange = (newAction: string) => {
    setActionFilter(newAction);
    fetchLogs(0, search, newAction);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const formatActionBadge = (action: string) => {
    if (action.startsWith('SUPER_ADMIN_IMPERSONATION')) {
      return (
        <Badge
          variant="outline"
          className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40 text-[10px] font-mono font-bold gap-1"
        >
          <ShieldAlert className="h-3 w-3 text-amber-500" />
          {action}
        </Badge>
      );
    }
    if (action.includes('LOGIN') || action.includes('AUTH')) {
      return (
        <Badge
          variant="outline"
          className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px] font-mono font-semibold"
        >
          {action}
        </Badge>
      );
    }
    if (action.includes('DELETE') || action.includes('REVOKE') || action.includes('CANCEL')) {
      return (
        <Badge
          variant="outline"
          className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[10px] font-mono font-semibold"
        >
          {action}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-[10px] font-mono font-medium">
        {action}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search & Action Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search action, tenant, actor, or entity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs h-9"
            />
          </div>
          <Button type="submit" size="sm" disabled={isPending} className="h-9 text-xs px-3">
            Search
          </Button>
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={actionFilter}
            onChange={(e) => handleActionChange(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="ALL">All Actions</option>
            <option value="SUPER_ADMIN_IMPERSONATION_START">SUPER_ADMIN_IMPERSONATION_START</option>
            <option value="SUPER_ADMIN_IMPERSONATION_END">SUPER_ADMIN_IMPERSONATION_END</option>
            <option value="USER_LOGIN">USER_LOGIN</option>
            <option value="USER_LOGOUT">USER_LOGOUT</option>
            <option value="UPDATE">UPDATE</option>
            <option value="CREATE">CREATE</option>
            <option value="DELETE">DELETE</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLogs(page, search, actionFilter)}
            disabled={isPending}
            className="h-9 text-xs gap-1.5 px-3"
            title="Refresh Audit Trail"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isPending ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Audit Log Table */}
      <Card className="border-border/70 shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs font-bold w-[170px]">Timestamp</TableHead>
              <TableHead className="text-xs font-bold">Action</TableHead>
              <TableHead className="text-xs font-bold">Actor</TableHead>
              <TableHead className="text-xs font-bold">Tenant Scope</TableHead>
              <TableHead className="text-xs font-bold">Entity</TableHead>
              <TableHead className="text-xs font-bold text-right w-[90px]">Payload</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                  {isPending ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span>Loading audit logs...</span>
                    </div>
                  ) : (
                    'No security audit logs found matching criteria.'
                  )}
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} className="hover:bg-muted/40 transition-colors">
                  {/* Timestamp */}
                  <TableCell className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span>
                        {new Date(log.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </TableCell>

                  {/* Action Badge */}
                  <TableCell>{formatActionBadge(log.action)}</TableCell>

                  {/* Actor */}
                  <TableCell>
                    {log.user ? (
                      <div className="flex flex-col text-xs">
                        <span className="font-semibold text-foreground">
                          {log.user.name || 'User'}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {log.user.email}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/60 italic">System Event</span>
                    )}
                  </TableCell>

                  {/* Tenant */}
                  <TableCell>
                    {log.tenant ? (
                      <div className="flex items-center gap-1.5 text-xs">
                        <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="font-medium text-foreground">{log.tenant.name}</span>
                        <code className="text-[10px] font-mono text-muted-foreground bg-muted px-1 py-0.2 rounded">
                          /{log.tenant.slug}
                        </code>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/70">Global Platform</span>
                    )}
                  </TableCell>

                  {/* Entity */}
                  <TableCell className="text-xs text-muted-foreground">
                    <span className="font-mono text-[11px]">{log.entityType}</span>
                    {log.entityId && (
                      <span className="block font-mono text-[10px] text-muted-foreground/60 truncate max-w-[120px]">
                        {log.entityId}
                      </span>
                    )}
                  </TableCell>

                  {/* Payload / Details Button */}
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedLog(log)}
                      className="h-7 px-2 text-xs gap-1 hover:bg-muted"
                      title="Inspect JSON Metadata"
                    >
                      <Code2 className="h-3 w-3 text-primary" />
                      <span>Inspect</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination Bar */}
        <div className="p-3 border-t bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing <strong>{logs.length}</strong> of <strong>{totalCount}</strong> audit events
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0 || isPending}
              onClick={() => fetchLogs(page - 1, search, actionFilter)}
              className="h-7 px-2 text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </Button>
            <span className="font-mono text-[11px] px-2">
              Page {page + 1} of {Math.max(1, totalPages)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page + 1 >= totalPages || isPending}
              onClick={() => fetchLogs(page + 1, search, actionFilter)}
              className="h-7 px-2 text-xs"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* JSON Payload Inspection Dialog */}
      {selectedLog && (
        <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
          <DialogContent className="sm:max-w-[620px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold font-heading flex items-center gap-2">
                <FileJson className="h-4 w-4 text-primary" />
                Audit Log Payload Inspection
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-mono">
                Log ID: {selectedLog.id} &bull; Action: {selectedLog.action}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2 text-xs">
              {/* Event Attributes */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 border text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Actor:</span>
                  <span className="font-medium text-foreground">
                    {selectedLog.user ? `${selectedLog.user.name} (${selectedLog.user.email})` : 'System'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Tenant:</span>
                  <span className="font-medium text-foreground">
                    {selectedLog.tenant ? `${selectedLog.tenant.name} (/${selectedLog.tenant.slug})` : 'Global Platform'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">IP Address:</span>
                  <span className="font-mono text-foreground">{selectedLog.ipAddress || 'Not recorded'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Recorded At:</span>
                  <span className="font-mono text-foreground">
                    {new Date(selectedLog.createdAt).toISOString()}
                  </span>
                </div>
              </div>

              {/* newValues */}
              {selectedLog.newValues && (
                <div className="space-y-1.5">
                  <span className="font-bold text-foreground block">New Values / Event Data:</span>
                  <pre className="p-3 rounded-lg bg-muted/70 border font-mono text-[11px] overflow-x-auto text-foreground/90 max-h-[220px]">
                    {JSON.stringify(selectedLog.newValues, null, 2)}
                  </pre>
                </div>
              )}

              {/* oldValues */}
              {selectedLog.oldValues && (
                <div className="space-y-1.5">
                  <span className="font-bold text-foreground block">Previous / Termination Values:</span>
                  <pre className="p-3 rounded-lg bg-muted/70 border font-mono text-[11px] overflow-x-auto text-foreground/90 max-h-[220px]">
                    {JSON.stringify(selectedLog.oldValues, null, 2)}
                  </pre>
                </div>
              )}

              {!selectedLog.newValues && !selectedLog.oldValues && (
                <p className="text-muted-foreground text-center py-4 italic">
                  No additional JSON payload stored for this audit event.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
