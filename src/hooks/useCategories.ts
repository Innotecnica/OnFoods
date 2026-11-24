import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_CATEGORIES, ProductCategory } from "@/utils/productCategories";

interface Category {
  name: string;
  icon: string;
  count: number;
  description?: string;
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategoriesFallback = useCallback(async () => {
    try {
      const { data: establishments, error } = await supabase
        .from('establishments')
        .select('business_type')
        .eq('is_active', true);

      if (error) throw error;

      const businessTypeCounts: { [key: string]: number } = {};
      establishments?.forEach(est => {
        if (est.business_type) {
          const type = est.business_type.toLowerCase();
          businessTypeCounts[type] = (businessTypeCounts[type] || 0) + 1;
        }
      });

      const fallbackCategories: Category[] = PRODUCT_CATEGORIES.map(category => {
        let count = 0;
        const categoryMappings: { [key: string]: string[] } = {
          'Pizza': ['pizzaria', 'pizza'],
          'Hambúrguer': ['hamburgueria', 'burguer', 'hamburguer'],
          'Japonesa': ['japonesa', 'sushi', 'japonês'],
          'Italiana': ['italiana', 'italiano'],
          'Brasileira': ['brasileira', 'brasileiro', 'restaurante'],
          'Doces': ['padaria', 'confeitaria', 'doceria', 'doces'],
          'Café': ['cafeteria', 'cafe', 'café'],
          'Fast Food': ['fast food', 'lanchonete'],
          'Churrasco': ['churrascaria', 'churrasco'],
          'Árabe': ['arabe', 'árabe'],
          'Chinesa': ['chinesa', 'chines'],
          'Mexicana': ['mexicana', 'mexicano'],
          'Vegetariana': ['vegetariana', 'vegetariano'],
          'Frutos do Mar': ['frutos do mar', 'peixaria'],
          'Petiscos': ['bar', 'boteco', 'petiscaria']
        };
        const mappings = categoryMappings[category.name] || [category.name.toLowerCase()];
        mappings.forEach(mapping => {
          count += businessTypeCounts[mapping] || 0;
        });
        const popularCategories = ['Pizza', 'Hambúrguer', 'Japonesa', 'Italiana', 'Brasileira', 'Doces', 'Café', 'Saladas', 'Sanduíches', 'Fast Food'];
        if (popularCategories.includes(category.name) && count === 0) {
          count = 1;
        }
        return {
          name: category.name,
          icon: category.icon,
          description: category.description,
          count
        };
      });

      const mappedCategories = [...fallbackCategories];
      Object.keys(businessTypeCounts).forEach(type => {
        const existingCategory = mappedCategories.find(cat => 
          cat.name.toLowerCase().includes(type) || 
          type.includes(cat.name.toLowerCase())
        );
        if (!existingCategory && businessTypeCounts[type] > 0) {
          mappedCategories.push({
            name: type.charAt(0).toUpperCase() + type.slice(1),
            icon: "🍽️",
            count: businessTypeCounts[type]
          });
        }
      });

      setCategories(mappedCategories);
    } catch (err) {
      console.error('Fallback categories loading failed:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar categorias');
      setCategories(PRODUCT_CATEGORIES.map(category => ({
        name: category.name,
        icon: category.icon,
        description: category.description,
        count: Math.floor(Math.random() * 5) + 1
      })));
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Try to use the edge function first
      const { data, error: functionError } = await supabase.functions.invoke('get-categories-stats');

      if (functionError) {
        console.warn('Edge function failed, using fallback:', functionError);
        await loadCategoriesFallback();
        return;
      }

      if (data?.success && data?.data) {
        setCategories(data.data);
      } else {
        await loadCategoriesFallback();
      }
    } catch (err) {
      console.error('Error loading categories:', err);
      await loadCategoriesFallback();
    } finally {
      setIsLoading(false);
    }
  }, [loadCategoriesFallback]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  return {
    categories,
    isLoading,
    error,
    refetch: loadCategories
  };
}
