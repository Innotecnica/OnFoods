import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface NotificationPreferences {
  orders: boolean;
  promotions: boolean;
  newsletter: boolean;
  sms: boolean;
  push: boolean;
  email: boolean;
  whatsapp: boolean;
  sound: boolean;
  urgentOnly: boolean;
}

export function useNotificationPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    orders: true,
    promotions: true,
    newsletter: false,
    sms: true,
    push: true,
    email: true,
    whatsapp: false,
    sound: true,
    urgentOnly: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadPreferences = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading notification preferences:', error);
        return;
      }

      if (data) {
        setPreferences({
          orders: data.orders,
          promotions: data.promotions,
          newsletter: data.newsletter,
          sms: data.sms,
          push: true, // Default values for new preferences
          email: true,
          whatsapp: false,
          sound: true,
          urgentOnly: false
        });
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [loadPreferences, user]);

  const updatePreferences = async (newPreferences: NotificationPreferences) => {
    if (!user) return false;

    try {
      setIsUpdating(true);
      
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: user.id,
          orders: newPreferences.orders,
          promotions: newPreferences.promotions,
          newsletter: newPreferences.newsletter,
          sms: newPreferences.sms,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error updating notification preferences:', error);
        toast({
          title: "Erro",
          description: "Não foi possível salvar as preferências.",
          variant: "destructive",
        });
        return false;
      }

      setPreferences(newPreferences);
      toast({
        title: "Preferências salvas",
        description: "Suas preferências de notificação foram atualizadas.",
      });
      return true;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
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

  return {
    preferences,
    setPreferences,
    isLoading,
    isUpdating,
    updatePreferences,
    refreshPreferences: loadPreferences,
  };
}
