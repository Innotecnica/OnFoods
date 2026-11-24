import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

// Helper function to extract most ordered categories
const getMostOrderedCategories = (orderHistory: any[]) => {
  const categoryCount: Record<string, number> = {};
  
  orderHistory.forEach(order => {
    order.order_items?.forEach((item: any) => {
      if (item.products?.categories?.name) {
        const category = item.products.categories.name;
        categoryCount[category] = (categoryCount[category] || 0) + item.quantity;
      }
    });
  });
  
  return Object.entries(categoryCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([category]) => category);
};

export interface CustomerProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  last_order_date: string | null;
  total_orders: number;
  total_spent: number;
  preferred_categories: string[] | null;
  notes: string | null;
}

export function useCustomerProfiles() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCustomers = useCallback(async () => {
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

      // First get all customer IDs who have orders at this establishment
      const { data: customerOrders, error: ordersError } = await supabase
        .from('orders')
        .select('customer_id, total_amount, created_at')
        .eq('establishment_id', establishment.id);

      if (ordersError) {
        console.error('Error loading customer orders:', ordersError);
        return;
      }

      // Get unique customer IDs
      const customerIds = [...new Set(customerOrders?.map(order => order.customer_id) || [])];
      
      if (customerIds.length === 0) {
        setCustomers([]);
        return;
      }

      // Get customer profiles
      const { data: customersData, error } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', customerIds)
        .eq('type', 'customer');

      if (error) {
        console.error('Error loading customers:', error);
        return;
      }

      // Process customer data with order statistics
      const processedCustomers = (customersData || []).map(customer => {
        const customerOrdersData = customerOrders?.filter(order => order.customer_id === customer.user_id) || [];
        const totalOrders = customerOrdersData.length;
        const totalSpent = customerOrdersData.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0);
        const lastOrderDate = customerOrdersData.length > 0 ? 
          customerOrdersData.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at 
          : null;

        return {
          id: customer.id,
          user_id: customer.user_id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          avatar_url: customer.avatar_url,
          created_at: customer.created_at,
          last_order_date: lastOrderDate,
          total_orders: totalOrders,
          total_spent: totalSpent,
          preferred_categories: customerOrdersData.length > 0 ? [] : null, // Will be implemented with order items data
          notes: null
        } as CustomerProfile;
      });

      setCustomers(processedCustomers);

    } catch (error) {
      console.error('Error loading customers:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os clientes.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.type === 'establishment') {
      loadCustomers();
    }
  }, [loadCustomers, user?.type]);

  const getCustomerSegments = () => {
    const segments = {
      new: customers.filter(c => c.total_orders === 1),
      regular: customers.filter(c => c.total_orders >= 2 && c.total_orders <= 5),
      vip: customers.filter(c => c.total_orders > 5),
      inactive: customers.filter(c => {
        if (!c.last_order_date) return true;
        const daysSinceLastOrder = Math.floor(
          (Date.now() - new Date(c.last_order_date).getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysSinceLastOrder > 30;
      }),
      highValue: customers.filter(c => c.total_spent > 200)
    };

    return segments;
  };

  const refreshCustomers = () => {
    loadCustomers();
  };

  return {
    customers,
    isLoading,
    getCustomerSegments,
    refreshCustomers
  };
}
