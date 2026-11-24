-- Adicionar suporte ao método de pagamento card_on_delivery
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'card_on_delivery';