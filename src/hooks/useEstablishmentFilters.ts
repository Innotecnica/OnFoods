import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface EstablishmentFilters {
  hasActiveSubscription?: boolean;
  hasStripeAccount?: boolean;
}

export function useEstablishmentFilters() {
  const [filteredEstablishments, setFilteredEstablishments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadEstablishmentsWithFilters = async (filters: EstablishmentFilters = {}) => {
    try {
      setIsLoading(true);

      // Get establishments with subscription and stripe account status
      const { data: establishments, error } = await supabase
        .from('establishments')
        .select(`
          *,
          establishment_subscriptions!inner(
            status,
            current_period_end
          ),
          stripe_connected_accounts!inner(
            charges_enabled,
            onboarding_completed
          )
        `)
        .eq('is_active', true);

      if (error) throw error;

      // Filter establishments based on criteria
      const filtered = establishments?.filter(establishment => {
        // Check active subscription
        const hasActiveSubscription = establishment.establishment_subscriptions &&
          establishment.establishment_subscriptions.status === 'active' && 
          new Date(establishment.establishment_subscriptions.current_period_end) > new Date();

        // Check Stripe account configured
        const hasStripeAccount = establishment.stripe_connected_accounts &&
          establishment.stripe_connected_accounts.charges_enabled && 
          establishment.stripe_connected_accounts.onboarding_completed;

        if (filters.hasActiveSubscription && !hasActiveSubscription) return false;
        if (filters.hasStripeAccount && !hasStripeAccount) return false;

        return true;
      }) || [];

      setFilteredEstablishments(filtered);
    } catch (error) {
      console.error('Error loading establishments with filters:', error);
      setFilteredEstablishments([]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    filteredEstablishments,
    isLoading,
    loadEstablishmentsWithFilters,
  };
}