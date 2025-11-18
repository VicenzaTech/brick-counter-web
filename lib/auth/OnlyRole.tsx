'use client';

import { Role, useAuthStore } from '@/store/auth.store';
import { ReactNode } from 'react';
import { hasAnyRole } from './rbarc';

type Props = {
    roles: Role[];
    children: ReactNode;
    fallback?: ReactNode;
};

export function OnlyRoles({ roles, children, fallback = null }: Props) {
    const user = useAuthStore((s) => s.user);
    if (!hasAnyRole(user, roles)) return <>{fallback}</>;
    return <>{children}</>;
}
