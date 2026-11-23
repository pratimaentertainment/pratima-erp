import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { serializePrisma } from '@/lib/serialize';
import { TeamManagementClient } from './team-management-client';

export const metadata = {
  title: 'Team & Dynamic Agreements | Pratima ERP',
  description: 'Manage in-house staff, freelance specialists, skill profiles, and dynamic legal agreements.',
};

export default async function TeamSettingsPage() {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.tenantId) {
    redirect('/login');
  }

  const [teamMembers, templates] = await Promise.all([
    prisma.user.findMany({
      where: {
        tenantId: user.tenantId,
        deletedAt: null,
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        userAgreements: {
          where: { deletedAt: null },
          include: {
            template: true,
          },
        },
      },
      orderBy: [
        { employmentType: 'asc' },
        { name: 'asc' },
      ],
    }),
    prisma.documentTemplate.findMany({
      where: {
        tenantId: user.tenantId,
        deletedAt: null,
        isActive: true,
      },
      select: { id: true, name: true, type: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Team & Dynamic Agreements</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Oversee in-house staff, freelance artists, equipment profiles, compliance, and dynamic legal agreements.
        </p>
      </div>

      <TeamManagementClient
        initialTeam={serializePrisma(teamMembers)}
        templates={serializePrisma(templates)}
      />
    </div>
  );
}
