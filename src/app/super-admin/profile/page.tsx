import * as React from 'react';
import { Metadata } from 'next';
import { getSuperAdminProfileAction } from '@/actions/super-admin-profile.actions';
import { SuperAdminProfileClient } from './super-admin-profile-client';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Root Admin Profile & Security | FRAMIQ Cloud',
  description: 'Manage root administrator credentials, 2FA OTP password security, and active sessions.',
};

export const dynamic = 'force-dynamic';

export default async function SuperAdminProfilePage() {
  const result = await getSuperAdminProfileAction();

  if (!result.success || !result.profile) {
    redirect('/super-admin');
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SuperAdminProfileClient
        initialProfile={result.profile}
        initialSessions={result.sessions || []}
      />
    </div>
  );
}
