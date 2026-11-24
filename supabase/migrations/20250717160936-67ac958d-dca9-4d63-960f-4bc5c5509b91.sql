-- ================================
-- SECURITY IMPROVEMENTS FOR SUBSCRIPTION WORKFLOW
-- ================================

-- 1. Fix database functions security (search_path)
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

-- 2. Update other functions with proper search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_type_value TEXT;
BEGIN
  -- Get user type from metadata, default to 'customer'
  user_type_value := COALESCE(NEW.raw_user_meta_data->>'type', 'customer');
  
  -- Validate user type
  IF user_type_value NOT IN ('customer', 'establishment') THEN
    user_type_value := 'customer';
  END IF;

  -- Insert profile with error handling
  BEGIN
    INSERT INTO public.profiles (user_id, email, name, type, phone, cpf, birth_date, city, state)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
      user_type_value::public.user_type,
      NEW.raw_user_meta_data->>'phone',
      NEW.raw_user_meta_data->>'cpf',
      CASE 
        WHEN NEW.raw_user_meta_data->>'birth_date' IS NOT NULL 
        THEN (NEW.raw_user_meta_data->>'birth_date')::date 
        ELSE NULL 
      END,
      NEW.raw_user_meta_data->>'city',
      NEW.raw_user_meta_data->>'state'
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't prevent user creation
      RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$function$;

-- 3. Update other security definer functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_establishment_rating()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Update the establishment's rating and total_reviews
  UPDATE public.establishments 
  SET 
    rating = COALESCE((
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM public.reviews 
      WHERE establishment_id = COALESCE(NEW.establishment_id, OLD.establishment_id)
    ), 0),
    total_reviews = (
      SELECT COUNT(*)
      FROM public.reviews 
      WHERE establishment_id = COALESCE(NEW.establishment_id, OLD.establishment_id)
    )
  WHERE id = COALESCE(NEW.establishment_id, OLD.establishment_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_product_rating()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Update the product's rating and total_reviews
  UPDATE public.products 
  SET 
    rating = COALESCE((
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM public.product_reviews 
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
    ), 0),
    total_reviews = (
      SELECT COUNT(*)
      FROM public.product_reviews 
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
    )
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 4. Security improvements for establishment_subscriptions table
-- Add constraint to prevent duplicate active subscriptions
ALTER TABLE public.establishment_subscriptions 
ADD CONSTRAINT unique_active_subscription 
EXCLUDE (establishment_id WITH =) 
WHERE (status = 'active');

-- 5. Add rate limiting table for subscription operations
CREATE TABLE IF NOT EXISTS public.subscription_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  operation_type TEXT NOT NULL,
  operation_count INTEGER DEFAULT 1,
  last_operation TIMESTAMPTZ DEFAULT NOW(),
  reset_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on rate limits table
ALTER TABLE public.subscription_rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policy for rate limits
CREATE POLICY "Users can view their own rate limits" 
ON public.subscription_rate_limits 
FOR SELECT 
USING (user_id = auth.uid());

-- 6. Function to check rate limits
CREATE OR REPLACE FUNCTION public.check_subscription_rate_limit(
  p_user_id UUID,
  p_operation_type TEXT,
  p_max_operations INTEGER DEFAULT 10
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_count INTEGER;
  last_reset TIMESTAMPTZ;
BEGIN
  -- Get current count and last reset time
  SELECT operation_count, reset_at 
  INTO current_count, last_reset
  FROM public.subscription_rate_limits
  WHERE user_id = p_user_id 
    AND operation_type = p_operation_type
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no record exists or reset time has passed, create new record
  IF current_count IS NULL OR last_reset < NOW() THEN
    INSERT INTO public.subscription_rate_limits (
      user_id, 
      operation_type, 
      operation_count, 
      reset_at
    ) VALUES (
      p_user_id, 
      p_operation_type, 
      1, 
      NOW() + INTERVAL '1 hour'
    )
    ON CONFLICT (user_id, operation_type) 
    DO UPDATE SET 
      operation_count = 1,
      last_operation = NOW(),
      reset_at = NOW() + INTERVAL '1 hour';
    
    RETURN TRUE;
  END IF;
  
  -- Check if under limit
  IF current_count < p_max_operations THEN
    UPDATE public.subscription_rate_limits
    SET 
      operation_count = operation_count + 1,
      last_operation = NOW()
    WHERE user_id = p_user_id 
      AND operation_type = p_operation_type;
    
    RETURN TRUE;
  END IF;
  
  -- Over limit
  RETURN FALSE;
END;
$function$;

-- 7. Create unique constraint to prevent race conditions
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_rate_limits_user_operation 
ON public.subscription_rate_limits (user_id, operation_type);

-- 8. Add audit log for subscription changes
CREATE TABLE IF NOT EXISTS public.subscription_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  establishment_id UUID,
  action TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  stripe_subscription_id TEXT,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE public.subscription_audit_log ENABLE ROW LEVEL SECURITY;

-- Only system can write to audit log
CREATE POLICY "Only system can manage audit log" 
ON public.subscription_audit_log 
FOR ALL 
USING (((current_setting('request.jwt.claims'::text, true))::json ->> 'role'::text) = 'service_role'::text);

-- 9. Function to log subscription actions
CREATE OR REPLACE FUNCTION public.log_subscription_action(
  p_user_id UUID,
  p_establishment_id UUID,
  p_action TEXT,
  p_old_status TEXT DEFAULT NULL,
  p_new_status TEXT DEFAULT NULL,
  p_stripe_subscription_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.subscription_audit_log (
    user_id,
    establishment_id,
    action,
    old_status,
    new_status,
    stripe_subscription_id,
    metadata
  ) VALUES (
    p_user_id,
    p_establishment_id,
    p_action,
    p_old_status,
    p_new_status,
    p_stripe_subscription_id,
    p_metadata
  );
END;
$function$;