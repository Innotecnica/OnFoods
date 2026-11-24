-- Fix remaining search_path issues for additional functions
CREATE OR REPLACE FUNCTION public.log_subscription_history(p_establishment_id uuid, p_subscription_id uuid, p_action text, p_old_values jsonb DEFAULT NULL::jsonb, p_new_values jsonb DEFAULT NULL::jsonb, p_triggered_by text DEFAULT 'system'::text, p_stripe_event_id text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Fix search_path for delivery estimate function
CREATE OR REPLACE FUNCTION public.calculate_delivery_estimate(p_establishment_id uuid, p_delivery_latitude numeric DEFAULT NULL::numeric, p_delivery_longitude numeric DEFAULT NULL::numeric)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  establishment_location RECORD;
  base_prep_time INTEGER := 30;
  delivery_distance NUMERIC;
  delivery_time INTEGER;
  total_estimate INTEGER;
  result JSON;
BEGIN
  SELECT latitude, longitude, delivery_time_min, delivery_time_max
  INTO establishment_location
  FROM establishments
  WHERE id = p_establishment_id;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Establishment not found');
  END IF;

  IF p_delivery_latitude IS NULL OR p_delivery_longitude IS NULL THEN
    total_estimate := COALESCE(establishment_location.delivery_time_min, 45);
  ELSE
    delivery_distance := SQRT(
      POWER(69.1 * (p_delivery_latitude - establishment_location.latitude), 2) +
      POWER(69.1 * (establishment_location.longitude - p_delivery_longitude) * 
            COS(p_delivery_latitude / 57.3), 2)
    );

    delivery_time := ROUND(delivery_distance * 2.4);
    total_estimate := base_prep_time + delivery_time;
    total_estimate := GREATEST(total_estimate, COALESCE(establishment_location.delivery_time_min, 30));
    total_estimate := LEAST(total_estimate, COALESCE(establishment_location.delivery_time_max, 90));
  END IF;

  result := json_build_object(
    'estimated_minutes', total_estimate,
    'estimated_delivery_time', NOW() + (total_estimate || ' minutes')::INTERVAL,
    'distance_km', ROUND(delivery_distance::NUMERIC, 2),
    'preparation_time', base_prep_time,
    'delivery_time', delivery_time
  );

  RETURN result;
END;
$function$;

-- Fix search_path for additional functions with security issues  
CREATE OR REPLACE FUNCTION public.validate_secure_session()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_id uuid;
  session_data jsonb;
  is_valid boolean := false;
BEGIN
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'no_user'
    );
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = user_id 
    AND email_confirmed_at IS NOT NULL
  ) THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'user_not_found_or_unconfirmed'
    );
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM security_audit_log
    WHERE user_id = auth.uid()
    AND event_type IN ('suspicious_activity', 'rate_limit_exceeded')
    AND created_at > NOW() - INTERVAL '1 hour'
  ) THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'suspicious_activity_detected'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'valid', true,
    'user_id', user_id,
    'session_validated_at', NOW()
  );
END;
$function$;

-- Fix search_path for validate_csrf_token function
CREATE OR REPLACE FUNCTION public.validate_csrf_token(p_token text, p_session_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_token IS NULL OR length(p_token) < 32 OR p_token !~ '^[a-f0-9]+$' THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$function$;

-- Fix search_path for detect_suspicious_auth_patterns function
CREATE OR REPLACE FUNCTION public.detect_suspicious_auth_patterns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  recent_attempts integer;
  client_ip inet := inet_client_addr();
BEGIN
  SELECT COUNT(*)
  INTO recent_attempts
  FROM security_audit_log
  WHERE event_type = 'failed_login_attempt'
    AND ip_address = client_ip
    AND created_at > NOW() - INTERVAL '15 minutes';
  
  IF recent_attempts >= 3 THEN
    PERFORM log_otp_security_event(
      'suspicious_auth_pattern',
      NEW.email,
      jsonb_build_object(
        'recent_attempts', recent_attempts,
        'source_ip', client_ip,
        'pattern_type', 'multiple_failed_attempts'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;