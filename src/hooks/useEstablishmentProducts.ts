import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category_id: string;
  establishment_id: string;
  image_url: string;
  ingredients: string[];
  allergens: string[];
  nutritional_info: any;
  preparation_time: number;
  is_available: boolean;
  rating?: number;
  total_reviews?: number;
  created_at: string;
  updated_at: string;
  // Joined data
  category_name?: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  establishment_id: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export function useEstablishmentProducts() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Get establishment ID (only if active)
      const { data: establishment } = await supabase
        .from('establishments')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!establishment) return;

      // Load categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .eq('establishment_id', establishment.id)
        .eq('is_active', true)
        .order('display_order');

      // Load products with category names
      const { data: productsData } = await supabase
        .from('products')
        .select(`
          *,
          categories (
            name
          )
        `)
        .eq('establishment_id', establishment.id)
        .order('created_at', { ascending: false });

      setCategories(categoriesData || []);
      
      const productsWithCategoryNames = (productsData || []).map(product => ({
        ...product,
        category_name: (product.categories as any)?.name || 'Sem categoria'
      })) as Product[];

      setProducts(productsWithCategoryNames);

    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.type === 'establishment') {
      loadData();
    }
  }, [loadData, user?.type]);

  const createProduct = async (productData: Omit<Product, 'id' | 'establishment_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return false;

    try {
      const { data: establishment } = await supabase
        .from('establishments')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!establishment) return false;

      const { data, error } = await supabase
        .from('products')
        .insert([{
          ...productData,
          establishment_id: establishment.id
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating product:', error);
        return false;
      }

      // Add to local state
      setProducts(prev => [data, ...prev]);
      return true;

    } catch (error) {
      console.error('Error creating product:', error);
      return false;
    }
  };

  const updateProduct = async (productId: string, updates: Partial<Product>) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (error) {
        console.error('Error updating product:', error);
        return false;
      }

      // Update local state
      setProducts(prev => 
        prev.map(product => 
          product.id === productId 
            ? { ...product, ...updates, updated_at: new Date().toISOString() }
            : product
        )
      );

      return true;
    } catch (error) {
      console.error('Error updating product:', error);
      return false;
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) {
        console.error('Error deleting product:', error);
        return false;
      }

      // Remove from local state
      setProducts(prev => prev.filter(product => product.id !== productId));
      return true;

    } catch (error) {
      console.error('Error deleting product:', error);
      return false;
    }
  };

  const toggleProductAvailability = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return false;

    return updateProduct(productId, { is_available: !product.is_available });
  };

  const createCategory = async (categoryData: Omit<Category, 'id' | 'establishment_id' | 'created_at'>) => {
    if (!user) return false;

    try {
      const { data: establishment } = await supabase
        .from('establishments')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!establishment) return false;

      const { data, error } = await supabase
        .from('categories')
        .insert([{
          ...categoryData,
          establishment_id: establishment.id
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating category:', error);
        return false;
      }

      setCategories(prev => [...prev, data]);
      return true;

    } catch (error) {
      console.error('Error creating category:', error);
      return false;
    }
  };

  const refreshData = () => {
    loadData();
  };

  return {
    products,
    categories,
    isLoading,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleProductAvailability,
    createCategory,
    refreshData
  };
}
