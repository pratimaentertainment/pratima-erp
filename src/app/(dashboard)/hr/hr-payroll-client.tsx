'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  UserCheck,
  UserX,
  FileText,
  AlertCircle,
  Plus,
  CheckCircle2,
  XCircle,
  CreditCard,
  Building2,
  Search,
  Filter,
  RefreshCw,
  Printer,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Wallet,
  IndianRupee,
  Layers,
  Edit2,
  Send,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatMoney } from '@/lib/currency';
import { SalarySlipModal } from './salary-slip-modal';
import {
  getDailyAttendance,
  markStaffAttendance,
  getLeaveRequests,
  createLeaveRequest,
  updateLeaveRequestStatus,
  getMonthlyPayroll,
  generateMonthlyPayroll,
  markPayrollPaid,
  updateStaffSalary,
} from '@/actions/hr-payroll.actions';

interface HrPayrollClientProps {
  initialAttendance: any;
  initialLeaves: any[];
  initialPayroll: any;
  tenant: any;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function HrPayrollClient({
  initialAttendance,
  initialLeaves,
  initialPayroll,
  tenant,
}: HrPayrollClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Primary Workspace Tab State
  const [activeTab, setActiveTab] = useState<'attendance' | 'leaves' | 'payroll'>('attendance');

  // ==========================================
  // TAB 1: ATTENDANCE STATE
  // ==========================================
  const [selectedDate, setSelectedDate] = useState<string>(
    initialAttendance?.date || new Date().toISOString().split('T')[0]
  );
  const [attendanceData, setAttendanceData] = useState<any>(initialAttendance);
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [updatingStaffId, setUpdatingStaffId] = useState<string | null>(null);

  // Quick Salary Edit Dialog
  const [salaryDialogOpen, setSalaryDialogOpen] = useState(false);
  const [salaryTargetStaff, setSalaryTargetStaff] = useState<any>(null);
  const [newSalaryInput, setNewSalaryInput] = useState('');

  // ==========================================
  // TAB 2: LEAVE DESK STATE
  // ==========================================
  const [leaveRequests, setLeaveRequests] = useState<any[]>(initialLeaves || []);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [selectedLeaveStaffId, setSelectedLeaveStaffId] = useState('');
  const [leaveType, setLeaveType] = useState<'SICK' | 'CASUAL' | 'ANNUAL' | 'MATERNITY'>('CASUAL');
  const [leaveStartDate, setLeaveStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveEndDate, setLeaveEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);

  // ==========================================
  // TAB 3: PAYROLL STATE
  // ==========================================
  const now = new Date();
  const [payrollMonth, setPayrollMonth] = useState<number>(initialPayroll?.month || now.getMonth() + 1);
  const [payrollYear, setPayrollYear] = useState<number>(initialPayroll?.year || now.getFullYear());
  const [payrollData, setPayrollData] = useState<any>(initialPayroll);
  const [payrollSearch, setPayrollSearch] = useState('');

  // Mark Paid Dialog State
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [targetPayrollRecord, setTargetPayrollRecord] = useState<any>(null);
  const [paymentMode, setPaymentMode] = useState('BANK_TRANSFER');
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Printable Payslip Modal State
  const [slipModalOpen, setSlipModalOpen] = useState(false);
  const [selectedSlipPayroll, setSelectedSlipPayroll] = useState<any>(null);

  // ==========================================
  // HANDLERS: ATTENDANCE
  // ==========================================

  const loadAttendanceForDate = async (newDate: string) => {
    setSelectedDate(newDate);
    startTransition(async () => {
      const res = await getDailyAttendance(newDate);
      if (res.success && res.data) {
        setAttendanceData(res.data);
      } else {
        toast.error(res.error || 'Failed to fetch attendance');
      }
    });
  };

  const handleShiftDate = (days: number) => {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() + 1 * days);
    const dateStr = cur.toISOString().split('T')[0];
    loadAttendanceForDate(dateStr);
  };

  const handleQuickMarkAttendance = async (
    userId: string,
    status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE'
  ) => {
    setUpdatingStaffId(userId);
    try {
      const res = await markStaffAttendance({
        userId,
        date: selectedDate,
        status,
        clockInTime: status === 'PRESENT' || status === 'HALF_DAY' ? '09:30' : null,
      });

      if (res.success) {
        toast.success(res.message);
        // Refresh local daily state
        const ref = await getDailyAttendance(selectedDate);
        if (ref.success && ref.data) {
          setAttendanceData(ref.data);
        }
      } else {
        toast.error(res.error || 'Failed to update attendance');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setUpdatingStaffId(null);
    }
  };

  const handleSaveSalary = async () => {
    if (!salaryTargetStaff) return;
    const salaryVal = Number(newSalaryInput);
    if (isNaN(salaryVal) || salaryVal < 0) {
      toast.error('Please enter a valid salary amount');
      return;
    }

    startTransition(async () => {
      const res = await updateStaffSalary({
        userId: salaryTargetStaff.userId,
        monthlySalary: salaryVal,
      });
      if (res.success) {
        toast.success(res.message);
        setSalaryDialogOpen(false);
        // Reload attendance and payroll
        const attRef = await getDailyAttendance(selectedDate);
        if (attRef.success) setAttendanceData(attRef.data);
      } else {
        toast.error(res.error);
      }
    });
  };

  // ==========================================
  // HANDLERS: LEAVE
  // ==========================================

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeaveStaffId) {
      toast.error('Please select an employee');
      return;
    }

    setLeaveSubmitting(true);
    try {
      const res = await createLeaveRequest({
        userId: selectedLeaveStaffId,
        type: leaveType,
        startDate: leaveStartDate,
        endDate: leaveEndDate,
        reason: leaveReason,
      });

      if (res.success) {
        toast.success(res.message);
        setLeaveModalOpen(false);
        setLeaveReason('');
        const updatedList = await getLeaveRequests();
        if (updatedList.success && updatedList.data) {
          setLeaveRequests(updatedList.data);
        }
      } else {
        toast.error(res.error);
      }
    } finally {
      setLeaveSubmitting(false);
    }
  };

  const handleUpdateLeaveStatus = async (
    leaveId: string,
    status: 'APPROVED' | 'REJECTED'
  ) => {
    startTransition(async () => {
      const res = await updateLeaveRequestStatus({ leaveId, status });
      if (res.success) {
        toast.success(res.message);
        const updatedList = await getLeaveRequests();
        if (updatedList.success && updatedList.data) {
          setLeaveRequests(updatedList.data);
        }
        // Also refresh daily attendance
        const attRef = await getDailyAttendance(selectedDate);
        if (attRef.success) setAttendanceData(attRef.data);
      } else {
        toast.error(res.error);
      }
    });
  };

  // ==========================================
  // HANDLERS: PAYROLL
  // ==========================================

  const loadPayroll = async (m: number, y: number) => {
    setPayrollMonth(m);
    setPayrollYear(y);
    startTransition(async () => {
      const res = await getMonthlyPayroll(m, y);
      if (res.success && res.data) {
        setPayrollData(res.data);
      } else {
        toast.error(res.error || 'Failed to load payroll');
      }
    });
  };

  const handleGeneratePayroll = async () => {
    startTransition(async () => {
      const res = await generateMonthlyPayroll(payrollMonth, payrollYear);
      if (res.success) {
        toast.success(res.message);
        const ref = await getMonthlyPayroll(payrollMonth, payrollYear);
        if (ref.success && ref.data) {
          setPayrollData(ref.data);
        }
      } else {
        toast.error(res.error || 'Failed to generate payroll');
      }
    });
  };

  const handleConfirmPayment = async () => {
    if (!targetPayrollRecord) return;
    startTransition(async () => {
      const res = await markPayrollPaid({
        payrollId: targetPayrollRecord.id,
        paymentMode,
        transactionRef,
        notes: paymentNotes,
      });

      if (res.success) {
        toast.success(res.message);
        setPayModalOpen(false);
        setTransactionRef('');
        setPaymentNotes('');
        const ref = await getMonthlyPayroll(payrollMonth, payrollYear);
        if (ref.success && ref.data) {
          setPayrollData(ref.data);
        }
      } else {
        toast.error(res.error);
      }
    });
  };

  // Filtered rosters
  const filteredRoster = (attendanceData?.roster || []).filter((s: any) =>
    s.name.toLowerCase().includes(attendanceSearch.toLowerCase()) ||
    s.employeeCode.toLowerCase().includes(attendanceSearch.toLowerCase()) ||
    s.designation.toLowerCase().includes(attendanceSearch.toLowerCase())
  );

  const filteredPayroll = (payrollData?.records || []).filter((p: any) =>
    p.staffName.toLowerCase().includes(payrollSearch.toLowerCase()) ||
    p.employeeCode.toLowerCase().includes(payrollSearch.toLowerCase()) ||
    p.designation.toLowerCase().includes(payrollSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            In-House HR & Payroll Engine
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage full-time studio staff daily attendance, leave approvals, and monthly salary disbursement.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border">
          <Button
            variant={activeTab === 'attendance' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('attendance')}
            className="gap-2 text-xs font-semibold rounded-lg"
          >
            <Calendar className="w-4 h-4" />
            Daily Attendance
          </Button>
          <Button
            variant={activeTab === 'leaves' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('leaves')}
            className="gap-2 text-xs font-semibold rounded-lg"
          >
            <Clock className="w-4 h-4" />
            Leave Desk
            {leaveRequests.filter((l) => l.status === 'PENDING').length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px]">
                {leaveRequests.filter((l) => l.status === 'PENDING').length}
              </span>
            )}
          </Button>
          <Button
            variant={activeTab === 'payroll' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('payroll')}
            className="gap-2 text-xs font-semibold rounded-lg"
          >
            <IndianRupee className="w-4 h-4" />
            Monthly Payroll
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DAILY ATTENDANCE REGISTER */}
      {/* ========================================================================= */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Attendance Controls & Date Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border bg-card shadow-2xs">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleShiftDate(-1)}
                disabled={isPending}
                className="h-9 w-9"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => loadAttendanceForDate(e.target.value)}
                className="w-44 font-semibold text-xs h-9"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleShiftDate(1)}
                disabled={isPending}
                className="h-9 w-9"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => loadAttendanceForDate(new Date().toISOString().split('T')[0])}
                className="text-xs text-primary font-medium"
              >
                Today
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Search staff..."
                  value={attendanceSearch}
                  onChange={(e) => setAttendanceSearch(e.target.value)}
                  className="pl-8 text-xs h-9"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadAttendanceForDate(selectedDate)}
                disabled={isPending}
                className="gap-1.5 text-xs h-9"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Daily Attendance KPI Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="border shadow-2xs">
              <CardContent className="p-3 text-center">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                  Total Staff
                </span>
                <span className="text-xl font-bold text-foreground">
                  {attendanceData?.stats?.totalStaff || 0}
                </span>
              </CardContent>
            </Card>

            <Card className="border border-emerald-500/20 bg-emerald-500/5 shadow-2xs">
              <CardContent className="p-3 text-center">
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                  Present
                </span>
                <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                  {attendanceData?.stats?.presentCount || 0}
                </span>
              </CardContent>
            </Card>

            <Card className="border border-amber-500/20 bg-amber-500/5 shadow-2xs">
              <CardContent className="p-3 text-center">
                <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                  Half Day
                </span>
                <span className="text-xl font-bold text-amber-700 dark:text-amber-300">
                  {attendanceData?.stats?.halfDayCount || 0}
                </span>
              </CardContent>
            </Card>

            <Card className="border border-rose-500/20 bg-rose-500/5 shadow-2xs">
              <CardContent className="p-3 text-center">
                <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                  Absent
                </span>
                <span className="text-xl font-bold text-rose-700 dark:text-rose-300">
                  {attendanceData?.stats?.absentCount || 0}
                </span>
              </CardContent>
            </Card>

            <Card className="border border-blue-500/20 bg-blue-500/5 shadow-2xs">
              <CardContent className="p-3 text-center">
                <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                  On Leave
                </span>
                <span className="text-xl font-bold text-blue-700 dark:text-blue-300">
                  {attendanceData?.stats?.leaveCount || 0}
                </span>
              </CardContent>
            </Card>

            <Card className="border border-slate-500/20 bg-muted/30 shadow-2xs">
              <CardContent className="p-3 text-center">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                  Unmarked
                </span>
                <span className="text-xl font-bold text-foreground">
                  {attendanceData?.stats?.unmarkedCount || 0}
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Staff Roster Table */}
          <Card className="border shadow-2xs overflow-hidden">
            <CardHeader className="p-4 border-b bg-muted/20">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span>Daily Attendance Register &bull; {selectedDate}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  Showing {filteredRoster.length} in-house employees
                </span>
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b font-medium">
                  <tr>
                    <th className="p-3.5 pl-4">Staff Member</th>
                    <th className="p-3.5">Designation</th>
                    <th className="p-3.5">Base Salary</th>
                    <th className="p-3.5 text-center">Current Status</th>
                    <th className="p-3.5">Log / Notes</th>
                    <th className="p-3.5 text-right pr-4">Quick Mark Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredRoster.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        No in-house staff found.
                      </td>
                    </tr>
                  ) : (
                    filteredRoster.map((staff: any) => {
                      const isUpdating = updatingStaffId === staff.userId;
                      return (
                        <tr key={staff.userId} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3.5 pl-4">
                            <div className="font-semibold text-foreground">{staff.name}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              {staff.employeeCode}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className="font-medium text-foreground">{staff.designation}</span>
                            <div className="text-[10px] text-muted-foreground">{staff.department}</div>
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-foreground">
                                {staff.monthlySalary > 0
                                  ? formatMoney(staff.monthlySalary)
                                  : 'Not set'}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSalaryTargetStaff(staff);
                                  setNewSalaryInput(staff.monthlySalary?.toString() || '');
                                  setSalaryDialogOpen(true);
                                }}
                                className="h-6 w-6 text-muted-foreground hover:text-primary"
                                title="Set/Edit Base Salary"
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                          <td className="p-3.5 text-center">
                            {staff.status === 'PRESENT' && (
                              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                                ✓ Present
                              </Badge>
                            )}
                            {staff.status === 'HALF_DAY' && (
                              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
                                ½ Half Day
                              </Badge>
                            )}
                            {staff.status === 'ABSENT' && (
                              <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30">
                                ✕ Absent
                              </Badge>
                            )}
                            {staff.status === 'LEAVE' && (
                              <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30">
                                🌴 Leave ({staff.leaveType || 'Approved'})
                              </Badge>
                            )}
                            {staff.status === 'UNMARKED' && (
                              <Badge variant="outline" className="text-muted-foreground">
                                Unmarked
                              </Badge>
                            )}
                          </td>
                          <td className="p-3.5 text-muted-foreground max-w-xs truncate">
                            {staff.notes || (staff.clockIn ? `In: ${new Date(staff.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '-')}
                          </td>
                          <td className="p-3.5 text-right pr-4">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant={staff.status === 'PRESENT' ? 'default' : 'outline'}
                                onClick={() => handleQuickMarkAttendance(staff.userId, 'PRESENT')}
                                disabled={isUpdating}
                                className="h-7 px-2.5 text-[11px] gap-1 bg-emerald-600 hover:bg-emerald-700 text-white border-none"
                              >
                                P
                              </Button>
                              <Button
                                size="sm"
                                variant={staff.status === 'HALF_DAY' ? 'default' : 'outline'}
                                onClick={() => handleQuickMarkAttendance(staff.userId, 'HALF_DAY')}
                                disabled={isUpdating}
                                className="h-7 px-2.5 text-[11px] gap-1 bg-amber-600 hover:bg-amber-700 text-white border-none"
                              >
                                HD
                              </Button>
                              <Button
                                size="sm"
                                variant={staff.status === 'ABSENT' ? 'default' : 'outline'}
                                onClick={() => handleQuickMarkAttendance(staff.userId, 'ABSENT')}
                                disabled={isUpdating}
                                className="h-7 px-2.5 text-[11px] gap-1 bg-rose-600 hover:bg-rose-700 text-white border-none"
                              >
                                A
                              </Button>
                              <Button
                                size="sm"
                                variant={staff.status === 'LEAVE' ? 'default' : 'outline'}
                                onClick={() => handleQuickMarkAttendance(staff.userId, 'LEAVE')}
                                disabled={isUpdating}
                                className="h-7 px-2.5 text-[11px] gap-1 bg-blue-600 hover:bg-blue-700 text-white border-none"
                              >
                                L
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LEAVE DESK */}
      {/* ========================================================================= */}
      {activeTab === 'leaves' && (
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="flex items-center justify-between p-4 rounded-xl border bg-card shadow-2xs">
            <div>
              <h3 className="font-semibold text-foreground text-sm">Staff Leave Requests</h3>
              <p className="text-xs text-muted-foreground">
                Approve or reject leave applications. Approved leaves automatically flag attendance as paid leave.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setLeaveModalOpen(true)}
              className="gap-2 text-xs"
            >
              <Plus className="w-4 h-4" />
              Apply Leave
            </Button>
          </div>

          {/* Leave Requests Table */}
          <Card className="border shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b font-medium">
                  <tr>
                    <th className="p-3.5 pl-4">Staff Member</th>
                    <th className="p-3.5">Leave Type</th>
                    <th className="p-3.5">Duration</th>
                    <th className="p-3.5">Date Range</th>
                    <th className="p-3.5">Reason</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {leaveRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No leave requests submitted yet.
                      </td>
                    </tr>
                  ) : (
                    leaveRequests.map((leave: any) => {
                      const start = new Date(leave.startDate);
                      const end = new Date(leave.endDate);
                      const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;

                      return (
                        <tr key={leave.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3.5 pl-4">
                            <div className="font-semibold text-foreground">{leave.user?.name}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              {leave.user?.employeeCode || `EMP-${leave.userId?.slice(0, 6)}`}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <Badge variant="outline" className="font-medium text-[11px]">
                              {leave.type}
                            </Badge>
                          </td>
                          <td className="p-3.5 font-semibold text-foreground">
                            {diffDays} {diffDays === 1 ? 'Day' : 'Days'}
                          </td>
                          <td className="p-3.5 text-muted-foreground">
                            {start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} &ndash;{' '}
                            {end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="p-3.5 max-w-xs truncate text-muted-foreground">
                            {leave.reason || 'Personal reasons'}
                          </td>
                          <td className="p-3.5 text-center">
                            {leave.status === 'APPROVED' && (
                              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                                ✓ Approved
                              </Badge>
                            )}
                            {leave.status === 'PENDING' && (
                              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
                                Pending
                              </Badge>
                            )}
                            {leave.status === 'REJECTED' && (
                              <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30">
                                Rejected
                              </Badge>
                            )}
                          </td>
                          <td className="p-3.5 text-right pr-4">
                            {leave.status === 'PENDING' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateLeaveStatus(leave.id, 'APPROVED')}
                                  disabled={isPending}
                                  className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleUpdateLeaveStatus(leave.id, 'REJECTED')}
                                  disabled={isPending}
                                  className="h-7 px-2.5 text-xs"
                                >
                                  Reject
                                </Button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">Processed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MONTHLY PAYROLL & SALARY SLIPS */}
      {/* ========================================================================= */}
      {activeTab === 'payroll' && (
        <div className="space-y-6">
          {/* Payroll Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border bg-card shadow-2xs">
            <div className="flex items-center gap-2">
              <select
                value={payrollMonth}
                onChange={(e) => loadPayroll(Number(e.target.value), payrollYear)}
                className="h-9 px-3 text-xs font-semibold rounded-lg border bg-background text-foreground"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={payrollYear}
                onChange={(e) => loadPayroll(payrollMonth, Number(e.target.value))}
                className="h-9 px-3 text-xs font-semibold rounded-lg border bg-background text-foreground"
              >
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              <Button
                variant="default"
                size="sm"
                onClick={handleGeneratePayroll}
                disabled={isPending}
                className="gap-2 text-xs font-semibold h-9"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} />
                Generate / Recalculate Payroll
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Search payroll..."
                  value={payrollSearch}
                  onChange={(e) => setPayrollSearch(e.target.value)}
                  className="pl-8 text-xs h-9"
                />
              </div>
            </div>
          </div>

          {/* Monthly Payroll KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="border shadow-2xs">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    Total Payroll
                  </span>
                  <Wallet className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl font-bold mt-1 text-foreground">
                  {formatMoney(payrollData?.metrics?.totalPayrollCost || 0)}
                </div>
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  {payrollData?.records?.length || 0} Staff members
                </span>
              </CardContent>
            </Card>

            <Card className="border border-emerald-500/20 bg-emerald-500/5 shadow-2xs">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Disbursed (Paid)
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold mt-1 text-emerald-700 dark:text-emerald-300">
                  {formatMoney(payrollData?.metrics?.totalPaid || 0)}
                </div>
                <span className="text-[11px] text-emerald-600/80 mt-0.5 block">
                  {payrollData?.metrics?.paidCount || 0} Paid vouchers
                </span>
              </CardContent>
            </Card>

            <Card className="border border-amber-500/20 bg-amber-500/5 shadow-2xs">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    Pending Disbursal
                  </span>
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-bold mt-1 text-amber-700 dark:text-amber-300">
                  {formatMoney(payrollData?.metrics?.totalPending || 0)}
                </div>
                <span className="text-[11px] text-amber-600/80 mt-0.5 block">
                  {payrollData?.metrics?.draftCount || 0} Awaiting payment
                </span>
              </CardContent>
            </Card>

            <Card className="border shadow-2xs">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    Current Cycle
                  </span>
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="text-xl font-bold mt-1 text-foreground">
                  {MONTH_NAMES[payrollMonth - 1]} {payrollYear}
                </div>
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  Prorated 30-day formula
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Payroll Records Table */}
          <Card className="border shadow-2xs overflow-hidden">
            <CardHeader className="p-4 border-b bg-muted/20">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span>Staff Salary Register &bull; {MONTH_NAMES[payrollMonth - 1]} {payrollYear}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {filteredPayroll.length} records processed
                </span>
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b font-medium">
                  <tr>
                    <th className="p-3.5 pl-4">Staff Member</th>
                    <th className="p-3.5">Base Salary</th>
                    <th className="p-3.5">Attendance Breakdown</th>
                    <th className="p-3.5">Deductions</th>
                    <th className="p-3.5">Net Payable</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredPayroll.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No payroll generated for {MONTH_NAMES[payrollMonth - 1]} {payrollYear}. Click &quot;Generate / Recalculate Payroll&quot; above to calculate.
                      </td>
                    </tr>
                  ) : (
                    filteredPayroll.map((payroll: any) => (
                      <tr key={payroll.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3.5 pl-4">
                          <div className="font-semibold text-foreground">{payroll.staffName}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {payroll.employeeCode} &bull; {payroll.designation}
                          </div>
                        </td>
                        <td className="p-3.5 font-semibold text-foreground">
                          {formatMoney(payroll.baseSalary)}
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className="text-emerald-600 font-semibold">{payroll.presentDays}P</span>
                            <span className="text-muted-foreground">&bull;</span>
                            <span className="text-amber-600 font-semibold">{payroll.halfDays}HD</span>
                            <span className="text-muted-foreground">&bull;</span>
                            <span className="text-rose-600 font-semibold">{payroll.absentDays}A</span>
                            <span className="text-muted-foreground">&bull;</span>
                            <span className="text-blue-600 font-semibold">{payroll.leaveDays}L</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            of {payroll.totalWorkingDays} days
                          </div>
                        </td>
                        <td className="p-3.5 font-medium text-rose-600 dark:text-rose-400">
                          {payroll.deductions > 0 ? `-${formatMoney(payroll.deductions)}` : '₹0.00'}
                        </td>
                        <td className="p-3.5 font-bold text-foreground text-sm">
                          {formatMoney(payroll.netPay)}
                        </td>
                        <td className="p-3.5 text-center">
                          {payroll.status === 'PAID' ? (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                              ✓ Paid ({payroll.paymentMode || 'Direct'})
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
                              Draft / Due
                            </Badge>
                          )}
                        </td>
                        <td className="p-3.5 text-right pr-4">
                          <div className="flex items-center justify-end gap-1.5">
                            {payroll.status !== 'PAID' && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setTargetPayrollRecord(payroll);
                                  setPayModalOpen(true);
                                }}
                                className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                Mark Paid
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedSlipPayroll(payroll);
                                setSlipModalOpen(true);
                              }}
                              className="h-7 px-2.5 text-xs gap-1"
                            >
                              <Printer className="w-3 h-3" />
                              Payslip
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOG 1: APPLY LEAVE MODAL */}
      {/* ========================================================================= */}
      <Dialog open={leaveModalOpen} onOpenChange={setLeaveModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Apply / Record Staff Leave</DialogTitle>
            <DialogDescription className="text-xs">
              Submit a leave application for an in-house employee.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitLeave} className="space-y-4 text-xs">
            <div>
              <Label className="text-xs">Employee</Label>
              <select
                value={selectedLeaveStaffId}
                onChange={(e) => setSelectedLeaveStaffId(e.target.value)}
                required
                className="w-full mt-1 h-9 px-3 border rounded-lg bg-background text-foreground text-xs"
              >
                <option value="">Select Employee...</option>
                {(attendanceData?.roster || []).map((s: any) => (
                  <option key={s.userId} value={s.userId}>
                    {s.name} ({s.employeeCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs">Leave Type</Label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as any)}
                className="w-full mt-1 h-9 px-3 border rounded-lg bg-background text-foreground text-xs"
              >
                <option value="CASUAL">Casual Leave (CL)</option>
                <option value="SICK">Sick Leave (SL)</option>
                <option value="ANNUAL">Annual / Earned Leave (AL)</option>
                <option value="MATERNITY">Maternity / Paternity Leave</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Start Date</Label>
                <Input
                  type="date"
                  value={leaveStartDate}
                  onChange={(e) => setLeaveStartDate(e.target.value)}
                  required
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">End Date</Label>
                <Input
                  type="date"
                  value={leaveEndDate}
                  onChange={(e) => setLeaveEndDate(e.target.value)}
                  required
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Reason / Handover Note</Label>
              <Input
                placeholder="Reason for leave..."
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLeaveModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={leaveSubmitting}>
                {leaveSubmitting ? 'Submitting...' : 'Submit Leave'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 2: MARK PAYROLL AS PAID */}
      {/* ========================================================================= */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Disburse Salary Payment</DialogTitle>
            <DialogDescription className="text-xs">
              Confirm payment disbursal for {targetPayrollRecord?.staffName} ({MONTH_NAMES[payrollMonth - 1]} {payrollYear}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs py-2">
            <div className="p-3 bg-muted/30 border rounded-lg flex items-center justify-between">
              <span className="text-muted-foreground">Net Amount to Pay</span>
              <span className="text-lg font-bold text-foreground">
                {formatMoney(targetPayrollRecord?.netPay)}
              </span>
            </div>

            <div>
              <Label className="text-xs">Payment Mode</Label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full mt-1 h-9 px-3 border rounded-lg bg-background text-foreground text-xs"
              >
                <option value="BANK_TRANSFER">Direct Bank Transfer (NEFT/RTGS/IMPS)</option>
                <option value="UPI">UPI / GPay / PhonePe</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CASH">Cash</option>
              </select>
            </div>

            <div>
              <Label className="text-xs">Transaction Ref / UTR / Cheque Number</Label>
              <Input
                placeholder="e.g. UTR12849202029"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs">Payment Notes (Optional)</Label>
              <Input
                placeholder="Remarks..."
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPayModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmPayment}
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isPending ? 'Processing...' : 'Confirm Disbursal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 3: QUICK SALARY CONFIGURATION */}
      {/* ========================================================================= */}
      <Dialog open={salaryDialogOpen} onOpenChange={setSalaryDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Staff Base Salary</DialogTitle>
            <DialogDescription className="text-xs">
              Configure monthly fixed salary for {salaryTargetStaff?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs">Monthly Base Salary (₹)</Label>
              <Input
                type="number"
                min="0"
                step="500"
                placeholder="e.g. 25000"
                value={newSalaryInput}
                onChange={(e) => setNewSalaryInput(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSalaryDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveSalary} disabled={isPending}>
              Save Salary
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* SALARY SLIP PRINTABLE MODAL */}
      {/* ========================================================================= */}
      <SalarySlipModal
        isOpen={slipModalOpen}
        onClose={() => setSlipModalOpen(false)}
        payroll={selectedSlipPayroll}
        tenant={tenant}
      />
    </div>
  );
}
