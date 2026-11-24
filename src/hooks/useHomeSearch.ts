import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SearchResult, ProductSearchResult } from "@/types";

export function useHomeSearch() {
  const [searchResults, setSearchResults] = useState<SearchResult>({ establishments: [], products: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSearchTerm, setLastSearchTerm] = useState("");

  const search = async (query: string, location?: string, category?: string) => {
    if (!query.trim()) {
      setSearchResults({ establishments: [], products: [] });
      setLastSearchTerm("");
      return;
    }

    try {
      setIsSearching(true);
      setError(null);
      setLastSearchTerm(query.trim());

      console.log('🔍 Home search initiated:', { query: query.trim(), location, category });

      // Parse location for city and state filters
      let cityFilter = null;
      let stateFilter = null;
      
      if (location?.trim()) {
        const locationParts = location.trim().split(',');
        if (locationParts.length >= 2) {
          cityFilter = locationParts[0].trim();
          stateFilter = locationParts[1].trim();
        }
      }

      // Execute as buscas em paralelo para melhor performance
      const [estResult, prodResult] = await Promise.allSettled([
        supabase.rpc('search_establishments_advanced', {
          search_query: query.trim(),
          business_type_filter: category || null,
          city_filter: cityFilter,
          state_filter: stateFilter,
          result_limit: 20  // Aumentado para mostrar mais estabelecimentos
        }),
        supabase.rpc('search_products_advanced', {
          search_query: query.trim(),
          category_filter: category || null,
          result_limit: 50  // Aumentado para mostrar todos os produtos
        })
      ]);

      const results: SearchResult = {
        establishments: estResult.status === 'fulfilled' ? (estResult.value.data || []) : [],
        products: (prodResult.status === 'fulfilled' ? (prodResult.value.data || []) : []) as ProductSearchResult[]
      };

      setSearchResults(results);
      
      console.log('✅ Home search completed:', {
        establishments: results.establishments.length,
        products: results.products.length,
        query: query.trim(),
        location: { cityFilter, stateFilter }
      });
      // Log errors if any
      if (estResult.status === 'rejected') {
        console.error('Error searching establishments:', estResult.reason);
      }
      if (prodResult.status === 'rejected') {
        console.error('Error searching products:', prodResult.reason);
      }

    } catch (err) {
      console.error('Error in search:', err);
      setError(err instanceof Error ? err.message : 'Erro na busca');
      setSearchResults({ establishments: [], products: [] });
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchResults({ establishments: [], products: [] });
    setError(null);
    setLastSearchTerm("");
  };

  return {
    searchResults,
    isSearching,
    error,
    search,
    clearSearch,
    lastSearchTerm
  };
}
