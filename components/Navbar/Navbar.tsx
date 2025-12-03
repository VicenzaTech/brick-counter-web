'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Factory,
    LayoutDashboard,
    LayoutGrid,
    Database,
    BarChart2,
    Notebook,
    ChevronLeft,
    Settings,
    BrickWall,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import styles from './Navbar.module.css';
import { authStateSelector, useAuthStore } from '@/store/auth.store';
import { useShallow } from 'zustand/shallow';
import UserInfo from '../UserInfo/UserInfo';

const navItems = [
    {
        href: '/dashboard',
        icon: LayoutDashboard,
        label: 'Tổng quan',
    },
    {
        href: '/production-history',
        icon: BarChart2,
        label: 'Lịch sử sản xuất',
    },
    {
        href: '/production-tracker',
        icon: BrickWall,
        label: 'Theo dõi sản xuất',
    },
    {
        href: '/brick-types',
        icon: Database,
        label: 'Quản lý dòng gạch',
    },
     {
        href: '/activity-logs',
        icon: Notebook,
        label: 'Nhật ký',
    },
    {
        href: '/device-dashboard',
        icon: Settings,
        label: 'Cài đặt',
    },
];

export default function Navbar() {
    const pathname = usePathname();
    const { user, isAuthenticated } = useAuthStore(useShallow(authStateSelector));
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        if (typeof document === 'undefined') return;
        const root = document.querySelector('.app-layout');
        if (!root) return;

        if (expanded) {
            root.classList.add('app-layout--sidebar-expanded');
        } else {
            root.classList.remove('app-layout--sidebar-expanded');
        }
    }, [expanded]);

    if (!isAuthenticated) {
        return null;
    }

    return (
        <aside
            className={`${styles.sidebar} ${expanded ? styles.sidebarExpanded : ''}`}
            aria-label="Điều hướng chính"
        >
            <div className={styles.sidebarInner}>
                <button
                    type="button"
                    className={styles.logoButton}
                    onClick={() => setExpanded((prev) => !prev)}
                    aria-label={expanded ? 'Thu gọn thanh điều hướng' : 'Mở rộng thanh điều hướng'}
                >
                    {/* {expanded ? <ChevronLeft size={18} /> : <Factory size={20} />} */}
                    {!expanded ? <img src="/logo-preview.png" style={{ width: 36, height: 36 }} alt="Logo" /> : <ChevronLeft size={18} />}
                    {/* Tooltip on hover when collapsed */}
                    {!expanded && (
                        <span className={styles.logoTooltip}>MỞ RỘNG</span>
                    )}
                </button>

                <nav className={styles.navGroup}>
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive =
                            pathname === item.href || pathname.startsWith(`${item.href}/`);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`${styles.navIconButton} ${isActive ? styles.navIconActive : ''
                                    }`}
                                aria-label={item.label}
                                aria-current={isActive ? 'page' : undefined}
                            >
                                <Icon size={18} />
                                <span className={styles.navLabel}>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className={styles.bottomSection}>
                    <UserInfo
                        username={user?.username}
                        role={user?.roles ?? ''}
                        mode={expanded ? 'full' : 'compact'}
                    />
                </div>
            </div>
        </aside>
    );
}
