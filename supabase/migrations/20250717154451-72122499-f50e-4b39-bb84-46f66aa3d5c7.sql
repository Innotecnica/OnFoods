-- CORREÇÕES CRÍTICAS PARA PRODUÇÃO

-- 1. Recriar triggers que estão faltando
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;

-- 2. Verificar e recriar funções se necessário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- 3. Recriar triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_establishment_signup();

-- 4. Corrigir dados existentes - criar profile para usuário existente
INSERT INTO public.profiles (user_id, email, name, type, phone, cpf, birth_date, city, state)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'name', u.email),
  COALESCE(u.raw_user_meta_data->>'type', 'customer')::public.user_type,
  u.raw_user_meta_data->>'phone',
  u.raw_user_meta_data->>'cpf',
  CASE 
    WHEN u.raw_user_meta_data->>'birth_date' IS NOT NULL 
    THEN (u.raw_user_meta_data->>'birth_date')::date 
    ELSE NULL 
  END,
  u.raw_user_meta_data->>'city',
  u.raw_user_meta_data->>'state'
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
WHERE p.user_id IS NULL  -- Only create profiles for users without profiles
  AND u.email_confirmed_at IS NOT NULL;  -- Only for confirmed users

-- 5. Otimizar RLS policies para produção
-- Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_type ON public.profiles(type);
CREATE INDEX IF NOT EXISTS idx_establishments_user_id ON public.establishments(user_id);
CREATE INDEX IF NOT EXISTS idx_establishments_city_state ON public.establishments(city, state);

-- 6. Verificar integridade dos dados
-- Verificar se há usuários sem profile
SELECT COUNT(*) as users_without_profile 
FROM auth.users u 
LEFT JOIN public.profiles p ON u.id = p.user_id 
WHERE p.user_id IS NULL;