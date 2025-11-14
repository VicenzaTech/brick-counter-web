export default function MetricCard({ label, value }: { label: string; value: number }) {
  const colorClass = value < 0 ? "green" : "red";
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className={`metric-value ${colorClass}`}>{value}</div>
    </div>
  );
}
