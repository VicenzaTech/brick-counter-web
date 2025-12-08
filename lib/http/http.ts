'use client';

import { AuthUser, useAuthStore } from "@/store/auth.store";

type RefreshResponse = {
    tokens: {
        accessToken: string;
        refreshtoken: string;
    };
    user: AuthUser;
};

let isRefreshing = false;
let refreshPromise: Promise<Response> | null = null;
let forceLogoutPromise: Promise<Response> | null = null;

async function callRefresh() {
    if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
            method: "POST",
            credentials: "include",
        });
    }

    const res = await refreshPromise!;
    isRefreshing = false;
    refreshPromise = null;

    if (res.ok) {
        try {
            const json = (await res.clone().json()) as RefreshResponse;
            const { setAuth } = useAuthStore.getState();

            if (json?.user && json?.tokens?.accessToken) {
                setAuth({
                    user: json.user,
                    accessToken: json.tokens.accessToken,
                });
            }
        } catch {

        }
    }

    return res;
}

async function forceLogout() {
    if (!forceLogoutPromise) {
        forceLogoutPromise = fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout/force`, {
            method: "POST",
            credentials: "include",
            body: JSON.stringify({ force: true }),
        }).finally(() => {
            forceLogoutPromise = null;
        });
    }

    return forceLogoutPromise;
}

export async function apiFetch(
    input: string,
    init?: RequestInit & { retry?: boolean },
): Promise<Response> {
    const { accessToken } = useAuthStore.getState();
    const url = input.startsWith('http')
        ? input
        : `${process.env.NEXT_PUBLIC_API_URL}${input}`;

    const headers: Record<string, string> = {};

    if (init?.headers instanceof Headers) {
        init.headers.forEach((value, key) => {
            headers[key] = value;
        });
    } else if (Array.isArray(init?.headers)) {
        for (const [key, value] of init.headers ?? []) {
            headers[key] = value as string;
        }
    } else if (init?.headers) {
        Object.assign(headers, init.headers as Record<string, string>);
    }

    if (accessToken) {
        headers["authorization"] = `Bearer ${accessToken}`;
    }

    const res = await fetch(url, {
        ...init,
        credentials: "include",
        headers,
    });

    if (res.status !== 401) return res;

    if (init?.retry) {
        await forceLogout()
        if (typeof window !== "undefined") {
            const { clearAuth } = useAuthStore.getState();
            clearAuth();
            if (window.location.pathname !== "/auth") {
                window.location.href = "/auth";
            }
        }
        return res;
    }

    const refreshRes = await callRefresh();

    if (!refreshRes.ok) {
        if (refreshRes.status === 401) {
            await forceLogout()
        }
        if (typeof window !== 'undefined') {
            const { clearAuth } = useAuthStore.getState();
            clearAuth();
            if (window.location.pathname !== '/auth') {
                window.location.href = '/auth';
            }
        }

        return res;
    }

    return apiFetch(url, { ...init, retry: true });
}
