import styles from './DeviceAnalyticsCard.module.css';

interface DeviceAnalytics {
    deviceId: string;
    position: string;
    currentCount: number;
    speedPerMinute: number;
    speedPerHour: number;
    isRunning: boolean;
    trend: 'increasing' | 'stable' | 'decreasing' | 'stopped';
    idleTimeSeconds: number;
    lastUpdated?: string; // ISO timestamp
}

interface Props {
    device: DeviceAnalytics;
    deviceName: string;
}

export default function DeviceAnalyticsCard({ device, deviceName }: Props) {
    const formatTime = (isoString?: string) => {
        if (!isoString) return '-';
        try {
            const date = new Date(isoString);
            return date.toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            });
        } catch {
            return '-';
        }
    };

    const formatTrendLabel = (trend: DeviceAnalytics['trend']) => {
        switch (trend) {
            case 'increasing':
                return 'Tăng';
            case 'decreasing':
                return 'Giảm';
            case 'stopped':
                return 'Dừng';
            case 'stable':
            default:
                return 'Ổn định';
        }
    };

    return (
        <div
            className={`${styles.card} ${device.isRunning ? styles.running : styles.stopped
                }`}
        >
            <div className={styles.header}>
                <div className={styles.title}>
                    <span className={styles.icon}>{device.isRunning ? '●' : '■'}</span>
                    <span className={styles.name}>{deviceName}</span>
                </div>
                <div className={styles.meta}>
                    <span className={styles.deviceId}>{device.deviceId}</span>
                    {device.position && (
                        <span className={styles.position}>{device.position}</span>
                    )}
                    <span className={styles.trendBadge}>
                        {formatTrendLabel(device.trend)}
                    </span>
                </div>
            </div>

            <div className={styles.metrics}>
                <div className={styles.metric}>
                    <div className={styles.label}>Tốc độ</div>
                    <div className={styles.valueRow}>
                        <span className={styles.value}>
                            {device.speedPerMinute.toFixed(2)}
                        </span>
                        <span className={styles.unit}>viên/phút</span>
                    </div>
                    <div className={styles.subvalue}>
                        {device.speedPerHour.toFixed(0)} viên/giờ
                    </div>
                </div>

                <div className={styles.metric}>
                    <div className={styles.label}>Sản lượng</div>
                    <div className={styles.valueRow}>
                        <span className={styles.value}>
                            {device.currentCount.toLocaleString('vi-VN')}
                        </span>
                        <span className={styles.unit}>viên</span>
                    </div>
                </div>

                {!device.isRunning && device.idleTimeSeconds > 0 && (
                    <div className={styles.metric}>
                        <div className={styles.label}>Dừng máy</div>
                        <div className={styles.valueRow}>
                            <span className={styles.value} style={{ color: '#ef4444' }}>
                                {Math.floor(device.idleTimeSeconds / 60)}
                            </span>
                            <span className={styles.unit}>phút</span>
                        </div>
                    </div>
                )}

                <div className={styles.timestamp}>
                    <span className={styles.timestampLabel}>Cập nhật:</span>
                    <span className={styles.timestampValue}>
                        {formatTime(device.lastUpdated)}
                    </span>
                </div>
            </div>
        </div>
    );
}
