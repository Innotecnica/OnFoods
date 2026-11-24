
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { EstablishmentSearchFilters, EstablishmentSearchResult } from "@/types";

// Re-export types for compatibility
export type { EstablishmentSearchFilters, EstablishmentSearchResult };

export function useEstablishmentSearch() {
  const [establishments, setEstablishments] = useState<EstablishmentSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchEstablishments = useCallback(async (filters: EstablishmentSearchFilters = {}) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 Searching establishments with filters:', filters);

      const { data, error } = await supabase.functions.invoke('establishment-search', {
        body: {
          searchQuery: filters.searchQuery || '',
          businessType: filters.businessType,
          city: filters.city,
          state: filters.state,
          minRating: filters.minRating || 0,
          minDeliveryFee: filters.minDeliveryFee || 0,
          maxDeliveryFee: filters.maxDeliveryFee || 999999,
          maxDeliveryTime: filters.maxDeliveryTime || 999,
          onlyActive: filters.onlyActive !== false,
          onlyOpen: filters.onlyOpen || false,
          limit: filters.limit || 20
        }
      });

      if (error) {
        console.error('❌ Establishment search error:', error);
        throw error;
      }

      console.log('✅ Establishment search response:', data);

      if (data?.establishments) {
        setEstablishments(data.establishments);
      } else {
        console.warn('⚠️ Unexpected response format:', data);
        setEstablishments([]);
      }

    } catch (err) {
      console.error('❌ Error searching establishments:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar estabelecimentos';
      setError(errorMessage);
      setEstablishments([]);
      
      toast({
        title: "Erro na busca",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    establishments,
    isLoading,
    error,
    searchEstablishments
  };
}
