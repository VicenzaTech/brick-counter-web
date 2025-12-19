'use client';

import { useState, useMemo, useEffect, useReducer, useRef, useCallback } from 'react';
import { Card, Select, Space, Typography, Table, Tag, Tooltip, Modal, Form, Input, InputNumber, message } from 'antd';
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
    DatePreset,
    DetailedProductionRecord,
    MOCK_DETAIL_TABLE_DATA,
    PRESET_LABEL_OVERRIDES,
    RangePreset,
    STAGE_NAME_META,
    STOP_REASON_META,
    StageNameKey,
    StopReasonKey,
    getActualOutput,
    getMockDetailRows,
} from '@/lib/mock/dashboard-data';
import { useProductionAnalyticsData } from '@/hooks/useProductionAnalyticsData';
import { fetchWorkshops, WorkshopSummary } from '@/lib/services/workshops';
import {
    createWorkshopTarget,
    fetchWorkshopTargets as fetchWorkshopTargetsService,
    updateWorkshopTarget,
    WorkshopSummaryOption,
    WorkshopTargetChart,
    WorkshopTargetItem,
    WorkshopTargetPayload,
} from '@/lib/services/workshop-targets';
import type { ProductionAnalyticsParams } from '@/lib/services/production-analytics';

const { Text } = Typography;
const TREND_VIEW_OPTIONS = [
    { key: 'actual', label: 'Sản lượng' },
    { key: 'cumulative', label: 'Lũy tiến' },
] as const;
const OUTPUT_UNIT = 'm²';

const formatCompactMetric = (value: number, decimals = 1) => {
    if (!Number.isFinite(value)) {
        return '--';
    }
    const absolute = Math.abs(value);
    const normalize = (divisor: number, suffix: string) => {
        const scaled = value / divisor;
        return `${Number(scaled.toFixed(decimals))}${suffix}`;
    };
    if (absolute >= 1_000_000_000) {
        return normalize(1_000_000_000, 'B');
    }
    if (absolute >= 1_000_000) {
        return normalize(1_000_000, 'M');
    }
    if (absolute >= 1_000) {
        return normalize(1_000, 'K');
    }
    return value.toLocaleString('vi-VN');
};

const formatProductionValue = (value: number, options?: { includeUnit?: boolean }) => {
    const compact = formatCompactMetric(value);
    if (compact === '--') {
        return compact;
    }
    return options?.includeUnit === false ? compact : `${compact} ${OUTPUT_UNIT}`;
};

interface TargetSummary {
    actual: number;
    target: number;
    progress: number;
    remaining: number;
}

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
    const [messageApi, contextHolder] = message.useMessage();
    const [workshops, setWorkshops] = useState<WorkshopSummary[]>([]);
    const [activeWorkshopId, setActiveWorkshopId] = useState<number | null>(null);
    const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
    const [selectedLine, setSelectedLine] = useState<string>('all');
    const [tableStageName, setTableStageName] = useState<'all' | StageNameKey>('all');
    const [trendRange, setTrendRange] = useState<RangePreset>('30d');
    const [trendViewMode, setTrendViewMode] = useState<typeof TREND_VIEW_OPTIONS[number]['key']>('actual');
    const [lineRange, setLineRange] = useState<RangePreset>('30d');
    const [targetModalOpen, setTargetModalOpen] = useState(false);
    const [targetSubmitting, setTargetSubmitting] = useState(false);
    const [workshopTarget, setWorkshopTarget] = useState<WorkshopTargetItem | null>(null);
    const [targetModalMode, setTargetModalMode] = useState<'create' | 'edit'>('create');
    const [targetWorkshopOptions, setTargetWorkshopOptions] = useState<WorkshopSummaryOption[]>([]);
    const [targetYearOptions, setTargetYearOptions] = useState<number[]>([]);
    const [targetFormInitialValues, setTargetFormInitialValues] = useState<Partial<WorkshopTargetPayload> | null>(null);
    const [targetFormDirty, setTargetFormDirty] = useState(false);
    const [selectedTargetWorkshopId, setSelectedTargetWorkshopId] = useState<number | undefined>(undefined);
    const [selectedTargetYear, setSelectedTargetYear] = useState<number | undefined>(dayjs().year());
    const [includeTargetHistory, setIncludeTargetHistory] = useState(false);
    const [workshopTargetItems, setWorkshopTargetItems] = useState<WorkshopTargetItem[]>([]);
    const [workshopTargetChart, setWorkshopTargetChart] = useState<WorkshopTargetChart[]>([]);
    const workshopTargetItemsRef = useRef<WorkshopTargetItem[]>([]);
    const workshopTargetChartRef = useRef<WorkshopTargetChart[]>([]);
    const [workshopTargetLoading, setWorkshopTargetLoading] = useState(false);
    const [targetForm] = Form.useForm<WorkshopTargetPayload>();
    const [pendingWorkshopSyncId, setPendingWorkshopSyncId] = useState<number | null>(null);
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
    const normalizedTargetYearOptions = useMemo(() => {
        const currentYear = dayjs().year();
        const allowedYears = [currentYear, currentYear + 1];
        const allowedSet = new Set(allowedYears);
        const intersection = targetYearOptions.filter(year => allowedSet.has(year));
        const source = intersection.length ? intersection : allowedYears;
        const uniqueYears = Array.from(new Set(source)).sort((a, b) => a - b);
        return uniqueYears.map(year => ({
            label: `Năm ${year}`,
            value: year,
        }));
    }, [targetYearOptions]);
    const activeWorkshopName = useMemo(() => {
        if (activeWorkshopId == null) {
            return workshops.length ? 'Chưa chọn phân xưởng' : 'Đang tải phân xưởng';
        }
        return workshops.find(workshop => workshop.id === activeWorkshopId)?.name ?? `Phân xưởng ${activeWorkshopId}`;
    }, [activeWorkshopId, workshops]);
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
    const analyticsParams = useMemo<ProductionAnalyticsParams>(() => {
        const params: ProductionAnalyticsParams = {
            productionLine: selectedLine,
            useMock: useMockDashboardData,
        };
        if (manualRange) {
            params.from = manualRange[0].startOf('day').toISOString();
            params.to = manualRange[1].endOf('day').toISOString();
        } else {
            params.range = trendRange;
        }
        return params;
    }, [manualRange, selectedLine, trendRange, useMockDashboardData]);
    const {
        records: analyticsRecords,
        kpiCards,
        lineOptions,
        filters: analyticsFilters,
        loading: analyticsLoading,
        error: analyticsError,
        hasHydrated: hasLoadedAnalytics,
    } = useProductionAnalyticsData(analyticsParams);
    const deferredAnalyticsRecords = analyticsRecords;
    const targetSummary = useMemo<TargetSummary | null>(() => {
        const sourceRecords = deferredAnalyticsRecords;
        const actual = sourceRecords.reduce((sum, record) => sum + getActualOutput(record), 0);
        const computedTarget = sourceRecords.reduce((sum, record) => {
            const base = record.originalOutput || getActualOutput(record);
            return sum + Math.round(base * 0.95);
        }, 0);
        const planTarget =
            typeof workshopTarget?.yearlyTarget === 'number' && workshopTarget.yearlyTarget > 0
                ? workshopTarget.yearlyTarget
                : computedTarget;
        if (!planTarget) {
            return null;
        }
        const progress = planTarget ? (actual / planTarget) * 100 : 0;
        return {
            actual,
            target: planTarget,
            progress,
            remaining: Math.max(planTarget - actual, 0),
        };
    }, [deferredAnalyticsRecords, workshopTarget?.yearlyTarget]);
    const targetVisualProgress = Math.min(100, Math.max(0, targetSummary?.progress ?? 0));
    const targetActualLabel = targetSummary ? formatProductionValue(targetSummary.actual) : '--';
    const targetPlannedLabel = targetSummary ? formatProductionValue(targetSummary.target) : '--';
    const targetRemainingLabel = targetSummary ? formatProductionValue(targetSummary.remaining) : '--';
    const targetActualShort = targetSummary ? formatProductionValue(targetSummary.actual, { includeUnit: false }) : '--';
    const targetPlannedShort = targetSummary ? formatProductionValue(targetSummary.target, { includeUnit: false }) : '--';
    const targetRemainingShort = targetSummary
        ? formatProductionValue(targetSummary.remaining, { includeUnit: false })
        : '--';
    const targetProgressLabel = targetSummary ? `${targetSummary.progress.toFixed(1)}%` : '--';
    const targetProgressValue = targetSummary ? Number(targetSummary.progress.toFixed(1)) : 0;
    const hasActivePlan = Boolean(workshopTarget);
    const getTargetStatus = useCallback(
        (target?: WorkshopTargetItem | null, options?: { includeProgress?: boolean }) => {
            const currentYear = dayjs().year();
            if (!target) {
                return 'Chưa có kế hoạch';
            }
            if (target.year > currentYear) {
                return 'Chưa thực hiện';
            }
            if (target.year < currentYear) {
                return 'Đã kết thúc';
            }
            if (options?.includeProgress && targetSummary?.progress && targetSummary.progress >= 100) {
                return 'Đã hoàn thành';
            }
            return 'Đang thực hiện';
        },
        [targetSummary]
    );
    const targetPlanName = workshopTarget?.name ?? 'Chưa có kế hoạch';
    const targetPlanYear = workshopTarget?.year ?? selectedTargetYear ?? dayjs().year();
    const targetPlanStatus = getTargetStatus(workshopTarget, { includeProgress: true });
    const targetWorkshopLabel =
        workshopTarget?.workshopName ??
        (selectedTargetWorkshopId ? `Phân xưởng ${selectedTargetWorkshopId}` : activeWorkshopName);
    const showTargetSkeleton = workshopTargetLoading;
    const targetStatusDescription = useMemo(() => {
        if (!hasActivePlan) {
            return `Phân xưởng này chưa có mục tiêu cho năm ${targetPlanYear}. Nhấn "Thêm mục tiêu" để bắt đầu.`;
        }
        switch (targetPlanStatus) {
            case 'Chưa có kế hoạch':
                return 'Chọn hoặc thiết lập kế hoạch để bắt đầu theo dõi mục tiêu.';
            case 'Chưa thực hiện':
                return 'Kế hoạch chưa tới thời gian triển khai. Theo dõi lại khi bước vào năm mục tiêu.';
            case 'Đã kết thúc':
                return 'Kế hoạch đã kết thúc. Xem lịch sử hoặc tạo kế hoạch mới cho giai đoạn tiếp theo.';
            case 'Đã hoàn thành':
                return 'Kế hoạch đã hoàn tất, hãy tiếp tục duy trì hiệu suất hoặc thiết lập mục tiêu mới.';
            default:
                return 'Theo dõi tiến độ để đảm bảo hoàn thành mục tiêu đúng hạn.';
        }
    }, [hasActivePlan, targetPlanStatus, targetPlanYear]);
    const showProgressBar = hasActivePlan && Boolean(targetSummary);
    const progressSummaryText = showProgressBar
        ? `${targetActualShort} / ${targetPlannedShort} ${OUTPUT_UNIT}`
        : 'Đang cập nhật';
    const getTargetStatusChipClass = (status: string) => {
        switch (status) {
            case 'Đã hoàn thành':
            case 'Đã kết thúc':
                return `${styles.targetStatusChip} ${styles.targetStatusChipSuccess}`;
            case 'Đang thực hiện':
                return `${styles.targetStatusChip} ${styles.targetStatusChipInfo}`;
            default:
                return `${styles.targetStatusChip} ${styles.targetStatusChipNeutral}`;
        }
    };
    const selectedLineOption = useMemo(
        () => lineOptions.find(option => option.id === selectedLine),
        [lineOptions, selectedLine]
    );
    const resolvedLineOptions = useMemo(() => {
        if (selectedLine === 'all' || lineOptions.some(option => option.id === selectedLine)) {
            return lineOptions;
        }
        const workshopMatch = workshops.find(workshop => String(workshop.id) === selectedLine);
        const fallbackOption = {
            id: selectedLine,
            label: workshopMatch?.name ?? `Phân xưởng ${selectedLine}`,
        };
        return [...lineOptions, fallbackOption];
    }, [lineOptions, selectedLine, workshops]);
    const syncSelectedLineWithWorkshop = useCallback(
        (workshopId: number | null, options?: { applyFallback?: boolean }) => {
            if (!workshopId || !lineOptions.length) {
                return false;
            }
            const workshop = workshops.find(item => item.id === workshopId);
            if (!workshop) {
                return false;
            }
            const normalizedName = workshop.name?.toLowerCase().trim();
            const match =
                lineOptions.find(option => option.id === String(workshopId)) ||
                (normalizedName
                    ? lineOptions.find(option => option.label.toLowerCase().trim() === normalizedName)
                    : undefined);
            if (match) {
                if (match.id !== selectedLine) {
                    setSelectedLine(match.id);
                }
                return true;
            }
            if (options?.applyFallback !== false) {
                const allOption = lineOptions.find(option => option.id === 'all');
                if (allOption && allOption.id !== selectedLine) {
                    setSelectedLine(allOption.id);
                }
            }
            return false;
        },
        [lineOptions, selectedLine, workshops]
    );
    const mockSelectedLineLabel = useMemo(() => {
        if (selectedLine === 'all') {
            return null;
        }
        return selectedLineOption?.label ?? null;
    }, [selectedLine, selectedLineOption]);
    useEffect(() => {
        if (!lineOptions.length) {
            return;
        }
        if (!lineOptions.some(option => option.id === selectedLine)) {
            setSelectedLine(lineOptions[0].id);
        }
    }, [lineOptions, selectedLine]);

    useEffect(() => {
        if (pendingWorkshopSyncId == null || !lineOptions.length) {
            return;
        }
        syncSelectedLineWithWorkshop(pendingWorkshopSyncId);
        setPendingWorkshopSyncId(null);
    }, [pendingWorkshopSyncId, lineOptions, syncSelectedLineWithWorkshop]);
    const handleWorkshopChange = useCallback(
        (workshopId: number | null) => {
            setActiveWorkshopId(workshopId);
            setSelectedTargetWorkshopId(workshopId ?? undefined);
            if (!workshopId) {
                setPendingWorkshopSyncId(null);
                if (selectedLine !== 'all') {
                    setSelectedLine('all');
                }
                return;
            }
            const matched = syncSelectedLineWithWorkshop(workshopId);
            if (!matched) {
                setPendingWorkshopSyncId(workshopId);
            } else {
                setPendingWorkshopSyncId(null);
            }
        },
        [selectedLine, syncSelectedLineWithWorkshop]
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
    const handleTargetFormValuesChange = useCallback(
        (_: Partial<WorkshopTargetPayload>, allValues: Partial<WorkshopTargetPayload>) => {
            if (targetModalMode !== 'edit') {
                setTargetFormDirty(true);
                return;
            }
            if (!targetFormInitialValues) {
                setTargetFormDirty(false);
                return;
            }
            const watchedFields: (keyof WorkshopTargetPayload)[] = ['name', 'workshopId', 'year', 'yearlyTarget', 'description'];
            const hasChanges = watchedFields.some(key => {
                const nextValue = allValues?.[key];
                const initialValue = targetFormInitialValues?.[key];
                return (nextValue ?? '') !== (initialValue ?? '');
            });
            setTargetFormDirty(hasChanges);
        },
        [targetModalMode, targetFormInitialValues]
    );

    useEffect(() => {
        let cancelled = false;
        const loadWorkshops = async () => {
            try {
                const result = await fetchWorkshops();
                if (cancelled) {
                    return;
                }
                setWorkshops(result);
                const firstWorkshopId = result[0]?.id ?? null;
                if (activeWorkshopId == null && firstWorkshopId != null) {
                    setActiveWorkshopId(firstWorkshopId);
                    setSelectedTargetWorkshopId(firstWorkshopId);
                    setPendingWorkshopSyncId(firstWorkshopId);
                } else if (firstWorkshopId != null) {
                    setSelectedTargetWorkshopId(prev => prev ?? firstWorkshopId);
                }
            } catch (error) {
                if (!cancelled) {
                    console.error('Unable to load workshops', error);
                    messageApi.error('Khong the tai danh sach phan xuong.');
                }
            }
        };
        loadWorkshops();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!analyticsFilters) {
            return;
        }
        const filters = analyticsFilters;
        const selectedLineFromApi = filters.productionLine?.selected;
        if (!hasSyncedInitialFilters.current && selectedLineFromApi && selectedLineFromApi !== selectedLine) {
            setSelectedLine(selectedLineFromApi);
        }
        if (filters.dateRange?.presets?.length) {
            setDatePresets(filters.dateRange.presets.map(normalizePresetLabel));
        }
        const incomingPreset = filters.dateRange?.selectedPreset;
        if (incomingPreset && dateRangeSource !== 'manual' && incomingPreset !== trendRange) {
            setTrendRange(incomingPreset);
            setLineRange(prev => (prev === trendRange ? incomingPreset : prev));
        }
        if (filters.dateRange?.from && filters.dateRange?.to && dateRangeSource !== 'manual') {
            setDateRange([dayjs(filters.dateRange.from), dayjs(filters.dateRange.to)]);
        }
        if (!hasSyncedInitialFilters.current) {
            hasSyncedInitialFilters.current = true;
        }
    }, [analyticsFilters, dateRangeSource, trendRange, selectedLine]);
    const handleLineRangeChange = (presetKey: RangePreset) => {
        setLineRange(presetKey);
    };

    const handleQuickRangePreset = (preset: 'month' | 'year') => {
        const now = dayjs();
        const start = preset === 'month' ? now.startOf('month') : now.startOf('year');
        const end = preset === 'month' ? now.endOf('month') : now.endOf('year');
        setDateRange([start, end]);
        setDateRangeSource('manual');
        setTrendRange(preset === 'month' ? '30d' : '12m');
    };

    const handleOpenTargetModal = () => {
        const isEditing = Boolean(workshopTarget?.id);
        const nextMode: 'create' | 'edit' = isEditing ? 'edit' : 'create';
        setTargetModalMode(nextMode);
        const fallbackWorkshopId =
            workshopTarget?.workshopId ??
            selectedTargetWorkshopId ??
            activeWorkshopId ??
            workshops[0]?.id;
        const availableYears = normalizedTargetYearOptions.map(option => option.value);
        const desiredYear = workshopTarget?.year ?? selectedTargetYear ?? dayjs().year();
        const fallbackYear = availableYears.includes(desiredYear)
            ? desiredYear
            : availableYears[0] ?? dayjs().year();
        const nextValues: Partial<WorkshopTargetPayload> = {
            name: isEditing && workshopTarget?.name ? workshopTarget.name : `Kế hoạch ${fallbackYear}`,
            workshopId: fallbackWorkshopId,
            year: fallbackYear,
            yearlyTarget: workshopTarget?.yearlyTarget ?? Math.round(targetSummary?.target ?? 0),
            description: workshopTarget?.description ?? '',
        };
        targetForm.setFieldsValue(nextValues);
        setTargetFormInitialValues(nextValues);
        setTargetFormDirty(false);
        setTargetModalOpen(true);
    };

    const handleCloseTargetModal = () => {
        setTargetModalOpen(false);
        targetForm.resetFields();
        setTargetFormInitialValues(null);
        setTargetFormDirty(false);
    };

    const handleSubmitTargetModal = async () => {
        try {
            const values = await targetForm.validateFields();
            setTargetSubmitting(true);
            const isEditing = targetModalMode === 'edit' && Boolean(workshopTarget?.id);
            if (isEditing && workshopTarget?.id) {
                await updateWorkshopTarget(workshopTarget.id, values);
            } else {
                await createWorkshopTarget(values);
            }
            setTargetModalOpen(false);
            targetForm.resetFields();
            setTargetFormInitialValues(null);
            setTargetFormDirty(false);
            messageApi.success(isEditing ? 'Đã cập nhật mục tiêu nhà máy' : 'Đã tạo mục tiêu nhà máy');
            await loadWorkshopTargets({ force: true });
        } catch (error) {
            const messageText = error instanceof Error ? error.message : 'Có lỗi xảy ra';
            messageApi.error(messageText);
        } finally {
            setTargetSubmitting(false);
        }
    };

    // const handleDateInputChange = (type: 'start' | 'end', value: string) => {
    //     if (!value) {
    //         setDateRange(null);
    //         setDateRangeSource('preset');
    //         return;
    //     }

    //     const parsed = dayjs(value);
    //     if (!parsed.isValid()) {
    //         return;
    //     }

    //     setDateRangeSource('manual');
    //     setDateRange(prev => {
    //         let start = prev?.[0] ?? parsed;
    //         let end = prev?.[1] ?? parsed;

    //         if (type === 'start') {
    //             start = parsed;
    //             if (end && parsed.isAfter(end)) {
    //                 end = parsed;
    //             }
    //         } else {
    //             end = parsed;
    //             if (start && parsed.isBefore(start)) {
    //                 start = parsed;
    //             }
    //         }

    //         return [start, end];
    //     });
    // };

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
        let filtered = [...deferredAnalyticsRecords];

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
    }, [deferredAnalyticsRecords, dateRange, selectedLine, selectedLineOption]);

    const availableLineLabels = useMemo(() => {
        const optionLabels = lineOptions
            .filter(option => option.id !== 'all')
            .map(option => option.label);

        if (optionLabels.length) {
            return optionLabels;
        }

        return Array.from(new Set(deferredAnalyticsRecords.map(record => record.lineName)));
    }, [deferredAnalyticsRecords, lineOptions]);

    const normalizedDatePresets = useMemo(() => {
        const base = datePresets.length ? datePresets : DEFAULT_DATE_PRESETS;
        return base.map(normalizePresetLabel);
    }, [datePresets]);
    const trendRangeLabel = normalizedDatePresets.find(preset => preset.key === trendRange)?.label ?? '';
    const manualRangeLabel = manualRange ? `${manualRange[0].format('DD/MM/YYYY')} - ${manualRange[1].format('DD/MM/YYYY')}` : '';
    const showMonthlyTrendSeries = useMemo(() => {
        if (manualRange) {
            return manualRange[1].diff(manualRange[0], 'day') > 31;
        }
        return trendRange === '12m';
    }, [manualRange, trendRange]);
    const timeUnitLabel = showMonthlyTrendSeries ? 'theo tháng' : 'theo ngày';
    const trendModeLabel = trendViewMode === 'actual' ? 'sản lượng' : 'lũy tiến';
    const trendTitle = manualRangeLabel
        ? `Xu hướng ${trendModeLabel} (${manualRangeLabel}, ${timeUnitLabel})`
        : trendRangeLabel
            ? `Xu hướng ${trendModeLabel} ${trendRangeLabel} ${timeUnitLabel}`
            : `Xu hướng ${trendModeLabel} ${timeUnitLabel}`;
    const lineRangeLabel = normalizedDatePresets.find(preset => preset.key === lineRange)?.label ?? '';
    const skeletonRangeCount = Math.max(normalizedDatePresets.length, 2);
    const showSkeletons = analyticsLoading && !hasLoadedAnalytics;

    const filteredTrendRecords = useMemo(() => {
        const sourceRecords = deferredAnalyticsRecords;
        if (!manualRange) {
            return sourceRecords;
        }
        const [start, end] = manualRange;
        const startValue = start.startOf('day').valueOf();
        const endValue = end.endOf('day').valueOf();
        return sourceRecords.filter(record => {
            const recordTime = dayjs(record.date).valueOf();
            return recordTime >= startValue && recordTime <= endValue;
        });
    }, [deferredAnalyticsRecords, manualRange]);

    const trendSeries = useMemo(() => {
        const trendRecords = filteredTrendRecords;
        const dailyMap: Record<string, { actual: number; target: number }> = {};
        const monthlyMap: Record<string, { actual: number; target: number }> = {};

        trendRecords.forEach(record => {
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
    }, [filteredTrendRecords]);

    const productionTrend = useMemo(() => {
        const selectedSeries = showMonthlyTrendSeries ? trendSeries.monthly : trendSeries.daily;
        const yearTargetValue =
            typeof workshopTarget?.yearlyTarget === 'number' && Number.isFinite(workshopTarget.yearlyTarget)
                ? workshopTarget.yearlyTarget
                : null;
        const labels = selectedSeries.labels;
        let actualSeries = [...selectedSeries.actual];
        let targetSeries = [...selectedSeries.target];
        let actualLabel = showMonthlyTrendSeries ? 'Sản lượng theo tháng' : 'Sản lượng theo ngày';
        let targetLabel = showMonthlyTrendSeries ? 'Mục tiêu theo tháng' : 'Mục tiêu theo ngày';

        if (trendViewMode === 'cumulative') {
            const cumulativeActual: number[] = [];
            actualSeries.reduce((sum, value, index) => {
                const next = sum + value;
                cumulativeActual[index] = next;
                return next;
            }, 0);
            actualSeries = cumulativeActual;
            if (yearTargetValue !== null && labels.length) {
                targetSeries = labels.map(() => yearTargetValue);
                targetLabel = 'Mục tiêu năm';
            } else {
                const cumulativeTarget: number[] = [];
                targetSeries.reduce((sum, value, index) => {
                    const next = sum + value;
                    cumulativeTarget[index] = next;
                    return next;
                }, 0);
                targetSeries = cumulativeTarget;
                targetLabel = 'Mục tiêu lũy tiến';
            }
            actualLabel = 'Sản lượng lũy tiến';
        }

        const hasSinglePoint = labels.length <= 1;

        return {
            hasSinglePoint,
            actualLabel,
            targetLabel,
            data: {
                labels,
                datasets: [
                    {
                        label: actualLabel,
                        data: actualSeries,
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
                        label: targetLabel,
                        data: targetSeries,
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
    }, [trendSeries, trendViewMode, showMonthlyTrendSeries, workshopTarget?.yearlyTarget]);

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
    }, [selectedLine, dateRange, tableStageName, activeWorkshopId, mockSelectedLineLabel, useMockDashboardData]);

    const loadWorkshopTargets = useCallback(
        async (options?: { force?: boolean }) => {
            setWorkshopTargetLoading(true);
            try {
                const workshopFilter = selectedTargetWorkshopId ?? activeWorkshopId ?? undefined;
                const payload = await fetchWorkshopTargetsService(
                    {
                        workshopId: workshopFilter,
                        year: selectedTargetYear,
                        includeHistory: includeTargetHistory,
                    },
                    { force: options?.force }
                );
                const filters = payload.filters ?? {};
                if (filters.workshops?.length) {
                    setTargetWorkshopOptions(filters.workshops);
                }
                if (filters.years?.length) {
                    setTargetYearOptions(filters.years);
                }
                if (typeof filters.includeHistory === 'boolean' && filters.includeHistory !== includeTargetHistory) {
                    setIncludeTargetHistory(filters.includeHistory);
                }
                if (filters.selectedWorkshopId && filters.selectedWorkshopId !== selectedTargetWorkshopId) {
                    setSelectedTargetWorkshopId(filters.selectedWorkshopId);
                } else if (!selectedTargetWorkshopId && workshopFilter) {
                    setSelectedTargetWorkshopId(workshopFilter);
                }
                if (filters.selectedYear && filters.selectedYear !== selectedTargetYear) {
                    setSelectedTargetYear(filters.selectedYear);
                }
                const items = payload.items?.length ? payload.items : [];
                setWorkshopTargetItems(items);
                workshopTargetItemsRef.current = items;
                const chart = payload.chart?.length ? payload.chart : [];
                setWorkshopTargetChart(chart);
                workshopTargetChartRef.current = chart;
                if (items?.length) {
                    setWorkshopTarget(
                        items.find(
                            item =>
                                item.workshopId === (filters.selectedWorkshopId ?? workshopFilter) &&
                                item.year === (filters.selectedYear ?? selectedTargetYear)
                        ) ?? items[0]
                    );
                } else {
                    setWorkshopTarget(null);
                }
            } catch (error) {
                console.error('Không thể tải dữ liệu mục tiêu nhà máy', error);
            } finally {
                setWorkshopTargetLoading(false);
            }
        },
        [selectedTargetWorkshopId, selectedTargetYear, includeTargetHistory, activeWorkshopId]
    );

    useEffect(() => {
        loadWorkshopTargets();
    }, [loadWorkshopTargets, selectedTargetWorkshopId]);
    // --- Render giao diện ---
    return (
        // Sử dụng styles từ CSS Module
        <div className={styles.dashboardWrapper}>
            <main className={styles.mainContent}>
                {contextHolder}
                {/* Header */}
                <header className={styles.dashboardHeader}>
                    <div>
                        <p className={styles.breadcrumb}>Trang chủ / {activeWorkshopName}</p>
                        <h1>Dashboard Quản lý sản xuất</h1>
                    </div>
                    <div className={styles.headerActions}>
                        <select
                            value={activeWorkshopId ?? ''}
                            onChange={(event) => {
                                const value = event.target.value ? Number(event.target.value) : null;
                                handleWorkshopChange(value);
                            }}
                            className={styles.formSelect}
                            disabled={!workshops.length}
                        >
                            <option value="" disabled>
                                {workshops.length ? 'Chọn phân xưởng' : 'Đang tải...'}
                            </option>
                            {workshops.map(workshop => (
                                <option key={workshop.id} value={workshop.id}>
                                    {workshop.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </header>

                {/* Filters */}
                <div className={styles.filtersSection}>
                    <div className={styles.filtersRow}>
                        <div className={styles.filterField}>
                            <span className={styles.filterLabel}>Dây chuyền theo dõi</span>
                            <select
                                value={selectedLine}
                                onChange={(e) => setSelectedLine(e.target.value)}
                                className={styles.formSelect}
                            >
                                {resolvedLineOptions.map(option => (
                                    <option key={option.id} value={option.id}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.filterField}>
                            <span className={styles.filterLabel}>Khoảng thời gian</span>
                            <div className={styles.quickRangeButtons}>
                                <button
                                    type="button"
                                    className={`${styles.quickRangeButton} ${trendRange === '30d' ? styles.quickRangeButtonActive : ''}`}
                                    onClick={() => handleQuickRangePreset('month')}
                                >
                                    Tháng này
                                </button>
                                <button
                                    type="button"
                                    className={`${styles.quickRangeButton} ${trendRange === '12m' ? styles.quickRangeButtonActive : ''}`}
                                    onClick={() => handleQuickRangePreset('year')}
                                >
                                    Năm nay
                                </button>
                            </div>
                        </div>
                        <div className={`${styles.filterField} ${styles.filterActions}`}>
                            <span className={styles.filterLabel}>Chế độ so sánh</span>
                            <Link href="/compare-dashboard" className={styles.compareButton}>
                                So sánh xưởng
                            </Link>
                        </div>
                    </div>
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
                                <div className={styles.metricCard} key={card.key}>
                                    <h3>{card.label}</h3>
                                    <div className={styles.metricValues}>
                                        <div className={styles.metricValueBlock}>
                                            <strong>{formatKpiValue(card.value, card.unit)}</strong>
                                        </div>
                                    </div>
                                    <span className={styles.metricDelta} style={{ color: '#94a3b8' }}>
                                        Dữ liệu trong năm
                                    </span>
                                </div>
                            );
                        })
                    ) : (
                        <div className={styles.emptyState} >Chưa có dữ liệu KPI</div>
                    )}
                </div>

                {/* Target progress */}
                <div className={styles.targetCard}>
                    <div className={styles.targetCardHeader}>
                        <div className={styles.targetPlanMeta}>
                            <span className={styles.cardSubtitle}>
                                {hasActivePlan ? `Mục tiêu năm ${targetPlanYear}` : 'Chưa có mục tiêu'}
                            </span>
                            <div className={styles.targetPlanTitle}>
                                <strong>{hasActivePlan ? targetPlanName : 'Thiết lập mục tiêu sản lượng'}</strong>
                                {hasActivePlan && (
                                    <span className={getTargetStatusChipClass(targetPlanStatus)}>{targetPlanStatus}</span>
                                )}
                            </div>
                            <span className={styles.targetPlanSubline}>{targetWorkshopLabel}</span>
                            <p className={styles.targetPlanNote}>{targetStatusDescription}</p>
                        </div>
                        <button type="button" className={styles.targetCardButton} onClick={handleOpenTargetModal}>
                            {hasActivePlan ? 'Chỉnh sửa mục tiêu' : 'Thêm mục tiêu'}
                        </button>
                    </div>
                    {showTargetSkeleton ? (
                        <div className={styles.targetSkeleton}>
                            <div className={styles.skeletonStack}>
                                <span className={`${styles.skeletonBlock} ${styles.skeletonLineMd}`} />
                                <span className={`${styles.skeletonBlock} ${styles.skeletonLineSm}`} />
                            </div>
                            <div className={styles.targetSkeletonRow}>
                                <span className={`${styles.skeletonBlock} ${styles.skeletonValueLg}`} />
                                <span className={`${styles.skeletonBlock} ${styles.skeletonValueLg}`} />
                                <span className={`${styles.skeletonBlock} ${styles.skeletonValueLg}`} />
                            </div>
                            <div className={`${styles.skeletonBlock} ${styles.skeletonChip}`} />
                        </div>
                    ) : hasActivePlan ? (
                        <>
                            <div className={styles.targetSummaryRow}>
                                <div className={styles.targetSummaryValue}>
                                    <span className={styles.targetSummaryLabel}>Tiến độ hiện tại</span>
                                    <strong>{targetSummary ? targetProgressLabel : '--'}</strong>
                                    <span className={styles.targetSummaryHint}>{progressSummaryText}</span>
                                </div>
                                <div className={styles.targetSummaryMeta}>
                                    <span>Năm mục tiêu</span>
                                    <strong>{targetPlanYear}</strong>
                                    {targetSummary && <small>Còn thiếu {targetRemainingLabel}</small>}
                                </div>
                            </div>
                            {showProgressBar ? (
                                <>
                                    <div
                                        className={styles.targetProgressBar}
                                        role="progressbar"
                                        aria-valuemin={0}
                                        aria-valuenow={targetProgressValue}
                                        aria-valuemax={100}
                                    >
                                        <span className={styles.targetProgressFill} style={{ width: `${targetVisualProgress}%` }} aria-hidden="true" />
                                    </div>
                                </>
                            ) : (
                                <p className={styles.targetPlanNote}>Chưa có dữ liệu để hiển thị tiến độ.</p>
                            )}
                        </>
                    ) : (
                        <div className={styles.targetEmpty}>
                            <p>{targetStatusDescription}</p>
                        </div>
                    )}
                    {showTargetSkeleton ? (
                        <div className={styles.targetListSkeleton}>
                            {Array.from({ length: 3 }).map((_, index) => (
                                <div key={`target-list-skeleton-${index}`} className={styles.targetListSkeletonItem}>
                                    <span className={`${styles.skeletonBlock} ${styles.skeletonLineMd}`} />
                                    <span className={`${styles.skeletonBlock} ${styles.skeletonLineSm}`} />
                                </div>
                            ))}
                        </div>
                    ) : workshopTargetItems.length > 0 ? (
                        <>
                            <div className={styles.targetList}>
                                {workshopTargetItems.map(item => {
                                    const isActive = item.workshopId === selectedTargetWorkshopId && item.year === selectedTargetYear;
                                    const hasMatchingId =
                                        typeof workshopTarget?.id !== 'undefined' &&
                                        typeof item.id !== 'undefined' &&
                                        item.id === workshopTarget.id;
                                    const matchesFallbackKey =
                                        typeof workshopTarget?.id === 'undefined' &&
                                        workshopTarget?.workshopId === item.workshopId &&
                                        workshopTarget?.year === item.year;
                                    const isSameTarget = hasMatchingId || matchesFallbackKey;
                                    const status = getTargetStatus(item, { includeProgress: Boolean(isSameTarget) });
                                    return (
                                        <button
                                            type="button"
                                            key={item.id ?? `${item.workshopId}-${item.year}`}
                                            className={`${styles.targetListItem} ${isActive ? styles.targetListItemActive : ''}`}
                                            onClick={() => {
                                                setSelectedTargetWorkshopId(item.workshopId);
                                                setSelectedTargetYear(item.year);
                                                setWorkshopTarget(item);
                                            }}
                                        >
                                            <div className={styles.targetListInfo}>
                                                <strong>{item.name}</strong>
                                                <span>{item.workshopName ?? `Phân xưởng ${item.workshopId}`}</span>
                                                <small>Năm {item.year}</small>
                                            </div>
                                            <div className={styles.targetListValue}>
                                                <span>{formatProductionValue(item.yearlyTarget)}</span>
                                                <span className={getTargetStatusChipClass(status)}>{status}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                            {includeTargetHistory && workshopTargetChart.length > 0 && (
                                <div className={styles.targetHistory}>
                                    {workshopTargetChart.map(chartGroup => (
                                        <div key={chartGroup.workshopId}>
                                            <p>
                                                <strong>{chartGroup.workshopName}</strong> — Tổng mục tiêu:{' '}
                                                {formatProductionValue(chartGroup.totalTarget)}
                                            </p>
                                            <ul>
                                                {chartGroup.points.map(point => (
                                                    <li key={`${chartGroup.workshopId}-${point.year}`}>
                                                        <span>{point.year}</span>
                                                        <span>{formatProductionValue(point.target)}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <p className={styles.targetFootnote}>Chưa có dữ liệu mục tiêu.</p>
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
                                            <h2 className={styles.cardTitle}>{trendTitle}</h2>
                                        </div>
                                        <div className={styles.trendLegend}>
                                            <span>
                                                <span className={styles.legendDot} style={{ backgroundColor: '#1d4ed8' }} />
                                                {productionTrend.actualLabel}
                                            </span>
                                            <span>
                                                <span className={styles.legendDash} style={{ borderColor: '#0ea5e9' }} />
                                                {productionTrend.targetLabel}
                                            </span>
                                        </div>
                                        <div className={styles.cardHeaderControls}>
                                            <div className={styles.trendModeToggle} role="group" aria-label="Chế độ hiển thị sản lượng">
                                                {TREND_VIEW_OPTIONS.map(option => (
                                                    <button
                                                        key={option.key}
                                                        type="button"
                                                        aria-pressed={trendViewMode === option.key}
                                                        onClick={() => setTrendViewMode(option.key)}
                                                        className={`${styles.rangeButton} ${trendViewMode === option.key ? styles.rangeButtonActive : ''}`}
                                                    >
                                                        {option.label}
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
                                        {/* <div className={styles.rangeToggle} role="group" aria-label="Chọn khoảng thời gian hiệu suất">
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
                                        </div> */}
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
                                    <h2 className={styles.cardTitle}>Báo cáo hệ thống</h2>
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
                <Modal
                    title={targetModalMode === 'edit' ? 'Chỉnh sửa mục tiêu nhà máy' : 'Thêm mục tiêu nhà máy'}
                    open={targetModalOpen}
                    onCancel={handleCloseTargetModal}
                    onOk={handleSubmitTargetModal}
                    okText={targetModalMode === 'edit' ? 'Lưu thay đổi' : 'Thêm mục tiêu'}
                    cancelText="Hủy"
                    confirmLoading={targetSubmitting}
                    destroyOnHidden={false}
                    okButtonProps={{ disabled: targetModalMode === 'edit' && !targetFormDirty }}
                >
                    <Form layout="vertical" form={targetForm} onValuesChange={handleTargetFormValuesChange}>
                        <Form.Item
                            name="name"
                            label="Tên kế hoạch"
                            rules={[{ required: true, message: 'Nh?p tên kế hoạch' }]}
                        >
                            <Input placeholder="K? ho?ch n?m..." />
                        </Form.Item>
                        <Form.Item
                            name="workshopId"
                            label="Phân xưởng"
                            rules={[{ required: true, message: 'Chọn phân xưởng' }]}
                        >
                            <Select
                                placeholder="Chọn phân xưởng"
                                options={workshops.map(workshop => ({
                                    label: workshop.name,
                                    value: workshop.id,
                                }))}
                                loading={!workshops.length}
                                disabled={!workshops.length}
                                showSearch
                                optionFilterProp="label"
                            />
                        </Form.Item>
                        <Form.Item
                            name="year"
                            label="Năm kế hoạch"
                            rules={[{ required: true, message: 'Chọn năm kế hoạch' }]}
                        >
                            <Select
                                placeholder="Chọn năm kế hoạch"
                                options={normalizedTargetYearOptions}
                                disabled={!normalizedTargetYearOptions.length}
                            />
                        </Form.Item>
                        <Form.Item
                            name="yearlyTarget"
                            label="Mục tiêu (m²)"
                            rules={[{ required: true, message: 'Nhập mục tiêu năm' }]}
                        >
                            <InputNumber
                                min={0}
                                step={5000}
                                style={{ width: '100%' }}
                                formatter={(value) => (value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
                            />
                        </Form.Item>
                        <Form.Item name="description" label="Ghi chú">
                            <Input.TextArea rows={3} placeholder="Mô tả mục tiêu, ràng buộc..." />
                        </Form.Item>
                    </Form>
                </Modal>
            </main>
        </div>
    );
}
