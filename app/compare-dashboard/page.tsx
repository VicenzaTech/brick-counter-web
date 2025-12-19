'use client';

import { useMemo, useState, useCallback, useEffect, useDeferredValue } from 'react';
import { Select, DatePicker, Alert } from 'antd';
import { Line, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Filler,
    Tooltip,
    Legend,
} from 'chart.js';
import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

import styles from './CompareDashboard.module.css';
import { getActualOutput, MOCK_ANALYTICS_RECORDS } from '@/lib/mock/dashboard-data';
import { useProductionAnalyticsData } from '@/hooks/useProductionAnalyticsData';
import { fetchWorkshops } from '@/lib/services/workshops';
import {
    fetchWorkshopTargets as fetchWorkshopTargetsService,
    WorkshopTargetItem,
} from '@/lib/services/workshop-targets';

dayjs.extend(isBetween);

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend);

type FactoryOption = {
    value: string;
    label: string;
    multiplier: number;
    workshopId?: number;
};

const DEFAULT_FACTORY_OPTIONS: FactoryOption[] = [
    { value: 'factory-a', label: 'Phân xưởng Bắc Ninh - Line 1', multiplier: 1 },
    { value: 'factory-b', label: 'Phân xưởng Bình Dương - Line A', multiplier: 0.92 },
    { value: 'factory-c', label: 'Phân xưởng Nghệ An - Line 2', multiplier: 0.84 },
];

const highlightCards = [
    {
        key: 'totalActual',
        label: 'Sản lượng thực tế',
        unit: 'm2',
        deltaLabel: 'Nhà máy 2 thấp hơn 6.5%',
        deltaTone: 'negative' as const,
    },
    {
        key: 'averageDaily',
        label: 'Trung bình/ngày',
        unit: 'm2',
        deltaLabel: 'Dữ liệu 30 ngày gần nhất',
        deltaTone: 'neutral' as const,
    },
    {
        key: 'progress',
        label: 'Tỷ lệ đạt mục tiêu',
        formatter: (value: number) => `${value.toFixed(2)}%`,
        deltaLabel: 'Nhà máy 2 cần cải thiện',
        deltaTone: 'warning' as const,
    },
    {
        key: 'defect',
        label: 'Khuyết tật & phế phẩm',
        unit: 'm2',
        deltaLabel: 'Nhà máy 1 hiệu quả hơn',
        deltaTone: 'positive' as const,
    },
] as const;

const dotStyle = (color: string) => ({
    width: 8,
    height: 8,
    borderRadius: '50%',
    display: 'inline-block',
    background: color,
});

const deltaColor = (tone: (typeof highlightCards)[number]['deltaTone']) => {
    switch (tone) {
        case 'positive':
            return '#22c55e';
        case 'negative':
            return '#ef4444';
        case 'warning':
            return '#f97316';
        default:
            return '#94a3b8';
    }
};

const formatNumber = (value: number, options?: { unit?: string; fractionDigits?: number }) => {
    if (!Number.isFinite(value)) {
        return '--';
    }
    const formatted =
        value >= 1_000_000
            ? `${(value / 1_000_000).toFixed(options?.fractionDigits ?? 2)}M`
            : value >= 1_000
              ? `${(value / 1_000).toFixed(options?.fractionDigits ?? 1)}K`
              : value.toFixed(options?.fractionDigits ?? 0);
    return options?.unit ? `${formatted} ${options.unit}` : formatted;
};

const smoothSeries = (values: number[], windowSize = 3) => {
    if (values.length <= 2) {
        return values;
    }
    const half = Math.floor(windowSize / 2);
    return values.map((_, index) => {
        const start = Math.max(0, index - half);
        const end = Math.min(values.length - 1, index + half);
        const slice = values.slice(start, end + 1);
        const average = slice.reduce((sum, value) => sum + value, 0) / slice.length;
        return Math.round(average);
    });
};

const hexToRgba = (hex: string, alpha: number) => {
    const sanitized = hex.replace('#', '');
    const bigint = parseInt(sanitized, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const toCumulative = (values: number[]) => {
    let sum = 0;
    return values.map(value => {
        sum += value;
        return Math.round(sum);
    });
};

interface FactoryMetrics {
    label: string;
    multiplier: number;
    totalActual: number;
    averageDaily: number;
    totalTarget: number;
    progress: number;
    defect: number;
    shortfall: number;
    trend: { labels: string[]; actual: number[]; target: number[] };
}

export default function CompareDashboard() {
    const [factoryOptionsState, setFactoryOptionsState] = useState<FactoryOption[]>(DEFAULT_FACTORY_OPTIONS);
    const [factoryA, setFactoryA] = useState(DEFAULT_FACTORY_OPTIONS[0]?.value ?? '');
    const [factoryB, setFactoryB] = useState(
        DEFAULT_FACTORY_OPTIONS[1]?.value ?? DEFAULT_FACTORY_OPTIONS[0]?.value ?? ''
    );
    const [timeView, setTimeView] = useState<'month' | 'year'>('month');
    const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
    const [factoryTargets, setFactoryTargets] = useState<Record<string, WorkshopTargetItem | null>>({});
    const [trendDisplayMode, setTrendDisplayMode] = useState<'actual' | 'cumulative'>('actual');

    useEffect(() => {
        let cancelled = false;
        const loadWorkshops = async () => {
            const result = await fetchWorkshops();
            if (cancelled) {
                return;
            }
            if (result.length) {
                const multiplierSequence = [1, 0.94, 1.06, 0.9, 1.12];
                const mapped = result.map((workshop, index) => ({
                    value: String(workshop.id),
                    label: workshop.name,
                    multiplier: multiplierSequence[index % multiplierSequence.length] ?? 1,
                    workshopId: workshop.id,
                }));
                setFactoryOptionsState(mapped);
                setFactoryA(prev => (mapped.some(option => option.value === prev) ? prev : mapped[0]?.value ?? prev));
                setFactoryB(prev => {
                    if (mapped.some(option => option.value === prev)) {
                        return prev;
                    }
                    if (mapped.length > 1) {
                        return mapped[1].value;
                    }
                    return mapped[0]?.value ?? prev;
                });
            }
        };

        loadWorkshops();

        return () => {
            cancelled = true;
        };
    }, []);

    const handleTimeViewChange = (value: 'month' | 'year') => {
        setTimeView(value);
        setSelectedDate(dayjs());
    };

    const handleDateChange = (value: Dayjs | null) => {
        setSelectedDate(value ?? dayjs());
    };

    const rangeStart = useMemo(
        () => selectedDate.startOf(timeView === 'month' ? 'month' : 'year'),
        [selectedDate, timeView]
    );
    const rangeEnd = useMemo(
        () => selectedDate.endOf(timeView === 'month' ? 'month' : 'year'),
        [selectedDate, timeView]
    );
    const analyticsParams = useMemo(
        () => ({
            productionLine: 'all',
            from: rangeStart.startOf('day').toISOString(),
            to: rangeEnd.endOf('day').toISOString(),
        }),
        [rangeStart, rangeEnd]
    );
    const {
        records: analyticsRecords,
        loading: analyticsLoading,
        error: analyticsError,
        hasHydrated: hasHydratedAnalytics,
    } = useProductionAnalyticsData(analyticsParams);
    const deferredAnalyticsRecords = useDeferredValue(analyticsRecords);

    const selectedYear = rangeEnd.year();

    useEffect(() => {
        let cancelled = false;

        const loadTargetFor = async (factoryValue: string) => {
            const option = factoryOptionsState.find(item => item.value === factoryValue);
            if (!option?.workshopId) {
                return;
            }
            try {
                const payload = await fetchWorkshopTargetsService({
                    workshopId: option.workshopId,
                    year: selectedYear,
                });
                if (cancelled) {
                    return;
                }
                const target =
                    payload.items?.find(item => item.workshopId === option.workshopId && item.year === selectedYear) ??
                    null;
                setFactoryTargets(prev => ({
                    ...prev,
                    [factoryValue]: target,
                }));
            } catch (error) {
                if (!cancelled) {
                    console.warn('Unable to load workshop target for compare dashboard', error);
                }
            }
        };

        if (factoryA) {
            loadTargetFor(factoryA);
        }
        if (factoryB) {
            loadTargetFor(factoryB);
        }

        return () => {
            cancelled = true;
        };
    }, [factoryA, factoryB, factoryOptionsState, selectedYear]);

    const sortedRecords = useMemo(
        () => [...deferredAnalyticsRecords].sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf()),
        [deferredAnalyticsRecords],
    );

    const filteredRecords = useMemo(() => {
        return sortedRecords.filter(record => {
            const recordDate = dayjs(record.date);
            return recordDate.isSame(rangeStart, 'day') || recordDate.isBetween(rangeStart, rangeEnd, 'day', '[]');
        });
    }, [rangeStart, rangeEnd, sortedRecords]);

    const buildFactoryMetrics = useCallback(
        (option: FactoryOption | undefined, target?: WorkshopTargetItem | null): FactoryMetrics => {
            const resolvedOption = option ?? factoryOptionsState[0] ?? DEFAULT_FACTORY_OPTIONS[0];
            const sourceRecords = filteredRecords.length ? filteredRecords : MOCK_ANALYTICS_RECORDS;
            const scaledRecords = sourceRecords.map(record => {
                const actual = getActualOutput(record) * resolvedOption.multiplier;
                const baseTarget =
                    (record.originalOutput || getActualOutput(record)) * resolvedOption.multiplier * 0.98;
                return {
                    date: record.date,
                    actual,
                    target: baseTarget,
                };
            });

            const totalActual = scaledRecords.reduce((sum, record) => sum + record.actual, 0);
            const computedTarget = scaledRecords.reduce((sum, record) => sum + record.target, 0) || totalActual * 1.05;
            const totalTarget = target?.yearlyTarget ?? computedTarget;
            const averageDaily = scaledRecords.length ? totalActual / scaledRecords.length : 0;
            const progress = totalTarget ? (totalActual / totalTarget) * 100 : 0;
            const defect = totalActual * (0.07 + (1 - resolvedOption.multiplier) * 0.05);
            const shortfall = Math.max(totalTarget - totalActual, 0);

            let labels: string[] = [];
            let actualSeries: number[] = [];
            let targetSeries: number[] = [];

            if (timeView === 'year') {
                const months = Array.from({ length: 12 }, (_, index) => index);
                labels = months.map(month => `Thg ${month + 1}`);
                const monthlyActual = months.map(() => 0);
                const monthlyTarget = months.map(() => 0);
                scaledRecords.forEach(record => {
                    const monthIndex = dayjs(record.date).month();
                    monthlyActual[monthIndex] += record.actual;
                    monthlyTarget[monthIndex] += record.target;
                });
                actualSeries = monthlyActual.map(value => Math.round(value));
                targetSeries = monthlyTarget.map(value => Math.round(value));
            } else {
                labels = scaledRecords.map(record => dayjs(record.date).format('DD/MM'));
                actualSeries = scaledRecords.map(record => Math.round(record.actual));
                targetSeries = scaledRecords.map(record => Math.round(record.target));
            }

            const smoothedActual = smoothSeries(actualSeries);
            let smoothedTarget = smoothSeries(targetSeries);

            if (target?.yearlyTarget) {
                if (timeView === 'year') {
                    const monthlyPlan = target.yearlyTarget / 12;
                    smoothedTarget = labels.map(() => Math.round(monthlyPlan));
                } else {
                    const daysCount = labels.length || 1;
                    const monthlyPlan = target.yearlyTarget / 12;
                    const dailyPlan = monthlyPlan / daysCount;
                    smoothedTarget = labels.map(() => Math.round(dailyPlan));
                }
            }

            return {
                label: resolvedOption.label,
                multiplier: resolvedOption.multiplier,
                totalActual,
                averageDaily,
                totalTarget,
                progress,
                defect,
                shortfall,
                trend: {
                    labels,
                    actual: smoothedActual,
                    target: smoothedTarget,
                },
            };
        },
        [filteredRecords, factoryOptionsState, timeView],
    );

    const selectedFactoryA =
        factoryOptionsState.find(option => option.value === factoryA) ??
        factoryOptionsState[0] ??
        DEFAULT_FACTORY_OPTIONS[0];
    const selectedFactoryB =
        factoryOptionsState.find(option => option.value === factoryB) ??
        factoryOptionsState[1] ??
        factoryOptionsState[0] ??
        DEFAULT_FACTORY_OPTIONS[1] ??
        DEFAULT_FACTORY_OPTIONS[0];
    const metricsA = useMemo(
        () => buildFactoryMetrics(selectedFactoryA, factoryTargets[factoryA]),
        [selectedFactoryA, buildFactoryMetrics, factoryTargets, factoryA]
    );
    const metricsB = useMemo(
        () => buildFactoryMetrics(selectedFactoryB, factoryTargets[factoryB]),
        [selectedFactoryB, buildFactoryMetrics, factoryTargets, factoryB]
    );

    const baseLineOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index' as const, intersect: false },
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (ctx: any) => {
                        const value = typeof ctx.parsed.y === 'number' ? ctx.parsed.y : 0;
                        return `${ctx.dataset.label}: ${value.toLocaleString('vi-VN')} m2`;
                    },
                },
            },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: '#94a3b8', maxRotation: 0 },
            },
            y: {
                beginAtZero: true,
                ticks: {
                    color: '#94a3b8',
                    callback: (value: string | number) => {
                        const numeric = typeof value === 'number' ? value : Number(value);
                        return `${Math.round(numeric / 1000)}k`;
                    },
                },
                grid: { color: 'rgba(226,232,240,0.6)', drawBorder: false },
            },
        },
    };

    const overlayChartData = useMemo(() => {
        const actualA =
            trendDisplayMode === 'cumulative' ? toCumulative(metricsA.trend.actual) : metricsA.trend.actual;
        const actualB =
            trendDisplayMode === 'cumulative' ? toCumulative(metricsB.trend.actual) : metricsB.trend.actual;
        return {
            labels: metricsA.trend.labels,
            datasets: [
                {
                    label: selectedFactoryA.label,
                    data: actualA,
                    borderColor: hexToRgba('#2563eb', 0.95),
                    backgroundColor: 'transparent',
                    borderWidth: 3,
                    tension: 0.35,
                    fill: false,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                },
                {
                    label: selectedFactoryB.label,
                    data: actualB,
                    borderColor: hexToRgba('#10b981', 0.95),
                    backgroundColor: 'transparent',
                    borderWidth: 3,
                    tension: 0.35,
                    fill: false,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                },
            ],
        };
    }, [metricsA, metricsB, selectedFactoryA.label, selectedFactoryB.label, trendDisplayMode]);

    const overlayChartOptions = {
        ...baseLineOptions,
        plugins: {
            ...baseLineOptions.plugins,
            legend: { display: true, position: 'bottom' as const },
        },
    };

    const totalBarData = useMemo(
        () => ({
            labels: ['Phân xưởng 1', 'Phân xưởng 2'],
            datasets: [
                {
                    label: 'Sản lượng tổng',
                    data: [metricsA.totalActual, metricsB.totalActual],
                    backgroundColor: ['#2563eb', '#10b981'],
                    borderRadius: 12,
                },
            ],
        }),
        [metricsA.totalActual, metricsB.totalActual],
    );

    const progressMeta = useMemo(
        () => [
            { name: selectedFactoryA.label, progress: metricsA.progress, color: '#2563eb' },
            { name: selectedFactoryB.label, progress: metricsB.progress, color: '#10b981' },
        ],
        [metricsA.progress, metricsB.progress, selectedFactoryA.label, selectedFactoryB.label],
    );

    const showSkeletonState = analyticsLoading && !hasHydratedAnalytics;
    const dimDuringRefresh = analyticsLoading && hasHydratedAnalytics;
    const loadingStateClass = `${styles.loadingState} ${dimDuringRefresh ? styles.loadingStateActive : ''}`;

    return (
        <div className={styles.wrapper}>
            <div className={styles.pageHeader}>
                <p className={styles.breadcrumb}>Trang chủ / So sánh hiệu suất</p>
                <h1 className={styles.pageTitle}>So sánh hiệu suất hai phân xưởng</h1>
            </div>

            <section className={styles.filtersCard}>
                <div className={styles.filtersRow}>
                    <div className={styles.filterField}>
                        <span className={styles.filterLabel}>Phân xưởng A (cơ sở)</span>
                        <Select
                            value={factoryA}
                            onChange={setFactoryA}
                            options={factoryOptionsState.map(option => ({
                                value: option.value,
                                label: option.label,
                            }))}
                            size="large"
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className={styles.filterField}>
                        <span className={styles.filterLabel}>Phân xưởng B (so sánh)</span>
                        <Select
                            value={factoryB}
                            onChange={setFactoryB}
                            options={factoryOptionsState.map(option => ({
                                value: option.value,
                                label: option.label,
                            }))}
                            size="large"
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className={styles.filterField}>
                        <span className={styles.filterLabel}>Khoảng thời gian</span>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <Select
                                value={timeView}
                                onChange={handleTimeViewChange}
                                options={[
                                    { value: 'month', label: 'Theo tháng' },
                                    { value: 'year', label: 'Theo năm' },
                                ]}
                                size="large"
                                style={{ minWidth: 140 }}
                            />
                            <DatePicker
                                picker={timeView === 'month' ? 'month' : 'year'}
                                value={selectedDate}
                                onChange={handleDateChange}
                                size="large"
                                format={timeView === 'month' ? 'MM/YYYY' : 'YYYY'}
                                style={{ flex: 1 }}
                            />
                        </div>
                    </div>
                    <div className={styles.filterField}>
                        <span className={styles.filterLabel}>Chế độ hiển thị</span>
                        <div className={styles.trendModeToggle}>
                            {[
                                { key: 'actual', label: 'Sản lượng' },
                                { key: 'cumulative', label: 'Lũy tiến' },
                            ].map(option => (
                                <button
                                    key={option.key}
                                    type="button"
                                    onClick={() => setTrendDisplayMode(option.key as 'actual' | 'cumulative')}
                                    className={`${styles.rangeButton} ${
                                        trendDisplayMode === option.key ? styles.rangeButtonActive : ''
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {analyticsError && (
                <Alert type="warning" showIcon message={analyticsError} style={{ borderRadius: 16, marginBottom: 24 }} />
            )}

            <section className={`${styles.metricsGrid} ${loadingStateClass}`} aria-busy={analyticsLoading}>
                {showSkeletonState
                    ? highlightCards.map(card => (
                          <div className={`${styles.metricCard} ${styles.skeletonCard}`} key={`metric-skeleton-${card.key}`}>
                              <span className={`${styles.skeletonBlock} ${styles.skeletonLabel}`} />
                              <div className={styles.skeletonMetricValues}>
                                  <span className={`${styles.skeletonBlock} ${styles.skeletonValue}`} />
                                  <span className={`${styles.skeletonBlock} ${styles.skeletonValue}`} />
                              </div>
                              <span className={`${styles.skeletonBlock} ${styles.skeletonBadge}`} />
                          </div>
                      ))
                    : highlightCards.map(card => {
                          const valueA = (metricsA as any)[card.key] as number;
                          const valueB = (metricsB as any)[card.key] as number;
                          const formatter =
                              card.formatter ??
                              ((value: number) =>
                                  formatNumber(value, { unit: card.unit, fractionDigits: card.key === 'defect' ? 0 : 1 }));
                          return (
                              <div className={styles.metricCard} key={card.key}>
                                  <h3>{card.label}</h3>
                                  <div className={styles.metricValues}>
                                      <div className={styles.metricValueBlock}>
                                          <span>
                                              <span style={dotStyle('#2563eb')} />
                                              PX 1
                                          </span>
                                          <strong>{formatter(valueA)}</strong>
                                      </div>
                                      <div className={styles.metricValueBlock}>
                                          <span>
                                              PX 2
                                              <span style={dotStyle('#10b981')} />
                                          </span>
                                          <strong>{formatter(valueB)}</strong>
                                      </div>
                                  </div>
                                  <span className={styles.metricDelta} style={{ color: deltaColor(card.deltaTone) }}>
                                      {card.deltaLabel}
                                  </span>
                              </div>
                          );
                      })}
            </section>

            <section className={`${styles.trendGrid} ${loadingStateClass}`} aria-busy={analyticsLoading}>
                {showSkeletonState
                    ? Array.from({ length: 2 }).map((_, index) => (
                          <div className={`${styles.trendCard} ${styles.skeletonCard}`} key={`trend-skeleton-${index}`}>
                              <span className={`${styles.skeletonBlock} ${styles.skeletonTitle}`} />
                              <div className={`${styles.skeletonBlock} ${styles.skeletonChart}`} />
                          </div>
                      ))
                    : [{ metrics: metricsA, color: '#2563eb', tag: 'Phân xưởng 1' }, { metrics: metricsB, color: '#10b981', tag: 'Phân xưởng 2' }].map(
                          ({ metrics, color, tag }) => (
                              <div className={styles.trendCard} key={tag}>
                                  <div className={styles.trendHeader}>
                                      <div>
                                          <p className={styles.eyebrow}>Xu hướng sản xuất</p>
                                          <h4>{metrics.label}</h4>
                                      </div>
                                      <div className={styles.trendLegend}>
                                          <span>
                                              <span className={styles.legendDot} style={{ background: color }} />
                                              Thực tế
                                          </span>
                                          <span>
                                              <span className={styles.legendDot} style={{ background: '#cbd5f5', border: '1px dashed #94a3b8' }} />
                                              Mục tiêu
                                          </span>
                                      </div>
                                  </div>
                                  <div className={styles.chartContainer}>
                                      {(() => {
                                          const actualSeries =
                                              trendDisplayMode === 'cumulative'
                                                  ? toCumulative(metrics.trend.actual)
                                                  : metrics.trend.actual;
                                          const targetSeries =
                                              trendDisplayMode === 'cumulative'
                                                  ? toCumulative(metrics.trend.target)
                                                  : metrics.trend.target;
                                          return (
                                              <Line
                                                  data={{
                                                      labels: metrics.trend.labels,
                                                      datasets: [
                                                          {
                                                              label: 'Thực tế',
                                                              data: actualSeries,
                                                              borderColor: hexToRgba(color, 0.95),
                                                              borderWidth: 3,
                                                              fill: false,
                                                              backgroundColor: 'transparent',
                                                              tension: 0.4,
                                                              pointRadius: 0,
                                                              pointHoverRadius: 4,
                                                          },
                                                          {
                                                              label: 'Mục tiêu',
                                                              data: targetSeries,
                                                              borderColor: hexToRgba(color, 0.45),
                                                              borderDash: [6, 6],
                                                              borderWidth: 2,
                                                              tension: 0.4,
                                                              pointRadius: 0,
                                                              fill: false,
                                                          },
                                                      ],
                                                  }}
                                                  options={baseLineOptions}
                                              />
                                          );
                                      })()}
                                  </div>
                              </div>
                          ),
                      )}
            </section>

            <section className={`${styles.compareRow} ${loadingStateClass}`} aria-busy={analyticsLoading}>
                {showSkeletonState ? (
                    <>
                        <div className={`${styles.overlayCard} ${styles.skeletonCard}`}>
                            <span className={`${styles.skeletonBlock} ${styles.skeletonTitle}`} />
                            <div className={`${styles.skeletonBlock} ${styles.skeletonChartTall}`} />
                        </div>

                        <div className={`${styles.summaryCard} ${styles.skeletonCard}`}>
                            <span className={`${styles.skeletonBlock} ${styles.skeletonTitle}`} />
                            <div className={`${styles.skeletonBlock} ${styles.skeletonChart}`} />
                            <div className={styles.skeletonStack}>
                                {Array.from({ length: 2 }).map((_, index) => (
                                    <span key={`summary-skeleton-${index}`} className={`${styles.skeletonBlock} ${styles.skeletonValue}`} />
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className={styles.overlayCard}>
                            <div className={styles.trendHeader}>
                                <div>
                                    <p className={styles.eyebrow}>So sánh trực tiếp</p>
                                    <h4>Diễn biến sản lượng thực tế</h4>
                                </div>
                                <div className={styles.trendLegend}>
                                    <span>
                                        <span className={styles.legendDot} style={{ background: '#2563eb' }} />
                                        {selectedFactoryA.label}
                                    </span>
                                    <span>
                                        <span className={styles.legendDot} style={{ background: '#10b981' }} />
                                        {selectedFactoryB.label}
                                    </span>
                                </div>
                            </div>
                            <div className={styles.chartContainer} style={{ height: 320 }}>
                                <Line data={overlayChartData} options={overlayChartOptions} />
                            </div>
                        </div>

                        <div className={styles.summaryCard}>
                            <div className={styles.trendHeader}>
                                <div>
                                    <p className={styles.eyebrow}>Tổng quan</p>
                                    <h4>Sản lượng & mục tiêu</h4>
                                </div>
                            </div>
                            <div className={styles.summaryBar}>
                                <Bar
                                    data={totalBarData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: { legend: { display: false } },
                                        scales: {
                                            y: {
                                                beginAtZero: true,
                                                ticks: {
                                                    callback: (value: string | number) => `${Math.round(Number(value) / 1000)}k`,
                                                },
                                                grid: { color: 'rgba(226,232,240,0.5)', drawBorder: false },
                                            },
                                            x: { grid: { display: false } },
                                        },
                                    }}
                                />
                            </div>
                            <div className={styles.progressList}>
                                {progressMeta.map(factory => (
                                    <div className={styles.progressItem} key={factory.name}>
                                        <span>
                                            {factory.name}
                                            <strong>{factory.progress.toFixed(1)}%</strong>
                                        </span>
                                        <div className={styles.progressBar}>
                                            <div
                                                className={styles.progressFill}
                                                style={{
                                                    width: `${Math.min(factory.progress, 120)}%`,
                                                    background: factory.color,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}
