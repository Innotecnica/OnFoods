import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { env } from "@/utils/environment";

interface EstablishmentData {
  id: string;
  business_name: string;
  business_type?: string;
  address?: string;
  phone?: string;
  delivery_fee: number;
  delivery_time_min: number;
  delivery_time_max: number;
  rating: number;
  total_reviews: number;
  banner_url?: string;
  logo_url?: string;
  is_active: boolean;
  city?: string;
  state?: string;
}

interface LocationFilter {
  city?: string;
  state?: string;
}

export function useFeaturedEstablishments(location?: LocationFilter) {
  const [establishments, setEstablishments] = useState<EstablishmentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const fetchFeaturedEstablishments = useCallback(async () => {
    try {
      if (!isMounted.current) return;
      setIsLoading(true);
      setError(null);

      const supabaseUrl = env.getSupabaseUrl();
      const supabaseKey = env.getSupabaseAnonKey();
      if (!supabaseUrl || !supabaseKey) {
        if (!isMounted.current) return;
        setError('Configuração do Supabase ausente');
        setEstablishments([]);
        setIsLoading(false);
        return;
      }

      console.log('🔍 Fetching featured establishments...', { location });

      // Buscar estabelecimentos com melhores avaliações
      let query = supabase
        .from('establishments')
        .select(`
          id,
          business_name,
          business_type,
          address,
          phone,
          delivery_fee,
          delivery_time_min,
          delivery_time_max,
          rating,
          total_reviews,
          banner_url,
          logo_url,
          is_active,
          city,
          state
        `)
        .eq('is_active', true)
        .gte('rating', 4.0) // Apenas estabelecimentos com rating >= 4.0
        .gte('total_reviews', 5) // Com pelo menos 5 avaliações
        .order('rating', { ascending: false })
        .order('total_reviews', { ascending: false })
        .limit(12);

      // Filtrar por localização se fornecida
      if (location?.city) {
        query = query.ilike('city', `%${location.city}%`);
      }
      if (location?.state) {
        query = query.ilike('state', `%${location.state}%`);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        console.error('❌ Error fetching featured establishments:', queryError);
        throw queryError;
      }

      console.log('✅ Featured establishments fetched:', {
        count: data?.length || 0,
        location,
        establishments: data?.slice(0, 3).map(e => ({
          name: e.business_name,
          rating: e.rating,
          reviews: e.total_reviews
        }))
      });

      if (!isMounted.current) return;
      setEstablishments(data || []);

    } catch (err) {
      console.error('❌ Error in useFeaturedEstablishments:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar estabelecimentos';
      if (!isMounted.current) return;
      setError(errorMessage);
      setEstablishments([]);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [location]);

  // Buscar dados iniciais
  useEffect(() => {
    fetchFeaturedEstablishments();
    return () => { isMounted.current = false; };
  }, [fetchFeaturedEstablishments]);

  // Refetch quando a localização muda
  const refetch = useCallback(() => {
    fetchFeaturedEstablishments();
  }, [fetchFeaturedEstablishments]);

  return {
    establishments,
    isLoading,
    error,
    refetch
  };
}
