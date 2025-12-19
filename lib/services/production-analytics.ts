import { apiFetch } from '@/lib/http/http';
import {
    DEFAULT_LINE_OPTIONS,
    KpiCardPayload,
    LineOption,
    MOCK_ANALYTICS_RECORDS,
    MOCK_KPI_CARDS,
    MOCK_LINE_OPTIONS,
    ProductionRecord,
    RunsAnalyticsResponse,
} from '@/lib/mock/dashboard-data';
import { withCache, invalidateCache } from './cache';

const ANALYTICS_ENDPOINT = '/runs-analytics';
const ANALYTICS_CACHE_PREFIX = 'production-analytics';

export type ProductionAnalyticsParams = {
    productionLine?: string;
    from?: string;
    to?: string;
    range?: string;
    useMock?: boolean;
};

export type ProductionAnalyticsSource = 'api' | 'mock-config' | 'mock-fallback';

export interface ProductionAnalyticsResult {
    records: ProductionRecord[];
    kpiCards: KpiCardPayload[];
    lineOptions: LineOption[];
    filters?: RunsAnalyticsResponse['filters'];
    raw: RunsAnalyticsResponse | null;
    usedMock: boolean;
    source: ProductionAnalyticsSource;
    error?: string;
}

const buildCacheKey = (params: ProductionAnalyticsParams) => {
    const normalized = {
        productionLine: params.productionLine ?? 'all',
        from: params.from ?? '',
        to: params.to ?? '',
        range: params.range ?? '',
        useMock: params.useMock ?? false,
    };
    return `${ANALYTICS_CACHE_PREFIX}:${JSON.stringify(normalized)}`;
};

const buildResult = (
    payload: RunsAnalyticsResponse | null,
    options: { source: ProductionAnalyticsSource; error?: string }
): ProductionAnalyticsResult => {
    const records = payload?.records?.length ? payload.records : MOCK_ANALYTICS_RECORDS;
    const kpiCards = payload?.kpiCards?.length ? payload.kpiCards : MOCK_KPI_CARDS;
    const lineOptions = payload?.filters?.productionLine?.options?.length
        ? normalizeLineOptions(payload.filters.productionLine.options)
        : MOCK_LINE_OPTIONS;

    const usedMock = !payload?.records?.length || !payload?.kpiCards?.length || options.source !== 'api';

    return {
        records,
        kpiCards,
        lineOptions,
        filters: payload?.filters,
        raw: payload,
        usedMock,
        source: options.source,
        error: options.error,
    };
};

const normalizeLineOptions = (options: LineOption[]): LineOption[] => {
    if (!options.length) {
        return DEFAULT_LINE_OPTIONS;
    }

    const hasAll = options.some(option => option.id === 'all');
    return hasAll
        ? [DEFAULT_LINE_OPTIONS[0], ...options.filter(option => option.id !== 'all')]
        : [...DEFAULT_LINE_OPTIONS, ...options];
};

export async function fetchProductionAnalytics(
    params: ProductionAnalyticsParams,
    options?: { force?: boolean }
): Promise<ProductionAnalyticsResult> {
    const shouldUseMock = params.useMock ?? process.env.NEXT_PUBLIC_USE_MOCK_DASHBOARD !== 'false';
    const cacheKey = buildCacheKey({ ...params, useMock: shouldUseMock });

    return withCache(
        cacheKey,
        async () => {
            if (shouldUseMock) {
                return buildResult(null, { source: 'mock-config' });
            }

            try {
                const query = new URLSearchParams();
                query.set('productionLine', params.productionLine ?? 'all');
                if (params.from && params.to) {
                    query.set('from', params.from);
                    query.set('to', params.to);
                } else if (params.range) {
                    query.set('range', params.range);
                }

                const response = await apiFetch(`${ANALYTICS_ENDPOINT}?${query.toString()}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch analytics');
                }
                const payload: RunsAnalyticsResponse = await response.json();
                return buildResult(payload, { source: 'api' });
            } catch (error) {
                console.warn('Unable to load analytics, using mock data.', error);
                return buildResult(null, {
                    source: 'mock-fallback',
                    error: 'Khong the tai du lieu phan tich, dang hien thi du lieu mau.',
                });
            }
        },
        { ttl: 30_000, force: options?.force }
    );
}

export function invalidateProductionAnalyticsCache() {
    invalidateCache(ANALYTICS_CACHE_PREFIX);
}
