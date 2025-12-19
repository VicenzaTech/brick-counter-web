'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
    LayoutDashboard,
    BarChart2,
    Factory,
    Database,
    Notebook,
    Settings,
    LogOut,
    Menu,
    X,
} from 'lucide-react';
import styles from './Navbar.module.css';
import { authStateSelector, useAuthStore } from '@/store/auth.store';
import { useShallow } from 'zustand/shallow';
import UserInfo from '../UserInfo/UserInfo';
import Separator from '../Separator/Separator';
import Image from 'next/image';
import { apiFetch } from '@/lib/http/http';

const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Tổng quan' },
    { href: '/production-history', icon: BarChart2, label: 'Lịch sử sản xuất' },
    { href: '/production-tracker', icon: Factory, label: 'Theo dõi sản xuất' },
    { href: '/brick-types', icon: Database, label: 'Quản lý dòng gạch' },
    { href: '/activity-logs', icon: Notebook, label: 'Nhật ký' },
    { href: '/device-dashboard', icon: Settings, label: 'Cài đặt' },
];

export default function Navbar() {
    const pathname = usePathname();
    const isCompareDashboard = pathname?.startsWith('/compare-dashboard');
    const { user, isAuthenticated } = useAuthStore(useShallow(authStateSelector));
    const [menuOpen, setMenuOpen] = useState(false);
    const clearAuth = useAuthStore((s) => s.clearAuth);

    useEffect(() => {
        if (!menuOpen) {
            return;
        }
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [menuOpen]);

    if (!isAuthenticated) {
        return null;
    }

    const handleLogout = async () => {
        const logoutResult = await apiFetch('/auth/logout', {
            method: 'POST',
        });
        if (!logoutResult.ok) {
            return;
        }
        clearAuth();
        window.location.href = '/auth';
    };

    const closeMenu = () => setMenuOpen(false);

    return (
        <aside className={styles.sidebar} aria-label="Thanh điều hướng chính">
            <div className={styles.sidebarInner}>
                <div className={styles.brandRow}>
                    <div className={styles.brandArea}>
                        {/* <div className={styles.brandIcon}>
                            <span>BP</span>
                        </div> */}
                        <Image alt={'Logo'} src={'/logo-preview.png'} width={52} height={52} />
                        <div className={styles.brandMeta}>
                            <p className={styles.brandTitle}>Admin Panel</p>
                            <span className={styles.brandSubtitle}>Quản lý sản xuất</span>
                        </div>
                    </div>
                    <button
                        type="button"
                        className={styles.menuToggle}
                        aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
                        onClick={() => setMenuOpen(true)}
                    >
                        <Menu size={20} />
                    </button>
                </div>

                <div className={styles.divider}>
                    <Separator />
                </div>

                <nav className={styles.navGroup}>
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                                aria-current={isActive ? 'page' : undefined}
                            >
                                <Icon size={18} />
                                <span className={styles.navLabel}>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {isCompareDashboard && (
                    <div className={styles.navContextRow}>
                        <span className={styles.navContextDot} aria-hidden="true" />
                        <div className={styles.navContextCopy}>
                            <span>So sánh hiệu suất</span>
                            <small>/compare-dashboard</small>
                        </div>
                    </div>
                )}

                <div className={styles.divider}>
                    <Separator />
                </div>

                <div className={styles.bottomSection}>
                    <UserInfo username={user?.username} role={user?.roles ?? ''} mode="full" />
                    <button type="button" className={styles.logoutButton}>
                        <LogOut size={18} />
                        <div>
                            <span className={styles.logoutLabel}>Đăng xuất</span>
                        </div>
                    </button>
                </div>
            </div>
            {menuOpen && (
                <div
                    className={styles.mobileMenuOverlay}
                    role="dialog"
                    aria-modal="true"
                    onClick={closeMenu}
                >
                    <div
                        className={styles.mobileMenuSheet}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className={styles.mobileMenuHeader}>
                            <div className={styles.brandArea}>
                                <div className={styles.brandIcon}>
                                    <span>BP</span>
                                </div>
                                <div className={styles.brandMeta}>
                                    <p className={styles.brandTitle}>BrickPro</p>
                                    <span className={styles.brandSubtitle}>Quản lí sản xuất</span>
                                </div>
                            </div>
                            <button
                                type="button"
                                className={styles.menuToggle}
                                aria-label="Đóng menu"
                                onClick={closeMenu}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <nav className={styles.mobileNavList}>
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                                        aria-current={isActive ? 'page' : undefined}
                                        onClick={closeMenu}
                                    >
                                        <Icon size={18} />
                                        <span className={styles.navLabel}>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                        <div className={styles.mobileActions}>
                            <UserInfo username={user?.username} role={user?.roles ?? ''} mode="full" />
                            <button onClick={handleLogout} type="button" className={styles.logoutButton}>
                                <LogOut size={18} />
                                <div>
                                    <span className={styles.logoutLabel}>Đăng xuất</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
}
