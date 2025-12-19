'use client';

import { Product, StageState, StageDeviceInfo } from '@/app/production-tracker/types';
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
    devices: StageDeviceInfo[];
    maxQuantityForLine: number;
    runningTime: string;
    processingStage: string | null;
    operator?: string | null; // <-- new prop
    onStart: (lineId: number, stage: string) => Promise<void> | void;
    onStop: (lineId: number, stage: string, emergency: boolean) => void;
    onLog: (lineId: number, stage: string) => void;
    onResume: (lineId: number, stage: string) => void;
    onOpenProductDialog: (lineId: number, stage: string) => void;
    onLogShift: (lineId: number, stage: string) => void;
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
    devices,
    maxQuantityForLine,
    runningTime,
    processingStage,
    onStart,
    onStop,
    onLog,
    onResume,
    onOpenProductDialog,
    onLogShift,
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
    const formatInteger = (value: number | null | undefined, showZero: boolean = false) => {
        if (value == null) return '--';
        if (value === 0 && !showZero) return '--';
        return value.toLocaleString('vi-VN');
    };
    const formatArea = (value: number | null | undefined, showZero: boolean = false) => {
        if (value == null) return '--';
        if (value === 0 && !showZero) return '--';
        return `${value.toLocaleString('vi-VN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })} m²`;
    };
    const formattedQuantity = formatInteger(state.quantity);
    const formattedTarget = formatInteger(targetOutput);
    const formattedArea = formatArea(state.area);

    const productName = product?.name ?? 'Chưa gán dòng gạch';
    
    // Format start time
    const startTimeLabel = state.startTime
        ? new Date(state.startTime).toLocaleString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        })
        : '--';
    
    const runtimeMinutes = state.startTime
        ? Math.max(1, Math.floor((Date.now() - new Date(state.startTime).getTime()) / 60000))
        : 0;
    const speedValue =
        runtimeMinutes > 0
            ? `${(output / runtimeMinutes).toLocaleString('vi-VN', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
            })} viên/phút`
            : '--';

    // Calculate real-time area based on product specs
    const realtimeArea = product?.specs?.width && product?.specs?.height && output > 0
        ? parseFloat(((product.specs.width * product.specs.height / 1000000) * output).toFixed(2))
        : 0;
    const formattedRealtimeArea = formatArea(realtimeArea);

    // Calculate stage production total from highest position devices
    const maxPosition = devices && devices.length > 0 
        ? Math.max(...devices.map(d => d.position ?? 0))
        : 0;
    
    const highestPositionDevices = devices?.filter(d => d.position === maxPosition) ?? [];
    
    const stageTotalQuantity = highestPositionDevices.reduce((sum, device) => {
        const qty = state.deviceQuantities?.[device.deviceId] ?? 0;
        return sum + qty;
    }, 0);
    
    const stageTotalArea = product?.specs?.width && product?.specs?.height && stageTotalQuantity > 0
        ? parseFloat(((product.specs.width * product.specs.height / 1000000) * stageTotalQuantity).toFixed(2))
        : 0;
    
    const formattedStageTotalQty = formatInteger(stageTotalQuantity);
    const formattedStageTotalArea = formatArea(stageTotalArea);

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
                            requiresProduct: false,
                        };
                    case 'waiting_log':
                        return {
                            label: processingStage === stage ? 'Đang chốt...' : 'Chốt sản lượng',
                            icon: <TrendingUp size={18} />,
                            onClick: () => onLog(lineId, stage),
                            variant: styles.stagePrimaryBtnInfo,
                            disabled: processingStage === stage,
                            requiresProduct: false,
                        };
                    default:
                        return {
                            label: 'Khởi động',
                            icon: <Play size={18} />,
                            onClick: () => onStart(lineId, stage),
                            variant: styles.stagePrimaryBtnSuccess,
                            disabled: lineId == null,
                            requiresProduct: true,
                        };
                }
            })();

    const handlePrimaryActionClick = () => {
        if (!primaryAction) {
            return;
        }
        if (primaryAction.requiresProduct && (!state.productId || lineId == null)) {
            onOpenProductDialog(lineId ?? 0, stage);
            return;
        }
        primaryAction.onClick();
    };

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
                </div>
                {lineId !== null && (
                    <button
                        type="button"
                        className={styles.stageProductQuickBtn}
                        onClick={() => onOpenProductDialog(lineId, stage)}
                    >
                        <Package size={14} />
                        {product ? 'Đổi' : 'Chọn'}
                    </button>
                )}
            </div>
            <div className={styles.stageOperatorRow}>
                <div>
                    <p className={styles.stageInfoLabel}>Người thao tác</p>
                    <p className={styles.stageInfoValue}>ADMIN</p>
                </div>
            </div>

            {/* Real-time Data Section */}
            <div className={styles.stageRealtimeSection}>
                <div className={styles.stageRealtimeMetric}>
                    <p className={styles.stageRealtimeLabel}>Số lượng hiện tại</p>
                    {devices && devices.length > 0 ? (
                        <div className={styles.deviceQuantitiesList}>
                            {devices.map((device) => {
                                const deviceQty = state.deviceQuantities?.[device.deviceId] ?? 0;
                                const formattedDeviceQty = formatInteger(deviceQty);
                                return (
                                    <div key={device.deviceId} className={styles.deviceQuantityRow}>
                                        <span className={styles.deviceName}>{device.name}</span>
                                        <div className={styles.deviceQuantityValueContainer}>
                                            <span className={styles.deviceQuantityValue}>{formattedDeviceQty}</span>
                                            <span className={styles.deviceQuantityUnit}>viên</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className={styles.stageRealtimeValue}>
                            <span>{formattedQuantity}</span>
                            <span className={styles.stageRealtimeUnit}>viên</span>
                        </div>
                    )}
                </div>
                <div className={styles.stageRealtimeMetric}>
                    <p className={styles.stageRealtimeLabel}>Sản lượng quy đổi</p>
                    {devices && devices.length > 0 ? (
                        <div className={styles.deviceQuantitiesList}>
                            {devices.map((device) => {
                                const deviceQty = state.deviceQuantities?.[device.deviceId] ?? 0;
                                const deviceArea = product?.specs?.width && product?.specs?.height && deviceQty > 0
                                    ? parseFloat(((product.specs.width * product.specs.height / 1000000) * deviceQty).toFixed(2))
                                    : 0;
                                const formattedDeviceArea = formatArea(deviceArea);
                                return (
                                    <div key={device.deviceId} className={styles.deviceQuantityRow}>
                                        <span className={styles.deviceName}>{device.name}</span>
                                        <div className={styles.deviceQuantityValueContainer}>
                                            <span className={styles.deviceQuantityValue}>{formattedDeviceArea}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className={styles.stageRealtimeValue}>
                            <span>{formattedRealtimeArea}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Stage Total Production Section */}
            <div className={styles.stageTotalSection}>
                <div className={styles.stageTotalMetric}>
                    <p className={styles.stageTotalLabel}>Sản lượng công đoạn</p>
                    <div className={styles.stageTotalRow}>
                        <div className={styles.stageTotalItem}>
                            <span className={styles.stageTotalValue}>{formattedStageTotalQty}</span>
                            <span className={styles.stageTotalUnit}>viên</span>
                        </div>
                        <div className={styles.stageTotalDivider}></div>
                        <div className={styles.stageTotalItem}>
                            <span className={styles.stageTotalValue}>{formattedStageTotalArea}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Start Time & Runtime Section */}
            <div className={styles.stageTimeSection}>
                <div className={styles.stageTimeItem}>
                    <span className={styles.stageInfoLabel}>
                        <Clock size={14} /> Thời điểm bắt đầu
                    </span>
                    <span className={styles.stageTimeValue}>{startTimeLabel}</span>
                </div>
                <div className={styles.stageTimeItem}>
                    <span className={styles.stageInfoLabel}>
                        <Clock size={14} /> Đã chạy được
                    </span>
                    <span className={styles.stageTimeValue}>{runningTime}</span>
                </div>
            </div>

            <div className={styles.stageActionGroup}>
                {primaryAction && (
                    <button
                        type="button"
                        className={`${styles.stagePrimaryBtn} ${primaryAction.variant}`}
                        onClick={handlePrimaryActionClick}
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
                {resolvedStatus === 'running' && lineId !== null && (
                    <button
                        type="button"
                        className={styles.stageSecondaryBtn}
                        onClick={() => onLogShift(lineId, stage)}
                    >
                        <TrendingUp size={16} />
                        Chốt sản lượng ca
                    </button>
                )}
            </div>
        </div>
    );
}
