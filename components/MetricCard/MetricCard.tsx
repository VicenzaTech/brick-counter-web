import styles from '@/styles/MetricCard.module.css';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  unit?: string;
  status?: 'good' | 'warning' | 'danger';
}

export default function MetricCard({ 
  title, 
  value, 
  subtitle, 
  unit, 
  status = 'good' 
}: MetricCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'good': return '#4caf50';
      case 'warning': return '#ff9800';
      case 'danger': return '#f44336';
      default: return '#999';
    }
  };

  return (
    <div className={styles.metricCard} style={{ borderTopColor: getStatusColor() }}>
      <div className={styles.metricTitle}>{title}</div>
      <div className={styles.metricValue} style={{ color: getStatusColor() }}>
        {value}
        {unit && <span className={styles.metricUnit}> {unit}</span>}
      </div>
      {subtitle && <div className={styles.metricSubtitle}>{subtitle}</div>}
    </div>
  );
}
