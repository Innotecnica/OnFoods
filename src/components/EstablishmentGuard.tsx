import { useAuth } from "@/contexts/AuthContext";
import { useEstablishmentValidation } from "@/hooks/useEstablishmentValidation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { redirectToStripeDashboard } from "@/utils/stripeRedirect";

interface EstablishmentGuardProps {
  children: React.ReactNode;
  requireStripeAccount?: boolean;
  requireActiveSubscription?: boolean;
}

export function EstablishmentGuard({ 
  children, 
  requireStripeAccount = true, 
  requireActiveSubscription = true 
}: EstablishmentGuardProps) {
  const { user } = useAuth();
  const { validation, isLoading } = useEstablishmentValidation();
  const navigate = useNavigate();

  console.log('[ESTABLISHMENT GUARD] Current validation:', {
    validation,
    isLoading,
    userType: user?.type
  });

  // Only apply validation to establishment users
  if (!user || user.type !== 'establishment') {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!validation.hasEstablishment) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Você precisa ter um estabelecimento cadastrado para acessar esta área.
        </AlertDescription>
      </Alert>
    );
  }

  const needsSubscription = requireActiveSubscription && !validation.hasActiveSubscription;
  
  // Only require Stripe account if gateway is "stripe" or no gateway is set
  const establishment = validation.establishment;
  const gatewayIsStripe = establishment?.payment_gateway === 'stripe';
  const gatewayIsWhatsApp = establishment?.payment_gateway === 'whatsapp';
  const noGatewaySet = !establishment?.payment_gateway || establishment?.payment_gateway === 'none';
  
  console.log('[ESTABLISHMENT GUARD DEBUG]', {
    gatewayIsStripe,
    gatewayIsWhatsApp,
    noGatewaySet,
    hasStripeAccount: validation.hasStripeAccount,
    requireStripeAccount,
    payment_gateway: establishment?.payment_gateway
  });
  
  const needsStripeAccount = requireStripeAccount && gatewayIsStripe && !validation.hasStripeAccount;
  const needsPaymentConfig = noGatewaySet;
  
  // WhatsApp should NOT require additional configuration
  const blockedByPaymentConfig = needsPaymentConfig && !gatewayIsWhatsApp;

  console.log('[ESTABLISHMENT GUARD - Blocking Logic]', {
    needsSubscription,
    needsStripeAccount,
    needsPaymentConfig,
    blockedByPaymentConfig,
    willBlock: needsSubscription || needsStripeAccount || blockedByPaymentConfig
  });

  // Com assinatura ativa, nunca bloquear o acesso
  const shouldBlock = validation.hasActiveSubscription ? false : (needsSubscription || needsStripeAccount || blockedByPaymentConfig);
  
  if (shouldBlock) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <span>Configuração Necessária</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Para acessar esta funcionalidade, você precisa:
          </p>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              {validation.hasActiveSubscription ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className={validation.hasActiveSubscription ? 'text-green-700' : 'text-red-700'}>
                Assinatura ativa
              </span>
            </div>
            
            {blockedByPaymentConfig && (
              <div className="flex items-center space-x-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-red-700">
                  Configurar gateway de pagamento
                </span>
              </div>
            )}
            
            {gatewayIsStripe && (
              <div className="flex items-center space-x-2">
                {validation.hasStripeAccount ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className={validation.hasStripeAccount ? 'text-green-700' : 'text-red-700'}>
                  Conta Stripe configurada para receber pagamentos
                </span>
              </div>
            )}
            
            {gatewayIsWhatsApp && (
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-green-700">
                  Gateway WhatsApp configurado
                </span>
              </div>
            )}
          </div>

          <div className="flex space-x-3">
            {needsSubscription && (
              <Button onClick={() => navigate('/establishment-dashboard')}>
                Ativar Assinatura
              </Button>
            )}
            {(needsStripeAccount || blockedByPaymentConfig) && (
              <Button variant="outline" onClick={() => navigate('/establishment-dashboard#payments')}>
                Configurar Pagamentos
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}