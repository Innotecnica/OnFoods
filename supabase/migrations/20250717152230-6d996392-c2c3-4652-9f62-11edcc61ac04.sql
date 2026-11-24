-- Criar função de debug para registro e corrigir handle_new_user
CREATE OR REPLACE FUNCTION public.debug_registration(user_id_param uuid, metadata_param jsonb)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result_text text;
BEGIN
  result_text := 'Debug Registration - User ID: ' || user_id_param::text || 
                 ', Metadata: ' || metadata_param::text ||
                 ', Type: ' || COALESCE(metadata_param->>'type', 'NULL') ||
                 ', City: ' || COALESCE(metadata_param->>'city', 'NULL') ||
                 ', State: ' || COALESCE(metadata_param->>'state', 'NULL');
  
  RAISE NOTICE '%', result_text;
  RETURN result_text;
END;
$$;

-- Atualizar handle_new_user com logs detalhados
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_type_value TEXT;
  debug_info text;
BEGIN
  -- Debug log inicial
  PERFORM debug_registration(NEW.id, NEW.raw_user_meta_data);
  
  -- Get user type from metadata, default to 'customer'
  user_type_value := COALESCE(NEW.raw_user_meta_data->>'type', 'customer');
  
  -- Validate user type
  IF user_type_value NOT IN ('customer', 'establishment') THEN
    user_type_value := 'customer';
  END IF;

  -- Log the operation for debugging
  RAISE NOTICE 'Creating profile for user: %, email: %, type: %, city: %, state: %', 
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
    
    RAISE NOTICE 'Profile created successfully for user: % with city: % and state: %', 
      NEW.id, NEW.raw_user_meta_data->>'city', NEW.raw_user_meta_data->>'state';
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Error creating profile for user %: %', NEW.id, SQLERRM;
      -- Re-raise the exception to prevent user creation if profile fails
      RAISE;
  END;
  
  RETURN NEW;
END;
$function$;