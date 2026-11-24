-- Add metadata column to notifications table for additional information
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;