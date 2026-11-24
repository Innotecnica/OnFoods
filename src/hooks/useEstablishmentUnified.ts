import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Unified interface for establishment data
export interface UnifiedEstablishment {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  cnpj?: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  description: string;
  logo_url?: string;
  banner_url?: string;
  delivery_fee: number;
  minimum_order: number;
  delivery_time_min: number;
  delivery_time_max: number;
  latitude?: number;
  longitude?: number;
  rating: number;
  total_reviews: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  payment_gateway?: string;
  establishment_subscriptions?: Array<{
    status: string;
    current_period_end: string;
  }> | any;
}

// Unified establishment operations
export function useEstablishmentUnified() {
  const { user, isAuthenticated } = useAuth();
  const [establishment, setEstablishment] = useState<UnifiedEstablishment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load establishment by user ID
  const loadEstablishment = useCallback(async (userId?: string) => {
    const targetUserId = userId || user?.id;
    if (!targetUserId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('establishments')
        .select(`
          *,
          establishment_subscriptions (
            status,
            current_period_end
          )
        `)
        .eq('user_id', targetUserId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setEstablishment(null);
        } else {
          throw error;
        }
      } else {
        setEstablishment(data);
      }
    } catch (err) {
      console.error('Error loading establishment:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar estabelecimento');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Load establishment by ID
  const loadEstablishmentById = useCallback(async (establishmentId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('establishments')
        .select(`
          *,
          establishment_subscriptions (
            status,
            current_period_end
          )
        `)
        .eq('id', establishmentId)
        .single();

      if (error) throw error;
      setEstablishment(data);
    } catch (err) {
      console.error('Error loading establishment by ID:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar estabelecimento');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update establishment
  const updateEstablishment = useCallback(async (updates: Partial<UnifiedEstablishment>) => {
    if (!establishment) return false;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('establishments')
        .update(updates)
        .eq('id', establishment.id);

      if (error) throw error;

      setEstablishment(prev => prev ? { ...prev, ...updates } : null);
      
      toast({
        title: "Estabelecimento atualizado",
        description: "As alterações foram salvas com sucesso.",
      });

      return true;
    } catch (err) {
      console.error('Error updating establishment:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar estabelecimento');
      
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive"
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [establishment]);

  // Delete establishment
  const deleteEstablishment = useCallback(async () => {
    if (!establishment) return false;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('establishments')
        .delete()
        .eq('id', establishment.id);

      if (error) throw error;

      setEstablishment(null);
      
      toast({
        title: "Estabelecimento excluído",
        description: "O estabelecimento foi removido com sucesso.",
      });

      return true;
    } catch (err) {
      console.error('Error deleting establishment:', err);
      setError(err instanceof Error ? err.message : 'Erro ao excluir estabelecimento');
      
      toast({
        title: "Erro",
        description: "Não foi possível excluir o estabelecimento.",
        variant: "destructive"
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [establishment]);

  // Check if user has establishment
  const hasEstablishment = establishment !== null;

  // Check if establishment is active
  const isEstablishmentActive = establishment?.is_active || false;

  // Check subscription status
  const subscriptionStatus = establishment?.establishment_subscriptions?.[0]?.status || 'inactive';
  const isSubscriptionActive = subscriptionStatus === 'active';

  // Auto-load establishment on mount
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadEstablishment();
    }
  }, [isAuthenticated, user?.id, loadEstablishment]);

  return {
    // Data
    establishment,
    hasEstablishment,
    isEstablishmentActive,
    subscriptionStatus,
    isSubscriptionActive,
    
    // State
    isLoading,
    error,
    
    // Actions
    loadEstablishment,
    loadEstablishmentById,
    updateEstablishment,
    deleteEstablishment,
    refreshEstablishment: () => loadEstablishment(),
  };
}