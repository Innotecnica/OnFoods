-- Correção de problemas de segurança do Supabase (corrigida)

-- 1. Corrigir funções sem search_path definido (especificando assinaturas únicas)
ALTER FUNCTION public.update_product_rating() SET search_path = 'public';
ALTER FUNCTION public.calculate_delivery_estimate(bigint) SET search_path = 'public';
ALTER FUNCTION public.calculate_delivery_estimate(uuid, numeric, numeric) SET search_path = 'public';
ALTER FUNCTION public.ensure_single_default_card() SET search_path = 'public';
ALTER FUNCTION public.ensure_single_primary_image() SET search_path = 'public';
ALTER FUNCTION public.log_subscription_history(uuid, uuid, text, jsonb, jsonb, text, text) SET search_path = 'public';
ALTER FUNCTION public.check_rate_limit(text, text, integer, integer) SET search_path = 'public';
ALTER FUNCTION public.log_metric(text, numeric, jsonb, text) SET search_path = 'public';
ALTER FUNCTION public.validate_auth_system_integrity() SET search_path = 'public';
ALTER FUNCTION public.monitor_security_health() SET search_path = 'public';
ALTER FUNCTION public.process_stripe_webhook_event(text, text, text, text, jsonb) SET search_path = 'public';
ALTER FUNCTION public.validate_password_strength(text) SET search_path = 'public';

-- 2. Corrigir views inseguras com SECURITY DEFINER
-- Recriar orders_with_customer view com security_invoker
DROP VIEW IF EXISTS public.orders_with_customer;
CREATE OR REPLACE VIEW public.orders_with_customer 
WITH (security_invoker=on) AS
SELECT 
    o.id, 
    o.customer_id, 
    o.establishment_id,
    o.address_id,
    o.status,
    o.total_amount,
    o.delivery_fee,
    o.discount_amount,
    o.payment_method,
    o.payment_status,
    o.estimated_delivery_time,
    o.delivered_at,
    o.created_at,
    o.updated_at,
    o.platform_fee_amount,
    o.restaurant_amount,
    o.delivery_latitude,
    o.delivery_longitude,
    o.pickup_time,
    o.notes,
    o.stripe_payment_intent_id,
    o.stripe_charge_id,
    o.delivery_instructions,
    o.driver_notes,
    p.name AS customer_name,
    p.phone AS customer_phone,
    p.email AS customer_email,
    e.business_name AS establishment_name,
    e.phone AS establishment_phone
FROM orders o
LEFT JOIN profiles p ON o.customer_id = p.user_id
LEFT JOIN establishments e ON o.establishment_id = e.id
WHERE 
    o.customer_id = auth.uid() 
    OR o.establishment_id IN (
        SELECT id FROM establishments WHERE user_id = auth.uid()
    );

-- Recriar cart_with_stats view com security_invoker
DROP VIEW IF EXISTS public.cart_with_stats;
CREATE OR REPLACE VIEW public.cart_with_stats 
WITH (security_invoker=on) AS
SELECT 
    c.id, 
    c.user_id,
    c.establishment_id,
    c.created_at,
    c.updated_at,
    COUNT(ci.id) AS item_count,
    SUM(ci.quantity * ci.unit_price) AS total_amount,
    SUM(ci.quantity) AS total_items,
    e.delivery_fee,
    e.minimum_order,
    e.is_active AS establishment_active,
    e.business_name
FROM carts c
LEFT JOIN cart_items ci ON c.id = ci.cart_id
LEFT JOIN establishments e ON c.establishment_id = e.id
WHERE c.user_id = auth.uid()
GROUP BY c.id, c.user_id, c.establishment_id, c.created_at, c.updated_at, 
         e.delivery_fee, e.minimum_order, e.is_active, e.business_name;

-- 3. Criar função auxiliar para log de eventos de segurança OTP
CREATE OR REPLACE FUNCTION public.log_otp_security_event(
    p_event_type text,
    p_user_email text DEFAULT NULL,
    p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
        p_details || jsonb_build_object('user_email', p_user_email),
        inet_client_addr(),
        current_setting('request.headers', true)::json->>'user-agent',
        NOW()
    );
END;
$$;