import { Cpu, RotateCcw, Settings } from 'lucide-react';
import DeviceAnalyticsCard from '../DeviceAnalyticsCard/DeviceAnalyticsCard';
import styles from './ProductionLineSection.module.css';

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

interface ProductionLineSectionProps {
  lineInfo: ProductionLineInfo;
  devices: DeviceData[];
  onReset?: () => void;
  isResetting?: boolean;
  showResetButton?: boolean;
  onConfig?: () => void;
}

export default function ProductionLineSection({
  lineInfo,
  devices,
  onReset,
  isResetting = false,
  showResetButton = true,
  onConfig,
}: ProductionLineSectionProps) {
  return (
    <div className={styles.section}>
      {/* Section Header with Brick Type Info */}
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
              <button
                onClick={onConfig}
                className={styles.configButton}
                title="Cấu hình dây chuyền"
              >
                <Settings size={18} />
                Cấu hình
              </button>
            )}
            {onReset && (
              <button
                onClick={onReset}
                disabled={isResetting}
                className={styles.resetButton}
              >
                <RotateCcw size={18} className={isResetting ? styles.spinning : ''} />
                {isResetting ? 'Đang reset...' : 'Reset toàn bộ thiết bị'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Device Grid */}
      <div className={styles.deviceGrid}>
        {devices.map((device) => (
          <DeviceAnalyticsCard
            key={device.id}
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
        ))}
      </div>
    </div>
  );
}
