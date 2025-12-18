// BrickTypes helper functions
// Cac ham tien ich dung chung cho BrickTypes components

import type { BrickType } from "@/lib/types/brick-type";

export function getQualityBadgeClass(standard: string | undefined): string {
  if (!standard) return "badge";
  const std = standard.toUpperCase();
  if (std === "BIA") return "badgeGreen";
  if (std === "BIB") return "badgeBlue";
  if (std === "BIIA") return "badgeYellow";
  if (std === "BIIB") return "badgeOrange";
  if (std.includes("ISO")) return "badgePurple";
  if (std.includes("TCVN")) return "badgeTeal";
  return "badgeGray";
}

export function calculateContainerCapacity(brick: BrickType) {
  const { weightPerBox, boxesPerPallet, m2PerBox } = brick;
  if (!weightPerBox || !boxesPerPallet || !m2PerBox) return null;

  const weightPerPallet = weightPerBox * boxesPerPallet;
  const m2PerPallet = m2PerBox * boxesPerPallet;

  const palletsPerContainer20 = 23;
  const totalBoxes20 = boxesPerPallet * palletsPerContainer20;
  const totalWeight20 = weightPerPallet * palletsPerContainer20;
  const totalM220 = m2PerPallet * palletsPerContainer20;

  return {
    weightPerPallet,
    m2PerPallet,
    container20: {
      pallets: palletsPerContainer20,
      boxes: totalBoxes20,
      weightKg: totalWeight20,
      weightTon: (totalWeight20 / 1000).toFixed(2),
      m2: totalM220.toFixed(2),
    },
  };
}

export function formatNumber(num?: number | null): string {
  if (num === undefined || num === null) return "-";
  return new Intl.NumberFormat("vi-VN").format(num);
}

export function formatDate(dateStr?: string | Date | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("vi-VN");
}

export function getMockMonthlySeries(brickId: number) {
  const base = 40 + (brickId % 5) * 8;
  const labels = [
    "Th1",
    "Th2",
    "Th3",
    "Th4",
    "Th5",
    "Th6",
    "Th7",
    "Th8",
    "Th9",
    "Th10",
    "Th11",
    "Th12",
  ];
  const currentMonth = new Date().getMonth();
  const months = labels.map((label, index) => ({
    label,
    value: index <= currentMonth ? base + ((index * 7 + brickId * 3) % 30) : 0,
  }));
  const max = Math.max(...months.map((m) => m.value)) || 1;
  return { months, max };
}

export function getMockDailySeries(brickId: number) {
  const base = 10 + (brickId % 4) * 5;
  const labels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const days = labels.map((label, index) => ({
    label,
    value: base + ((index * 3 + brickId * 5) % 18),
  }));
  const max = Math.max(...days.map((d) => d.value)) || 1;
  return { days, max };
}

export function getYearToDateProduction(brickId: number): number {
  const currentMonth = new Date().getMonth();
  const baseMonthly = 8000 + (brickId % 7) * 1500;
  const variance = (brickId * 317) % 1000;
  return Math.floor(baseMonthly * (currentMonth + 1) + variance);
}
