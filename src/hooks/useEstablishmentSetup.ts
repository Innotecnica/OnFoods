import { useState } from "react";
import { useEstablishmentValidation } from "./useEstablishmentValidation";
import { useSubscription } from "./useSubscription";
import { useStripeConnect } from "./useStripeConnect";
import { toast } from "@/hooks/use-toast";
import { redirectToStripeDashboard } from "@/utils/stripeRedirect";

export function useEstablishmentSetup() {
  const { validation, refreshValidation } = useEstablishmentValidation();
  const { createCheckoutSession } = useSubscription();
  const { createStripeAccount, refreshAccount } = useStripeConnect();
  const [isProcessing, setIsProcessing] = useState(false);

  const setupSubscription = async () => {
    try {
      setIsProcessing(true);
      await createCheckoutSession();
      // Refresh validation after subscription setup
      setTimeout(() => {
        refreshValidation();
      }, 2000);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a configuração da assinatura",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const setupStripeAccount = async () => {
    try {
      setIsProcessing(true);
      redirectToStripeDashboard();
      // Refresh validation after user might configure Stripe
      setTimeout(() => {
        refreshValidation();
      }, 5000);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível abrir a configuração do Stripe",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getNextSteps = () => {
    const steps = [];
    
    if (!validation.hasActiveSubscription) {
      steps.push({
        title: "Ativar Assinatura",
        description: "Configure sua assinatura para começar a receber pedidos",
        action: setupSubscription,
        priority: 1,
      });
    }

    if (!validation.hasStripeAccount) {
      steps.push({
        title: "Configurar Pagamentos",
        description: "Configure sua conta Stripe para receber pagamentos",
        action: setupStripeAccount,
        priority: 2,
      });
    }

    return steps.sort((a, b) => a.priority - b.priority);
  };

  return {
    validation,
    setupSubscription,
    setupStripeAccount,
    getNextSteps,
    isProcessing,
    refreshValidation,
  };
}