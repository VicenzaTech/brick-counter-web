import { apiFetch } from '@/lib/http/http';
import { withCache, invalidateCache } from './cache';

const WORKSHOP_TARGET_ENDPOINT =
    process.env.NEXT_PUBLIC_WORKSHOP_TARGET_API ?? 'http://localhost:5555/api/workshop-target';
const WORKSHOP_TARGET_CACHE_PREFIX = 'workshop-target';

export interface WorkshopTargetPayload {
    id?: number | string;
    name: string;
    workshopId: number;
    year: number;
    yearlyTarget: number;
    description?: string;
}

export interface WorkshopSummaryOption {
    id: number;
    name: string;
}

export interface WorkshopTargetItem extends WorkshopTargetPayload {
    workshopName?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface WorkshopTargetChartPoint {
    year: number;
    target: number;
}

export interface WorkshopTargetChart {
    workshopId: number;
    workshopName: string;
    points: WorkshopTargetChartPoint[];
    totalTarget: number;
}

export interface WorkshopTargetFiltersMeta {
    selectedYear?: number;
    selectedWorkshopId?: number;
    years?: number[];
    workshops?: WorkshopSummaryOption[];
    includeHistory?: boolean;
}

export interface WorkshopTargetListResponse {
    filters?: WorkshopTargetFiltersMeta;
    items?: WorkshopTargetItem[];
    chart?: WorkshopTargetChart[];
}

export interface WorkshopTargetQuery {
    workshopId?: number;
    year?: number;
    includeHistory?: boolean;
}

const buildTargetCacheKey = (query?: WorkshopTargetQuery) => {
    if (!query) {
        return `${WORKSHOP_TARGET_CACHE_PREFIX}:default`;
    }
    const params = new URLSearchParams();
    if (query.workshopId) {
        params.set('workshopId', String(query.workshopId));
    }
    if (query.year) {
        params.set('year', String(query.year));
    }
    if (query.includeHistory) {
        params.set('includeHistory', 'true');
    }
    const suffix = params.toString() || 'default';
    return `${WORKSHOP_TARGET_CACHE_PREFIX}:${suffix}`;
};

export async function fetchWorkshopTargets(
    query?: WorkshopTargetQuery,
    options?: { force?: boolean }
): Promise<WorkshopTargetListResponse> {
    const cacheKey = buildTargetCacheKey(query);

    return withCache(
        cacheKey,
        async () => {
            try {
                const params = new URLSearchParams();
                if (query?.workshopId) {
                    params.set('workshopId', String(query.workshopId));
                }
                if (query?.year) {
                    params.set('year', String(query.year));
                }
                // if (query?.includeHistory) {
                //     params.set('includeHistory', 'false');
                // }
                const queryString = params.toString();
                const response = await apiFetch(
                    `${WORKSHOP_TARGET_ENDPOINT}${queryString ? `?${queryString}` : ''}`
                );
                if (!response.ok) {
                    throw new Error('Failed to fetch workshop targets');
                }
                const payload: WorkshopTargetListResponse = await response.json();
                return payload;
            } catch (error) {
                console.error('Unable to load workshop targets', error);
                return {};
            }
        },
        { ttl: 60_000, force: options?.force }
    );
}

export async function createWorkshopTarget(payload: WorkshopTargetPayload) {
    const response = await apiFetch(WORKSHOP_TARGET_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const error = await response.json()
        throw new Error(error?.message || 'Tạo mục tiêu không thành công');
    }
    invalidateWorkshopTargetCache();
    return response.json();
}

export async function updateWorkshopTarget(id: number | string, payload: Partial<WorkshopTargetPayload>) {
    const response = await apiFetch(`${WORKSHOP_TARGET_ENDPOINT}/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const error = await response.json()
        console.log(error)
        throw new Error(error?.message || 'Cập nhật mục tiêu không thành công');
    }
    invalidateWorkshopTargetCache();
    return response.json();
}

export function invalidateWorkshopTargetCache() {
    invalidateCache(WORKSHOP_TARGET_CACHE_PREFIX);
}
