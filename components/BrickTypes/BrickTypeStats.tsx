import {
  useBrickTypeStatistics,
  useBrickTypeTrend,
} from "@/hooks/useBrickTypes";
import { formatNumber } from "./helpers";
import styles from "./BrickTypeStats.module.css";
import type { TrendDataPoint } from "@/lib/types/brick-type";

interface BrickTypeStatsProps {
  brickId: number;
}

export function BrickTypeStats({ brickId }: BrickTypeStatsProps) {
  const { data: statistics, loading: statsLoading } =
    useBrickTypeStatistics(brickId);
  const { data: trend, loading: trendLoading } = useBrickTypeTrend(brickId, {
    groupBy: "day",
  });

  if (statsLoading || trendLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>Đang tải thống kê...</div>
      </div>
    );
  }

  if (!statistics || !trend) {
    return null;
  }

  const trendData = trend.data || [];
  const latestPoint = trendData[trendData.length - 1];
  const previousPoint = trendData[trendData.length - 2];

  // Calculate trends from data points
  const outputTrend =
    latestPoint && previousPoint
      ? ((latestPoint.production - previousPoint.production) /
          previousPoint.production) *
        100
      : 0;
  const efficiencyTrend =
    latestPoint && previousPoint
      ? ((latestPoint.efficiency - previousPoint.efficiency) /
          previousPoint.efficiency) *
        100
      : 0;

  const getTrendClass = (value: number) => {
    if (value > 0) return styles.trendUp;
    if (value < 0) return styles.trendDown;
    return styles.trendNeutral;
  };

  const getTrendSymbol = (value: number) => {
    if (value > 0) return "↑";
    if (value < 0) return "↓";
    return "→";
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Thống kê sản xuất</h2>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Tổng sản lượng</span>
            {outputTrend !== 0 && (
              <span className={getTrendClass(outputTrend)}>
                {getTrendSymbol(outputTrend)} {Math.abs(outputTrend).toFixed(1)}
                %
              </span>
            )}
          </div>
          <div className={styles.statValue}>
            {formatNumber(
              (statistics as any).totalOutput ?? statistics.totalProduction ?? 0
            )}{" "}
            m²
          </div>
          <div className={styles.statMeta}>
            {(statistics as any).productionRuns ??
              statistics.productionDays ??
              0}{" "}
            lượt sản xuất
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Tỷ lệ chính phẩm</span>
            {efficiencyTrend !== 0 && (
              <span className={getTrendClass(efficiencyTrend)}>
                {getTrendSymbol(efficiencyTrend)}{" "}
                {Math.abs(efficiencyTrend).toFixed(1)}%
              </span>
            )}
          </div>
          <div className={styles.statValue}>
            {(
              (statistics as any).qualityRate ??
              statistics.averageEfficiency ??
              0
            ).toFixed(1)}
            %
          </div>
          <div className={styles.statMeta}>
            {formatNumber((statistics as any).qualityOutput ?? 0)} m² chính phẩm
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Thời gian TB</span>
          </div>
          <div className={styles.statValue}>
            {((statistics as any).avgCycleTime ?? 0).toFixed(0)} phút
          </div>
          <div className={styles.statMeta}>Chu kỳ khoán trung bình</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Hoạt động gần đây</span>
          </div>
          <div className={styles.statValue}>
            {(statistics as any).activeDays ?? statistics.productionDays ?? 0}{" "}
            ngày
          </div>
          <div className={styles.statMeta}>Trong 30 ngày qua</div>
        </div>
      </div>

      {trendData && trendData.length > 0 && (
        <div className={styles.trendSection}>
          <h3 className={styles.trendTitle}>Xu hướng 7 ngày</h3>
          <div className={styles.trendChart}>
            <div className={styles.trendBars}>
              {trendData.map((point: TrendDataPoint, index: number) => (
                <div key={index} className={styles.trendBar}>
                  <div
                    className={styles.trendBarFill}
                    style={{
                      height: `${
                        (point.production /
                          Math.max(
                            ...trendData.map(
                              (p: TrendDataPoint) => p.production
                            )
                          )) *
                        100
                      }%`,
                    }}
                  />
                  <span className={styles.trendBarLabel}>
                    {new Date(point.date).getDate()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
