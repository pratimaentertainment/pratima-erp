'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { changePasswordAction, revokeSessionAction, revokeOtherSessionsAction } from '@/app/actions/auth.actions';
import { useRouter } from 'next/navigation';

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

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type PasswordInput = z.infer<typeof passwordSchema>;

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
  const [isChangingPass, setIsChangingPass] = React.useState(false);
  const [passError, setPassError] = React.useState<string | null>(null);
  const [passSuccess, setPassSuccess] = React.useState(false);

  const form = useForm<PasswordInput>({
    resolver: zodResolver(passwordSchema) as unknown as never,
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onPasswordSubmit = async (data: PasswordInput) => {
    setIsChangingPass(true);
    setPassError(null);
    setPassSuccess(false);

    const res = await changePasswordAction(userId, data.currentPassword, data.newPassword);
    setIsChangingPass(false);
    
    if (res.success) {
      setPassSuccess(true);
      form.reset();
    } else {
      setPassError(res.error || 'Failed to change password.');
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
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your password to keep your account secure.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onPasswordSubmit)} className="space-y-4 max-w-sm">
              {passError && (
                <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm">
                  {passError}
                </div>
              )}
              {passSuccess && (
                <div className="bg-primary/15 text-primary p-3 rounded-md text-sm">
                  Password updated successfully.
                </div>
              )}
              
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isChangingPass}>
                {isChangingPass ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Active Sessions</CardTitle>
            <CardDescription>Manage the devices currently logged into your account.</CardDescription>
          </div>
          <Button variant="outline" onClick={handleRevokeAllOther}>
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
                <TableHead></TableHead>
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
                      <span className="text-sm text-primary font-medium">Current Session</span>
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

      <Card>
        <CardHeader>
          <CardTitle>Login History</CardTitle>
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
                      <span className="text-sm text-primary font-medium">Current Session</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">{s.status}</span>
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
