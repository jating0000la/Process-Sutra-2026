import NodeCache from 'node-cache';

// Usage statistics cache with 5-minute TTL
// This dramatically reduces database load for usage endpoints
export const usageCache = new NodeCache({
  stdTTL: 300,           // 5 minutes cache
  checkperiod: 60,       // Check for expired keys every minute
  useClones: false       // Better performance, don't clone objects
});

/**
 * Generate cache key for usage summary
 */
export function getUsageSummaryCacheKey(organizationId: string, dateRange: string): string {
  return `usage:summary:${organizationId}:${dateRange}`;
}

/**
 * Generate cache key for usage trends
 */
export function getUsageTrendsCacheKey(organizationId: string): string {
  return `usage:trends:${organizationId}`;
}

/**
 * Clear all usage cache for an organization
 * Call this when usage data changes (new task, form response, etc.)
 */
export function clearUsageCache(organizationId: string): void {
  const keys = usageCache.keys();
  const orgKeys = keys.filter(key => key.includes(organizationId));
  orgKeys.forEach(key => usageCache.del(key));
}

/**
 * Get cached value or compute it
 */
export async function getCachedOrCompute<T>(
  cacheKey: string,
  computeFn: () => Promise<T>
): Promise<T> {
  // Try to get from cache
  const cached = usageCache.get<T>(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  // Compute and cache
  const result = await computeFn();
  usageCache.set(cacheKey, result);
  return result;
}
