'use client';

import { useState } from 'react';
import styles from './UserInfo.module.css';
import { Dialog } from '../Dialog/Dialog';
import { SwitchButton } from '../SwitchButton/SwitchButton';
import { apiFetch } from '@/lib/http/http';
import { useAuthStore } from '@/store/auth.store';

interface Props {
  username?: string;
  role?: string;
  mode?: 'compact' | 'full';
}

export default function UserInfo({ username, role, mode = 'full' }: Props) {
  const [open, setOpen] = useState(false);
  const [emailNotify, setEmailNotify] = useState(true);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const plantLabel = 'Nhà máy 1';

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

  const userInitials = (username || 'U').slice(0, 2);
  const isCompact = mode === 'compact';

  return (
    <>
      <button
        type="button"
        className={`${styles.userInfo} ${isCompact ? styles.userInfoCompact : styles.userInfoFull
          }`}
        onClick={() => setOpen(true)}
      >
        <div className={styles.userAvatar}>{userInitials}</div>
        {!isCompact && (
          <div className={styles.userDetails}>
            <span className={styles.userName}>{username}</span>
            <span className={styles.userPlant}>{plantLabel}</span>
          </div>
        )}
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Thông tin người dùng"
      >
        <div className={styles.dialogSection}>
          <p className={styles.dialogDescription}>
            Hệ thống IOT theo dõi sản lượng gạch men - cung cấp thông tin trực
            quan cho vận hành và tối ưu dây chuyền.
          </p>
          <p className={styles.dialogDescription}>@2025 Vincenza Tech Team</p>

          <div className={styles.metaRow}>
            <div>
              <span className={styles.metaLabel}>Người dùng</span>
              <span className={styles.metaValue}>{username}</span>
            </div>
            <div>
              <span className={styles.metaLabel}>Vai trò</span>
              <span className={styles.metaValue}>{role}</span>
            </div>
            <div>
              <span className={styles.metaLabel}>Phiên bản</span>
              <span className={styles.metaValue}>v1.0.0</span>
            </div>
          </div>
        </div>

        <div className={styles.dialogSection}>
          <h4 className={styles.sectionTitle}>Tuỳ chọn người dùng</h4>

          <div className={styles.preferenceRow}>
            <div>
              <p className={styles.prefLabel}>Email thông báo</p>
              <p className={styles.prefDescription}>
                Nhận email khi có hoạt động quan trọng liên quan tới tài khoản.
              </p>
            </div>
            <SwitchButton checked={emailNotify} onChange={setEmailNotify} />
          </div>
        </div>

        <div className={styles.actionsRow}>
          <button type="button" className={styles.secondaryButton}>
            Hướng dẫn sử dụng
          </button>
          <button
            onClick={handleLogout}
            type="button"
            className={styles.primaryButton}
          >
            Đăng xuất
          </button>
        </div>
      </Dialog>
    </>
  );
}

