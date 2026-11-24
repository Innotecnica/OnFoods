import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface ProductReview {
  id: string;
  customer_id: string;
  product_id: string;
  order_id?: string;
  rating: number;
  comment?: string;
  created_at: string;
  customer: {
    name: string;
    avatar_url?: string;
  };
}

export interface CreateProductReviewData {
  product_id: string;
  rating: number;
  comment?: string;
  order_id?: string;
}

export function useProductReviews(productId?: string) {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const loadProductReviews = useCallback(async () => {
    if (!productId) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('product_reviews')
        .select(`
          id,
          customer_id,
          product_id,
          order_id,
          rating,
          comment,
          created_at
        `)
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading product reviews:', error);
        setError('Erro ao carregar avaliações');
        return;
      }

      // Get customer profiles separately to avoid relation issues
      const customerIds = [...new Set((data || []).map(review => review.customer_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, avatar_url')
        .in('user_id', customerIds);

      const reviewsWithCustomers = (data || []).map(review => ({
        ...review,
        customer: profiles?.find(profile => profile.user_id === review.customer_id) || {
          name: 'Usuário Anônimo',
          avatar_url: undefined
        }
      }));

      setReviews(reviewsWithCustomers);
    } catch (error) {
      console.error('Error loading product reviews:', error);
      setError('Erro ao carregar avaliações');
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (productId) {
      loadProductReviews();
    }
  }, [productId, loadProductReviews]);

  const createReview = async (reviewData: CreateProductReviewData) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para avaliar um produto.",
        variant: "destructive"
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('product_reviews')
        .insert({
          customer_id: user.id,
          product_id: reviewData.product_id,
          rating: reviewData.rating,
          comment: reviewData.comment,
          order_id: reviewData.order_id
        });

      if (error) {
        console.error('Error creating product review:', error);
        toast({
          title: "Erro",
          description: "Erro ao criar avaliação. Tente novamente.",
          variant: "destructive"
        });
        return false;
      }

      toast({
        title: "Avaliação criada!",
        description: "Sua avaliação foi registrada com sucesso."
      });

      // Reload reviews to show the new one
      await loadProductReviews();
      return true;
    } catch (error) {
      console.error('Error creating product review:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar avaliação. Tente novamente.",
        variant: "destructive"
      });
      return false;
    }
  };

  const updateReview = async (reviewId: string, rating: number, comment?: string) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para atualizar uma avaliação.",
        variant: "destructive"
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('product_reviews')
        .update({
          rating,
          comment
        })
        .eq('id', reviewId)
        .eq('customer_id', user.id);

      if (error) {
        console.error('Error updating product review:', error);
        toast({
          title: "Erro",
          description: "Erro ao atualizar avaliação. Tente novamente.",
          variant: "destructive"
        });
        return false;
      }

      toast({
        title: "Avaliação atualizada!",
        description: "Sua avaliação foi atualizada com sucesso."
      });

      // Reload reviews to show the updated one
      await loadProductReviews();
      return true;
    } catch (error) {
      console.error('Error updating product review:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar avaliação. Tente novamente.",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    reviews,
    isLoading,
    error,
    createReview,
    updateReview,
    refreshReviews: loadProductReviews
  };
}
