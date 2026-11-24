-- Security Enhancement: Tighten RLS Policies

-- Drop overly permissive system policies
DROP POLICY IF EXISTS "System can manage subscriptions" ON public.establishment_subscriptions;
DROP POLICY IF EXISTS "System can manage connected accounts" ON public.stripe_connected_accounts;
DROP POLICY IF EXISTS "System can manage payments" ON public.payments;

-- Create more restrictive system policies for establishment_subscriptions
CREATE POLICY "Edge functions can manage subscriptions" ON public.establishment_subscriptions
FOR ALL 
USING (
  -- Allow access only from edge functions context or service role
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  OR current_setting('request.jwt.claims', true)::json->>'iss' = 'supabase'
);

-- Create more restrictive system policies for stripe_connected_accounts
CREATE POLICY "Edge functions can manage connected accounts" ON public.stripe_connected_accounts
FOR ALL 
USING (
  -- Allow edge functions and establishment owners
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  OR establishment_id IN (
    SELECT establishments.id
    FROM establishments
    WHERE establishments.user_id = auth.uid()
  )
);

-- Create more restrictive system policies for payments
CREATE POLICY "Edge functions can manage payments" ON public.payments
FOR ALL 
USING (
  -- Allow only edge functions for payment management
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

-- Add audit logging table for security events
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID,
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs (for future admin functionality)
CREATE POLICY "Only system can manage audit logs" ON public.security_audit_log
FOR ALL 
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type_param TEXT,
  user_id_param UUID DEFAULT NULL,
  details_param JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    event_type,
    user_id,
    details
  ) VALUES (
    event_type_param,
    COALESCE(user_id_param, auth.uid()),
    details_param
  );
END;
$$;