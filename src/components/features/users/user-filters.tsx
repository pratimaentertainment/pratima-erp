 
 
'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

interface UserFiltersProps {
  roles: any[];
}

export function UserFilters({ roles }: UserFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = React.useState(searchParams.get('search') || '');
  const [status, setStatus] = React.useState<string>(searchParams.get('status') || 'all');
  const [role, setRole] = React.useState<string>(searchParams.get('role') || 'all');

  const handleApply = () => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (search) params.set('search', search);
    else params.delete('search');

    if (status !== 'all') params.set('status', status);
    else params.delete('status');

    if (role !== 'all') params.set('role', role);
    else params.delete('role');

    router.push(`${pathname}?${params.toString()}`);
  };

  const handleReset = () => {
    setSearch('');
    setStatus('all');
    setRole('all');
    router.push(pathname);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-4">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <Select value={role} onValueChange={(v) => setRole(v || 'all')}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Roles" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Roles</SelectItem>
          {roles.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={status} onValueChange={(v) => setStatus(v || 'all')}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="ACTIVE">Active</SelectItem>
          <SelectItem value="INACTIVE">Inactive</SelectItem>
        </SelectContent>
      </Select>
      <Button onClick={handleApply}>Apply</Button>
      <Button variant="ghost" onClick={handleReset}>
        <X className="h-4 w-4 mr-2" /> Reset
      </Button>
    </div>
  );
}
