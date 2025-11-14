'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Factory, LayoutDashboard, Database, Activity, Menu, X, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import styles from './Navbar.module.css';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/device-dashboard', label: 'Phân tích thiết bị', icon: Activity },
  { href: '/analytics', label: 'Phân tích sản xuất', icon: TrendingUp },
  { href: '/data-center', label: 'Trung tâm dữ liệu', icon: Database },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className={styles.navbar}>
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
        <div className={styles.userInfo}>
          <div className={styles.userAvatar}>VT</div>
          <div className={styles.userDetails}>
            <span className={styles.userName}>VicenzaTech</span>
            <span className={styles.userRole}>Administrator</span>
          </div>
        </div>

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
