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
    telemetryByPosition: Record<number, PositionRuntimeInfo>;
}

// Chỉ lo render label text từ status
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
    const sortedPositions = [...linePositions].sort((a, b) => {
        const ia =
            typeof a.index === 'number' ? a.index : Number.POSITIVE_INFINITY;
        const ib =
            typeof b.index === 'number' ? b.index : Number.POSITIVE_INFINITY;
        if (ia !== ib) return ia - ib;
        return a.id - b.id;
    });

    return (
        <div className={styles.positionArea}>
            <div className={styles.positionAreaHeaderRow}>
                <span className={styles.positionAreaTitle}>
                    Vị trí trên dây chuyền
                </span>
                <span className={styles.positionAreaHint}>
                    Thứ tự từ đầu vào đến cuối dây chuyền
                </span>
            </div>

            <div className={styles.positionStripWrapper}>
                <div className={styles.positionStrip}>
                    {sortedPositions.map((pos) => {
                        const runtime =
                            telemetryByPosition[pos.id] ?? ({
                                id: pos.id,
                                positionId: pos.id,
                                name: pos.name,
                                description: pos.description,
                                index: pos.index,
                                totalCount: 0,
                                totalErrorCount: 0,
                                status: 'unknown',
                            } as PositionRuntimeInfo);

                        const status: PositionStatus =
                            runtime.status ?? 'unknown';
                        const isActive = activePositionId === runtime.id;
                        const deviceCount = pos.devices?.length ?? 0;

                        return (
                            <div
                                key={runtime.id}
                                className={`${styles.positionCard} ${
                                    isActive ? styles.positionCardActive : ''
                                }`}
                                onClick={() => onSelectPosition(runtime.id)}
                            >
                                <div className={styles.positionIndexBadge}>
                                    <span className={styles.positionIndexText}>
                                        {runtime.index ?? ''}
                                    </span>
                                </div>

                                <div className={styles.positionHeader}>
                                    <h3 className={styles.positionTitle}>
                                        {runtime.name}
                                    </h3>
                                    <p className={styles.positionSubtitle}>
                                        {runtime.description ||
                                            'Vị trí trên dây chuyền sản xuất'}
                                    </p>
                                    <p className={styles.positionDeviceCount}>
                                        {deviceCount > 0
                                            ? `${deviceCount} thiết bị`
                                            : ''}
                                    </p>
                                </div>

                                <div className={styles.positionStatusRow}>
                                    <span
                                        className={`${styles.positionStatusDot} ${
                                            status === 'running'
                                                ? styles.positionStatusDotRunning
                                                : status === 'idle'
                                                ? styles.positionStatusDotIdle
                                                : status === 'error'
                                                ? styles.positionStatusDotError
                                                : styles.positionStatusDotUnknown
                                        }`}
                                    />
                                    <span className={styles.positionStatusText}>
                                        {getStatusLabel(status)}
                                    </span>
                                </div>

                                <div className={styles.positionMetrics}>
                                    <div className={styles.positionMetricItem}>
                                        <span
                                            className={
                                                styles.positionMetricLabel
                                            }
                                        >
                                            Sản lượng
                                        </span>
                                        <span
                                            className={
                                                styles.positionMetricValue
                                            }
                                        >
                                            {typeof runtime.totalCount ===
                                            'number'
                                                ? runtime.totalCount.toLocaleString(
                                                      'vi-VN',
                                                  )
                                                : '-'}
                                        </span>
                                    </div>
                                    <div className={styles.positionMetricItem}>
                                        <span
                                            className={
                                                styles.positionMetricLabel
                                            }
                                        >
                                            Lỗi
                                        </span>
                                        <span
                                            className={
                                                styles.positionMetricValue
                                            }
                                        >
                                            {typeof runtime.totalErrorCount ===
                                            'number'
                                                ? runtime.totalErrorCount.toLocaleString(
                                                      'vi-VN',
                                                  )
                                                : '-'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

