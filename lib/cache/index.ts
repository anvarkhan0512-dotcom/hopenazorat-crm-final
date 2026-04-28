const cacheStore = new Map<string, { data: any; expires: number }>();

const DEFAULT_TTL = 60 * 1000;

export function getCached<T>(key: string): T | null {
  const entry = cacheStore.get(key);
  if (!entry) return null;
  
  if (Date.now() > entry.expires) {
    cacheStore.delete(key);
    return null;
  }
  
  return entry.data as T;
}

export function setCache<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
  cacheStore.set(key, {
    data,
    expires: Date.now() + ttl,
  });
}

export function invalidateCache(key: string): void {
  cacheStore.delete(key);
}

export function invalidatePattern(pattern: string): void {
  const regex = new RegExp(pattern);
  for (const key of Array.from(cacheStore.keys())) {
    if (regex.test(key)) {
      cacheStore.delete(key);
    }
  }
}

export function clearAllCache(): void {
  cacheStore.clear();
}

export function getCacheSize(): number {
  return cacheStore.size;
}

export function getCacheStats() {
  const stats = {
    size: cacheStore.size,
    entries: [] as string[],
  };
  
  for (const [key, entry] of Array.from(cacheStore.entries())) {
    stats.entries.push(`${key}: ${Math.round((entry.expires - Date.now()) / 1000)}s`);
  }
  
  return stats;
}

export const CacheKeys = {
  DASHBOARD: 'dashboard:stats',
  STUDENTS_LIST: (filters?: string) => `students:list:${filters || 'all'}`,
  GROUPS_LIST: 'groups:list',
  PAYMENTS_LIST: (filters?: string) => `payments:list:${filters || 'all'}`,
  DEBTORS: 'debtors:list',
  REPORTS: (type: string) => `reports:${type}`,
};