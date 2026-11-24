-- Fix: Corrigir search_path para as funções restantes que não foram atualizadas

-- Função migrate_users_without_profiles
CREATE OR REPLACE FUNCTION public.migrate_users_without_profiles()
RETURNS TABLE(user_id uuid, email text, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_record RECORD;
  migration_status TEXT;
BEGIN
  -- Encontrar usuários sem profile
  FOR user_record IN 
    SELECT u.id, u.email, u.raw_user_meta_data, u.created_at
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.user_id
    WHERE p.user_id IS NULL
  LOOP
    BEGIN
      -- Simular trigger para usuários existentes
      PERFORM public.handle_new_user() FROM (
        SELECT 
          user_record.id as id,
          user_record.email as email,
          user_record.raw_user_meta_data as raw_user_meta_data
      ) as NEW;
      
      migration_status := 'success';
      
    EXCEPTION
      WHEN OTHERS THEN
        migration_status := 'error: ' || SQLERRM;
    END;
    
    RETURN QUERY SELECT user_record.id, user_record.email, migration_status;
  END LOOP;
END;
$$;

-- Função validate_auth_system_integrity
CREATE OR REPLACE FUNCTION public.validate_auth_system_integrity()
RETURNS TABLE(check_name text, total_count bigint, issues_count bigint, status text, details jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- 1. Usuários sem profile
  RETURN QUERY
  SELECT 
    'users_without_profiles'::text,
    (SELECT COUNT(*) FROM auth.users)::bigint,
    (SELECT COUNT(*) FROM auth.users u LEFT JOIN profiles p ON u.id = p.user_id WHERE p.user_id IS NULL)::bigint,
    CASE WHEN (SELECT COUNT(*) FROM auth.users u LEFT JOIN profiles p ON u.id = p.user_id WHERE p.user_id IS NULL) = 0 
         THEN 'OK' ELSE 'ISSUE' END::text,
    jsonb_build_object('description', 'Usuários sem profile associado');

  -- 2. Establishments sem profile
  RETURN QUERY
  SELECT 
    'establishments_without_profiles'::text,
    (SELECT COUNT(*) FROM profiles WHERE type = 'establishment')::bigint,
    (SELECT COUNT(*) FROM profiles p LEFT JOIN establishments e ON p.user_id = e.user_id 
     WHERE p.type = 'establishment' AND e.user_id IS NULL)::bigint,
    CASE WHEN (SELECT COUNT(*) FROM profiles p LEFT JOIN establishments e ON p.user_id = e.user_id 
               WHERE p.type = 'establishment' AND e.user_id IS NULL) = 0 
         THEN 'OK' ELSE 'ISSUE' END::text,
    jsonb_build_object('description', 'Profiles de establishment sem establishment associado');

  -- 3. Emails não confirmados
  RETURN QUERY
  SELECT 
    'unconfirmed_emails'::text,
    (SELECT COUNT(*) FROM auth.users)::bigint,
    (SELECT COUNT(*) FROM auth.users WHERE email_confirmed_at IS NULL)::bigint,
    CASE WHEN (SELECT COUNT(*) FROM auth.users WHERE email_confirmed_at IS NULL) = 0 
         THEN 'OK' ELSE 'WARNING' END::text,
    jsonb_build_object('description', 'Usuários com email não confirmado');

  -- 4. Funções de segurança
  RETURN QUERY
  SELECT 
    'security_functions_integrity'::text,
    (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
     WHERE n.nspname = 'public' AND p.prosecdef = true)::bigint,
    (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
     WHERE n.nspname = 'public' AND p.prosecdef = true 
     AND (p.proconfig IS NULL OR NOT EXISTS (
       SELECT 1 FROM unnest(p.proconfig) AS config_item
       WHERE config_item LIKE 'search_path=%'
     )))::bigint,
    CASE WHEN (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
               WHERE n.nspname = 'public' AND p.prosecdef = true 
               AND (p.proconfig IS NULL OR NOT EXISTS (
                 SELECT 1 FROM unnest(p.proconfig) AS config_item
                 WHERE config_item LIKE 'search_path=%'
               ))) = 0
         THEN 'OK' ELSE 'CRITICAL' END::text,
    jsonb_build_object('description', 'Funções SECURITY DEFINER sem search_path definido');

  -- 5. RLS habilitado nas tabelas críticas
  RETURN QUERY
  SELECT 
    'rls_enabled_critical_tables'::text,
    (SELECT COUNT(*) FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid 
     WHERE n.nspname = 'public' AND c.relkind = 'r' 
     AND c.relname IN ('profiles', 'establishments', 'orders', 'products', 'notifications'))::bigint,
    (SELECT COUNT(*) FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid 
     WHERE n.nspname = 'public' AND c.relkind = 'r' 
     AND c.relname IN ('profiles', 'establishments', 'orders', 'products', 'notifications')
     AND c.relrowsecurity = false)::bigint,
    CASE WHEN (SELECT COUNT(*) FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid 
               WHERE n.nspname = 'public' AND c.relkind = 'r' 
               AND c.relname IN ('profiles', 'establishments', 'orders', 'products', 'notifications')
               AND c.relrowsecurity = false) = 0
         THEN 'OK' ELSE 'CRITICAL' END::text,
    jsonb_build_object('description', 'Tabelas críticas sem RLS habilitado');
END;
$$;

-- Criar função de monitoramento de segurança
CREATE OR REPLACE FUNCTION public.monitor_security_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result jsonb := '{}';
  failed_logins int;
  suspicious_activities int;
  recent_errors int;
BEGIN
  -- Contar tentativas de login falhadas nas últimas 24h
  SELECT COUNT(*) INTO failed_logins
  FROM security_audit_log
  WHERE event_type IN ('failed_login', 'invalid_credentials', 'blocked_login')
    AND created_at >= NOW() - INTERVAL '24 hours';

  -- Contar atividades suspeitas
  SELECT COUNT(*) INTO suspicious_activities
  FROM security_audit_log
  WHERE event_type IN ('rate_limit_exceeded', 'suspicious_auth_pattern', 'sql_injection_attempt')
    AND created_at >= NOW() - INTERVAL '24 hours';

  -- Contar erros recentes
  SELECT COUNT(*) INTO recent_errors
  FROM security_audit_log
  WHERE event_type LIKE '%error%'
    AND created_at >= NOW() - INTERVAL '1 hour';

  result := jsonb_build_object(
    'timestamp', NOW(),
    'failed_logins_24h', failed_logins,
    'suspicious_activities_24h', suspicious_activities,
    'recent_errors_1h', recent_errors,
    'status', CASE 
      WHEN suspicious_activities > 50 OR failed_logins > 100 THEN 'CRITICAL'
      WHEN suspicious_activities > 20 OR failed_logins > 50 THEN 'WARNING'
      ELSE 'OK'
    END
  );

  RETURN result;
END;
$$;