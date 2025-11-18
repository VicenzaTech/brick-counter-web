import { AuthUser, Role } from "@/store/auth.store";

export function hasRole(user: AuthUser | null | undefined, role: Role) {
    return !!user?.roles?.includes(role);
}

export function hasAnyRole(user: AuthUser | null | undefined, roles: Role[]) {
    if (!user) return false;
    return roles.some((r) => user.roles.includes(r));
}

export function hasPermission(user: AuthUser | null | undefined, perm: string) {
    return !!user?.permissions?.includes(perm);
}
