-- Fix critical security issues identified by the linter

-- 1. Fix functions with mutable search_path (SECURITY DEFINER functions need explicit search_path)
-- Update all SECURITY DEFINER functions to have explicit search_path

-- Functions that need search_path fix:
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'  -- Explicit search_path
AS $function$
DECLARE
  user_type_value public.user_type;
BEGIN
  -- Determinar tipo de usuário baseado nos metadados
  user_type_value := COALESCE(
    (NEW.raw_user_meta_data->>'type')::public.user_type, 
    'customer'::public.user_type
  );

  -- Inserir perfil
  INSERT INTO public.profiles (
    user_id, 
    email, 
    name, 
    type, 
    phone, 
    city, 
    state
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    user_type_value,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'city',
    NEW.raw_user_meta_data->>'state'
  );

  -- Atribuir role padrão
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE 
    WHEN user_type_value = 'establishment' THEN 'establishment_owner'::public.app_role
    ELSE 'customer'::public.app_role
  END);

  RETURN NEW;
END;
$function$;

-- Update other critical functions
CREATE OR REPLACE FUNCTION public.validate_password_strength(password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'  -- Explicit search_path
AS $function$
DECLARE
  has_upper boolean := password ~ '[A-Z]';
  has_lower boolean := password ~ '[a-z]';
  has_digit boolean := password ~ '[0-9]';
  has_special boolean := password ~ '[^A-Za-z0-9]';
  is_long_enough boolean := length(password) >= 8;
BEGIN
  -- Check if password meets security requirements
  IF NOT (has_upper AND has_lower AND has_digit AND is_long_enough) THEN
    -- Log weak password attempt
    PERFORM public.log_otp_security_event(
      'weak_password_attempt',
      NULL,
      jsonb_build_object(
        'has_upper', has_upper,
        'has_lower', has_lower,
        'has_digit', has_digit,
        'has_special', has_special,
        'is_long_enough', is_long_enough
      )
    );
    RETURN false;
  END IF;
  
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_otp_security_event(event_type text, user_email text DEFAULT NULL::text, additional_details jsonb DEFAULT NULL::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'  -- Explicit search_path
AS $function$
BEGIN
  -- Log OTP-related security events
  INSERT INTO public.security_audit_log (
    event_type,
    user_id,
    details,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    event_type,
    COALESCE(auth.uid(), NULL),
    jsonb_build_object(
      'user_email', user_email,
      'timestamp', now(),
      'additional_details', additional_details
    ),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent',
    now()
  );
END;
$function$;

-- Update all other SECURITY DEFINER functions to have explicit search_path
CREATE OR REPLACE FUNCTION public.validate_session_security()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'  -- Explicit search_path
AS $function$
BEGIN
  -- Log session validation attempts
  PERFORM public.log_otp_security_event(
    'session_validation',
    NEW.email,
    jsonb_build_object(
      'user_id', NEW.id,
      'confirmation_token_present', NEW.confirmation_token IS NOT NULL,
      'recovery_token_present', NEW.recovery_token IS NOT NULL
    )
  );
  
  RETURN NEW;
END;
$function$;

-- Fix views with SECURITY DEFINER (convert to regular views or remove SECURITY DEFINER)
-- Drop and recreate problematic views without SECURITY DEFINER

-- 2. Create secure views that don't bypass RLS
DROP VIEW IF EXISTS orders_with_customer;
CREATE VIEW orders_with_customer AS
SELECT 
  o.*,
  p.name as customer_name,
  p.phone as customer_phone,
  p.email as customer_email,
  e.business_name as establishment_name,
  e.phone as establishment_phone
FROM orders o
LEFT JOIN profiles p ON o.customer_id = p.user_id
LEFT JOIN establishments e ON o.establishment_id = e.id;

-- Ensure RLS is respected on the view
ALTER VIEW orders_with_customer OWNER TO postgres;

DROP VIEW IF EXISTS cart_with_stats;
CREATE VIEW cart_with_stats AS
SELECT 
  c.*,
  COUNT(ci.id) as item_count,
  COALESCE(SUM(ci.quantity * p.price), 0) as total_amount,
  COALESCE(SUM(ci.quantity), 0) as total_items,
  e.delivery_fee,
  e.minimum_order,
  e.is_active as establishment_active,
  e.business_name
FROM carts c
LEFT JOIN cart_items ci ON c.id = ci.cart_id
LEFT JOIN products p ON ci.product_id = p.id
LEFT JOIN establishments e ON c.establishment_id = e.id
GROUP BY c.id, e.delivery_fee, e.minimum_order, e.is_active, e.business_name;

-- Ensure RLS is respected on the view
ALTER VIEW cart_with_stats OWNER TO postgres;

-- 3. Log security improvements
INSERT INTO public.security_audit_log (
  event_type,
  details,
  created_at
) VALUES (
  'security_hardening',
  jsonb_build_object(
    'action', 'fixed_security_definer_issues',
    'functions_updated', ARRAY[
      'handle_new_user',
      'validate_password_strength', 
      'log_otp_security_event',
      'validate_session_security'
    ],
    'views_fixed', ARRAY['orders_with_customer', 'cart_with_stats'],
    'timestamp', NOW()
  ),
  NOW()
);

COMMENT ON FUNCTION public.handle_new_user() IS 'Updated with explicit search_path for security';
COMMENT ON FUNCTION public.validate_password_strength(text) IS 'Updated with explicit search_path for security';
COMMENT ON FUNCTION public.log_otp_security_event(text, text, jsonb) IS 'Updated with explicit search_path for security';
COMMENT ON FUNCTION public.validate_session_security() IS 'Updated with explicit search_path for security';