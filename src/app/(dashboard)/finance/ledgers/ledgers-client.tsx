'use client';

import * as React from 'react';
import { useState, useMemo, useTransition } from 'react';
import { toast } from 'sonner';
import {
  BookOpen,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Scale,
  Landmark,
  Wallet,
  Receipt,
  FileText,
  Trash2,
  Edit2,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
  PieChart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  createAccountAction,
  updateAccountAction,
  deleteAccountAction,
  initializeDefaultAccountsAction,
  getChartOfAccountsAction,
} from '@/actions/accounting.actions';
import { AccountType } from '@prisma/client';

interface LedgersClientProps {
  initialData: {
    all: any[];
    grouped: Record<string, any[]>;
    summary: {
      totalAccounts: number;
      totalAssets: number;
      totalLiabilities: number;
      totalEquity: number;
      totalRevenue: number;
      totalExpenses: number;
    };
  };
}

const TYPE_CONFIG: Record<
  AccountType,
  {
    label: string;
    description: string;
    color: string;
    bg: string;
    border: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  [AccountType.ASSET]: {
    label: 'Assets',
    description: 'Bank accounts, cash vault, gear assets & accounts receivable',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    icon: Landmark,
  },
  [AccountType.LIABILITY]: {
    label: 'Liabilities',
    description: 'Vendor payables, crew dues, booking advances & GST payable',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    icon: Scale,
  },
  [AccountType.EQUITY]: {
    label: 'Equity',
    description: "Owner's capital investment, drawings & retained earnings",
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
    icon: Wallet,
  },
  [AccountType.REVENUE]: {
    label: 'Revenue / Income',
    description: 'Photography packages, cinematography, photobooks & print income',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    icon: TrendingUp,
  },
  [AccountType.EXPENSE]: {
    label: 'Expenses',
    description: 'Shooter fees, editing charges, lab prints, travel & studio rent',
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    icon: TrendingDown,
  },
};

export function LedgersClient({ initialData }: LedgersClientProps) {
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  // New Ledger Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<AccountType>(AccountType.EXPENSE);
  const [newCode, setNewCode] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Edit Ledger Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [targetAccount, setTargetAccount] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Format currency
  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Filter accounts
  const filteredAccounts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let list = data.all || [];

    if (activeTab !== 'ALL') {
      list = list.filter((a) => a.type === activeTab);
    }

    if (!q) return list;

    return list.filter(
      (a) =>
        a.name?.toLowerCase().includes(q) ||
        a.code?.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.type?.toLowerCase().includes(q)
    );
  }, [data.all, activeTab, searchQuery]);

  // Handle Initialize Defaults
  const handleInitializeDefaults = () => {
    startTransition(async () => {
      try {
        const res = await initializeDefaultAccountsAction();
        if (res.success) {
          toast.success(res.message || 'Default accounts verified!');
          const refreshed = await getChartOfAccountsAction();
          if (refreshed.success && refreshed.data) {
            setData(refreshed.data);
          }
        } else {
          toast.error(res.error || 'Failed to initialize accounts');
        }
      } catch (err: any) {
        toast.error(err.message || 'An error occurred');
      }
    });
  };

  // Handle Create Account
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error('Ledger name is required');
      return;
    }

    setIsCreating(true);
    try {
      const res = await createAccountAction({
        name: newName.trim(),
        type: newType,
        code: newCode.trim() || undefined,
        description: newDescription.trim() || undefined,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || 'Failed to create ledger');
        return;
      }

      toast.success(`Ledger "${newName}" created successfully!`);
      setCreateModalOpen(false);

      // Reset form
      setNewName('');
      setNewCode('');
      setNewDescription('');

      // Refresh data
      const refreshed = await getChartOfAccountsAction();
      if (refreshed.success && refreshed.data) {
        setData(refreshed.data);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error creating ledger');
    } finally {
      setIsCreating(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (account: any) => {
    setTargetAccount(account);
    setEditName(account.name);
    setEditCode(account.code || '');
    setEditDescription(account.description || '');
    setEditModalOpen(true);
  };

  // Handle Update Account
  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAccount) return;

    setIsUpdating(true);
    try {
      const res = await updateAccountAction({
        accountId: targetAccount.id,
        name: editName.trim(),
        code: editCode.trim() || undefined,
        description: editDescription.trim() || undefined,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || 'Failed to update ledger');
        return;
      }

      toast.success(`Ledger "${editName}" updated successfully!`);
      setEditModalOpen(false);

      // Refresh data
      const refreshed = await getChartOfAccountsAction();
      if (refreshed.success && refreshed.data) {
        setData(refreshed.data);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating ledger');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Delete Account
  const handleDeleteAccount = async (account: any) => {
    if (account.isDefault) {
      toast.error('System default ledgers cannot be deleted');
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to delete custom ledger "${account.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const res = await deleteAccountAction(account.id);
      if (!res.success) {
        toast.error(res.error || 'Failed to delete ledger');
        return;
      }

      toast.success(`Ledger "${account.name}" deleted.`);
      // Refresh data
      const refreshed = await getChartOfAccountsAction();
      if (refreshed.success && refreshed.data) {
        setData(refreshed.data);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error deleting ledger');
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold tracking-tight">Chart of Accounts (Ledgers)</h2>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              Double-Entry Core
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            General ledger master accounts for double-entry financial accounting, client receipts, vendor payouts, and expense tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleInitializeDefaults}
            disabled={isPending}
            className="border-border text-xs"
          >
            {isPending ? (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" />
            )}
            Verify Default Ledgers
          </Button>

          <Button size="sm" onClick={() => setCreateModalOpen(true)} className="text-xs">
            <Plus className="h-4 w-4 mr-1.5" />
            New Ledger Account
          </Button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase flex items-center justify-between">
              <span>Total Assets</span>
              <Landmark className="h-3.5 w-3.5" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div className="text-xl font-bold text-foreground">{formatINR(data.summary.totalAssets)}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {data.grouped[AccountType.ASSET]?.length || 0} Accounts
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase flex items-center justify-between">
              <span>Total Liabilities</span>
              <Scale className="h-3.5 w-3.5" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div className="text-xl font-bold text-foreground">{formatINR(data.summary.totalLiabilities)}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {data.grouped[AccountType.LIABILITY]?.length || 0} Accounts
            </p>
          </CardContent>
        </Card>

        <Card className="border-indigo-500/20 bg-indigo-500/5">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase flex items-center justify-between">
              <span>Owner Equity</span>
              <Wallet className="h-3.5 w-3.5" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div className="text-xl font-bold text-foreground">{formatINR(data.summary.totalEquity)}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {data.grouped[AccountType.EQUITY]?.length || 0} Accounts
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase flex items-center justify-between">
              <span>Total Revenue</span>
              <TrendingUp className="h-3.5 w-3.5" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div className="text-xl font-bold text-foreground">{formatINR(data.summary.totalRevenue)}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {data.grouped[AccountType.REVENUE]?.length || 0} Accounts
            </p>
          </CardContent>
        </Card>

        <Card className="border-rose-500/20 bg-rose-500/5">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase flex items-center justify-between">
              <span>Total Expenses</span>
              <TrendingDown className="h-3.5 w-3.5" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div className="text-xl font-bold text-foreground">{formatINR(data.summary.totalExpenses)}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {data.grouped[AccountType.EXPENSE]?.length || 0} Accounts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar & Tab Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search ledger by name, code, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="text-xs text-muted-foreground">
            Showing {filteredAccounts.length} of {data.summary.totalAccounts} master ledgers
          </div>
        </div>

        {/* Category Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full">
            <TabsTrigger value="ALL" className="text-xs">
              All Ledgers ({data.summary.totalAccounts})
            </TabsTrigger>
            {Object.values(AccountType).map((type) => {
              const count = data.grouped[type]?.length || 0;
              return (
                <TabsTrigger key={type} value={type} className="text-xs">
                  {TYPE_CONFIG[type].label.split(' ')[0]} ({count})
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      {/* Ledgers Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Code</TableHead>
              <TableHead>Ledger Account Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Total Debit</TableHead>
              <TableHead className="text-right">Total Credit</TableHead>
              <TableHead className="text-right">Net Balance</TableHead>
              <TableHead className="w-28 text-center">Classification</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAccounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  No ledger accounts found matching your search or filter.
                </TableCell>
              </TableRow>
            ) : (
              filteredAccounts.map((account) => {
                const typeCfg = TYPE_CONFIG[account.type as AccountType] || TYPE_CONFIG[AccountType.ASSET];

                return (
                  <TableRow key={account.id} className="hover:bg-muted/30">
                    <TableCell>
                      {account.code ? (
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded-sm border font-semibold">
                          {account.code}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                        <span>{account.name}</span>
                        {account.isDefault && (
                          <span title="System Core Ledger">
                            <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                          </span>
                        )}
                      </div>
                      {account.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-md">{account.description}</p>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${typeCfg.bg} ${typeCfg.color} ${typeCfg.border}`}>
                        {typeCfg.label}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {formatINR(account.totalDebit)}
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {formatINR(account.totalCredit)}
                    </TableCell>

                    <TableCell className="text-right font-mono text-sm font-bold text-foreground">
                      {formatINR(account.netBalance)}
                    </TableCell>

                    <TableCell className="text-center">
                      {account.isDefault ? (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                          Default System
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                          Custom
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditModal(account)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Edit Account Details"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>

                        {!account.isDefault && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteAccount(account)}
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Delete Custom Ledger"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* MODAL 1: CREATE NEW LEDGER */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateAccount}>
            <DialogHeader>
              <DialogTitle>Create New Ledger Account</DialogTitle>
              <DialogDescription>
                Add a new general ledger account to your studio Chart of Accounts.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="acc-name">Account Name *</Label>
                <Input
                  id="acc-name"
                  placeholder="e.g. Drone Pilot Retainers, Canon CPS Membership"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="acc-type">Account Type *</Label>
                  <Select
                    value={newType}
                    onValueChange={(val) => {
                      if (val) setNewType(val as AccountType);
                    }}
                  >
                    <SelectTrigger id="acc-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(AccountType).map((t) => (
                        <SelectItem key={t} value={t}>
                          {TYPE_CONFIG[t].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="acc-code">Account Code (Optional)</Label>
                  <Input
                    id="acc-code"
                    placeholder="e.g. 5060"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="acc-desc">Description / Accounting Purpose</Label>
                <Textarea
                  id="acc-desc"
                  rows={3}
                  placeholder="e.g. Tracks freelance aerial cinematography retainers for large destination weddings."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateModalOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Ledger'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: EDIT LEDGER */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleUpdateAccount}>
            <DialogHeader>
              <DialogTitle>Edit Ledger Account</DialogTitle>
              <DialogDescription>
                Modify code, name or description for &quot;{targetAccount?.name}&quot; ({targetAccount?.type}).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name">Account Name *</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-code">Account Code</Label>
                <Input
                  id="edit-code"
                  placeholder="e.g. 1010"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-desc">Description</Label>
                <Textarea
                  id="edit-desc"
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditModalOpen(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
