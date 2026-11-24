-- Update the search_establishments_advanced function to include max delivery time filter
CREATE OR REPLACE FUNCTION public.search_establishments_advanced(
  search_query text DEFAULT ''::text, 
  business_type_filter text DEFAULT NULL::text, 
  city_filter text DEFAULT NULL::text, 
  state_filter text DEFAULT NULL::text, 
  min_rating_filter numeric DEFAULT 0, 
  min_delivery_fee_filter numeric DEFAULT 0, 
  max_delivery_fee_filter numeric DEFAULT 999999, 
  max_delivery_time_filter integer DEFAULT 999,
  only_active_filter boolean DEFAULT true, 
  only_open_filter boolean DEFAULT false, 
  result_limit integer DEFAULT 20
)
RETURNS TABLE(
  id uuid, 
  business_name text, 
  business_type text, 
  address text, 
  city text, 
  state text, 
  phone text, 
  email text, 
  description text, 
  logo_url text, 
  banner_url text, 
  delivery_fee numeric, 
  minimum_order numeric, 
  delivery_time_min integer, 
  delivery_time_max integer, 
  is_active boolean, 
  rating numeric, 
  total_reviews integer, 
  created_at timestamp with time zone, 
  search_rank real
)
LANGUAGE sql
STABLE
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
$function$