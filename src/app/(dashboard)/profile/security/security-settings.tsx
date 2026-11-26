'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShieldAlert,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  RotateCw,
  Eye,
  EyeOff,
  Lock,
} from 'lucide-react';

import {
  changePasswordWithOtpAction,
  requestProfileChangePasswordOtpAction,
  revokeSessionAction,
  revokeOtherSessionsAction,
} from '@/actions/auth.actions';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const profilePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    otp: z
      .string()
      .length(6, 'Please enter the 6-digit verification code')
      .regex(/^\d{6}$/, 'Code must be numbers only'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ProfilePasswordInput = z.infer<typeof profilePasswordSchema>;

export function SecuritySettings({ 
  userId, 
  tenantId,
  currentSessionId, 
  sessions,
  loginHistory
}: { 
  userId: string, 
  tenantId: string,
  currentSessionId: string, 
  sessions: any[],
  loginHistory: any[]
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isForcedReset = searchParams.get('forced') === 'true';

  const [isChangingPass, setIsChangingPass] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpNotice, setOtpNotice] = useState<string | null>(null);
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const form = useForm<ProfilePasswordInput>({
    resolver: zodResolver(profilePasswordSchema) as unknown as never,
    defaultValues: {
      currentPassword: '',
      otp: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const handleRequestOtp = async () => {
    const currentPass = form.getValues('currentPassword');
    if (!currentPass) {
      setPassError('Please enter your current password first before requesting an OTP code.');
      return;
    }

    setIsSendingOtp(true);
    setPassError(null);
    setOtpNotice(null);

    try {
      const res = await requestProfileChangePasswordOtpAction(currentPass);
      if (res.success) {
        setOtpSent(true);
        setOtpNotice(res.message || 'Verification code sent to your registered email.');
        setCooldown(60);
      } else {
        setPassError(res.error || 'Failed to dispatch verification code.');
      }
    } catch {
      setPassError('A network error occurred while dispatching OTP.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const onPasswordSubmit = async (data: ProfilePasswordInput) => {
    setIsChangingPass(true);
    setPassError(null);
    setPassSuccess(false);

    try {
      const res = await changePasswordWithOtpAction(
        data.currentPassword,
        data.otp,
        data.newPassword
      );

      if (res.success) {
        setPassSuccess(true);
        setOtpSent(false);
        setOtpNotice(null);
        form.reset();

        if (isForcedReset) {
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        }
      } else {
        setPassError(res.error || 'Failed to update password.');
      }
    } catch {
      setPassError('Failed to change password. Please check your credentials and try again.');
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleRevoke = async (sessionId: string) => {
    await revokeSessionAction(tenantId, userId, sessionId);
    router.refresh();
  };

  const handleRevokeAllOther = async () => {
    await revokeOtherSessionsAction(tenantId, userId, currentSessionId);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Forced Password Reset Banner */}
      {isForcedReset && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">
          <ShieldAlert className="h-5 w-5 mt-0.5 shrink-0 text-amber-400" />
          <div className="space-y-1">
            <h4 className="font-semibold text-amber-300">Mandatory Password Update Required</h4>
            <p className="text-sm text-amber-200/90 leading-relaxed">
              You are currently logged in with a temporary password provided by platform support. For enterprise security compliance, you must set a new confidential password before continuing into the ERP dashboard.
            </p>
          </div>
        </div>
      )}

      {/* Change Password Card */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Change Password</CardTitle>
              <CardDescription>
                Protected by 2-step verification: verify your current password and a 6-digit email OTP.
              </CardDescription>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-semibold">
              <ShieldCheck className="h-4 w-4" />
              <span>Email 2FA Enforced</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onPasswordSubmit)} className="space-y-4 max-w-lg">
              {passError && (
                <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p className="leading-snug">{passError}</p>
                </div>
              )}

              {otpNotice && (
                <div className="flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/10 p-3 text-sm text-primary">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                  <p className="leading-snug">{otpNotice}</p>
                </div>
              )}

              {passSuccess && (
                <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-500">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                  <p className="leading-snug">
                    Password updated successfully! {isForcedReset && 'Redirecting to your dashboard...'}
                  </p>
                </div>
              )}

              {/* 1. Current Password */}
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showCurrentPassword ? 'text' : 'password'}
                          placeholder="Enter your current password"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                          tabIndex={-1}
                        >
                          {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 2. Verification Code Section */}
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Email Security Verification</p>
                    <p className="text-[11px] text-muted-foreground">Dispatches a 6-digit verification code to your registered email.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRequestOtp}
                    disabled={isSendingOtp || cooldown > 0}
                    className="shrink-0 text-xs"
                  >
                    {isSendingOtp ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Sending...
                      </>
                    ) : cooldown > 0 ? (
                      `Resend in ${cooldown}s`
                    ) : (
                      <>
                        <Send className="mr-1.5 h-3.5 w-3.5" />
                        {otpSent ? 'Resend Code' : 'Send Code'}
                      </>
                    )}
                  </Button>
                </div>

                <FormField
                  control={form.control}
                  name="otp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">6-Digit Verification Code</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="123456"
                            maxLength={6}
                            disabled={!otpSent}
                            className="pl-9 font-mono text-base tracking-[0.3em] font-semibold"
                            {...field}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                              field.onChange(val);
                            }}
                          />
                        </div>
                      </FormControl>
                      {!otpSent && (
                        <p className="text-[11px] text-muted-foreground">
                          Click &quot;Send Code&quot; above to activate this verification field.
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 3. New Password */}
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showNewPassword ? 'text' : 'password'}
                          placeholder="Enter strong new password"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                          tabIndex={-1}
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 4. Confirm New Password */}
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Re-enter new password"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password strength checklist */}
              <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1 text-muted-foreground border border-border/50">
                <p className="font-semibold text-foreground/80 mb-1">Security Standard Requirements:</p>
                <div className="grid grid-cols-2 gap-1">
                  <span className={form.watch('newPassword')?.length >= 8 ? 'text-emerald-500 font-medium' : ''}>
                    ✓ 8+ characters
                  </span>
                  <span className={/[A-Z]/.test(form.watch('newPassword') || '') ? 'text-emerald-500 font-medium' : ''}>
                    ✓ 1+ uppercase letter
                  </span>
                  <span className={/[a-z]/.test(form.watch('newPassword') || '') ? 'text-emerald-500 font-medium' : ''}>
                    ✓ 1+ lowercase letter
                  </span>
                  <span className={/[0-9]/.test(form.watch('newPassword') || '') ? 'text-emerald-500 font-medium' : ''}>
                    ✓ 1+ number
                  </span>
                  <span className={/[^A-Za-z0-9]/.test(form.watch('newPassword') || '') ? 'text-emerald-500 font-medium' : ''}>
                    ✓ 1+ special symbol
                  </span>
                  <span className="text-muted-foreground">
                    ✓ Not used in last 5 passwords
                  </span>
                </div>
              </div>

              <Button type="submit" disabled={isChangingPass || !otpSent} className="w-full">
                {isChangingPass ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Verify OTP &amp; Update Password
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">Active Sessions</CardTitle>
            <CardDescription>Manage the devices currently logged into your account.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleRevokeAllOther}>
            Logout All Other Sessions
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-medium">{s.browser} on {s.operatingSystem}</div>
                    <div className="text-xs text-muted-foreground">{s.deviceType}</div>
                  </TableCell>
                  <TableCell>{s.ipAddress || 'Unknown'}</TableCell>
                  <TableCell>{new Date(s.loginAt).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {s.id === currentSessionId ? (
                      <span className="text-xs text-emerald-500 font-semibold px-2 py-1 rounded bg-emerald-500/10">
                        Current Session
                      </span>
                    ) : (
                      <Button variant="destructive" size="sm" onClick={() => handleRevoke(s.id)}>
                        Revoke
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Login History */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Login History</CardTitle>
          <CardDescription>Recent login and session history.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Login Time</TableHead>
                <TableHead>Logout Time</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loginHistory.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-medium">{s.browser} on {s.operatingSystem}</div>
                    <div className="text-xs text-muted-foreground">{s.deviceType}</div>
                  </TableCell>
                  <TableCell>{s.ipAddress || 'Unknown'}</TableCell>
                  <TableCell>{new Date(s.loginAt).toLocaleString()}</TableCell>
                  <TableCell>{s.logoutAt ? new Date(s.logoutAt).toLocaleString() : '-'}</TableCell>
                  <TableCell>
                    {s.id === currentSessionId ? (
                      <span className="text-xs text-emerald-500 font-medium">Current Session</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">{s.status}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
