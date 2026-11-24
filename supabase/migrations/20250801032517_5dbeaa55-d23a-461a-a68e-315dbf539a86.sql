-- Fix security issues for functions without dependencies

-- Update only update_updated_at_column (no dependencies)
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

-- Update update_establishment_rating function
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

-- Update update_product_rating function
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