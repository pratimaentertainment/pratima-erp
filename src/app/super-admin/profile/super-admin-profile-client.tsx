'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ShieldCheck,
  KeyRound,
  User,
  Mail,
  Phone,
  Clock,
  Laptop,
  Smartphone,
  Globe,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Send,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  updateSuperAdminDetailsAction,
  requestSuperAdminPasswordOtpAction,
  changeSuperAdminPasswordAction,
  revokeSuperAdminSessionAction,
  getSuperAdminProfileAction,
} from '@/actions/super-admin-profile.actions';

interface SuperAdminProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  lastLoginAt: string | null;
  passwordChangedAt: string | null;
}

interface LoginSessionItem {
  id: string;
  loginAt: string;
  ipAddress: string;
  browser: string;
  operatingSystem: string;
  deviceType: string;
  status: string;
  isCurrent: boolean;
}

interface SuperAdminProfileClientProps {
  initialProfile: SuperAdminProfile;
  initialSessions: LoginSessionItem[];
}

export function SuperAdminProfileClient({
  initialProfile,
  initialSessions,
}: SuperAdminProfileClientProps) {
  const [profile, setProfile] = React.useState<SuperAdminProfile>(initialProfile);
  const [sessions, setSessions] = React.useState<LoginSessionItem[]>(initialSessions);

  // Profile Details Form State
  const [name, setName] = React.useState(initialProfile.name);
  const [phone, setPhone] = React.useState(initialProfile.phone || '');
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);

  // Password Change 2FA Form State
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [otpCode, setOtpCode] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');

  const [showCurrentPass, setShowCurrentPass] = React.useState(false);
  const [showNewPass, setShowNewPass] = React.useState(false);
  const [showConfirmPass, setShowConfirmPass] = React.useState(false);

  const [isSendingOtp, setIsSendingOtp] = React.useState(false);
  const [otpSent, setOtpSent] = React.useState(false);
  const [otpCooldown, setOtpCooldown] = React.useState(0);
  const [maskedEmail, setMaskedEmail] = React.useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = React.useState(false);

  // Session Revocation State
  const [revokingSessionId, setRevokingSessionId] = React.useState<string | null>(null);

  // Cooldown countdown effect
  React.useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  // Refresh profile & session data
  const refreshData = async () => {
    const res = await getSuperAdminProfileAction();
    if (res.success && res.profile) {
      setProfile(res.profile);
      setName(res.profile.name);
      setPhone(res.profile.phone || '');
      setSessions(res.sessions || []);
    }
  };

  // 1. Handle Profile Details Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Full Name is required.');
      return;
    }

    setIsSavingProfile(true);
    try {
      const res = await updateSuperAdminDetailsAction({
        name: name.trim(),
        phone: phone.trim(),
      });

      if (res.success) {
        toast.success(res.message || 'Profile details updated.');
        await refreshData();
      } else {
        toast.error(res.error || 'Failed to update profile.');
      }
    } catch {
      toast.error('An unexpected error occurred while saving profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // 2. Handle Send OTP
  const handleSendOtp = async () => {
    if (!currentPassword) {
      toast.error('Please enter your current password first to verify your identity.');
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await requestSuperAdminPasswordOtpAction();
      if (res.success) {
        setOtpSent(true);
        setMaskedEmail(res.maskedEmail || profile.email);
        setOtpCooldown(60);
        toast.success(res.message || 'Verification code sent to your registered email.');
      } else {
        toast.error(res.error || 'Failed to dispatch verification code.');
      }
    } catch {
      toast.error('Network or server error while dispatching verification code.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // 3. Handle Password Update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error('Current password is required.');
      return;
    }
    if (!otpCode || otpCode.trim().length !== 6) {
      toast.error('Please enter the 6-digit email verification code.');
      return;
    }
    if (!newPassword) {
      toast.error('New password is required.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation password do not match.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await changeSuperAdminPasswordAction({
        currentPassword,
        otpCode: otpCode.trim(),
        newPassword,
      });

      if (res.success) {
        toast.success(res.message || 'Password updated successfully!');
        // Reset form
        setCurrentPassword('');
        setOtpCode('');
        setNewPassword('');
        setConfirmPassword('');
        setOtpSent(false);
        setOtpCooldown(0);
        await refreshData();
      } else {
        toast.error(res.error || 'Failed to update password.');
      }
    } catch {
      toast.error('An unexpected error occurred while changing password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // 4. Handle Session Revocation
  const handleRevokeSession = async (sessionId: string) => {
    setRevokingSessionId(sessionId);
    try {
      const res = await revokeSuperAdminSessionAction(sessionId);
      if (res.success) {
        toast.success(res.message || 'Session revoked successfully.');
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      } else {
        toast.error(res.error || 'Failed to revoke session.');
      }
    } catch {
      toast.error('An unexpected error occurred while revoking session.');
    } finally {
      setRevokingSessionId(null);
    }
  };

  // Password Strength Indicators
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const isStrengthValid = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Top Breadcrumb & Page Heading */}
      <div className="flex flex-col gap-3">
        <Link
          href="/super-admin"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium w-fit group"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Super Admin Console</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold font-heading tracking-tight text-foreground">
                Root Admin Profile & Security
              </h1>
              <Badge
                variant="outline"
                className="bg-primary/10 text-primary border-primary/30 text-[10px] px-2 py-0.5 font-mono uppercase font-bold"
              >
                SUPER_ADMIN
              </Badge>
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] px-2 py-0.5 font-medium flex items-center gap-1"
              >
                <ShieldCheck className="h-3 w-3" />
                2FA Protected
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Manage platform super administrator identity, verified credentials, and active authorized sessions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              className="text-xs gap-1.5 h-8 border-border/80 hover:bg-muted/50"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Profile Details & 2FA Password Security */}
        <div className="lg:col-span-2 space-y-8">
          {/* SECTION A: Profile Details */}
          <Card className="shadow-xs border-border/80">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 text-foreground font-heading">
                <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Section A — Profile Details</CardTitle>
                  <CardDescription className="text-xs">
                    Basic identification information for the platform super administrator.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs font-medium">
                      Full Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Platform Administrator"
                      className="h-9 text-sm"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-medium">
                      Contact Phone
                    </Label>
                    <div className="relative">
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        className="h-9 text-sm pl-8"
                      />
                      <Phone className="h-3.5 w-3.5 absolute left-2.5 top-3 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium flex items-center justify-between">
                    <span>Registered Super Admin Email</span>
                    <span className="text-[10px] text-muted-foreground font-mono">Protected Identity</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      disabled
                      className="h-9 text-sm pl-8 bg-muted/40 font-mono text-muted-foreground cursor-not-allowed"
                    />
                    <Mail className="h-3.5 w-3.5 absolute left-2.5 top-3 text-muted-foreground" />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    This is your root administrative email. All 2FA OTP codes and system alerts are sent here.
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSavingProfile}
                    size="sm"
                    className="h-9 px-4 text-xs font-medium gap-1.5"
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Save Profile Changes</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* SECTION B: 2FA Password Change */}
          <Card className="shadow-xs border-border/80">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 text-foreground font-heading">
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Section B — Change Login Password (2FA Verified)</CardTitle>
                  <CardDescription className="text-xs">
                    Root admin passwords require current password verification + 6-digit email OTP approval.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                {/* Step 1: Current Password & OTP Dispatch */}
                <div className="p-4 rounded-lg bg-muted/30 border border-border/70 space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="currentPass" className="text-xs font-medium">
                      Current Password <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="currentPass"
                        type={showCurrentPass ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter your current login password"
                        className="h-9 text-sm pr-9"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        {showCurrentPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="text-xs text-muted-foreground">
                      {otpSent ? (
                        <span className="text-emerald-600 font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Code sent to {maskedEmail || profile.email}
                        </span>
                      ) : (
                        <span>Click to receive a 6-digit verification code on your email</span>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSendOtp}
                      disabled={isSendingOtp || otpCooldown > 0 || !currentPassword}
                      className="text-xs h-8 px-3 gap-1.5 font-medium shrink-0 border-border/80"
                    >
                      {isSendingOtp ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Sending OTP...</span>
                        </>
                      ) : otpCooldown > 0 ? (
                        <span>Resend in {otpCooldown}s</span>
                      ) : (
                        <>
                          <Send className="h-3 w-3" />
                          <span>{otpSent ? 'Resend Email OTP' : 'Send Email OTP'}</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Step 2: 6-Digit OTP Input */}
                <div className="space-y-1.5">
                  <Label htmlFor="otpCode" className="text-xs font-medium flex items-center justify-between">
                    <span>6-Digit Email Verification Code <span className="text-destructive">*</span></span>
                    <span className="text-[10px] text-muted-foreground">Expires in 10 minutes</span>
                  </Label>
                  <Input
                    id="otpCode"
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit code"
                    className="h-10 text-center tracking-widest font-mono text-base font-bold sm:max-w-xs"
                    required
                  />
                </div>

                {/* Step 3: New Password & Confirmation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="newPass" className="text-xs font-medium">
                      New Password <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="newPass"
                        type={showNewPass ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min 8 chars, 1 uppercase, 1 symbol"
                        className="h-9 text-sm pr-9"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPass" className="text-xs font-medium">
                      Confirm New Password <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPass"
                        type={showConfirmPass ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="h-9 text-sm pr-9"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password Strength Checklist */}
                {newPassword.length > 0 && (
                  <div className="p-3 rounded-md bg-muted/20 border border-border/60 text-xs space-y-1.5">
                    <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">
                      Security Policy Requirements:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
                      <span className={hasMinLength ? 'text-emerald-600 font-medium' : 'text-muted-foreground'}>
                        {hasMinLength ? '✓' : '○'} Min 8 characters
                      </span>
                      <span className={hasUpper ? 'text-emerald-600 font-medium' : 'text-muted-foreground'}>
                        {hasUpper ? '✓' : '○'} Uppercase letter
                      </span>
                      <span className={hasLower ? 'text-emerald-600 font-medium' : 'text-muted-foreground'}>
                        {hasLower ? '✓' : '○'} Lowercase letter
                      </span>
                      <span className={hasNumber ? 'text-emerald-600 font-medium' : 'text-muted-foreground'}>
                        {hasNumber ? '✓' : '○'} Numeric digit
                      </span>
                      <span className={hasSpecial ? 'text-emerald-600 font-medium' : 'text-muted-foreground'}>
                        {hasSpecial ? '✓' : '○'} Special character
                      </span>
                      <span className={newPassword === confirmPassword && confirmPassword.length > 0 ? 'text-emerald-600 font-medium' : 'text-muted-foreground'}>
                        {newPassword === confirmPassword && confirmPassword.length > 0 ? '✓' : '○'} Passwords match
                      </span>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isUpdatingPassword || !isStrengthValid || newPassword !== confirmPassword || !otpCode}
                    size="sm"
                    className="h-9 px-4 text-xs font-medium gap-1.5"
                  >
                    {isUpdatingPassword ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Verifying & Updating...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="h-3.5 w-3.5" />
                        <span>Update Password (2FA)</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 Col): Security Metadata & Section C Active Login Sessions */}
        <div className="space-y-8">
          {/* Security Snapshot Card */}
          <Card className="shadow-xs border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Security Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Admin Role:</span>
                <span className="font-semibold text-foreground">Root Platform Admin</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">2FA Policy:</span>
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                  Enforced
                </Badge>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Password History:</span>
                <span className="font-mono text-muted-foreground">Last 5 Generations</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Last Password Change:</span>
                <span className="font-mono text-muted-foreground">
                  {profile.passwordChangedAt
                    ? new Date(profile.passwordChangedAt).toLocaleDateString()
                    : 'Initial Default'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Last Sign In:</span>
                <span className="font-mono text-muted-foreground">
                  {profile.lastLoginAt
                    ? new Date(profile.lastLoginAt).toLocaleString()
                    : 'Current Session'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* SECTION C: Active Login Sessions */}
          <Card className="shadow-xs border-border/80">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Laptop className="h-4 w-4 text-primary" />
                    Section C — Active Sessions
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Authorized browser sessions for this root account.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {sessions.length} Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {sessions.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No active session logs found.
                </div>
              ) : (
                sessions.map((session) => {
                  const isMobile = session.deviceType?.toLowerCase().includes('mobile');
                  const Icon = isMobile ? Smartphone : Laptop;

                  return (
                    <div
                      key={session.id}
                      className={`p-3 rounded-lg border text-xs space-y-2 transition-colors ${
                        session.isCurrent
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-border/70 bg-card hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-md bg-muted text-muted-foreground">
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              <span>{session.browser}</span>
                              <span className="text-muted-foreground font-normal">on</span>
                              <span>{session.operatingSystem}</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              IP: {session.ipAddress}
                            </div>
                          </div>
                        </div>

                        {session.isCurrent ? (
                          <Badge
                            variant="outline"
                            className="text-[9px] bg-primary/10 text-primary border-primary/30 uppercase font-mono font-bold shrink-0"
                          >
                            Current
                          </Badge>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={revokingSessionId === session.id}
                            onClick={() => handleRevokeSession(session.id)}
                            className="h-7 px-2 text-[11px] text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                            title="Revoke this session"
                          >
                            {revokingSessionId === session.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <LogOut className="h-3 w-3 mr-1" />
                                <span>Revoke</span>
                              </>
                            )}
                          </Button>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Logged in: {new Date(session.loginAt).toLocaleDateString()} at {new Date(session.loginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                        <span className="text-emerald-600 font-medium">Active</span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
            <CardFooter className="pt-0 text-[11px] text-muted-foreground border-t border-border/50 px-6 py-3">
              <span>Password updates automatically terminate all other non-current sessions for safety.</span>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
