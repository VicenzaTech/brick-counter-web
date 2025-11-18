import LineCard from "./LineCard";

export default function FactoryCard({ factory }: { factory: any }) {
  return (
    <div className="card">
      <div className="card-title">{factory.name}</div>
      <div className="grid metric-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
        {factory.lines.map((line: number) => (
          <LineCard key={line} line={line} />
        ))}
      </div>
    </div>
  );
}
