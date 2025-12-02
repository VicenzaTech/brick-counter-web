'use client';

import {
    AuthUser,
    authStateSelector,
    useAuthStore,
} from '@/store/auth.store';
import { ReactNode, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useShallow } from 'zustand/shallow';
import { apiFetch } from '../http/http';
import Loading from '@/components/Loading/Loading';

type Props = {
    initialUser: AuthUser | null | undefined;
    children: ReactNode;
    accessToken?: string;
    /** UI hiển thị trong lúc đang fetch session nếu initialUser = null */
    fallback?: ReactNode;
};

type SessionResponse = {
    user?: AuthUser;
};

const LOGIN_ROUTE = '/auth';

export function AuthProvider({
    initialUser,
    children,
    accessToken,
    fallback,
}: Props) {
    const { user, isAuthenticated } = useAuthStore(
        useShallow(authStateSelector),
    );
    const setAuth = useAuthStore((s) => s.setAuth);
    const clearAuth = useAuthStore((s) => s.clearAuth);
    const pathname = usePathname();

    // Chỉ loading khi chưa có initialUser và không ở trang /auth
    const [isLoading, setIsLoading] = useState<boolean>(
        !initialUser && pathname !== LOGIN_ROUTE,
    );

    useEffect(() => {
        let mounted = true;

        // Nếu server đã truyền user xuống sẵn => hydrate store và dừng
        if (initialUser) {
            setAuth({ user: initialUser, accessToken });
            setIsLoading(false);
            return;
        }

        // Nếu đang ở trang /auth, không cần fetch session (tránh loop + không chặn UI login)
        if (pathname === LOGIN_ROUTE) {
            clearAuth();
            setIsLoading(false);
            return;
        }

        // Nếu đã có user persist trong store thì dùng luôn, không fetch lại
        if (user && isAuthenticated) {
            setIsLoading(false);
            return;
        }

        async function fetchSession() {
            setIsLoading(true);
            try {
                const res = await apiFetch('/api/auth/me', { method: 'GET' });

                if (!mounted) return;

                if (!res.ok) {
                    clearAuth();
                    setIsLoading(false);
                    return;
                }

                const json = (await res.json()) as SessionResponse;

                if (!json.user) {
                    clearAuth();
                    setIsLoading(false);
                    return;
                }

                setAuth({
                    user: json.user,
                });
            } catch (_err) {
                if (!mounted) return;
                clearAuth();
            } finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        }

        fetchSession();

        return () => {
            mounted = false;
        };
    }, [
        initialUser,
        accessToken,
        pathname,
        user,
        isAuthenticated,
        setAuth,
        clearAuth,
    ]);

    // Fallback trong lúc đang hydrate session lần đầu (trừ trang /auth)
    if (isLoading && !initialUser && pathname !== LOGIN_ROUTE) {
        if (fallback) return <>{fallback}</>;
        return <Loading />;
    }

    return <>{children}</>;
}

