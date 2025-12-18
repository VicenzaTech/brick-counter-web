'use client';

import { useState, useMemo, useEffect, useReducer, useRef } from 'react';
import { Card, Select, Space, Typography, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType, TableProps } from 'antd/es/table';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title as ChartTitle,
    Tooltip as ChartTooltip,
    Legend,
    Filler,
    ArcElement,
    BarElement,
} from 'chart.js';
import type { ScriptableContext, TooltipItem } from 'chart.js';
import dayjs, { Dayjs } from 'dayjs';
// Import CSS Module
import styles from './Dashboard.module.css';

import { apiFetch } from '@/lib/http/http';
import Link from 'next/link';
import {
    DEFAULT_DATE_PRESETS,
    DEFAULT_LINE_OPTIONS,
    DatePreset,
    DetailedProductionRecord,
    KpiCardPayload,
    LineOption,
    MOCK_ANALYTICS_RECORDS,
    MOCK_DETAIL_TABLE_DATA,
    MOCK_KPI_CARDS,
    MOCK_LINE_OPTIONS,
    PRESET_LABEL_OVERRIDES,
    ProductionRecord,
    RangePreset,
    RunsAnalyticsResponse,
    STAGE_NAME_META,
    STOP_REASON_META,
    StageNameKey,
    StopReasonKey,
    getActualOutput,
    getMockDetailRows,
} from '@/lib/mock/dashboard-data';

const { Text } = Typography;

// ??ng k? c?c th?nh ph?n c?a Chart.js
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ChartTitle,
    ChartTooltip,
    Legend,
    Filler,
    ArcElement
);

interface ProductionStageHistoryResponse {
    id?: number | string;
    startTime?: string | null;
    endTime?: string | null;
    productionLine?: { name?: string | null } | null;
    stage?: { name?: string | null } | null;
    product?: { name?: string | null } | null;
    quantity?: number | string | null;
    area?: number | string | null;
    createdByUsername?: string | null;
    stopReason?: StopReasonKey | null;
    isEmergency?: boolean | null;
    notes?: string | null;
}

interface DetailTableState {
    loading: boolean;
    data: DetailedProductionRecord[];
    total: number;
    error?: string;
    pagination: {
        current: number;
        pageSize: number;
    };
}

type DetailTableAction =
    | { type: 'REQUEST' }
    | { type: 'SUCCESS'; payload: { data: DetailedProductionRecord[]; total: number; resetPage?: boolean } }
    | { type: 'FAIL'; payload: { error: string } }
    | { type: 'SET_PAGE'; payload: { current: number; pageSize?: number } };

const detailTableInitialState: DetailTableState = {
    loading: false,
    data: [],
    total: 0,
    pagination: {
        current: 1,
        pageSize: 10,
    },
};

function detailTableReducer(state: DetailTableState, action: DetailTableAction): DetailTableState {
    switch (action.type) {
        case 'REQUEST':
            return { ...state, loading: true, error: undefined };
        case 'SUCCESS':
            return {
                ...state,
                loading: false,
                data: action.payload.data,
                total: action.payload.total,
                pagination: {
                    ...state.pagination,
                    current: action.payload.resetPage ? 1 : state.pagination.current,
                },
                error: undefined,
            };
        case 'FAIL':
            return { ...state, loading: false, error: action.payload.error };
        case 'SET_PAGE':
            return {
                ...state,
                pagination: {
                    current: action.payload.current,
                    pageSize: action.payload.pageSize ?? state.pagination.pageSize,
                },
            };
        default:
            return state;
    }
}

type AlertLevel = 'critical' | 'warning' | 'info';

interface SystemAlert {
    id: string;
    level: AlertLevel;
    title: string;
    description: string;
    time: string;
}

const SYSTEM_ALERTS: SystemAlert[] = [
    {
        id: 'alert-1',
        level: 'critical',
        title: 'Nhiệt độ lò #2 cao bất thường',
        description: 'Nhiệt độ đạt 1150°C, vượt ngưỡng an toàn 100°C',
        time: '5 phút trước',
    },
    {
        id: 'alert-2',
        level: 'warning',
        title: 'Dây chuyền C tạm dừng',
        description: 'Đang chờ nguyên liệu từ kho vật tư',
        time: '15 phút trước',
    },
    {
        id: 'alert-3',
        level: 'info',
        title: 'Bảo trì định kỳ DC-D',
        description: 'Hoàn thành dự kiến lúc 14:00',
        time: '1 giờ trước',
    },
    {
        id: 'alert-4',
        level: 'warning',
        title: 'Áp suất bơm men giảm',
        description: 'Kiểm tra bộ lọc và đường ống cấp men',
        time: '1 giờ trước',
    },
    {
        id: 'alert-5',
        level: 'info',
        title: 'Ca tối bổ sung nhân lực',
        description: '4 công nhân hỗ trợ dây chuyền A',
        time: '2 giờ trước',
    },
];

const normalizePresetLabel = (preset: DatePreset): DatePreset => ({
    ...preset,
    label: PRESET_LABEL_OVERRIDES[preset.key] ?? preset.label,
});

const KPI_ACCENTS = ['#60a5fa', '#34d399', '#f87171', '#fbbf24'];

const formatKpiValue = (value: number, unit?: string) => {
    if (unit === '%') {
        return `${value.toFixed(2)}%`;
    }
    const formatted = Number.isFinite(value) ? value.toLocaleString('vi-VN') : String(value);
    return unit ? `${formatted} ${unit}` : formatted;
};

// =================== COMPONENT CHÍNH ===================
export default function Dashboard() {
    const useMockDashboardData = process.env.NEXT_PUBLIC_USE_MOCK_DASHBOARD !== 'false';
    const [activeFactory, setActiveFactory] = useState<'1' | '2'>('1');
    const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
    const [selectedLine, setSelectedLine] = useState<string>('all');
    const [tableStageName, setTableStageName] = useState<'all' | StageNameKey>('all');
    const [trendRange, setTrendRange] = useState<RangePreset>('30d');
    const [lineRange, setLineRange] = useState<RangePreset>('30d');
    const [lineOptions, setLineOptions] = useState<LineOption[]>(MOCK_LINE_OPTIONS);
    const [kpiCards, setKpiCards] = useState<KpiCardPayload[]>(MOCK_KPI_CARDS);
    const [analyticsRecords, setAnalyticsRecords] = useState<ProductionRecord[]>(MOCK_ANALYTICS_RECORDS);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [analyticsError, setAnalyticsError] = useState<string | null>(null);
    const [hasLoadedAnalytics, setHasLoadedAnalytics] = useState(true);
    const [datePresets, setDatePresets] = useState<DatePreset[]>(DEFAULT_DATE_PRESETS.map(normalizePresetLabel));
    const [dateRangeSource, setDateRangeSource] = useState<'preset' | 'manual'>('preset');
    const [detailTableState, detailTableDispatch] = useReducer(
        detailTableReducer,
        detailTableInitialState,
        (initial) => ({
            ...initial,
            data: MOCK_DETAIL_TABLE_DATA,
            total: MOCK_DETAIL_TABLE_DATA.length,
        })
    );
    const hasSyncedInitialFilters = useRef(false);
    const stageNameOptions = useMemo(
        () => [
            { value: 'all', label: 'Tất cả công đoạn' },
            ...Object.entries(STAGE_NAME_META).map(([value, meta]) => ({
                value: value as StopReasonKey,
                label: meta.label,
            })),
        ],
        []
    );
    const alertLevelClassMap: Record<AlertLevel, string> = {
        critical: styles.alertCritical,
        warning: styles.alertWarning,
        info: styles.alertInfo,
    };
    const manualRange = useMemo(() => {
        if (dateRangeSource !== 'manual' || !dateRange?.[0] || !dateRange?.[1]) {
            return null;
        }
        return [dateRange[0], dateRange[1]] as [Dayjs, Dayjs];
    }, [dateRange, dateRangeSource]);
    const selectedLineOption = useMemo(
        () => lineOptions.find(option => option.id === selectedLine),
        [lineOptions, selectedLine]
    );
    const mockSelectedLineLabel = useMemo(() => {
        if (selectedLine === 'all') {
            return null;
        }
        return selectedLineOption?.label ?? null;
    }, [selectedLine, selectedLineOption]);
    const applyMockAnalyticsData = () => {
        setAnalyticsRecords(MOCK_ANALYTICS_RECORDS);
        setKpiCards(MOCK_KPI_CARDS);
        setHasLoadedAnalytics(true);
        setLineOptions(MOCK_LINE_OPTIONS);
    };
    useEffect(() => {
        if (!lineOptions.length) {
            return;
        }
        if (!lineOptions.some(option => option.id === selectedLine)) {
            setSelectedLine(lineOptions[0].id);
        }
    }, [lineOptions, selectedLine]);
    const handleDetailTableChange: TableProps<DetailedProductionRecord>['onChange'] = (pagination) => {
        detailTableDispatch({
            type: 'SET_PAGE',
            payload: {
                current: pagination?.current ?? 1,
                pageSize: pagination?.pageSize,
            },
        });
    };

    useEffect(() => {
        if (useMockDashboardData) {
            applyMockAnalyticsData();
            setAnalyticsLoading(false);
            setAnalyticsError(null);
            return;
        }

        const controller = new AbortController();

        const fetchAnalytics = async () => {
            setAnalyticsLoading(true);
            setAnalyticsError(null);
            try {
                const params = new URLSearchParams();
                params.set('productionLine', selectedLine);
                if (manualRange) {
                    params.set('from', manualRange[0].startOf('day').toISOString());
                    params.set('to', manualRange[1].endOf('day').toISOString());
                } else {
                    params.set('range', trendRange);
                }

                const response = await apiFetch(`/runs-analytics?${params.toString()}`, { signal: controller.signal });
                if (!response.ok) {
                    throw new Error('Không thể tải dữ liệu phân tích');
                }
                const payload: RunsAnalyticsResponse = await response.json();
                if (controller.signal.aborted) {
                    return;
                }

                const hasRecords = Boolean(payload.records?.length);
                const hasKpiCards = Boolean(payload.kpiCards?.length);
                const resolvedRecords = hasRecords ? payload.records! : MOCK_ANALYTICS_RECORDS;
                const resolvedKpiCards = hasKpiCards ? payload.kpiCards! : MOCK_KPI_CARDS;

                setAnalyticsRecords(resolvedRecords);
                setKpiCards(resolvedKpiCards);
                setHasLoadedAnalytics(true);

                if (!hasRecords || !hasKpiCards) {
                    setLineOptions(MOCK_LINE_OPTIONS);
                }

                if (payload.filters?.productionLine?.options?.length) {
                    const incoming = payload.filters.productionLine.options;
                    const hasAll = incoming.some(option => option.id === 'all');
                    const normalizedOptions = hasAll
                        ? [
                            DEFAULT_LINE_OPTIONS[0],
                            ...incoming.filter(option => option.id !== 'all'),
                        ]
                        : [...DEFAULT_LINE_OPTIONS, ...incoming];
                    setLineOptions(normalizedOptions);
                }

                const selectedLineFromApi = payload.filters?.productionLine?.selected;
                if (!hasSyncedInitialFilters.current && selectedLineFromApi && selectedLineFromApi !== selectedLine) {
                    setSelectedLine(selectedLineFromApi);
                }

                if (payload.filters?.dateRange?.presets?.length) {
                    setDatePresets(payload.filters.dateRange.presets.map(normalizePresetLabel));
                }

                const incomingPreset = payload.filters?.dateRange?.selectedPreset;
                if (incomingPreset && dateRangeSource !== 'manual' && incomingPreset !== trendRange) {
                    setTrendRange(incomingPreset);
                    setLineRange(prev => (prev === trendRange ? incomingPreset : prev));
                }

                if (payload.filters?.dateRange?.from && payload.filters?.dateRange?.to && dateRangeSource !== 'manual') {
                    setDateRange([dayjs(payload.filters.dateRange.from), dayjs(payload.filters.dateRange.to)]);
                }

                if (!hasSyncedInitialFilters.current) {
                    hasSyncedInitialFilters.current = true;
                }
            } catch (error) {
                if (controller.signal.aborted) {
                    return;
                }
                console.warn('Không thể tải được dữ liệu phân tích, sử dụng dữ liệu mô phỏng.', error);
                applyMockAnalyticsData();
                setAnalyticsError(null);
            } finally {
                if (!controller.signal.aborted) {
                    setAnalyticsLoading(false);
                }
            }
        };

        fetchAnalytics();

        return () => controller.abort();
    }, [selectedLine, trendRange, dateRangeSource, manualRange, useMockDashboardData]);

    const handlePresetRangeChange = (presetKey: RangePreset) => {
        setDateRangeSource('preset');
        setTrendRange(presetKey);
        setDateRange(null);
    };

    const handleLineRangeChange = (presetKey: RangePreset) => {
        setLineRange(presetKey);
    };

    const handleDateInputChange = (type: 'start' | 'end', value: string) => {
        if (!value) {
            setDateRange(null);
            setDateRangeSource('preset');
            return;
        }

        const parsed = dayjs(value);
        if (!parsed.isValid()) {
            return;
        }

        setDateRangeSource('manual');
        setDateRange(prev => {
            let start = prev?.[0] ?? parsed;
            let end = prev?.[1] ?? parsed;

            if (type === 'start') {
                start = parsed;
                if (end && parsed.isAfter(end)) {
                    end = parsed;
                }
            } else {
                end = parsed;
                if (start && parsed.isBefore(start)) {
                    start = parsed;
                }
            }

            return [start, end];
        });
    };

    const handleResetFilters = () => {
        setSelectedLine('all');
        setDateRange(null);
        setDateRangeSource('preset');
        setTrendRange('30d');
        setLineRange('30d');
        setTableStageName('all');
    };

    // Lọc dữ liệu
    const data = useMemo(() => {
        let filtered = [...analyticsRecords];

        if (selectedLine !== 'all') {
            const lineName = selectedLineOption?.label;
            filtered = filtered.filter(r => r.lineName === (lineName ?? selectedLine));
        }

        if (dateRange && dateRange[0] && dateRange[1]) {
            const [start, end] = dateRange;
            filtered = filtered.filter(r => {
                const d = dayjs(r.date);
                return d.isAfter(start.subtract(1, 'day')) && d.isBefore(end.add(1, 'day'));
            });
        }

        return filtered;
    }, [analyticsRecords, dateRange, selectedLine, selectedLineOption]);

    const availableLineLabels = useMemo(() => {
        const optionLabels = lineOptions
            .filter(option => option.id !== 'all')
            .map(option => option.label);

        if (optionLabels.length) {
            return optionLabels;
        }

        return Array.from(new Set(analyticsRecords.map(record => record.lineName)));
    }, [analyticsRecords, lineOptions]);

    const normalizedDatePresets = useMemo(() => {
        const base = datePresets.length ? datePresets : DEFAULT_DATE_PRESETS;
        return base.map(normalizePresetLabel);
    }, [datePresets]);
    const trendRangeLabel = normalizedDatePresets.find(preset => preset.key === trendRange)?.label ?? '';
    const lineRangeLabel = normalizedDatePresets.find(preset => preset.key === lineRange)?.label ?? '';
    const skeletonRangeCount = Math.max(normalizedDatePresets.length, 2);
    const showSkeletons = analyticsLoading && !hasLoadedAnalytics;

    const trendSeries = useMemo(() => {
        const dailyMap: Record<string, { actual: number; target: number }> = {};
        const monthlyMap: Record<string, { actual: number; target: number }> = {};
        
        data.forEach(record => {
            const actual = getActualOutput(record);
            const baseTarget = record.originalOutput || actual;
            const target = Math.round(baseTarget * 0.95);

            if (!dailyMap[record.date]) {
                dailyMap[record.date] = { actual: 0, target: 0 };
            }
            dailyMap[record.date].actual += actual;
            dailyMap[record.date].target += target;

            const monthKey = dayjs(record.date).format('YYYY-MM');
            if (!monthlyMap[monthKey]) {
                monthlyMap[monthKey] = { actual: 0, target: 0 };
            }
            monthlyMap[monthKey].actual += actual;
            monthlyMap[monthKey].target += target;
        });

        const sortedDailyKeys = Object.keys(dailyMap).sort((a, b) => dayjs(a).valueOf() - dayjs(b).valueOf());
        const sortedMonthlyKeys = Object.keys(monthlyMap).sort();

        const recentDailyKeys = sortedDailyKeys.slice(-30);
        const recentMonthlyKeys = sortedMonthlyKeys.slice(-12);

        return {
            daily: {
                labels: recentDailyKeys.map(key => dayjs(key).format('DD/MM')),
                actual: recentDailyKeys.map(key => dailyMap[key]?.actual ?? 0),
                target: recentDailyKeys.map(key => dailyMap[key]?.target ?? 0),
            },
            monthly: {
                labels: recentMonthlyKeys.map(key => dayjs(`${key}-01`).format('MM/YY')),
                actual: recentMonthlyKeys.map(key => monthlyMap[key]?.actual ?? 0),
                target: recentMonthlyKeys.map(key => monthlyMap[key]?.target ?? 0),
            },
        };
    }, [data]);

    const productionTrend = useMemo(() => {
        const selectedSeries = trendRange === '30d' ? trendSeries.daily : trendSeries.monthly;
        const hasSinglePoint = selectedSeries.labels.length <= 1;

        return {
            hasSinglePoint,
            data: {
                labels: selectedSeries.labels,
                datasets: [
                    {
                        label: 'Sản lượng thực tế',
                        data: selectedSeries.actual,
                        borderColor: '#1d4ed8',
                        borderWidth: 3,
                        fill: hasSinglePoint ? false : true,
                        tension: 0.4,
                        pointRadius: hasSinglePoint ? 5 : 0,
                        pointHoverRadius: hasSinglePoint ? 7 : 4,
                        backgroundColor: (context: ScriptableContext<'line'>) => {
                            const { chart } = context;
                            const { ctx, chartArea } = chart;
                            if (!chartArea) {
                                return 'rgba(29, 78, 216, 0.2)';
                            }
                            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                            gradient.addColorStop(0, 'rgba(29, 78, 216, 0.2)');
                            gradient.addColorStop(1, 'rgba(29, 78, 216, 0)');
                            return gradient;
                        },
                    },
                    {
                        label: 'Trung bình sản lượng',
                        data: selectedSeries.target,
                        borderColor: '#0ea5e9',
                        borderWidth: 2,
                        borderDash: [8, 6],
                        fill: false,
                        tension: 0.4,
                        pointRadius: hasSinglePoint ? 4 : 0,
                    },
                ],
            },
        };
    }, [trendRange, trendSeries]);

    const qualitySummary = useMemo(() => {
        const totals = data.reduce(
            (acc, record) => {
                acc.a1 += record.a1;
                acc.a2 += record.a2;
                acc.cut += record.cut;
                acc.scrap += record.waste1 + record.waste2 + record.scrap;
                return acc;
            },
            { a1: 0, a2: 0, cut: 0, scrap: 0 }
        );
        const items = [
            { key: 'a1', label: 'A1', value: totals.a1, color: '#1d4ed8' },
            { key: 'a2', label: ' A2', value: totals.a2, color: '#16a34a' },
            { key: 'cut', label: 'Cắt lô', value: totals.cut, color: '#eab308' },
            { key: 'scrap', label: 'Phế phẩm', value: totals.scrap, color: '#dc2626' },
        ];
        const total = items.reduce((sum, item) => sum + item.value, 0);

        return {
            chartData: {
                labels: items.map(item => item.label),
                datasets: [
                    {
                        label: 'Tỷ lệ chất lượng',
                        data: items.map(item => item.value),
                        backgroundColor: items.map(item => item.color),
                        borderWidth: 0,
                    },
                ],
            },
            stats: items.map(item => ({
                ...item,
                percentage: total ? Math.round((item.value / total) * 100) : 0,
            })),
            total,
        };
    }, [data]);

    const rangeFilteredData = useMemo(() => {
        const now = dayjs();
        const dailyCutoff = now.subtract(29, 'day').startOf('day').valueOf();
        const monthlyCutoff = now.subtract(11, 'month').startOf('month').valueOf();

        const dailyRecords = data.filter(record => dayjs(record.date).valueOf() >= dailyCutoff);
        const monthlyRecords = data.filter(record => dayjs(record.date).valueOf() >= monthlyCutoff);

        return { dailyRecords, monthlyRecords };
    }, [data]);

    const linePerformanceData = useMemo(() => {
        const relevantRecords = lineRange === '30d' ? rangeFilteredData.dailyRecords : rangeFilteredData.monthlyRecords;
        const grouped = relevantRecords.reduce((acc, record) => {
            if (!acc[record.lineName]) {
                acc[record.lineName] = 0;
            }
            acc[record.lineName] += getActualOutput(record);
            return acc;
        }, {} as Record<string, number>);

        const labels = availableLineLabels.length ? availableLineLabels : Object.keys(grouped);

        return {
            labels,
            datasets: [
                {
                    label: 'Sản lượng',
                    data: labels.map(label => grouped[label] ?? 0),
                    backgroundColor: '#1d4ed8',
                    borderRadius: 8,
                    barThickness: 20,
                },
            ],
        };
    }, [availableLineLabels, lineRange, rangeFilteredData]);

    const productionTrendOptions = useMemo(
        () => ({
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index' as const, intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0f172a',
                    cornerRadius: 8,
                    padding: 12,
                    callbacks: {
                        label: (context: TooltipItem<'line'>) => {
                            const value = typeof context.parsed.y === 'number' ? context.parsed.y : 0;
                            return `${context.dataset.label}: ${value.toLocaleString('vi-VN')} m2`;
                        },
                    },
                },
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8', font: { size: 12 } },
                    offset: productionTrend.hasSinglePoint,
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(226, 232, 240, 0.7)', drawBorder: false },
                    ticks: {
                        color: '#94a3b8',
                        callback: (value: number | string) => {
                            const numeric = typeof value === 'string' ? Number(value) : value;
                            return `${Math.round((numeric ?? 0) / 1000)}k`;
                        },
                    },
                },
            },
        }),
        [productionTrend.hasSinglePoint]
    );

    const qualityChartOptions = useMemo(
        () => ({
            responsive: true,
            maintainAspectRatio: false,
            cutout: '68%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context: TooltipItem<'doughnut'>) => {
                            const datasetValues = context.dataset.data as number[];
                            const total = datasetValues.reduce((sum: number, value: number) => sum + value, 0);
                            const parsedValue = typeof context.parsed === 'number' ? context.parsed : 0;
                            const percentage = total ? ((parsedValue / total) * 100).toFixed(1) : '0';
                            return `${context.label}: ${parsedValue.toLocaleString('vi-VN')} m2 (${percentage}%)`;
                        },
                    },
                },
            },
        }),
        []
    );

    const linePerformanceOptions = useMemo(
        () => ({
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context: TooltipItem<'bar'>) => {
                            const value = typeof context.parsed.y === 'number' ? context.parsed.y : 0;
                            return `${context.dataset.label}: ${value.toLocaleString('vi-VN')} m2`;
                        },
                    },
                },
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' },
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(226, 232, 240, 0.7)', drawBorder: false },
                    ticks: {
                        color: '#94a3b8',
                        callback: (value: number | string) => {
                            const numeric = typeof value === 'string' ? Number(value) : value;
                            return `${Math.round((numeric ?? 0) / 1000)}k`;
                        },
                    },
                },
            },
        }),
        []
    );
    
    const renderAlertIcon = (level: AlertLevel) => {
        switch (level) {
            case 'critical':
                return (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M12 9v4" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
                        <circle cx="12" cy="16.5" r="1.5" fill="#dc2626" />
                        <path
                            d="M10.29 4.86 2.82 18a2 2 0 0 0 1.71 3h14.94a2 2 0 0 0 1.71-3L13.71 4.86a2 2 0 0 0-3.42 0Z"
                            stroke="#fecaca"
                            strokeWidth="1.8"
                            fill="none"
                        />
                    </svg>
                );
            case 'warning':
                return (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M12 7v6" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
                        <circle cx="12" cy="17" r="1.4" fill="#f59e0b" />
                        <circle cx="12" cy="12" r="10" stroke="#fde68a" strokeWidth="1.8" fill="none" />
                    </svg>
                );
            default:
                return (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path
                            d="M12 8v5"
                            stroke="#0ea5e9"
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                        <circle cx="12" cy="16" r="1.4" fill="#0ea5e9" />
                        <circle cx="12" cy="12" r="9" stroke="#bae6fd" strokeWidth="1.8" fill="none" />
                    </svg>
                );
        }
    };
    const detailedTableColumns: ColumnsType<DetailedProductionRecord> = [
        {
            title: 'Thời gian',
            dataIndex: 'startTime',
            key: 'startTime',
            width: 220,
            render: (_, record) => (
                <div>
                    <Text strong>
                        {record.startTime ? dayjs(record.startTime).format('DD/MM/YYYY HH:mm') : 'Chưa cập nhật'}
                    </Text>
                    <div className={styles.tableSubText}>
                        {record.endTime ? dayjs(record.endTime).format('DD/MM/YYYY HH:mm') : 'Dang chay'}
                    </div>
                </div>
            ),
            sorter: (a, b) => dayjs(a.startTime ?? 0).valueOf() - dayjs(b.startTime ?? 0).valueOf(),
        },
        {
            title: 'Dây chuyền',
            dataIndex: 'productionLineName',
            key: 'productionLineName',
            render: (value: string) => value ?? '--',
        },
        {
            title: 'Công đoạn',
            dataIndex: 'stageName',
            key: 'stageName',
            render: (text: string) => <Tag color="blue">{text || 'Chưa cập nhật'}</Tag>,
        },
        {
            title: 'Sản phẩm',
            dataIndex: 'productName',
            key: 'productName',
            render: (text: string) => (
                <Tooltip title={text}>
                    <Text ellipsis className={styles.tableEllipsis}>
                        {text || '--'}
                    </Text>
                </Tooltip>
            ),
        },
        {
            title: 'Sản lượng (viên)',
            dataIndex: 'quantity',
            key: 'quantity',
            align: 'right',
            render: (value: number) => (value ? value.toLocaleString('vi-VN') : '--'),
            sorter: (a, b) => a.quantity - b.quantity,
        },
        {
            title: 'Diện tích (m2)',
            dataIndex: 'area',
            key: 'area',
            align: 'right',
            render: (value: number) =>
                value
                    ? value.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : '--',
        },
        {
            title: 'Trạng thái',
            dataIndex: 'stopReason',
            key: 'stopReason',
            render: (value: StopReasonKey | undefined, record) => {
                const meta = value ? STOP_REASON_META[value] : null;
                return (
                    <Space size={4} wrap>
                        {meta ? <Tag color={meta.color}>{meta.label}</Tag> : <Tag color="default">Đang chạy</Tag>}
                        {record.isEmergency && <Tag color="magenta">Khẩn cấp</Tag>}
                    </Space>
                );
            },
        },
        {
            title: 'Người tạo',
            dataIndex: 'createdBy',
            key: 'createdBy',
            render: (value: string | undefined) => value ?? 'Hệ thống',
        },
        {
            title: 'Ghi chú',
            dataIndex: 'notes',
            key: 'notes',
            render: (value: string | undefined) =>
                value ? (
                    <Tooltip title={value}>
                        <Text ellipsis className={styles.tableEllipsis}>{value}</Text>
                    </Tooltip>
                ) : (
                    <Text type="secondary">Không có</Text>
                ),
        },
    ];



    useEffect(() => {
        if (useMockDashboardData) {
            const fallbackRows = getMockDetailRows(mockSelectedLineLabel, tableStageName, dateRange);
            detailTableDispatch({
                type: 'SUCCESS',
                payload: {
                    data: fallbackRows,
                    total: fallbackRows.length,
                    resetPage: true,
                },
            });
            return;
        }

        const controller = new AbortController();

        const fetchData = async () => {
            detailTableDispatch({ type: 'REQUEST' });
            try {
                const params = new URLSearchParams();
                if (dateRange?.[0]) {
                    params.set('startDate', dateRange[0].startOf('day').toISOString());
                }
                if (dateRange?.[1]) {
                    params.set('endDate', dateRange[1].endOf('day').toISOString());
                }
                if (tableStageName !== 'all') {
                    params.set('stage', tableStageName);
                }

                const query = params.toString();
                const fetchUrl = `/production-stage-history/by-production-line-with-filter/${selectedLine}${query ? `?${query}` : ''}`;
                const res = await apiFetch(fetchUrl, { signal: controller.signal });

                if (!res.ok) {
                    throw new Error('Không thể tải được dữ liệu');
                }

                const payload = await res.json();
                const mappedPayload: DetailedProductionRecord[] = (payload?.pagidata ?? []).map(
                    (item: ProductionStageHistoryResponse) => ({
                        key: String(
                            item?.id ??
                            `${item?.productionLine?.name ?? 'row'}-${item?.startTime ?? Date.now()}`
                        ),
                        startTime: item?.startTime ?? null,
                        endTime: item?.endTime ?? null,
                        productionLineName: item?.productionLine?.name ?? 'Chưa xác định',
                        stageName: item?.stage?.name ?? 'Chưa xác định',
                        productName: item?.product?.name ?? 'Chưa xác định',
                        quantity: Number(item?.quantity ?? 0),
                        area: Number(item?.area ?? 0),
                        createdBy: item?.createdByUsername ?? 'Hệ thống',
                        stopReason: (item?.stopReason as StopReasonKey) ?? undefined,
                        isEmergency: Boolean(item?.isEmergency),
                        notes: item?.notes ?? '',
                    })
                );

                const resolvedTableRows = mappedPayload.length
                    ? mappedPayload
                    : getMockDetailRows(mockSelectedLineLabel, tableStageName, dateRange);

                const resolvedTotal = mappedPayload.length
                    ? payload?.meta?.total ?? mappedPayload.length
                    : resolvedTableRows.length;

                detailTableDispatch({
                    type: 'SUCCESS',
                    payload: {
                        data: resolvedTableRows,
                        total: resolvedTotal,
                        resetPage: true,
                    },
                });
            } catch (error) {
                if (controller.signal.aborted) {
                    return;
                }
                console.warn('Không thể tải dữ liệu chi tiết sản xuất, sử dụng dữ liệu mô phỏng.', error);
                const fallbackRows = getMockDetailRows(mockSelectedLineLabel, tableStageName, dateRange);
                detailTableDispatch({
                    type: 'SUCCESS',
                    payload: {
                        data: fallbackRows,
                        total: fallbackRows.length,
                        resetPage: true,
                    },
                });
            }
        };

        fetchData();

        return () => {
            controller.abort();
        };
    }, [selectedLine, dateRange, tableStageName, activeFactory, mockSelectedLineLabel, useMockDashboardData]);
    // --- Render giao diện ---
    return (
        // Sử dụng styles từ CSS Module
        <div className={styles.dashboardWrapper}>
            <main className={styles.mainContent}>
                {/* Header */}
                <header className={styles.dashboardHeader}>
                    <div>
                        <p className={styles.breadcrumb}>Trang chủ / Nhà máy {activeFactory === '1' ? '1' : '2'}</p>
                        <h1>Dashboard Quản Lý Sản Xuất</h1>
                    </div>
                    <div className={styles.headerActions}>
                        <select value={activeFactory} onChange={(e) => setActiveFactory(e.target.value as '1' | '2')} className={styles.formSelect}>
                            <option value="1">Nhà máy 1</option>
                            <option value="2">Nhà máy 2</option>
                        </select>
                    </div>
                </header>

                {/* Filters */}
                <div className={styles.filtersSection}>
                    <select
                        value={selectedLine}
                        onChange={(e) => setSelectedLine(e.target.value)}
                        className={styles.formSelect}
                    >
                        {lineOptions.map(option => (
                            <option key={option.id} value={option.id}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <input
                        type="date"
                        value={dateRange?.[0]?.format('YYYY-MM-DD') ?? ''}
                        onChange={(e) => handleDateInputChange('start', e.target.value)}
                        className={styles.formInput}
                    />
                    <input
                        type="date"
                        value={dateRange?.[1]?.format('YYYY-MM-DD') ?? ''}
                        onChange={(e) => handleDateInputChange('end', e.target.value)}
                        className={styles.formInput}
                    />
                    <button
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        onClick={handleResetFilters}
                        type="button"
                    >
                        Xóa lọc
                    </button>
                </div>

                {analyticsError && !analyticsLoading && (
                    <div className={styles.inlineError}>
                        <Text type="danger">{analyticsError}</Text>
                    </div>
                )}

                {/* KPI Cards */}
                <div className={styles.kpiGrid}>
                    {showSkeletons ? (
                        Array.from({ length: 4 }).map((_, index) => (
                            <div className={`${styles.kpiCard} ${styles.kpiCardSkeleton}`} key={`kpi-skeleton-${index}`}>
                                <div className={styles.kpiHeader}>
                                    <span className={`${styles.skeletonBlock} ${styles.skeletonLineSm}`} />
                                    <span className={`${styles.skeletonBlock} ${styles.skeletonIcon}`} />
                                </div>
                                <div className={`${styles.skeletonBlock} ${styles.skeletonValueLg}`} />
                            </div>
                        ))
                    ) : kpiCards.length > 0 ? (
                        kpiCards.map((card, index) => {
                            const accent = KPI_ACCENTS[index % KPI_ACCENTS.length];
                            return (
                                <div className={styles.kpiCard} key={card.key}>
                                    <div className={styles.kpiHeader}>
                                        <span>{card.label}</span>
                                        <div
                                            className={styles.kpiIcon}
                                            style={{ background: `${accent}1a`, color: accent }}
                                            aria-hidden="true"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                                <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <p className={styles.kpiValue}>{formatKpiValue(card.value, card.unit)}</p>
                                </div>
                            );
                        })
                    ) : (
                        <div className={styles.emptyState}>Chưa có dữ liệu KPI</div>
                    )}
                </div>

                {/* Biểu đồ */}
                <div className={styles.chartsSection}>
                    <div className={styles.mainCharts}>
                        {showSkeletons ? (
                            <>
                                <div className={`${styles.card} ${styles.trendCard}`}>
                                    <div className={styles.cardHeader}>
                                        <div className={styles.skeletonStack}>
                                            <span className={`${styles.skeletonBlock} ${styles.skeletonLineSm}`} />
                                            <span className={`${styles.skeletonBlock} ${styles.skeletonLineLg}`} />
                                        </div>
                                        <div className={styles.trendLegend}>
                                            {Array.from({ length: 2 }).map((_, legendIndex) => (
                                                <span key={`trend-legend-skeleton-${legendIndex}`} className={styles.skeletonLegendRow}>
                                                    <span className={`${styles.skeletonBlock} ${styles.skeletonDot}`} />
                                                    <span className={`${styles.skeletonBlock} ${styles.skeletonLineXs}`} />
                                                </span>
                                            ))}
                                        </div>
                                        <div className={`${styles.cardHeaderControls} ${styles.skeletonChipRow}`}>
                                            {Array.from({ length: skeletonRangeCount }).map((_, chipIndex) => (
                                                <span
                                                    key={`trend-chip-skeleton-${chipIndex}`}
                                                    className={`${styles.skeletonBlock} ${styles.skeletonChip}`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div className={`${styles.chartContainer} ${styles.chartLarge}`}>
                                        <div className={`${styles.skeletonBlock} ${styles.skeletonChart}`} />
                                    </div>
                                </div>
                                <div className={styles.card}>
                                    <div className={styles.cardHeader}>
                                        <div className={styles.skeletonStack}>
                                            <span className={`${styles.skeletonBlock} ${styles.skeletonLineSm}`} />
                                            <span className={`${styles.skeletonBlock} ${styles.skeletonLineLg}`} />
                                        </div>
                                        <div className={`${styles.cardHeaderControls} ${styles.skeletonChipRow}`}>
                                            {Array.from({ length: skeletonRangeCount }).map((_, chipIndex) => (
                                                <span
                                                    key={`line-chip-skeleton-${chipIndex}`}
                                                    className={`${styles.skeletonBlock} ${styles.skeletonChip}`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div className={`${styles.chartContainer} ${styles.chartMedium}`}>
                                        <div className={`${styles.skeletonBlock} ${styles.skeletonChart}`} />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className={`${styles.card} ${styles.trendCard}`}>
                                    <div className={styles.cardHeader}>
                                        <div>
                                            <p className={styles.cardSubtitle}>So sánh sản lượng thực tế với mục tiêu</p>
                                            <h2 className={styles.cardTitle}>
                                                {trendRangeLabel ? `Xu hướng sản xuất ${trendRangeLabel}` : 'Xu hướng sản xuất'}
                                            </h2>
                                        </div>
                                        <div className={styles.trendLegend}>
                                            <span>
                                                <span className={styles.legendDot} style={{ backgroundColor: '#1d4ed8' }} />
                                                Thực tế
                                            </span>
                                            <span>
                                                <span className={styles.legendDash} style={{ borderColor: '#0ea5e9' }} />
                                                Trung bình
                                            </span>
                                        </div>
                                        <div className={styles.cardHeaderControls}>
                                            <div className={styles.rangeToggle} role="group" aria-label="Chọn khoảng thời gian xu hướng">
                                                {normalizedDatePresets.map((preset) => (
                                                    <button
                                                        key={preset.key}
                                                        type="button"
                                                        aria-pressed={trendRange === preset.key}
                                                        onClick={() => handlePresetRangeChange(preset.key)}
                                                        className={`${styles.rangeButton} ${trendRange === preset.key ? styles.rangeButtonActive : ''}`}
                                                    >
                                                        {preset.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`${styles.chartContainer} ${styles.chartLarge}`}>
                                        <Line data={productionTrend.data} options={productionTrendOptions} />
                                    </div>
                                </div>
                                <div className={styles.card}>
                                    <div className={styles.cardHeader}>
                                        <div>
                                            <p className={styles.cardSubtitle}>Sản lượng và hiệu suất từng dây chuyền</p>
                                            <h2 className={styles.cardTitle}>
                                                {lineRangeLabel ? `Hiệu suất ${lineRangeLabel} theo dây chuyền` : 'Hiệu suất theo dây chuyền'}
                                            </h2>
                                        </div>
                                        <div className={styles.rangeToggle} role="group" aria-label="Chọn khoảng thời gian hiệu suất">
                                            {normalizedDatePresets.map((preset) => (
                                                <button
                                                    key={preset.key}
                                                    type="button"
                                                    aria-pressed={lineRange === preset.key}
                                                    onClick={() => handleLineRangeChange(preset.key)}
                                                    className={`${styles.rangeButton} ${lineRange === preset.key ? styles.rangeButtonActive : ''}`}
                                                >
                                                    {preset.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className={`${styles.chartContainer} ${styles.chartMedium}`}>
                                        <Bar data={linePerformanceData} options={linePerformanceOptions} />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    <div className={styles.sidePanels}>
                        {showSkeletons ? (
                            <div className={styles.card}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.skeletonStack}>
                                        <span className={`${styles.skeletonBlock} ${styles.skeletonLineSm}`} />
                                        <span className={`${styles.skeletonBlock} ${styles.skeletonLineLg}`} />
                                    </div>
                                </div>
                                <div className={styles.qualityWrapper}>
                                    <div className={styles.donutWrapper}>
                                        <div className={`${styles.skeletonBlock} ${styles.skeletonDonut}`} />
                                    </div>
                                    <ul className={styles.qualityLegend}>
                                        {Array.from({ length: 4 }).map((_, index) => (
                                            <li key={`quality-legend-skeleton-${index}`} className={`${styles.qualityLegendItem} ${styles.qualityLegendItemSkeleton}`}>
                                                <span className={`${styles.skeletonBlock} ${styles.skeletonDot}`} />
                                                <div className={styles.skeletonStack}>
                                                    <span className={`${styles.skeletonBlock} ${styles.skeletonLineMd}`} />
                                                    <span className={`${styles.skeletonBlock} ${styles.skeletonLineXs}`} />
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <div className={styles.card}>
                                <div className={styles.cardHeader}>
                                    <div>
                                        <p className={styles.cardSubtitle}>Tỷ lệ phân loại sản phẩm</p>
                                        <h2 className={styles.cardTitle}>Phân bổ chất lượng</h2>
                                    </div>
                                </div>
                                <div className={styles.qualityWrapper}>
                                    <div className={styles.donutWrapper}>
                                        <Doughnut data={qualitySummary.chartData} options={qualityChartOptions} />
                                        <div className={styles.donutCenter}>
                                            <span>Tổng</span>
                                            <strong>{qualitySummary.total.toLocaleString('vi-VN')}</strong>
                                        </div>
                                    </div>
                                    <ul className={styles.qualityLegend}>
                                        {qualitySummary.stats.map(item => (
                                            <li key={item.key} className={styles.qualityLegendItem}>
                                                <span className={styles.legendDot} style={{ backgroundColor: item.color }} />
                                                <div>
                                                    <p>{item.label}</p>
                                                    <small>{item.percentage}% · {item.value.toLocaleString('vi-VN')}</small>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                        <div className={`${styles.card} ${styles.alertCard}`}>
                            <div className={styles.alertHeader}>
                                <div>
                                    <p className={styles.cardSubtitle}>Giám sát thời gian thực</p>
                                    <h2 className={styles.cardTitle}>Cảnh báo hệ thống</h2>
                                </div>
                                <span className={styles.alertBadge}>{SYSTEM_ALERTS.length} mới</span>
                            </div>
                            <div className={styles.alertList}>
                                {SYSTEM_ALERTS.map(alert => (
                                    <div
                                        key={alert.id}
                                        className={`${styles.alertItem} ${alertLevelClassMap[alert.level]}`}
                                    >
                                        <div className={styles.alertIcon}>{renderAlertIcon(alert.level)}</div>
                                        <div className={styles.alertContent}>
                                            <p className={styles.alertTitle}>{alert.title}</p>
                                            <p className={styles.alertDesc}>{alert.description}</p>
                                            <span className={styles.alertMeta}>{alert.time}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className={styles.alertMenu}>
                                <Link href={'/production-history'}>Xem tất cả</Link>
                            </div>
                        </div>
                    </div>
                </div>
                {/* <Line data={wasteByStageData} options={wasteByStageOptions} /> */}
                {/* Bảng chi tiết sản xuất */}
                <Card
                    title="Chi tiết sản lượng"
                    styles={{ body: { padding: 0 } }}
                    style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12 }}
                    extra={
                        <Space size="small" className={styles.tableActions} wrap>
                            <Select<'all' | StageNameKey>
                                value={tableStageName}
                                onChange={(value) => setTableStageName(value)}
                                options={stageNameOptions}
                                className={styles.stopReasonSelect}
                            />
                        </Space>
                    }
                >
                    {detailTableState.error && (
                        <div className={styles.tableError}>
                            <Text type="danger">{detailTableState.error}</Text>
                        </div>
                    )}
                    <Table
                        columns={detailedTableColumns}
                        dataSource={detailTableState.data}
                        pagination={{
                            ...detailTableState.pagination,
                            total: detailTableState.total,
                            showSizeChanger: true,
                            showTotal: (total) => `${total} mục`,
                        }}
                        loading={detailTableState.loading}
                        onChange={handleDetailTableChange}
                        scroll={{ x: 1200 }}
                        rowKey="key"
                        size="middle"
                    />
                </Card>
            </main>
        </div>
    );
}
