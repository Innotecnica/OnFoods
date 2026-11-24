-- Fix 1: Corrigir search_path para todas as funções de segurança
-- Estas funções precisam ter search_path definido para prevenir ataques de injeção

-- Função de validação de senha forte
CREATE OR REPLACE FUNCTION public.validate_strong_password(password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  has_upper boolean := password ~ '[A-Z]';
  has_lower boolean := password ~ '[a-z]';
  has_digit boolean := password ~ '[0-9]';
  has_special boolean := password ~ '[^A-Za-z0-9]';
  is_long_enough boolean := length(password) >= 12;
  no_common_patterns boolean := NOT (
    password ~* '(password|123456|qwerty|abc123|admin|user|guest)'
  );
BEGIN
  -- Enhanced password requirements
  IF NOT (has_upper AND has_lower AND has_digit AND has_special AND is_long_enough AND no_common_patterns) THEN
    -- Log weak password attempt
    PERFORM public.log_otp_security_event(
      'weak_password_attempt',
      NULL,
      jsonb_build_object(
        'has_upper', has_upper,
        'has_lower', has_lower,
        'has_digit', has_digit,
        'has_special', has_special,
        'is_long_enough', is_long_enough,
        'no_common_patterns', no_common_patterns
      )
    );
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Função de limpeza de sessões
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Deactivate expired sessions
  UPDATE public.user_sessions 
  SET is_active = false 
  WHERE expires_at < now() AND is_active = true;
  
  -- Delete old inactive sessions (older than 7 days)
  DELETE FROM public.user_sessions 
  WHERE is_active = false AND created_at < now() - interval '7 days';
END;
$$;

-- Função de rate limiting de segurança
CREATE OR REPLACE FUNCTION public.check_security_rate_limit(p_identifier text, p_action_type text, p_max_attempts integer DEFAULT 5, p_window_minutes integer DEFAULT 15, p_block_minutes integer DEFAULT 30)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_attempts int;
  is_blocked boolean := false;
BEGIN
  -- Clean old entries
  DELETE FROM public.security_rate_limits 
  WHERE window_start < now() - (p_window_minutes || ' minutes')::interval
    AND (blocked_until IS NULL OR blocked_until < now());
  
  -- Check if currently blocked
  SELECT EXISTS(
    SELECT 1 FROM public.security_rate_limits 
    WHERE identifier = p_identifier 
      AND action_type = p_action_type 
      AND blocked_until > now()
  ) INTO is_blocked;
  
  IF is_blocked THEN
    RETURN false;
  END IF;
  
  -- Get current attempts in window
  SELECT COALESCE(SUM(attempts), 0) INTO current_attempts
  FROM public.security_rate_limits
  WHERE identifier = p_identifier
    AND action_type = p_action_type
    AND window_start >= now() - (p_window_minutes || ' minutes')::interval;
  
  -- If exceeded limit, block
  IF current_attempts >= p_max_attempts THEN
    INSERT INTO public.security_rate_limits (
      identifier, action_type, attempts, blocked_until
    ) VALUES (
      p_identifier, p_action_type, 1, now() + (p_block_minutes || ' minutes')::interval
    );
    
    -- Log security event
    PERFORM public.log_security_event(
      'rate_limit_exceeded',
      CASE WHEN p_identifier ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
           THEN p_identifier::uuid 
           ELSE NULL END,
      jsonb_build_object(
        'identifier', p_identifier,
        'action_type', p_action_type,
        'attempts', current_attempts
      )
    );
    
    RETURN false;
  END IF;
  
  -- Record attempt
  INSERT INTO public.security_rate_limits (identifier, action_type)
  VALUES (p_identifier, p_action_type)
  ON CONFLICT (identifier, action_type) 
  DO UPDATE SET 
    attempts = security_rate_limits.attempts + 1,
    window_start = CASE 
      WHEN security_rate_limits.window_start < now() - (p_window_minutes || ' minutes')::interval 
      THEN now() 
      ELSE security_rate_limits.window_start 
    END;
  
  RETURN true;
END;
$$;

-- Função de validação UUID
CREATE OR REPLACE FUNCTION public.is_valid_uuid(input_text text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if input matches UUID format
  IF input_text IS NULL OR length(input_text) != 36 THEN
    RETURN false;
  END IF;
  
  -- Try to cast to UUID, return false if it fails
  BEGIN
    PERFORM input_text::uuid;
    RETURN true;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RETURN false;
  END;
END;
$$;

-- Fix 2: Corrigir problemas na tabela security_audit_log
-- Garantir que event_type nunca seja NULL
ALTER TABLE public.security_audit_log 
ALTER COLUMN event_type SET NOT NULL;

-- Adicionar valor padrão para event_type se necessário
UPDATE public.security_audit_log 
SET event_type = 'unknown_event' 
WHERE event_type IS NULL;

-- Fix 3: Corrigir foreign key entre orders e profiles
-- Verificar se a foreign key existe
DO $$
BEGIN
    -- Adicionar foreign key se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'orders_customer_id_fkey' 
        AND table_name = 'orders'
    ) THEN
        -- Primeiro remover registros órfãos se existirem
        DELETE FROM orders 
        WHERE customer_id NOT IN (SELECT user_id FROM profiles);
        
        -- Adicionar a foreign key
        ALTER TABLE orders 
        ADD CONSTRAINT orders_customer_id_fkey 
        FOREIGN KEY (customer_id) REFERENCES profiles(user_id);
    END IF;
END $$;

-- Fix 4: Melhorar função de log de eventos de segurança
CREATE OR REPLACE FUNCTION public.log_security_event(event_type_param text, user_id_param uuid DEFAULT NULL::uuid, details_param jsonb DEFAULT NULL::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Validar parâmetros obrigatórios
  IF event_type_param IS NULL OR event_type_param = '' THEN
    RAISE EXCEPTION 'event_type é obrigatório';
  END IF;

  INSERT INTO public.security_audit_log (
    event_type,
    user_id,
    details,
    ip_address,
    user_agent
  ) VALUES (
    event_type_param,
    COALESCE(user_id_param, auth.uid()),
    details_param,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro para debug, mas não falhe a operação principal
    RAISE WARNING 'Erro ao fazer log de segurança: %', SQLERRM;
END;
$$;

-- Fix 5: Adicionar índices de segurança para performance
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type ON security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON security_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_security_rate_limits_identifier ON security_rate_limits(identifier, action_type);

-- Fix 6: Adicionar política RLS mais restritiva para security_audit_log
DROP POLICY IF EXISTS "System can manage security logs" ON security_audit_log;

CREATE POLICY "Only service role can manage security logs"
ON security_audit_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Fix 7: Limpar dados inconsistentes da tabela security_audit_log
DELETE FROM security_audit_log 
WHERE event_type IS NULL 
   OR event_type = '';

-- Fix 8: Função de limpeza de dados de segurança
CREATE OR REPLACE FUNCTION public.cleanup_security_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Limpar logs de segurança antigos (mais de 90 dias)
  DELETE FROM security_audit_log 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Limpar rate limits expirados
  DELETE FROM security_rate_limits 
  WHERE window_start < NOW() - INTERVAL '1 day';
  
  -- Limpar sessões inativas antigas
  DELETE FROM user_sessions 
  WHERE is_active = false AND created_at < NOW() - INTERVAL '30 days';
END;
$$;