'use client';

import { Product, StageState } from '@/app/production-tracker/types';
import {
    Play,
    Pause,
    AlertTriangle,
    TrendingUp,
    RotateCcw,
    Package,
    Clock,
    MoreHorizontal,
    Link2,
    RefreshCw,
} from 'lucide-react';
import styles from '../ProductionTracker.module.css';

interface StageCardProps {
    lineId: number | null;
    stage: string;
    state: StageState;
    product: Product | null;
    maxQuantityForLine: number;
    runningTime: string;
    processingStage: string | null;
    onStart: (lineId: number, stage: string) => Promise<void> | void;
    onStop: (lineId: number, stage: string, emergency: boolean) => void;
    onLog: (lineId: number, stage: string) => void;
    onResume: (lineId: number, stage: string) => void;
    onOpenProductDialog: (lineId: number, stage: string) => void;
}

const STATUS_MAP = {
    running: {
        label: 'Đang chạy',
        chipClass: styles.stageStatusChipRunning,
    },
    waiting_log: {
        label: 'Chờ chốt',
        chipClass: styles.stageStatusChipWaiting,
    },
    stopped: {
        label: 'Đang dừng',
        chipClass: styles.stageStatusChipStopped,
    },
} as const;

export default function StageCard({
    lineId,
    stage,
    state,
    product,
    maxQuantityForLine,
    runningTime,
    processingStage,
    onStart,
    onStop,
    onLog,
    onResume,
    onOpenProductDialog,
}: StageCardProps) {
    const resolvedStatus = (state.status ?? 'stopped') as keyof typeof STATUS_MAP;
    const statusInfo =
        STATUS_MAP[resolvedStatus] ?? {
            label: 'Không xác định',
            chipClass: styles.stageStatusChipStopped,
        };
    const output = state.quantity ?? 0;
    const targetOutput = Math.max(maxQuantityForLine, output);
    const progressPercent =
        targetOutput === 0 ? 0 : Math.min(100, Math.round((output / targetOutput) * 100));

    const productName = product?.name ?? 'Chưa gán dòng gạch';
    const runtimeLabel = runningTime || '--';
    const runtimeMinutes = state.startTime
        ? Math.max(1, Math.floor((Date.now() - new Date(state.startTime).getTime()) / 60000))
        : 0;
    const speedValue =
        runtimeMinutes > 0 ? `${(output / runtimeMinutes).toFixed(1)} viên/phút` : '--';
    // const wastePercent = output > 0 ? `${(0.4 + (output % 6) * 0.2).toFixed(1)}%` : '--';

    const primaryAction =
        lineId == null
            ? null
            : (() => {
                switch (resolvedStatus) {
                    case 'running':
                        return {
                            label: 'Dừng',
                            icon: <Pause size={18} />,
                            onClick: () => onStop(lineId, stage, false),
                            variant: styles.stagePrimaryBtnDanger,
                            disabled: false,
                        };
                    case 'waiting_log':
                        return {
                            label: processingStage === stage ? 'Đang chốt...' : 'Chốt sản lượng',
                            icon: <TrendingUp size={18} />,
                            onClick: () => onLog(lineId, stage),
                            variant: styles.stagePrimaryBtnInfo,
                            disabled: processingStage === stage,
                        };
                    default:
                        return {
                            label: 'Khởi động',
                            icon: <Play size={18} />,
                            onClick: () => onStart(lineId, stage),
                            variant: styles.stagePrimaryBtnSuccess,
                            disabled: !state.productId,
                        };
                }
            })();

    return (
        <div
            className={`${styles.stageCard} ${resolvedStatus === 'running'
                ? styles.stageCardRunning
                : resolvedStatus === 'waiting_log'
                    ? styles.stageCardWaiting
                    : ''
                }`}
        >
            <div className={styles.stageCardHeader}>
                <div>
                    <p className={styles.stageEyebrow}>Công đoạn</p>
                    <h3 className={styles.stageName}>{stage}</h3>
                </div>
                <div className={styles.stageHeaderActions}>
                    <span className={`${styles.stageStatusChip} ${statusInfo.chipClass}`}>{statusInfo.label}</span>
                    <button type="button" className={styles.stageLinkButton}>
                        <Link2 size={16} />
                    </button>
                </div>
            </div>

            <div className={styles.stageProductRow}>
                <div>
                    <p className={styles.stageInfoLabel}>Dòng gạch</p>
                    <p className={styles.stageInfoValue}>{productName}</p>
                    {/* <span className={styles.stageInfoSub}>{productSku}</span> */}
                </div>
                {resolvedStatus === 'stopped' && lineId !== null && (
                    <button
                        type="button"
                        className={styles.stageProductSelect}
                        onClick={() => onOpenProductDialog(lineId, stage)}
                    >
                        <Package size={14} /> Chọn
                    </button>
                )}
            </div>

            <div className={styles.stageIOSection}>
                <div className={styles.stageIOLabelRow}>
                    <span className={styles.stageInfoLabel}>Input</span>
                    <span className={styles.stageIOValue}>
                        {output.toLocaleString()}
                    </span>
                </div>
                <div className={styles.stageProgressBar}>
                    <div className={styles.stageProgressBarFill} style={{ width: `${progressPercent}%` }} />
                </div>
            </div>

            <div className={styles.stageMetricRow}>
                <div className={styles.stageMetricItem}>
                    <span className={styles.stageInfoLabel}>
                        <Clock size={14} /> Thời gian chạy
                    </span>
                    <span className={styles.stageMetricValue}>{runtimeLabel}</span>
                </div>
                <div className={styles.stageMetricItem}>
                    <span className={styles.stageInfoLabel}><Package size={14} /> Sản lượng</span>
                    <span className={styles.stageMetricValue}>{output} viên</span>
                </div>
                <div className={styles.stageMetricItem}>
                    <span className={styles.stageInfoLabel}><RefreshCw size={14} /> Tốc độ</span>
                    <span className={styles.stageMetricValue}>{speedValue}</span>
                </div>
            </div>

            <div className={styles.stageActionGroup}>
                {primaryAction && (
                    <button
                        type="button"
                        className={`${styles.stagePrimaryBtn} ${primaryAction.variant}`}
                        onClick={primaryAction.onClick}
                        disabled={primaryAction.disabled}
                    >
                        {primaryAction.icon}
                        {primaryAction.label}
                    </button>
                )}
                {resolvedStatus === 'waiting_log' && lineId !== null && (
                    <button
                        type="button"
                        className={styles.stageSecondaryBtn}
                        onClick={() => onResume(lineId, stage)}
                        disabled={processingStage === stage}
                    >
                        <RotateCcw size={16} />
                        Quay lại
                    </button>
                )}
                {resolvedStatus !== 'waiting_log' && lineId !== null && (
                    <button
                        type="button"
                        className={styles.stageSecondaryBtn}
                        onClick={() => onStop(lineId, stage, true)}
                    >
                        <AlertTriangle size={16} />
                        Dừng khẩn cấp
                    </button>
                )}
            </div>
        </div>
    );
}
