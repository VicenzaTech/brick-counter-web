import { apiFetch } from '@/lib/http/http';
import { withCache } from './cache';

const PRODUCTION_LINE_RUN_STATS_ENDPOINT = '/production-line-runs/statistics';
const RUN_STATS_CACHE_PREFIX = 'production-line-run-stats';

export interface ProductionLineRunStatsTotals {
    runs: number;
    completedRuns: number;
    inProgressRuns: number;
    draftRuns: number;
    totalPieces: number;
    totalAreaM2: number;
    averageDurationMinutes: number;
}

export interface ProductionLineRunStatsQuality {
    a1Pieces: number;
    a2Pieces: number;
    wastePieces: number;
    wasteRate: number;
    yieldPercent: number;
}

export interface ProductionLineRunStatsStatusBreakdown {
    status: string;
    count: number;
}

export interface ProductionLineRunStatsTopLine {
    productionLineId: number;
    productionLineName: string;
    runCount: number;
    totalPieces: number;
    totalAreaM2: number;
}

export interface ProductionLineRunStatsChart {
    labels: string[];
    data: number[];
}

export interface ProductionLineRunStatsCharts {
    statusDistribution?: ProductionLineRunStatsChart;
    qualityPieces?: ProductionLineRunStatsChart;
    outputByLine?: ProductionLineRunStatsChart;
}

export interface ProductionLineRunStatistics {
    filters?: Record<string, unknown>;
    totals: ProductionLineRunStatsTotals;
    quality: ProductionLineRunStatsQuality;
    statusBreakdown: ProductionLineRunStatsStatusBreakdown[];
    topLines: ProductionLineRunStatsTopLine[];
    charts?: ProductionLineRunStatsCharts;
}

export interface ProductionLineRunStatsParams {
    productionLineId?: number | string;
    workshopId?: number | string;
    brickTypeId?: number | string;
    from?: string;
    to?: string;
}

const buildStatsCacheKey = (params: ProductionLineRunStatsParams) => {
    const normalized = {
        productionLineId: params.productionLineId ?? 'all',
        workshopId: params.workshopId ?? 'all',
        brickTypeId: params.brickTypeId ?? 'all',
        from: params.from ?? '',
        to: params.to ?? '',
    };
    return `${RUN_STATS_CACHE_PREFIX}:${JSON.stringify(normalized)}`;
};

export async function fetchProductionLineRunStatistics(
    params: ProductionLineRunStatsParams,
    options?: { force?: boolean }
): Promise<ProductionLineRunStatistics> {
    const cacheKey = buildStatsCacheKey(params);

    return withCache(
        cacheKey,
        async () => {
            const query = new URLSearchParams();
            if (params.productionLineId != null && params.productionLineId !== '') {
                query.set('productionLineId', String(params.productionLineId));
            }
            if (params.workshopId != null && params.workshopId !== '') {
                query.set('workshopId', String(params.workshopId));
            }
            if (params.brickTypeId != null && params.brickTypeId !== '') {
                query.set('brickTypeId', String(params.brickTypeId));
            }
            if (params.from) {
                query.set('from', params.from);
            }
            if (params.to) {
                query.set('to', params.to);
            }
            const response = await apiFetch(
                `${PRODUCTION_LINE_RUN_STATS_ENDPOINT}${query.toString() ? `?${query.toString()}` : ''}`
            );
            if (!response.ok) {
                throw new Error('Failed to load production line run statistics');
            }
            const payload: ProductionLineRunStatistics = await response.json();
            return payload;
        },
        { ttl: 30_000, force: options?.force }
    );
}
