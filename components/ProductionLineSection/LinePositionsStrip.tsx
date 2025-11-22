import React from 'react';
import styles from './ProductionLineSection.module.css';
import type {
    PositionInfo,
    PositionStatus,
    PositionRuntimeInfo,
} from './ProductionLineSection';

interface LinePositionsStripProps {
    linePositions: PositionInfo[];
    activePositionId: number | null;
    onSelectPosition: (positionId: number) => void;
    telemetryByPosition: Record<number, PositionRuntimeInfo>,
}

// Chỉ lo render label text từ status, còn tính toán đã làm ở cha
function getStatusLabel(status: PositionStatus): string {
    switch (status) {
        case 'running':
            return 'Đang chạy ổn định';
        case 'idle':
            return 'Đang dừng';
        case 'error':
            return 'Lỗi sensor / thiết bị';
        case 'unknown':
        default:
            return 'Chưa có dữ liệu';
    }
}

export const LinePositionsStrip: React.FC<LinePositionsStripProps> = ({
    linePositions,
    activePositionId,
    onSelectPosition,
    telemetryByPosition,
}) => {
    console.log(`telemetryByPosition`, telemetryByPosition)

    return (
        <div className={styles.positionArea}>
            <div className={styles.positionAreaHeaderRow}>
                <span className={styles.positionAreaTitle}>
                    Vị trí trên dây chuyền
                </span>
                <span className={styles.positionAreaHint}>
                    Thứ tự từ đầu vào → cuối dây chuyền
                </span>
            </div>

            <div className={styles.positionStripWrapper}>
                <div className={styles.positionStrip}>
                    {/* MAPPING POSITION WITH TELEMETRY */}
                    {
                        Object.keys(telemetryByPosition).length && Object.keys(telemetryByPosition).map(pos_key => {
                            const currentPosition = telemetryByPosition[pos_key]
                            return (
                                <div
                                    key={currentPosition.id}
                                    className={`${styles.positionCard} ${currentPosition.status ? styles.positionCardActive : ''
                                        }`}
                                    onClick={() => onSelectPosition(currentPosition.id)}
                                >
                                    <div className={styles.positionIndexBadge}>
                                        <span className={styles.positionIndexText}>
                                            {currentPosition.index ?? ''}
                                        </span>
                                    </div>

                                    <div className={styles.positionHeader}>
                                        <h3 className={styles.positionTitle}>
                                            {currentPosition.name}
                                        </h3>
                                        <p className={styles.positionSubtitle}>
                                            {currentPosition.description ||
                                                'Vị trí trên dây chuyền sản xuất'}
                                        </p>
                                        <p className={styles.positionDeviceCount}>
                                            {/* {deviceCount} thiết bị */}
                                        </p>
                                    </div>

                                    <div className={styles.positionStatusRow}>
                                        <span
                                            className={`${styles.positionStatusDot} ${status === 'running'
                                                ? styles.positionStatusDotRunning
                                                : status === 'idle'
                                                    ? styles.positionStatusDotIdle
                                                    : status === 'error'
                                                        ? styles.positionStatusDotError
                                                        : styles.positionStatusDotUnknown
                                                }`}
                                        />
                                        <span className={styles.positionStatusText}>
                                            {currentPosition.name ?? "unknown"}
                                        </span>
                                    </div>

                                    <div className={styles.positionMetrics}>
                                        <div className={styles.positionMetricItem}>
                                            <span
                                                className={styles.positionMetricLabel}
                                            >
                                                Sản lượng
                                            </span>
                                            <span
                                                className={
                                                    styles.positionMetricValue
                                                }
                                            >
                                                {typeof currentPosition.totalCount === 'number'
                                                    ? currentPosition.totalCount.toLocaleString(
                                                        'vi-VN',
                                                    )
                                                    : '—'}
                                            </span>
                                        </div>
                                        <div className={styles.positionMetricItem}>
                                            <span
                                                className={styles.positionMetricLabel}
                                            >
                                                Lỗi
                                            </span>
                                            <span
                                                className={
                                                    styles.positionMetricValue
                                                }
                                            >
                                                {typeof currentPosition.errorCount === 'number'
                                                    ? currentPosition.errorCount.toLocaleString(
                                                        'vi-VN',
                                                    )
                                                    : '—'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    }
                </div>
            </div>
        </div>
    );
};
