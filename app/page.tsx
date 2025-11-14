import FactoryCard from "@/components/FactoryCard";

export default function HomePage() {
  const factories = [
    { id: 1, name: "Phân xưởng 1", lines: [1, 2] },
    { id: 2, name: "Phân xưởng 2", lines: [5, 6] },
  ];

  return (
    <div>
      <h2>Tổng quan dây chuyền</h2>
      <div className="grid grid-2">
        {factories.map((factory) => (
          <FactoryCard key={factory.id} factory={factory} />
        ))}
      </div>
    </div>
  );
}
