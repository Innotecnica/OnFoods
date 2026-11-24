import { useState, useEffect, useCallback } from "react";
import i18n from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface OrderHistoryItem {
  id: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  customer_avatar?: string;
  establishment_id: string;
  status: string;
  total_amount: number;
  delivery_fee?: number;
  discount_amount?: number;
  payment_method?: string;
  payment_status?: string;
  notes?: string;
  estimated_delivery_time?: string;
  delivered_at?: string;
  created_at: string;
  updated_at: string;
  delivery_address?: string;
  order_items?: OrderHistoryOrderItem[];
}

export interface OrderHistoryOrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
  product_name: string;
  product_image?: string;
}

export function useEstablishmentOrderHistory() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0
  });

  const loadOrderHistory = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Get establishment ID first
      const { data: establishmentData, error: establishmentError } = await supabase
        .from('establishments')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (establishmentError) {
        console.error('Error fetching establishment:', establishmentError);
        return;
      }

      if (!establishmentData) {
        console.error('No establishment found for user');
        return;
      }

      // Fetch all orders for this establishment
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          addresses (
            street,
            number,
            neighborhood,
            city,
            state
          ),
          order_items (
            id,
            product_id,
            quantity,
            unit_price,
            total_price,
            notes,
            products (
              name,
              image_url
            )
          )
        `)
        .eq('establishment_id', establishmentData.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading order history:', error);
        return;
      }

      // Fetch customer data for each order
      const ordersWithCustomers = await Promise.all(
        (data || []).map(async (order) => {
          try {
            const { data: customerData } = await supabase
              .from('profiles')
              .select('name, phone, avatar_url')
              .eq('user_id', order.customer_id)
              .single();

            const address = order.addresses as any;
            const items = order.order_items as any[];

            return {
              ...order,
              customer_name: customerData?.name || 'Cliente Anônimo',
              customer_phone: customerData?.phone,
              customer_avatar: customerData?.avatar_url,
              delivery_address: address ? 
                `${address.street}, ${address.number} - ${address.neighborhood}, ${address.city}/${address.state}` 
                : 'Endereço não encontrado',
              order_items: items?.map(item => ({
                ...item,
                product_name: item.products?.name || 'Produto não encontrado',
                product_image: item.products?.image_url
              })) || []
            };
          } catch (error) {
            console.error('Error fetching customer data for order:', order.id, error);
            return {
              ...order,
              customer_name: 'Cliente Anônimo',
              delivery_address: 'Endereço não encontrado',
              order_items: []
            };
          }
        })
      );

      setOrders(ordersWithCustomers);

      // Calculate stats
      const totalOrders = ordersWithCustomers.length;
      const totalRevenue = ordersWithCustomers.reduce((sum, order) => sum + order.total_amount, 0);
      const pendingOrders = ordersWithCustomers.filter(order => 
        ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(order.status)
      ).length;
      const completedOrders = ordersWithCustomers.filter(order => 
        order.status === 'delivered'
      ).length;

      setStats({
        totalOrders,
        totalRevenue,
        pendingOrders,
        completedOrders
      });

    } catch (error) {
      console.error('Error loading order history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && user.type === 'establishment') {
      loadOrderHistory();
    }
  }, [loadOrderHistory, user]);

  const getOrdersByStatus = (status: string) => {
    return orders.filter(order => order.status === status);
  };

  const getOrderStatusText = (status: string) => {
    switch (status) {
      case 'pending': return i18n.t('common:status_pending');
      case 'confirmed': return i18n.t('common:status_confirmed');
      case 'preparing': return i18n.t('common:status_preparing');
      case 'ready': return i18n.t('common:status_ready');
      case 'out_for_delivery': return i18n.t('common:status_out_for_delivery');
      case 'delivered': return i18n.t('common:status_delivered');
      case 'cancelled': return i18n.t('common:status_cancelled');
      default: return status;
    }
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'confirmed': return 'bg-blue-500';
      case 'preparing': return 'bg-orange-500';
      case 'ready': return 'bg-green-500';
      case 'out_for_delivery': return 'bg-purple-500';
      case 'delivered': return 'bg-emerald-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return {
    orders,
    isLoading,
    stats,
    getOrdersByStatus,
    getOrderStatusText,
    getOrderStatusColor,
    refreshOrders: loadOrderHistory,
  };
}
