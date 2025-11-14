import styles from '@/styles/AnalysisMetricCard.module.css';

interface AnalysisMetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'muted';
}

const AnalysisMetricCard = ({ title, value, unit, variant = 'muted' }: AnalysisMetricCardProps) => {
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricTitle}>{title}</div>
      <div className={`${styles.metricValue} ${styles[variant]}`}>
        {value}
        {unit && <span className={styles.metricUnit}> {unit}</span>}
      </div>
    </div>
  );
};

export default AnalysisMetricCard;
