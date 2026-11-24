-- Fix ambiguous user_id references and missing fields in triggers

-- 1. Fix triggers that reference ambiguous user_id columns
-- Ensure all queries properly qualify table aliases

-- 2. Fix missing subtotal field issue in order triggers
-- The trigger is trying to access NEW.subtotal but orders table doesn't have this field
-- Update triggers to use correct field names

CREATE OR REPLACE FUNCTION public.handle_new_order_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  customer_profile RECORD;
  establishment_profile RECORD;
BEGIN
  -- Get customer profile with explicit table qualification
  SELECT p.name, p.phone 
  INTO customer_profile
  FROM public.profiles p
  WHERE p.user_id = NEW.customer_id;

  -- Get establishment info with explicit table qualification
  SELECT e.business_name, e.user_id, e.phone
  INTO establishment_profile
  FROM public.establishments e
  WHERE e.id = NEW.establishment_id;

  -- Create notification for establishment owner
  INSERT INTO public.notifications (
    user_id,
    order_id,
    type,
    title,
    message,
    metadata,
    priority
  ) VALUES (
    establishment_profile.user_id,
    NEW.id,
    'new_order',
    'Novo Pedido Recebido',
    format('Novo pedido #%s de %s - R$ %s', 
           substring(NEW.id::text, 1, 8), 
           COALESCE(customer_profile.name, 'Cliente'), 
           to_char(NEW.total_amount, 'FM999G999D00')), -- Use total_amount instead of subtotal
    jsonb_build_object(
      'order_id', NEW.id,
      'customer_name', customer_profile.name,
      'customer_phone', customer_profile.phone,
      'total_amount', NEW.total_amount, -- Use total_amount instead of subtotal
      'establishment_name', establishment_profile.business_name,
      'action_url', '/dashboard'
    ),
    'high'
  );

  -- Queue WhatsApp notification to establishment
  INSERT INTO public.notification_queue (
    type,
    recipient,
    message,
    establishment_id,
    order_id,
    metadata
  ) VALUES (
    'new_order_whatsapp',
    establishment_profile.phone,
    format('🛒 NOVO PEDIDO! #%s de %s - R$ %s',
           substring(NEW.id::text, 1, 8),
           COALESCE(customer_profile.name, 'Cliente'),
           to_char(NEW.total_amount, 'FM999G999D00')), -- Use total_amount instead of subtotal
    NEW.establishment_id,
    NEW.id,
    jsonb_build_object(
      'order_id', NEW.id,
      'customer_name', customer_profile.name,
      'customer_phone', customer_profile.phone,
      'total_amount', NEW.total_amount, -- Use total_amount instead of subtotal
      'message_type', 'order_summary'
    )
  );

  RETURN NEW;
END;
$function$;

-- Drop and recreate the trigger with proper name
DROP TRIGGER IF EXISTS on_order_created ON public.orders;
CREATE TRIGGER on_order_created
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_order_notification();

-- 3. Fix promotion usage queries with ambiguous user_id
-- Update promotion-related functions to use proper table aliases

CREATE OR REPLACE FUNCTION public.get_customer_promotions(customer_user_id UUID)
RETURNS TABLE(
  promotion_id UUID,
  promotion_title TEXT,
  discount_amount NUMERIC,
  used_at TIMESTAMPTZ,
  order_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    pu.promotion_id,
    p.title as promotion_title,
    pu.discount_applied as discount_amount,
    pu.used_at,
    pu.order_id
  FROM promotion_usage pu
  INNER JOIN promotions p ON pu.promotion_id = p.id
  WHERE pu.customer_id = customer_user_id
  ORDER BY pu.used_at DESC;
END;
$function$;

-- 4. Add missing created_at fields where needed and fix field references
-- Ensure all necessary tables have proper timestamp fields

ALTER TABLE public.cart_items 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create trigger to auto-update updated_at for cart_items
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for cart_items
DROP TRIGGER IF EXISTS update_cart_items_updated_at ON public.cart_items;
CREATE TRIGGER update_cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Fix any other ambiguous column references in commonly used views/functions
-- Update establishment search function to use proper aliases

CREATE OR REPLACE FUNCTION public.search_establishments_with_location(
  search_query TEXT DEFAULT '',
  filter_city TEXT DEFAULT NULL,
  filter_state TEXT DEFAULT NULL,
  result_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
  id UUID,
  business_name TEXT,
  business_type TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  phone TEXT,
  email TEXT,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  delivery_fee NUMERIC,
  minimum_order NUMERIC,
  delivery_time_min INTEGER,
  delivery_time_max INTEGER,
  is_active BOOLEAN,
  rating NUMERIC,
  total_reviews INTEGER,
  created_at TIMESTAMPTZ,
  search_rank REAL
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
      ELSE ts_rank(
        to_tsvector('portuguese', e.business_name || ' ' || COALESCE(e.description, '') || ' ' || COALESCE(e.business_type, '')), 
        plainto_tsquery('portuguese', search_query)
      )
    END as search_rank
  FROM establishments e
  LEFT JOIN establishment_subscriptions es ON e.id = es.establishment_id
  WHERE (filter_city IS NULL OR e.city = filter_city)
    AND (filter_state IS NULL OR e.state = filter_state)
    AND e.is_active = true
    AND (es.status = 'active' OR es.status IS NULL)
    AND (search_query = '' OR 
         to_tsvector('portuguese', e.business_name || ' ' || COALESCE(e.description, '') || ' ' || COALESCE(e.business_type, '')) @@ 
         plainto_tsquery('portuguese', search_query))
  ORDER BY search_rank DESC, e.rating DESC, e.business_name
  LIMIT result_limit;
$function$;

-- 6. Ensure proper indexing for performance and fix any constraint issues
CREATE INDEX IF NOT EXISTS idx_orders_customer_establishment ON public.orders(customer_id, establishment_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_product ON public.order_items(order_id, product_id);
CREATE INDEX IF NOT EXISTS idx_promotion_usage_customer_promotion ON public.promotion_usage(customer_id, promotion_id);

-- 7. Add logging for debugging ambiguous column references
INSERT INTO public.security_audit_log (
  event_type,
  details,
  created_at
) VALUES (
  'system_consolidation',
  jsonb_build_object(
    'action', 'fixed_ambiguous_column_references',
    'tables_affected', ARRAY['orders', 'promotion_usage', 'cart_items'],
    'triggers_updated', ARRAY['handle_new_order_notification', 'update_cart_items_updated_at'],
    'timestamp', NOW()
  ),
  NOW()
);

COMMENT ON FUNCTION public.handle_new_order_notification() IS 'Fixed trigger to use total_amount instead of non-existent subtotal field and qualified table references';
COMMENT ON FUNCTION public.get_customer_promotions(UUID) IS 'Fixed function to avoid ambiguous user_id column references';
COMMENT ON FUNCTION public.search_establishments_with_location(TEXT, TEXT, TEXT, INTEGER) IS 'Updated search function with proper table aliases to avoid ambiguous references';