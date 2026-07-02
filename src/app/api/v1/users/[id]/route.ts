import { NextResponse } from 'next/server';
import { UserService } from '@/services/user.service';
import { userSchema } from '@/lib/validations/user.schema';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = userSchema.partial().parse(body);
    const tenantId = 'default-tenant-id';
    
    const { roles, branches, ...userData } = parsed;
    
    const user = await UserService.updateUser(tenantId, id, null, userData, roles, branches);
    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const tenantId = 'default-tenant-id';
    
    const user = await UserService.deleteUser(tenantId, id, null);
    return NextResponse.json({ success: true, deleted: user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
