'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { fetchAvailableStaffAction, assignStaffAction } from '@/actions/staff.actions';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, UserPlus, Star } from 'lucide-react';
import { toast } from 'sonner';

export const STAFF_ROLES = [
  'PHOTOGRAPHER',
  'VIDEOGRAPHER',
  'DRONE_PILOT',
  'EDITOR',
  'ALBUM_DESIGNER',
  'GRAPHIC_DESIGNER',
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

interface StaffAssignmentManagerProps {
  shootId?: string;
  subEventId?: string;
}

export function StaffAssignmentManager({ shootId, subEventId }: StaffAssignmentManagerProps) {
  const targetId = subEventId || shootId || '';
  const [selectedRole, setSelectedRole] = useState<StaffRole | ''>('');
  const [freelancers, setFreelancers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, startTransition] = useTransition();

  const roles = STAFF_ROLES;

  useEffect(() => {
    if (!selectedRole) {
      setFreelancers([]);
      return;
    }
    
    let isMounted = true;
    const fetchStaff = async () => {
      setIsLoading(true);
      try {
        const response = await fetchAvailableStaffAction(selectedRole);
        if (response.success && isMounted) {
          setFreelancers(response.data);
        } else if (!response.success) {
          toast.error(response.error || 'Failed to fetch freelancers');
        }
      } catch {
        toast.error('Unexpected error fetching staff');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    
    fetchStaff();
    return () => { isMounted = false; };
  }, [selectedRole]);

  const handleAssign = (userId: string) => {
    if (!selectedRole || !targetId) return;
    
    startTransition(async () => {
      try {
        const response = await assignStaffAction(targetId, userId, selectedRole);
        if (response.success) {
          toast.success(response.message || 'Staff assigned successfully');
        } else {
          toast.error(response.error || 'Failed to assign staff');
        }
      } catch {
        toast.error('Unexpected error assigning staff');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Select Role to Fill</label>
        <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as StaffRole)}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select a role..." />
          </SelectTrigger>
          <SelectContent>
            {roles.map(role => (
              <SelectItem key={role} value={role}>{role.replace('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : freelancers.length > 0 ? (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Daily Rate</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {freelancers.map((freelancer) => (
                <TableRow key={freelancer.id}>
                  <TableCell className="font-medium">
                    {freelancer.user.name}
                    <div className="text-xs text-muted-foreground">{freelancer.user.email}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {freelancer.averageRating ? Number(freelancer.averageRating).toFixed(1) : 'New'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {freelancer.dailyRate ? `$${Number(freelancer.dailyRate).toFixed(2)}` : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleAssign(freelancer.user.id)}
                      disabled={isAssigning}
                    >
                      {isAssigning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                      Assign
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : selectedRole ? (
        <div className="text-center p-8 border rounded-md bg-muted/20 text-muted-foreground">
          No available freelancers found for this role.
        </div>
      ) : null}
    </div>
  );
}
