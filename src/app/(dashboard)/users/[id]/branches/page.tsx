import { getUserBranchesAction } from '@/app/actions/user.branch.actions';
import { getBranchesAction } from '@/app/actions/branch.actions';
import { BranchAssignmentForm } from './branch-assignment-form';
import { redirect } from 'next/navigation';

export default async function UserBranchAssignmentPage({ params }: { params: { id: string } }) {
  const [userBranchesResult, allBranchesResult] = await Promise.all([
    getUserBranchesAction(params.id),
    getBranchesAction()
  ]);

  if (!userBranchesResult.success || !allBranchesResult.success) {
    redirect('/dashboard/users');
  }

  const assignedBranches = userBranchesResult.data || [];
  const allBranches = allBranchesResult.data || [];

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Branch Assignment</h2>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4">
          <BranchAssignmentForm 
            userId={params.id}
            allBranches={allBranches}
            initialAssignments={assignedBranches}
          />
        </div>
      </div>
    </div>
  );
}
