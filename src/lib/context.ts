import { auth } from '@/auth';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function getActiveContext() {
  const session = await auth();
  if (!session || !(session.user as any)?.tenantId) {
    return null;
  }

  const tenantId = (session.user as any).tenantId;
  const userId = session.user?.id;
  
  if (!userId) return null;

  // Read cookie
  const cookieStore = await cookies();
  const activeBranchIdCookie = cookieStore.get('active-branch-id');
  
  let branchId = activeBranchIdCookie?.value;

  // If no branchId in cookie or if we want to validate it against user's assigned branches
  // let's fetch user branches to be safe and ensure they have access.
  const userBranches = await prisma.userBranch.findMany({
    where: { userId, isActive: true, branch: { tenantId, isActive: true, deletedAt: null } },
    include: { branch: true }
  });

  if (userBranches.length === 0) {
    return { tenantId, branchId: null, userBranches: [] };
  }

  // Validate the cookie branchId belongs to the user
  const isValidCookieBranch = userBranches.some(ub => ub.branchId === branchId);

  if (!branchId || !isValidCookieBranch) {
    // Fallback to primary branch
    const primaryBranch = userBranches.find(ub => ub.isPrimary) || userBranches[0];
    branchId = primaryBranch.branchId;
    
    // We could set the cookie here, but cookies().set() is not allowed in Server Components 
    // unless called inside a Server Action or Route Handler.
    // So we just return the fallback.
  }

  return { tenantId, branchId, userBranches, activeBranch: userBranches.find(ub => ub.branchId === branchId)?.branch };
}
