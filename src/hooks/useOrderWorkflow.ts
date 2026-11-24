import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Enums } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { usePromotions, AppliedPromotion } from "@/hooks/usePromotions";
import { UnifiedDiscount } from "@/components/checkout/UnifiedDiscountApplicator";
import { toast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/useCart";

export interface OrderWorkflowData {
  orderId: string;
  status: 'creating' | 'processing' | 'completed' | 'error';
  progress: string;
  gateway: string;
  whatsappUrl?: string;
  stripeUrl?: string;
}

export interface CreateOrderParams {
  establishmentId: string;
  addressId?: string;
  paymentMethod: Enums['payment_method'];
  notes?: string;
  appliedDiscount?: UnifiedDiscount | null;
  cartItems: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
    notes?: string;
  }>;
  subtotal: number;
  deliveryFee: number;
}

export function useOrderWorkflow() {
  const [workflowData, setWorkflowData] = useState<OrderWorkflowData | null>(null);
  const { user } = useAuth();
  const { applyPromotionToOrder } = usePromotions();
  const { clearCart } = useCart();

  const updateProgress = (progress: string) => {
    setWorkflowData(prev => prev ? { ...prev, progress } : null);
  };

  const createOrder = async (params: CreateOrderParams): Promise<string> => {
    if (!user) throw new Error('Usuário não autenticado');

    updateProgress("Validando estabelecimento...");

    // Get establishment data
    const { data: establishment, error: estError } = await supabase
      .from('establishments')
      .select('business_name, payment_gateway, phone, delivery_fee, minimum_order, opening_hours')
      .eq('id', params.establishmentId)
      .single();

    if (estError) throw new Error('Estabelecimento não encontrado');

    // Check minimum order
    if (establishment.minimum_order && params.subtotal < establishment.minimum_order) {
      throw new Error(`Pedido mínimo de R$ ${establishment.minimum_order.toFixed(2)} não atingido`);
    }

    updateProgress("Criando pedido...");

    // Calculate totals
    let totalAmount = params.subtotal + params.deliveryFee;
    let discountAmount = 0;

    if (params.appliedDiscount) {
      discountAmount = params.appliedDiscount.discountAmount;
      totalAmount = params.subtotal - discountAmount + params.deliveryFee;
    }

    // Determine order status based on gateway
    const isWhatsApp = establishment.payment_gateway === 'whatsapp';
    const initialStatus: Enums['order_status'] = isWhatsApp ? 'confirmed' : 'pending';
    const paymentStatus: Enums['payment_status'] = 'pending';

    // Create order
    const insertPayload: any = {
      customer_id: user.id,
      establishment_id: params.establishmentId,
      address_id: params.addressId ?? null,
      total_amount: totalAmount,
      delivery_fee: params.deliveryFee,
      discount_amount: discountAmount,
      payment_method: params.paymentMethod,
      payment_status: paymentStatus,
      status: initialStatus,
      notes: params.notes,
      estimated_delivery_time: new Date(Date.now() + 40 * 60 * 1000).toISOString(),
    };

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([insertPayload])
      .select()
      .single();

    if (orderError) throw new Error('Erro ao criar pedido');

    // Create order items
    const orderItems = params.cartItems.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.unit_price * item.quantity,
      notes: item.notes,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw new Error('Erro ao criar itens do pedido');

    // Apply discount if used
    if (params.appliedDiscount && params.appliedDiscount.type === 'promotion') {
      try {
        await applyPromotionToOrder(
          params.appliedDiscount.id, 
          user.id, 
          order.id, 
          discountAmount
        );
      } catch (error) {
        console.error('Failed to apply promotion:', error);
      }
    }

    return order.id;
  };

  const processWhatsAppOrder = async (orderId: string): Promise<string> => {
    updateProgress("Enviando para WhatsApp...");
    console.log('[WORKFLOW] Calling WhatsApp edge function for order:', orderId);

    const { data: result, error } = await supabase.functions.invoke('send-whatsapp-order-summary', {
      body: { orderId }
    });

    console.log('[WORKFLOW] WhatsApp function response:', { result, error });

    if (error || !result?.whatsapp_url) {
      console.error('[WORKFLOW] WhatsApp failed:', error);
      throw new Error('Erro ao enviar WhatsApp: ' + (error?.message || 'URL não gerada'));
    }

    console.log('[WORKFLOW] WhatsApp success, URL:', result.whatsapp_url);
    return result.whatsapp_url;
  };

  const processStripeOrder = async (orderId: string, establishmentId: string, amount: number): Promise<string> => {
    updateProgress("Configurando pagamento Stripe...");

    const { data: result, error } = await supabase.functions.invoke('create-stripe-checkout', {
      body: { 
        orderId,
        establishmentId,
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'brl'
      }
    });

    if (error || !result?.url) {
      throw new Error('Erro no Stripe: ' + (error?.message || 'URL não gerada'));
    }

    return result.url;
  };

  const sendToDashboard = async (orderId: string): Promise<void> => {
    try {
      await supabase.functions.invoke('send-order-notification', {
        body: { orderId, type: 'new_order' }
      });
    } catch (error) {
      console.error('Failed to send dashboard notification:', error);
    }
  };

  const executeWorkflow = async (params: CreateOrderParams) => {
    try {
      console.log('[WORKFLOW] Starting order workflow for establishment:', params.establishmentId);
      
      setWorkflowData({
        orderId: '',
        status: 'creating',
        progress: 'Iniciando...',
        gateway: 'unknown'
      });

      // Step 1: Create order
      console.log('[WORKFLOW] Creating order...');
      const orderId = await createOrder(params);
      console.log('[WORKFLOW] Order created:', orderId);
      
      setWorkflowData(prev => prev ? { ...prev, orderId } : null);

      // Step 2: Get establishment gateway
      console.log('[WORKFLOW] Getting establishment gateway...');
      const { data: establishment } = await supabase
        .from('establishments')
        .select('payment_gateway')
        .eq('id', params.establishmentId)
        .single();

      const gateway = establishment?.payment_gateway || 'none';
      console.log('[WORKFLOW] Gateway detected:', gateway);
      
      setWorkflowData(prev => prev ? { ...prev, gateway, status: 'processing' } : null);

      // Step 3: Process based on gateway
      let whatsappUrl: string | undefined;
      let stripeUrl: string | undefined;

      if (gateway === 'whatsapp') {
        console.log('[WORKFLOW] Processing WhatsApp order...');
        whatsappUrl = await processWhatsAppOrder(orderId);
      } else if (gateway === 'stripe') {
        console.log('[WORKFLOW] Processing Stripe order...');
        stripeUrl = await processStripeOrder(
          orderId, 
          params.establishmentId, 
          params.subtotal + params.deliveryFee
        );
      }

      // Step 4: Send to dashboard (always)
      console.log('[WORKFLOW] Sending to dashboard...');
      await sendToDashboard(orderId);

      // Step 5: Clear cart after successful order creation
      console.log('[WORKFLOW] Clearing cart for establishment:', params.establishmentId);
      try {
        await clearCart(params.establishmentId);
        console.log('[WORKFLOW] Cart cleared successfully');
      } catch (clearError) {
        console.error('[WORKFLOW] Error clearing cart (non-fatal):', clearError);
        // Don't fail the order if cart clearing fails
      }

      // Step 6: Complete workflow
      console.log('[WORKFLOW] Completing workflow...');
      setWorkflowData(prev => prev ? {
        ...prev,
        status: 'completed',
        progress: 'Pedido criado com sucesso!',
        whatsappUrl,
        stripeUrl
      } : null);

      console.log('[WORKFLOW] Workflow completed successfully:', { orderId, gateway, whatsappUrl, stripeUrl });
      return { orderId, gateway, whatsappUrl, stripeUrl };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('[WORKFLOW] Error in workflow:', error);
      
      setWorkflowData(prev => prev ? {
        ...prev,
        status: 'error',
        progress: errorMessage
      } : null);

      toast({
        title: "Erro no pedido",
        description: errorMessage,
        variant: "destructive",
      });

      throw error;
    }
  };

  const resetWorkflow = () => {
    setWorkflowData(null);
  };

  return {
    workflowData,
    executeWorkflow,
    resetWorkflow
  };
}
