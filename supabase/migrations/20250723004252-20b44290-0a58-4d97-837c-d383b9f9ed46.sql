-- Limpeza e consolidação de edge functions órfãs e redundantes

-- 1. Remover tabela webhook_events órfã (não sendo usada por nenhuma função)
DROP TABLE IF EXISTS public.webhook_events CASCADE;

-- 2. Consolidar logs de webhook em webhook_configurations
-- Atualizar webhook_configurations para ser mais eficiente
ALTER TABLE public.webhook_configurations 
ADD COLUMN IF NOT EXISTS events_processed integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS success_rate numeric(5,2) DEFAULT 100.00,
ADD COLUMN IF NOT EXISTS configuration jsonb DEFAULT '{}';

-- 3. Criar índices para melhor performance nas tabelas de webhook
CREATE INDEX IF NOT EXISTS idx_webhook_configurations_type_active 
ON public.webhook_configurations(webhook_type, is_active);

CREATE INDEX IF NOT EXISTS idx_webhook_configurations_last_event 
ON public.webhook_configurations(last_event_at DESC);

-- 4. Limpar dados antigos e órfãos das tabelas de notificação
DELETE FROM public.notification_queue 
WHERE status = 'failed' 
  AND created_at < NOW() - INTERVAL '30 days';

DELETE FROM public.notification_queue 
WHERE status = 'sent' 
  AND created_at < NOW() - INTERVAL '7 days';

-- 5. Otimizar tabela de rate limits removendo entradas antigas
DELETE FROM public.rate_limits 
WHERE window_start < NOW() - INTERVAL '1 hour';

DELETE FROM public.security_rate_limits 
WHERE window_start < NOW() - INTERVAL '1 hour'
  AND (blocked_until IS NULL OR blocked_until < NOW());

-- 6. Criar função consolidada para limpeza automática
CREATE OR REPLACE FUNCTION public.cleanup_system_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Limpar notification_queue antiga
  DELETE FROM notification_queue 
  WHERE status = 'failed' AND created_at < NOW() - INTERVAL '30 days';
  
  DELETE FROM notification_queue 
  WHERE status = 'sent' AND created_at < NOW() - INTERVAL '7 days';
  
  -- Limpar rate limits expirados
  DELETE FROM rate_limits 
  WHERE window_start < NOW() - INTERVAL '1 hour';
  
  DELETE FROM security_rate_limits 
  WHERE window_start < NOW() - INTERVAL '1 hour'
    AND (blocked_until IS NULL OR blocked_until < NOW());
  
  -- Limpar logs de auditoria muito antigos (manter 90 dias)
  DELETE FROM security_audit_log 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Log da limpeza
  INSERT INTO security_audit_log (event_type, details)
  VALUES ('system_cleanup', jsonb_build_object(
    'cleaned_at', NOW(),
    'automated', true
  ));
END;
$$;

-- 7. Atualizar função de webhook para ser mais eficiente
CREATE OR REPLACE FUNCTION public.log_webhook_event(
  p_webhook_type text,
  p_event_id text,
  p_success boolean DEFAULT true,
  p_error_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO webhook_configurations (
    webhook_type,
    endpoint_url,
    last_event_processed,
    last_event_at,
    error_count,
    last_error,
    events_processed,
    success_rate
  ) VALUES (
    p_webhook_type,
    'webhook_event',
    p_event_id,
    NOW(),
    CASE WHEN p_success THEN 0 ELSE 1 END,
    p_error_message,
    1,
    CASE WHEN p_success THEN 100.00 ELSE 0.00 END
  )
  ON CONFLICT (webhook_type) 
  DO UPDATE SET
    last_event_processed = p_event_id,
    last_event_at = NOW(),
    error_count = CASE 
      WHEN p_success THEN 0 
      ELSE webhook_configurations.error_count + 1 
    END,
    last_error = CASE 
      WHEN p_success THEN NULL 
      ELSE p_error_message 
    END,
    events_processed = webhook_configurations.events_processed + 1,
    success_rate = ROUND(
      ((webhook_configurations.events_processed * webhook_configurations.success_rate / 100.0) + 
       CASE WHEN p_success THEN 1 ELSE 0 END) * 100.0 / 
      (webhook_configurations.events_processed + 1)
    , 2),
    updated_at = NOW();
END;
$$;