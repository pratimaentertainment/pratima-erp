'use client';

import React, { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Briefcase,
  Phone,
  Mail,
  Star,
  Camera,
  FileCheck2,
  FileText,
  CheckCircle2,
  Plus,
  Eye,
  Edit,
  ShieldAlert,
  Loader2,
  AlertCircle,
  Sparkles,
  Check,
  X,
  Building,
  Building2,
  MapPin,
  KeyRound,
  Wrench,
  BadgeAlert,
  ScrollText,
  MoreHorizontal,
  UserX,
  UserCheck,
  IndianRupee,
  Copy,
  ShieldCheck,
} from 'lucide-react';
import { EmploymentType } from '@prisma/client';
import {
  toggleUserBlacklistAction,
  toggleTeamMemberStatusAction,
  createTeamMemberAction,
  addTeamMemberAction,
  resetStaffPasswordAction,
  updateTeamMemberAction,
} from '@/actions/team.actions';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  companyName?: string | null;
  employeeCode?: string | null;
  designation?: string | null;
  department?: string | null;
  employmentType: EmploymentType;
  monthlySalary?: number | null;
  isActive: boolean;
  canLogin?: boolean;
  skills: string[];
  equipmentList?: string | null;
  rating?: number | null;
  isBlacklisted: boolean;
  status: string;
  roles?: any[];
  userAgreements?: any[];
}

export interface DocumentTemplateOption {
  id: string;
  name: string;
  type: string;
}

interface TeamManagementClientProps {
  initialTeam: TeamMember[];
  templates?: DocumentTemplateOption[];
}

const PRESET_SKILLS = [
  'Candid Photography',
  'Cinematography',
  'Traditional Photography',
  'Traditional Videography',
  'Drone Pilot',
  'Same-Day Editor',
  'Album Designer',
  'Grip & Lighting',
  'Audio & Sound',
  'Shoot Director',
];

export function TeamManagementClient({
  initialTeam = [],
  templates = [],
}: TeamManagementClientProps) {
  const [team, setTeam] = useState<TeamMember[]>(initialTeam);
  const [searchTerm, setSearchTerm] = useState('');
  const [employmentFilter, setEmploymentFilter] = useState<string>('ALL');
  const [blacklistFilter, setBlacklistFilter] = useState<string>('ALL');

  // Member Quick-View State
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Snapshot Viewer Modal State
  const [snapshotAgreement, setSnapshotAgreement] = useState<any | null>(null);
  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);

  // Add / Edit Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCompanyName, setFormCompanyName] = useState('');
  const [formDesignation, setFormDesignation] = useState('');
  const [formEmploymentType, setFormEmploymentType] = useState<EmploymentType>(EmploymentType.IN_HOUSE);
  const [formMonthlySalary, setFormMonthlySalary] = useState('');
  const [formSkills, setFormSkills] = useState<string[]>([]);
  const [customSkillInput, setCustomSkillInput] = useState('');
  const [formEquipment, setFormEquipment] = useState('');
  const [formTemplateId, setFormTemplateId] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // New Credentials Modal State
  const [newCredentials, setNewCredentials] = useState<{
    name: string;
    email: string;
    temporaryPassword: string;
  } | null>(null);
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  const [hasCopiedCredentials, setHasCopiedCredentials] = useState(false);

  // Reset Password Modal State
  const [resettingMember, setResettingMember] = useState<TeamMember | null>(null);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [resetCustomPassword, setResetCustomPassword] = useState('');
  const [resetResult, setResetResult] = useState<{ email: string; temporaryPassword: string } | null>(null);
  const [isResetting, startResetTransition] = useTransition();
  const [hasCopiedReset, setHasCopiedReset] = useState(false);

  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [isPending, startTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();

  // Summary KPIs
  const kpiStats = useMemo(() => {
    const total = team.length;
    const inHouse = team.filter((m) => m.employmentType === 'IN_HOUSE').length;
    const freelance = team.filter((m) => m.employmentType === 'FREELANCE').length;
    const active = team.filter((m) => m.isActive !== false).length;
    const inactive = team.filter((m) => m.isActive === false).length;
    const blacklisted = team.filter((m) => m.isBlacklisted).length;
    return { total, inHouse, freelance, active, inactive, blacklisted };
  }, [team]);

  // Filtered members
  const filteredTeam = useMemo(() => {
    return team.filter((member) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        member.name.toLowerCase().includes(term) ||
        member.email.toLowerCase().includes(term) ||
        (member.phone && member.phone.includes(term)) ||
        (member.companyName && member.companyName.toLowerCase().includes(term)) ||
        (member.address && member.address.toLowerCase().includes(term)) ||
        (member.designation && member.designation.toLowerCase().includes(term)) ||
        (member.skills && member.skills.some((s) => s.toLowerCase().includes(term)));

      const matchesEmployment =
        employmentFilter === 'ALL' || member.employmentType === employmentFilter;

      const matchesBlacklist =
        blacklistFilter === 'ALL' ||
        (blacklistFilter === 'BLACKLISTED' && member.isBlacklisted) ||
        (blacklistFilter === 'ACTIVE' && !member.isBlacklisted);

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && member.isActive !== false) ||
        (statusFilter === 'INACTIVE' && member.isActive === false);

      return matchesSearch && matchesEmployment && matchesBlacklist && matchesStatus;
    });
  }, [team, searchTerm, employmentFilter, blacklistFilter, statusFilter]);

  // Auto-Select template helper based on employment type
  const autoSelectTemplateForType = (type: EmploymentType) => {
    if (type === EmploymentType.FREELANCE) {
      const freelanceTpl =
        templates.find(
          (t) =>
            t.type === 'NDA' ||
            t.name.toLowerCase().includes('freelance') ||
            t.name.toLowerCase().includes('nda')
        ) || templates[0];
      return freelanceTpl ? freelanceTpl.id : '';
    } else {
      const inHouseTpl =
        templates.find(
          (t) =>
            t.type === 'AGREEMENT' ||
            t.name.toLowerCase().includes('employment') ||
            t.name.toLowerCase().includes('in-house') ||
            t.name.toLowerCase().includes('staff')
        ) || templates[0];
      return inHouseTpl ? inHouseTpl.id : '';
    }
  };

  // Open Add Member Modal
  const handleOpenAddMember = () => {
    setEditingMember(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormAddress('');
    setFormCompanyName('');
    setFormDesignation('');
    setFormEmploymentType(EmploymentType.FREELANCE);
    setFormMonthlySalary('');
    setFormSkills([]);
    setCustomSkillInput('');
    setFormEquipment('');
    setFormTemplateId(autoSelectTemplateForType(EmploymentType.FREELANCE));
    setFormPassword('');
    setFormError(null);
    setIsFormOpen(true);
  };

  // Handle Employment Type Change with Auto-Select Template
  const handleEmploymentTypeChange = (val: EmploymentType) => {
    setFormEmploymentType(val);
    const matchedId = autoSelectTemplateForType(val);
    if (matchedId) {
      setFormTemplateId(matchedId);
    }
  };

  // Open Edit Member Modal
  const handleOpenEditMember = (member: TeamMember) => {
    setEditingMember(member);
    setFormName(member.name);
    setFormEmail(member.email);
    setFormPhone(member.phone || '');
    setFormAddress(member.address || '');
    setFormCompanyName(member.companyName || '');
    setFormDesignation(member.designation || '');
    setFormEmploymentType(member.employmentType);
    setFormMonthlySalary(
      member.monthlySalary !== null && member.monthlySalary !== undefined
        ? String(member.monthlySalary)
        : ''
    );
    setFormSkills(member.skills || []);
    setCustomSkillInput('');
    setFormEquipment(member.equipmentList || '');
    setFormTemplateId('');
    setFormPassword('');
    setFormError(null);
    setIsFormOpen(true);
  };

  // Toggle Skill Selection
  const handleToggleSkill = (skill: string) => {
    setFormSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  // Add Custom Skill
  const handleAddCustomSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const clean = customSkillInput.trim();
    if (!clean) return;
    if (!formSkills.includes(clean)) {
      setFormSkills((prev) => [...prev, clean]);
    }
    setCustomSkillInput('');
  };

  // Remove Skill Pill
  const handleRemoveSkill = (skill: string) => {
    setFormSkills((prev) => prev.filter((s) => s !== skill));
  };

  // Submit Add / Edit Member Form
  const handleSubmitMemberForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim()) {
      setFormError('Please enter member name.');
      return;
    }

    const salaryNum =
      formEmploymentType === EmploymentType.IN_HOUSE && formMonthlySalary.trim() !== ''
        ? Number(formMonthlySalary)
        : null;

    setFormError(null);
    startSaveTransition(async () => {
      try {
        if (editingMember) {
          const res = await updateTeamMemberAction({
            id: editingMember.id,
            name: formName.trim(),
            email: formEmail.trim() || undefined,
            phone: formPhone.trim() || undefined,
            address: formAddress.trim() || undefined,
            companyName: formCompanyName.trim() || undefined,
            designation: formDesignation.trim() || undefined,
            employmentType: formEmploymentType,
            monthlySalary: salaryNum,
            skills: formSkills,
            equipmentList: formEquipment.trim() || undefined,
          });

          if (res.success && res.data) {
            setTeam((prev) =>
              prev.map((m) => (m.id === editingMember.id ? { ...m, ...res.data } : m))
            );
            toast.success(`Team member "${formName}" updated successfully!`);
            setIsFormOpen(false);
          } else {
            setFormError(res.error || 'Failed to update team member');
            toast.error(res.error || 'Failed to update team member');
          }
        } else {
          const res = await addTeamMemberAction({
            name: formName.trim(),
            email: formEmail.trim() || undefined,
            phone: formPhone.trim() || undefined,
            address: formAddress.trim() || undefined,
            companyName: formCompanyName.trim() || undefined,
            designation: formDesignation.trim() || undefined,
            role: formRole.trim() || undefined,
            employmentType: formEmploymentType,
            monthlySalary: salaryNum,
            skills: formSkills,
            equipmentList: formEquipment.trim() || undefined,
            password: formPassword.trim() || undefined,
            templateId: formTemplateId ? formTemplateId : undefined,
          });

          if (res.success && res.data) {
            setTeam((prev) => [res.data, ...prev]);
            setIsFormOpen(false);

            if (res.credentials) {
              setNewCredentials({
                name: formName.trim(),
                email: res.credentials.email,
                temporaryPassword: res.credentials.temporaryPassword,
              });
              setIsCredentialsModalOpen(true);
              setHasCopiedCredentials(false);
              toast.success(`Staff member "${formName}" registered with auto-generated credentials!`);
            } else {
              toast.success(`Freelance specialist "${formName}" registered and agreement snapshotted!`);
            }
          } else {
            setFormError(res.error || 'Failed to create team member');
            toast.error(res.error || 'Failed to create team member');
          }
        }
      } catch (err: any) {
        setFormError(err?.message || 'An unexpected error occurred');
        toast.error(err?.message || 'An unexpected error occurred');
      }
    });
  };

  // Open Reset Password Dialog
  const handleOpenResetPassword = (member: TeamMember) => {
    setResettingMember(member);
    setResetCustomPassword('');
    setResetResult(null);
    setHasCopiedReset(false);
    setIsResetPasswordOpen(true);
  };

  // Submit Password Reset Action
  const handleConfirmResetPassword = () => {
    if (!resettingMember) return;
    startResetTransition(async () => {
      try {
        const res = await resetStaffPasswordAction(
          resettingMember.id,
          resetCustomPassword.trim() || undefined
        );
        if (res.success && res.data) {
          setResetResult({
            email: res.data.email,
            temporaryPassword: res.data.temporaryPassword,
          });
          toast.success(`Password reset successfully for ${resettingMember.name}!`);
        } else {
          toast.error(res.error || 'Failed to reset password');
        }
      } catch (err: any) {
        toast.error(err?.message || 'Failed to reset password');
      }
    });
  };

  // Toggle Active / Inactive Status (Soft Delete)
  const handleToggleStatus = (member: TeamMember) => {
    const nextStatus = member.isActive === false;
    const confirmMessage = nextStatus
      ? `Reactivate account for "${member.name}"? They will regain access to assignments and system login.`
      : `Are you sure you want to deactivate "${member.name}"? This soft-deactivation protects historical contracts, assignments, and financial records while preventing login and future ceremony roster assignments.`;

    if (!confirm(confirmMessage)) return;

    startTransition(async () => {
      try {
        const res = await toggleTeamMemberStatusAction(member.id, nextStatus);
        if (res.success) {
          setTeam((prev) =>
            prev.map((m) =>
              m.id === member.id
                ? { ...m, isActive: nextStatus, status: nextStatus ? 'ACTIVE' : 'INACTIVE' }
                : m
            )
          );
          if (selectedMember && selectedMember.id === member.id) {
            setSelectedMember((prev) =>
              prev ? { ...prev, isActive: nextStatus, status: nextStatus ? 'ACTIVE' : 'INACTIVE' } : null
            );
          }
          if (!nextStatus) {
            toast.warning(
              `"${member.name}" deactivated. Login and future assignments are prevented; historical data remains intact.`,
              { duration: 6000 }
            );
          } else {
            toast.success(`"${member.name}" activated successfully.`);
          }
        } else {
          toast.error(res.error || 'Failed to update member status');
        }
      } catch (err: any) {
        toast.error(err?.message || 'An unexpected error occurred');
      }
    });
  };

  // Toggle Blacklist status
  const handleToggleBlacklist = (member: TeamMember) => {
    const targetStatus = !member.isBlacklisted;
    const confirmMessage = targetStatus
      ? `Are you sure you want to blacklist "${member.name}"? They will be flagged on all event assignments.`
      : `Remove blacklist restriction from "${member.name}"?`;

    if (!confirm(confirmMessage)) return;

    startTransition(async () => {
      try {
        const res = await toggleUserBlacklistAction(member.id, targetStatus);
        if (res.success) {
          setTeam((prev) =>
            prev.map((m) =>
              m.id === member.id ? { ...m, isBlacklisted: targetStatus } : m
            )
          );
          if (selectedMember && selectedMember.id === member.id) {
            setSelectedMember((prev) => (prev ? { ...prev, isBlacklisted: targetStatus } : null));
          }
          toast.success(
            targetStatus
              ? `${member.name} has been blacklisted.`
              : `${member.name} restriction has been lifted.`
          );
        } else {
          toast.error(res.error || 'Failed to update blacklist status');
        }
      } catch (err: any) {
        toast.error(err?.message || 'An error occurred');
      }
    });
  };

  const handleOpenDetail = (member: TeamMember) => {
    setSelectedMember(member);
    setIsDetailOpen(true);
  };

  const handleOpenSnapshot = (agreement: any) => {
    setSnapshotAgreement(agreement);
    setIsSnapshotOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 text-xs font-mono">
            {team.length} Team Members Registered
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <Link href="/settings/agreements">
            <Button variant="outline" size="sm" type="button" className="gap-1.5 text-xs shadow-xs">
              <FileText className="w-3.5 h-3.5 text-primary" />
              Agreement Templates
            </Button>
          </Link>

          <Button onClick={handleOpenAddMember} size="sm" className="gap-1.5 text-xs shadow-xs">
            <Plus className="w-3.5 h-3.5" />
            Add Team Member
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Crew</p>
              <h4 className="text-xl font-bold tracking-tight">{kpiStats.total}</h4>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">In-House Staff</p>
              <h4 className="text-xl font-bold tracking-tight text-blue-700 dark:text-blue-300">
                {kpiStats.inHouse}
              </h4>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Freelance Talent</p>
              <h4 className="text-xl font-bold tracking-tight text-amber-700 dark:text-amber-300">
                {kpiStats.freelance}
              </h4>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Blacklisted</p>
              <h4 className="text-xl font-bold tracking-tight text-red-700 dark:text-red-300">
                {kpiStats.blacklisted}
              </h4>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="shadow-xs border bg-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone, company, address, or skill..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>

            {/* Employment Type Filter */}
            <div className="w-full md:w-44">
              <Select value={employmentFilter} onValueChange={(val) => setEmploymentFilter(val || 'ALL')}>
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="Employment Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Classifications</SelectItem>
                  <SelectItem value="IN_HOUSE">In-House Only</SelectItem>
                  <SelectItem value="FREELANCE">Freelance Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Account Status Filter */}
            <div className="w-full md:w-36">
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'ALL')}>
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="Account Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Accounts</SelectItem>
                  <SelectItem value="ACTIVE">Active ({kpiStats.active})</SelectItem>
                  <SelectItem value="INACTIVE">Inactive ({kpiStats.inactive})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Compliance Filter */}
            <div className="w-full md:w-40">
              <Select value={blacklistFilter} onValueChange={(val) => setBlacklistFilter(val || 'ALL')}>
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="Compliance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Compliance</SelectItem>
                  <SelectItem value="ACTIVE">Good Standing</SelectItem>
                  <SelectItem value="BLACKLISTED">Blacklisted ({kpiStats.blacklisted})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <div className="border rounded-xl bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-[280px]">Member & Role</TableHead>
              <TableHead>Contact & Address</TableHead>
              <TableHead>Employment Type</TableHead>
              <TableHead>Skills & Specialization</TableHead>
              <TableHead>Agreements</TableHead>
              <TableHead>Compliance Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTeam.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto opacity-40 mb-2" />
                  <p className="font-medium text-sm">No team members found</p>
                  <p className="text-xs">Try adjusting your filters or click &quot;Add Team Member&quot;.</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredTeam.map((member) => {
                const isFreelancer = member.employmentType === 'FREELANCE';
                const hasAgreements =
                  member.userAgreements && member.userAgreements.length > 0;
                const acceptedAgreements =
                  member.userAgreements?.filter((a: any) => a.status === 'ACCEPTED') || [];

                return (
                  <TableRow
                    key={member.id}
                    className={`transition-colors ${
                      member.isActive === false
                        ? 'opacity-70 bg-muted/20 hover:bg-muted/30'
                        : member.isBlacklisted
                        ? 'bg-destructive/5 hover:bg-destructive/10'
                        : 'hover:bg-muted/30'
                    }`}
                  >
                    {/* Name & Role */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                            member.isActive === false
                              ? 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                              : member.isBlacklisted
                              ? 'bg-destructive text-destructive-foreground'
                              : isFreelancer
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          {member.name.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-sm text-foreground truncate">
                              {member.name}
                            </span>
                            {member.rating && (
                              <span className="text-[11px] font-medium text-amber-600 flex items-center gap-0.5">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                {member.rating.toFixed(1)}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {member.companyName ? (
                              <span className="font-medium text-foreground/80">{member.companyName} • </span>
                            ) : null}
                            {member.designation || member.employeeCode || 'Team Member'}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Contact & Location */}
                    <TableCell>
                      <div className="space-y-0.5 text-xs">
                        <div className="flex items-center gap-1.5 text-foreground">
                          <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[150px]">{member.email}</span>
                        </div>
                        {member.phone && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span>{member.phone}</span>
                          </div>
                        )}
                        {member.address && (
                          <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                            <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="truncate max-w-[160px]" title={member.address}>
                              {member.address}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Employment Type */}
                    <TableCell>
                      <div>
                        {isFreelancer ? (
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 text-xs font-semibold"
                          >
                            Freelancer
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 text-xs font-semibold"
                          >
                            In-House Staff
                          </Badge>
                        )}
                        {!isFreelancer && member.monthlySalary !== null && member.monthlySalary !== undefined && (
                          <div className="flex items-center gap-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mt-1">
                            <IndianRupee className="w-3 h-3 shrink-0" />
                            <span>{Number(member.monthlySalary).toLocaleString('en-IN')}/mo</span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Skills */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {member.skills && member.skills.length > 0 ? (
                          member.skills.slice(0, 3).map((skill, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-medium"
                            >
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground italic">General Crew</span>
                        )}
                        {member.skills && member.skills.length > 3 && (
                          <span className="text-[10px] text-muted-foreground font-semibold">
                            +{member.skills.length - 3} more
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Agreements */}
                    <TableCell>
                      {hasAgreements ? (
                        <div className="space-y-0.5 text-xs">
                          <div className="flex items-center gap-1">
                            <FileCheck2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                              {acceptedAgreements.length} Signed
                            </span>
                          </div>
                          {member.userAgreements && member.userAgreements.length > acceptedAgreements.length && (
                            <span className="text-[10px] text-amber-600 font-medium block">
                              {member.userAgreements.length - acceptedAgreements.length} Pending
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <FileText className="w-3.5 h-3.5 opacity-40 shrink-0" />
                          <span className="italic">No contract attached</span>
                        </div>
                      )}
                    </TableCell>

                    {/* Compliance & Activity Status */}
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        {member.isActive === false ? (
                          <Badge
                            variant="outline"
                            className="text-xs font-semibold bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 gap-1"
                          >
                            <UserX className="w-3 h-3 text-zinc-500" />
                            Inactive
                          </Badge>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3" />
                            Active
                          </span>
                        )}
                        {member.isBlacklisted && (
                          <Badge
                            variant="destructive"
                            className="text-[10px] font-bold gap-1"
                          >
                            <ShieldAlert className="w-2.5 h-2.5" />
                            Blacklisted
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditMember(member)}
                          className="h-8 px-2 text-xs gap-1 text-blue-600 hover:text-blue-700"
                          title="Edit Member"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Edit
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDetail(member)}
                          className="h-8 px-2 text-xs gap-1"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5 text-primary" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                            title="More Options"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => handleToggleStatus(member)}
                              disabled={isPending}
                              className={`cursor-pointer ${
                                member.isActive === false
                                  ? 'text-emerald-700 focus:text-emerald-800'
                                  : 'text-amber-700 focus:text-amber-800'
                              }`}
                            >
                              {member.isActive === false ? (
                                <>
                                  <UserCheck className="mr-2 h-4 w-4 text-emerald-600" />
                                  <span>Activate Member</span>
                                </>
                              ) : (
                                <>
                                  <UserX className="mr-2 h-4 w-4 text-amber-600" />
                                  <span>Deactivate Member</span>
                                </>
                              )}
                            </DropdownMenuItem>

                            {/* Reset Password Action for In-House Staff */}
                            {(member.employmentType === 'IN_HOUSE' || member.canLogin) && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleOpenResetPassword(member)}
                                  className="cursor-pointer text-blue-700 focus:text-blue-800 dark:text-blue-400"
                                >
                                  <KeyRound className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                                  <span>Reset Password</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}

                            <DropdownMenuItem
                              onClick={() => handleToggleBlacklist(member)}
                              disabled={isPending}
                              className={`cursor-pointer ${
                                member.isBlacklisted
                                  ? 'text-emerald-700 focus:text-emerald-800'
                                  : 'text-destructive focus:text-destructive'
                              }`}
                            >
                              <ShieldAlert className="mr-2 h-4 w-4" />
                              <span>{member.isBlacklisted ? 'Lift Blacklist' : 'Flag / Blacklist'}</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit Member Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              {editingMember ? `Edit Member: ${editingMember.name}` : 'Register New Team Member'}
            </DialogTitle>
            <DialogDescription>
              {editingMember
                ? 'Update talent details, address, company profile, and equipment.'
                : 'Onboard an in-house crew technician or freelance specialist with automatic agreement snapshotting.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitMemberForm} className="space-y-4 pt-1">
            {formError && (
              <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-lg flex items-center gap-2 border border-destructive/20">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="memberName">Full Name *</Label>
                <Input
                  id="memberName"
                  placeholder="e.g., Arjun Verma"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="memberEmail">
                  Email Address {formEmploymentType === EmploymentType.IN_HOUSE ? '(Optional — Auto-generated)' : ''}
                </Label>
                <Input
                  id="memberEmail"
                  type="email"
                  placeholder={
                    formEmploymentType === EmploymentType.IN_HOUSE
                      ? 'Leave blank to auto-generate standardized studio email'
                      : 'arjun@example.com'
                  }
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="memberPhone">Phone Number</Label>
                <Input
                  id="memberPhone"
                  placeholder="+91 98765 43210"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="memberDesignation">Job Title / Designation</Label>
                <Input
                  id="memberDesignation"
                  placeholder="e.g., Senior Video Editor"
                  value={formDesignation}
                  onChange={(e) => setFormDesignation(e.target.value)}
                />
              </div>

              {formEmploymentType === EmploymentType.IN_HOUSE && (
                <div className="space-y-1.5 col-span-1 sm:col-span-2">
                  <Label htmlFor="memberRole">System Access Role</Label>
                  <Select value={formRole} onValueChange={(val) => setFormRole(val || '')}>
                    <SelectTrigger id="memberRole" className="w-full">
                      <SelectValue placeholder="Assign organizational role (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRANCH_MANAGER">Branch Manager (Branch Operations)</SelectItem>
                      <SelectItem value="PROJECT_MANAGER">Project Manager (Shoot Logistics & Delivery)</SelectItem>
                      <SelectItem value="SALES_MANAGER">Sales Manager (CRM, Quotes & Conversion)</SelectItem>
                      <SelectItem value="EDITOR">Post-Production Editor (Cut & Master Delivery)</SelectItem>
                      <SelectItem value="DESIGNER">Graphic / Album Designer (Proofing & Print)</SelectItem>
                      <SelectItem value="FREELANCER">External Contractor</SelectItem>
                      <SelectItem value="Admin">Tenant Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Address & Company Name (For Contracts & Invoicing) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="memberCompany" className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                  Business / Studio Name
                </Label>
                <Input
                  id="memberCompany"
                  placeholder="e.g., Verma Visuals Studio"
                  value={formCompanyName}
                  onChange={(e) => setFormCompanyName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="memberAddress" className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  Residential / Studio Address
                </Label>
                <Input
                  id="memberAddress"
                  placeholder="e.g., 402 Lotus Hub, Mumbai"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                />
              </div>
            </div>

            {/* Employment Type */}
            <div className="space-y-1.5">
              <Label htmlFor="memberEmpType">Employment Classification *</Label>
              <Select
                value={formEmploymentType}
                onValueChange={(val) => handleEmploymentTypeChange((val as EmploymentType) || EmploymentType.IN_HOUSE)}
              >
                <SelectTrigger id="memberEmpType" className="w-full">
                  <SelectValue placeholder="Select classification" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EmploymentType.IN_HOUSE}>
                    In-House Staff (Monthly Payroll)
                  </SelectItem>
                  <SelectItem value={EmploymentType.FREELANCE}>
                    Freelance Specialist (Per-Event Payout & NDA Contract)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Monthly Salary Input (Visible and Enabled ONLY for IN_HOUSE Staff) */}
            {formEmploymentType === EmploymentType.IN_HOUSE && (
              <div className="space-y-1.5 p-3 rounded-lg border bg-blue-50/50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
                <Label htmlFor="memberSalary" className="flex items-center gap-1.5 text-xs font-semibold text-blue-900 dark:text-blue-200">
                  <IndianRupee className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Monthly Salary (₹)
                </Label>
                <Input
                  id="memberSalary"
                  type="number"
                  min="0"
                  step="100"
                  placeholder="e.g. 45000"
                  value={formMonthlySalary}
                  onChange={(e) => setFormMonthlySalary(e.target.value)}
                  className="bg-background text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Fixed monthly base compensation for full-time studio personnel.
                </p>
              </div>
            )}

            {/* Conditional Freelancer / Agreement Banner */}
            <div
              className={`p-3 rounded-lg text-xs space-y-2.5 border ${
                formEmploymentType === EmploymentType.FREELANCE
                  ? 'bg-amber-50/70 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200'
                  : 'bg-blue-50/70 border-blue-200 text-blue-900 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-200'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold">
                {formEmploymentType === EmploymentType.FREELANCE ? (
                  <>
                    <Camera className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Freelance Specialist Onboarding Workflow</span>
                  </>
                ) : (
                  <>
                    <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>In-House Personnel Workflow</span>
                  </>
                )}
              </div>
              <p className="text-[11px] opacity-90">
                {formEmploymentType === EmploymentType.FREELANCE
                  ? 'Freelancers require equipment registration and an immutable signed agreement snapshot before ceremony deployment.'
                  : 'In-house crew are managed via standard payroll. Service agreements are optional.'}
              </p>

              {/* Default Agreement Template Selection (With Auto-Selection) */}
              {!editingMember && templates.length > 0 && (
                <div className="pt-2 border-t border-border/40 space-y-1.5">
                  <Label htmlFor="assignTpl" className="text-xs font-medium flex items-center gap-1">
                    <FileCheck2 className="w-3.5 h-3.5 text-primary" />
                    Attach Onboarding Agreement Template (Auto-Interpolates Tags):
                  </Label>
                  <Select value={formTemplateId} onValueChange={(v) => setFormTemplateId(v || '')}>
                    <SelectTrigger id="assignTpl" className="bg-background text-xs">
                      <SelectValue placeholder="Select agreement template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((tpl) => (
                        <SelectItem key={tpl.id} value={tpl.id}>
                          {tpl.name} ({tpl.type.replace(/_/g, ' ')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    Tags like {`{{freelancer_name}}`}, {`{{freelancer_phone}}`}, {`{{company_name}}`}, and {`{{address}}`} will be permanently compiled into an immutable legal snapshot.
                  </p>
                </div>
              )}
            </div>

            {/* Equipment List */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="memberEquip" className="flex items-center gap-1">
                  <Wrench className="w-3.5 h-3.5 text-muted-foreground" />
                  Production Gear & Equipment List
                </Label>
                {formEmploymentType === EmploymentType.FREELANCE && (
                  <span className="text-[10px] text-amber-600 font-medium">Recommended for Freelancers</span>
                )}
              </div>
              <Textarea
                id="memberEquip"
                rows={2}
                placeholder="e.g., Sony FX3, 24-70mm GM II, DJI Ronin RS3 Pro, DJI Mavic 3 Cine"
                value={formEquipment}
                onChange={(e) => setFormEquipment(e.target.value)}
                className="text-xs"
              />
            </div>

            {/* Skills & Specialization Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1 text-xs">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Skills & Specializations
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_SKILLS.map((skill) => {
                  const isSelected = formSkills.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => handleToggleSkill(skill)}
                      className={`text-xs px-2.5 py-1 rounded-md border transition-colors cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted/40 hover:bg-muted text-foreground'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      {skill}
                    </button>
                  );
                })}
              </div>

              {/* Custom Skill Input */}
              <div className="flex items-center gap-2 pt-1">
                <Input
                  placeholder="Type other skill and hit enter..."
                  value={customSkillInput}
                  onChange={(e) => setCustomSkillInput(e.target.value)}
                  onKeyDown={handleAddCustomSkill}
                  className="h-8 text-xs flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCustomSkill}
                  className="h-8 text-xs"
                >
                  Add Skill
                </Button>
              </div>

              {formSkills.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {formSkills.map((s) => (
                    <Badge
                      key={s}
                      variant="secondary"
                      className="text-[11px] gap-1 pl-2 pr-1 py-0.5"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(s)}
                        className="hover:text-destructive cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Initial Password for New User */}
            {!editingMember && (
              <div className="space-y-1.5 p-3 bg-muted/30 border rounded-lg">
                <Label htmlFor="memberPassword" className="text-xs flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />
                  Initial Login Password (Optional)
                </Label>
                <Input
                  id="memberPassword"
                  type="password"
                  placeholder="Defaults to: Pratima@123"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="text-xs h-8"
                />
                <p className="text-[10px] text-muted-foreground">
                  The user can change their password anytime via their security settings.
                </p>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="gap-1.5">
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    {editingMember ? 'Save Changes' : 'Register Member'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 1. In-House Staff Credentials Generated Modal */}
      <Dialog open={isCredentialsModalOpen} onOpenChange={setIsCredentialsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-emerald-600">
              <ShieldCheck className="h-6 w-6" />
              <DialogTitle className="text-lg font-bold">Staff Login Credentials Created</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Official ERP portal credentials have been provisioned for <strong>{newCredentials?.name}</strong>. Provide these details to the staff member.
            </DialogDescription>
          </DialogHeader>

          {newCredentials && (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-muted/40 rounded-xl border space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Login Email / Username
                  </label>
                  <div className="flex items-center justify-between gap-2 mt-1 p-2 bg-background rounded-md border text-xs font-mono select-all">
                    <span>{newCredentials.email}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        navigator.clipboard.writeText(newCredentials.email);
                        toast.success('Email copied to clipboard!');
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Temporary Password
                  </label>
                  <div className="flex items-center justify-between gap-2 mt-1 p-2 bg-background rounded-md border text-xs font-mono font-bold text-primary select-all">
                    <span>{newCredentials.temporaryPassword}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        navigator.clipboard.writeText(newCredentials.temporaryPassword);
                        toast.success('Password copied to clipboard!');
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg text-xs text-blue-900 dark:text-blue-300">
                <span className="font-semibold">Security Notice:</span> The employee can use these credentials to log in at the studio portal immediately.
              </div>
            </div>
          )}

          <DialogFooter className="flex sm:justify-between items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-1 text-xs"
              onClick={() => {
                if (!newCredentials) return;
                const portalUrl = typeof window !== 'undefined' ? `${window.location.origin}/login` : '';
                const text = `FRAMIQ Staff Login\nStaff: ${newCredentials.name}\nPortal: ${portalUrl}\nEmail: ${newCredentials.email}\nTemporary Password: ${newCredentials.temporaryPassword}`;
                navigator.clipboard.writeText(text);
                setHasCopiedCredentials(true);
                toast.success('All login credentials copied to clipboard!');
              }}
            >
              {hasCopiedCredentials ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy Login Details
                </>
              )}
            </Button>
            <Button type="button" onClick={() => setIsCredentialsModalOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Reset Staff Password Modal */}
      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-blue-600">
              <KeyRound className="h-5 w-5" />
              <DialogTitle className="text-lg font-bold">Reset Staff Password</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Reset login credentials for <strong>{resettingMember?.name}</strong> ({resettingMember?.email}).
            </DialogDescription>
          </DialogHeader>

          {resetResult ? (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold text-xs">
                  <CheckCircle2 className="h-4 w-4" />
                  Password Successfully Reset
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    New Temporary Password
                  </label>
                  <div className="flex items-center justify-between gap-2 mt-1 p-2 bg-background rounded-md border text-xs font-mono font-bold text-primary select-all">
                    <span>{resetResult.temporaryPassword}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        navigator.clipboard.writeText(resetResult.temporaryPassword);
                        toast.success('Temporary password copied!');
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex sm:justify-between items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-1 text-xs"
                  onClick={() => {
                    if (!resettingMember || !resetResult) return;
                    const text = `FRAMIQ Password Reset\nStaff: ${resettingMember.name}\nEmail: ${resetResult.email}\nTemporary Password: ${resetResult.temporaryPassword}`;
                    navigator.clipboard.writeText(text);
                    setHasCopiedReset(true);
                    toast.success('Credentials copied to clipboard!');
                  }}
                >
                  {hasCopiedReset ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy Details
                    </>
                  )}
                </Button>
                <Button type="button" onClick={() => setIsResetPasswordOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="resetPasswordInput" className="text-xs">
                  Custom New Password (Optional)
                </Label>
                <Input
                  id="resetPasswordInput"
                  type="password"
                  placeholder="Leave empty to auto-generate a secure random password"
                  value={resetCustomPassword}
                  onChange={(e) => setResetCustomPassword(e.target.value)}
                  className="text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  If left empty, a secure temporary password will be automatically generated.
                </p>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsResetPasswordOpen(false)}
                  disabled={isResetting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmResetPassword}
                  disabled={isResetting}
                  className="gap-2"
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4" />
                      Confirm Password Reset
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Member Details Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedMember && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm uppercase ${
                      selectedMember.isBlacklisted
                        ? 'bg-destructive text-destructive-foreground'
                        : selectedMember.employmentType === 'FREELANCE'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {selectedMember.name.slice(0, 2)}
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold flex items-center gap-2">
                      {selectedMember.name}
                      {selectedMember.isBlacklisted && (
                        <Badge variant="destructive" className="text-[10px]">
                          Blacklisted
                        </Badge>
                      )}
                    </DialogTitle>
                    <DialogDescription className="text-xs flex items-center gap-1.5 flex-wrap">
                      {selectedMember.companyName ? `${selectedMember.companyName} • ` : ''}
                      {selectedMember.designation || 'Team Specialist'} •{' '}
                      {selectedMember.employmentType === 'FREELANCE'
                        ? 'Freelance Specialist'
                        : 'In-House Personnel'}
                      <Badge
                        variant={selectedMember.isActive !== false ? 'outline' : 'secondary'}
                        className={`text-[10px] ml-1 ${
                          selectedMember.isActive !== false
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : 'bg-zinc-100 text-zinc-600 border-zinc-300'
                        }`}
                      >
                        {selectedMember.isActive !== false ? 'Active Account' : 'Inactive'}
                      </Badge>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 pt-2 text-xs">
                {/* Contact & Business Section */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg">
                  <div>
                    <span className="text-muted-foreground font-medium">Email:</span>
                    <p className="font-semibold text-foreground truncate mt-0.5">
                      {selectedMember.email}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-medium">Phone:</span>
                    <p className="font-semibold text-foreground mt-0.5">
                      {selectedMember.phone || 'Not recorded'}
                    </p>
                  </div>
                  {selectedMember.companyName && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground font-medium">Business / Entity:</span>
                      <p className="font-semibold text-foreground mt-0.5">
                        {selectedMember.companyName}
                      </p>
                    </div>
                  )}
                  {selectedMember.address && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground font-medium">Registered Address:</span>
                      <p className="font-semibold text-foreground mt-0.5">
                        {selectedMember.address}
                      </p>
                    </div>
                  )}
                  {selectedMember.employmentType === 'IN_HOUSE' && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground font-medium">Monthly Compensation:</span>
                      <p className="font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                        <IndianRupee className="w-3.5 h-3.5" />
                        {selectedMember.monthlySalary !== null && selectedMember.monthlySalary !== undefined
                          ? `₹${Number(selectedMember.monthlySalary).toLocaleString('en-IN')}/month`
                          : 'Not specified'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Skills */}
                <div className="space-y-1.5">
                  <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                    Specializations & Skills
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedMember.skills && selectedMember.skills.length > 0 ? (
                      selectedMember.skills.map((skill, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-muted-foreground italic">No specialized skills tagged.</p>
                    )}
                  </div>
                </div>

                {/* Equipment & Gear */}
                <div className="space-y-1.5">
                  <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                    Equipment & Production Gear
                  </span>
                  <div className="p-3 border rounded-lg bg-card text-foreground">
                    {selectedMember.equipmentList ? (
                      <p className="whitespace-pre-line">{selectedMember.equipmentList}</p>
                    ) : (
                      <p className="text-muted-foreground italic">
                        No equipment registered yet.
                      </p>
                    )}
                  </div>
                </div>

                {/* Legal Agreements Snapshot List */}
                <div className="space-y-1.5">
                  <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                    Legal Agreements & Snapshots
                  </span>
                  <div className="space-y-2">
                    {selectedMember.userAgreements && selectedMember.userAgreements.length > 0 ? (
                      selectedMember.userAgreements.map((asgn: any) => (
                        <div
                          key={asgn.id}
                          className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" />
                            <div>
                              <span className="font-semibold text-foreground block">
                                {asgn.template?.name || 'Contract Agreement'}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                Status: {asgn.status}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {asgn.compiledContent && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenSnapshot(asgn)}
                                className="h-7 px-2 text-[11px] gap-1"
                              >
                                <ScrollText className="w-3.5 h-3.5 text-primary" />
                                View Snapshot
                              </Button>
                            )}
                            <Badge
                              variant={asgn.status === 'ACCEPTED' ? 'default' : 'secondary'}
                              className="text-[10px]"
                            >
                              {asgn.status}
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground italic p-2 rounded border border-dashed text-center">
                        No contracts or NDA agreements linked yet.
                      </p>
                    )}
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="pt-2 border-t flex justify-between items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsDetailOpen(false);
                      handleOpenEditMember(selectedMember);
                    }}
                    className="gap-1 text-xs"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Edit Profile
                  </Button>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant={selectedMember.isActive !== false ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => handleToggleStatus(selectedMember)}
                      disabled={isPending}
                      className={`text-xs gap-1 ${
                        selectedMember.isActive !== false
                          ? 'text-amber-700 border-amber-300 hover:bg-amber-50 dark:border-amber-700'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {selectedMember.isActive !== false ? (
                        <>
                          <UserX className="w-3.5 h-3.5" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-3.5 h-3.5" />
                          Activate
                        </>
                      )}
                    </Button>
                    <Button
                      variant={selectedMember.isBlacklisted ? 'default' : 'destructive'}
                      size="sm"
                      onClick={() => handleToggleBlacklist(selectedMember)}
                      disabled={isPending}
                    >
                      {isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : null}
                      {selectedMember.isBlacklisted ? 'Lift Blacklist' : 'Blacklist Member'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsDetailOpen(false)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Snapshot Viewer Modal */}
      <Dialog open={isSnapshotOpen} onOpenChange={setIsSnapshotOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {snapshotAgreement && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ScrollText className="w-5 h-5 text-primary" />
                  Immutable Legal Snapshot: {snapshotAgreement.template?.name || 'Contract Agreement'}
                </DialogTitle>
                <DialogDescription>
                  Permanently compiled agreement snapshot with interpolated artist and business details.
                </DialogDescription>
              </DialogHeader>

              <div className="p-4 bg-muted/30 border rounded-xl font-mono text-xs whitespace-pre-wrap leading-relaxed">
                {snapshotAgreement.compiledContent || 'No compiled snapshot content available.'}
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => setIsSnapshotOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
