import { Cpu, RotateCcw, Settings } from 'lucide-react';
import DeviceAnalyticsCard from '../DeviceAnalyticsCard/DeviceAnalyticsCard';
import styles from './ProductionLineSection.module.css';
import { Button } from '../Button/Button';
import LossMetricCard from '../LossMetricCard/LossMetricCard';

interface DeviceData {
    id: string;
    name: string;
    count: number;
    lastUpdated: string;
    // Analytics data
    speedPerMinute?: number;
    speedPerHour?: number;
    isRunning?: boolean;
    trend?: 'increasing' | 'stable' | 'decreasing' | 'stopped';
    idleTimeSeconds?: number;
    position?: string;
}

interface ProductionLineInfo {
    id: number;
    name: string;
    brickType?: {
        id: number;
        name: string;
        description?: string;
    };
    status?: string;
}

interface MetricsData {
    haophiMoc: number;
    haophiNung: number;
    haophiTruocMai: number;
    haophiHoanThien: number;
    haophiMocVariant: 'primary' | 'success' | 'warning' | 'danger' | 'muted';
    haophiNungVariant: 'primary' | 'success' | 'warning' | 'danger' | 'muted';
    haophiTruocMaiVariant: 'primary' | 'success' | 'warning' | 'danger' | 'muted';
    haophiHoanThienVariant: 'primary' | 'success' | 'warning' | 'danger' | 'muted';
}

interface ProductionLineSectionProps {
    lineInfo: ProductionLineInfo;
    devices: DeviceData[];
    metrics: MetricsData;
    onReset?: () => void;
    isResetting?: boolean;
    showResetButton?: boolean;
    onConfig?: () => void;
    onDeviceClick?: (device: DeviceData) => void;
}

export default function ProductionLineSection({
    lineInfo,
    devices,
    metrics,
    onReset,
    isResetting = false,
    showResetButton = true,
    onConfig,
    onDeviceClick,
}: ProductionLineSectionProps) {
    return (
        <div className={styles.section}>
            {/* Header dây chuyền */}
            <div className={styles.sectionHeader}>
                <div className={styles.headerLeft}>
                    <h2 className={styles.sectionTitle}>
                        <Cpu size={24} />
                        {lineInfo.name}
                    </h2>
                    {lineInfo.brickType && (
                        <div className={styles.brickTypeInfo}>
                            <span className={styles.brickTypeLabel}>Đang sản xuất:</span>
                            <span className={styles.brickTypeName}>{lineInfo.brickType.name}</span>
                            {lineInfo.brickType.description && (
                                <span className={styles.brickTypeDesc}>({lineInfo.brickType.description})</span>
                            )}
                        </div>
                    )}
                </div>
                {showResetButton && (
                    <div className={styles.headerButtons}>
                        {onConfig && (
                            <Button
                                onClick={onConfig}
                                className={styles.configButton}
                                title="Cấu hình dây chuyền"
                            >
                                <Settings size={18} />
                                Cấu hình
                            </Button>
                        )}
                        {onReset && (
                            <Button
                                typeBtn='secondaryButton'
                                onClick={onReset}
                                disabled={isResetting}
                                className={styles.resetButton}

                            >
                                <RotateCcw size={18} className={isResetting ? styles.spinning : ''} />
                                {isResetting ? 'Đang reset...' : 'Reset toàn bộ thiết bị'}
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Lưới thiết bị */}
            <div className={styles.deviceGrid}>
                {devices.map((device) => (
                    <button
                        key={device.id}
                        type="button"
                        className={styles.deviceButton}
                        onClick={() => onDeviceClick && onDeviceClick(device)}
                    >
                        <DeviceAnalyticsCard
                            device={{
                                deviceId: device.id,
                                position: device.position || '',
                                currentCount: device.count,
                                speedPerMinute: device.speedPerMinute || 0,
                                speedPerHour: device.speedPerHour || 0,
                                isRunning: device.isRunning ?? true,
                                trend: device.trend || 'stable',
                                idleTimeSeconds: device.idleTimeSeconds || 0,
                                lastUpdated: device.lastUpdated,
                            }}
                            deviceName={device.name}
                        />
                    </button>
                ))}

                {/* Ô thêm thiết bị */}
                <button
                    type="button"
                    className={styles.addDeviceCard}
                    onClick={() => {
                        alert('TODO: Thêm thiết bị mới vào dây chuyền');
                    }}
                >
                    <div className={styles.addDeviceIcon}>+</div>
                    <div className={styles.addDeviceContent}>
                        <p className={styles.addDeviceTitle}>Thêm thiết bị</p>
                        <p className={styles.addDeviceText}>
                            Tạo mới hoặc gán thêm thiết bị vào dây chuyền này.
                        </p>
                    </div>
                </button>
            </div>

            {/* Khu vực hao phí */}
            <div className={styles.metricsSection}>
                <div className={styles.metricsGrid}>
                    <LossMetricCard title="Hao phí mộc" value={metrics.haophiMoc} />
                    <LossMetricCard title="Hao phí nung" value={metrics.haophiNung} />
                    <LossMetricCard title="Hao phí trước mài" value={metrics.haophiTruocMai} />
                    <LossMetricCard title="Hao phí hoàn thiện" value={metrics.haophiHoanThien} />
                </div>
            </div>
        </div>
    );
}
