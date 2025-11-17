'use client';

import { create } from 'zustand';
import { persist, createJSONStorage, devtools } from 'zustand/middleware';

export type Role = 'superadmin' | 'admin' | 'operator';

export interface AuthUser {
    id: string;
    username: string;
    email: string;
    roles: string;
    permissions?: string[];
}
// AuthUser: object: logged in | null: !session | undefined: !refresh

interface AuthState {
    user: AuthUser | null;
    accessToken: string | null;
    isAuthenticated: boolean;

    setAuth: (payload: { user: AuthUser; accessToken?: string }) => void;
    updateUser: (user: Partial<AuthUser>) => void;
    setAccessToken: (token: string | null) => void;
    clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
    devtools(
        persist(
            (set, get) => ({
                user: null,
                accessToken: null,
                isAuthenticated: false,

                setAuth: ({ user, accessToken }) =>
                    set({
                        user,
                        accessToken: accessToken ?? get().accessToken,
                        isAuthenticated: true,
                    }),

                updateUser: (partial) =>
                    set((state) =>
                        state.user
                            ? { user: { ...state.user, ...partial } }
                            : state
                    ),

                setAccessToken: (token) =>
                    set({
                        accessToken: token,
                        isAuthenticated: token ? true : get().isAuthenticated,
                    }),

                clearAuth: () =>
                    set({
                        user: null,
                        accessToken: null,
                        isAuthenticated: false,
                    }),
            }),
            {
                name: 'auth-store',
                storage: createJSONStorage(() => localStorage),
                /**
                 * - Persist user + isAuthenticated
                 * - KHÔNG persist accessToken
                 */
                partialize: (state) => ({
                    user: state.user,
                    isAuthenticated: state.isAuthenticated,
                    accessToken: state.accessToken
                }),
            }
        ),
        {
            name: 'auth-store',
            enabled: true
        }
    )
);

type AuthStoreState = AuthState

export const authStateSelector = (s: AuthStoreState) => ({
    user: s.user,
    isAuthenticated: s.isAuthenticated,
})

export const tokenStateSelector = (s: AuthStoreState) => ({
    accessToken: s.accessToken,
    isAuthenticated: s.isAuthenticated,
})

export const authActionsSelector = (s: AuthStoreState) => ({
    setAuth: s.setAuth,
    updateUser: s.updateUser,
    setAccessToken: s.setAccessToken,
    clearAuth: s.clearAuth,
})

//Replace flag: set((state) => newState, true)
