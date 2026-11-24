import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Promotion {
  id: string;
  title: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value: number;
  max_discount: number;
  start_date: string;
  end_date: string;
  usage_limit: number;
  usage_count: number;
  is_active: boolean;
  establishment_id: string;
  created_at: string;
}

export interface Review {
  id: string;
  customer_id: string;
  establishment_id: string;
  order_id: string;
  rating: number;
  comment: string;
  created_at: string;
  // Joined data
  customer_name?: string;
  customer_avatar?: string;
  // Response data
  response?: {
    id: string;
    response_text: string;
    responded_at: string;
    is_public: boolean;
  };
}

export function usePromotionsAndReviews() {
  const { user } = useAuth();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Get establishment ID
      const { data: establishment } = await supabase
        .from('establishments')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!establishment) return;

      // Load promotions
      const { data: promotionsData } = await supabase
        .from('promotions')
        .select('*')
        .eq('establishment_id', establishment.id)
        .order('created_at', { ascending: false });

      // Load reviews with customer data - using separate queries to avoid relation issues
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('*')
        .eq('establishment_id', establishment.id)
        .order('created_at', { ascending: false });

      // Get customer profiles separately
      const customerIds = [...new Set((reviewsData || []).map(review => review.customer_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, avatar_url')
        .in('user_id', customerIds);

      // Get review responses
      const reviewIds = (reviewsData || []).map(review => review.id);
      const { data: responses } = await supabase
        .from('review_responses')
        .select('id, review_id, response_text, responded_at, is_public')
        .in('review_id', reviewIds);

      const reviewsWithCustomerData = (reviewsData || []).map(review => ({
        ...review,
        customer_name: profiles?.find(profile => profile.user_id === review.customer_id)?.name || 'Cliente',
        customer_avatar: profiles?.find(profile => profile.user_id === review.customer_id)?.avatar_url || '',
        response: responses?.find(response => response.review_id === review.id) || null
      })) as Review[];

      setPromotions((promotionsData || []) as Promotion[]);
      setReviews(reviewsWithCustomerData);

    } catch (error) {
      console.error('Error loading promotions and reviews:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.type === 'establishment') {
      loadData();
    }
  }, [loadData, user?.type]);

  const createPromotion = async (promotionData: Omit<Promotion, 'id' | 'establishment_id' | 'created_at' | 'usage_count'>): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data: establishment } = await supabase
        .from('establishments')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!establishment) return false;

      const { data, error } = await supabase
        .from('promotions')
        .insert([{
          ...promotionData,
          establishment_id: establishment.id,
          usage_count: 0
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating promotion:', error);
        return false;
      }

      setPromotions(prev => [data as Promotion, ...prev]);
      return true;

    } catch (error) {
      console.error('Error creating promotion:', error);
      return false;
    }
  };

  const updatePromotion = async (promotionId: string, updates: Partial<Promotion>) => {
    try {
      const { error } = await supabase
        .from('promotions')
        .update(updates)
        .eq('id', promotionId);

      if (error) {
        console.error('Error updating promotion:', error);
        return false;
      }

      setPromotions(prev => 
        prev.map(promotion => 
          promotion.id === promotionId 
            ? { ...promotion, ...updates }
            : promotion
        )
      );

      return true;
    } catch (error) {
      console.error('Error updating promotion:', error);
      return false;
    }
  };

  const deletePromotion = async (promotionId: string) => {
    try {
      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', promotionId);

      if (error) {
        console.error('Error deleting promotion:', error);
        return false;
      }

      setPromotions(prev => prev.filter(promotion => promotion.id !== promotionId));
      return true;

    } catch (error) {
      console.error('Error deleting promotion:', error);
      return false;
    }
  };

  const refreshData = () => {
    loadData();
  };

  return {
    promotions,
    reviews,
    isLoading,
    createPromotion,
    updatePromotion,
    deletePromotion,
    refreshData
  };
}
