type CacheEntry<T> = {
    expires: number;
    value?: T;
    promise?: Promise<T>;
};

const DEFAULT_TTL = 60_000;
const store = new Map<string, CacheEntry<unknown>>();

export function withCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { ttl?: number; force?: boolean }
): Promise<T> {
    const ttl = options?.ttl ?? DEFAULT_TTL;
    const existing = store.get(key) as CacheEntry<T> | undefined;
    const now = Date.now();

    if (!options?.force && existing) {
        if (existing.value && existing.expires > now) {
            return Promise.resolve(existing.value);
        }
        if (existing.promise) {
            return existing.promise;
        }
    }

    const promise = fetcher()
        .then((result) => {
            store.set(key, { value: result, expires: Date.now() + ttl });
            return result;
        })
        .catch((error) => {
            store.delete(key);
            throw error;
        });

    store.set(key, { promise, expires: now + ttl });
    return promise;
}

export function invalidateCache(prefix?: string) {
    if (!prefix) {
        store.clear();
        return;
    }

    for (const key of store.keys()) {
        if (key.startsWith(prefix)) {
            store.delete(key);
        }
    }
}
