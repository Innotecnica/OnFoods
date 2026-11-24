import { useRef, useCallback, useMemo } from 'react';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class QueryCache {
  private cache = new Map<string, CacheItem<unknown>>();
  private maxSize = 100;

  set<T>(key: string, data: T, ttl: number = 300000): void { // 5 min default
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const keysToDelete = Array.from(this.cache.keys()).filter(key =>
      key.includes(pattern)
    );
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  size(): number {
    return this.cache.size;
  }
}

const queryCache = new QueryCache();

export function useOptimizedQuery() {
  const abortControllerRef = useRef<AbortController | null>(null);

  const executeQuery = useCallback(async <T>(
    key: string,
    queryFn: () => Promise<T>,
    options: {
      cacheTime?: number;
      forceRefresh?: boolean;
      retries?: number;
    } = {}
  ): Promise<T> => {
    const { cacheTime = 300000, forceRefresh = false, retries = 3 } = options;

    // Check cache first
    if (!forceRefresh) {
      const cached = queryCache.get<T>(key);
      if (cached) {
        console.log(`[CACHE HIT] ${key}`);
        return cached;
      }
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        console.log(`[QUERY] ${key} (attempt ${attempt + 1})`);
        
        const result = await queryFn();
        
        // Cache the result
        queryCache.set(key, result, cacheTime);
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (error instanceof Error && error.name === 'AbortError') {
          throw error; // Don't retry aborted requests
        }
        
        if (attempt < retries) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Query failed after retries');
  }, []);

  const invalidateCache = useCallback((pattern?: string) => {
    queryCache.invalidate(pattern);
  }, []);

  const getCacheSize = useCallback(() => {
    return queryCache.size();
  }, []);

  return {
    executeQuery,
    invalidateCache,
    getCacheSize
  };
}
