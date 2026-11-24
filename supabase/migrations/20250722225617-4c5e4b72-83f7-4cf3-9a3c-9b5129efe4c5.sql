-- Phase 1: Critical Security Fixes - Database Function Hardening

-- Fix get_dashboard_stats function
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

-- Fix complete_establishment_onboarding function
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

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_type_value TEXT;
  profile_created BOOLEAN := FALSE;
  establishment_created BOOLEAN := FALSE;
BEGIN
  -- Log da execução
  RAISE NOTICE 'TRIGGER handle_new_user executado para: % (%), type: %', 
    NEW.email, NEW.id, COALESCE(NEW.raw_user_meta_data->>'type', 'customer');
  
  -- Validar e normalizar tipo de usuário
  user_type_value := COALESCE(NEW.raw_user_meta_data->>'type', 'customer');
  IF user_type_value NOT IN ('customer', 'establishment') THEN
    user_type_value := 'customer';
  END IF;

  -- 1. CRIAR PROFILE (SEMPRE)
  BEGIN
    INSERT INTO public.profiles (
      user_id, 
      email, 
      name, 
      type, 
      phone, 
      cpf, 
      birth_date, 
      city, 
      state
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
      user_type_value::public.user_type,
      NEW.raw_user_meta_data->>'phone',
      NEW.raw_user_meta_data->>'cpf',
      CASE 
        WHEN NEW.raw_user_meta_data->>'birth_date' IS NOT NULL AND NEW.raw_user_meta_data->>'birth_date' != ''
        THEN (NEW.raw_user_meta_data->>'birth_date')::date 
        ELSE NULL 
      END,
      NEW.raw_user_meta_data->>'city',
      NEW.raw_user_meta_data->>'state'
    );
    
    profile_created := TRUE;
    RAISE NOTICE 'Profile criado com sucesso para: %', NEW.email;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'ERRO ao criar profile para %: %', NEW.email, SQLERRM;
      -- Não falhar o signup por causa do profile
  END;
  
  -- 2. CRIAR ESTABLISHMENT (SE APLICÁVEL)
  IF user_type_value = 'establishment' AND profile_created THEN
    BEGIN
      -- Validar dados obrigatórios para establishment
      IF COALESCE(NEW.raw_user_meta_data->>'city', '') != '' AND 
         COALESCE(NEW.raw_user_meta_data->>'state', '') != '' THEN
        
        INSERT INTO public.establishments (
          user_id,
          business_name,
          business_type,
          cnpj,
          address,
          city,
          state,
          phone,
          email,
          description,
          delivery_fee,
          minimum_order,
          delivery_time_min,
          delivery_time_max,
          opening_hours,
          is_active
        ) VALUES (
          NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'business_name', NEW.raw_user_meta_data->>'name'),
          COALESCE(NEW.raw_user_meta_data->>'business_type', 'restaurant'),
          NEW.raw_user_meta_data->>'cnpj',
          NEW.raw_user_meta_data->>'address',
          NEW.raw_user_meta_data->>'city',
          NEW.raw_user_meta_data->>'state',
          COALESCE(NEW.raw_user_meta_data->>'phone', ''),
          NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'description', 'Novo estabelecimento'),
          COALESCE(NULLIF(NEW.raw_user_meta_data->>'delivery_fee', '')::numeric, 5.00),
          COALESCE(NULLIF(NEW.raw_user_meta_data->>'minimum_order', '')::numeric, 20.00),
          COALESCE(NULLIF(NEW.raw_user_meta_data->>'delivery_time_min', '')::integer, 30),
          COALESCE(NULLIF(NEW.raw_user_meta_data->>'delivery_time_max', '')::integer, 60),
          CASE 
            WHEN NEW.raw_user_meta_data->>'opening_hours' IS NOT NULL 
            THEN (NEW.raw_user_meta_data->>'opening_hours')::jsonb
            ELSE NULL
          END,
          true
        );
        
        establishment_created := TRUE;
        RAISE NOTICE 'Establishment criado com sucesso para: %', NEW.email;
        
      ELSE
        RAISE WARNING 'Dados insuficientes para criar establishment (city/state ausentes): %', NEW.email;
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'ERRO ao criar establishment para %: %', NEW.email, SQLERRM;
        -- Não falhar o signup por causa do establishment
    END;
  END IF;
  
  -- 3. LOG DE AUDITORIA
  INSERT INTO public.security_audit_log (
    event_type,
    user_id,
    details
  ) VALUES (
    'user_registration',
    NEW.id,
    jsonb_build_object(
      'email', NEW.email,
      'type', user_type_value,
      'profile_created', profile_created,
      'establishment_created', establishment_created,
      'city', NEW.raw_user_meta_data->>'city',
      'state', NEW.raw_user_meta_data->>'state',
      'opening_hours_provided', (NEW.raw_user_meta_data->>'opening_hours' IS NOT NULL)
    )
  );
  
  RETURN NEW;
END;
$function$;

-- Fix handle_establishment_signup function
CREATE OR REPLACE FUNCTION public.handle_establishment_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  metadata jsonb;
  establishment_id UUID;
BEGIN
  RAISE NOTICE 'TRIGGER handle_establishment_signup executado para profile user_id: %, type: %', NEW.user_id, NEW.type;
  
  -- Only create establishment if user type is establishment and establishment doesn't exist yet
  IF NEW.type = 'establishment' AND NOT EXISTS (
    SELECT 1 FROM public.establishments WHERE user_id = NEW.user_id
  ) THEN
    
    -- Get user metadata from auth.users
    SELECT raw_user_meta_data INTO metadata
    FROM auth.users 
    WHERE id = NEW.user_id;
    
    RAISE NOTICE 'Metadata do usuário: %', metadata;
    
    -- Check if city and state are provided
    IF NEW.city IS NULL OR NEW.state IS NULL THEN
      RAISE NOTICE 'City e state são obrigatórios para criação de estabelecimento';
      RETURN NEW; -- Don't create establishment if city/state missing
    END IF;
    
    -- Log the operation for debugging
    RAISE NOTICE 'Criando estabelecimento para user: %, city: %, state: %', NEW.user_id, NEW.city, NEW.state;
    
    BEGIN
      INSERT INTO public.establishments (
        user_id,
        business_name,
        business_type,
        cnpj,
        address,
        city,
        state,
        phone,
        email,
        description,
        delivery_fee,
        minimum_order,
        delivery_time_min,
        delivery_time_max,
        is_active
      ) VALUES (
        NEW.user_id,
        COALESCE(
          metadata->>'business_name',
          NEW.name -- fallback to profile name
        ),
        COALESCE(
          metadata->>'business_type',
          'restaurant' -- fallback
        ),
        metadata->>'cnpj',
        metadata->>'address',
        NEW.city,
        NEW.state,
        COALESCE(
          NEW.phone,
          metadata->>'phone'
        ),
        NEW.email,
        COALESCE(
          metadata->>'description',
          'Novo estabelecimento'
        ),
        COALESCE(
          NULLIF(metadata->>'delivery_fee', '')::numeric,
          5.00
        ),
        COALESCE(
          NULLIF(metadata->>'minimum_order', '')::numeric,
          20.00
        ),
        COALESCE(
          NULLIF(metadata->>'delivery_time_min', '')::integer,
          30
        ),
        COALESCE(
          NULLIF(metadata->>'delivery_time_max', '')::integer,
          60
        ),
        true -- Active by default since all info is provided at registration
      ) RETURNING id INTO establishment_id;
      
      RAISE NOTICE 'Estabelecimento criado com sucesso para user: %, establishment_id: %', NEW.user_id, establishment_id;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'ERRO ao criar estabelecimento para user %: %', NEW.user_id, SQLERRM;
        -- Don't fail profile creation, just log the error
        NULL;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix handle_new_order function  
CREATE OR REPLACE FUNCTION public.handle_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  customer_profile RECORD;
  establishment_profile RECORD;
BEGIN
  -- Get customer profile
  SELECT p.name, p.phone 
  INTO customer_profile
  FROM public.profiles p
  WHERE p.user_id = NEW.customer_id;

  -- Get establishment info
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
           to_char(NEW.total_amount, 'FM999G999D00')),
    jsonb_build_object(
      'order_id', NEW.id,
      'customer_name', customer_profile.name,
      'customer_phone', customer_profile.phone,
      'total_amount', NEW.total_amount,
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
           to_char(NEW.total_amount, 'FM999G999D00')),
    NEW.establishment_id,
    NEW.id,
    jsonb_build_object(
      'order_id', NEW.id,
      'customer_name', customer_profile.name,
      'customer_phone', customer_profile.phone,
      'total_amount', NEW.total_amount,
      'message_type', 'order_summary'
    )
  );

  RETURN NEW;
END;
$function$;

-- Fix handle_order_status_change function
CREATE OR REPLACE FUNCTION public.handle_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  customer_profile RECORD;
  establishment_profile RECORD;
  notification_message TEXT;
  notification_title TEXT;
BEGIN
  -- Only proceed if status actually changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get customer profile
  SELECT p.name, p.phone, p.user_id 
  INTO customer_profile
  FROM public.profiles p
  WHERE p.user_id = NEW.customer_id;

  -- Get establishment info
  SELECT e.business_name, e.user_id
  INTO establishment_profile
  FROM public.establishments e
  WHERE e.id = NEW.establishment_id;

  -- Generate notification message based on new status
  CASE NEW.status
    WHEN 'confirmed' THEN
      notification_title := 'Pedido Confirmado';
      notification_message := 'Seu pedido foi confirmado e está sendo preparado!';
    WHEN 'preparing' THEN
      notification_title := 'Preparando Pedido';
      notification_message := 'Sua comida está sendo preparada com carinho!';
    WHEN 'ready' THEN
      notification_title := 'Pedido Pronto';
      notification_message := 'Seu pedido está pronto para retirada/entrega!';
    WHEN 'out_for_delivery' THEN
      notification_title := 'Saiu para Entrega';
      notification_message := 'Seu pedido saiu para entrega e chegará em breve!';
    WHEN 'delivered' THEN
      notification_title := 'Pedido Entregue';
      notification_message := 'Seu pedido foi entregue com sucesso!';
    WHEN 'cancelled' THEN
      notification_title := 'Pedido Cancelado';
      notification_message := 'Seu pedido foi cancelado. Entre em contato conosco se tiver dúvidas.';
    ELSE
      notification_title := 'Status Atualizado';
      notification_message := 'Status do seu pedido foi atualizado para: ' || NEW.status;
  END CASE;

  -- Create notification for customer
  INSERT INTO public.notifications (
    user_id,
    order_id,
    type,
    title,
    message,
    phone_number,
    metadata,
    priority
  ) VALUES (
    NEW.customer_id,
    NEW.id,
    'order_status_update',
    notification_title,
    notification_message,
    customer_profile.phone,
    jsonb_build_object(
      'order_id', NEW.id,
      'status', NEW.status,
      'establishment_name', establishment_profile.business_name,
      'customer_name', customer_profile.name,
      'total_amount', NEW.total_amount,
      'action_url', '/orders'
    ),
    CASE NEW.status
      WHEN 'ready' THEN 'high'
      WHEN 'out_for_delivery' THEN 'high'
      WHEN 'delivered' THEN 'medium'
      WHEN 'cancelled' THEN 'high'
      ELSE 'medium'
    END
  );

  -- Queue notification for external processing (WhatsApp, etc.)
  INSERT INTO public.notification_queue (
    type,
    recipient,
    message,
    establishment_id,
    order_id,
    metadata
  ) VALUES (
    'order_status_update',
    customer_profile.phone,
    notification_message,
    NEW.establishment_id,
    NEW.id,
    jsonb_build_object(
      'customer_name', customer_profile.name,
      'order_id', NEW.id,
      'new_status', NEW.status,
      'establishment_id', NEW.establishment_id,
      'notification_type', 'order_status_update'
    )
  );

  RETURN NEW;
END;
$function$;