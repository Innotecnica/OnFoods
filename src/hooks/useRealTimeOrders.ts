import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export function useRealTimeOrders() {
  const { user } = useAuth();
  const [newOrders, setNewOrders] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    if (!user || user.type !== 'establishment') return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupRealtimeSubscription = async () => {
      // Get establishment ID
      const { data: establishment } = await supabase
        .from('establishments')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!establishment) return;

      // Subscribe to new orders
      channel = supabase
        .channel('orders')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
            filter: `establishment_id=eq.${establishment.id}`
          },
          async (payload) => {
            console.log('New order received:', payload);
            
            // Get customer details
            const { data: customer } = await supabase
              .from('profiles')
              .select('name, phone')
              .eq('user_id', payload.new.customer_id)
              .single();

            const orderData = {
              ...payload.new,
              customer_name: customer?.name || 'Cliente',
              customer_phone: customer?.phone || ''
            };

            setNewOrders(prev => [orderData, ...prev.slice(0, 9)]); // Keep last 10

            // Show notification
            toast({
              title: "🔔 Novo Pedido!",
              description: `Pedido de ${customer?.name || 'Cliente'} - R$ ${Number(payload.new.total_amount).toFixed(2)}`,
              duration: 10000,
            });
          }
        )
        .subscribe();
    };

    setupRealtimeSubscription();

    // Cleanup
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user]);

  const clearNewOrders = () => {
    setNewOrders([]);
  };

  return {
    newOrders,
    clearNewOrders
  };
}