import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LocationBasedSearchParams, LocationBasedSearchResult } from "@/types";

export function useLocationBasedSearch() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchByLocation = async (params: LocationBasedSearchParams): Promise<LocationBasedSearchResult | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: searchError } = await supabase.functions.invoke('location-based-search', {
        body: params
      });

      if (searchError) {
        throw searchError;
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro na busca por localização');
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar por localização';
      setError(errorMessage);
      console.error('Erro na busca por localização:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    searchByLocation,
    isLoading,
    error,
  };
}