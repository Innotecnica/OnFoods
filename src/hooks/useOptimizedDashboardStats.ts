import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface OptimizedDashboardStats {
  // Basic metrics
  totalOrders: number;
  todayOrders: number;
  monthlyRevenue: number;
  todayRevenue: number;
  weeklyRevenue: number;
  totalRevenue: number;
  activeProducts: number;
  averageRating: number;
  totalReviews: number;
  
  // Status breakdown
  statusCounts: {
    pending: number;
    confirmed: number;
    preparing: number;
    ready: number;
    out_for_delivery: number;
    delivered: number;
    cancelled: number;
  };
  
  // Customer metrics
  uniqueCustomers: number;
  todayUniqueCustomers: number;
  averageOrderValue: number;
  todayAverageOrderValue: number;
  
  // Growth metrics
  revenueGrowth: number;
  ordersGrowth: number;
  
  // Recent activity
  recentOrders: Array<{
    id: string;
    total_amount: number;
    status: string;
    created_at: string;
    customer_name: string;
    customer_phone?: string;
  }>;
  
  // Cache info
  cached_at: string;
  establishment_name: string;
}

const defaultStats: OptimizedDashboardStats = {
  totalOrders: 0,
  todayOrders: 0,
  monthlyRevenue: 0,
  todayRevenue: 0,
  weeklyRevenue: 0,
  totalRevenue: 0,
  activeProducts: 0,
  averageRating: 0,
  totalReviews: 0,
  statusCounts: {
    pending: 0,
    confirmed: 0,
    preparing: 0,
    ready: 0,
    out_for_delivery: 0,
    delivered: 0,
    cancelled: 0,
  },
  uniqueCustomers: 0,
  todayUniqueCustomers: 0,
  averageOrderValue: 0,
  todayAverageOrderValue: 0,
  revenueGrowth: 0,
  ordersGrowth: 0,
  recentOrders: [],
  cached_at: new Date().toISOString(),
  establishment_name: ''
};

export function useOptimizedDashboardStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<OptimizedDashboardStats>(defaultStats);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<{ data: OptimizedDashboardStats; timestamp: number } | null>(null);
  const loadingRef = useRef<boolean>(false);

  // Cache duration: 1 minute
  const CACHE_DURATION = 60 * 1000;

  const isDataFresh = useCallback(() => {
    if (!cacheRef.current) return false;
    return Date.now() - cacheRef.current.timestamp < CACHE_DURATION;
  }, [CACHE_DURATION]);

  const loadStats = useCallback(async (forceRefresh = false) => {
    if (!user || loadingRef.current) return;

    if (!forceRefresh && isDataFresh() && cacheRef.current) {
      console.log('[DASHBOARD] Using cached data');
      setStats(cacheRef.current.data);
      setIsLoading(false);
      return;
    }

    try {
      loadingRef.current = true;
      setIsLoading(true);
      setError(null);

      console.log('[DASHBOARD] Loading fresh data from edge function...');

      const { data, error: functionError } = await supabase.functions.invoke('get-enhanced-dashboard-stats');

      if (functionError) {
        throw new Error(`Edge function error: ${functionError.message}`);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to load dashboard stats');
      }

      const freshStats = data.data as OptimizedDashboardStats;
      cacheRef.current = { data: freshStats, timestamp: Date.now() };
      setStats(freshStats);
      console.log('[DASHBOARD] Stats loaded successfully');

    } catch (err) {
      console.error('[DASHBOARD] Error loading stats:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar estatísticas');
      if (cacheRef.current) {
        console.log('[DASHBOARD] Using stale cached data as fallback');
        setStats(cacheRef.current.data);
      }
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [user, isDataFresh]);

  

  const setupRealtimeUpdates = useCallback(async () => {
    if (!user) return;

    try {
      const { data: establishment } = await supabase
        .from('establishments')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!establishment) return;

      // Subscribe to order changes for this establishment
      const channel = supabase
        .channel('dashboard-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `establishment_id=eq.${establishment.id}`
          },
          (payload) => {
            console.log('[DASHBOARD] Real-time update received:', payload.eventType);
            // Invalidate cache and reload
            cacheRef.current = null;
            loadStats(true);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'products',
            filter: `establishment_id=eq.${establishment.id}`
          },
          (payload) => {
            console.log('[DASHBOARD] Product update received:', payload.eventType);
            // Only refresh if product availability changed
            if (payload.eventType === 'UPDATE' && 
                payload.old?.is_available !== payload.new?.is_available) {
              cacheRef.current = null;
              loadStats(true);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error('[DASHBOARD] Error setting up realtime:', error);
    }
  }, [user, loadStats]);

  useEffect(() => {
    if (user?.type === 'establishment') {
      loadStats();
      setupRealtimeUpdates();
    }
  }, [user?.type, loadStats, setupRealtimeUpdates]);

  const refreshStats = (forceRefresh = true) => {
    if (forceRefresh) {
      cacheRef.current = null;
    }
    loadStats(forceRefresh);
  };

  const getGrowthTrend = (value: number) => {
    if (value > 5) return 'high-growth';
    if (value > 0) return 'growth';
    if (value === 0) return 'stable';
    if (value > -5) return 'slight-decline';
    return 'decline';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'text-yellow-600',
      confirmed: 'text-blue-600',
      preparing: 'text-orange-600',
      ready: 'text-purple-600',
      out_for_delivery: 'text-indigo-600',
      delivered: 'text-green-600',
      cancelled: 'text-red-600'
    };
    return colors[status as keyof typeof colors] || 'text-gray-600';
  };

  return {
    stats,
    isLoading,
    error,
    refreshStats,
    isDataFresh: isDataFresh(),
    lastUpdated: cacheRef.current?.timestamp ? new Date(cacheRef.current.timestamp).toLocaleTimeString() : null,
    getGrowthTrend,
    getStatusColor
  };
}
