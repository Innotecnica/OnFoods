-- Recriar completamente as funções e triggers para o processo de registro

-- 1. Primeiro, remover triggers e funções existentes se houver problemas
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_establishment_profile_created ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_establishment_signup() CASCADE;

-- 2. Criar função para lidar com novos usuários (criar profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Log the operation for debugging
  RAISE NOTICE 'Creating profile for user: %, email: %, type: %', NEW.id, NEW.email, user_type_value;

  -- Insert profile with error handling
  BEGIN
    INSERT INTO public.profiles (user_id, email, name, type, phone, cpf, birth_date)
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
      END
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
$$;

-- 3. Criar função para estabelecimentos
CREATE OR REPLACE FUNCTION public.handle_establishment_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  metadata jsonb;
  establishment_id UUID;
BEGIN
  -- Only create establishment if user type is establishment and establishment doesn't exist yet
  IF NEW.type = 'establishment' AND NOT EXISTS (
    SELECT 1 FROM public.establishments WHERE user_id = NEW.user_id
  ) THEN
    
    -- Get user metadata from auth.users
    SELECT raw_user_meta_data INTO metadata
    FROM auth.users 
    WHERE id = NEW.user_id;
    
    -- Log the operation for debugging
    RAISE NOTICE 'Creating establishment for user: %, metadata: %', NEW.user_id, metadata;
    
    BEGIN
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
          metadata->>'business_name',
          NEW.name -- fallback to profile name
        ),
        COALESCE(
          metadata->>'business_type',
          'restaurant' -- fallback
        ),
        metadata->>'cnpj',
        metadata->>'address',
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
$$;

-- 4. Criar triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_establishment_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.type = 'establishment')
  EXECUTE FUNCTION public.handle_establishment_signup();

-- 5. Verificar se tudo foi criado corretamente
SELECT 
  routine_name,
  routine_type,
  security_type,
  routine_definition IS NOT NULL as has_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('handle_new_user', 'handle_establishment_signup');

-- 6. Verificar triggers
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers 
WHERE trigger_name IN ('on_auth_user_created', 'on_establishment_profile_created')
ORDER BY trigger_name;