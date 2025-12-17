'use client';

import dayjs, { Dayjs } from 'dayjs';

export type StopReasonKey =
    | 'machine_error'
    | 'change_product'
    | 'shift_end'
    | 'maintenance'
    | 'other'
    | 'manual_stop'
    | 'end';

export type StageNameKey =
    | 'Ép'
    | 'Mài'
    | 'Nung'
    | 'Đóng hộp'
    | 'Nung xương'
    | 'Nung men';

export const STOP_REASON_META: Record<StopReasonKey, { label: string; color: string }> = {
    machine_error: { label: 'Sự cố máy', color: 'red' },
    change_product: { label: 'Đổi sản phẩm', color: 'orange' },
    shift_end: { label: 'Kết thúc ca', color: 'cyan' },
    maintenance: { label: 'Bảo trì', color: 'geekblue' },
    other: { label: 'Lý do khác', color: 'default' },
    manual_stop: { label: 'Dừng thủ công', color: 'purple' },
    end: { label: 'Hoàn tất', color: 'green' },
};

export const STAGE_NAME_META: Record<StageNameKey, { label: string; color: string }> = {
    'Ép': { label: 'Ép', color: 'cyan' },
    'Nung': { label: 'Nung', color: 'orange' },
    'Mài': { label: 'Mài', color: 'cyan' },
    'Nung men': { label: 'Nung men', color: 'geekblue' },
    'Nung xương': { label: 'Nung xương', color: 'default' },
    'Đóng hộp': { label: 'Đóng hộp', color: 'green' },
};

export interface DetailedProductionRecord {
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

export interface ProductionStageHistoryResponse {
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

export interface ProductionRecord {
    key: string;
    date: string;
    lineName: string;
    productType: string;
    originalOutput: number;
    a1: number;
    a2: number;
    cut: number;
    waste1: number;
    waste2: number;
    scrap: number;
    waste_moc: number;
    waste_lo: number;
    waste_truoc_mai: number;
    waste_thanh_pham: number;
}

export const getActualOutput = (record: ProductionRecord) => {
    const categorizedActual = record.a1 + record.a2 + record.cut;
    return categorizedActual > 0 ? categorizedActual : record.originalOutput;
};

export interface LineOption {
    id: string;
    label: string;
}

export type RangePreset = '30d' | '12m';

export interface DatePreset {
    key: RangePreset;
    label: string;
}

export interface KpiCardPayload {
    key: string;
    label: string;
    value: number;
    unit?: string;
}

export interface RunsAnalyticsResponse {
    filters?: {
        productionLine?: {
            selected?: string;
            options?: LineOption[];
        };
        dateRange?: {
            presets?: DatePreset[];
            selectedPreset?: RangePreset;
            from?: string;
            to?: string;
        };
    };
    kpiCards?: KpiCardPayload[];
    records?: ProductionRecord[];
}

export const DEFAULT_LINE_OPTIONS: LineOption[] = [
    { id: 'all', label: 'Tất cả dây chuyền' },
];

export const DEFAULT_DATE_PRESETS: DatePreset[] = [
    { key: '30d', label: '30 ngày gần nhất' },
    { key: '12m', label: '12 tháng gần nhất' },
];

export const PRESET_LABEL_OVERRIDES: Record<RangePreset, string> = {
    '30d': '30 ngày gần nhất',
    '12m': '12 tháng gần nhất',
};

const MOCK_LINE_LABELS = ['Dây chuyền A', 'Dây chuyền B', 'Dây chuyền C'];
const MOCK_PRODUCT_TYPES = ['Gạch lát 60x60', 'Gạch ốp tường', 'Gạch granite', 'Gạch chống trượt'];
const MOCK_OPERATORS = ['Nguyễn Văn Minh', 'Trần Thị Hoa', 'Phạm Đức Anh', 'Lê Mỹ Duyên'];
const MOCK_NOTES = [
    'Ưu tiên chạy đơn hàng dự án',
    'Đã kiểm tra lại cảm biến nhiệt',
    'Theo dõi sát chất lượng men phủ',
    'Điều chỉnh tốc độ băng chuyền 5%',
];
const MOCK_STAGE_KEYS = Object.keys(STAGE_NAME_META) as StageNameKey[];

const createMockProductionRecords = (): ProductionRecord[] => {
    const today = dayjs();
    const records: ProductionRecord[] = [];

    MOCK_LINE_LABELS.forEach((lineName, lineIndex) => {
        for (let dayOffset = 0; dayOffset < 90; dayOffset += 1) {
            const date = today.subtract(dayOffset, 'day');
            const baseOutput = 15000 + lineIndex * 1200;
            const seasonalWave = Math.sin((dayOffset / 9) * Math.PI) * 1800;
            const weekdayAdjustment = (3 - (dayOffset % 7)) * 180;
            const targetOutput = Math.max(baseOutput + seasonalWave + weekdayAdjustment, 11000);

            const pressLoss = Math.round(targetOutput * (0.009 + lineIndex * 0.001) + (dayOffset % 5) * 25);
            const kilnLoss = Math.round(targetOutput * (0.013 + lineIndex * 0.0012) + (dayOffset % 4) * 35);
            const finishingLoss = Math.round(targetOutput * (0.01 + lineIndex * 0.0008) + (dayOffset % 3) * 30);
            const scrap = Math.round(targetOutput * (0.008 + (dayOffset % 4) * 0.0015) + lineIndex * 55);

            const usable = Math.max(targetOutput - (pressLoss + kilnLoss + finishingLoss + scrap), baseOutput * 0.7);
            const a1 = Math.round(usable * (0.64 + lineIndex * 0.015));
            const a2 = Math.round(usable * 0.23);
            const cut = Math.max(usable - (a1 + a2), 0);

            records.push({
                key: `${lineName.replace(/\s+/g, '-').toLowerCase()}-${date.format('YYYY-MM-DD')}`,
                date: date.format('YYYY-MM-DD'),
                lineName,
                productType: MOCK_PRODUCT_TYPES[(lineIndex + dayOffset) % MOCK_PRODUCT_TYPES.length],
                originalOutput: Math.round(targetOutput),
                a1,
                a2,
                cut,
                waste1: pressLoss,
                waste2: kilnLoss,
                scrap,
                waste_moc: Number(((pressLoss / targetOutput) * 100).toFixed(2)),
                waste_lo: Number(((kilnLoss / targetOutput) * 100).toFixed(2)),
                waste_truoc_mai: Number(((finishingLoss / targetOutput) * 100).toFixed(2)),
                waste_thanh_pham: Number(((scrap / targetOutput) * 100).toFixed(2)),
            });
        }
    });

    return records;
};

export const MOCK_ANALYTICS_RECORDS = createMockProductionRecords();

const createMockKpiCards = (records: ProductionRecord[]): KpiCardPayload[] => {
    if (!records.length) {
        return [];
    }
    const totalActual = records.reduce((sum, record) => sum + getActualOutput(record), 0);
    const totalTarget = records.reduce((sum, record) => {
        const baseTarget = record.originalOutput || getActualOutput(record);
        return sum + Math.round(baseTarget * 0.95);
    }, 0);
    const uniqueDays = new Set(records.map(record => record.date)).size || 1;
    const scrapTotal = records.reduce((sum, record) => sum + record.waste1 + record.waste2 + record.scrap, 0);
    const achievement = totalTarget ? (totalActual / totalTarget) * 100 : 100;

    return [
        { key: 'total-output', label: 'Sản lượng thực tế', value: totalActual, unit: 'm²' },
        { key: 'avg-daily', label: 'Trung bình/ngày', value: Math.round(totalActual / uniqueDays), unit: 'm²' },
        { key: 'target-achievement', label: 'Tỉ lệ đạt mục tiêu', value: Number(achievement.toFixed(2)), unit: '%' },
        { key: 'scrap', label: 'Khuyết tật & phế phẩm', value: scrapTotal, unit: 'm²' },
    ];
};

export const MOCK_KPI_CARDS = createMockKpiCards(MOCK_ANALYTICS_RECORDS);

const createMockDetailTableRecords = (): DetailedProductionRecord[] => {
    const now = dayjs();
    const stopReasonCycle: (StopReasonKey | undefined)[] = [undefined, 'maintenance', undefined, 'shift_end', 'machine_error'];

    return Array.from({ length: 24 }).map((_, index) => {
        const lineName = MOCK_LINE_LABELS[index % MOCK_LINE_LABELS.length];
        const stageKey = MOCK_STAGE_KEYS[index % MOCK_STAGE_KEYS.length];
        const productName = MOCK_PRODUCT_TYPES[(index + 1) % MOCK_PRODUCT_TYPES.length];
        const start = now.subtract(index * 2, 'hour');
        const end = start.add(90, 'minute');
        const lineDemand = 17000 + (index % MOCK_LINE_LABELS.length) * 1400;
        const shiftVariation = (index % 6) * 420;
        const quantity = lineDemand + shiftVariation;
        const areaPerUnit = stageKey === 'Đóng hộp' ? 0.32 : 0.36;
        const area = Number((quantity * areaPerUnit).toFixed(2));
        const stopReason = stopReasonCycle[index % stopReasonCycle.length];

        return {
            key: `mock-detail-${index}`,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            productionLineName: lineName,
            stageName: STAGE_NAME_META[stageKey].label,
            productName,
            quantity,
            area,
            createdBy: MOCK_OPERATORS[index % MOCK_OPERATORS.length],
            stopReason,
            isEmergency: index % 7 === 0,
            notes: MOCK_NOTES[index % MOCK_NOTES.length],
        };
    });
};

export const MOCK_DETAIL_TABLE_DATA = createMockDetailTableRecords();

const DEFAULT_ALL_OPTION = DEFAULT_LINE_OPTIONS[0];
export const MOCK_LINE_OPTIONS: LineOption[] = [
    ...(DEFAULT_ALL_OPTION ? [{ ...DEFAULT_ALL_OPTION }] : []),
    ...MOCK_LINE_LABELS.map((label, index) => ({
        id: `mock-line-${index + 1}`,
        label,
    })),
];

export const getMockDetailRows = (
    selectedLineLabel: string | null,
    stageFilter: 'all' | StageNameKey,
    range: [Dayjs, Dayjs] | null
): DetailedProductionRecord[] => {
    const stageLabel = stageFilter === 'all' ? null : STAGE_NAME_META[stageFilter]?.label ?? null;
    const startValue = range?.[0] ? range[0].startOf('day').valueOf() : null;
    const endValue = range?.[1] ? range[1].endOf('day').valueOf() : null;

    return MOCK_DETAIL_TABLE_DATA.filter(record => {
        if (selectedLineLabel && record.productionLineName !== selectedLineLabel) {
            return false;
        }
        if (stageLabel && record.stageName !== stageLabel) {
            return false;
        }

        if (record.startTime && (startValue || endValue)) {
            const recordTime = dayjs(record.startTime).valueOf();
            if (startValue && recordTime < startValue) {
                return false;
            }
            if (endValue && recordTime > endValue) {
                return false;
            }
        }

        return true;
    });
};

export const createRunsAnalyticsResponse = (): RunsAnalyticsResponse => {
    const today = dayjs();
    const from = today.subtract(29, 'day');
    return {
        filters: {
            productionLine: {
                selected: 'all',
                options: MOCK_LINE_OPTIONS,
            },
            dateRange: {
                presets: DEFAULT_DATE_PRESETS,
                selectedPreset: '30d',
                from: from.toISOString(),
                to: today.toISOString(),
            },
        },
        kpiCards: MOCK_KPI_CARDS,
        records: MOCK_ANALYTICS_RECORDS,
    };
};
