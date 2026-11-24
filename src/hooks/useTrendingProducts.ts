import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { env } from "@/utils/environment";

interface ProductData {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  is_available: boolean;
  establishment_name?: string;
  establishment_id?: string;
  rating?: number;
  total_reviews?: number;
  order_count?: number;
  establishment_city?: string;
  establishment_state?: string;
}

interface LocationFilter {
  city?: string;
  state?: string;
}

export function useTrendingProducts(location?: LocationFilter) {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const fetchTrendingProducts = useCallback(async () => {
    try {
      if (!isMounted.current) return;
      setIsLoading(true);
      setError(null);

      const supabaseUrl = env.getSupabaseUrl();
      const supabaseKey = env.getSupabaseAnonKey();
      if (!supabaseUrl || !supabaseKey) {
        if (!isMounted.current) return;
        setError('Configuração do Supabase ausente');
        setProducts([]);
        setIsLoading(false);
        return;
      }

      console.log('🔍 Fetching trending products...', { location });

      // Primeiro, tentar usar a função RPC para produtos em trending
      const { data: trendingData, error: trendingError } = await supabase
        .rpc('get_trending_products', {
          days_back: 7,
          result_limit: 16,
          city_filter: location?.city || null,
          state_filter: location?.state || null
        });

      if (!trendingError && trendingData && trendingData.length > 0) {
        // Transformar dados do RPC
        interface TrendingProductRPC {
          id: string;
          name: string;
          description?: string;
          price: number;
          image_url?: string;
          is_available: boolean;
          establishment_id: string;
          order_count: number;
          revenue?: number;
          rating?: number;
          total_reviews?: number;
        }
        const transformedData: ProductData[] = trendingData.map((product: TrendingProductRPC) => ({
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          image_url: product.image_url,
          is_available: product.is_available,
          rating: product.rating,
          total_reviews: product.total_reviews,
          establishment_id: product.establishment_id,
          order_count: product.order_count
        }));

        // Buscar nomes dos estabelecimentos
        const establishmentIds = [...new Set(transformedData.map(p => p.establishment_id))];
        const { data: establishments } = await supabase
          .from('establishments')
          .select('id, business_name')
          .in('id', establishmentIds);

        const establishmentMap = new Map(establishments?.map(e => [e.id, e.business_name]) || []);

        const enrichedData = transformedData.map(product => ({
          ...product,
          establishment_name: establishmentMap.get(product.establishment_id) || undefined
        }));

        console.log('✅ Trending products fetched (RPC):', {
          count: enrichedData.length,
          location,
          products: enrichedData.slice(0, 3).map(p => ({
            name: p.name,
            rating: p.rating,
            orders: p.order_count
          }))
        });

        if (!isMounted.current) return;
        setProducts(enrichedData);
        return;
      }

      // Fallback: Buscar produtos populares por rating
      let query = supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          price,
          image_url,
          is_available,
          rating,
          total_reviews,
          establishment:establishments!inner(
            id,
            business_name,
            city,
            state,
            is_active
          )
        `)
        .eq('is_available', true)
        .eq('establishment.is_active', true)
        .gte('rating', 3.5)
        .gte('total_reviews', 2)
        .order('rating', { ascending: false })
        .order('total_reviews', { ascending: false })
        .limit(16);

      // Filtrar por localização se fornecida
      if (location?.city) {
        query = query.ilike('establishment.city', `%${location.city}%`);
      }
      if (location?.state) {
        query = query.ilike('establishment.state', `%${location.state}%`);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        console.error('❌ Error fetching trending products:', queryError);
        throw queryError;
      }

      // Transformar dados para o formato esperado
      const transformedData: ProductData[] = data?.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        image_url: product.image_url,
        is_available: product.is_available,
        rating: product.rating,
        total_reviews: product.total_reviews,
        establishment_name: product.establishment?.business_name,
        establishment_id: product.establishment?.id,
        establishment_city: product.establishment?.city,
        establishment_state: product.establishment?.state,
        order_count: product.total_reviews || 0
      })) || [];

      console.log('✅ Trending products fetched:', {
        count: transformedData?.length || 0,
        location,
        products: transformedData?.slice(0, 3).map(p => ({
          name: p.name,
          rating: p.rating,
          reviews: p.total_reviews
        }))
      });

      if (!isMounted.current) return;
      setProducts(transformedData);

    } catch (err) {
      console.error('❌ Error in useTrendingProducts:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar produtos';
      if (!isMounted.current) return;
      setError(errorMessage);
      setProducts([]);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [location]);

  // Buscar dados iniciais
  useEffect(() => {
    fetchTrendingProducts();
    return () => { isMounted.current = false; };
  }, [fetchTrendingProducts]);

  // Refetch quando a localização muda
  const refetch = useCallback(() => {
    fetchTrendingProducts();
  }, [fetchTrendingProducts]);

  return {
    products,
    isLoading,
    error,
    refetch
  };
}
