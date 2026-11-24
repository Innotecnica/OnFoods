import { useState } from "react";
import { buildCustomerContactMessage } from "@/utils/whatsappMessages";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/hooks/useCart";
import { useErrorHandler } from "@/hooks/useErrorHandler";

export interface EnhancedOrderWorkflowData {
  orderId: string;
  status: 'creating' | 'processing' | 'completed' | 'error';
  progress: string;
  gateway: string;
  whatsappUrl?: string;
  stripeUrl?: string;
  currentStep: number;
  totalSteps: number;
}

export interface CreateOrderParams {
  establishmentId: string;
  addressId: string;
  paymentMethod: string;
  notes?: string;
  cartItems: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
    notes?: string;
  }>;
  subtotal: number;
  deliveryFee: number;
  discountAmount?: number;
}

export function useEnhancedOrderWorkflow() {
  const [workflowData, setWorkflowData] = useState<EnhancedOrderWorkflowData | null>(null);
  const { user } = useAuth();
  const { clearCart } = useCart();
  const { handleError, handleAsyncOperation } = useErrorHandler();

  const updateProgress = (progress: string, step?: number) => {
    setWorkflowData(prev => prev ? { 
      ...prev, 
      progress,
      currentStep: step || prev.currentStep 
    } : null);
  };

  const validateOrder = async (params: CreateOrderParams): Promise<any> => {
    updateProgress("Validando estabelecimento...", 1);

    // Get establishment data with all necessary info
    const { data: establishment, error: estError } = await supabase
      .from('establishments')
      .select(`
        id, business_name, payment_gateway, phone, 
        delivery_fee, minimum_order, opening_hours,
        is_active
      `)
      .eq('id', params.establishmentId)
      .single();

    if (estError || !establishment) {
      throw new Error('Estabelecimento não encontrado');
    }

    if (!establishment.is_active) {
      throw new Error('Estabelecimento não está ativo no momento');
    }

    // Check opening hours
    const isOpen = checkIfEstablishmentIsOpen(establishment.opening_hours);
    if (!isOpen) {
      throw new Error(`${establishment.business_name} está fechado no momento. Verifique o horário de funcionamento.`);
    }

    // Check minimum order
    if (establishment.minimum_order && params.subtotal < establishment.minimum_order) {
      throw new Error(`Pedido mínimo de R$ ${establishment.minimum_order.toFixed(2)} não atingido. Adicione mais itens ao carrinho.`);
    }

    return establishment;
  };

  const createOrder = async (params: CreateOrderParams, establishment: any): Promise<string> => {
    updateProgress("Criando pedido no sistema...", 2);

    // Calculate totals
    let totalAmount = params.subtotal + params.deliveryFee;
    if (params.discountAmount) {
      totalAmount -= params.discountAmount;
    }

    // Determine order status based on gateway
    const isWhatsApp = establishment.payment_gateway === 'whatsapp';
    const initialStatus = isWhatsApp ? 'confirmed' : 'pending';
    const paymentStatus = isWhatsApp && ['cash', 'card_on_delivery'].includes(params.paymentMethod) 
      ? 'pending' : 'pending';

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        customer_id: user?.id,
        establishment_id: params.establishmentId,
        address_id: params.addressId,
        total_amount: totalAmount,
        delivery_fee: params.deliveryFee,
        discount_amount: params.discountAmount || 0,
        payment_method: params.paymentMethod as any,
        payment_status: paymentStatus as any,
        status: initialStatus as any,
        notes: params.notes,
        estimated_delivery_time: new Date(Date.now() + 40 * 60 * 1000).toISOString(),
      }])
      .select()
      .single();

    if (orderError) {
      console.error('Order creation error:', orderError);
      throw new Error('Erro ao criar pedido: ' + orderError.message);
    }

    return order.id;
  };

  const createOrderItems = async (orderId: string, cartItems: CreateOrderParams['cartItems']): Promise<void> => {
    updateProgress("Adicionando itens ao pedido...", 3);

    const orderItems = cartItems.map(item => ({
      order_id: orderId,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.unit_price * item.quantity,
      notes: item.notes,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Order items creation error:', itemsError);
      throw new Error('Erro ao adicionar itens ao pedido: ' + itemsError.message);
    }
  };

  const processPaymentGateway = async (orderId: string, establishment: any, totalAmount: number): Promise<{ whatsappUrl?: string; stripeUrl?: string }> => {
    const gateway = establishment.payment_gateway;
    
    if (gateway === 'whatsapp') {
      updateProgress("Preparando notificação WhatsApp...", 4);
      
      try {
        const { data: result, error } = await supabase.functions.invoke('whatsapp-unified-handler', {
          body: { 
            to: establishment.phone,
            message: '',
            messageType: 'order_summary',
            orderId,
            establishmentId: establishment.id
          }
        });

        if (error) {
          console.error('WhatsApp notification error:', error);
          // Don't fail the order if WhatsApp fails, just warn
          // Toast will be handled by the error handler if needed
        }

        // Generate WhatsApp URL for customer contact (i18n)
        const customerMessage = encodeURIComponent(
          buildCustomerContactMessage(orderId)
        );
        const whatsappUrl = `https://wa.me/55${establishment.phone.replace(/\D/g, '')}?text=${customerMessage}`;
        
        return { whatsappUrl };
      } catch (error) {
        console.error('WhatsApp processing error:', error);
        throw new Error('Erro ao configurar WhatsApp: ' + (error as Error).message);
      }
    } 
    
    else if (gateway === 'stripe') {
      updateProgress("Configurando pagamento Stripe...", 4);
      
      try {
        const { data: result, error } = await supabase.functions.invoke('create-stripe-checkout', {
          body: { 
            orderId,
            establishmentId: establishment.id,
            amount: Math.round(totalAmount * 100),
            currency: 'brl'
          }
        });

        if (error || !result?.url) {
          throw new Error('Erro no Stripe: ' + (error?.message || 'URL não gerada'));
        }

        return { stripeUrl: result.url };
      } catch (error) {
        console.error('Stripe processing error:', error);
        throw new Error('Erro ao configurar Stripe: ' + (error as Error).message);
      }
    }

    return {};
  };

  const sendNotifications = async (orderId: string): Promise<void> => {
    updateProgress("Enviando notificações...", 5);
    
    try {
      await supabase.functions.invoke('send-order-notification', {
        body: { orderId, type: 'new_order' }
      });
    } catch (error) {
      console.error('Notification error (non-fatal):', error);
      // Don't fail the order if notifications fail
    }
  };

  const executeWorkflow = async (params: CreateOrderParams) => {
    const totalSteps = 6;
    
    try {
      console.log('[ENHANCED-WORKFLOW] Starting enhanced order workflow');
      
      setWorkflowData({
        orderId: '',
        status: 'creating',
        progress: 'Iniciando processo...',
        gateway: 'unknown',
        currentStep: 0,
        totalSteps
      });

      // Step 1: Validate order and establishment
      const establishment = await validateOrder(params);
      
      // Step 2: Create order
      const orderId = await createOrder(params, establishment);
      setWorkflowData(prev => prev ? { ...prev, orderId } : null);

      // Step 3: Create order items
      await createOrderItems(orderId, params.cartItems);

      // Step 4: Process payment gateway
      setWorkflowData(prev => prev ? { 
        ...prev, 
        gateway: establishment.payment_gateway,
        status: 'processing' 
      } : null);
      
      const gatewayResult = await processPaymentGateway(
        orderId, 
        establishment, 
        params.subtotal + params.deliveryFee - (params.discountAmount || 0)
      );

      // Step 5: Send notifications
      await sendNotifications(orderId);

      // Step 6: Clear cart and complete
      updateProgress("Finalizando pedido...", 6);
      
      try {
        await clearCart(params.establishmentId);
      } catch (clearError) {
        console.error('[ENHANCED-WORKFLOW] Error clearing cart (non-fatal):', clearError);
      }

      // Complete workflow
      setWorkflowData(prev => prev ? {
        ...prev,
        status: 'completed',
        progress: 'Pedido criado com sucesso!',
        currentStep: totalSteps,
        ...gatewayResult
      } : null);

      console.log('[ENHANCED-WORKFLOW] Workflow completed successfully');
      
      return { 
        orderId, 
        gateway: establishment.payment_gateway, 
        ...gatewayResult 
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      // Use enhanced error handling
      handleError(error as Error, {
        context: 'enhanced_order_workflow',
        params: { establishmentId: params.establishmentId }
      }, true, errorMessage);
      
      setWorkflowData(prev => prev ? {
        ...prev,
        status: 'error',
        progress: errorMessage
      } : null);

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

// Helper function to check if establishment is open
function checkIfEstablishmentIsOpen(openingHours?: any): boolean {
  if (!openingHours) return true; // Assume open if no hours defined
  
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutes since midnight
  
  try {
    // Enhanced opening hours check
    if (typeof openingHours === 'object' && openingHours !== null) {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDayName = dayNames[currentDay];
      
      const dayHours = openingHours[currentDayName];
      
      if (!dayHours || dayHours.closed === true) {
        return false; // Closed today
      }
      
      if (dayHours.open && dayHours.close) {
        const [openHour, openMin] = dayHours.open.split(':').map(Number);
        const [closeHour, closeMin] = dayHours.close.split(':').map(Number);
        
        const openTime = openHour * 60 + openMin;
        const closeTime = closeHour * 60 + closeMin;
        
        // Handle cases where close time is next day (e.g., 02:00)
        if (closeTime < openTime) {
          return currentTime >= openTime || currentTime <= closeTime;
        } else {
          return currentTime >= openTime && currentTime <= closeTime;
        }
      }
    }
    
    return true; // Default to open if structure is not recognized
  } catch (error) {
    console.warn('Error checking opening hours:', error);
    return true; // Default to open if check fails
  }
}
