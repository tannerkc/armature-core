import { type RouteInfo } from '../../types';

interface CacheItem<T> {
  value: T;
  expiry: number;
}

class CacheManager {
  private routeCache: Map<string, CacheItem<RouteInfo | null>> = new Map();
  private buildCache: Map<string, CacheItem<any>> = new Map();
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly DEFAULT_TTL = 5 * 60 * 1000;

  constructor(private routeTTL = 5 * 60 * 1000, private buildTTL = 30 * 60 * 1000) {}

  getRouteInfo(urlPath: string): RouteInfo | null | undefined {
    const item = this.routeCache.get(urlPath);
    if (item && item.expiry > Date.now()) {
      return item.value;
    }
    if (item) {
      this.routeCache.delete(urlPath);
    }
    return undefined;
  }

  setRouteInfo(urlPath: string, routeInfo: RouteInfo | null): void {
    this.ensureCacheSize(this.routeCache);
    this.routeCache.set(urlPath, {
      value: routeInfo,
      expiry: Date.now() + this.routeTTL
    });
  }

  getBuildInfo(filePath: string): any | undefined {
    const item = this.buildCache.get(filePath);
    if (item && item.expiry > Date.now()) {
      return item.value;
    }
    if (item) {
      this.buildCache.delete(filePath);
    }
    return undefined;
  }

  setBuildInfo(filePath: string, buildInfo: any): void {
    this.ensureCacheSize(this.buildCache);
    this.buildCache.set(filePath, {
      value: buildInfo,
      expiry: Date.now() + this.buildTTL
    });
  }

  private ensureCacheSize(cache: Map<string, any>): void {
    if (cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }
  }

  clearExpiredItems(): void {
    const now = Date.now();
    for (const [key, item] of this.routeCache.entries()) {
      if (item.expiry <= now) {
        this.routeCache.delete(key);
      }
    }
    for (const [key, item] of this.buildCache.entries()) {
      if (item.expiry <= now) {
        this.buildCache.delete(key);
      }
    }
  }

  clearAll(): void {
    this.routeCache.clear();
    this.buildCache.clear();
  }

  getStats(): { routeCacheSize: number; buildCacheSize: number } {
    return {
      routeCacheSize: this.routeCache.size,
      buildCacheSize: this.buildCache.size
    };
  }
}

export const cacheManager = new CacheManager();
