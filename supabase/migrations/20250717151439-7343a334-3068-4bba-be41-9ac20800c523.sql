-- Tornar campos de cidade e estado obrigatórios para garantir localização
-- Adicionar campos de localização na tabela profiles se não existir

-- Adicionar campos de cidade e estado na tabela profiles se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'city') THEN
        ALTER TABLE public.profiles ADD COLUMN city text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'state') THEN
        ALTER TABLE public.profiles ADD COLUMN state text;
    END IF;
END $$;

-- Atualizar a função handle_new_user para incluir city e state do metadata
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

  -- Log the operation for debugging
  RAISE NOTICE 'Creating profile for user: %, email: %, type: %', NEW.id, NEW.email, user_type_value;

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
    
    RAISE NOTICE 'Profile created successfully for user: %', NEW.id;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Error creating profile for user %: %', NEW.id, SQLERRM;
      -- Re-raise the exception to prevent user creation if profile fails
      RAISE;
  END;
  
  RETURN NEW;
END;
$function$;

-- Atualizar a função handle_establishment_signup para garantir que city e state sejam obrigatórios
CREATE OR REPLACE FUNCTION public.handle_establishment_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  metadata jsonb;
  establishment_id UUID;
  user_city TEXT;
  user_state TEXT;
BEGIN
  -- Only create establishment if user type is establishment and establishment doesn't exist yet
  IF NEW.type = 'establishment' AND NOT EXISTS (
    SELECT 1 FROM public.establishments WHERE user_id = NEW.user_id
  ) THEN
    
    -- Get user metadata from auth.users
    SELECT raw_user_meta_data INTO metadata
    FROM auth.users 
    WHERE id = NEW.user_id;
    
    -- Get city and state from profile (required fields)
    user_city := NEW.city;
    user_state := NEW.state;
    
    -- Check if city and state are provided
    IF user_city IS NULL OR user_state IS NULL THEN
      RAISE NOTICE 'City and state are required for establishment creation';
      RETURN NEW; -- Don't create establishment if city/state missing
    END IF;
    
    -- Log the operation for debugging
    RAISE NOTICE 'Creating establishment for user: %, city: %, state: %', NEW.user_id, user_city, user_state;
    
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
        user_city, -- Use city from profile
        user_state, -- Use state from profile
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
      
      RAISE NOTICE 'Establishment created successfully for user: %, establishment_id: %', NEW.user_id, establishment_id;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error creating establishment for user %: %', NEW.user_id, SQLERRM;
        -- Don't fail profile creation, just log the error
        NULL;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;