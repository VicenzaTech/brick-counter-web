'use client'
import { authStateSelector, useAuthStore } from '@/store/auth.store';
import { ReactNode } from 'react';
import { useShallow } from 'zustand/shallow';
import styles from './PaddingContent.module.css'
import classNames from 'classnames';
export default function PaddingContent({ children }: { children: ReactNode }) {
    const { user, isAuthenticated } = useAuthStore(useShallow(authStateSelector));
    return (
        <div className={classNames(styles.container, { [styles.padding]: isAuthenticated })}>
            {children}
        </div>
    )
}
