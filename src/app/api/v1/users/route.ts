 
 
import { NextResponse } from 'next/server';
import { UserService } from '@/services/user.service';
import { userSchema } from '@/lib/validations/user.schema';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const skip = Number(searchParams.get('skip')) || 0;
  const take = Number(searchParams.get('take')) || 10;
  const search = searchParams.get('search') || undefined;
  
  // Hardcoded for now. Would use session in real app
  const tenantId = 'default-tenant-id';

  try {
    const data = await UserService.getUsers(tenantId, { skip, take, search });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = userSchema.parse(body);
    const tenantId = 'default-tenant-id';
    
    const { roles, branches, ...userData } = parsed;
    
    // Pass null for performedBy when invoked externally without session context (or extract from API token later)
    const user = await UserService.createUser(tenantId, null, userData, roles, branches);
    return NextResponse.json(user, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
