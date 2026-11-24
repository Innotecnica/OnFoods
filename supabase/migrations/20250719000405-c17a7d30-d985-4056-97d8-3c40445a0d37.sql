-- Create automation_rules table
CREATE TABLE public.automation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  establishment_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('remarketing', 'behavior', 'journey')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  trigger JSONB NOT NULL DEFAULT '{}',
  actions JSONB NOT NULL DEFAULT '[]',
  targeting JSONB NOT NULL DEFAULT '{}',
  schedule JSONB,
  stats JSONB NOT NULL DEFAULT '{"triggered_count": 0, "completed_count": 0, "conversion_count": 0, "revenue_generated": 0}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create customer_journeys table
CREATE TABLE public.customer_journeys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  establishment_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  stats JSONB NOT NULL DEFAULT '{"participants": 0, "completed": 0, "conversion_rate": 0}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_journeys ENABLE ROW LEVEL SECURITY;

-- Create policies for automation_rules
CREATE POLICY "Establishment owners can manage their automation rules" 
ON public.automation_rules 
FOR ALL 
USING (establishment_id IN (
  SELECT id FROM public.establishments WHERE user_id = auth.uid()
));

-- Create policies for customer_journeys
CREATE POLICY "Establishment owners can manage their customer journeys" 
ON public.customer_journeys 
FOR ALL 
USING (establishment_id IN (
  SELECT id FROM public.establishments WHERE user_id = auth.uid()
));

-- Create triggers for updated_at
CREATE TRIGGER update_automation_rules_updated_at
BEFORE UPDATE ON public.automation_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_journeys_updated_at
BEFORE UPDATE ON public.customer_journeys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();