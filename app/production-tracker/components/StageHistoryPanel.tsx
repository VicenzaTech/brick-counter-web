'use client';

import { StageHistoryItem } from '@/app/production-tracker/types';
import { AlertTriangle, Pause, Play, RotateCcw, TrendingUp } from 'lucide-react';
import styles from '../ProductionTracker.module.css';
import { ReactNode } from 'react';

interface StageHistoryPanelProps {
    items: StageHistoryItem[];
    hasSelection: boolean;
    lineName: string | null;
}

const actionLabelMap: Record<StageHistoryItem['action'], string> = {
    start: 'Bắt đầu',
    stop: 'Dừng',
    emergency_stop: 'Dừng khẩn cấp',
    log: 'Chốt sản lượng',
    resume: 'Tiếp tục',
};

const actionIconMap: Record<StageHistoryItem['action'], ReactNode> = {
    start: <Play size={14} />,
    stop: <Pause size={14} />,
    emergency_stop: <AlertTriangle size={14} />,
    log: <TrendingUp size={14} />,
    resume: <RotateCcw size={14} />,
};

const actionClassMap: Record<StageHistoryItem['action'], string> = {
    start: styles.historyTagStart,
    stop: styles.historyTagStop,
    emergency_stop: styles.historyTagEmergency,
    log: styles.historyTagLog,
    resume: styles.historyTagResume,
};

export function StageHistoryPanel({ items, hasSelection, lineName }: StageHistoryPanelProps) {
    return (
        <div className={styles.historyCard}>
            <div className={styles.historyHeader}>
                <div className={styles.historyTitle}>Lịch sử hoạt động công đoạn</div>
                <div className={styles.historySubtitle}>
                    {hasSelection && lineName ? `Dây chuyền ${lineName}` : 'Chọn dây chuyền để xem lịch sử'}
                </div>
            </div>
            <div className={styles.historyList}>
                {items.length === 0 ? (
                    <div className={styles.historyEmpty}>Chưa có hoạt động nào.</div>
                ) : (
                    items.map((item) => (
                        <div className={styles.historyItemWrapper}>
                            <span className={`${styles.historyTag} ${actionClassMap[item.action]}`}>
                                {actionIconMap[item.action]}
                            </span>

                            <div key={item.id} className={styles.historyItem}>
                                <div className={styles.historyItemHeader}>
                                    <div>
                                        <div className={styles.historyStage}>{item?.stage?.name}: {item?.notes?.length ? item?.notes : actionLabelMap[item.action]}</div>
                                    </div>
                                </div>
                                <div className={styles.historyMeta}>
                                    <span className={styles.historyTime}>
                                        {new Date(item.timestamp).toLocaleTimeString()}
                                    </span>
                                    |
                                    <span>
                                        {item.quantity && item.area
                                            ? `${item.quantity.toLocaleString()} viên (${item.area} m²)`
                                            : item?.product?.name ?? ''}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
