-- Phase 1: Critical Database Security - Fix Function Search Path Issues
-- Update all database functions to use proper search_path restrictions

-- Fix get_trending_products function
CREATE OR REPLACE FUNCTION public.get_trending_products(days_back integer DEFAULT 7, result_limit integer DEFAULT 10, city_filter text DEFAULT NULL::text, state_filter text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, name text, description text, price numeric, image_url text, is_available boolean, establishment_id uuid, category_id uuid, order_count bigint, revenue numeric, rating numeric, total_reviews integer)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    p.id,
    p.name,
    p.description,
    p.price,
    p.image_url,
    p.is_available,
    p.establishment_id,
    p.category_id,
    COUNT(oi.id) as order_count,
    SUM(oi.total_price) as revenue,
    p.rating,
    p.total_reviews
  FROM products p
  JOIN order_items oi ON p.id = oi.product_id
  JOIN orders o ON oi.order_id = o.id
  JOIN establishments e ON p.establishment_id = e.id
  WHERE o.created_at >= (CURRENT_DATE - INTERVAL '1 day' * days_back)
    AND o.status = 'delivered'
    AND p.is_available = true
    AND e.is_active = true
    AND (city_filter IS NULL OR e.city = city_filter)
    AND (state_filter IS NULL OR e.state = state_filter)
  GROUP BY p.id, p.name, p.description, p.price, p.image_url, p.is_available, p.establishment_id, p.category_id, p.rating, p.total_reviews
  ORDER BY order_count DESC, p.rating DESC, revenue DESC
  LIMIT result_limit;
$function$;

-- Fix search_establishments_advanced function
CREATE OR REPLACE FUNCTION public.search_establishments_advanced(search_query text DEFAULT ''::text, business_type_filter text DEFAULT NULL::text, city_filter text DEFAULT NULL::text, state_filter text DEFAULT NULL::text, min_rating_filter numeric DEFAULT 0, min_delivery_fee_filter numeric DEFAULT 0, max_delivery_fee_filter numeric DEFAULT 999999, max_delivery_time_filter integer DEFAULT 999, only_active_filter boolean DEFAULT true, only_open_filter boolean DEFAULT false, result_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, business_name text, business_type text, address text, city text, state text, phone text, email text, description text, logo_url text, banner_url text, delivery_fee numeric, minimum_order numeric, delivery_time_min integer, delivery_time_max integer, is_active boolean, rating numeric, total_reviews integer, created_at timestamp with time zone, search_rank real)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    e.id,
    e.business_name,
    e.business_type,
    e.address,
    e.city,
    e.state,
    e.phone,
    e.email,
    e.description,
    e.logo_url,
    e.banner_url,
    e.delivery_fee,
    e.minimum_order,
    e.delivery_time_min,
    e.delivery_time_max,
    e.is_active,
    e.rating,
    e.total_reviews,
    e.created_at,
    CASE 
      WHEN search_query = '' THEN 1.0
      ELSE ts_rank(to_tsvector('portuguese', e.business_name || ' ' || COALESCE(e.description, '') || ' ' || COALESCE(e.business_type, '')), 
                   plainto_tsquery('portuguese', search_query))
    END as search_rank
  FROM establishments e
  INNER JOIN establishment_subscriptions es ON e.id = es.establishment_id
  WHERE (business_type_filter IS NULL OR e.business_type = business_type_filter)
    AND (city_filter IS NULL OR e.city = city_filter)
    AND (state_filter IS NULL OR e.state = state_filter)
    AND e.rating >= min_rating_filter
    AND e.delivery_fee >= min_delivery_fee_filter
    AND e.delivery_fee <= max_delivery_fee_filter
    AND COALESCE(e.delivery_time_max, 999) <= max_delivery_time_filter
    AND (NOT only_active_filter OR e.is_active = true)
    AND es.status = 'active'
    AND es.current_period_end > NOW()
    AND (search_query = '' OR 
         to_tsvector('portuguese', e.business_name || ' ' || COALESCE(e.description, '') || ' ' || COALESCE(e.business_type, '')) @@ 
         plainto_tsquery('portuguese', search_query))
  ORDER BY search_rank DESC, e.rating DESC, e.business_name
  LIMIT result_limit;
$function$;

-- Fix search_products_advanced function
CREATE OR REPLACE FUNCTION public.search_products_advanced(search_query text DEFAULT ''::text, category_filter uuid DEFAULT NULL::uuid, establishment_filter uuid DEFAULT NULL::uuid, min_price_filter numeric DEFAULT 0, max_price_filter numeric DEFAULT 999999, only_available_filter boolean DEFAULT false, result_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, name text, description text, price numeric, image_url text, is_available boolean, establishment_id uuid, category_id uuid, search_rank real)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    p.id,
    p.name,
    p.description,
    p.price,
    p.image_url,
    p.is_available,
    p.establishment_id,
    p.category_id,
    CASE 
      WHEN search_query = '' THEN 1.0
      ELSE ts_rank(to_tsvector('portuguese', p.name || ' ' || COALESCE(p.description, '')), 
                   plainto_tsquery('portuguese', search_query))
    END as search_rank
  FROM products p
  WHERE (category_filter IS NULL OR p.category_id = category_filter)
    AND (establishment_filter IS NULL OR p.establishment_id = establishment_filter)
    AND p.price >= min_price_filter
    AND p.price <= max_price_filter
    AND (NOT only_available_filter OR p.is_available = true)
    AND (search_query = '' OR 
         to_tsvector('portuguese', p.name || ' ' || COALESCE(p.description, '')) @@ 
         plainto_tsquery('portuguese', search_query))
  ORDER BY search_rank DESC, p.name
  LIMIT result_limit;
$function$;

-- Fix get_frequently_bought_together function
CREATE OR REPLACE FUNCTION public.get_frequently_bought_together(target_product_id uuid, result_limit integer DEFAULT 10)
 RETURNS TABLE(id uuid, name text, description text, price numeric, image_url text, is_available boolean, establishment_id uuid, category_id uuid, frequency bigint)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH product_pairs AS (
    SELECT 
      oi1.product_id as product1_id,
      oi2.product_id as product2_id,
      COUNT(*) as frequency
    FROM order_items oi1
    JOIN order_items oi2 ON oi1.order_id = oi2.order_id
    WHERE oi1.product_id = target_product_id
      AND oi2.product_id != target_product_id
    GROUP BY oi1.product_id, oi2.product_id
    ORDER BY frequency DESC
    LIMIT result_limit
  )
  SELECT 
    p.id,
    p.name,
    p.description,
    p.price,
    p.image_url,
    p.is_available,
    p.establishment_id,
    p.category_id,
    pp.frequency
  FROM product_pairs pp
  JOIN products p ON pp.product2_id = p.id
  WHERE p.is_available = true
  ORDER BY pp.frequency DESC;
$function$;

-- Phase 2: Strengthen RLS Policies
-- Tighten establishment_subscriptions policies
DROP POLICY IF EXISTS "Edge functions can manage subscriptions" ON public.establishment_subscriptions;
CREATE POLICY "Edge functions can manage subscriptions" ON public.establishment_subscriptions
FOR ALL 
USING (
  -- Only allow service_role (edge functions) or establishment owners
  (((current_setting('request.jwt.claims'::text, true))::json ->> 'role'::text) = 'service_role'::text)
  OR (establishment_id IN (
    SELECT establishments.id
    FROM establishments
    WHERE establishments.user_id = auth.uid()
  ))
);

-- Tighten notification_queue policies  
DROP POLICY IF EXISTS "System can manage notification queue" ON public.notification_queue;
CREATE POLICY "Service role can manage notification queue" ON public.notification_queue
FOR ALL 
USING (
  ((current_setting('request.jwt.claims'::text, true))::json ->> 'role'::text) = 'service_role'::text
);

-- Tighten stripe_connected_accounts policies
DROP POLICY IF EXISTS "Edge functions can manage connected accounts" ON public.stripe_connected_accounts;
CREATE POLICY "Service role can manage connected accounts" ON public.stripe_connected_accounts
FOR ALL 
USING (
  -- Only service_role for full management
  ((current_setting('request.jwt.claims'::text, true))::json ->> 'role'::text) = 'service_role'::text
);

-- Add establishment owner read access for connected accounts
CREATE POLICY "Establishment owners can view connected accounts" ON public.stripe_connected_accounts
FOR SELECT 
USING (
  establishment_id IN (
    SELECT establishments.id
    FROM establishments
    WHERE establishments.user_id = auth.uid()
  )
);

-- Phase 3: Enhanced Security Functions
-- Create function for secure password validation
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

-- Create function for UUID validation
CREATE OR REPLACE FUNCTION public.is_valid_uuid(input_text text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SECURITY DEFINER
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