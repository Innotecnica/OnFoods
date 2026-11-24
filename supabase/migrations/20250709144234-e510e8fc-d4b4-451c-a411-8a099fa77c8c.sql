-- Adicionar suporte ao gateway Mercado Pago
-- Atualizar check constraint para incluir mercado_pago
ALTER TABLE public.establishments 
DROP CONSTRAINT IF EXISTS establishments_payment_gateway_check;

ALTER TABLE public.establishments 
ADD CONSTRAINT establishments_payment_gateway_check 
CHECK (payment_gateway IN ('none', 'stripe', 'whatsapp', 'mercado_pago'));

-- Adicionar novos métodos de pagamento para o Mercado Pago
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'mercado_pago_pix';
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'mercado_pago_credit';
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'mercado_pago_debit';
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'mercado_pago_wallet';