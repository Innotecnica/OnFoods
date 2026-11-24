import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Establishment {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  cnpj?: string;
  address?: string;
  phone?: string;
  email?: string;
  description?: string;
  logo_url?: string;
  banner_url?: string;
  opening_hours?: any;
  delivery_fee: number;
  minimum_order: number;
  delivery_time_min: number;
  delivery_time_max: number;
  is_active: boolean;
  rating: number;
  total_reviews: number;
  created_at: string;
  updated_at: string;
  payment_gateway?: string;
}

export function useEstablishmentAuth() {
  const { user, isAuthenticated } = useAuth();
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadEstablishmentData = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Enhanced security: validate user type before query
      if (user.type !== 'establishment') {
        console.warn('Non-establishment user attempting to load establishment data');
        setEstablishment(null);
        return;
      }

      const { data, error } = await supabase
        .from('establishments')
        .select(`
          id, user_id, business_name, business_type, cnpj, address, phone, email,
          description, logo_url, banner_url, opening_hours, delivery_fee,
          minimum_order, delivery_time_min, delivery_time_max, is_active,
          rating, total_reviews, created_at, updated_at, payment_gateway
        `)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error loading establishment:', error);
        // Don't expose internal errors to UI
        return;
      }
      
      if (data) {
        // Validate establishment data integrity
        if (data.user_id !== user.id) {
          console.error('Establishment user_id mismatch - possible security issue');
          return;
        }
        setEstablishment(data);
      }
    } catch (error) {
      console.error('Error loading establishment data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated || !user || user.type !== 'establishment') {
      setIsLoading(false);
      setEstablishment(null);
      return;
    }

    loadEstablishmentData();
  }, [user, isAuthenticated, loadEstablishmentData]);

  const refreshEstablishment = () => {
    loadEstablishmentData();
  };

  const updateEstablishment = async (updates: Partial<Establishment>) => {
    if (!user || !establishment) return false;

    try {
      // Additional security validation
      if (user.type !== 'establishment') {
        console.error('Non-establishment user attempting to update establishment');
        return false;
      }

      // Sanitize updates - remove sensitive fields that shouldn't be updated directly
      const { user_id, id, created_at, ...sanitizedUpdates } = updates as any;
      
      const { data, error } = await supabase
        .from('establishments')
        .update({
          ...sanitizedUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('id', establishment.id) // Double verification
        .select()
        .single();

      if (error) {
        console.error('Error updating establishment:', error);
        return false;
      }

      if (data) {
        // Verify returned data belongs to current user
        if (data.user_id !== user.id) {
          console.error('Update returned data for different user - security issue');
          return false;
        }
        setEstablishment(data);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error updating establishment:', error);
      return false;
    }
  };

  return {
    establishment,
    isLoading,
    refreshEstablishment,
    updateEstablishment,
    isEstablishment: user?.type === 'establishment' && isAuthenticated,
    hasEstablishment: !!establishment
  };
}
