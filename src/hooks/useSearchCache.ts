import { useRef, useState, useCallback } from 'react';
import { ProductSearchResult, ProductSearchFilters } from '@/types';

interface CachedSearch {
  data: ProductSearchResult[];
  timestamp: number;
}

interface CacheStats {
  hits: number;
  misses: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_ENTRIES = 50;

export function useSearchCache() {
  const cacheRef = useRef<Map<string, CachedSearch>>(new Map());
  const [cacheStats, setCacheStats] = useState<CacheStats>({ hits: 0, misses: 0 });

  const generateCacheKey = useCallback((filters: ProductSearchFilters): string => {
    // Create a deterministic cache key from filters
    const sortedFilters = Object.keys(filters)
      .sort()
      .reduce((result, key) => {
        const value = filters[key as keyof ProductSearchFilters];
        if (value !== undefined && value !== null && value !== '') {
          result[key] = value;
        }
        return result;
      }, {} as Partial<ProductSearchFilters>);
    
    return JSON.stringify(sortedFilters);
  }, []);

  const get = useCallback((filters: ProductSearchFilters): ProductSearchResult[] | null => {
    const key = generateCacheKey(filters);
    const cached = cacheRef.current.get(key);
    
    if (!cached) {
      setCacheStats(prev => ({ ...prev, misses: prev.misses + 1 }));
      return null;
    }
    
    // Check if cache is still valid
    if (Date.now() - cached.timestamp > CACHE_DURATION) {
      cacheRef.current.delete(key);
      setCacheStats(prev => ({ ...prev, misses: prev.misses + 1 }));
      return null;
    }
    
    setCacheStats(prev => ({ ...prev, hits: prev.hits + 1 }));
    return cached.data;
  }, [generateCacheKey]);

  const set = useCallback((filters: ProductSearchFilters, data: ProductSearchResult[]): void => {
    const key = generateCacheKey(filters);
    
    // Remove oldest entries if cache is full
    if (cacheRef.current.size >= MAX_CACHE_ENTRIES) {
      const firstKey = cacheRef.current.keys().next().value;
      cacheRef.current.delete(firstKey);
    }
    
    cacheRef.current.set(key, {
      data,
      timestamp: Date.now()
    });
  }, [generateCacheKey]);

  const clear = useCallback((): void => {
    cacheRef.current.clear();
    setCacheStats({ hits: 0, misses: 0 });
  }, []);

  const invalidate = useCallback((filters?: Partial<ProductSearchFilters>): void => {
    if (!filters) {
      clear();
      return;
    }
    
    // Remove cache entries that match the partial filters
    const keysToDelete: string[] = [];
    
    cacheRef.current.forEach((cached, key) => {
      try {
        const cachedFilters = JSON.parse(key);
        const shouldInvalidate = Object.keys(filters).some(filterKey => {
          return cachedFilters[filterKey] === filters[filterKey as keyof ProductSearchFilters];
        });
        
        if (shouldInvalidate) {
          keysToDelete.push(key);
        }
      } catch (error) {
        // Invalid key format, remove it
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => cacheRef.current.delete(key));
  }, [clear]);

  return {
    get,
    set,
    clear,
    invalidate,
    cacheStats
  };
}
