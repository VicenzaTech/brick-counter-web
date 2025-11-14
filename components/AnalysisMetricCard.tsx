import styles from '@/styles/AnalysisMetricCard.module.css';

interface AnalysisMetricCardProps {
  title: string;
  value: number;
  percentage: number;
  threshold: number;
  status: 'good' | 'warning' | 'danger';
  description?: string;
}

const AnalysisMetricCard = ({ 
  title, 
  value = 0, 
  percentage = 0, 
  threshold = 0, 
  status,
  description 
}: AnalysisMetricCardProps) => {
  
  const getStatusColor = () => {
    switch (status) {
      case 'good': return '#4caf50';
      case 'warning': return '#ff9800';
      case 'danger': return '#f44336';
      default: return '#999';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'good': return 'Tốt';
      case 'warning': return 'Cảnh báo';
      case 'danger': return 'Nguy hiểm';
      default: return 'Bình thường';
    }
  };

  const safeValue = typeof value === 'number' ? value : 0;
  const safePercentage = typeof percentage === 'number' ? percentage : 0;
  const safeThreshold = typeof threshold === 'number' ? threshold : 0;

  return (
    <div className={styles.metricCard} style={{ borderLeftColor: getStatusColor() }}>
      <div className={styles.metricHeader}>
        <div className={styles.metricTitle}>{title}</div>
        <div 
          className={styles.metricStatus}
          style={{ backgroundColor: getStatusColor() }}
        >
          {getStatusLabel()}
        </div>
      </div>
      
      <div className={styles.metricBody}>
        <div className={styles.metricValue}>
          {safeValue.toFixed(2)}
        </div>
        <div className={styles.metricPercentage} style={{ color: getStatusColor() }}>
          {safePercentage.toFixed(2)}%
        </div>
      </div>

      <div className={styles.metricFooter}>
        <div className={styles.threshold}>
          Ngưỡng: {safeThreshold}%
        </div>
        {description && (
          <div className={styles.description}>{description}</div>
        )}
      </div>

      <div className={styles.progressBar}>
        <div 
          className={styles.progressFill}
          style={{ 
            width: `${Math.min(safePercentage, 100)}%`,
            backgroundColor: getStatusColor()
          }}
        />
      </div>
    </div>
  );
};

export default AnalysisMetricCard;
