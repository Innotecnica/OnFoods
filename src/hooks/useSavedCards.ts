import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface SavedCard {
  id: string;
  user_id: string;
  gateway_type: "stripe" | "mercado_pago";
  stripe_payment_method_id?: string;
  mercado_pago_card_token?: string;
  card_brand?: string;
  last_four_digits: string;
  expiry_month?: number;
  expiry_year?: number;
  cardholder_name?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface SaveCardData {
  gateway_type: "stripe" | "mercado_pago";
  stripe_payment_method_id?: string;
  mercado_pago_card_token?: string;
  card_brand?: string;
  last_four_digits: string;
  expiry_month?: number;
  expiry_year?: number;
  cardholder_name?: string;
  is_default?: boolean;
}

export function useSavedCards() {
  const { user } = useAuth();
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadSavedCards = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('saved_cards')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading saved cards:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os cartões salvos.",
          variant: "destructive",
        });
        return;
      }

      setSavedCards((data as SavedCard[]) || []);
    } catch (error) {
      console.error('Error loading saved cards:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadSavedCards();
    }
  }, [loadSavedCards, user]);

  const saveCard = async (cardData: SaveCardData) => {
    if (!user) return false;

    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('saved_cards')
        .insert({
          user_id: user.id,
          ...cardData,
        });

      if (error) {
        console.error('Error saving card:', error);
        toast({
          title: "Erro",
          description: "Não foi possível salvar o cartão.",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Cartão salvo",
        description: "Cartão salvo com sucesso.",
      });

      await loadSavedCards();
      return true;
    } catch (error) {
      console.error('Error saving card:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const setDefaultCard = async (cardId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('saved_cards')
        .update({ is_default: true })
        .eq('id', cardId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error setting default card:', error);
        toast({
          title: "Erro",
          description: "Não foi possível definir o cartão padrão.",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Cartão padrão definido",
        description: "Cartão definido como padrão com sucesso.",
      });

      await loadSavedCards();
      return true;
    } catch (error) {
      console.error('Error setting default card:', error);
      return false;
    }
  };

  const deleteCard = async (cardId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('saved_cards')
        .delete()
        .eq('id', cardId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting card:', error);
        toast({
          title: "Erro",
          description: "Não foi possível excluir o cartão.",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Cartão excluído",
        description: "Cartão excluído com sucesso.",
      });

      await loadSavedCards();
      return true;
    } catch (error) {
      console.error('Error deleting card:', error);
      return false;
    }
  };

  const getDefaultCard = () => {
    return savedCards.find(card => card.is_default);
  };

  const getCardsByGateway = (gateway: "stripe" | "mercado_pago") => {
    return savedCards.filter(card => card.gateway_type === gateway);
  };

  return {
    savedCards,
    isLoading,
    isSaving,
    saveCard,
    setDefaultCard,
    deleteCard,
    getDefaultCard,
    getCardsByGateway,
    refreshCards: loadSavedCards,
  };
}
