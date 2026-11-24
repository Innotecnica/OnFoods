-- Verificar se os triggers existem e recriar se necessário
-- Primeiro verificar se os triggers existem
DO $$
BEGIN
  -- Verificar se o trigger on_auth_user_created existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'on_auth_user_created' 
    AND event_object_schema = 'auth' 
    AND event_object_table = 'users'
  ) THEN
    RAISE NOTICE 'Trigger on_auth_user_created não encontrado, criando...';
    
    -- Criar trigger no auth.users para criar profiles automaticamente
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW 
      EXECUTE FUNCTION public.handle_new_user();
  ELSE
    RAISE NOTICE 'Trigger on_auth_user_created já existe';
  END IF;
  
  -- Verificar se o trigger on_establishment_profile_created existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'on_establishment_profile_created' 
    AND event_object_schema = 'public' 
    AND event_object_table = 'profiles'
  ) THEN
    RAISE NOTICE 'Trigger on_establishment_profile_created não encontrado, criando...';
    
    -- Criar trigger no profiles para criar estabelecimentos quando necessário
    CREATE TRIGGER on_establishment_profile_created
      AFTER INSERT ON public.profiles
      FOR EACH ROW
      WHEN (NEW.type = 'establishment')
      EXECUTE FUNCTION public.handle_establishment_signup();
  ELSE
    RAISE NOTICE 'Trigger on_establishment_profile_created já existe';
  END IF;
END
$$;

-- Verificar se as funções estão funcionais
SELECT 
  routine_name,
  routine_type,
  security_type,
  routine_definition IS NOT NULL as has_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('handle_new_user', 'handle_establishment_signup');

-- Testar as políticas RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'establishments')
ORDER BY tablename, policyname;