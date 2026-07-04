'use client';

import { useState } from 'react';
import { updateUserBranchesMappingAction } from '@/app/actions/user.branch.actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface BranchAssignmentFormProps {
  userId: string;
  allBranches: any[];
  initialAssignments: any[];
}

export function BranchAssignmentForm({ userId, allBranches, initialAssignments }: BranchAssignmentFormProps) {
  const [loading, setLoading] = useState(false);
  
  // Transform initial into a mutable map for UI state
  const initialMap = new Map();
  initialAssignments.forEach(a => {
    initialMap.set(a.branchId, { isPrimary: a.isPrimary, isActive: a.isActive });
  });

  const [assignments, setAssignments] = useState<Map<string, { isPrimary: boolean, isActive: boolean }>>(initialMap);
  const [primaryBranchId, setPrimaryBranchId] = useState<string | null>(
    initialAssignments.find(a => a.isPrimary)?.branchId || null
  );

  const handleToggleBranch = (branchId: string, checked: boolean) => {
    const nextMap = new Map(assignments);
    if (checked) {
      nextMap.set(branchId, { isPrimary: false, isActive: true });
      if (!primaryBranchId) {
        setPrimaryBranchId(branchId);
        nextMap.set(branchId, { isPrimary: true, isActive: true });
      }
    } else {
      nextMap.delete(branchId);
      if (primaryBranchId === branchId) {
        // Need to pick a new primary if there are any others left
        const firstRemaining = Array.from(nextMap.keys())[0];
        setPrimaryBranchId(firstRemaining || null);
        if (firstRemaining) {
          nextMap.set(firstRemaining, { isPrimary: true, isActive: true });
        }
      }
    }
    setAssignments(nextMap);
  };

  const handleSetPrimary = (branchId: string) => {
    if (!assignments.has(branchId)) return;
    setPrimaryBranchId(branchId);
    
    const nextMap = new Map(assignments);
    nextMap.forEach((val, key) => {
      nextMap.set(key, { ...val, isPrimary: key === branchId });
    });
    setAssignments(nextMap);
  };

  const onSave = async () => {
    setLoading(true);
    const mappings = Array.from(assignments.entries()).map(([branchId, data]) => ({
      branchId,
      isPrimary: branchId === primaryBranchId,
      isActive: data.isActive
    }));

    const result = await updateUserBranchesMappingAction(userId, mappings);
    setLoading(false);

    if (result.success) {
      toast.success('Branch assignments updated successfully');
    } else {
      toast.error(result.error || 'Failed to update branch assignments');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign Branches</CardTitle>
        <CardDescription>Select which branches this user can access and mark their primary default branch.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {allBranches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No branches available in the system.</p>
          ) : (
            <div className="space-y-4">
              {allBranches.map(branch => {
                const isAssigned = assignments.has(branch.id);
                const isPrimary = primaryBranchId === branch.id;

                return (
                  <div key={branch.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label className="text-base font-semibold">{branch.name}</Label>
                      <p className="text-sm text-muted-foreground">
                        Code: {branch.code || 'N/A'} {branch.isHeadOffice ? '(Head Office)' : ''}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      {isAssigned && (
                        <div className="flex items-center space-x-2">
                          <Label className={`text-sm cursor-pointer ${isPrimary ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                            {isPrimary ? 'Primary Branch' : 'Make Primary'}
                          </Label>
                          <Switch 
                            checked={isPrimary}
                            onCheckedChange={() => handleSetPrimary(branch.id)}
                            disabled={isPrimary} // Can't uncheck primary directly, must click another to make it primary
                          />
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2 border-l pl-6">
                        <Label className="text-sm">Access</Label>
                        <Switch 
                          checked={isAssigned}
                          onCheckedChange={(checked: boolean) => handleToggleBranch(branch.id, checked)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button onClick={onSave} disabled={loading || allBranches.length === 0}>
              {loading ? 'Saving...' : 'Save Assignments'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
