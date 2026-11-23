'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X, Building2, Calendar, User, Phone, CheckCircle2, Clock } from 'lucide-react';
import { formatMoney } from '@/lib/currency';

interface SalarySlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  payroll: any;
  tenant: {
    name: string;
    tradeName?: string | null;
    logoUrl?: string | null;
    contactPhone?: string | null;
    gstNumber?: string | null;
  };
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function SalarySlipModal({
  isOpen,
  onClose,
  payroll,
  tenant,
}: SalarySlipModalProps) {
  if (!payroll) return null;

  const monthLabel = MONTH_NAMES[(payroll.month || 1) - 1] || `Month ${payroll.month}`;
  const studioName = tenant.tradeName || tenant.name || 'Pratima Studio';

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-background border shadow-2xl print:border-none print:shadow-none print:max-w-none print:w-full print:m-0">
        {/* Modal Action Bar (Hidden on print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-muted/40 border-b print:hidden">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground text-sm">
              Salary Payslip &bull; {monthLabel} {payroll.year}
            </h3>
            {payroll.status === 'PAID' ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Paid
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3" /> Draft
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-2 bg-background hover:bg-accent"
            >
              <Printer className="w-4 h-4 text-primary" />
              <span>Print / Save PDF</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 md:p-8 space-y-6 text-foreground bg-card print:p-0 print:bg-white print:text-black">
          {/* Header */}
          <div className="border-b pb-6 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                {tenant.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tenant.logoUrl}
                    alt={studioName}
                    className="h-10 w-auto object-contain"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-foreground print:text-black">
                    {studioName}
                  </h1>
                  <p className="text-xs text-muted-foreground print:text-gray-600">
                    Official Salary Certificate & Payslip
                  </p>
                </div>
              </div>
              {tenant.gstNumber && (
                <p className="text-xs text-muted-foreground mt-1 print:text-gray-500">
                  GSTIN: <span className="font-mono">{tenant.gstNumber}</span>
                </p>
              )}
            </div>

            <div className="text-right">
              <span className="inline-block bg-primary/5 text-primary print:text-black print:bg-gray-100 font-bold text-xs uppercase tracking-wider px-3 py-1 rounded">
                Payslip for {monthLabel} {payroll.year}
              </span>
              <p className="text-xs text-muted-foreground mt-1 print:text-gray-500">
                Generated: {new Date(payroll.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Employee & Attendance Overview Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-muted/30 border text-xs print:bg-gray-50 print:border-gray-300">
            <div>
              <span className="text-muted-foreground print:text-gray-500 block">Employee Name</span>
              <span className="font-semibold text-sm text-foreground print:text-black">{payroll.staffName}</span>
            </div>
            <div>
              <span className="text-muted-foreground print:text-gray-500 block">Employee Code</span>
              <span className="font-mono font-medium">{payroll.employeeCode}</span>
            </div>
            <div>
              <span className="text-muted-foreground print:text-gray-500 block">Designation</span>
              <span className="font-medium">{payroll.designation}</span>
            </div>
            <div>
              <span className="text-muted-foreground print:text-gray-500 block">Department</span>
              <span className="font-medium">{payroll.department}</span>
            </div>
          </div>

          {/* Monthly Attendance Summary Metrics */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 print:text-gray-600">
              Attendance Record ({monthLabel})
            </h4>
            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-lg border bg-card print:border-gray-300">
                <span className="text-muted-foreground block text-[10px]">Total Days</span>
                <span className="text-base font-bold text-foreground print:text-black">
                  {payroll.totalWorkingDays}
                </span>
              </div>
              <div className="p-2.5 rounded-lg border bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 print:text-emerald-800 print:border-emerald-200">
                <span className="block text-[10px]">Present</span>
                <span className="text-base font-bold">{payroll.presentDays}</span>
              </div>
              <div className="p-2.5 rounded-lg border bg-blue-500/5 text-blue-700 dark:text-blue-400 print:text-blue-800 print:border-blue-200">
                <span className="block text-[10px]">Paid Leave</span>
                <span className="text-base font-bold">{payroll.leaveDays}</span>
              </div>
              <div className="p-2.5 rounded-lg border bg-amber-500/5 text-amber-700 dark:text-amber-400 print:text-amber-800 print:border-amber-200">
                <span className="block text-[10px]">Half Days</span>
                <span className="text-base font-bold">{payroll.halfDays}</span>
              </div>
              <div className="p-2.5 rounded-lg border bg-rose-500/5 text-rose-700 dark:text-rose-400 print:text-rose-800 print:border-rose-200">
                <span className="block text-[10px]">Absent Days</span>
                <span className="text-base font-bold">{payroll.absentDays}</span>
              </div>
            </div>
          </div>

          {/* Earnings vs Deductions Table */}
          <div className="border rounded-xl overflow-hidden print:border-gray-300">
            <div className="grid grid-cols-2 divide-x bg-muted/40 font-semibold text-xs border-b print:bg-gray-100 print:border-gray-300">
              <div className="p-3">Earnings & Allowances</div>
              <div className="p-3">Deductions</div>
            </div>

            <div className="grid grid-cols-2 divide-x text-xs">
              {/* Earnings column */}
              <div className="p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground print:text-gray-600">Base Monthly Salary</span>
                  <span className="font-semibold">{formatMoney(payroll.baseSalary)}</span>
                </div>
                {Number(payroll.bonus || 0) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Performance Bonus</span>
                    <span className="font-semibold">+{formatMoney(payroll.bonus)}</span>
                  </div>
                )}
                <div className="pt-3 border-t flex justify-between font-bold text-foreground print:text-black">
                  <span>Gross Earnings</span>
                  <span>{formatMoney(Number(payroll.baseSalary) + Number(payroll.bonus || 0))}</span>
                </div>
              </div>

              {/* Deductions column */}
              <div className="p-4 space-y-3">
                <div className="flex justify-between text-rose-600">
                  <span>Attendance Deductions ({payroll.absentDays}A + {payroll.halfDays}HD)</span>
                  <span className="font-semibold">-{formatMoney(payroll.deductions)}</span>
                </div>
                <div className="pt-3 border-t flex justify-between font-bold text-foreground print:text-black">
                  <span>Total Deductions</span>
                  <span className="text-rose-600">-{formatMoney(payroll.deductions)}</span>
                </div>
              </div>
            </div>

            {/* Net Pay Highlight Bar */}
            <div className="p-4 bg-primary/5 border-t flex items-center justify-between font-bold print:bg-gray-100 print:border-gray-300">
              <div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground block print:text-gray-600">
                  Net Salary Disbursed / Payable
                </span>
                <span className="text-xl text-primary font-black print:text-black">
                  {formatMoney(payroll.netPay)}
                </span>
              </div>
              <div className="text-right text-xs">
                {payroll.status === 'PAID' ? (
                  <div>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold block">
                      Disbursed via {payroll.paymentMode || 'Direct Transfer'}
                    </span>
                    {payroll.transactionRef && (
                      <span className="text-muted-foreground font-mono text-[11px] block print:text-gray-500">
                        Ref: {payroll.transactionRef}
                      </span>
                    )}
                    {payroll.paidAt && (
                      <span className="text-muted-foreground text-[10px] print:text-gray-500">
                        Date: {new Date(payroll.paidAt).toLocaleDateString('en-IN')}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-amber-600 dark:text-amber-400 font-bold">
                    Payment Pending Approval
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payment Notes if any */}
          {payroll.paymentNotes && (
            <div className="p-3 rounded-lg bg-muted/20 border text-xs text-muted-foreground print:border-gray-200">
              <span className="font-semibold text-foreground print:text-black">Notes: </span>
              {payroll.paymentNotes}
            </div>
          )}

          {/* Signatures Footer */}
          <div className="pt-10 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <div className="border-t border-dashed w-48 mx-auto mb-2 print:border-gray-400" />
              <span className="text-muted-foreground print:text-gray-600">Employee Signature</span>
            </div>
            <div>
              <div className="border-t border-dashed w-48 mx-auto mb-2 print:border-gray-400" />
              <span className="text-muted-foreground print:text-gray-600">Authorized Signatory / HR</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
