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
}

export default function UserInfo({ username, role }: Props) {
    const [open, setOpen] = useState(false);
    const [emailNotify, setEmailNotify] = useState(true);
    const clearAuth = useAuthStore(s => s.clearAuth)
    const handleLogout = async () => {
        const logoutResult = await apiFetch('/api/auth/logout', {
            method: 'POST',
        })
        if (!logoutResult.ok) {
            // warn the error
            return;
        }

        const logoutData = await logoutResult.json()
        if (logoutData?.sessionId) {
            clearAuth()
            window.location.href = '/auth'
        }
    }

    return (
        <>
            {/* Navbar user info */}
            <button
                type="button"
                className={styles.userInfo}
                onClick={() => setOpen(true)}
            >
                <div className={styles.userAvatar}>{username?.slice(0, 2)}</div>
                <div className={styles.userDetails}>
                    <span className={styles.userName}>{username}</span>
                    <span className={styles.userRole}>{role}</span>
                </div>
            </button>

            {/* Dialog when click user info */}
            <Dialog open={open} onClose={() => setOpen(false)} title="Thông tin ứng dụng">
                <div className={styles.dialogSection}>
                    <p className={styles.dialogDescription}>
                        Hệ thống IOT tự động hóa - cung cấp thông tin trực quan trong vận hành khâu sản xuất
                    </p>
                    <p className={styles.dialogDescription}>
                        @2025 Vincenza Tech Team
                    </p>

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
                                Nhận email khi có hoạt động quan trọng trên tài khoản.
                            </p>
                        </div>
                        <SwitchButton checked={emailNotify} onChange={setEmailNotify} />
                    </div>

                    {/* <div className={styles.preferenceRow}>
                        <div>
                            <p className={styles.prefLabel}>Tự động đăng xuất</p>
                            <p className={styles.prefDescription}>
                                Tự đăng xuất sau 15 phút không hoạt động để tăng bảo mật.
                            </p>
                        </div>
                        <SwitchButton checked={autoLogout} onChange={setAutoLogout} />
                    </div> */}
                </div>

                <div className={styles.actionsRow}>
                    <button type="button" className={styles.primaryButton}>
                        Hướng dẫn sử dụng
                    </button>
                    <button onClick={handleLogout} type="button" className={styles.primaryButton}>
                        Đăng xuất
                    </button>
                </div>
            </Dialog>
        </>
    );
}
