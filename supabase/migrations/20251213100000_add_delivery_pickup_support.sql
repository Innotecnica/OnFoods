BEGIN;

-- Add delivery/pickup capability flags to establishments
ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS supports_delivery BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS supports_pickup BOOLEAN NOT NULL DEFAULT false;

-- Allow orders without address for pickup
ALTER TABLE public.orders
  ALTER COLUMN address_id DROP NOT NULL;

COMMIT;

