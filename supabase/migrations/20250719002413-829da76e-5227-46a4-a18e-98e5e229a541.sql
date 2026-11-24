-- Adicionar campos úteis à tabela establishment_subscriptions
ALTER TABLE public.establishment_subscriptions 
ADD COLUMN IF NOT EXISTS trial_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS previous_plan_id TEXT,
ADD COLUMN IF NOT EXISTS plan_changed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS webhook_last_sync TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_metadata JSONB DEFAULT '{}'::jsonb;

-- Criar tabela para histórico de mudanças de assinatura
CREATE TABLE IF NOT EXISTS public.subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.establishment_subscriptions(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  triggered_by TEXT, -- 'user', 'webhook', 'system'
  stripe_event_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on subscription_history
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

-- Create policy for subscription history
CREATE POLICY "Establishment owners can view subscription history" 
ON public.subscription_history 
FOR SELECT 
USING (establishment_id IN (
  SELECT id FROM public.establishments WHERE user_id = auth.uid()
));

-- Create policy for system operations
CREATE POLICY "System can manage subscription history" 
ON public.subscription_history 
FOR ALL 
USING (((current_setting('request.jwt.claims'::text, true))::json ->> 'role'::text) = 'service_role'::text);

-- Create function to log subscription changes
CREATE OR REPLACE FUNCTION public.log_subscription_history(
  p_establishment_id UUID,
  p_subscription_id UUID,
  p_action TEXT,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_triggered_by TEXT DEFAULT 'system',
  p_stripe_event_id TEXT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.subscription_history (
    establishment_id,
    subscription_id,
    action,
    old_values,
    new_values,
    triggered_by,
    stripe_event_id
  ) VALUES (
    p_establishment_id,
    p_subscription_id,
    p_action,
    p_old_values,
    p_new_values,
    p_triggered_by,
    p_stripe_event_id
  );
END;
$$;

-- Criar tabela para configurações de webhook
CREATE TABLE IF NOT EXISTS public.webhook_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_type TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  secret_key TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_event_processed TEXT,
  last_event_at TIMESTAMP WITH TIME ZONE,
  error_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on webhook_configurations
ALTER TABLE public.webhook_configurations ENABLE ROW LEVEL SECURITY;

-- Create policy for webhook configurations (admin only)
CREATE POLICY "Only system can manage webhook configurations" 
ON public.webhook_configurations 
FOR ALL 
USING (((current_setting('request.jwt.claims'::text, true))::json ->> 'role'::text) = 'service_role'::text);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_subscription_history_establishment_id 
ON public.subscription_history(establishment_id);

CREATE INDEX IF NOT EXISTS idx_subscription_history_created_at 
ON public.subscription_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_establishment_subscriptions_webhook_sync 
ON public.establishment_subscriptions(webhook_last_sync) 
WHERE webhook_last_sync IS NOT NULL;