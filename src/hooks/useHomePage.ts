import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isEstablishmentComplete } from "@/utils/establishmentValidation";
import { LocationData, HomePageStats, BaseEstablishment, BaseProduct } from "@/types";
import { env } from "@/utils/environment";

interface FeaturedEstablishment {
  id: string;
  business_name: string;
  business_type: string | null;
  banner_url: string | null;
  address: string | null;
  phone: string | null;
  rating: number;
  total_reviews: number;
  delivery_time_min: number;
  delivery_time_max: number;
  delivery_fee: number;
  is_active: boolean;
  payment_gateway?: string;
}

interface PopularProduct {
  id: string;
  name: string;
  description: string;
  image_url: string;
  price: number;
  is_available: boolean;
  preparation_time: number;
  created_at: string;
  rating?: number;
  total_reviews?: number;
  category_name?: string;
  establishment: {
    id: string;
    business_name: string;
  };
}


export function useHomePage(location?: LocationData | null) {
  const [featuredEstablishments, setFeaturedEstablishments] = useState<FeaturedEstablishment[]>([]);
  const [popularProducts, setPopularProducts] = useState<PopularProduct[]>([]);
  const [stats, setStats] = useState<HomePageStats>({
    totalEstablishments: 0,
    totalProducts: 0,
    totalCustomers: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  

  const loadFeaturedEstablishments = useCallback(async () => {
    try {
      console.log('🏠 Loading featured establishments for location:', location);
      
      // Enhanced error handling for establishment loading
      let query = supabase
        .from('establishments')
        .select(`
          *,
          establishment_subscriptions(
            status,
            current_period_end
          )
        `)
        .eq('is_active', true);

      // Apply location filter if available
      if (location?.city && location?.state) {
        console.log(`🌍 Filtering by location: ${location.city}, ${location.state}`);
        query = query
          .eq('city', location.city)
          .eq('state', location.state);
      }

      const { data: establishmentsData, error: establishmentsError } = await query
        .order('rating', { ascending: false })
        .order('total_reviews', { ascending: false })
        .limit(10);

      if (establishmentsError) {
        console.error('Error loading establishments:', establishmentsError);
        if (!isMounted.current) return;
        setFeaturedEstablishments([]);
        return;
      }

      if (establishmentsData && establishmentsData.length > 0) {
        const hasBasicInfo = (est: any) => {
          return (
            !!est.business_name &&
            !!est.address &&
            est.delivery_time_min !== null &&
            est.delivery_time_max !== null
          );
        };

        const filtered = establishmentsData.filter(establishment => {
          const subscription = establishment.establishment_subscriptions?.[0];
          const hasActiveSubscription = subscription?.status === 'active' && 
            new Date(subscription.current_period_end) > new Date();
          const hasWhatsAppGateway = establishment.payment_gateway === 'whatsapp';

          const isComplete = isEstablishmentComplete(establishment) || hasBasicInfo(establishment);

          return isComplete && (hasActiveSubscription || hasWhatsAppGateway);
        });

        const pool = filtered.length > 0
          ? filtered
          : establishmentsData.filter((est: any) => hasBasicInfo(est));

        const sortedEstablishments = pool
          .sort((a, b) => {
            // Primary sort: rating (higher first)
            if (b.rating !== a.rating) {
              return (b.rating || 0) - (a.rating || 0);
            }
            // Secondary sort: total reviews (more reviews first)
            return (b.total_reviews || 0) - (a.total_reviews || 0);
          })
          .slice(0, 3); // Limit to 3 best establishments
        
        console.log(`✅ Found ${sortedEstablishments.length} featured establishments`);
        
        const formatted: FeaturedEstablishment[] = sortedEstablishments.map((est: any) => ({
          id: est.id,
          business_name: est.business_name,
          business_type: est.business_type || "Restaurante",
          banner_url: est.banner_url || est.logo_url || "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=500",
          address: est.address || "Endereço não informado",
          phone: est.phone || "",
          rating: est.rating || 4.5,
          total_reviews: est.total_reviews || 0,
          delivery_time_min: est.delivery_time_min || 30,
          delivery_time_max: est.delivery_time_max || 60,
          delivery_fee: est.delivery_fee || 0,
          is_active: est.is_active,
          payment_gateway: est.payment_gateway,
        }));

        if (!isMounted.current) return;
        setFeaturedEstablishments(formatted);
      } else {
        console.log('❌ No featured establishments found');
        if (!isMounted.current) return;
        setFeaturedEstablishments([]);
      }
    } catch (error) {
      console.error('Error loading featured establishments:', error);
      if (!isMounted.current) return;
      setFeaturedEstablishments([]);
    }
  }, [location]);

  const loadPopularProducts = useCallback(async () => {
    try {
      console.log('🍕 Loading popular products for location:', location);
      
      // Usar função do Supabase para buscar produtos mais vendidos da semana com filtro de localização
      const { data: trendingData, error: trendingError } = await supabase
        .rpc('get_trending_products', {
          days_back: 7, // última semana
          result_limit: 8, // buscar mais para compensar filtros
          city_filter: location?.city || null,
          state_filter: location?.state || null
        });

      if (trendingError) {
        console.error('Error loading trending products:', trendingError);
        
        // Fallback: buscar produtos por rating se a função de trending falhar
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('products')
          .select(`
            *,
            establishments:establishment_id (
              id,
              business_name,
              business_type,
              address,
              phone,
              delivery_fee,
              minimum_order,
              delivery_time_min,
              delivery_time_max
            )
          `)
          .eq('is_available', true)
          .order('rating', { ascending: false })
          .order('total_reviews', { ascending: false })
          .limit(8);

        if (fallbackError) {
          console.error('Error loading fallback products:', fallbackError);
          return;
        }

        const filtered = fallbackData?.filter(product => {
          const establishment = product.establishments;
          if (!establishment) return false;
          const hasBasicInfo = (
            !!establishment.business_name &&
            !!establishment.address &&
            establishment.delivery_time_min !== null &&
            establishment.delivery_time_max !== null
          );
          return isEstablishmentComplete(establishment) || hasBasicInfo;
        }).slice(0, 4) || [];

        const formatted = filtered.map((product: any) => ({
          id: product.id,
          name: product.name,
          description: product.description || "",
          image_url: product.image_url || "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=500",
          price: product.price,
          rating: product.rating || 0,
          total_reviews: product.total_reviews || 0,
          category_name: "Produto",
          establishment: {
            id: product.establishments?.id || "",
            business_name: product.establishments?.business_name || "Estabelecimento"
          },
          is_available: product.is_available,
          preparation_time: product.preparation_time,
          created_at: product.created_at || new Date().toISOString()
        }));

        if (!isMounted.current) return;
        setPopularProducts(formatted);
        return;
      }

      if (trendingData && trendingData.length > 0) {
        // Para cada produto trending, buscar informações completas do estabelecimento
        const productsWithEstablishmentData = await Promise.all(
          trendingData.map(async (product: any) => {
            const { data: establishment, error: estError } = await supabase
              .from('establishments')
              .select(`
                id,
                business_name,
                business_type,
                address,
                phone,
                delivery_fee,
                minimum_order,
                delivery_time_min,
                delivery_time_max
              `)
              .eq('id', product.establishment_id)
              .single();

            if (estError || !establishment) {
              return null;
            }

            return {
              ...product,
              establishments: establishment
            };
          })
        );

        // Filter out null results and products from incomplete establishments
        const validProducts = productsWithEstablishmentData
          .filter(product => {
            if (!product || !product.establishments) return false;
            const est = product.establishments;
            const hasBasicInfo = (
              !!est.business_name &&
              !!est.address &&
              est.delivery_time_min !== null &&
              est.delivery_time_max !== null
            );
            return isEstablishmentComplete(est) || hasBasicInfo;
          })
          .slice(0, 4);

        const formatted: PopularProduct[] = validProducts.map((product: any) => ({
          id: product.id,
          name: product.name,
          description: product.description || "",
          image_url: product.image_url || "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=500",
          price: product.price,
          rating: product.rating || 0,
          total_reviews: product.total_reviews || 0,
          category_name: "Produto",
          establishment: {
            id: product.establishments.id,
            business_name: product.establishments.business_name
          },
          is_available: product.is_available,
          preparation_time: product.preparation_time,
          created_at: product.created_at || new Date().toISOString()
        }));

        if (!isMounted.current) return;
        setPopularProducts(formatted);
      }
    } catch (error) {
      console.error('Error loading popular products:', error);
    }
  }, [location]);

  const loadStats = useCallback(async () => {
    try {
      console.log('📊 Loading platform stats...');
      
      // Execute contagens básicas em paralelo
      const [establishmentsQuery, productsQuery, customersResponse] = await Promise.all([
        supabase
          .from('establishments')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true),
        supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('is_available', true),
        // Usar função edge para contagem precisa de clientes
        supabase.functions.invoke('get-customers-count')
      ]).catch(() => [
        { count: 0 },
        { count: 0 },
        { data: null, error: 'Failed to load customers count' }
      ]);

      // Processar dados de clientes
      let customersCount = 0;
      if (customersResponse?.data?.success) {
        customersCount = customersResponse.data.data.total_customers;
        console.log('✅ Customers count from edge function:', customersResponse.data.data);
      } else {
        // Fallback: contagem simples se a edge function falhar
        console.log('⚠️ Edge function failed, using fallback method');
        const { count: fallbackCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('type', 'customer');
        customersCount = fallbackCount || 0;
      }
      
      console.log('✅ Platform stats loaded:', {
        establishments: establishmentsQuery?.count || 0,
        products: productsQuery?.count || 0,
        customers: customersCount
      });

      if (!isMounted.current) return;
      setStats({
        totalEstablishments: establishmentsQuery?.count || 0,
        totalProducts: productsQuery?.count || 0,
        totalCustomers: customersCount
      });
    } catch (error) {
      console.error('❌ Error loading platform stats:', error);
      if (!isMounted.current) return;
      setStats({
        totalEstablishments: 0,
        totalProducts: 0,
        totalCustomers: 0
      });
    }
  }, []);

  const loadHomePageData = useCallback(async () => {
    try {
      if (!isMounted.current) return;
      setIsLoading(true);
      setError(null);

      const supabaseUrl = env.getSupabaseUrl();
      const supabaseKey = env.getSupabaseAnonKey();
      if (!supabaseUrl || !supabaseKey) {
        if (env.isDevelopment()) {
          console.warn('Supabase configuration missing');
          // Em desenvolvimento, não exibir erro intrusivo na Home.
          // Apenas retornar com dados vazios para permitir navegação.
          setFeaturedEstablishments([]);
          setPopularProducts([]);
          setStats({ totalEstablishments: 0, totalProducts: 0, totalCustomers: 0 });
          setIsLoading(false);
          return;
        }
        // Em produção, manter aviso de configuração ausente.
        setError('Configuração do Supabase ausente');
        setFeaturedEstablishments([]);
        setPopularProducts([]);
        setStats({ totalEstablishments: 0, totalProducts: 0, totalCustomers: 0 });
        setIsLoading(false);
        return;
      }

      const [establishmentsResult, productsResult, statsResult] = await Promise.allSettled([
        loadFeaturedEstablishments(),
        loadPopularProducts(),
        loadStats()
      ]);

      if (establishmentsResult.status === 'rejected') {
        console.error('Error loading establishments:', establishmentsResult.reason);
      }
      if (productsResult.status === 'rejected') {
        console.error('Error loading products:', productsResult.reason);
      }
      if (statsResult.status === 'rejected') {
        console.error('Error loading stats:', statsResult.reason);
      }

    } catch (err) {
      console.error('Error loading home page data:', err);
      if (!isMounted.current) return;
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados da página inicial');
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [loadFeaturedEstablishments, loadPopularProducts, loadStats]);

  useEffect(() => {
    loadHomePageData();
    return () => { isMounted.current = false; };
  }, [loadHomePageData]);

  return {
    featuredEstablishments,
    popularProducts,
    stats,
    isLoading,
    error,
    refetch: loadHomePageData
  };
}
