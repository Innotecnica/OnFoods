import { useState, useEffect, useCallback } from "react";
import i18n from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
  product_name: string;
  product_image?: string;
}

export interface Order {
  id: string;
  customer_id: string;
  establishment_id: string;
  address_id: string;
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
  // Joined data
  establishment_name?: string;
  establishment_logo?: string;
  delivery_address?: string;
  order_items?: OrderItem[];
}

export function useUserOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadOrders = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          establishments (
            business_name,
            logo_url
          ),
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
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading orders:', error);
        return;
      }

      // Process the data to match our interface
      interface JoinedOrderRow {
        establishments?: { business_name?: string; logo_url?: string | null };
        addresses?: { street?: string; number?: string; neighborhood?: string; city?: string; state?: string };
        order_items?: Array<{
          id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          notes?: string | null;
          products?: { name?: string; image_url?: string | null };
        }>;
      }

      const processedOrders: Order[] = (data || []).map(order => {
        const establishment = (order as JoinedOrderRow).establishments;
        const address = (order as JoinedOrderRow).addresses;
        const items = (order as JoinedOrderRow).order_items ?? [];

        return {
          ...order,
          establishment_name: establishment?.business_name,
          establishment_logo: establishment?.logo_url,
          delivery_address: address ? 
            `${address.street}, ${address.number} - ${address.neighborhood}, ${address.city}/${address.state}` 
            : 'Endereço não encontrado',
          order_items: items.map(item => ({
            ...item,
            product_name: item.products?.name || 'Produto não encontrado',
            product_image: item.products?.image_url
          })) || []
        };
      });

      setOrders(processedOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && user.type === 'customer') {
      loadOrders();
    }
  }, [user, loadOrders]);

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
    getOrdersByStatus,
    getOrderStatusText,
    getOrderStatusColor,
    refreshOrders: loadOrders,
  };
}
