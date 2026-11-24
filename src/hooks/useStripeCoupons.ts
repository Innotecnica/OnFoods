import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface StripeCoupon {
  id: string;
  name?: string;
  percent_off?: number;
  amount_off?: number;
  currency?: string;
  valid: boolean;
  reason?: string;
}

export function useStripeCoupons() {
  const [isValidating, setIsValidating] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<StripeCoupon | null>(null);

  const validateCoupon = async (couponCode: string): Promise<StripeCoupon | null> => {
    if (!couponCode.trim()) {
      toast({
        title: "Erro",
        description: "Digite um código de cupom válido",
        variant: "destructive",
      });
      return null;
    }

    setIsValidating(true);

    try {
      console.log('🎫 [COUPON] Validating coupon:', couponCode);

      const { data, error } = await supabase.functions.invoke('validate-stripe-coupon', {
        body: { couponCode: couponCode.trim().toUpperCase() }
      });

      if (error) {
        console.error('❌ [COUPON] Error validating:', error);
        toast({
          title: "Erro no cupom",
          description: error.message || "Erro ao validar cupom",
          variant: "destructive",
        });
        return null;
      }

      console.log('✅ [COUPON] Validation result:', data);

      if (!data.valid) {
        toast({
          title: "Cupom inválido",
          description: data.reason || "Este cupom não é válido ou expirou",
          variant: "destructive",
        });
        return null;
      }

      const coupon: StripeCoupon = {
        id: data.id,
        name: data.name,
        percent_off: data.percent_off,
        amount_off: data.amount_off,
        currency: data.currency,
        valid: true
      };

      setAppliedCoupon(coupon);

      toast({
        title: "Cupom aplicado!",
        description: `Desconto de ${
          coupon.percent_off 
            ? `${coupon.percent_off}%` 
            : `R$ ${((coupon.amount_off || 0) / 100).toFixed(2)}`
        } aplicado com sucesso`,
      });

      return coupon;
    } catch (error) {
      console.error('❌ [COUPON] Unexpected error:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao validar cupom",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsValidating(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    toast({
      title: "Cupom removido",
      description: "O cupom foi removido do seu pedido",
    });
  };

  const getDiscountText = (coupon: StripeCoupon): string => {
    if (coupon.percent_off) {
      return `${coupon.percent_off}% de desconto`;
    }
    if (coupon.amount_off) {
      return `R$ ${((coupon.amount_off) / 100).toFixed(2)} de desconto`;
    }
    return "Desconto aplicado";
  };

  const calculateDiscount = (amount: number, coupon: StripeCoupon): number => {
    if (coupon.percent_off) {
      return Math.round(amount * (coupon.percent_off / 100));
    }
    if (coupon.amount_off) {
      return Math.min(coupon.amount_off, amount);
    }
    return 0;
  };

  return {
    validateCoupon,
    removeCoupon,
    appliedCoupon,
    isValidating,
    getDiscountText,
    calculateDiscount
  };
}