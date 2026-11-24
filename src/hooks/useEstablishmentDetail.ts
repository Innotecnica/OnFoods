import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EstablishmentDetail {
  id: string;
  business_name: string;
  business_type: string;
  description: string;
  banner_url: string;
  logo_url: string;
  address: string;
  phone: string;
  email: string;
  delivery_fee: number;
  minimum_order: number;
  delivery_time_min: number;
  delivery_time_max: number;
  rating: number;
  total_reviews: number;
  is_active: boolean;
  opening_hours: any;
}

export function useEstablishmentDetail(id: string) {
  const [establishment, setEstablishment] = useState<EstablishmentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEstablishment = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('establishments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error loading establishment:', error);
        setError('Erro ao carregar estabelecimento');
        return;
      }

      if (data) {
        setEstablishment(data);
      } else {
        setError('Estabelecimento não encontrado');
      }
    } catch (error) {
      console.error('Error loading establishment:', error);
      setError('Erro ao carregar estabelecimento');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadEstablishment();
    }
  }, [id, loadEstablishment]);

  return {
    establishment,
    isLoading,
    error
  };
}
