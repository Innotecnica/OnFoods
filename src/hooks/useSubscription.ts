import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface SubscriptionData {
  hasActiveSubscription: boolean;
  status: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  trialEnd?: string;
  planId?: string;
  discountInfo?: {
    couponId: string;
    amountOff?: number;
    percentOff?: number;
  };
  webhookLastSync?: string;
  syncStatus?: string;
  lastWebhookEventId?: string;
  subscriptionHistory?: SubscriptionHistoryItem[];
}

interface SubscriptionHistoryItem {
  id: string;
  action: string;
  triggeredBy: string;
  createdAt: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}

interface SecurityContext {
  lastCheckTime?: number;
  failedAttempts: number;
  isBlocked: boolean;
  blockUntil?: number;
}

export function useSubscription() {
  const { user, isAuthenticated } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [securityContext, setSecurityContext] = useState<SecurityContext>({
    failedAttempts: 0,
    isBlocked: false
  });

  // Security: Rate limiting and error tracking
  const isRateLimited = useCallback(() => {
    const now = Date.now();
    if (securityContext.isBlocked && securityContext.blockUntil && now < securityContext.blockUntil) {
      return true;
    }
    if (securityContext.lastCheckTime && (now - securityContext.lastCheckTime) < 2000) {
      return true; // Min 2 seconds between checks
    }
    return false;
  }, [securityContext]);

  const handleSecurityError = useCallback(() => {
    const failedAttempts = securityContext.failedAttempts + 1;
    const isBlocked = failedAttempts >= 5;
    const blockUntil = isBlocked ? Date.now() + (15 * 60 * 1000) : undefined; // 15 minutes

    setSecurityContext({
      failedAttempts,
      isBlocked,
      blockUntil,
      lastCheckTime: Date.now()
    });

    if (isBlocked) {
      toast({
        title: "Conta temporariamente bloqueada",
        description: "Muitas tentativas falharam. Tente novamente em 15 minutos.",
        variant: "destructive",
      });
    }
  }, [securityContext.failedAttempts]);

  const resetSecurityContext = useCallback(() => {
    setSecurityContext({
      failedAttempts: 0,
      isBlocked: false,
      lastCheckTime: Date.now()
    });
  }, []);

  const checkSubscription = useCallback(async (forceRefresh = false) => {
    if (!isAuthenticated || !user) {
      setIsLoading(false);
      return;
    }

    if (!forceRefresh && isRateLimited()) {
      return;
    }

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        // Melhores mensagens de erro
        if (error.message?.includes('rate limit')) {
          toast({
            title: "Muitas verificações",
            description: "Aguarde alguns segundos antes de verificar novamente.",
            variant: "destructive",
          });
        } else if (error.message?.includes('authentication')) {
          toast({
            title: "Sessão expirada",
            description: "Por favor, faça login novamente.",
            variant: "destructive",
          });
        } else {
          handleSecurityError();
        }
        return;
      }

      setSubscription(data);
      resetSecurityContext();

    } catch (error) {
      console.error('Subscription check error:', error);
      handleSecurityError();
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthenticated, isRateLimited, handleSecurityError, resetSecurityContext]);

  // Verificar parâmetros de sucesso/cancelamento do Stripe
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const canceled = urlParams.get('canceled');

    if (success === 'true') {
      toast({
        title: "Pagamento realizado!",
        description: "Sua assinatura foi ativada com sucesso. Verificando status...",
      });
      
      // Força verificação da assinatura com delay para evitar rate limiting
      setTimeout(() => {
        checkSubscription();
      }, 2000);
      
      // Remove parâmetros da URL após delay
      setTimeout(() => {
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 1000);
    }

    if (canceled === 'true') {
      toast({
        title: "Pagamento cancelado",
        description: "O processo de assinatura foi cancelado.",
        variant: "destructive",
      });
      // Remove parâmetros da URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [checkSubscription]);

  const createCheckoutSession = async () => {
    if (!isAuthenticated || !user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para assinar.",
        variant: "destructive",
      });
      return;
    }

    if (securityContext.isBlocked) {
      toast({
        title: "Acesso bloqueado",
        description: "Muitas tentativas falharam. Tente novamente mais tarde.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-subscription-checkout');
      
      if (error) {
        handleSecurityError();
        toast({
          title: "Erro",
          description: error.message || "Não foi possível criar a sessão de checkout.",
          variant: "destructive",
        });
        return;
      }

      if (data?.url) {
        // Security: Validate URL before redirect
        try {
          const url = new URL(data.url);
          if (!url.hostname.includes('checkout.stripe.com')) {
            throw new Error('Invalid checkout URL');
          }
          window.location.href = data.url;
        } catch (urlError) {
          toast({
            title: "Erro de segurança",
            description: "URL de checkout inválida.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Erro",
          description: "URL de pagamento não foi gerada.",
          variant: "destructive",
        });
      }
    } catch (error) {
      handleSecurityError();
      toast({
        title: "Erro",
        description: "Erro ao processar pagamento.",
        variant: "destructive",
      });
    }
  };

  const openCustomerPortal = async () => {
    if (!isAuthenticated || !user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado.",
        variant: "destructive",
      });
      return;
    }

    if (securityContext.isBlocked) {
      toast({
        title: "Acesso bloqueado",
        description: "Muitas tentativas falharam. Tente novamente mais tarde.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) {
        handleSecurityError();
        toast({
          title: "Erro",
          description: "Não foi possível abrir o portal de gerenciamento.",
          variant: "destructive",
        });
        return;
      }

      if (data?.url) {
        // Security: Validate URL before opening
        try {
          const url = new URL(data.url);
          if (!url.hostname.includes('billing.stripe.com')) {
            throw new Error('Invalid portal URL');
          }
          window.open(data.url, '_blank', 'noopener,noreferrer');
        } catch (urlError) {
          toast({
            title: "Erro de segurança",
            description: "URL do portal inválida.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      handleSecurityError();
      toast({
        title: "Erro",
        description: "Erro ao abrir portal de gerenciamento.",
        variant: "destructive",
      });
    }
  };

  const toggleAutoRenewal = async () => {
    if (!isAuthenticated || !user || !subscription?.hasActiveSubscription) {
      toast({
        title: "Erro",
        description: "Você precisa ter uma assinatura ativa.",
        variant: "destructive",
      });
      return;
    }

    if (securityContext.isBlocked) {
      toast({
        title: "Acesso bloqueado",
        description: "Muitas tentativas falharam. Tente novamente mais tarde.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('toggle-auto-renewal', {
        body: { cancelAtPeriodEnd: !subscription.cancelAtPeriodEnd }
      });
      
      if (error) {
        handleSecurityError();
        toast({
          title: "Erro",
          description: "Não foi possível alterar a renovação automática.",
          variant: "destructive",
        });
        return;
      }

      // Atualiza o status da assinatura
      await checkSubscription();
      
      toast({
        title: "Sucesso",
        description: subscription.cancelAtPeriodEnd 
          ? "Renovação automática ativada" 
          : "Renovação automática desativada",
      });
    } catch (error) {
      handleSecurityError();
      toast({
        title: "Erro",
        description: "Erro ao alterar renovação automática.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      checkSubscription();
    }
  }, [isAuthenticated, user, checkSubscription]);

  return {
    subscription,
    isLoading,
    checkSubscription,
    createCheckoutSession,
    openCustomerPortal,
    toggleAutoRenewal,
    securityContext
  };
}
