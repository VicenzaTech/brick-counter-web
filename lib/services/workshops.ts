import { apiFetch } from '@/lib/http/http';
import { withCache, invalidateCache } from './cache';

const WORKSHOPS_ENDPOINT =
    process.env.NEXT_PUBLIC_WORKSHOPS_API ?? 'http://localhost:5555/api/workshops';
const WORKSHOPS_CACHE_KEY = 'workshops';

export interface WorkshopLineSummary {
    id: number;
    name: string;
}

export interface WorkshopSummary {
    id: number;
    name: string;
    lines?: WorkshopLineSummary[];
}

export async function fetchWorkshops(options?: { force?: boolean }): Promise<WorkshopSummary[]> {
    return withCache(
        WORKSHOPS_CACHE_KEY,
        async () => {
            const response = await apiFetch(WORKSHOPS_ENDPOINT);
            if (!response.ok) {
                throw new Error('Failed to fetch workshops');
            }
            const payload: Array<{
                id: number;
                name: string;
                lines?: Array<{ id: number; name: string }>;
            }> = await response.json();
            return payload.map((item) => ({
                id: item.id,
                name: item.name,
                lines: item.lines?.map((line) => ({
                    id: line.id,
                    name: line.name,
                })) ?? [],
            }));
        },
        { ttl: 5 * 60_000, force: options?.force }
    );
}

export function invalidateWorkshopsCache() {
    invalidateCache(WORKSHOPS_CACHE_KEY);
}
