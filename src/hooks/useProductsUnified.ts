import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { NutritionalInfo, ProductCategory } from "@/types";

// Unified product interface
export interface UnifiedProduct {
  id: string;
  establishment_id: string;
  category_id?: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  is_available: boolean;
  preparation_time: number;
  ingredients?: string[];
  allergens?: string[];
  nutritional_info?: NutritionalInfo;
  average_rating?: number;
  review_count?: number;
  created_at: string;
  updated_at: string;
  
  // Additional fields for enhanced functionality
  establishment?: {
    business_name: string;
    city: string;
    state: string;
    delivery_fee: number;
  };
  category?: ProductCategory | null;
}

// Search and filter options
export interface ProductFilters {
  query?: string;
  categoryId?: string;
  establishmentId?: string;
  city?: string;
  state?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  onlyAvailable?: boolean;
  sortBy?: 'name' | 'price_asc' | 'price_desc' | 'rating' | 'created_at';
  limit?: number;
}

export function useProductsUnified() {
  const { user } = useAuth();
  const [products, setProducts] = useState<UnifiedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Search products with filters
  const searchProducts = useCallback(async (filters: ProductFilters = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('products')
        .select(`
          *,
          establishments!inner (
            business_name,
            city,
            state,
            delivery_fee,
            is_active
          )
        `, { count: 'exact' });

      // Apply filters
      if (filters.query) {
        query = query.ilike('name', `%${filters.query}%`);
      }

      if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }

      if (filters.establishmentId) {
        query = query.eq('establishment_id', filters.establishmentId);
      }

      if (filters.city) {
        query = query.eq('establishments.city', filters.city);
      }

      if (filters.state) {
        query = query.eq('establishments.state', filters.state);
      }

      if (filters.minPrice) {
        query = query.gte('price', filters.minPrice);
      }

      if (filters.maxPrice) {
        query = query.lte('price', filters.maxPrice);
      }

      if (filters.minRating) {
        query = query.gte('average_rating', filters.minRating);
      }

      if (filters.onlyAvailable) {
        query = query.eq('is_available', true);
      }

      // Only show products from active establishments
      query = query.eq('establishments.is_active', true);

      // Apply sorting
      switch (filters.sortBy) {
        case 'price_asc':
          query = query.order('price', { ascending: true });
          break;
        case 'price_desc':
          query = query.order('price', { ascending: false });
          break;
        case 'rating':
          query = query.order('average_rating', { ascending: false });
          break;
        case 'created_at':
          query = query.order('created_at', { ascending: false });
          break;
        default:
          query = query.order('name', { ascending: true });
      }

      // Apply limit
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      // Transform data to include nested objects properly
      const transformedProducts = data?.map(product => ({
        ...product,
        establishment: product.establishments,
        category: null, // Categories will be loaded separately if needed
      })) || [];

      setProducts(transformedProducts);
      setTotalCount(count || 0);

    } catch (err) {
      console.error('Error searching products:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar produtos');
      setProducts([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load products for establishment
  const loadEstablishmentProducts = useCallback(async (establishmentId: string) => {
    return searchProducts({ establishmentId, sortBy: 'name' });
  }, [searchProducts]);

  // Get single product
  const getProduct = useCallback(async (productId: string): Promise<UnifiedProduct | null> => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          establishments (
            business_name,
            city,
            state,
            delivery_fee
          )
        `)
        .eq('id', productId)
        .single();

      if (error) throw error;

      return {
        ...data,
        establishment: data.establishments,
        category: null, // Categories will be loaded separately if needed
      };
    } catch (err) {
      console.error('Error getting product:', err);
      return null;
    }
  }, []);

  // Create product (for establishment owners)
  const createProduct = useCallback(async (productData: Omit<UnifiedProduct, 'id' | 'created_at' | 'updated_at' | 'establishment' | 'category'>) => {
    if (!user) return null;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Produto criado",
        description: "O produto foi adicionado com sucesso.",
      });

      return data;
    } catch (err) {
      console.error('Error creating product:', err);
      setError(err instanceof Error ? err.message : 'Erro ao criar produto');
      
      toast({
        title: "Erro",
        description: "Não foi possível criar o produto.",
        variant: "destructive"
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Update product
  const updateProduct = useCallback(async (productId: string, updates: Partial<UnifiedProduct>) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', productId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setProducts(prev => 
        prev.map(product => 
          product.id === productId ? { ...product, ...updates } : product
        )
      );

      toast({
        title: "Produto atualizado",
        description: "As alterações foram salvas com sucesso.",
      });

      return data;
    } catch (err) {
      console.error('Error updating product:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar produto');
      
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o produto.",
        variant: "destructive"
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Delete product
  const deleteProduct = useCallback(async (productId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      // Update local state
      setProducts(prev => prev.filter(product => product.id !== productId));

      toast({
        title: "Produto excluído",
        description: "O produto foi removido com sucesso.",
      });

      return true;
    } catch (err) {
      console.error('Error deleting product:', err);
      setError(err instanceof Error ? err.message : 'Erro ao excluir produto');
      
      toast({
        title: "Erro",
        description: "Não foi possível excluir o produto.",
        variant: "destructive"
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    // Data
    products,
    totalCount,
    
    // State
    isLoading,
    error,
    
    // Actions
    searchProducts,
    loadEstablishmentProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    
    // Utils
    clearProducts: () => setProducts([]),
  };
}
