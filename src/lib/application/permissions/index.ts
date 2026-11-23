import { PermissionError } from '../errors';

export interface UserContext {
  id: string;
  roles: string[];
  tenantId?: string;
  branchId?: string;
}

export class PermissionService {
  static hasRole(user: UserContext, role: string): boolean {
    return user.roles.includes(role);
  }

  static hasAnyRole(user: UserContext, roles: string[]): boolean {
    return roles.some(role => user.roles.includes(role));
  }

  static assertRole(user: UserContext, role: string): void {
    if (!this.hasRole(user, role)) {
      throw new PermissionError(`Requires role: ${role}`);
    }
  }

  static canView(user: UserContext, resource: string): boolean {
    return this.hasAnyRole(user, ['admin', 'manager', 'viewer']);
  }

  static canCreate(user: UserContext, resource: string): boolean {
    return this.hasAnyRole(user, ['admin', 'manager', 'editor']);
  }

  static canUpdate(user: UserContext, resource: string): boolean {
    return this.hasAnyRole(user, ['admin', 'manager', 'editor']);
  }

  static canDelete(user: UserContext, resource: string): boolean {
    return this.hasAnyRole(user, ['admin']);
  }
}
