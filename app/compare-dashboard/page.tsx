'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { Select, DatePicker, Alert, Button } from 'antd';
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
import { getActualOutput, ProductionRecord } from '@/lib/mock/dashboard-data';
import { fetchWorkshops } from '@/lib/services/workshops';
import { fetchProductionAnalytics } from '@/lib/services/production-analytics';
import {
    fetchWorkshopTargets as fetchWorkshopTargetsService,
    WorkshopTargetItem,
} from '@/lib/services/workshop-targets';
import {
    ProductionLineRunStatistics,
    ProductionLineRunStatsTopLine,
    fetchProductionLineRunStatistics,
} from '@/lib/services/production-line-runs';

dayjs.extend(isBetween);

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend);

type FactoryOption = {
    value: string;
    label: string;
    multiplier: number;
    workshopId?: number;
    lineIds?: number[];
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

interface FactoryAnalyticsState {
    records: ProductionRecord[];
    loading: boolean;
    error: string | null;
}

const combineTopLines = (groups: ProductionLineRunStatsTopLine[][]): ProductionLineRunStatsTopLine[] => {
    const map = new Map<number, ProductionLineRunStatsTopLine>();
    groups.forEach(lines => {
        lines.forEach(line => {
            if (!line) {
                return;
            }
            const existing = map.get(line.productionLineId);
            if (existing) {
                existing.runCount += line.runCount;
                existing.totalPieces += line.totalPieces;
                existing.totalAreaM2 += line.totalAreaM2;
            } else {
                map.set(line.productionLineId, { ...line });
            }
        });
    });
    return Array.from(map.values());
};

const aggregateLineStatistics = (
    statsList: ProductionLineRunStatistics[]
): ProductionLineRunStatistics | null => {
    const valid = statsList.filter(Boolean);
    if (!valid.length) {
        return null;
    }
    const totalsAccumulator = valid.reduce(
        (acc, stats) => {
            const totals = stats.totals ?? {};
            const runs = totals.runs ?? 0;
            acc.runs += runs;
            acc.completedRuns += totals.completedRuns ?? 0;
            acc.inProgressRuns += totals.inProgressRuns ?? 0;
            acc.draftRuns += totals.draftRuns ?? 0;
            acc.totalPieces += totals.totalPieces ?? 0;
            acc.totalAreaM2 += totals.totalAreaM2 ?? 0;
            acc.durationWeighted += (totals.averageDurationMinutes ?? 0) * runs;
            acc.durationWeight += runs;
            return acc;
        },
        {
            runs: 0,
            completedRuns: 0,
            inProgressRuns: 0,
            draftRuns: 0,
            totalPieces: 0,
            totalAreaM2: 0,
            durationWeighted: 0,
            durationWeight: 0,
        }
    );
    const averageDuration =
        totalsAccumulator.durationWeight > 0
            ? totalsAccumulator.durationWeighted / totalsAccumulator.durationWeight
            : 0;
    const totals = {
        runs: totalsAccumulator.runs,
        completedRuns: totalsAccumulator.completedRuns,
        inProgressRuns: totalsAccumulator.inProgressRuns,
        draftRuns: totalsAccumulator.draftRuns,
        totalPieces: totalsAccumulator.totalPieces,
        totalAreaM2: totalsAccumulator.totalAreaM2,
        averageDurationMinutes: averageDuration,
    };
    const qualitySums = valid.reduce(
        (acc, stats) => ({
            a1Pieces: acc.a1Pieces + (stats.quality?.a1Pieces ?? 0),
            a2Pieces: acc.a2Pieces + (stats.quality?.a2Pieces ?? 0),
            wastePieces: acc.wastePieces + (stats.quality?.wastePieces ?? 0),
            yieldWeighted:
                acc.yieldWeighted + (stats.quality?.yieldPercent ?? 0) * (stats.totals?.totalAreaM2 ?? 0),
            yieldWeight: acc.yieldWeight + (stats.totals?.totalAreaM2 ?? 0),
        }),
        { a1Pieces: 0, a2Pieces: 0, wastePieces: 0, yieldWeighted: 0, yieldWeight: 0 }
    );
    const totalPieces = totals.totalPieces > 0 ? totals.totalPieces : 0;
    const wasteRate = totalPieces > 0 ? (qualitySums.wastePieces / totalPieces) * 100 : 0;
    const yieldPercent =
        qualitySums.yieldWeight > 0 ? qualitySums.yieldWeighted / qualitySums.yieldWeight : 0;
    const statusMap = new Map<string, number>();
    valid.forEach(stats => {
        stats.statusBreakdown?.forEach(item => {
            statusMap.set(item.status, (statusMap.get(item.status) ?? 0) + (item.count ?? 0));
        });
    });
    const topLines = combineTopLines(valid.map(stats => stats.topLines ?? []));
    return {
        filters: valid[0]?.filters,
        totals,
        quality: {
            a1Pieces: qualitySums.a1Pieces,
            a2Pieces: qualitySums.a2Pieces,
            wastePieces: qualitySums.wastePieces,
            wasteRate,
            yieldPercent,
        },
        statusBreakdown: Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })),
        topLines,
        charts: undefined,
    };
};

const resolveRecordArea = (record: ProductionRecord) => {
    if (typeof (record as any).totalAreaM2 === 'number') {
        return Number(record.totalAreaM2);
    }
    return getActualOutput(record);
};

const shouldSmoothSeries = (values: number[]) => {
    const nonZeroCount = values.filter(value => Math.abs(value) > 0.0001).length;
    return values.length > 2 && nonZeroCount >= 3;
};

const maybeSmoothSeries = (values: number[], windowSize = 3) => {
    if (!shouldSmoothSeries(values)) {
        return values;
    }
    return smoothSeries(values, windowSize);
};

const mergeAnalyticsRecords = (
    factoryKey: string,
    recordGroups: ProductionRecord[][]
): ProductionRecord[] => {
    const map = new Map<string, ProductionRecord>();
    recordGroups.forEach(records => {
        records.forEach(record => {
            const dateKey = record.date;
            const existing = map.get(dateKey);
            const resolvedArea = resolveRecordArea(record);
            if (!existing) {
                map.set(dateKey, {
                    ...record,
                    key: `${factoryKey}-${dateKey}`,
                    lineName: 'Tong hop',
                    totalAreaM2: resolvedArea,
                });
                return;
            }
            existing.originalOutput += record.originalOutput;
            existing.a1 += record.a1;
            existing.a2 += record.a2;
            existing.cut += record.cut;
            existing.waste1 += record.waste1;
            existing.waste2 += record.waste2;
            existing.scrap += record.scrap;
            existing.waste_moc += record.waste_moc;
            existing.waste_lo += record.waste_lo;
            existing.waste_truoc_mai += record.waste_truoc_mai;
            existing.waste_thanh_pham += record.waste_thanh_pham;
            existing.totalAreaM2 = (existing.totalAreaM2 ?? 0) + resolvedArea;
        });
    });
    return Array.from(map.entries())
        .sort((a, b) => dayjs(a[0]).valueOf() - dayjs(b[0]).valueOf())
        .map(([, record]) => record);
};

function useResponsiveBreakpoint(query: string) {
    const [matches, setMatches] = useState(false);
    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        const media = window.matchMedia(query);
        const updateMatch = () => setMatches(media.matches);
        updateMatch();
        media.addEventListener('change', updateMatch);
        return () => media.removeEventListener('change', updateMatch);
    }, [query]);
    return matches;
}

export default function CompareDashboard() {
    const [factoryOptionsState, setFactoryOptionsState] = useState<FactoryOption[]>(DEFAULT_FACTORY_OPTIONS);
    const [factoryA, setFactoryA] = useState('');
    const [factoryB, setFactoryB] = useState('');
    const [timeView, setTimeView] = useState<'month' | 'year'>('year');
    const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
    const [factoryTargets, setFactoryTargets] = useState<Record<string, WorkshopTargetItem | null>>({});
    const [trendDisplayMode, setTrendDisplayMode] = useState<'actual' | 'cumulative'>('cumulative');
    const [lineStatsMap, setLineStatsMap] = useState<Record<string, ProductionLineRunStatistics | null>>({});
    const [lineStatsLoading, setLineStatsLoading] = useState(false);
    const [lineStatsHydrated, setLineStatsHydrated] = useState(false);
    const [lineStatsError, setLineStatsError] = useState<string | null>(null);
    const [workshopsError, setWorkshopsError] = useState<string | null>(null);
    const [factoryAnalyticsMap, setFactoryAnalyticsMap] = useState<Record<string, FactoryAnalyticsState>>({});
    const resolveFactoryOption = useCallback(
        (value: string | null | undefined) => {
            if (!value) {
                return undefined;
            }
            return factoryOptionsState.find(option => option.value === value);
        },
        [factoryOptionsState]
    );
    const resolveWorkshopId = useCallback(
        (value: string | null | undefined) => {
            if (!value) {
                return null;
            }
            const option = resolveFactoryOption(value);
            if (option?.workshopId) {
                return option.workshopId;
            }
            const parsed = Number(value);
            if (!Number.isFinite(parsed)) {
                return null;
            }
            return parsed;
        },
        [resolveFactoryOption]
    );
    const resolveProductionLineId = useCallback(
        (value: string | null | undefined) => {
            if (!value) {
                return null;
            }
            const option = resolveFactoryOption(value);
            const lineId = option?.lineIds?.[0];
            if (typeof lineId === 'number') {
                return lineId;
            }
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : null;
        },
        [resolveFactoryOption]
    );
    const getFactoryLineIds = useCallback(
        (value: string | null | undefined) => {
            if (!value) {
                return [];
            }
            const option = resolveFactoryOption(value);
            const ids = option?.lineIds?.filter(id => typeof id === 'number') ?? [];
            if (ids.length) {
                return ids;
            }
            const fallback = resolveProductionLineId(value);
            return fallback ? [fallback] : [];
        },
        [resolveFactoryOption, resolveProductionLineId]
    );

    useEffect(() => {
        let cancelled = false;
        const loadWorkshops = async () => {
            try {
                const result = await fetchWorkshops();
                if (cancelled) {
                    return;
                }
                if (result.length) {
                    const multiplierSequence = [1, 0.94, 1.06, 0.9, 1.12];
                    const mapped = result.map((workshop, index) => {
                        const lineIds = workshop.lines?.map(line => line.id).filter((id): id is number => typeof id === 'number') ?? [];
                        return {
                            value: String(workshop.id),
                            label: workshop.name,
                            multiplier: multiplierSequence[index % multiplierSequence.length] ?? 1,
                            workshopId: workshop.id,
                            lineIds,
                        };
                    });
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
                setWorkshopsError(null);
            } catch (error) {
                if (!cancelled) {
                    console.error('Unable to load workshops for compare dashboard', error);
                    setWorkshopsError('Không thể tải danh sách phân xưởng.');
                }
            }
        };
        loadWorkshops();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleTimeViewChange = (value: 'month' | 'year') => {
        setTimeView(value);
        setSelectedDate(value === 'year' ? dayjs().subtract(1, 'year') : dayjs());
    };

    const handleDateChange = (value: Dayjs | null) => {
        if (value) {
            setSelectedDate(value);
            return;
        }
        setSelectedDate(timeView === 'year' ? dayjs().subtract(1, 'year') : dayjs());
    };

    const rangeStart = useMemo(
        () => selectedDate.startOf(timeView === 'month' ? 'month' : 'year'),
        [selectedDate, timeView]
    );
    const rangeEnd = useMemo(
        () => selectedDate.endOf(timeView === 'month' ? 'month' : 'year'),
        [selectedDate, timeView]
    );
    const rangeDays = useMemo(() => Math.max(rangeEnd.diff(rangeStart, 'day'), 0) + 1, [rangeEnd, rangeStart]);
    const selectedYear = rangeEnd.year();
    useEffect(() => {
        console.log('factories: ', factoryA, factoryB, factoryOptionsState)
        if (!factoryOptionsState.length) {
            return;
        }
        let cancelled = false;
        const loadLineStats = async () => {
            const targets = Array.from(new Set([factoryA, factoryB].filter(Boolean)));
            if (!targets.length) {
                setLineStatsMap({});
                setLineStatsHydrated(true);
                setLineStatsLoading(false);
                setLineStatsError(null);
                return;
            }
            setLineStatsLoading(true);
            setLineStatsError(null);
            try {
                const results = await Promise.all(
                    targets.map(async value => {
                        const lineIds = getFactoryLineIds(value);
                        if (!lineIds.length) {
                            return { value, stats: null };
                        }
                        try {
                            const statsList = await Promise.all(
                                lineIds.map(async lineId => {
                                    try {
                                        return await fetchProductionLineRunStatistics({
                                            productionLineId: lineId,
                                            from: rangeStart.startOf('day').toISOString(),
                                            to: rangeEnd.endOf('day').toISOString(),
                                        });
                                    } catch (error) {
                                        console.warn('Unable to load line statistics for line', lineId, error);
                                        return null;
                                    }
                                })
                            );
                            const aggregated = aggregateLineStatistics(
                                statsList.filter(Boolean) as ProductionLineRunStatistics[]
                            );
                            return { value, stats: aggregated };
                        } catch (error) {
                            console.warn('Unable to load line statistics', error);
                            return { value, stats: null };
                        }
                    })
                );
                if (cancelled) {
                    return;
                }

                setLineStatsMap(prev => {
                    const next = { ...prev };
                    results.forEach(result => {
                        if (!result) {
                            return;
                        }
                        next[result.value] = result.stats ?? null;
                    });
                    return next;
                });

                console.log('lineSTatsMap: ', lineStatsMap)
                const hasMissingStats = results.some(item => item?.stats == null);
                if (hasMissingStats) {
                    setLineStatsError('Không thể tải đầy đủ thống kê thực tế.');
                } else {
                    setLineStatsError(null);
                }
            } catch (error) {
                if (!cancelled) {
                    setLineStatsError('Không thể tải thống kê thực tế.');
                }
            } finally {
                if (!cancelled) {
                    setLineStatsLoading(false);
                    setLineStatsHydrated(true);
                }
            }
        };

        loadLineStats();

        return () => {
            cancelled = true;
        };
    }, [factoryA, factoryB, rangeStart, rangeEnd, getFactoryLineIds, factoryOptionsState]);

    useEffect(() => {
        if (!factoryOptionsState.length) {
            return;
        }
        let cancelled = false;
        const targets = Array.from(new Set([factoryA, factoryB].filter(Boolean)));
        setFactoryAnalyticsMap(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(key => {
                if (!targets.includes(key)) {
                    delete next[key];
                }
            });
            return next;
        });

        console.log('factory: ', factoryAnalyticsMap)
        if (!targets.length) {
            return;
        }
        targets.forEach(value => {
            const lineIds = getFactoryLineIds(value);
            if (!lineIds.length) {
                setFactoryAnalyticsMap(prev => ({
                    ...prev,
                    [value]: { records: [], loading: false, error: 'Không xác định được dây chuyền.' },
                }));
                return;
            }
            setFactoryAnalyticsMap(prev => ({
                ...prev,
                [value]: {
                    records: prev[value]?.records ?? [],
                    loading: true,
                    error: null,
                },
            }));
            Promise.all(
                lineIds.map(lineId =>
                    fetchProductionAnalytics({
                        productionLine: String(lineId),
                        from: rangeStart.startOf('day').toISOString(),
                        to: rangeEnd.endOf('day').toISOString(),
                        useMock: false,
                        allowEmptyResults: true,
                    }).catch(error => {
                        console.warn('Unable to load analytics for line', lineId, error);
                        return null;
                    })
                )
            )
                .then(results => {
                    if (cancelled) {
                        return;
                    }
                    const validResults = results.filter(Boolean);
                    if (!validResults.length) {
                        setFactoryAnalyticsMap(prev => ({
                            ...prev,
                            [value]: {
                                records: [],
                                loading: false,
                                error: 'Không thể tải dữ liệu sản lượng.',
                            },
                        }));
                        return;
                    }
                    const mergedRecords = mergeAnalyticsRecords(
                        value,
                        validResults.map(result => result?.records ?? [])
                    );
                    const aggregatedError =
                        validResults.map(result => result?.error).find(error => error) ?? null;
                    setFactoryAnalyticsMap(prev => ({
                        ...prev,
                        [value]: {
                            records: mergedRecords,
                            loading: false,
                            error: aggregatedError,
                        },
                    }));
                })
                .catch(() => {
                    if (cancelled) {
                        return;
                    }
                    setFactoryAnalyticsMap(prev => ({
                        ...prev,
                        [value]: {
                            records: [],
                            loading: false,
                            error: 'Không thể tải dữ liệu sản lượng.',
                        },
                    }));
                });
        });
        return () => {
            cancelled = true;
        };
    }, [factoryA, factoryB, rangeStart, rangeEnd, getFactoryLineIds, factoryOptionsState]);

    useEffect(() => {
        let cancelled = false;

        const loadTargetFor = async (factoryValue: string) => {
            const workshopId = resolveWorkshopId(factoryValue);
            if (!workshopId) {
                return;
            }
            try {
                const payload = await fetchWorkshopTargetsService({
                    workshopId,
                    year: selectedYear,
                });
                if (cancelled) {
                    return;
                }
                const target =
                    payload.items?.find(item => item.workshopId === workshopId && item.year === selectedYear) ?? null;
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
    }, [factoryA, factoryB, selectedYear, resolveWorkshopId]);

    const getFactoryRecords = useCallback(
        (factoryValue: string | undefined) => {
            if (!factoryValue) {
                return [];
            }
            return factoryAnalyticsMap[factoryValue]?.records ?? [];
        },
        [factoryAnalyticsMap]
    );

    const buildFactoryMetrics = useCallback(
        (option: FactoryOption | undefined, target?: WorkshopTargetItem | null): FactoryMetrics => {
            const resolvedOption = option ?? factoryOptionsState[0] ?? DEFAULT_FACTORY_OPTIONS[0];
            const sourceRecords = getFactoryRecords(option?.value);
            const scaledRecords = sourceRecords.map(record => {
                const actual = resolveRecordArea(record);
                const nominalTargetSource =
                    (record as any).totalAreaM2 ?? record.originalOutput ?? getActualOutput(record);
                const baseTarget = nominalTargetSource * 0.98;
                return {
                    date: record.date,
                    actual,
                    target: baseTarget,
                };
            });

            const stats = resolvedOption ? lineStatsMap[resolvedOption.value] : undefined;
            const statsTotals = stats?.totals;
            const statsQuality = stats?.quality;
            const fallbackTotalActual = scaledRecords.reduce((sum, record) => sum + record.actual, 0);
            const totalActualFromStats =
                typeof statsTotals?.totalAreaM2 === 'number' ? statsTotals.totalAreaM2 : null;
            let totalActual = totalActualFromStats ?? fallbackTotalActual;
            const computedTarget = scaledRecords.reduce((sum, record) => sum + record.target, 0);
            const inferredTarget =
                computedTarget || (totalActual ? totalActual * 1.05 : statsTotals?.totalAreaM2 ?? 0);
            const totalTarget = target?.yearlyTarget ?? inferredTarget;
            const averageDaily = rangeDays > 0 ? totalActual / rangeDays : totalActual;
            const progress = totalTarget ? (totalActual / totalTarget) * 100 : 0;
            let defect = totalActual * 0.07;
            if (typeof statsQuality?.wasteRate === 'number' && typeof statsTotals?.totalAreaM2 === 'number') {
                defect = statsTotals.totalAreaM2 * statsQuality.wasteRate;
            }
            const shortfall = Math.max(totalTarget - totalActual, 0);

            let labels: string[] = [];
            let actualSeries: number[] = [];
            let targetSeries: number[] = [];

            if (scaledRecords.length) {
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
            } else if (timeView === 'year') {
                const months = Array.from({ length: 12 }, (_, index) => index);
                labels = months.map(month => `Thg ${month + 1}`);
                const perMonth = labels.length ? (statsTotals?.totalAreaM2 ?? 0) / labels.length : 0;
                actualSeries = labels.map(() => Math.round(perMonth));
                const targetBaseline = target?.yearlyTarget ?? totalTarget ?? 0;
                targetSeries = labels.map(() => Math.round(targetBaseline / (labels.length || 1)));
            } else {
                const daysCount = Math.max(rangeDays, 1);
                labels = Array.from({ length: daysCount }, (_, index) =>
                    rangeStart.startOf('day').add(index, 'day').format('DD/MM')
                );
                const perDay = labels.length ? (statsTotals?.totalAreaM2 ?? 0) / labels.length : 0;
                actualSeries = labels.map(() => Math.round(perDay));
                const targetBaseline = target?.yearlyTarget ?? totalTarget ?? 0;
                targetSeries = labels.map(() => Math.round(targetBaseline / (labels.length || 1)));
            }

            const smoothedActual = maybeSmoothSeries(actualSeries);
            let smoothedTarget = maybeSmoothSeries(targetSeries);

            if (target?.yearlyTarget) {
                if (timeView === 'year') {
                    const monthlyPlan = target.yearlyTarget / (labels.length || 1);
                    smoothedTarget = labels.map(() => Math.round(monthlyPlan));
                } else {
                    const dailyPlan = target.yearlyTarget / (labels.length || 1);
                    smoothedTarget = labels.map(() => Math.round(dailyPlan));
                }
            } else if (!targetSeries.length && totalTarget) {
                const perLabel = totalTarget / (labels.length || 1);
                smoothedTarget = labels.map(() => Math.round(perLabel));
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
        [factoryOptionsState, timeView, lineStatsMap, rangeDays, rangeStart, getFactoryRecords],
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
    const isTabletViewport = useResponsiveBreakpoint('(max-width: 1024px)');
    const isMobileViewport = useResponsiveBreakpoint('(max-width: 768px)');

    const baseLineOptions = useMemo(() => {
        const xTickFontSize = isMobileViewport ? 10 : isTabletViewport ? 11 : 12;
        const yTickFontSize = isMobileViewport ? 10 : 12;
        const xTicks: Record<string, unknown> = {
            color: '#94a3b8',
            maxRotation: 0,
            font: { size: xTickFontSize },
        };
        if (isMobileViewport) {
            xTicks.maxTicksLimit = 4;
        } else if (isTabletViewport) {
            xTicks.maxTicksLimit = 8;
        }
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index' as const, intersect: false },
            plugins: {
                legend: { display: !isMobileViewport },
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
                    ticks: xTicks,
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#94a3b8',
                        font: { size: yTickFontSize },
                        callback: (value: string | number) => {
                            const numeric = typeof value === 'number' ? value : Number(value);
                            return `${Math.round(numeric / 1000)}k`;
                        },
                    },
                    grid: {
                        color: isTabletViewport ? 'rgba(226,232,240,0.45)' : 'rgba(226,232,240,0.6)',
                        drawBorder: false,
                    },
                },
            },
        };
    }, [isMobileViewport, isTabletViewport]);

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

    const overlayChartOptions = useMemo(
        () => ({
            ...baseLineOptions,
            plugins: {
                ...baseLineOptions.plugins,
                legend: {
                    display: true,
                    position: isMobileViewport ? 'top' : 'bottom',
                    labels: {
                        boxWidth: 12,
                        boxHeight: 12,
                        font: { size: isMobileViewport ? 11 : 12 },
                    },
                },
            },
        }),
        [baseLineOptions, isMobileViewport]
    );

    const totalBarData = useMemo(
        () => ({
            labels: ['Phân xưởng A', 'Phân xưởng B'],
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
    const summaryBarOptions = useMemo(
        () => ({
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: { size: isMobileViewport ? 10 : 12 },
                        callback: (value: string | number) => `${Math.round(Number(value) / 1000)}k`,
                    },
                    grid: {
                        color: isTabletViewport ? 'rgba(226,232,240,0.4)' : 'rgba(226,232,240,0.5)',
                        drawBorder: false,
                    },
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { size: isMobileViewport ? 10 : 12 } },
                },
            },
        }),
        [isMobileViewport, isTabletViewport]
    );

    const analyticsTargets = useMemo(
        () => Array.from(new Set([factoryA, factoryB].filter(Boolean))),
        [factoryA, factoryB]
    );
    const analyticsLoading = useMemo(() => {
        if (!analyticsTargets.length) {
            return false;
        }
        return analyticsTargets.some(value => {
            const entry = factoryAnalyticsMap[value];
            return !entry || entry.loading;
        });
    }, [analyticsTargets, factoryAnalyticsMap]);
    const analyticsHydrated = useMemo(() => {
        if (!analyticsTargets.length) {
            return true;
        }
        return analyticsTargets.every(value => {
            const entry = factoryAnalyticsMap[value];
            return Boolean(entry && !entry.loading);
        });
    }, [analyticsTargets, factoryAnalyticsMap]);
    const analyticsError = useMemo(
        () => analyticsTargets.map(value => factoryAnalyticsMap[value]?.error).find(error => error) ?? null,
        [analyticsTargets, factoryAnalyticsMap]
    );

    const combinedLoading = analyticsLoading || lineStatsLoading;
    const hasHydratedStats = analyticsHydrated && lineStatsHydrated;
    const showSkeletonState = combinedLoading && !hasHydratedStats;
    const dimDuringRefresh = combinedLoading && hasHydratedStats;
    const loadingStateClass = `${styles.loadingState} ${dimDuringRefresh ? styles.loadingStateActive : ''}`;
    const combinedError = analyticsError ?? lineStatsError;
    const errorMessages = [workshopsError, combinedError].filter((message): message is string => Boolean(message));

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
                        <div className={styles.dateRangeControls}>
                            <div className={styles.dateRangeItem}>
                                <Select
                                    value={timeView}
                                    onChange={handleTimeViewChange}
                                    options={[
                                        { value: 'month', label: 'Theo tháng' },
                                        { value: 'year', label: 'Theo năm' },
                                    ]}
                                    size="large"
                                />
                            </div>
                            <div className={`${styles.dateRangeItem} ${styles.dateRangeItemGrow}`}>
                                <DatePicker
                                    picker={timeView === 'month' ? 'month' : 'year'}
                                    value={selectedDate}
                                    onChange={handleDateChange}
                                    size="large"
                                    format={timeView === 'month' ? 'MM/YYYY' : 'YYYY'}
                                />
                            </div>
                        </div>
                    </div>
                    <div className={styles.filterField}>
                        <span className={styles.filterLabel}>Chế độ hiển thị</span>
                        <div className={styles.trendModeToggle}>
                            {[
                                { key: 'cumulative', label: 'Lũy tiến' },
                                { key: 'actual', label: 'Sản lượng' },
                            ].map(option => (
                                <Button
                                    key={option.key}
                                    onClick={() => setTrendDisplayMode(option.key as 'actual' | 'cumulative')}
                                    className={`${styles.rangeButton} ${trendDisplayMode === option.key ? styles.rangeButtonActive : ''
                                        }`}
                                >
                                    {option.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {errorMessages.map((message, index) => (
                <Alert
                    key={`compare-error-${index}`}
                    type="warning"
                    showIcon
                    message={message}
                    style={{ borderRadius: 16, marginBottom: 24 }}
                />
            ))}

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
                            <div className={styles.chartContainer}>
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
                                    options={summaryBarOptions}
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
