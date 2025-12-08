'use client';

import React, { useState, useMemo, useEffect, useReducer } from 'react';
import { Card, Select, Space, Button, Typography, Table, Tag, Tooltip } from 'antd';
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
import dayjs, { Dayjs } from 'dayjs';
import { ReloadOutlined } from '@ant-design/icons';
// Import CSS Module
import styles from './Dashboard.module.css';
import { apiFetch } from '@/lib/http/http';

const { Title, Text } = Typography;

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
    const [tableRefreshKey, setTableRefreshKey] = useState(0);
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
            filtered = filtered.filter(r => r.lineName === selectedLine);
        }

        if (dateRange && dateRange[0] && dateRange[1]) {
            const [start, end] = dateRange;
            filtered = filtered.filter(r => {
                const d = dayjs(r.date);
                return d.isAfter(start.subtract(1, 'day')) && d.isBefore(end.add(1, 'day'));
            });
        }

        return filtered;
    }, [activeFactory, dateRange, selectedLine]);

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

    // --- Dữ liệu cho các biểu đồ ---

    // 1. Biểu đồ so sánh thực tế vs kế hoạch
    const planVsActualData = useMemo(() => {
        const grouped = data.reduce((acc, r) => {
            const month = dayjs(r.date).format('MM/YYYY');
            if (!acc[month]) acc[month] = { actual: 0 };
            acc[month].actual += r.a1 + r.a2 + r.cut; // Chỉ tính A1, A2, Cắt lô là sản phẩm chính
            return acc;
        }, {} as Record<string, { actual: number }>);

        const sortedMonths = Object.keys(grouped).sort((a, b) => dayjs(a, 'MM/YYYY').unix() - dayjs(b, 'MM/YYYY').unix());

        // Giả lập kế hoạch = actual * 95%
        return {
            labels: sortedMonths,
            datasets: [
                {
                    label: 'Kế hoạch (m²)',
                    data: sortedMonths.map(month => grouped[month].actual * 0.95),
                    backgroundColor: 'rgba(96, 165, 250, 0.5)',
                    borderColor: 'rgba(96, 165, 250, 1)',
                    borderWidth: 1,
                    type: 'bar' as const,
                    order: 2,
                },
                {
                    label: 'Thực tế (m²)',
                    data: sortedMonths.map(month => grouped[month].actual),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.3,
                    type: 'line' as const,
                    fill: true,
                    order: 1,
                },
            ],
        };
    }, [data]);

    // 2. Biểu đồ tròn phân bổ chất lượng
    const qualityPieData = useMemo(() => {
        const grouped = data.reduce((acc, r) => {
            acc.A1 = (acc.A1 || 0) + r.a1;
            acc.A2 = (acc.A2 || 0) + r.a2;
            acc.CắtLô = (acc.CắtLô || 0) + r.cut;
            acc.Phế1 = (acc.Phế1 || 0) + r.waste1;
            acc.Phế2 = (acc.Phế2 || 0) + r.waste2;
            acc.PhếHủy = (acc.PhếHủy || 0) + r.scrap;
            return acc;
        }, {} as Record<string, number>);

        return {
            labels: Object.keys(grouped),
            datasets: [
                {
                    label: 'Sản lượng (m²)',
                    data: Object.values(grouped),
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#dc2626', '#6b7280'],
                    borderWidth: 0,
                },
            ],
        };
    }, [data]);

    // 3. Biểu đồ đường tỷ lệ hao phí theo công đoạn
    const wasteByStageData = useMemo(() => {
        const stages = ['Hao phí mộc', 'Hao phí lò', 'Hao phí trước mài', 'Hao phí thành phẩm'];
        const grouped = data.reduce((acc, r) => {
            const date = dayjs(r.date).format('DD/MM');
            if (!acc[date]) acc[date] = { date, 'Hao phí mộc': 0, 'Hao phí lò': 0, 'Hao phí trước mài': 0, 'Hao phí thành phẩm': 0 };
            acc[date]['Hao phí mộc'] += r.waste_moc;
            acc[date]['Hao phí lò'] += r.waste_lo;
            acc[date]['Hao phí trước mài'] += r.waste_truoc_mai;
            acc[date]['Hao phí thành phẩm'] += r.waste_thanh_pham;
            return acc;
        }, {} as any);

        const sortedDates = Object.keys(grouped).sort((a, b) => dayjs(a, 'DD/MM').unix() - dayjs(b, 'DD/MM').unix());

        return {
            labels: sortedDates,
            datasets: stages.map(stage => ({
                label: stage,
                data: sortedDates.map(date => grouped[date][stage]),
                borderColor: stage === 'Hao phí mộc' ? '#f59e0b' : stage === 'Hao phí lò' ? '#ef4444' : stage === 'Hao phí trước mài' ? '#f97316' : '#dc2626',
                backgroundColor: 'transparent',
                tension: 0.3,
            })),
        };
    }, [data]);

    // 4. Biểu đồ cột sản lượng theo dây chuyền
    const outputByLineData = useMemo(() => {
        const grouped = data.reduce((acc, r) => {
            if (!acc[r.lineName]) acc[r.lineName] = 0;
            acc[r.lineName] += r.a1 + r.a2 + r.cut;
            return acc;
        }, {} as Record<string, number>);

        return {
            labels: Object.keys(grouped),
            datasets: [
                {
                    label: 'Sản lượng (m²)',
                    data: Object.values(grouped),
                    backgroundColor: '#3b82f6',
                    borderColor: '#3b82f6',
                    borderWidth: 1,
                },
            ],
        };
    }, [data]);

    // --- Cấu hình cho Chart.js ---
    const commonChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
                labels: { color: '#1e293b', font: { size: 12 } },
            },
            tooltip: {
                titleFont: { size: 14 },
                bodyFont: { size: 12 },
                callbacks: {
                    label: (context: any) => `${context.dataset.label}: ${context.parsed.y?.toLocaleString('vi-VN')}`,
                }
            },
        },
        scales: {
            x: {
                ticks: { color: '#64748b', font: { size: 11 } },
                grid: { color: '#e2e8f0', drawBorder: false },
            },
            y: {
                ticks: { color: '#64748b' },
                grid: { color: '#e2e8f0', drawBorder: false },
                title: { display: true, color: '#1e293b' }
            }
        }
    };

    const planVsActualOptions = {
        ...commonChartOptions,
        scales: {
            x: commonChartOptions.scales.x,
            y: { ...commonChartOptions.scales.y, title: { ...commonChartOptions.scales.y.title, text: 'Sản lượng (m²)' } }
        }
    };

    const wasteByStageOptions = {
        ...commonChartOptions,
        scales: {
            x: commonChartOptions.scales.x,
            y: { ...commonChartOptions.scales.y, title: { ...commonChartOptions.scales.y.title, text: 'Tỷ lệ hao phí (%)' }, ticks: { ...commonChartOptions.scales.y.ticks, callback: (value: string) => value + '%' } }
        }
    };

    const outputByLineOptions = {
        ...commonChartOptions,
        plugins: { ...commonChartOptions.plugins, legend: { display: false } },
        scales: {
            x: commonChartOptions.scales.x,
            y: { ...commonChartOptions.scales.y, title: { ...commonChartOptions.scales.y.title, text: 'Tổng sản lượng (m²)' } }
        }
    };

    const pieOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: { color: '#1e293b', padding: 20 },
            },
            tooltip: {
                callbacks: {
                    label: (context: any) => {
                        const label = context.label || '';
                        const value = context.parsed;
                        const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${label}: ${value.toLocaleString('vi-VN')} m² (${percentage}%)`;
                    },
                },
            },
        },
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
                const mappedPayload: DetailedProductionRecord[] = (payload?.pagidata ?? []).map((item: any) => ({
                    key: String(item.id),
                    startTime: item?.startTime ?? null,
                    endTime: item?.endTime ?? null,
                    productionLineName: item?.productionLine?.name ?? 'Chưa xác định',
                    stageName: item?.stage?.name ?? 'Chưa xác định',
                    productName: item?.product?.name ?? 'Chưa xác định',
                    quantity: Number(item?.quantity ?? 0),
                    area: Number(item?.area ?? 0),
                    createdBy: item?.createdByUsername ?? 'Hệ thống',
                    stopReason: item?.stopReason ?? undefined,
                    isEmergency: Boolean(item?.isEmergency),
                    notes: item?.notes ?? '',
                }));

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
    }, [selectedLine, dateRange, tableStageName, tableRefreshKey, activeFactory]);
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
                    <div className={`${styles.card} ${styles.halfWidth}`}>
                        <h2 className={styles.cardTitle}>Phân Bổ Chất Lượng Cuối Cùng</h2>
                        <div className={styles.chartContainer} style={{ height: '360px' }}>
                            <Doughnut data={qualityPieData} options={pieOptions} />
                        </div>
                    </div>
                    <div className={`${styles.card} ${styles.halfWidth}`}>
                        <h2 className={styles.cardTitle}>Sản Lượng Theo Dây Chuyền</h2>
                        <div className={styles.chartContainer} style={{ height: '360px' }}>
                            <Bar data={outputByLineData} options={outputByLineOptions} />
                        </div>
                    </div>
                    <div className={`${styles.card} ${styles.fullWidth}`}>
                        <h2 className={styles.cardTitle}>So Sánh Thực Tế vs. Kế Hoạch</h2>
                        <div className={styles.chartContainer} style={{ height: '420px' }}>
                            <Bar data={planVsActualData} options={planVsActualOptions} />
                        </div>
                    </div>
                </div>

                <div className={`${styles.card} ${styles.fullWidth}`}>
                    <h2 className={styles.cardTitle}>Xu Hướng Tỷ Lệ Hao Phí Theo Công Đoạn</h2>
                    <div className={styles.chartContainer} style={{ height: '350px' }}>
                        <Line data={wasteByStageData} options={wasteByStageOptions} />
                    </div>
                </div>

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
