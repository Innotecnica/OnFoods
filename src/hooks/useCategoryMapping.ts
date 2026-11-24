import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { env } from '@/utils/environment';

interface CategoryMapping {
  id: string;
  name: string;
}

export function useCategoryMapping() {
  const [categories, setCategories] = useState<CategoryMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCategories = useCallback(async () => {
    try {
      const supabaseUrl = env.getSupabaseUrl();
      const supabaseKey = env.getSupabaseAnonKey();
      if (!supabaseUrl || !supabaseKey) {
        if (env.isDevelopment()) {
          console.warn('Supabase configuration missing for categories – skipping fetch in dev');
          setCategories([]);
          setIsLoading(false);
          return;
        }
      }

      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');

      if (error) throw error;

      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const getCategoryIdByName = (categoryName: string): string | null => {
    if (!categoryName || categoryName === 'all') return null;
    
    const category = categories.find(cat => 
      cat.name.toLowerCase() === categoryName.toLowerCase()
    );
    
    return category?.id || null;
  };

  const getCategoryNameById = (categoryId: string): string | null => {
    if (!categoryId) return null;
    
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || null;
  };

  return {
    categories,
    isLoading,
    getCategoryIdByName,
    getCategoryNameById
  };
}
