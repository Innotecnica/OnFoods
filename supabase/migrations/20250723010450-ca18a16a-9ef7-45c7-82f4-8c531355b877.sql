-- Fix database security warnings by setting proper search_path for functions

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

-- Fix handle_establishment_signup function
CREATE OR REPLACE FUNCTION public.handle_establishment_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only create establishment if user type is establishment and establishment doesn't exist yet
  IF NEW.type = 'establishment' AND NOT EXISTS (
    SELECT 1 FROM public.establishments WHERE user_id = NEW.user_id
  ) THEN
    INSERT INTO public.establishments (
      user_id,
      business_name,
      business_type,
      cnpj,
      address,
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
        -- Try to get business_name from user metadata first
        (SELECT raw_user_meta_data->>'business_name' FROM auth.users WHERE id = NEW.user_id),
        NEW.name -- fallback to profile name
      ),
      COALESCE(
        -- Try to get business_type from user metadata
        (SELECT raw_user_meta_data->>'business_type' FROM auth.users WHERE id = NEW.user_id),
        'restaurant' -- fallback
      ),
      -- Get CNPJ from user metadata
      (SELECT raw_user_meta_data->>'cnpj' FROM auth.users WHERE id = NEW.user_id),
      -- Get address from user metadata  
      (SELECT raw_user_meta_data->>'address' FROM auth.users WHERE id = NEW.user_id),
      COALESCE(
        -- Try profile phone first, then metadata phone
        NEW.phone,
        (SELECT raw_user_meta_data->>'phone' FROM auth.users WHERE id = NEW.user_id)
      ),
      NEW.email,
      -- Get description from user metadata
      COALESCE(
        (SELECT raw_user_meta_data->>'description' FROM auth.users WHERE id = NEW.user_id),
        'Novo estabelecimento'
      ),
      -- Get delivery_fee from user metadata with fallback
      COALESCE(
        (SELECT NULLIF(raw_user_meta_data->>'delivery_fee', '')::numeric FROM auth.users WHERE id = NEW.user_id),
        5.00
      ),
      -- Get minimum_order from user metadata with fallback
      COALESCE(
        (SELECT NULLIF(raw_user_meta_data->>'minimum_order', '')::numeric FROM auth.users WHERE id = NEW.user_id),
        20.00
      ),
      -- Get delivery_time_min from user metadata with fallback
      COALESCE(
        (SELECT NULLIF(raw_user_meta_data->>'delivery_time_min', '')::integer FROM auth.users WHERE id = NEW.user_id),
        30
      ),
      -- Get delivery_time_max from user metadata with fallback  
      COALESCE(
        (SELECT NULLIF(raw_user_meta_data->>'delivery_time_max', '')::integer FROM auth.users WHERE id = NEW.user_id),
        60
      ),
      true -- Active by default since all info is provided at registration
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix complete_establishment_onboarding function
CREATE OR REPLACE FUNCTION public.complete_establishment_onboarding(
  establishment_id UUID,
  business_name TEXT,
  business_type TEXT,
  cnpj TEXT DEFAULT NULL,
  address TEXT DEFAULT NULL,
  phone TEXT DEFAULT NULL,
  description TEXT DEFAULT NULL,
  logo_url TEXT DEFAULT NULL,
  banner_url TEXT DEFAULT NULL,
  opening_hours JSONB DEFAULT NULL,
  delivery_fee NUMERIC DEFAULT 5.00,
  minimum_order NUMERIC DEFAULT 20.00,
  delivery_time_min INTEGER DEFAULT 30,
  delivery_time_max INTEGER DEFAULT 60
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;