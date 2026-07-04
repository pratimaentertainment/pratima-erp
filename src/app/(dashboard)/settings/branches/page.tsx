import { getBranchesAction } from '@/app/actions/branch.actions';
import { BranchTable } from './branch-table';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function BranchesPage() {
  const result = await getBranchesAction();
  
  if (!result.success) {
    redirect('/dashboard');
  }

  const branches = result.data || [];

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Branches</h2>
      </div>
      <BranchTable data={branches} />
    </div>
  );
}
