-- Phase 1: Critical Database Security Fixes

-- Fix search path vulnerabilities in all database functions
CREATE OR REPLACE FUNCTION public.log_security_event(event_type_param text, user_id_param uuid DEFAULT NULL::uuid, details_param jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
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
END;
$function$;

-- Enhanced password validation function
CREATE OR REPLACE FUNCTION public.validate_strong_password(password text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Session management table
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_token text NOT NULL UNIQUE,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_activity timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  is_active boolean NOT NULL DEFAULT true
);

-- Enable RLS on sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for sessions
CREATE POLICY "Users can view their own sessions" 
ON public.user_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can manage sessions" 
ON public.user_sessions 
FOR ALL 
USING (((current_setting('request.jwt.claims'::text, true))::json ->> 'role'::text) = 'service_role'::text);

-- Session management functions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Deactivate expired sessions
  UPDATE public.user_sessions 
  SET is_active = false 
  WHERE expires_at < now() AND is_active = true;
  
  -- Delete old inactive sessions (older than 7 days)
  DELETE FROM public.user_sessions 
  WHERE is_active = false AND created_at < now() - interval '7 days';
END;
$function$;

-- Function to limit concurrent sessions
CREATE OR REPLACE FUNCTION public.limit_concurrent_sessions(p_user_id uuid, max_sessions int DEFAULT 5)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Deactivate oldest sessions if user has too many
  WITH oldest_sessions AS (
    SELECT id 
    FROM public.user_sessions 
    WHERE user_id = p_user_id AND is_active = true
    ORDER BY last_activity ASC
    OFFSET max_sessions
  )
  UPDATE public.user_sessions 
  SET is_active = false 
  WHERE id IN (SELECT id FROM oldest_sessions);
END;
$function$;

-- Rate limiting enhancement
CREATE TABLE IF NOT EXISTS public.security_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- IP or user_id
  action_type text NOT NULL, -- login, password_reset, etc.
  attempts int NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on rate limits
ALTER TABLE public.security_rate_limits ENABLE ROW LEVEL SECURITY;

-- System can manage rate limits
CREATE POLICY "System can manage rate limits" 
ON public.security_rate_limits 
FOR ALL 
USING (((current_setting('request.jwt.claims'::text, true))::json ->> 'role'::text) = 'service_role'::text);

-- Enhanced rate limiting function
CREATE OR REPLACE FUNCTION public.check_security_rate_limit(
  p_identifier text,
  p_action_type text,
  p_max_attempts int DEFAULT 5,
  p_window_minutes int DEFAULT 15,
  p_block_minutes int DEFAULT 30
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Input validation functions
CREATE OR REPLACE FUNCTION public.is_valid_uuid(input_text text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;