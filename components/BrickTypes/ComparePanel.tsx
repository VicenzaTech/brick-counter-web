import type { BrickType } from "@/lib/types/brick-type";
import { ArrowLeft, Download } from "lucide-react";
import {
  formatNumber,
  getMockDailySeries,
  getMockMonthlySeries,
} from "./helpers";
import styles from "./ComparePanel.module.css";

type ChartMode = "day" | "month";

interface ComparePanelProps {
  brickIds: number[];
  bricks: BrickType[];
  chartMode: ChartMode;
  onChartModeChange: (mode: ChartMode) => void;
  onExit: () => void;
}
type DataPoint = { label: string; value: number };
type SeriesData =
  | { months: DataPoint[]; max: number }
  | { days: DataPoint[]; max: number };
export function ComparePanel({
  brickIds,
  bricks,
  chartMode,
  onChartModeChange,
  onExit,
}: ComparePanelProps) {
  const bricksToCompare = bricks.filter((b) => brickIds.includes(b.id));
  const colors = [
    "#4f46e5",
    "#ec4899",
    "#14b8a6",
    "#f59e0b",
    "#8b5cf6",
    "#ef4444",
    "#06b6d4",
  ];

  const getYearToDateProduction = (brickId: number): number => {
    return (brickId * 123456) % 500000;
  };

  // Export CSV function
  const handleExportCSV = () => {
    if (bricksToCompare.length === 0) return;

    const headers = ["Chỉ số", ...bricksToCompare.map((b) => b.name)];

    const rows = [
      ["Kích thước", ...bricksToCompare.map((b) => b.tileSize || "-")],
      ["Độ dày (mm)", ...bricksToCompare.map((b) => b.thickness || "-")],
      ["Loại gạch", ...bricksToCompare.map((b) => b.brickType || "-")],
      ["Dây chuyền", ...bricksToCompare.map((b) => b.productionLine || "-")],
      [
        "Tên dây chuyền",
        ...bricksToCompare.map((b) => b.productLineName || "-"),
      ],
      [
        "Tiêu chuẩn chất lượng",
        ...bricksToCompare.map((b) => b.qualityStandard || "-"),
      ],
      [
        "Trọng lượng (kg/m²)",
        ...bricksToCompare.map((b) => b.weightPerM2 || "-"),
      ],
      ["Viên/thùng", ...bricksToCompare.map((b) => b.piecesPerBox || "-")],
      ["m²/thùng", ...bricksToCompare.map((b) => b.m2PerBox || "-")],
      [
        "Trọng lượng/thùng (kg)",
        ...bricksToCompare.map((b) => b.weightPerBox || "-"),
      ],
      ["Thùng/pallet", ...bricksToCompare.map((b) => b.boxesPerPallet || "-")],
      [
        "Chu kỳ hợp đồng",
        ...bricksToCompare.map((b) => b.contractCycle || "-"),
      ],
      ["Sản lượng lò", ...bricksToCompare.map((b) => b.kilnOutput || "-")],
      [
        "Sản lượng loại A",
        ...bricksToCompare.map((b) => b.qualityProductOutput || "-"),
      ],
      [
        "Tỷ lệ A/Tổng (%)",
        ...bricksToCompare.map((b) => {
          if (b.kilnOutput && b.qualityProductOutput) {
            const ratio = (b.qualityProductOutput / b.kilnOutput) * 100;
            return ratio.toFixed(1);
          }
          return "-";
        }),
      ],
      [
        "Sản lượng từ đầu năm (m²)",
        ...bricksToCompare.map((b) => {
          const ytd = getYearToDateProduction(b.id);
          return formatNumber(ytd);
        }),
      ],
    ];

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    // Add UTF-8 BOM for Excel compatibility
    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().split("T")[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `so_sanh_gach_${date}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>So sánh {brickIds.length} dạng gạch</h1>
          <p className={styles.subtitle}>
            So sánh chỉ số và sản lượng ước tính
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.exportButton}
            onClick={handleExportCSV}
            title="Xuất dữ liệu so sánh ra file CSV"
          >
            <Download size={16} />
            <span>Xuất CSV</span>
          </button>
          <button type="button" className={styles.exitButton} onClick={onExit}>
            <ArrowLeft size={16} />
            <span>Quay lại chi tiết</span>
          </button>
        </div>
      </header>

      <div className={styles.tableCard}>
        <h3>So sánh chỉ số chính</h3>
        <div className={styles.tableWrapper}>
          <table className={styles.compareTable}>
            <thead>
              <tr>
                <th>Chỉ số</th>
                {bricksToCompare.map((b) => (
                  <th key={b.id}>{b.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Kích thước", key: "tileSize" },
                {
                  label: "Độ dày (mm)",
                  key: "thickness",
                  format: formatNumber,
                },
                { label: "Loại gạch", key: "brickType" },
                { label: "Dây chuyền", key: "productionLine" },
                { label: "Dòng sản phẩm", key: "productLineName" },
                { label: "Tiêu chuẩn CL", key: "qualityStandard" },
                {
                  label: "Trọng lượng/m² (kg)",
                  key: "weightPerM2",
                  format: formatNumber,
                },
                {
                  label: "Số viên/thùng",
                  key: "piecesPerBox",
                  format: formatNumber,
                },
                { label: "m²/thùng", key: "m2PerBox", format: formatNumber },
                {
                  label: "TL/thùng (kg)",
                  key: "weightPerBox",
                  format: formatNumber,
                },
                {
                  label: "Số thùng/pallet",
                  key: "boxesPerPallet",
                  format: formatNumber,
                },
                {
                  label: "Chu kỳ khoán (phút)",
                  key: "contractCycle",
                  format: formatNumber,
                },
                {
                  label: "SL ra lò (m²)",
                  key: "kilnOutput",
                  format: formatNumber,
                },
                {
                  label: "SL chính phẩm (m²)",
                  key: "qualityProductOutput",
                  format: formatNumber,
                },
              ].map((row) => (
                <tr key={row.label}>
                  <td className={styles.labelCell}>{row.label}</td>
                  {bricksToCompare.map((b) => {
                    const value = (b as any)[row.key];
                    return (
                      <td key={b.id}>
                        {value !== undefined && value !== null && value !== ""
                          ? row.format
                            ? row.format(value)
                            : value
                          : "-"}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <td className={styles.labelCell}>Tỷ lệ chính phẩm</td>
                {bricksToCompare.map((b) => {
                  const ratio =
                    b.kilnOutput && b.qualityProductOutput
                      ? ((b.qualityProductOutput / b.kilnOutput) * 100).toFixed(
                          1
                        )
                      : null;
                  return (
                    <td
                      key={b.id}
                      className={
                        ratio && Number(ratio) >= 95
                          ? styles.ratioGood
                          : styles.ratioBad
                      }
                    >
                      {ratio ? `${ratio}%` : "-"}
                    </td>
                  );
                })}
              </tr>
              <tr className={styles.ytdRow}>
                <td className={styles.labelCell}>Sản lượng từ đầu năm</td>
                {bricksToCompare.map((b) => {
                  const ytd = getYearToDateProduction(b.id);
                  return (
                    <td key={b.id} className={styles.ytdValue}>
                      {formatNumber(ytd)} m²
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <section className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <h3>Sản lượng ước tính (mock)</h3>
          <select
            className={styles.chartModeSelect}
            value={chartMode}
            onChange={(e) => onChartModeChange(e.target.value as ChartMode)}
          >
            <option value="day">Theo ngày</option>
            <option value="month">Theo tháng</option>
          </select>
        </div>
        <div className={styles.chartWrapper}>
          <BarChart
            bricks={bricksToCompare}
            chartMode={chartMode}
            colors={colors}
            getYearToDateProduction={getYearToDateProduction}
          />
        </div>
      </section>

      <div className={styles.lineChartsGrid}>
        {bricksToCompare.map((brick, brickIndex) => {
          const seriesData =
            chartMode === "month"
              ? getMockMonthlySeries(brick.id)
              : getMockDailySeries(brick.id);
          const dataArray: DataPoint[] =
            chartMode === "month"
              ? "months" in seriesData
                ? seriesData.months
                : []
              : "days" in seriesData
              ? seriesData.days
              : [];
          const maxValue = seriesData.max;

          return (
            <section key={brick.id} className={styles.chartCard}>
              <div className={styles.lineChartTitleRow}>
                <div
                  className={styles.legendColor}
                  style={{ background: colors[brickIndex % colors.length] }}
                />
                <h3>{brick.name}</h3>
              </div>
              <div className={styles.lineChartContainer}>
                <svg viewBox="0 0 600 120" preserveAspectRatio="none">
                  <defs>
                    <linearGradient
                      id={`gradient-${brick.id}`}
                      x1="0%"
                      y1="0%"
                      x2="0%"
                      y2="100%"
                    >
                      <stop
                        offset="0%"
                        stopColor={colors[brickIndex % colors.length]}
                        stopOpacity="0.2"
                      />
                      <stop
                        offset="100%"
                        stopColor={colors[brickIndex % colors.length]}
                        stopOpacity="0.02"
                      />
                    </linearGradient>
                  </defs>
                  <polyline
                    fill={`url(#gradient-${brick.id})`}
                    stroke="none"
                    points={`0,120 ${dataArray
                      .map((d: DataPoint, i: number) => {
                        const x = (i / (dataArray.length - 1)) * 600;
                        const y = 120 - (d.value / maxValue) * 120;
                        return `${x},${y}`;
                      })
                      .join(" ")} 600,120`}
                  />
                  <polyline
                    fill="none"
                    stroke={colors[brickIndex % colors.length]}
                    strokeWidth="2"
                    points={dataArray
                      .map((d: DataPoint, i: number) => {
                        const x = (i / (dataArray.length - 1)) * 600;
                        const y = 120 - (d.value / maxValue) * 120;
                        return `${x},${y}`;
                      })
                      .join(" ")}
                  />
                </svg>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function BarChart({
  bricks,
  chartMode,
  colors,
  getYearToDateProduction,
}: {
  bricks: BrickType[];
  chartMode: ChartMode;
  colors: string[];
  getYearToDateProduction: (id: number) => number;
}) {
  const dataPoints =
    chartMode === "month"
      ? Array.from({ length: 12 }, (_, i) => i)
      : Array.from({ length: 7 }, (_, i) => i);

  const allValues = bricks.flatMap((brick) => {
    const seriesData =
      chartMode === "month"
        ? getMockMonthlySeries(brick.id)
        : getMockDailySeries(brick.id);
    const dataArray: DataPoint[] =
      chartMode === "month"
        ? "months" in seriesData
          ? seriesData.months
          : []
        : "days" in seriesData
        ? seriesData.days
        : [];
    return dataArray.map((d: DataPoint) => d.value);
  });
  const maxValue = Math.max(...allValues);

  return (
    <>
      <div className={styles.chartBars}>
        {dataPoints.map((idx) => (
          <div key={idx} className={styles.chartBarItem}>
            <div className={styles.chartBarTrack}>
              {bricks.map((brick, i) => {
                const seriesData =
                  chartMode === "month"
                    ? getMockMonthlySeries(brick.id)
                    : getMockDailySeries(brick.id);
                const dataArray: DataPoint[] =
                  chartMode === "month"
                    ? "months" in seriesData
                      ? seriesData.months
                      : []
                    : "days" in seriesData
                    ? seriesData.days
                    : [];
                const value = dataArray[idx]?.value || 0;
                const height = maxValue ? (value / maxValue) * 100 : 0;
                return (
                  <div
                    key={brick.id}
                    title={`${brick.name}: ${value.toLocaleString()} m²`}
                    className={styles.chartBar}
                    style={{
                      background: colors[i % colors.length],
                      height: `${height}%`,
                    }}
                  />
                );
              })}
            </div>
            <span className={styles.chartBarLabel}>
              {chartMode === "month"
                ? `Th${idx + 1}`
                : ["T2", "T3", "T4", "T5", "T6", "T7", "CN"][idx]}
            </span>
          </div>
        ))}
      </div>

      <div className={styles.chartLegend}>
        {bricks.map((b, i) => (
          <div key={b.id} className={styles.legendItem}>
            <div
              className={styles.legendColor}
              style={{ background: colors[i % colors.length] }}
            />
            <span>{b.name}</span>
            <span className={styles.legendValue}>
              ({formatNumber(getYearToDateProduction(b.id))} m²)
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
