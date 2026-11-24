-- 1) Prevent profile.type tampering unless service_role
CREATE OR REPLACE FUNCTION public.prevent_profile_type_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public, pg_temp'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.type IS DISTINCT FROM OLD.type THEN
    -- Allow only service_role to change profile type
    IF COALESCE(((current_setting('request.jwt.claims', true))::json ->> 'role'), '') != 'service_role' THEN
      RAISE EXCEPTION 'Modifying profiles.type is not allowed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_type_change ON public.profiles;
CREATE TRIGGER trg_prevent_profile_type_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_type_change();

-- 2) Harden and authorize get_establishment_orders_realtime
CREATE OR REPLACE FUNCTION public.get_establishment_orders_realtime(p_establishment_id uuid, p_limit integer DEFAULT 20)
RETURNS TABLE(
  id uuid, 
  customer_name text, 
  customer_phone text, 
  status public.order_status, 
  total_amount numeric, 
  created_at timestamptz, 
  estimated_delivery_time timestamptz, 
  delivery_address text, 
  items_count bigint, 
  time_since_order text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public, pg_temp'
AS $$
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Ensure caller owns the establishment
  IF NOT EXISTS (
    SELECT 1 FROM establishments e
    WHERE e.id = p_establishment_id AND e.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT 
    o.id,
    p.name as customer_name,
    p.phone as customer_phone,
    o.status,
    o.total_amount,
    o.created_at,
    o.estimated_delivery_time,
    CONCAT(a.street, ', ', a.number, ' - ', a.neighborhood, ', ', a.city) as delivery_address,
    COUNT(oi.id) as items_count,
    CASE 
      WHEN EXTRACT(EPOCH FROM (NOW() - o.created_at)) < 3600 THEN 
        EXTRACT(EPOCH FROM (NOW() - o.created_at))::INTEGER || ' min atrás'
      ELSE 
        ROUND(EXTRACT(EPOCH FROM (NOW() - o.created_at)) / 3600) || 'h atrás'
    END as time_since_order
  FROM orders o
  LEFT JOIN profiles p ON o.customer_id = p.user_id
  LEFT JOIN addresses a ON o.address_id = a.id
  LEFT JOIN order_items oi ON o.id = oi.order_id
  WHERE o.establishment_id = p_establishment_id
  GROUP BY o.id, p.name, p.phone, o.status, o.total_amount, o.created_at, 
           o.estimated_delivery_time, a.street, a.number, a.neighborhood, a.city;
END;
$$;

-- 3) Harden and authorize track_order_realtime
CREATE OR REPLACE FUNCTION public.track_order_realtime(p_order_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public, pg_temp'
AS $$
DECLARE
  order_info RECORD;
  establishment_info RECORD;
  items_info JSON;
  result JSON;
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Authorize: caller must be the customer or the establishment owner
  IF NOT EXISTS (
    SELECT 1
    FROM orders o
    LEFT JOIN establishments e ON o.establishment_id = e.id
    WHERE o.id = p_order_id
      AND (o.customer_id = auth.uid() OR e.user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Existing function logic
  SELECT 
    o.*,
    p.name as customer_name,
    p.phone as customer_phone,
    a.street, a.number, a.neighborhood, a.city, a.state
  INTO order_info
  FROM orders o
  LEFT JOIN profiles p ON o.customer_id = p.user_id
  LEFT JOIN addresses a ON o.address_id = a.id
  WHERE o.id = p_order_id;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Order not found');
  END IF;

  SELECT business_name, phone, address, city, state
  INTO establishment_info
  FROM establishments
  WHERE id = order_info.establishment_id;

  SELECT json_agg(
    json_build_object(
      'product_name', pr.name,
      'quantity', oi.quantity,
      'unit_price', oi.unit_price,
      'total_price', oi.total_price
    )
  )
  INTO items_info
  FROM order_items oi
  LEFT JOIN products pr ON oi.product_id = pr.id
  WHERE oi.order_id = p_order_id;

  result := json_build_object(
    'order', json_build_object(
      'id', order_info.id,
      'status', order_info.status,
      'total_amount', order_info.total_amount,
      'delivery_fee', order_info.delivery_fee,
      'created_at', order_info.created_at,
      'estimated_delivery_time', order_info.estimated_delivery_time,
      'delivered_at', order_info.delivered_at,
      'notes', order_info.notes,
      'delivery_instructions', order_info.delivery_instructions
    ),
    'customer', json_build_object(
      'name', order_info.customer_name,
      'phone', order_info.customer_phone
    ),
    'establishment', json_build_object(
      'name', establishment_info.business_name,
      'phone', establishment_info.phone,
      'address', establishment_info.address
    ),
    'delivery_address', json_build_object(
      'street', order_info.street,
      'number', order_info.number,
      'neighborhood', order_info.neighborhood,
      'city', order_info.city,
      'state', order_info.state
    ),
    'items', items_info
  );

  RETURN result;
END;
$$;

-- 4) Harden and authorize get_order_details
CREATE OR REPLACE FUNCTION public.get_order_details(p_order_id uuid)
RETURNS TABLE(
  order_id uuid,
  customer_name text,
  customer_phone text,
  customer_email text,
  establishment_name text,
  establishment_phone text,
  total_amount numeric,
  status text,
  created_at timestamptz,
  delivery_address text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public, pg_temp'
AS $$
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Authorize: caller must be the customer or the establishment owner
  IF NOT EXISTS (
    SELECT 1
    FROM orders o
    LEFT JOIN establishments e ON o.establishment_id = e.id
    WHERE o.id = p_order_id
      AND (o.customer_id = auth.uid() OR e.user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT 
    o.id,
    cp.name,
    cp.phone,
    cp.email,
    e.business_name,
    e.phone,
    o.total_amount,
    o.status::text,
    o.created_at,
    CONCAT(a.street, ', ', a.number, ' - ', a.neighborhood, ', ', a.city, ' - ', a.state)
  FROM orders o
  LEFT JOIN profiles cp ON o.customer_id = cp.user_id
  LEFT JOIN establishments e ON o.establishment_id = e.id
  LEFT JOIN addresses a ON o.address_id = a.id
  WHERE o.id = p_order_id;
END;
$$;