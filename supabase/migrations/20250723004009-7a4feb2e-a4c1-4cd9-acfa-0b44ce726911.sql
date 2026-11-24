-- Corrigir search_path em funções para produção (Fix security warnings)
-- Função 1: get_trending_products
CREATE OR REPLACE FUNCTION public.get_trending_products(days_back integer DEFAULT 7, result_limit integer DEFAULT 10, city_filter text DEFAULT NULL::text, state_filter text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, name text, description text, price numeric, image_url text, is_available boolean, establishment_id uuid, category_id uuid, order_count bigint, revenue numeric, rating numeric, total_reviews integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
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

-- Função 2: search_establishments_advanced  
CREATE OR REPLACE FUNCTION public.search_establishments_advanced(search_query text DEFAULT ''::text, business_type_filter text DEFAULT NULL::text, city_filter text DEFAULT NULL::text, state_filter text DEFAULT NULL::text, min_rating_filter numeric DEFAULT 0, min_delivery_fee_filter numeric DEFAULT 0, max_delivery_fee_filter numeric DEFAULT 999999, max_delivery_time_filter integer DEFAULT 999, only_active_filter boolean DEFAULT true, only_open_filter boolean DEFAULT false, result_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, business_name text, business_type text, address text, city text, state text, phone text, email text, description text, logo_url text, banner_url text, delivery_fee numeric, minimum_order numeric, delivery_time_min integer, delivery_time_max integer, is_active boolean, rating numeric, total_reviews integer, created_at timestamp with time zone, search_rank real)
 LANGUAGE sql
 STABLE SECURITY DEFINER
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

-- Função 3: search_products_advanced
CREATE OR REPLACE FUNCTION public.search_products_advanced(search_query text DEFAULT ''::text, category_filter uuid DEFAULT NULL::uuid, establishment_filter uuid DEFAULT NULL::uuid, min_price_filter numeric DEFAULT 0, max_price_filter numeric DEFAULT 999999, only_available_filter boolean DEFAULT false, result_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, name text, description text, price numeric, image_url text, is_available boolean, establishment_id uuid, category_id uuid, search_rank real)
 LANGUAGE sql
 STABLE SECURITY DEFINER
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

-- Função 4: get_dashboard_stats 
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(user_id uuid, today_start timestamp with time zone, month_start timestamp with time zone)
 RETURNS TABLE(total_orders integer, today_orders integer, monthly_revenue numeric, today_revenue numeric, active_products integer, average_rating numeric, total_reviews integer, orders_by_status jsonb, recent_orders jsonb, top_products jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  establishment_id UUID;
BEGIN
  -- Get establishment ID
  SELECT id INTO establishment_id 
  FROM establishments 
  WHERE establishments.user_id = get_dashboard_stats.user_id 
    AND is_active = true;
  
  IF establishment_id IS NULL THEN
    -- Return empty stats if no establishment found
    RETURN QUERY SELECT 
      0::INTEGER, 0::INTEGER, 0::NUMERIC, 0::NUMERIC, 
      0::INTEGER, 0::NUMERIC, 0::INTEGER, 
      '{}'::JSONB, '[]'::JSONB, '[]'::JSONB;
    RETURN;
  END IF;
  
  RETURN QUERY
  WITH order_stats AS (
    SELECT 
      COUNT(*)::INTEGER as total_orders,
      COUNT(*) FILTER (WHERE created_at >= today_start)::INTEGER as today_orders,
      COALESCE(SUM(total_amount) FILTER (WHERE created_at >= month_start), 0) as monthly_revenue,
      COALESCE(SUM(total_amount) FILTER (WHERE created_at >= today_start), 0) as today_revenue,
      jsonb_object_agg(
        status, 
        COUNT(*) FILTER (WHERE status IS NOT NULL)
      ) as status_counts
    FROM orders 
    WHERE orders.establishment_id = get_dashboard_stats.establishment_id
  ),
  product_stats AS (
    SELECT COUNT(*)::INTEGER as active_products
    FROM products 
    WHERE products.establishment_id = get_dashboard_stats.establishment_id 
      AND is_available = true
  ),
  establishment_info AS (
    SELECT 
      COALESCE(rating, 0) as avg_rating,
      COALESCE(total_reviews, 0) as review_count
    FROM establishments 
    WHERE id = get_dashboard_stats.establishment_id
  ),
  recent_orders_data AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', o.id,
        'customer_name', o.customer_name,
        'total_amount', o.total_amount,
        'status', o.status,
        'created_at', o.created_at
      ) ORDER BY o.created_at DESC
    ) as recent_orders
    FROM (
      SELECT * FROM orders 
      WHERE orders.establishment_id = get_dashboard_stats.establishment_id
      ORDER BY created_at DESC 
      LIMIT 5
    ) o
  ),
  top_products_data AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'price', p.price,
        'order_count', COALESCE(oi_stats.order_count, 0)
      ) ORDER BY COALESCE(oi_stats.order_count, 0) DESC
    ) as top_products
    FROM products p
    LEFT JOIN (
      SELECT 
        product_id, 
        COUNT(*) as order_count
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.establishment_id = get_dashboard_stats.establishment_id
        AND o.created_at >= month_start
      GROUP BY product_id
    ) oi_stats ON p.id = oi_stats.product_id
    WHERE p.establishment_id = get_dashboard_stats.establishment_id
      AND p.is_available = true
    LIMIT 5
  )
  SELECT 
    os.total_orders,
    os.today_orders,
    os.monthly_revenue,
    os.today_revenue,
    ps.active_products,
    ei.avg_rating,
    ei.review_count,
    COALESCE(os.status_counts, '{}'::JSONB),
    COALESCE(ro.recent_orders, '[]'::JSONB),
    COALESCE(tp.top_products, '[]'::JSONB)
  FROM order_stats os
  CROSS JOIN product_stats ps
  CROSS JOIN establishment_info ei
  CROSS JOIN recent_orders_data ro
  CROSS JOIN top_products_data tp;
END;
$function$;

-- Função 5: complete_establishment_onboarding
CREATE OR REPLACE FUNCTION public.complete_establishment_onboarding(establishment_id uuid, business_name text, business_type text, cnpj text DEFAULT NULL::text, address text DEFAULT NULL::text, city text DEFAULT NULL::text, state text DEFAULT NULL::text, phone text DEFAULT NULL::text, description text DEFAULT NULL::text, logo_url text DEFAULT NULL::text, banner_url text DEFAULT NULL::text, opening_hours jsonb DEFAULT NULL::jsonb, delivery_fee numeric DEFAULT 5.00, minimum_order numeric DEFAULT 20.00, delivery_time_min integer DEFAULT 30, delivery_time_max integer DEFAULT 60)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSON;
BEGIN
  -- Update establishment with complete information
  UPDATE public.establishments 
  SET 
    business_name = complete_establishment_onboarding.business_name,
    business_type = complete_establishment_onboarding.business_type,
    cnpj = complete_establishment_onboarding.cnpj,
    address = complete_establishment_onboarding.address,
    city = complete_establishment_onboarding.city,
    state = complete_establishment_onboarding.state,
    phone = COALESCE(complete_establishment_onboarding.phone, establishments.phone),
    description = complete_establishment_onboarding.description,
    logo_url = complete_establishment_onboarding.logo_url,
    banner_url = complete_establishment_onboarding.banner_url,
    opening_hours = complete_establishment_onboarding.opening_hours,
    delivery_fee = complete_establishment_onboarding.delivery_fee,
    minimum_order = complete_establishment_onboarding.minimum_order,
    delivery_time_min = complete_establishment_onboarding.delivery_time_min,
    delivery_time_max = complete_establishment_onboarding.delivery_time_max,
    is_active = true, -- Activate establishment after completion
    updated_at = NOW()
  WHERE id = establishment_id 
    AND user_id = auth.uid() -- Security: only allow user to update their own establishment
  RETURNING row_to_json(establishments.*) INTO result;

  IF result IS NULL THEN
    RAISE EXCEPTION 'Establishment not found or access denied';
  END IF;

  RETURN result;
END;
$function$;