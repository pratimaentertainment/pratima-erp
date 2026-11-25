import { auth } from '@/auth';
import { RoleService } from '@/services/role.service';
import { PermissionRepository } from '@/repositories/permission.repository';
import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { prisma } from '@/lib/prisma';

export const metadata = {
  title: 'Effective Permissions | FRAMIQ',
};

export default async function EffectivePermissionsPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const sessionUser = session?.user as any;
  if (!sessionUser?.tenantId) redirect('/login');

  const targetUserId = params.id;
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId, tenantId: sessionUser.tenantId }
  });

  if (!targetUser) {
    redirect('/dashboard/users');
  }

  // Use the RoleService cache / DB call
  const permissions = await RoleService.getEffectivePermissions(targetUserId);
  const allPermissionsGrouped = await PermissionRepository.findAllGroupedByModule();

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex flex-col space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">
          Effective Permissions: {targetUser.name}
        </h2>
        <p className="text-muted-foreground">
          This shows all active permissions for this user across all assigned roles. This is a read-only view.
        </p>
      </div>

      <div className="grid gap-6">
        {Object.entries(allPermissionsGrouped).map(([moduleName, perms]) => {
          // Check which permissions from this module the user has
          const userPerms = perms.filter(p => permissions.some(up => up.module === p.module && up.action === p.action));
          
          if (userPerms.length === 0) return null; // Hide modules they have no access to

          return (
            <Card key={moduleName}>
              <CardContent className="p-0">
                <div className="border-b bg-muted/50 p-4">
                  <h3 className="text-sm font-semibold">{moduleName}</h3>
                </div>
                <div className="flex flex-wrap gap-2 p-4">
                  {userPerms.map(p => (
                    <Badge key={p.id} variant="secondary">
                      {p.action}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
