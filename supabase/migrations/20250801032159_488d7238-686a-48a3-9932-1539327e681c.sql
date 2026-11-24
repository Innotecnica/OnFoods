-- Fix security issues: Add search_path to functions that don't have it set

-- Fix log_otp_security_event function
CREATE OR REPLACE FUNCTION public.log_otp_security_event(p_event_type text, p_user_email text DEFAULT NULL::text, p_details jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO security_audit_log (
    event_type,
    user_id,
    details,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    p_event_type,
    auth.uid(),
    COALESCE(p_details, '{}'),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent',
    NOW()
  );
END;
$function$;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Create profile from user metadata
  INSERT INTO public.profiles (
    user_id,
    name,
    email,
    phone,
    type,
    city,
    state
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'type', 'customer'),
    NEW.raw_user_meta_data->>'city',
    NEW.raw_user_meta_data->>'state'
  );

  RETURN NEW;
END;
$function$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix update_establishment_rating function
CREATE OR REPLACE FUNCTION public.update_establishment_rating()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  avg_rating NUMERIC;
  total_reviews INTEGER;
BEGIN
  -- Calculate new average rating and total reviews for the establishment
  SELECT 
    ROUND(AVG(rating), 2),
    COUNT(*)
  INTO avg_rating, total_reviews
  FROM reviews
  WHERE establishment_id = COALESCE(NEW.establishment_id, OLD.establishment_id);

  -- Update establishment with new values
  UPDATE establishments
  SET 
    rating = COALESCE(avg_rating, 0),
    total_reviews = total_reviews,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.establishment_id, OLD.establishment_id);

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Fix update_product_rating function
CREATE OR REPLACE FUNCTION public.update_product_rating()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  avg_rating NUMERIC;
  total_reviews INTEGER;
BEGIN
  -- Calculate new average rating and total reviews for the product
  SELECT 
    ROUND(AVG(rating), 2),
    COUNT(*)
  INTO avg_rating, total_reviews
  FROM product_reviews
  WHERE product_id = COALESCE(NEW.product_id, OLD.product_id);

  -- Update product with new values
  UPDATE products
  SET 
    rating = COALESCE(avg_rating, 0),
    total_reviews = total_reviews,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);

  RETURN COALESCE(NEW, OLD);
END;
$function$;