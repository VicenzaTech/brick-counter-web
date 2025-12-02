'use client';

import { Product, StageState } from '@/app/production-tracker/types';
import { X } from 'lucide-react';
import styles from '../ProductionTracker.module.css';

interface StageActionsDialogProps {
    open: boolean;
    stage: string;
    lineId: number | null;
    state: StageState;
    product: Product | null;
    onClose: () => void;
    onConfirmStop: (lineId: number, stage: string, emergency: boolean) => void;
    onStart: (lineId: number, stage: string) => void | Promise<void>;
    onOpenProductDialog: (lineId: number, stage: string) => void;
    onLog: (lineId: number, stage: string) => void;
    onResume: (lineId: number, stage: string) => void;
}

export function StageActionsDialog({
    open,
    stage,
    lineId,
    state,
    product,
    onClose,
    onConfirmStop,
    onStart,
    onOpenProductDialog,
    onLog,
    onResume,
}: StageActionsDialogProps) {
    if (!open || lineId === null) {
        return null;
    }

    const statusLabel =
        state.status === 'running' ? 'Đang chạy' : state.status === 'waiting_log' ? 'Chờ chốt' : 'Đang dừng';

    const isWaiting = state.status === 'waiting_log';
    const isRunning = state.status === 'running';
    const isStopped = state.status === 'stopped';
    const productActionLabel = state.productId ? 'Đổi dòng gạch' : 'Chọn dòng gạch';

    const handleStop = (emergency: boolean) => {
        onConfirmStop(lineId, stage, emergency);
    };

    const handleStart = () => {
        if (!state.productId) return;
        void onStart(lineId, stage);
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.stageActionsDialog}>
                <div className={styles.stageActionsHeader}>
                    <div>
                        <p className={styles.stageActionsLabel}>Hành động cho công đoạn</p>
                        <h3 className={styles.stageActionsTitle}>{stage}</h3>
                    </div>
                    <button type="button" className={styles.stageActionsClose} onClick={onClose} aria-label="Đóng">
                        <X size={18} />
                    </button>
                </div>
                <div className={styles.stageActionsInfo}>
                    <div>
                        <p className={styles.stageActionsInfoLabel}>Dòng gạch</p>
                        <p className={styles.stageActionsInfoValue}>{product ? product.name : 'Chưa chọn'}</p>
                    </div>
                    <div>
                        <p className={styles.stageActionsInfoLabel}>Trạng thái</p>
                        <p className={`${styles.stageActionsInfoValue} ${styles.stageActionsStatus}`}>{statusLabel}</p>
                    </div>
                </div>
                {isRunning && (
                    <div className={styles.stageActionsPrimary}>
                        <button
                            type="button"
                            className={`${styles.stageActionsButton} ${styles.stageActionsButtonDanger}`}
                            onClick={() => handleStop(false)}
                        >
                            Tạm dừng công đoạn
                        </button>
                        <button
                            type="button"
                            className={`${styles.stageActionsButton} ${styles.stageActionsButtonEmergency}`}
                            onClick={() => handleStop(true)}
                        >
                            Dừng khẩn cấp
                        </button>
                        <button
                            type="button"
                            className={`${styles.stageActionsButton} ${styles.stageActionsButtonBlue}`}
                            onClick={() => onOpenProductDialog(lineId, stage)}
                        >
                            Đổi dòng gạch
                        </button>
                    </div>
                )}

                {isWaiting && (
                    <div className={styles.stageActionsPrimary}>
                        <button
                            type="button"
                            className={`${styles.stageActionsButton} ${styles.stageActionsButtonBlue}`}
                            onClick={() => onLog(lineId, stage)}
                        >
                            Chốt sản lượng
                        </button>
                        <button
                            type="button"
                            className={`${styles.stageActionsButton} ${styles.stageActionsButtonNeutral}`}
                            onClick={() => onResume(lineId, stage)}
                        >
                            Quay lại sản xuất
                        </button>
                    </div>
                )}

                {isStopped && (
                    <div className={styles.stageActionsPrimary}>
                        <button
                            type="button"
                            className={`${styles.stageActionsButton} ${styles.stageActionsButtonBlue}`}
                            onClick={() => onOpenProductDialog(lineId, stage)}
                        >
                            {productActionLabel}
                        </button>
                        <button
                            type="button"
                            className={`${styles.stageActionsButton} ${styles.stageActionsButtonGreen}`}
                            disabled={!state.productId}
                            onClick={handleStart}
                        >
                            Khởi động
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
