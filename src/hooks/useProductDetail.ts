import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ProductDetail, ProductCategory, NutritionalInfo } from "@/types";
import { getCategoryByName } from "@/utils/productCategories";

type ProductDetailWithEstablishment = ProductDetail & {
  establishment?: {
    id: string;
    business_name: string;
    banner_url?: string | null;
    logo_url?: string | null;
    rating?: number | null;
    delivery_time_min?: number | null;
    delivery_time_max?: number | null;
    phone?: string | null;
  };
};

export function useProductDetail(id: string) {
  const [product, setProduct] = useState<ProductDetailWithEstablishment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProduct = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          establishments (
            id,
            business_name,
            banner_url,
            logo_url,
            rating,
            delivery_time_min,
            delivery_time_max,
            phone
          ),
          categories (
            id,
            name,
            description
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error loading product:', error);
        setError('Erro ao carregar produto');
        return;
      }

      if (data) {
        const categoryName = (data.categories as { name?: string } | null)?.name;
        const categoryFromCatalog = categoryName ? getCategoryByName(categoryName) : undefined;
        const category: ProductCategory | undefined = categoryFromCatalog ?? (
          categoryName
            ? {
                id: data.category_id,
                name: categoryName,
                icon: "",
                description: (data.categories as { description?: string } | null)?.description || ""
              }
            : undefined
        );

        const nutritionalInfo: NutritionalInfo = (data.nutritional_info || {}) as NutritionalInfo;

        const establishment = data.establishments as {
          id: string;
          business_name: string;
          banner_url?: string | null;
          logo_url?: string | null;
          rating?: number | null;
          delivery_time_min?: number | null;
          delivery_time_max?: number | null;
          phone?: string | null;
        } | undefined;

        const mapped: ProductDetailWithEstablishment = {
          id: data.id,
          name: data.name,
          description: data.description,
          price: data.price,
          image_url: data.image_url,
          is_available: data.is_available,
          preparation_time: data.preparation_time,
          created_at: data.created_at,
          establishment_id: data.establishment_id,
          ingredients: data.ingredients || [],
          allergens: data.allergens || [],
          nutritional_info: nutritionalInfo,
          category,
          tags: [],
          variants: [],
          average_rating: data.rating || 0,
          review_count: data.total_reviews || 0,
          has_promotion: false,
          establishment
        };

        setProduct(mapped);
      } else {
        setError('Produto não encontrado');
      }
    } catch (error) {
      console.error('Error loading product:', error);
      setError('Erro ao carregar produto');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadProduct();
    }
  }, [id, loadProduct]);

  return {
    product,
    isLoading,
    error
  };
}
