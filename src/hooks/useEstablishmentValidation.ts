import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface EstablishmentValidation {
  hasEstablishment: boolean;
  hasActiveSubscription: boolean;
  hasStripeAccount: boolean;
  hasPaymentGateway: boolean;
  isFullyConfigured: boolean;
  establishment: any;
  subscription: any;
  stripeAccount: any;
}

export function useEstablishmentValidation() {
  const { user, isAuthenticated } = useAuth();
  const [validation, setValidation] = useState<EstablishmentValidation>({
    hasEstablishment: false,
    hasActiveSubscription: false,
    hasStripeAccount: false,
    hasPaymentGateway: false,
    isFullyConfigured: false,
    establishment: null,
    subscription: null,
    stripeAccount: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadValidationData = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Get establishment
      const { data: establishment, error: estError } = await supabase
        .from('establishments')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (estError) {
        console.error('Error loading establishment:', estError);
        return;
      }

      if (!establishment) {
        setValidation(prev => ({ ...prev, hasEstablishment: false }));
        return;
      }

      // Get subscription
      const { data: subscription, error: subError } = await supabase
        .from('establishment_subscriptions')
        .select('*')
        .eq('establishment_id', establishment.id)
        .maybeSingle();

      // Get Stripe account
      const { data: stripeAccount, error: stripeError } = await supabase
        .from('stripe_connected_accounts')
        .select('*')
        .eq('establishment_id', establishment.id)
        .maybeSingle();

      const hasActiveSubscription = subscription?.status === 'active' && 
        new Date(subscription.current_period_end) > new Date();

      const hasStripeAccount = stripeAccount?.charges_enabled && 
        stripeAccount?.onboarding_completed;

      // Check if payment gateway is configured (any gateway except 'none')
      const hasPaymentGateway = establishment.payment_gateway && 
        establishment.payment_gateway !== 'none';

      console.log('[VALIDATION DEBUG]', {
        payment_gateway: establishment.payment_gateway,
        hasPaymentGateway,
        hasActiveSubscription,
        hasStripeAccount
      });

      // Check if user wants to skip configuration temporarily
      const skipConfiguration = localStorage.getItem('skipConfiguration') === 'true';
      
      // Payment gateway is required for full functionality
      // WhatsApp is considered a valid default configuration
      const needsPaymentConfiguration = !establishment.payment_gateway || establishment.payment_gateway === 'none';
      
      // Para WhatsApp, considera como configuração válida (pagamento na entrega)
      // Para Stripe, verifica se a conta está configurada
      // Se tem assinatura ativa, considera sempre como válido
      const hasValidPaymentSetup = hasActiveSubscription || (hasPaymentGateway && (
        establishment.payment_gateway === 'whatsapp' || 
        (establishment.payment_gateway === 'stripe' && hasStripeAccount)
      ));
      
      console.log('[VALIDATION DEBUG - Payment Setup]', {
        hasValidPaymentSetup,
        isWhatsApp: establishment.payment_gateway === 'whatsapp',
        isStripe: establishment.payment_gateway === 'stripe',
        needsPaymentConfiguration,
        hasActiveSubscription
      });
      
      // Com assinatura ativa, sistema está sempre totalmente configurado
      const isFullyConfigured = hasActiveSubscription || skipConfiguration || (hasActiveSubscription && hasValidPaymentSetup);

      console.log('[VALIDATION DEBUG - Final]', {
        isFullyConfigured,
        skipConfiguration,
        hasActiveSubscription,
        hasValidPaymentSetup
      });

      setValidation({
        hasEstablishment: true,
        hasActiveSubscription,
        hasStripeAccount,
        hasPaymentGateway,
        isFullyConfigured,
        establishment,
        subscription,
        stripeAccount,
      });

    } catch (error) {
      console.error('Error loading validation data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated || !user || user.type !== 'establishment') {
      setIsLoading(false);
      return;
    }

    loadValidationData();
  }, [isAuthenticated, user, loadValidationData]);

  const refreshValidation = () => {
    loadValidationData();
  };

  return {
    validation,
    isLoading,
    refreshValidation,
  };
}
