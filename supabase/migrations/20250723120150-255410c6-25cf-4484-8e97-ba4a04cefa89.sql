-- Corrigir problema de event_type NULL na security_audit_log
UPDATE security_audit_log 
SET event_type = 'unknown_event'
WHERE event_type IS NULL;

-- Adicionar constraint para prevenir futuros problemas
ALTER TABLE security_audit_log 
ALTER COLUMN event_type SET DEFAULT 'system_event';

-- Atualizar função log_security_event para garantir event_type
CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type text DEFAULT 'system_event',
  p_user_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT '{}',
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Garantir que event_type nunca seja NULL
  IF p_event_type IS NULL OR p_event_type = '' THEN
    p_event_type := 'system_event';
  END IF;

  INSERT INTO security_audit_log (
    event_type,
    user_id,
    details,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    p_event_type,
    COALESCE(p_user_id, auth.uid()),
    COALESCE(p_details, '{}'),
    COALESCE(p_ip_address, inet_client_addr()),
    COALESCE(p_user_agent, current_setting('request.headers', true)::json->>'user-agent'),
    NOW()
  );
END;
$$;