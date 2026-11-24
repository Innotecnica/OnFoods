-- Add payment gateway configuration to establishments table
ALTER TABLE public.establishments 
ADD COLUMN payment_gateway TEXT DEFAULT 'none' CHECK (payment_gateway IN ('stripe', 'whatsapp', 'none'));

-- Add comment to describe the new column
COMMENT ON COLUMN public.establishments.payment_gateway IS 'Payment gateway configuration: stripe (Stripe Connect), whatsapp (direct WhatsApp), none (no payments)';