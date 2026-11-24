-- Recriar completamente os triggers e funções para registro
-- Primeiro, limpar triggers existentes
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;

-- Recriar função handle_new_user com logs detalhados
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_type_value TEXT;
BEGIN
  -- Log inicial para debug
  RAISE NOTICE 'TRIGGER handle_new_user executado para user: %', NEW.id;
  RAISE NOTICE 'Metadata recebido: %', NEW.raw_user_meta_data;
  
  -- Get user type from metadata, default to 'customer'
  user_type_value := COALESCE(NEW.raw_user_meta_data->>'type', 'customer');
  
  -- Validate user type
  IF user_type_value NOT IN ('customer', 'establishment') THEN
    user_type_value := 'customer';
  END IF;

  -- Log the operation for debugging
  RAISE NOTICE 'Criando profile para user: %, email: %, type: %, city: %, state: %', 
    NEW.id, NEW.email, user_type_value, 
    NEW.raw_user_meta_data->>'city',
    NEW.raw_user_meta_data->>'state';

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
    
    RAISE NOTICE 'Profile criado com sucesso para user: %', NEW.id;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'ERRO ao criar profile para user %: %', NEW.id, SQLERRM;
      -- Re-raise the exception to prevent user creation if profile fails
      RAISE;
  END;
  
  RETURN NEW;
END;
$$;

-- Recriar função handle_establishment_signup
CREATE OR REPLACE FUNCTION public.handle_establishment_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- Recriar triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_establishment_signup();

-- Verificar se os triggers foram criados corretamente
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  trigger_schema,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name IN ('on_auth_user_created', 'on_profile_created')
ORDER BY trigger_name;