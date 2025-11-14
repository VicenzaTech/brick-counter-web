import MetricCard from "@/components/MetricCard";

export default function LineCard({ line }: { line: number }) {
  const metrics = [
    { label: "Hao phí mộc", value: -3743 },
    { label: "Hao phí nung", value: -4439 },
    { label: "Hao phí trước mài", value: -210 },
    { label: "Hao phí hoàn thiện", value: -728 },
  ];

  return (
    <div className="card" style={{ padding: "12px" }}>
      <div className="line-header">
        <span style={{ fontWeight: "bold", color: "#374151" }}>
          Dây chuyền {line}
        </span>
        <span style={{ color: "#1e40af", fontWeight: "bold" }}>●</span>
      </div>
      <div className="metric-grid">
        {metrics.map((m, i) => (
          <MetricCard key={i} label={m.label} value={m.value} />
        ))}
      </div>
    </div>
  );
}
