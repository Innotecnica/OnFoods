import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Order {
  id: string;
  customer_id: string;
  establishment_id: string;
  address_id: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  total_amount: number;
  delivery_fee: number;
  discount_amount: number;
  payment_method: 'credit_card' | 'debit_card' | 'pix' | 'cash' | 'mercado_pago_pix' | 'mercado_pago_credit' | 'mercado_pago_debit' | 'mercado_pago_wallet' | 'card_on_delivery' | null;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  notes: string | null;
  estimated_delivery_time: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderWithDetails extends Order {
  establishment?: {
    business_name: string;
    logo_url: string | null;
  };
  items?: Array<{
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    notes: string | null;
    product: {
      name: string;
      image_url: string | null;
    };
  }>;
}

export function useOrders() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const loadOrders = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      let query = supabase
        .from('orders')
        .select(`
          *,
          establishment:establishments!establishment_id(business_name, logo_url),
          items:order_items(
            id,
            product_id,
            quantity,
            unit_price,
            total_price,
            notes,
            product:products!product_id(name, image_url)
          )
        `)
        .order('created_at', { ascending: false });

      // Filter based on user type
      if (user.type === 'customer') {
        query = query.eq('customer_id', user.id);
      } else {
        // For establishments, get orders for their establishment
        const { data: establishment } = await supabase
          .from('establishments')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (establishment) {
          query = query.eq('establishment_id', establishment.id);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar pedidos');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [loadOrders, user]);

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ 
          status,
          ...(status === 'delivered' && { delivered_at: new Date().toISOString() })
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      
      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status, ...(status === 'delivered' && { delivered_at: data.delivered_at }) }
          : order
      ));

      // Triggers will handle notifications automatically
      return data;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao atualizar status do pedido');
    }
  };

  const createOrder = async (orderData: {
    establishment_id: string;
    address_id: string;
    total_amount: number;
    delivery_fee: number;
    payment_method: Order['payment_method'];
    notes?: string;
    items: Array<{
      product_id: string;
      quantity: number;
      unit_price: number;
      total_price: number;
      notes?: string;
    }>;
  }) => {
    if (!user || user.type !== 'customer') {
      throw new Error('Apenas clientes podem criar pedidos');
    }

    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          customer_id: user.id,
          establishment_id: orderData.establishment_id,
          address_id: orderData.address_id,
          total_amount: orderData.total_amount,
          delivery_fee: orderData.delivery_fee,
          payment_method: orderData.payment_method,
          notes: orderData.notes,
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = orderData.items.map(item => ({
        order_id: order.id,
        ...item,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      await loadOrders(); // Reload orders
      return order;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao criar pedido');
    }
  };

  return {
    orders,
    isLoading,
    error,
    updateOrderStatus,
    createOrder,
    refetch: loadOrders,
  };
}
