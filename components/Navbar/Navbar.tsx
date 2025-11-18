'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Factory, LayoutDashboard, Database, Activity, Menu, X, TrendingUp, Box } from 'lucide-react';
import { useState } from 'react';
import styles from './Navbar.module.css';
import { authStateSelector, useAuthStore } from '@/store/auth.store';
import { useShallow } from 'zustand/shallow';
import UserInfo from '../UserInfo/UserInfo';

const navItems = [
    // { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/device-dashboard', label: 'Phân tích thiết bị', icon: Activity },
    { href: '/analytics', label: 'Phân tích theo dây chuyền', icon: TrendingUp },
    { href: '/brick-analytics', label: 'Phân tích theo dòng gạch', icon: Box },
    { href: '/brick-types', label: 'Quản lý dòng gạch', icon: Database },
];

export default function Navbar() {
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { user, isAuthenticated } = useAuthStore(useShallow(authStateSelector))
    return (
        isAuthenticated && <nav className={styles.navbar}>
            <div className={styles.container}>
                {/* Logo */}
                <Link href="/" className={styles.logo}>
                    <Factory size={32} />
                    <div className={styles.logoText}>
                        <span className={styles.logoTitle}>VicenzaTech</span>
                        <span className={styles.logoSubtitle}>Tile Counter System</span>
                    </div>
                </Link>

                {/* Desktop Navigation */}
                <div className={styles.navLinks}>
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`${styles.navLink} ${isActive ? styles.active : ''}`}
                            >
                                <Icon size={20} />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </div>

                {/* User Info */}
                <UserInfo username={user?.username} role={user?.roles ?? ""} />

                {/* Mobile Menu Button */}
                <button
                    className={styles.menuButton}
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label="Toggle menu"
                >
                    {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Navigation */}
            {isMenuOpen && (
                <div className={styles.mobileNav}>
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`${styles.mobileNavLink} ${isActive ? styles.active : ''}`}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                <Icon size={20} />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            )}
        </nav>
    );
}
