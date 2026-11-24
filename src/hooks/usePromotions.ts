import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Promotion {
  id: string;
  establishment_id: string;
  title: string;
  description?: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_value?: number;
  max_discount?: number;
  start_date: string;
  end_date: string;
  usage_limit?: number;
  usage_count: number;
  is_active: boolean;
  created_at: string;
}

export interface PromotionUsage {
  id: string;
  promotion_id: string;
  customer_id: string;
  order_id: string;
  discount_applied: number;
  used_at: string;
}

export interface AppliedPromotion {
  promotion: Promotion;
  discountAmount: number;
  finalTotal: number;
}

export function usePromotions() {
  const [availablePromotions, setAvailablePromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Get active promotions for an establishment
  const getPromotionsForEstablishment = async (establishmentId: string) => {
    try {
      setIsLoading(true);
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('establishment_id', establishmentId)
        .eq('is_active', true)
        .lte('start_date', now)
        .gte('end_date', now)
        .or(`usage_limit.is.null,usage_count.lt.usage_limit`);

      if (error) throw error;
      
      setAvailablePromotions((data as Promotion[]) || []);
      return data || [];
    } catch (error) {
      console.error('Error fetching promotions:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Validate and apply a promotion code using secure server-side validation
  const validatePromotionCode = async (
    code: string, 
    establishmentId: string, 
    orderTotal: number,
    customerId?: string,
    cartItems?: Array<{
      product_id: string;
      quantity: number;
      unit_price: number;
    }>
  ): Promise<AppliedPromotion | null> => {
    try {
      // Use server-side validation for security
      const { data, error } = await supabase.functions.invoke('validate-promotion', {
        body: {
          code: code.toUpperCase(),
          establishmentId,
          orderTotal,
          customerId,
          cartItems: cartItems || []
        }
      });

      if (error) {
        console.error('Server validation error:', error);
        throw new Error(error.message || 'Erro ao validar cupom');
      }

      if (!data.success) {
        throw new Error(data.error || 'Cupom inválido');
      }

      console.log('✅ Promotion validated successfully:', data.appliedPromotion);
      return data.appliedPromotion;

    } catch (error) {
      console.error('Client validation error:', error);
      
      // If server validation fails, fallback to client validation for better UX
      console.log('🔄 Falling back to client-side validation...');
      
      try {
        // Original client-side validation logic as fallback
        const now = new Date().toISOString();
        
        const { data: promotion, error: queryError } = await supabase
          .from('promotions')
          .select('*')
          .eq('establishment_id', establishmentId)
          .eq('title', code.toUpperCase())
          .eq('is_active', true)
          .lte('start_date', now)
          .gte('end_date', now)
          .single();

        if (queryError || !promotion) {
          throw new Error('Cupom inválido ou expirado');
        }

        // Check usage limit
        if (promotion.usage_limit && promotion.usage_count >= promotion.usage_limit) {
          throw new Error('Este cupom atingiu o limite de uso');
        }

        // Check minimum order value
        if (promotion.min_order_value && orderTotal < promotion.min_order_value) {
          throw new Error(`Pedido mínimo de R$ ${promotion.min_order_value.toFixed(2)} para usar este cupom`);
        }

        // Check if customer already used this promotion
        if (customerId) {
          const { data: usage, error: usageError } = await supabase
            .from('promotion_usage')
            .select('id')
            .eq('promotion_id', promotion.id)
            .eq('customer_id', customerId)
            .single();

          if (!usageError && usage) {
            throw new Error('Você já utilizou este cupom');
          }
        }

        // Calculate discount
        let discountAmount = 0;
        if (promotion.discount_type === 'percentage') {
          discountAmount = (orderTotal * promotion.discount_value) / 100;
          if (promotion.max_discount && discountAmount > promotion.max_discount) {
            discountAmount = promotion.max_discount;
          }
        } else {
          discountAmount = promotion.discount_value;
        }

        // Ensure discount doesn't exceed order total
        discountAmount = Math.min(discountAmount, orderTotal);
        const finalTotal = Math.max(0, orderTotal - discountAmount);

        return {
          promotion: promotion as Promotion,
          discountAmount,
          finalTotal
        };

      } catch (fallbackError) {
        const message = fallbackError instanceof Error ? fallbackError.message : 'Erro ao validar cupom';
        throw new Error(message);
      }
    }
  };

  // Apply promotion to an order (called during checkout)
  const applyPromotionToOrder = async (
    promotionId: string,
    customerId: string,
    orderId: string,
    discountAmount: number
  ) => {
    try {
      // Record promotion usage
      const { error: usageError } = await supabase
        .from('promotion_usage')
        .insert([{
          promotion_id: promotionId,
          customer_id: customerId,
          order_id: orderId,
          discount_applied: discountAmount,
        }]);

      if (usageError) throw usageError;

      // First get current usage count, then increment
      const { data: currentPromotion, error: fetchError } = await supabase
        .from('promotions')
        .select('usage_count')
        .eq('id', promotionId)
        .single();

      if (fetchError) throw fetchError;

      // Update promotion usage count
      const { error: updateError } = await supabase
        .from('promotions')
        .update({ 
          usage_count: (currentPromotion.usage_count || 0) + 1
        })
        .eq('id', promotionId);

      if (updateError) throw updateError;

      return true;
    } catch (error) {
      console.error('Error applying promotion to order:', error);
      throw new Error('Erro ao aplicar promoção ao pedido');
    }
  };

  // Get customer's promotion usage history
  const getCustomerPromotionUsage = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('promotion_usage')
        .select(`
          *,
          promotion:promotions(*)
        `)
        .eq('customer_id', customerId)
        .order('used_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching promotion usage:', error);
      return [];
    }
  };

  return {
    availablePromotions,
    isLoading,
    getPromotionsForEstablishment,
    validatePromotionCode,
    applyPromotionToOrder,
    getCustomerPromotionUsage,
  };
}