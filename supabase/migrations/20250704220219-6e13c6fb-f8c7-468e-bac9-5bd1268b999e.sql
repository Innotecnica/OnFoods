-- Create subscription table for establishment subscriptions
CREATE TABLE public.establishment_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'inactive', -- active, inactive, past_due, canceled
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  plan_id TEXT NOT NULL DEFAULT 'monthly', -- monthly plan
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(establishment_id)
);

-- Enable Row Level Security
ALTER TABLE public.establishment_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for establishment subscriptions
CREATE POLICY "Establishment owners can view their subscription" 
ON public.establishment_subscriptions 
FOR SELECT 
USING (establishment_id IN (
  SELECT id FROM establishments 
  WHERE user_id = auth.uid()
));

CREATE POLICY "System can manage subscriptions" 
ON public.establishment_subscriptions 
FOR ALL 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_establishment_subscriptions_updated_at
BEFORE UPDATE ON public.establishment_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check if establishment has active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(establishment_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.establishment_subscriptions es
    JOIN public.establishments e ON es.establishment_id = e.id
    WHERE e.user_id = establishment_user_id
      AND es.status = 'active'
      AND es.current_period_end > NOW()
  );
$$;