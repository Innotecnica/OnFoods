import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { env } from "@/utils/environment";

interface ConnectedAccount {
  stripe_account_id: string;
  onboarding_completed: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requirements_currently_due: string[];
}

export function useStripeConnect() {
  const { user } = useAuth();
  const [connectedAccount, setConnectedAccount] = useState<ConnectedAccount | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkConnectedAccount = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      console.log('[DEBUG] Verificando conta conectada...');

      // Get establishment
      const { data: establishment } = await supabase
        .from('establishments')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('[DEBUG] Establishment found:', establishment);

      if (!establishment) {
        console.log('[DEBUG] Nenhum estabelecimento encontrado');
        return;
      }

      // Check connected account
      const { data: account } = await supabase
        .from('stripe_connected_accounts')
        .select('*')
        .eq('establishment_id', establishment.id)
        .maybeSingle();

      console.log('[DEBUG] Conta Stripe encontrada:', account);
      setConnectedAccount(account);
    } catch (error) {
      console.error('Error checking connected account:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.type === 'establishment') {
      checkConnectedAccount();
    }
  }, [checkConnectedAccount, user?.type]);

  const createStripeAccount = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      console.log('[DEBUG] Iniciando criação de conta Stripe...');

      const { data, error } = await supabase.functions.invoke('create-stripe-account');
      
      console.log('[DEBUG] Resposta da edge function:', { data, error });
      
      if (error) {
        console.error('Stripe function error:', error);
        
        // Try to get more details from the error
        const errorMessage = error.message || "Erro desconhecido";
        
        // Check for platform profile error first
        if (errorMessage.includes('platform-profile')) {
          toast({
            title: "Configuração da Plataforma Necessária",
            description: "Configure o perfil da plataforma no Stripe para continuar.",
            variant: "destructive",
          });
          // Open platform profile settings
          window.open('https://dashboard.stripe.com/settings/connect/platform-profile', '_blank');
        } else if (errorMessage.includes('500') || errorMessage.includes('Edge Function returned a non-2xx status code')) {
          // For 500 errors, try to get the actual error response
          try {
            const supabaseUrl = env.getSupabaseUrl();
            const anonKey = env.getSupabaseAnonKey();
            const response = await fetch(`${supabaseUrl}/functions/v1/create-stripe-account`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                'apikey': anonKey,
                'Content-Type': 'application/json',
              },
            });
            
            const responseData = await response.json();
            console.log('[DEBUG] Direct response:', { status: response.status, data: responseData });
            
            if (responseData.error) {
              if (responseData.error.includes('PLATFORM_PROFILE_REQUIRED')) {
                toast({
                  title: "Configuração da Plataforma Necessária",
                  description: "Configure o perfil da plataforma no Stripe para continuar.",
                  variant: "destructive",
                });
                window.open('https://dashboard.stripe.com/settings/connect/platform-profile', '_blank');
                return;
              } else {
                toast({
                  title: "Erro",
                  description: responseData.error,
                  variant: "destructive",
                });
              }
            } else if (responseData.url) {
              window.open(responseData.url, '_blank');
              toast({
                title: "Sucesso",
                description: "Redirecionando para configuração do Stripe...",
              });
            }
            return;
          } catch (fetchError) {
            console.error('Error fetching direct response:', fetchError);
          }
          
          toast({
            title: "Erro de Configuração",
            description: "Verifique se as credenciais do Stripe estão configuradas corretamente.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro",
            description: errorMessage,
            variant: "destructive",
          });
        }
        return;
      }

      if (data?.error) {
        console.error('Stripe function returned error:', data.error);
        
        // Check if it's platform profile error
        if (data.error.includes('PLATFORM_PROFILE_REQUIRED')) {
          toast({
            title: "Configuração da Plataforma Necessária",
            description: "Configure o perfil da plataforma no Stripe para continuar.",
            variant: "destructive",
          });
          // Open platform profile settings
          window.open('https://dashboard.stripe.com/settings/connect/platform-profile', '_blank');
          return;
        }
        
        toast({
          title: "Erro",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      if (data?.url) {
        console.log('[DEBUG] Abrindo URL do checkout:', data.url);
        // Open Stripe onboarding in new window
        window.open(data.url, '_blank');
        
        toast({
          title: "Sucesso",
          description: "Redirecionando para configuração do Stripe...",
        });
      } else {
        console.error('[DEBUG] Nenhuma URL retornada:', data);
        toast({
          title: "Erro",
          description: "URL de configuração do Stripe não foi retornada",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating Stripe account:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar conta Stripe",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAccount = () => {
    checkConnectedAccount();
  };

  return {
    connectedAccount,
    isLoading,
    createStripeAccount,
    refreshAccount,
  };
}
