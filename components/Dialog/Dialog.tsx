import { ReactNode, MouseEvent } from 'react';
import styles from './Dialog.module.css';

interface DialogProps {
    open: boolean;
    title?: string;
    onClose: () => void;
    children: ReactNode;
}

export function Dialog({ open, title, onClose, children }: DialogProps) {
    if (!open) return null;

    const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div className={styles.container} onClick={handleBackdropClick}>
            <div className={styles.backdrop}></div>
            <div className={styles.dialog}>
                <div className={styles.header}>
                    {title && <h3 className={styles.title}>{title}</h3>}
                    <button
                        type="button"
                        className={styles.closeButton}
                        onClick={onClose}
                        aria-label="Đóng"
                    >
                        ×
                    </button>
                </div>
                <div className={styles.body}>{children}</div>
            </div>
        </div>
    );
}
