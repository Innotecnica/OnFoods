import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface Address {
  id: string;
  user_id: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  is_default: boolean;
  latitude?: number;
  longitude?: number;
  created_at: string;
}

export interface CreateAddressData {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  is_default?: boolean;
  latitude?: number;
  longitude?: number;
}

export function useUserAddresses() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadAddresses = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading addresses:', error);
        return;
      }

      setAddresses(data || []);
    } catch (error) {
      console.error('Error loading addresses:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadAddresses();
    }
  }, [loadAddresses, user]);

  const createAddress = async (addressData: CreateAddressData) => {
    if (!user) return false;

    try {
      setIsUpdating(true);

      // If this is set as default, unset all other defaults first
      if (addressData.is_default) {
        await supabase
          .from('addresses')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      const { data, error } = await supabase
        .from('addresses')
        .insert([{
          ...addressData,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating address:', error);
        toast({
          title: "Erro",
          description: "Não foi possível adicionar o endereço.",
          variant: "destructive",
        });
        return false;
      }

      setAddresses(prev => [data, ...prev]);
      toast({
        title: "Endereço adicionado",
        description: "Seu endereço foi adicionado com sucesso.",
      });
      return true;
    } catch (error) {
      console.error('Error creating address:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const updateAddress = async (id: string, updates: Partial<CreateAddressData>) => {
    if (!user) return false;

    try {
      setIsUpdating(true);

      // If this is set as default, unset all other defaults first
      if (updates.is_default) {
        await supabase
          .from('addresses')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      const { error } = await supabase
        .from('addresses')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating address:', error);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o endereço.",
          variant: "destructive",
        });
        return false;
      }

      // Update local state
      setAddresses(prev => prev.map(addr => 
        addr.id === id ? { ...addr, ...updates } : addr
      ));

      toast({
        title: "Endereço atualizado",
        description: "Seu endereço foi atualizado com sucesso.",
      });
      return true;
    } catch (error) {
      console.error('Error updating address:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteAddress = async (id: string) => {
    if (!user) return false;

    try {
      setIsUpdating(true);

      const { error } = await supabase
        .from('addresses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting address:', error);
        toast({
          title: "Erro",
          description: "Não foi possível excluir o endereço.",
          variant: "destructive",
        });
        return false;
      }

      setAddresses(prev => prev.filter(addr => addr.id !== id));
      toast({
        title: "Endereço excluído",
        description: "Seu endereço foi excluído com sucesso.",
      });
      return true;
    } catch (error) {
      console.error('Error deleting address:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const setDefaultAddress = async (id: string) => {
    return await updateAddress(id, { is_default: true });
  };

  return {
    addresses,
    isLoading,
    isUpdating,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    refreshAddresses: loadAddresses,
  };
}
