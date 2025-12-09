'use client';

import { useState, useMemo, useEffect, useReducer } from 'react';
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

const { Text } = Typography;

// Đăng ký các thành phần của Chart.js
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

// =================== ĐỊNH NGHĨA KIỂU DỮ LIỆU MỚI ===================
type StopReasonKey =
    | 'machine_error'
    | 'change_product'
    | 'shift_end'
    | 'maintenance'
    | 'other'
    | 'manual_stop'
    | 'end';

type StageNameKey =
    | 'Ép'
    | 'Mài'
    | 'Nung'
    | 'Đóng hộp'
    | 'Nung xương'
    | 'Nung men'

const STOP_REASON_META: Record<StopReasonKey, { label: string; color: string }> = {
    machine_error: { label: 'Sự cố máy', color: 'red' },
    change_product: { label: 'Đổi sản phẩm', color: 'orange' },
    shift_end: { label: 'Kết thúc ca', color: 'cyan' },
    maintenance: { label: 'Bảo trì', color: 'geekblue' },
    other: { label: 'Lý do khác', color: 'default' },
    manual_stop: { label: 'Dừng thủ công', color: 'purple' },
    end: { label: 'Hoàn tất', color: 'green' },
};

const STAGE_NAME_META: Record<StageNameKey, { label: string; color: string }> = {
    "Ép": { label: 'Ép', color: 'cyan' },
    "Nung": { label: 'Nung', color: 'orange' },
    "Mài": { label: 'Mài', color: 'cyan' },
    "Nung men": { label: 'Nung men', color: 'geekblue' },
    "Nung xương": { label: 'Nung xương', color: 'default' },
    "Đóng hộp": { label: 'Đóng hộp', color: 'green' },
};

interface DetailedProductionRecord {
    key: string;
    startTime: string | null;
    endTime: string | null;
    productionLineName: string;
    stageName: string;
    productName: string;
    quantity: number;
    area: number;
    createdBy?: string;
    stopReason?: StopReasonKey;
    isEmergency: boolean;
    notes?: string;
}
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

const LINES = [{
    id: 1,
    name: 'Dây chuyền A',
}, {
    id: 2,
    name: 'Dây chuyền B',
}, {
    id: 3,
    name: 'Dây chuyền C',
}, {
    id: 4,
    name: 'Dây chuyền D'
}];
const PRODUCT_TYPES = ['Gạch Porcelain 300x600', 'Gạch Porcelain 400x800', 'Gạch Ceramic 300x600', 'Gạch Granite 600x600'];
type RangePreset = '30d' | '12m';

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

// =================== HÀM TẠO DỮ LIỆU GIẢ CHI TIẾT ===================


// Đăng ký các thành phần của Chart.js
// ChartJS.register(
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   BarElement,
//   ChartTitle,
//   Tooltip,
//   Legend,
//   Filler,
//   ArcElement
// );

// =================== ĐỊNH NGHĨA KIỂU DỮ LIỆU ===================
interface ProductionRecord {
    key: string;
    date: string; // YYYY-MM-DD
    lineName: string;
    productType: string;
    // Sản lượng gốc (100%)
    originalOutput: number; // m²
    // Sản lượng thành phẩm (chốt cuối cùng)
    a1: number; // m²
    a2: number; // m²
    cut: number; // m²
    waste1: number; // m²
    waste2: number; // m²
    scrap: number; // m²
    // Hao phí theo công đoạn
    waste_moc: number; // %
    waste_lo: number; // %
    waste_truoc_mai: number; // %
    waste_thanh_pham: number; // %
}

// =================== HÀM TẠO DỮ LIỆU GIẢ ===================
const generateMockData = (): ProductionRecord[] => {
    const today = dayjs();
    const records: ProductionRecord[] = [];

    for (let i = 0; i < 90; i++) {
        const date = today.subtract(i, 'day').format('YYYY-MM-DD');
        const numLinesToRun = Math.floor(Math.random() * 4) + 1;

        for (let j = 0; j < numLinesToRun; j++) {
            const lineName = LINES[j].name;
            const productType = PRODUCT_TYPES[Math.floor(Math.random() * PRODUCT_TYPES.length)];
            const originalOutput = Math.floor(Math.random() * 5000) + 3000; // Sản lượng gốc 3000-8000 m²

            // Tỷ lệ chất lượng cuối cùng
            const a1Rate = 0.80 + Math.random() * 0.1; // 80% - 90%
            const a2Rate = 0.05 + Math.random() * 0.05; // 5% - 10%
            const cutRate = 0.02 + Math.random() * 0.04; // 2% - 6%
            const waste1Rate = 0.01 + Math.random() * 0.02; // 1% - 3%
            const waste2Rate = 0.005 + Math.random() * 0.01; // 0.5% - 1.5%
            const scrapRate = 0.001 + Math.random() * 0.009; // 0.1% - 1%

            const record: ProductionRecord = {
                key: `${date}-${lineName}`,
                date,
                lineName,
                productType,
                originalOutput,
                a1: Math.floor(originalOutput * a1Rate),
                a2: Math.floor(originalOutput * a2Rate),
                cut: Math.floor(originalOutput * cutRate),
                waste1: Math.floor(originalOutput * waste1Rate),
                waste2: Math.floor(originalOutput * waste2Rate),
                scrap: Math.floor(originalOutput * scrapRate),
                // Hao phí theo công đoạn (tỷ lệ % trên sản lượng gốc)
                waste_moc: 1 + Math.random() * 2, // 1% - 3%
                waste_lo: 0.5 + Math.random() * 1.5, // 0.5% - 2%
                waste_truoc_mai: 0.8 + Math.random() * 1.2, // 0.8% - 2%
                waste_thanh_pham: 0.5 + Math.random() * 1.5, // 0.5% - 2%
            };
            records.push(record);
        }
    }
    return records;
};
const mockData = generateMockData();

// =================== COMPONENT CHÍNH ===================
export default function Dashboard() {
    const [activeFactory, setActiveFactory] = useState<'1' | '2'>('1');
    const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
    const [selectedLine, setSelectedLine] = useState<string>('all');
    const [tableStageName, setTableStageName] = useState<'all' | StageNameKey>('all');
    const [trendRange, setTrendRange] = useState<RangePreset>('30d');
    const [lineRange, setLineRange] = useState<RangePreset>('30d');
    const [detailTableState, detailTableDispatch] = useReducer(detailTableReducer, detailTableInitialState);
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
    const selectedLineMeta = useMemo(() => LINES.find(line => String(line.id) === selectedLine), [selectedLine]);
    const handleDetailTableChange: TableProps<DetailedProductionRecord>['onChange'] = (pagination) => {
        detailTableDispatch({
            type: 'SET_PAGE',
            payload: {
                current: pagination?.current ?? 1,
                pageSize: pagination?.pageSize,
            },
        });
    };

    // Lọc dữ liệu
    const data = useMemo(() => {
        let filtered = [...mockData];

        if (selectedLine !== 'all') {
            const lineName = selectedLineMeta?.name;
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
    }, [dateRange, selectedLine, selectedLineMeta]);


    console.log(`data, mock data:`, data, mockData)

    // Tính toán các chỉ số KPI
    const kpiData = useMemo(() => {
        const totalOriginalOutput = data.reduce((sum, r) => sum + r.originalOutput, 0);
        const totalFinalOutput = data.reduce((sum, r) => sum + r.a1 + r.a2 + r.cut + r.waste1 + r.waste2 + r.scrap, 0);
        const totalWaste = data.reduce((sum, r) => sum + r.cut + r.waste1 + r.waste2 + r.scrap, 0);
        const lines = new Set(data.map(r => r.lineName)).size;

        // Hiệu suất toàn bộ quá trình = (Tổng sản phẩm cuối cùng / Tổng sản lượng gốc) * 100
        const overallEfficiency = totalOriginalOutput > 0 ? (totalFinalOutput / totalOriginalOutput) * 100 : 0;
        // Tỷ lệ hao phí = (Tổng phế phẩm / Tổng sản lượng gốc) * 100
        const overallWasteRate = totalOriginalOutput > 0 ? (totalWaste / totalOriginalOutput) * 100 : 0;

        return { totalOriginalOutput, overallEfficiency, overallWasteRate, lines };
    }, [data]);

    const trendSeries = useMemo(() => {
        const dailyMap: Record<string, { actual: number; target: number }> = {};
        const monthlyMap: Record<string, { actual: number; target: number }> = {};
        
        data.forEach(record => {
            const actual = record.a1 + record.a2 + record.cut;
            const target = Math.round(record.originalOutput * 0.95);

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

    const productionTrendData = useMemo(() => {
        const selectedSeries = trendRange === '30d' ? trendSeries.daily : trendSeries.monthly;

        return {
            labels: selectedSeries.labels,
            datasets: [
                {
                    label: 'Sản lượng thực tế',
                    data: selectedSeries.actual,
                    borderColor: '#1d4ed8',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
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
                    pointRadius: 0,
                },
            ],
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
            acc[record.lineName] += record.a1 + record.a2 + record.cut;
            return acc;
        }, {} as Record<string, number>);

        const labels = LINES.map(line => line.name);

        return {
            labels,
            datasets: [
                {
                    label: 'Sản lượng',
                    data: labels.map(label => grouped[label] ?? 0),
                    backgroundColor: '#1d4ed8',
                    borderRadius: 8,
                    barThickness: 32,
                },
            ],
        };
    }, [lineRange, rangeFilteredData]);

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

                detailTableDispatch({
                    type: 'SUCCESS',
                    payload: {
                        data: mappedPayload,
                        total: payload?.meta?.total ?? mappedPayload.length,
                        resetPage: true,
                    },
                });
            } catch (error) {
                if (controller.signal.aborted) {
                    return;
                }
                detailTableDispatch({
                    type: 'FAIL',
                    payload: {
                        error: error instanceof Error ? error.message : 'Khong the tai du lieu',
                    },
                });
            }
        };

        fetchData();

        return () => {
            controller.abort();
        };
    }, [selectedLine, dateRange, tableStageName, activeFactory]);
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
                    <select value={selectedLine} onChange={(e) => setSelectedLine(e.target.value)} className={styles.formSelect}>
                        <option value="all">Tất cả dây chuyền</option>
                        {LINES.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                    <input type="date" onChange={(e) => {
                        const date = dayjs(e.target.value);
                        setDateRange(prev => prev ? [date, prev[1]] : [date, date]);
                    }} className={styles.formInput} />
                    <input type="date" onChange={(e) => {
                        const date = dayjs(e.target.value);
                        setDateRange(prev => prev ? [prev[0], date] : [date, date]);
                    }} className={styles.formInput} />
                    <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => { setSelectedLine('all'); setDateRange(null); setTableStageName('all'); }}>
                        Xóa lọc
                    </button>
                </div>

                {/* KPI Cards */}
                <div className={styles.kpiGrid}>
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <svg width="24" height="24" fill="#60a5fa" viewBox="0 0 16 16"><path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z" /></svg>
                            <span>Tổng sản lượng (m²)</span>
                        </div>
                        <p className={styles.kpiValue}>{kpiData.totalOriginalOutput.toLocaleString('vi-VN')}</p>
                    </div>
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <svg width="24" height="24" fill="#34d399" viewBox="0 0 16 16"><path d="M1 11a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-3zm5-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7zm5-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V2z" /></svg>
                            <span>Hiệu suất TB toàn bộ</span>
                        </div>
                        <p className={styles.kpiValue}>{kpiData.overallEfficiency.toFixed(2)}%</p>
                    </div>
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <svg width="24" height="24" fill="#f87171" viewBox="0 0 16 16"><path d="M7.938 2.016A.13.13 0 0 1 8.002 2a.13.13 0 0 1 .063.016.146.146 0 0 1 .054.057l6.857 11.667c.036.06.035.124.002.183a.163.163 0 0 1-.054.06.116.116 0 0 1-.066.017H1.146a.115.115 0 0 1-.066-.017.163.163 0 0 1-.054-.06.176.176 0 0 1 .002-.183L7.884 2.073a.147.147 0 0 1 .054-.057zm1.044-.45a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566z" /><path d="M7.002 12a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 5.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995z" /></svg>
                            <span>Tỷ lệ hao phí TB</span>
                        </div>
                        <p className={styles.kpiValue}>{kpiData.overallWasteRate.toFixed(2)}%</p>
                    </div>
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <svg width="24" height="24" fill="#fbbf24" viewBox="0 0 16 16"><path d="M1 11a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-3zm5-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7zm5-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V2z" /></svg>
                            <span>Dây chuyền hoạt động</span>
                        </div>
                        <p className={styles.kpiValue}>{kpiData.lines}</p>
                    </div>
                </div>

                {/* Biểu đồ */}
                <div className={styles.chartsSection}>
                    <div className={styles.mainCharts}>
                        <div className={`${styles.card} ${styles.trendCard}`}>
                            <div className={styles.cardHeader}>
                                <div>
                                    <p className={styles.cardSubtitle}>So sánh sản lượng thực tế với mục tiêu</p>
                                    <h2 className={styles.cardTitle}>
                                        {trendRange === '30d' ? 'Xu hướng sản xuất 30 ngày' : 'Xu hướng sản xuất 12 tháng'}
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
                                        <button
                                            type="button"
                                            aria-pressed={trendRange === '30d'}
                                            onClick={() => setTrendRange('30d')}
                                            className={`${styles.rangeButton} ${trendRange === '30d' ? styles.rangeButtonActive : ''}`}
                                        >
                                            30 ngày
                                        </button>
                                        <button
                                            type="button"
                                            aria-pressed={trendRange === '12m'}
                                            onClick={() => setTrendRange('12m')}
                                            className={`${styles.rangeButton} ${trendRange === '12m' ? styles.rangeButtonActive : ''}`}
                                        >
                                            12 tháng
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.chartContainer} style={{ height: '420px' }}>
                                <Line data={productionTrendData} options={productionTrendOptions} />
                            </div>
                        </div>
                        <div className={styles.card}>
                            <div className={styles.cardHeader}>
                                <div>
                                    <p className={styles.cardSubtitle}>Sản lượng và hiệu suất từng dây chuyền</p>
                                    <h2 className={styles.cardTitle}>
                                        {lineRange === '30d' ? 'Hiệu suất 30 ngày theo dây chuyền' : 'Hiệu suất 12 tháng theo dây chuyền'}
                                    </h2>
                                </div>
                                <div className={styles.rangeToggle} role="group" aria-label="Chọn khoảng thời gian hiệu suất">
                                    <button
                                        type="button"
                                        aria-pressed={lineRange === '30d'}
                                        onClick={() => setLineRange('30d')}
                                        className={`${styles.rangeButton} ${lineRange === '30d' ? styles.rangeButtonActive : ''}`}
                                    >
                                        30 ngày
                                    </button>
                                    <button
                                        type="button"
                                        aria-pressed={lineRange === '12m'}
                                        onClick={() => setLineRange('12m')}
                                        className={`${styles.rangeButton} ${lineRange === '12m' ? styles.rangeButtonActive : ''}`}
                                    >
                                        12 tháng
                                    </button>
                                </div>
                            </div>
                            <div className={styles.chartContainer} style={{ height: '320px' }}>
                                <Bar data={linePerformanceData} options={linePerformanceOptions} />
                            </div>
                        </div>
                    </div>
                    <div className={styles.sidePanels}>
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
