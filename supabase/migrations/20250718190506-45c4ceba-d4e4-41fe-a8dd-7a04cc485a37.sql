-- Update get_trending_products function to accept location filters
CREATE OR REPLACE FUNCTION public.get_trending_products(
  days_back integer DEFAULT 7, 
  result_limit integer DEFAULT 10,
  city_filter text DEFAULT NULL,
  state_filter text DEFAULT NULL
)
RETURNS TABLE(
  id uuid, 
  name text, 
  description text, 
  price numeric, 
  image_url text, 
  is_available boolean, 
  establishment_id uuid, 
  category_id uuid, 
  order_count bigint, 
  revenue numeric,
  rating numeric,
  total_reviews integer
)
LANGUAGE sql
STABLE
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
$function$