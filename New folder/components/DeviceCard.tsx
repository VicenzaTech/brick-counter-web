import { Cpu } from 'lucide-react';
import styles from '@/styles/DeviceCard.module.css';

interface DeviceCardProps {
  deviceName: string;
  count: number;
  lastUpdated?: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger';
}

const DeviceCard = ({ deviceName, count, lastUpdated, variant = 'primary' }: DeviceCardProps) => {
  return (
    <div className={`${styles.deviceCard} ${styles[variant]}`}>
      <div className={styles.deviceIcon}>
        <Cpu size={24} />
      </div>
      <div className={styles.deviceInfo}>
        <div className={styles.deviceName}>{deviceName}</div>
        <div className={styles.deviceCount}>{count.toLocaleString('vi-VN')}</div>
        {lastUpdated && (
          <div className={styles.deviceUpdated}>
            <small>{lastUpdated}</small>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceCard;
