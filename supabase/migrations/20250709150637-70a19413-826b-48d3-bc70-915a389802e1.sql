-- Create saved cards table for secure card storage
CREATE TABLE public.saved_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gateway_type TEXT NOT NULL CHECK (gateway_type IN ('stripe', 'mercado_pago')),
  
  -- For Stripe: store payment method ID
  stripe_payment_method_id TEXT,
  
  -- For Mercado Pago: store card token
  mercado_pago_card_token TEXT,
  
  -- Display information (never store full card numbers)
  card_brand TEXT,
  last_four_digits TEXT NOT NULL,
  expiry_month INTEGER,
  expiry_year INTEGER,
  cardholder_name TEXT,
  
  -- Metadata
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure only one default card per user
  CONSTRAINT unique_default_per_user UNIQUE (user_id, is_default) DEFERRABLE INITIALLY DEFERRED
);

-- Enable Row Level Security
ALTER TABLE public.saved_cards ENABLE ROW LEVEL SECURITY;

-- Users can only access their own saved cards
CREATE POLICY "Users can view their own saved cards" 
ON public.saved_cards 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved cards" 
ON public.saved_cards 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved cards" 
ON public.saved_cards 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved cards" 
ON public.saved_cards 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to ensure only one default card per user
CREATE OR REPLACE FUNCTION public.ensure_single_default_card()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting a card as default, unset all other default cards for this user
  IF NEW.is_default = true THEN
    UPDATE public.saved_cards 
    SET is_default = false 
    WHERE user_id = NEW.user_id 
      AND id != NEW.id 
      AND is_default = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for default card management
CREATE TRIGGER ensure_single_default_card_trigger
  BEFORE INSERT OR UPDATE ON public.saved_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_default_card();

-- Create updated_at trigger
CREATE TRIGGER update_saved_cards_updated_at
  BEFORE UPDATE ON public.saved_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();