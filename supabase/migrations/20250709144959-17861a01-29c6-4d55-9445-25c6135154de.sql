-- Criar tabela para armazenar configurações de pagamento dos estabelecimentos
CREATE TABLE public.establishment_payment_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  payment_gateway TEXT NOT NULL CHECK (payment_gateway IN ('stripe', 'mercado_pago', 'whatsapp', 'none')),
  gateway_config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(establishment_id, payment_gateway)
);

-- Enable RLS
ALTER TABLE public.establishment_payment_configs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Establishment owners can manage their payment configs"
ON public.establishment_payment_configs
FOR ALL
USING (establishment_id IN (
  SELECT id FROM public.establishments 
  WHERE user_id = auth.uid()
));

-- Create trigger for updated_at
CREATE TRIGGER update_establishment_payment_configs_updated_at
  BEFORE UPDATE ON public.establishment_payment_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();