 
 
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { UserRepository } from '@/repositories/user.repository';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  // Use a hardcoded tenant ID for now as per our foundation setup
  const tenantId = '00000000-0000-0000-0000-000000000000';
  const user = await UserRepository.findById(tenantId, session.user.id);

  if (!user) {
    return <div>Profile not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">View your account details and preferences.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Your basic account details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-3 gap-4 border-b py-3 text-sm">
              <div className="font-medium text-muted-foreground">Name</div>
              <div className="col-span-2 font-medium">{user.name}</div>
            </div>
            <div className="grid grid-cols-3 gap-4 border-b py-3 text-sm">
              <div className="font-medium text-muted-foreground">Email</div>
              <div className="col-span-2 font-medium">{user.email}</div>
            </div>
            <div className="grid grid-cols-3 gap-4 border-b py-3 text-sm">
              <div className="font-medium text-muted-foreground">Phone</div>
              <div className="col-span-2 font-medium">{user.phone || 'N/A'}</div>
            </div>
            <div className="grid grid-cols-3 gap-4 py-3 text-sm">
              <div className="font-medium text-muted-foreground">Role</div>
              <div className="col-span-2 font-medium capitalize">{user.roles.map(r => r.role.name).join(', ').replace(/_/g, ' ')}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
