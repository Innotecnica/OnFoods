-- Criar tabela para configurações de redes sociais
CREATE TABLE IF NOT EXISTS public.social_media_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'twitter', 'linkedin', 'whatsapp')),
  account_name TEXT NOT NULL,
  access_token TEXT,
  account_id TEXT,
  page_id TEXT,
  phone_number TEXT,
  phone_number_id TEXT,
  is_connected BOOLEAN NOT NULL DEFAULT false,
  follower_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  last_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.social_media_accounts ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Establishment owners can manage their social accounts" 
ON public.social_media_accounts 
FOR ALL 
USING (establishment_id IN (
  SELECT id FROM public.establishments WHERE user_id = auth.uid()
));

-- Índices para performance
CREATE INDEX idx_social_media_accounts_establishment ON public.social_media_accounts(establishment_id);
CREATE UNIQUE INDEX idx_social_media_accounts_platform ON public.social_media_accounts(establishment_id, platform);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_social_media_accounts_updated_at
  BEFORE UPDATE ON public.social_media_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();