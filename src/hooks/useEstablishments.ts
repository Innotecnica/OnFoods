import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLocationBasedSearch } from "./useLocationBasedSearch";
import { LocationData } from "./useGeolocation";
import { isEstablishmentComplete } from "@/utils/establishmentValidation";

export interface Establishment {
  id: string;
  business_name: string;
  business_type: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  delivery_fee: number;
  minimum_order: number;
  delivery_time_min: number;
  delivery_time_max: number;
  is_active: boolean;
  rating: number;
  total_reviews: number;
  created_at: string;
  payment_gateway?: string;
}

export function useEstablishments() {
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEstablishments();
  }, []);

  const loadEstablishments = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('establishments')
        .select(`
          *,
          establishment_subscriptions(
            status,
            current_period_end
          ),
          stripe_connected_accounts(
            charges_enabled,
            onboarding_completed
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Show establishments that meet the basic criteria:
      // 1. Profile is complete (all required fields filled)
      // 2. Active subscription OR WhatsApp gateway configured
      const filtered = data?.filter(establishment => {
        // Check if establishment profile is complete
        const isComplete = isEstablishmentComplete(establishment);
        
        const subscription = establishment.establishment_subscriptions?.[0];
        const stripeAccount = establishment.stripe_connected_accounts?.[0];
        
        const hasActiveSubscription = subscription?.status === 'active' && 
          subscription.current_period_end && 
          new Date(subscription.current_period_end) > new Date();

        const hasStripeAccount = stripeAccount?.charges_enabled && 
          stripeAccount?.onboarding_completed;

        const hasWhatsAppGateway = establishment.payment_gateway === 'whatsapp';

        // Show if profile is complete AND (has subscription OR WhatsApp gateway)
        return isComplete && (hasActiveSubscription || hasWhatsAppGateway);
      }) || [];

      setEstablishments(filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar estabelecimentos');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    establishments,
    isLoading,
    error,
    refetch: loadEstablishments,
  };
}