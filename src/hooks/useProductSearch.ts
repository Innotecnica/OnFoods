
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useSearchCache } from "./useSearchCache";
import { ProductSearchResult, ProductSearchFilters, SearchMetrics } from "@/types";

// Re-export types for compatibility
export type { ProductSearchResult, ProductSearchFilters };

export function useProductSearch() {
  const [products, setProducts] = useState<ProductSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<SearchMetrics[]>([]);
  
  const cache = useSearchCache();
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const searchProducts = useCallback(async (filters: ProductSearchFilters = {}) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const requestId = ++requestIdRef.current;
    const startTime = performance.now();
    
    try {
      setIsLoading(true);
      setError(null);

      // Check cache first
      const cachedResults = cache.get(filters);
      if (cachedResults) {
        console.log('🚀 Cache hit for search filters:', filters);
        setProducts(cachedResults);
        setMetrics(prev => [...prev.slice(-9), {
          queryTime: performance.now() - startTime,
          cacheHit: true,
          resultCount: cachedResults.length,
          filters
        }]);
        return;
      }

      console.log('🔍 Cache miss, searching products with filters:', filters);

      abortControllerRef.current = new AbortController();
      
      const { data, error } = await supabase.functions.invoke('product-search', {
        body: {
          ...filters,
          sort_by: filters.sort_by || 'relevance',
          limit: filters.limit || 50
        }
      }).catch(err => {
        console.warn('⚠️ Product search function failed:', err);
        return { data: null, error: err };
      });

      // Check if request is still current
      if (requestId !== requestIdRef.current) {
        console.log('🔄 Request superseded, ignoring response');
        return;
      }

      if (error) {
        console.error('❌ Product search error:', error);
        throw error;
      }

      console.log('✅ Product search response:', data);

      if (data?.success && data?.products) {
        const products = data.products;
        setProducts(products);
        
        // Cache successful results
        cache.set(filters, products);
        
        setMetrics(prev => [...prev.slice(-9), {
          queryTime: performance.now() - startTime,
          cacheHit: false,
          resultCount: products.length,
          filters
        }]);
      } else {
        console.warn('⚠️ Unexpected response format:', data);
        setProducts([]);
      }

    } catch (err) {
      // Ignore abort errors
      if ((err as { name?: string }).name === 'AbortError' || requestId !== requestIdRef.current) {
        return;
      }
      
      console.error('❌ Error searching products:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar produtos';
      setError(errorMessage);
      setProducts([]);
      
      toast({
        title: "Erro na busca",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [cache]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    products,
    isLoading,
    error,
    searchProducts,
    metrics,
    cacheStats: cache.cacheStats,
    clearCache: cache.clear
  };
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadFavorites = async () => {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('product_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (error) throw error;

      setFavorites(data?.map(f => f.product_id) || []);
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const toggleFavorite = async (productId: string) => {
    try {
      setIsLoading(true);
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const isFavorited = favorites.includes(productId);

      if (isFavorited) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId);

        if (error) throw error;

        setFavorites(prev => prev.filter(id => id !== productId));
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            product_id: productId
          });

        if (error) throw error;

        setFavorites(prev => [...prev, productId]);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const isFavorite = (productId: string) => favorites.includes(productId);

  useEffect(() => {
    loadFavorites();
  }, []);

  return {
    favorites,
    toggleFavorite,
    isFavorite,
    isLoading
  };
}
