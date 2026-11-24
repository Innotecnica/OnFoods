-- Add email confirmation tracking to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_confirmed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_confirmed_at TIMESTAMP WITH TIME ZONE;

-- Create index for email confirmation queries
CREATE INDEX IF NOT EXISTS idx_profiles_email_confirmed 
ON public.profiles(email_confirmed);

-- Update existing users to have email confirmed (retroactive)
UPDATE public.profiles 
SET email_confirmed = true, email_confirmed_at = NOW()
WHERE email_confirmed IS NULL;