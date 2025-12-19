'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
    DEFAULT_LINE_OPTIONS,
    MOCK_ANALYTICS_RECORDS,
    MOCK_KPI_CARDS,
    MOCK_LINE_OPTIONS,
} from '@/lib/mock/dashboard-data';
import {
    ProductionAnalyticsParams,
    ProductionAnalyticsResult,
    fetchProductionAnalytics,
} from '@/lib/services/production-analytics';

type UseProductionAnalyticsOptions = {
    enabled?: boolean;
};

const DEFAULT_RESULT: ProductionAnalyticsResult = {
    records: MOCK_ANALYTICS_RECORDS,
    kpiCards: MOCK_KPI_CARDS,
    lineOptions: MOCK_LINE_OPTIONS.length ? MOCK_LINE_OPTIONS : DEFAULT_LINE_OPTIONS,
    filters: undefined,
    raw: null,
    usedMock: true,
    source: 'mock-config',
    error: undefined,
};

export function useProductionAnalyticsData(
    params: ProductionAnalyticsParams,
    options?: UseProductionAnalyticsOptions
) {
    const [result, setResult] = useState<ProductionAnalyticsResult>(DEFAULT_RESULT);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasHydrated, setHasHydrated] = useState(false);
    const paramsRef = useRef(params);
    const requestIdRef = useRef(0);

    const paramsKey = useMemo(
        () =>
            JSON.stringify({
                productionLine: params.productionLine ?? 'all',
                from: params.from ?? '',
                to: params.to ?? '',
                range: params.range ?? '',
                useMock: params.useMock ?? undefined,
            }),
        [params.productionLine, params.from, params.to, params.range, params.useMock]
    );

    useEffect(() => {
        paramsRef.current = params;
    }, [paramsKey, params]);

    const executeFetch = useCallback(
        async (opts?: { force?: boolean }) => {
            const requestId = ++requestIdRef.current;
            setLoading(true);
            setError(null);
            try {
                const snapshot = paramsRef.current;
                const response = await fetchProductionAnalytics(snapshot, {
                    force: opts?.force,
                });
                if (requestId !== requestIdRef.current) {
                    return;
                }
                setResult(response);
                setError(response.error ?? null);
                setHasHydrated(true);
                return response;
            } catch (err) {
                if (requestId !== requestIdRef.current) {
                    return;
                }
                setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu phân tích');
            } finally {
                if (requestId === requestIdRef.current) {
                    setLoading(false);
                }
            }
            return undefined;
        },
        []
    );

    useEffect(() => {
        if (options?.enabled === false) {
            return;
        }
        executeFetch();
    }, [executeFetch, options?.enabled, paramsKey]);

    const refresh = useCallback(() => executeFetch({ force: true }), [executeFetch]);

    return {
        records: result.records,
        kpiCards: result.kpiCards,
        lineOptions: result.lineOptions,
        filters: result.filters,
        raw: result.raw,
        source: result.source,
        usedMock: result.usedMock,
        loading,
        error,
        hasHydrated,
        refresh,
    };
}
