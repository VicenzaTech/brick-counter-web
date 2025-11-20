import styles from './LossMetricCard.module.css';

interface LossMetricCardProps {
  title: string;
  value: number;
}

export default function LossMetricCard({ title, value }: LossMetricCardProps) {
  const getVariant = () => {
    if (value < 0) return 'success'; // Gain - green
    if (value === 0) return 'muted'; // No loss - gray
    if (value > 0 && value <= 100) return 'warning'; // Small loss - yellow
    return 'danger'; // High loss - red
  };

  const variant = getVariant();

  return (
    <div className={`${styles.card} ${styles[variant]}`}>
      <div className={styles.header}>
        <h4 className={styles.title}>{title}</h4>
      </div>
      <div className={styles.body}>
        <div className={styles.value}>
          {value > 0 && '+'}
          {value.toLocaleString('vi-VN')}
        </div>
        <div className={styles.unit}>viên</div>
      </div>
      <div className={styles.footer}>
        {value < 0 && <span className={styles.badge}>Rất tốt</span>}
        {value === 0 && <span className={styles.badge}>Bình thường</span>}
        {value > 0 && value <= 100 && (
          <span className={styles.badge}>Cảnh báo nhẹ</span>
        )}
        {value > 100 && <span className={styles.badge}>Mức hao phí cao</span>}
      </div>
    </div>
  );
}

