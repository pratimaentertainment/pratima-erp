import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { serializePrisma } from '@/lib/serialize';
import { AgreementBuilderClient } from './agreement-builder-client';

export const metadata = {
  title: 'Agreement Templates | FRAMIQ',
  description: 'Design and manage legal document templates, freelancer NDAs, and quotation terms.',
};

export default async function AgreementsSettingsPage() {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.tenantId) {
    redirect('/login');
  }

  const templates = await prisma.documentTemplate.findMany({
    where: {
      tenantId: user.tenantId,
      deletedAt: null,
    },
    include: {
      userAgreements: {
        where: { deletedAt: null },
        select: { id: true, status: true, userId: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Agreement & Contract Builder</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Create standardized legal agreements with dynamic placeholders for freelancer onboarding and event shoots.
        </p>
      </div>

      <AgreementBuilderClient initialTemplates={serializePrisma(templates)} />
    </div>
  );
}
