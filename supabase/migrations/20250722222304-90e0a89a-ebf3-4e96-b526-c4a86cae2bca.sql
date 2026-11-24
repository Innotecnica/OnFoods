-- Update the handle_new_user function to handle opening_hours
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