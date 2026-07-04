'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { updateRolePermissionsAction } from '@/app/actions/role.actions';
import { useRouter } from 'next/navigation';
import { Permission, RolePermission } from '@prisma/client';

export function PermissionMatrix({ 
  role, 
  groupedPermissions 
}: { 
  role: { id: string, name: string, isSystem: boolean, permissions: (RolePermission & { permission: Permission })[] }, 
  groupedPermissions: Record<string, Permission[]>
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  
  // Initialize state with currently assigned permissions
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(
    new Set(role.permissions.map(p => p.permissionId))
  );

  const togglePermission = (id: string) => {
    if (role.isSystem) return;
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleModule = (module: string, perms: Permission[]) => {
    if (role.isSystem) return;
    const allSelected = perms.every(p => selectedIds.has(p.id));
    const next = new Set(selectedIds);
    if (allSelected) {
      perms.forEach(p => next.delete(p.id));
    } else {
      perms.forEach(p => next.add(p.id));
    }
    setSelectedIds(next);
  };

  const onSave = async () => {
    setLoading(true);
    const res = await updateRolePermissionsAction(role.id, Array.from(selectedIds));
    setLoading(false);
    
    if (res.success) {
      toast.success('Permissions updated successfully.');
      router.refresh();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        {Object.entries(groupedPermissions).map(([moduleName, perms]) => {
          const allSelected = perms.every(p => selectedIds.has(p.id));
          const someSelected = perms.some(p => selectedIds.has(p.id));
          
          return (
            <Card key={moduleName}>
              <CardContent className="p-0">
                <div className="flex items-center justify-between border-b bg-muted/50 p-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      disabled={role.isSystem}
                      checked={allSelected ? true : someSelected ? true : false}
                      onCheckedChange={() => toggleModule(moduleName, perms)}
                      id={`mod-${moduleName}`}
                    />
                    <label 
                      htmlFor={`mod-${moduleName}`} 
                      className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {moduleName}
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 p-4 md:grid-cols-4 lg:grid-cols-5">
                  {perms.map(p => (
                    <div key={p.id} className="flex items-center space-x-2">
                      <Checkbox 
                        disabled={role.isSystem}
                        id={`perm-${p.id}`}
                        checked={selectedIds.has(p.id)}
                        onCheckedChange={() => togglePermission(p.id)}
                      />
                      <label 
                        htmlFor={`perm-${p.id}`} 
                        className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {p.action}
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!role.isSystem && (
        <div className="flex justify-end sticky bottom-4">
          <Button onClick={onSave} disabled={loading} size="lg" className="shadow-lg">
            {loading ? 'Saving...' : 'Save Permissions'}
          </Button>
        </div>
      )}
    </div>
  );
}
