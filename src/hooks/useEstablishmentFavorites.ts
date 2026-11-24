import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface EstablishmentFavorite {
  id: string;
  user_id: string;
  establishment_id: string;
  created_at: string;
}

export function useEstablishmentFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const loadFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // For now, we'll use local storage since establishment_favorites table doesn't exist yet
      // TODO: Create establishment_favorites table in database migration
      const storedFavorites = localStorage.getItem(`establishment_favorites_${user.id}`);
      const favoriteIds = storedFavorites ? JSON.parse(storedFavorites) : [];
      setFavorites(favoriteIds);
    } catch (err) {
      console.log('Using local storage for favorites');
      setFavorites([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const toggleFavorite = useCallback(async (establishmentId: string, establishmentName?: string) => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Faça login para adicionar favoritos",
        variant: "destructive"
      });
      return;
    }

    const isFavorite = favorites.includes(establishmentId);

    try {
      if (isFavorite) {
        // Remove from favorites
        const newFavorites = favorites.filter(id => id !== establishmentId);
        setFavorites(newFavorites);
        localStorage.setItem(`establishment_favorites_${user.id}`, JSON.stringify(newFavorites));
        toast({
          title: "Removido dos favoritos",
          description: `${establishmentName || 'Estabelecimento'} foi removido dos seus favoritos.`
        });
      } else {
        // Add to favorites
        const newFavorites = [...favorites, establishmentId];
        setFavorites(newFavorites);
        localStorage.setItem(`establishment_favorites_${user.id}`, JSON.stringify(newFavorites));
        toast({
          title: "Adicionado aos favoritos",
          description: `${establishmentName || 'Estabelecimento'} foi adicionado aos seus favoritos.`
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar favoritos';
      setError(errorMessage);
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [user, favorites]);

  const isFavorite = useCallback((establishmentId: string) => {
    return favorites.includes(establishmentId);
  }, [favorites]);

  return {
    favorites,
    isLoading,
    error,
    toggleFavorite,
    isFavorite,
    refetch: loadFavorites
  };
}