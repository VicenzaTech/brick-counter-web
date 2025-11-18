import { useState } from 'react';
import { Settings, X } from 'lucide-react';
import styles from './DeviceConfigModal.module.css';

interface DeviceConfigModalProps {
  lineId: number;
  lineName: string;
  deviceCount?: number;
  currentInterval?: number;
  onClose: () => void;
  onSave: (interval: number) => Promise<void>;
}

const INTERVAL_OPTIONS = [
  { value: 5, label: '5 giây' },
  { value: 10, label: '10 giây' },
  { value: 15, label: '15 giây' },
  { value: 30, label: '30 giây' },
  { value: 60, label: '60 giây (1 phút)' },
];

export default function DeviceConfigModal({
  lineId,
  lineName,
  deviceCount = 8,
  currentInterval = 60,
  onClose,
  onSave,
}: DeviceConfigModalProps) {
  const [interval, setInterval] = useState(currentInterval);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      await onSave(interval);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lưu cấu hình');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitle}>
            <Settings size={24} />
            <h2>Cấu hình thiết bị</h2>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          <div className={styles.deviceInfo}>
            <p className={styles.deviceLabel}>Dây chuyền:</p>
            <p className={styles.deviceValue}>{lineName}</p>
            <p className={styles.deviceId}>Số thiết bị: {deviceCount} thiết bị</p>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="interval-select" className={styles.label}>
              Khoảng thời gian gửi dữ liệu (Telemetry Interval)
            </label>
            <p className={styles.description}>
              Tất cả thiết bị trên dây chuyền sẽ gửi dữ liệu đếm lên MQTT broker theo khoảng thời gian này
            </p>
            <select
              id="interval-select"
              className={styles.select}
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value))}
              disabled={isSaving}
            >
              {INTERVAL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

          <div className={styles.infoBox}>
            <p className={styles.infoTitle}>ℹ️ Lưu ý:</p>
            <ul className={styles.infoList}>
              <li>Cấu hình này sẽ áp dụng cho <strong>tất cả {deviceCount} thiết bị</strong> trên dây chuyền</li>
              <li>Interval ngắn hơn = dữ liệu realtime hơn nhưng tốn băng thông</li>
              <li>Interval dài hơn = tiết kiệm tài nguyên nhưng chậm hơn</li>
              <li>Lệnh sẽ được gửi qua MQTT đến tất cả thiết bị</li>
              <li>Thiết bị cần hỗ trợ lệnh <code>config</code> để nhận cấu hình</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <button
            className={styles.cancelButton}
            onClick={onClose}
            disabled={isSaving}
          >
            Hủy
          </button>
          <button
            className={styles.saveButton}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Đang lưu...' : 'Lưu cấu hình'}
          </button>
        </div>
      </div>
    </div>
  );
}
