import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { env } from "@/utils/environment";

const stripePromise = loadStripe(env.getStripeKey());

export function useStripePayment() {
  const [isProcessing, setIsProcessing] = useState(false);

  const createPaymentIntent = async (orderId: string, couponCode?: string) => {
    try {
      setIsProcessing(true);

      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: { orderId, couponCode }
      });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao processar pagamento",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const processPayment = async (orderId: string) => {
    try {
      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe não carregado");

      const paymentData = await createPaymentIntent(orderId);
      
      const { error } = await stripe.confirmPayment({
        clientSecret: paymentData.client_secret,
        confirmParams: {
          return_url: `${window.location.origin}/orders?payment_success=true&order_id=${orderId}`,
        },
      });

      if (error) {
        toast({
          title: "Erro no pagamento",
          description: error.message || "Erro ao processar pagamento",
          variant: "destructive",
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error processing payment:', error);
      return false;
    }
  };

  return {
    isProcessing,
    processPayment,
    createPaymentIntent,
  };
}