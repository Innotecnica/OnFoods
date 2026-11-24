-- Create table for tracking Stripe connected accounts (restaurants)
CREATE TABLE public.stripe_connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL UNIQUE,
  onboarding_completed BOOLEAN DEFAULT false,
  charges_enabled BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  requirements_currently_due TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(establishment_id)
);

-- Enable RLS
ALTER TABLE public.stripe_connected_accounts ENABLE ROW LEVEL SECURITY;

-- Policies for stripe_connected_accounts
CREATE POLICY "Establishment owners can view their connected account" 
ON public.stripe_connected_accounts 
FOR SELECT 
USING (establishment_id IN (
  SELECT id FROM public.establishments WHERE user_id = auth.uid()
));

CREATE POLICY "System can manage connected accounts" 
ON public.stripe_connected_accounts 
FOR ALL 
USING (true);

-- Add Stripe payment fields to orders table
ALTER TABLE public.orders 
ADD COLUMN stripe_payment_intent_id TEXT,
ADD COLUMN stripe_charge_id TEXT,
ADD COLUMN platform_fee_amount NUMERIC DEFAULT 0,
ADD COLUMN restaurant_amount NUMERIC DEFAULT 0;

-- Create payments table for detailed payment tracking
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT NOT NULL,
  stripe_charge_id TEXT,
  connected_account_id TEXT NOT NULL,
  amount_total NUMERIC NOT NULL,
  platform_fee NUMERIC NOT NULL,
  restaurant_amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'brl',
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(stripe_payment_intent_id)
);

-- Enable RLS for payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policies for payments
CREATE POLICY "Users can view payments for their orders" 
ON public.payments 
FOR SELECT 
USING (order_id IN (
  SELECT id FROM public.orders 
  WHERE customer_id = auth.uid() 
     OR establishment_id IN (
       SELECT id FROM public.establishments WHERE user_id = auth.uid()
     )
));

CREATE POLICY "System can manage payments" 
ON public.payments 
FOR ALL 
USING (true);

-- Add triggers for updated_at
CREATE TRIGGER update_stripe_connected_accounts_updated_at
  BEFORE UPDATE ON public.stripe_connected_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();