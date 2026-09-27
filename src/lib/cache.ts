interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

class ServerCache {
  private store: Map<string, CacheEntry<any>> = new Map();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    const now = Date.now();
    if (now - entry.timestamp > entry.ttlMs) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs = 60000): void {
    this.store.set(key, {
      data,
      timestamp: Date.now(),
      ttlMs,
    });
  }

  invalidate(keyPattern?: string): void {
    if (!keyPattern) {
      this.store.clear();
      return;
    }
    for (const key of Array.from(this.store.keys())) {
      if (key.includes(keyPattern)) {
        this.store.delete(key);
      }
    }
  }

  invalidateAccounting(): void {
    this.invalidate('dashboard');
    this.invalidate('ledger');
    this.invalidate('journals');
    this.invalidate('balances');
  }
}

// Global cache instance across API routes
const globalCache = (global as any).__accountingCache || new ServerCache();
if (process.env.NODE_ENV !== 'production') {
  (global as any).__accountingCache = globalCache;
}

export default globalCache as ServerCache;
