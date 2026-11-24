import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Review {
  id: string;
  customer_id: string;
  establishment_id: string;
  order_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  customer: {
    name: string;
    avatar_url: string | null;
    email: string;
  };
  response?: {
    id: string;
    response_text: string;
    responded_at: string;
    is_public: boolean;
  };
}

export function useEstablishmentReviews(establishmentId: string) {
  return useQuery({
    queryKey: ["establishment-reviews", establishmentId],
    queryFn: async () => {
      const { data: reviews, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("establishment_id", establishmentId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching reviews:", error);
        throw error;
      }

      if (!reviews || reviews.length === 0) {
        return [];
      }

      // Get customer profiles separately to avoid relation issues
      const customerIds = [...new Set(reviews.map(review => review.customer_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, avatar_url, email')
        .in('user_id', customerIds);

      // Get review responses
      const reviewIds = reviews.map(review => review.id);
      const { data: responses } = await supabase
        .from('review_responses')
        .select('id, review_id, response_text, responded_at, is_public')
        .in('review_id', reviewIds)
        .eq('is_public', true);

      const reviewsWithData = reviews.map(review => ({
        ...review,
        customer: profiles?.find(profile => profile.user_id === review.customer_id) || {
          name: "Usuário Anônimo",
          avatar_url: null,
          email: ""
        },
        response: responses?.find(response => response.review_id === review.id) || null
      }));
      
      return reviewsWithData as Review[];
    },
    enabled: !!establishmentId,
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (review: {
      establishment_id: string;
      rating: number;
      comment: string;
      order_id?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("reviews")
        .insert({
          ...review,
          customer_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["establishment-reviews", variables.establishment_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["establishment-detail", variables.establishment_id],
      });
      toast({
        title: "Avaliação enviada!",
        description: "Sua avaliação foi publicada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar avaliação",
        description: "Ocorreu um erro ao publicar sua avaliação. Tente novamente.",
        variant: "destructive",
      });
      console.error("Error creating review:", error);
    },
  });
}

export function useRespondToReview() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (response: {
      review_id: string;
      establishment_id: string;
      response_text: string;
      is_public?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("review_responses")
        .insert({
          ...response,
          responded_by: (await supabase.auth.getUser()).data.user?.id,
          is_public: response.is_public ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["establishment-reviews", variables.establishment_id],
      });
      toast({
        title: "Resposta enviada!",
        description: "Sua resposta foi publicada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar resposta",
        description: "Ocorreu um erro ao publicar sua resposta. Tente novamente.",
        variant: "destructive",
      });
      console.error("Error responding to review:", error);
    },
  });
}