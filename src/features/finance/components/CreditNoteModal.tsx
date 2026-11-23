'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import { CreditNoteReason, AccountType } from '@prisma/client';
import { formatMoney } from '@/lib/currency';
import {
  generateCreditNoteAction,
  getRefundSourceAccountsAction,
} from '@/actions/credit-note.actions';
import { toast } from 'sonner';
import {
  RotateCcw,
  AlertTriangle,
  FileText,
  Building,
  Landmark,
  Wallet,
  CheckCircle2,
  Receipt,
  Scale,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface CreditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any | null;
  onSuccess?: () => void;
}

const REASON_LABELS: Record<CreditNoteReason, string> = {
  CLIENT_DISCOUNT_ADJUSTMENT: 'Client Goodwill / Post-Invoice Discount',
  EVENT_CANCELLED: 'Event Cancelled / Client Abandonment',
  POST_PRODUCTION_DEFICIENCY: 'Post-Production Deficiency / Quality Adjustment',
  OVERBILLING_CORRECTION: 'Overbilling / Scope Correction',
  OTHER: 'Other Commercial Adjustment',
};

export function CreditNoteModal({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}: CreditNoteModalProps) {
  const [reason, setReason] = useState<CreditNoteReason>(
    CreditNoteReason.CLIENT_DISCOUNT_ADJUSTMENT
  );
  const [notes, setNotes] = useState('');
  const [isItemized, setIsItemized] = useState(false);
  const [itemSelections, setItemSelections] = useState<
    Record<string, { selected: boolean; quantity: number }>
  >({});

  // Refund State
  const [isRefundEnabled, setIsRefundEnabled] = useState(false);
  const [refundAmount, setRefundAmount] = useState<string>('0');
  const [refundMethod, setRefundMethod] = useState<'BANK' | 'CASH' | 'UPI'>('BANK');
  const [sourceAccountId, setSourceAccountId] = useState<string>('');
  const [refundRef, setRefundRef] = useState<string>('');
  const [sourceAccounts, setSourceAccounts] = useState<
    Array<{ id: string; name: string; code: string | null; type: AccountType }>
  >([]);

  const [isSubmitting, startSubmitTransition] = useTransition();

  // Initialize line items and fetch accounts
  useEffect(() => {
    if (invoice?.items && Array.isArray(invoice.items)) {
      const initialMap: Record<string, { selected: boolean; quantity: number }> = {};
      invoice.items.forEach((item: any) => {
        initialMap[item.id] = {
          selected: true,
          quantity: item.quantity || 1,
        };
      });
      setItemSelections(initialMap);

      // Default refund amount to whatever customer already paid
      const paid = Number(invoice.paidAmount || 0);
      setRefundAmount(paid > 0 ? String(paid) : '0');
      setIsRefundEnabled(paid > 0);
    }
  }, [invoice]);

  useEffect(() => {
    if (isOpen) {
      getRefundSourceAccountsAction().then((res) => {
        if (res.success && res.data) {
          setSourceAccounts(res.data);
          const defaultBank =
            res.data.find(
              (a) => a.code === '1030' || a.name.toLowerCase().includes('bank')
            ) || res.data[0];
          if (defaultBank) {
            setSourceAccountId(defaultBank.id);
          }
        }
      });
    }
  }, [isOpen]);

  // Handle item quantity change
  const handleQuantityChange = (itemId: string, newQty: number, maxQty: number) => {
    const validQty = Math.max(1, Math.min(newQty, maxQty));
    setItemSelections((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], quantity: validQty },
    }));
  };

  const handleToggleItem = (itemId: string) => {
    setItemSelections((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], selected: !prev[itemId]?.selected },
    }));
  };

  // Compute live reversal totals
  const reversalSummary = useMemo(() => {
    if (!invoice?.items) {
      return { subtotal: 0, cgst: 0, sgst: 0, igst: 0, grandTotal: 0, itemsToReverse: [] };
    }

    let subtotal = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    const itemsToReverse: any[] = [];

    const isInterState = Boolean(invoice.isInterState);

    invoice.items.forEach((item: any) => {
      const selection = itemSelections[item.id];
      if (!isItemized || selection?.selected) {
        const qty = isItemized ? selection?.quantity || 1 : item.quantity || 1;
        const unitPrice = Number(item.unitPrice || 0);
        const lineSubtotal = qty * unitPrice;
        const gstRate = Number(item.gstRate || 0);

        let lineCgst = 0;
        let lineSgst = 0;
        let lineIgst = 0;

        if (gstRate > 0) {
          const taxFactor = gstRate / 100;
          if (isInterState) {
            lineIgst = lineSubtotal * taxFactor;
          } else {
            lineCgst = (lineSubtotal * taxFactor) / 2;
            lineSgst = (lineSubtotal * taxFactor) / 2;
          }
        }

        subtotal += lineSubtotal;
        cgst += lineCgst;
        sgst += lineSgst;
        igst += lineIgst;

        itemsToReverse.push({
          invoiceItemId: item.id,
          name: item.name,
          sacCode: item.sacCode || '998382',
          quantity: qty,
          unitPrice,
          gstRate,
        });
      }
    });

    const grandTotal = Number((subtotal + cgst + sgst + igst).toFixed(2));
    return {
      subtotal: Number(subtotal.toFixed(2)),
      cgst: Number(cgst.toFixed(2)),
      sgst: Number(sgst.toFixed(2)),
      igst: Number(igst.toFixed(2)),
      grandTotal,
      itemsToReverse,
    };
  }, [invoice, itemSelections, isItemized]);

  const invoicePaidAmount = Number(invoice?.paidAmount || 0);
  const refundAmountNum = Number(refundAmount || 0);

  const handleSubmit = () => {
    if (!invoice) return;

    if (reversalSummary.grandTotal <= 0) {
      toast.error('Reversal total must be greater than zero.');
      return;
    }

    if (isRefundEnabled) {
      if (refundAmountNum <= 0) {
        toast.error('Please specify a valid refund amount.');
        return;
      }
      if (refundAmountNum > invoicePaidAmount) {
        toast.error(
          `Refund amount (₹${refundAmountNum}) cannot exceed total paid on this invoice (₹${invoicePaidAmount}).`
        );
        return;
      }
      if (!sourceAccountId) {
        toast.error('Please select a source bank or cash account for the refund.');
        return;
      }
    }

    startSubmitTransition(async () => {
      try {
        const res = await generateCreditNoteAction({
          invoiceId: invoice.id,
          reason,
          notes: notes.trim() || undefined,
          refundAmount: isRefundEnabled ? refundAmountNum : 0,
          sourceAccountId: isRefundEnabled ? sourceAccountId : undefined,
          refundPaymentMethod: refundMethod,
          refundReference: refundRef.trim() || undefined,
          itemsToReverse: isItemized ? reversalSummary.itemsToReverse : undefined,
        });

        if (res.success) {
          toast.success(res.message || 'Credit note generated successfully.');
          onSuccess?.();
          onClose();
        } else {
          toast.error(res.error || 'Failed to generate credit note.');
        }
      } catch (err: any) {
        toast.error(err.message || 'Error occurred while processing credit note.');
      }
    });
  };

  if (!invoice) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <RotateCcw className="w-5 h-5" />
            <DialogTitle className="text-xl font-bold tracking-tight">
              Issue Statutory Credit Note & Reversal
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Generate an official GST Credit Note against Tax Invoice{' '}
            <strong className="font-mono text-foreground">{invoice.invoiceNumber}</strong>.
            This action creates an immutable double-entry Journal Voucher reversing Output GST and Photography Revenue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Invoice Summary Banner */}
          <div className="bg-muted/40 p-3.5 rounded-lg border flex flex-wrap items-center justify-between gap-4 text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px]">Original Invoice Total</span>
              <span className="font-mono font-bold text-sm text-foreground">
                {formatMoney(Number(invoice.grandTotal))}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Paid by Client</span>
              <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                {formatMoney(invoicePaidAmount)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Current Balance Due</span>
              <span className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400">
                {formatMoney(Number(invoice.balanceDue))}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Place of Supply</span>
              <span className="font-medium text-foreground">
                {invoice.placeOfSupply || '27-Maharashtra'} ({invoice.isInterState ? 'IGST' : 'CGST+SGST'})
              </span>
            </div>
          </div>

          {/* Reason Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="creditNoteReason" className="text-xs font-semibold">
              Statutory Reversal Reason <span className="text-destructive">*</span>
            </Label>
            <Select
              value={reason}
              onValueChange={(val) => {
                if (val) setReason(val as CreditNoteReason);
              }}
            >
              <SelectTrigger id="creditNoteReason" className="text-xs h-9">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REASON_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key} className="text-xs">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes / Reason explanation */}
          <div className="space-y-1.5">
            <Label htmlFor="creditNoteNotes" className="text-xs font-semibold">
              Auditor Narration / Commercial Justification
            </Label>
            <Textarea
              id="creditNoteNotes"
              placeholder="Provide context for the audit trail (e.g., Client requested cancellation due to venue scheduling conflict)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          {/* Reversal Mode Toggle */}
          <div className="flex items-center justify-between border-t border-b py-3 px-1">
            <div className="space-y-0.5">
              <Label className="text-xs font-semibold">Itemized Partial Reversal</Label>
              <p className="text-[11px] text-muted-foreground">
                Toggle to adjust specific line items or quantities. If off, 100% of the invoice will be reversed.
              </p>
            </div>
            <Switch checked={isItemized} onCheckedChange={setIsItemized} />
          </div>

          {/* Itemized Table (if toggled) */}
          {isItemized && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Select Line Items to Reverse</span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  {reversalSummary.itemsToReverse.length} of {invoice.items?.length || 0} selected
                </span>
              </Label>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="w-10 text-center text-xs">Incl</TableHead>
                      <TableHead className="text-xs">Item Description</TableHead>
                      <TableHead className="w-24 text-center text-xs">Qty</TableHead>
                      <TableHead className="text-right text-xs">Unit Rate</TableHead>
                      <TableHead className="text-right text-xs">Reversed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.items?.map((item: any) => {
                      const sel = itemSelections[item.id] || {
                        selected: true,
                        quantity: item.quantity,
                      };
                      return (
                        <TableRow key={item.id} className="hover:bg-muted/30">
                          <TableCell className="text-center">
                            <input
                              type="checkbox"
                              checked={sel.selected}
                              onChange={() => handleToggleItem(item.id)}
                              className="rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                            />
                          </TableCell>
                          <TableCell className="text-xs font-medium">
                            <div>{item.name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              SAC: {item.sacCode || '998382'} | Tax: {item.gstRate}%
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min={1}
                              max={item.quantity}
                              value={sel.quantity}
                              onChange={(e) =>
                                handleQuantityChange(
                                  item.id,
                                  parseInt(e.target.value) || 1,
                                  item.quantity
                                )
                              }
                              disabled={!sel.selected}
                              className="h-7 w-16 text-center text-xs font-mono mx-auto"
                            />
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono text-muted-foreground">
                            {formatMoney(Number(item.unitPrice))}
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono font-semibold text-rose-600 dark:text-rose-400">
                            {sel.selected
                              ? formatMoney(sel.quantity * Number(item.unitPrice))
                              : '₹0.00'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Statutory Financial Reversal Breakdown */}
          <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5 uppercase tracking-wider">
                <Scale className="w-4 h-4 text-rose-600" />
                Statutory Double-Entry Ledger Impact
              </span>
              <Badge variant="outline" className="border-rose-300 text-rose-700 dark:text-rose-300 text-[10px]">
                Sec 34 GST Compliant
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1 border-t border-rose-200 dark:border-rose-900/40">
              <div>
                <span className="text-muted-foreground block text-[11px]">Revenue Reversal (4010)</span>
                <span className="font-mono font-semibold text-rose-700 dark:text-rose-300">
                  - {formatMoney(reversalSummary.subtotal)}
                </span>
              </div>
              {invoice.isInterState ? (
                <div>
                  <span className="text-muted-foreground block text-[11px]">Output IGST (2060)</span>
                  <span className="font-mono font-semibold text-rose-700 dark:text-rose-300">
                    - {formatMoney(reversalSummary.igst)}
                  </span>
                </div>
              ) : (
                <>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Output CGST (2040)</span>
                    <span className="font-mono font-semibold text-rose-700 dark:text-rose-300">
                      - {formatMoney(reversalSummary.cgst)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Output SGST (2050)</span>
                    <span className="font-mono font-semibold text-rose-700 dark:text-rose-300">
                      - {formatMoney(reversalSummary.sgst)}
                    </span>
                  </div>
                </>
              )}
              <div>
                <span className="text-muted-foreground block text-[11px]">Total Credit Note (1100)</span>
                <span className="font-mono font-bold text-sm text-rose-800 dark:text-rose-200">
                  {formatMoney(reversalSummary.grandTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Refund to Client Section */}
          <div className="border rounded-xl p-4 space-y-4 bg-card">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-primary" />
                  Disburse Outflow Cash / Bank Refund to Client
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  If the client previously made advance payments or paid this invoice, log an actual bank or cash outflow.
                </p>
              </div>
              <Switch
                checked={isRefundEnabled}
                onCheckedChange={setIsRefundEnabled}
                disabled={invoicePaidAmount <= 0}
              />
            </div>

            {isRefundEnabled && (
              <div className="pt-3 border-t space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="refundAmount" className="text-xs font-semibold">
                      Refund Amount (₹) <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="refundAmount"
                        type="number"
                        min="0"
                        max={invoicePaidAmount}
                        step="0.01"
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        className="text-xs font-mono h-9"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Max refundable: {formatMoney(invoicePaidAmount)} (Total client paid)
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="refundSourceAccount" className="text-xs font-semibold">
                      Paying Source Ledger Account <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={sourceAccountId}
                      onValueChange={(val) => {
                        if (val) setSourceAccountId(val);
                      }}
                    >
                      <SelectTrigger id="refundSourceAccount" className="text-xs h-9">
                        <SelectValue placeholder="Select paying bank/cash account" />
                      </SelectTrigger>
                      <SelectContent>
                        {sourceAccounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id} className="text-xs">
                            {acc.code ? `[${acc.code}] ` : ''}{acc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Disbursement Mode</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={refundMethod === 'BANK' ? 'default' : 'outline'}
                        onClick={() => setRefundMethod('BANK')}
                        className="text-xs flex-1 h-8"
                      >
                        <Landmark className="w-3.5 h-3.5 mr-1" />
                        Bank Transfer
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={refundMethod === 'UPI' ? 'default' : 'outline'}
                        onClick={() => setRefundMethod('UPI')}
                        className="text-xs flex-1 h-8"
                      >
                        <Wallet className="w-3.5 h-3.5 mr-1" />
                        UPI
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={refundMethod === 'CASH' ? 'default' : 'outline'}
                        onClick={() => setRefundMethod('CASH')}
                        className="text-xs flex-1 h-8"
                      >
                        <Receipt className="w-3.5 h-3.5 mr-1" />
                        Cash
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="refundRef" className="text-xs font-semibold">
                      Payment Reference / UTR / Cash Voucher #
                    </Label>
                    <Input
                      id="refundRef"
                      placeholder="e.g., UTR-98234123 / Cash Voucher #12"
                      value={refundRef}
                      onChange={(e) => setRefundRef(e.target.value)}
                      className="text-xs font-mono h-9"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="text-xs">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || reversalSummary.grandTotal <= 0}
            className="text-xs bg-rose-600 hover:bg-rose-700 text-white gap-1.5 font-semibold"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                Posting Statutory Reversal...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4 mr-1" />
                Issue Credit Note ({formatMoney(reversalSummary.grandTotal)})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
