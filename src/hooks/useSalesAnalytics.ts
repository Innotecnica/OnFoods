import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SalesAnalytics {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  topProducts: Array<{
    name: string;
    revenue: number;
    quantity: number;
  }>;
  revenueByDay: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  customerSegments: Array<{
    segment: string;
    count: number;
    revenue: number;
  }>;
}

export function useSalesAnalytics() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<SalesAnalytics>({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    topProducts: [],
    revenueByDay: [],
    customerSegments: []
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Get establishment ID
      const { data: establishment } = await supabase
        .from('establishments')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!establishment) return;

      // Call sales analytics edge function
      const { data: analyticsData, error } = await supabase.functions.invoke('sales-analytics', {
        body: {
          establishment_id: establishment.id,
          period: 'last_30_days'
        }
      });

      if (error) {
        console.error('Error loading analytics:', error);
        return;
      }

      if (analyticsData?.success) {
        setAnalytics(analyticsData.data);
      }

    } catch (error) {
      console.error('Error loading sales analytics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.type === 'establishment') {
      loadAnalytics();
    }
  }, [loadAnalytics, user?.type]);

  const refreshAnalytics = () => {
    loadAnalytics();
  };

  return {
    analytics,
    isLoading,
    refreshAnalytics
  };
}
