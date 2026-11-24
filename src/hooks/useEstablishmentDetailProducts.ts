import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isEstablishmentComplete } from "@/utils/establishmentValidation";
import { logger } from "@/utils/logger";
import { ProductWithCategory, ApiResponse } from "@/types";

// Use centralized type instead of local interface
export type EstablishmentProduct = ProductWithCategory;

export function useEstablishmentDetailProducts(establishmentId: string): ApiResponse<EstablishmentProduct[]> {
  const [state, setState] = useState<ApiResponse<EstablishmentProduct[]>>({
    data: [],
    error: null,
    isLoading: true
  });

  const loadEstablishment = useCallback(async () => {
    if (!establishmentId) {
      setState({ data: [], error: 'ID do estabelecimento é obrigatório', isLoading: false });
      return null;
    }

    try {
      const { data: establishment, error: establishmentError } = await supabase
        .from('establishments')
        .select(`
          business_name,
          business_type,
          address,
          phone,
          delivery_fee,
          minimum_order,
          delivery_time_min,
          delivery_time_max
        `)
        .eq('id', establishmentId)
        .single();

      if (establishmentError) {
        logger.error('Error loading establishment', establishmentError);
        return null;
      }

      return establishment;
    } catch (error) {
      logger.error('Unexpected error loading establishment', error);
      return null;
    }
  }, [establishmentId]);

  const loadProducts = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // First check if establishment is complete
      const establishment = await loadEstablishment();
      if (!establishment) {
        setState({ data: [], error: 'Estabelecimento não encontrado', isLoading: false });
        return;
      }

      // Check if establishment profile is complete
      if (!isEstablishmentComplete(establishment)) {
        setState({ 
          data: [], 
          error: 'Este estabelecimento ainda não concluiu seu cadastro. Produtos não disponíveis.', 
          isLoading: false 
        });
        return;
      }

      // Load products only if establishment is complete
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          price,
          image_url,
          category_id,
          is_available,
          preparation_time,
          rating,
          total_reviews,
          created_at,
          establishment_id,
          categories (
            id,
            name
          )
        `)
        .eq('establishment_id', establishmentId)
        .eq('is_available', true)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error loading products', error);
        setState({ data: [], error: 'Erro ao carregar produtos', isLoading: false });
        return;
      }

      const productsWithCategoryNames = (data || []).map(product => ({
        ...product,
        category_name: product.categories?.name || 'Sem categoria'
      }));

      setState({ data: productsWithCategoryNames, error: null, isLoading: false });
    } catch (error) {
      logger.error('Unexpected error loading products', error);
      setState({ data: [], error: 'Erro ao carregar produtos', isLoading: false });
    }
  }, [establishmentId, loadEstablishment]);

  useEffect(() => {
    if (establishmentId) {
      loadProducts();
    }
  }, [establishmentId, loadProducts]);

  return state;
}