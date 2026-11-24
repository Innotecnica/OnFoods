import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useCartItemNotes() {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateCartItemNotes = async (cartItemId: string, notes: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ notes })
        .eq('id', cartItemId);

      if (error) {
        throw error;
      }

      toast({
        title: "Observações atualizadas",
        description: "As observações do item foram salvas com sucesso.",
      });

      return true;
    } catch (error) {
      console.error('Error updating cart item notes:', error);
      toast({
        title: "Erro ao salvar observações",
        description: "Não foi possível salvar as observações. Tente novamente.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    updateCartItemNotes,
    isUpdating
  };
}