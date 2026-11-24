import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Order {
  id: string;
  customer_id: string;
  establishment_id: string;
  address_id: string;
  total_amount: number;
  delivery_fee: number;
  discount_amount: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  payment_method: 'credit_card' | 'debit_card' | 'pix' | 'cash';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  estimated_delivery_time: string;
  notes: string;
  created_at: string;
  updated_at: string;
  // Joined data
  establishment_name: string;
  establishment_logo?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_avatar?: string;
  delivery_address?: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string;
  // Joined data
  product_name?: string;
  product_image?: string;
}

export function useEstablishmentOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadOrders = useCallback(async () => {
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

      // Optimized single query with all necessary joins
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          *,
          addresses!orders_address_id_fkey (
            street,
            number,
            neighborhood,
            city,
            complement
          ),
          profiles!orders_customer_id_fkey (
            name,
            phone,
            avatar_url,
            email
          ),
          establishments!orders_establishment_id_fkey (
            business_name,
            logo_url
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
        .eq('establishment_id', establishment.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading orders:', error);
        return;
      }

      // Process orders with all data already joined
      const processedOrders = (ordersData || []).map(order => {
        const customer = order.profiles as any;
        const address = order.addresses as any;
        const items = order.order_items as any[] || [];

        return {
          ...order,
          establishment_name: (order.establishments as any)?.business_name || 'Estabelecimento',
          establishment_logo: (order.establishments as any)?.logo_url || '',
          customer_name: customer?.name || 'Cliente',
          customer_phone: customer?.phone || '',
          customer_avatar: customer?.avatar_url || '',
          delivery_address: address ? 
            `${address.street}, ${address.number} - ${address.neighborhood}, ${address.city}${address.complement ? ` - ${address.complement}` : ''}` 
            : 'Endereço não informado',
          order_items: items.map(item => ({
            ...item,
            product_name: (item.products as any)?.name || 'Produto',
            product_image: (item.products as any)?.image_url || ''
          }))
        } as Order;
      });

      setOrders(processedOrders);

    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.type === 'establishment') {
      loadOrders();
    }
  }, [loadOrders, user?.type]);

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) {
        console.error('Error updating order status:', error);
        return false;
      }

      // Find the order to get customer information
      const order = orders.find(o => o.id === orderId);
      
      // Update local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus, updated_at: new Date().toISOString() }
            : order
        )
      );

      // Send WhatsApp notification if customer phone is available
      if (order?.customer_phone && order?.establishment_id) {
        try {
          await supabase.functions.invoke('send-order-status-notification', {
            body: {
              orderId: orderId,
              newStatus: newStatus,
              customerPhone: order.customer_phone,
              customerName: order.customer_name || 'Cliente',
              establishmentId: order.establishment_id
            }
          });
          console.log('📱 WhatsApp notification sent for order:', orderId);
        } catch (notificationError) {
          console.warn('⚠️ Failed to send WhatsApp notification:', notificationError);
          // Don't fail the status update if notification fails
        }
      }

      return true;
    } catch (error) {
      console.error('Error updating order status:', error);
      return false;
    }
  };

  const updateMultipleOrderStatus = async (orderIds: string[], newStatus: Order['status']) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .in('id', orderIds);

      if (error) {
        console.error('Error updating multiple order status:', error);
        return false;
      }

      // Update local state for all orders
      setOrders(prevOrders => 
        prevOrders.map(order => 
          orderIds.includes(order.id)
            ? { ...order, status: newStatus, updated_at: new Date().toISOString() }
            : order
        )
      );

      // Send notifications for all orders in background
      orderIds.forEach(async (orderId) => {
        const order = orders.find(o => o.id === orderId);
        if (order?.customer_phone && order?.establishment_id) {
          try {
            await supabase.functions.invoke('send-order-status-notification', {
              body: {
                orderId: orderId,
                newStatus: newStatus,
                customerPhone: order.customer_phone,
                customerName: order.customer_name || 'Cliente',
                establishmentId: order.establishment_id
              }
            });
          } catch (notificationError) {
            console.warn('⚠️ Failed to send WhatsApp notification for order:', orderId, notificationError);
          }
        }
      });

      return true;
    } catch (error) {
      console.error('Error updating multiple order status:', error);
      return false;
    }
  };

  const refreshOrders = () => {
    loadOrders();
  };

  return {
    orders,
    isLoading,
    updateOrderStatus,
    updateMultipleOrderStatus,
    refreshOrders
  };
}
