-- Update the complete_establishment_onboarding function to include city and state
CREATE OR REPLACE FUNCTION public.complete_establishment_onboarding(
  establishment_id uuid, 
  business_name text, 
  business_type text, 
  cnpj text DEFAULT NULL::text, 
  address text DEFAULT NULL::text, 
  city text DEFAULT NULL::text,
  state text DEFAULT NULL::text,
  phone text DEFAULT NULL::text, 
  description text DEFAULT NULL::text, 
  logo_url text DEFAULT NULL::text, 
  banner_url text DEFAULT NULL::text, 
  opening_hours jsonb DEFAULT NULL::jsonb, 
  delivery_fee numeric DEFAULT 5.00, 
  minimum_order numeric DEFAULT 20.00, 
  delivery_time_min integer DEFAULT 30, 
  delivery_time_max integer DEFAULT 60
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
    city = complete_establishment_onboarding.city,
    state = complete_establishment_onboarding.state,
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
$function$;