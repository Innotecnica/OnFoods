-- Criar tabelas de estrutura MER otimizada para Marketing

-- 1. Criar enum para tipos de segmentação de clientes
CREATE TYPE public.customer_segment_type AS ENUM ('new_customer', 'regular_customer', 'vip_customer', 'inactive_customer', 'high_value', 'low_value', 'frequent_buyer', 'seasonal_buyer');

-- 2. Criar enum para tipos de eventos de marketing
CREATE TYPE public.marketing_event_type AS ENUM ('email_sent', 'whatsapp_sent', 'sms_sent', 'campaign_created', 'campaign_sent', 'customer_clicked', 'customer_opened', 'customer_converted', 'automation_triggered');

-- 3. Criar tabela de segmentos de clientes
CREATE TABLE public.customer_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  establishment_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  segment_type customer_segment_type NOT NULL,
  criteria JSONB NOT NULL DEFAULT '{}',
  customer_count INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Criar tabela de relacionamento clientes-segmentos
CREATE TABLE public.customer_segment_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  segment_id UUID NOT NULL REFERENCES public.customer_segments(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(customer_id, segment_id)
);

-- 5. Criar tabela de templates de marketing
CREATE TABLE public.marketing_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  establishment_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'email', 'whatsapp', 'sms'
  subject TEXT,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]', -- Lista de variáveis dinâmicas disponíveis
  category TEXT, -- 'welcome', 'promotion', 'order_update', 'birthday', etc.
  is_default BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Melhorar tabela de regras de automação com mais campos estruturados
ALTER TABLE public.automation_rules ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;
ALTER TABLE public.automation_rules ADD COLUMN IF NOT EXISTS max_executions INTEGER;
ALTER TABLE public.automation_rules ADD COLUMN IF NOT EXISTS execution_count INTEGER DEFAULT 0;
ALTER TABLE public.automation_rules ADD COLUMN IF NOT EXISTS last_executed_at TIMESTAMP WITH TIME ZONE;

-- 7. Criar tabela de eventos de marketing para analytics
CREATE TABLE public.marketing_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  establishment_id UUID NOT NULL,
  campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
  customer_id UUID,
  event_type marketing_event_type NOT NULL,
  event_data JSONB DEFAULT '{}',
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Criar tabela de histórico de jornadas do cliente
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

-- 9. Criar tabela de participantes nas jornadas
CREATE TABLE public.customer_journey_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journey_id UUID NOT NULL REFERENCES public.customer_journeys(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  current_step INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'paused', 'exited'
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'
);

-- 10. Criar tabela de métricas agregadas de marketing
CREATE TABLE public.marketing_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  establishment_id UUID NOT NULL,
  date DATE NOT NULL,
  campaigns_sent INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  whatsapp_sent INTEGER DEFAULT 0,
  sms_sent INTEGER DEFAULT 0,
  total_opens INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  revenue_generated NUMERIC DEFAULT 0,
  cost_total NUMERIC DEFAULT 0,
  new_customers_acquired INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(establishment_id, date)
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_segment_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_journey_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_metrics ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para customer_segments
CREATE POLICY "Establishment owners can manage their customer segments" 
ON public.customer_segments 
FOR ALL 
USING (establishment_id IN ( SELECT establishments.id FROM establishments WHERE establishments.user_id = auth.uid()));

-- Políticas RLS para customer_segment_members
CREATE POLICY "Establishment owners can manage segment members" 
ON public.customer_segment_members 
FOR ALL 
USING (segment_id IN ( SELECT customer_segments.id FROM customer_segments JOIN establishments ON customer_segments.establishment_id = establishments.id WHERE establishments.user_id = auth.uid()));

-- Políticas RLS para marketing_templates
CREATE POLICY "Establishment owners can manage their templates" 
ON public.marketing_templates 
FOR ALL 
USING (establishment_id IN ( SELECT establishments.id FROM establishments WHERE establishments.user_id = auth.uid()));

-- Políticas RLS para marketing_events
CREATE POLICY "Establishment owners can view their events" 
ON public.marketing_events 
FOR SELECT 
USING (establishment_id IN ( SELECT establishments.id FROM establishments WHERE establishments.user_id = auth.uid()));

CREATE POLICY "System can insert events" 
ON public.marketing_events 
FOR INSERT 
WITH CHECK (true);

-- Políticas RLS para customer_journeys
CREATE POLICY "Establishment owners can manage their customer journeys" 
ON public.customer_journeys 
FOR ALL 
USING (establishment_id IN ( SELECT establishments.id FROM establishments WHERE establishments.user_id = auth.uid()));

-- Políticas RLS para customer_journey_participants
CREATE POLICY "Establishment owners can manage journey participants" 
ON public.customer_journey_participants 
FOR ALL 
USING (journey_id IN ( SELECT customer_journeys.id FROM customer_journeys JOIN establishments ON customer_journeys.establishment_id = establishments.id WHERE establishments.user_id = auth.uid()));

-- Políticas RLS para marketing_metrics
CREATE POLICY "Establishment owners can view their metrics" 
ON public.marketing_metrics 
FOR SELECT 
USING (establishment_id IN ( SELECT establishments.id FROM establishments WHERE establishments.user_id = auth.uid()));

CREATE POLICY "System can insert/update metrics" 
ON public.marketing_metrics 
FOR ALL 
WITH CHECK (true);

-- Índices para performance
CREATE INDEX idx_customer_segments_establishment ON public.customer_segments(establishment_id);
CREATE INDEX idx_customer_segment_members_customer ON public.customer_segment_members(customer_id);
CREATE INDEX idx_customer_segment_members_segment ON public.customer_segment_members(segment_id);
CREATE INDEX idx_marketing_templates_establishment ON public.marketing_templates(establishment_id, type);
CREATE INDEX idx_marketing_events_establishment_date ON public.marketing_events(establishment_id, created_at);
CREATE INDEX idx_marketing_events_campaign ON public.marketing_events(campaign_id);
CREATE INDEX idx_customer_journeys_establishment ON public.customer_journeys(establishment_id);
CREATE INDEX idx_journey_participants_journey ON public.customer_journey_participants(journey_id);
CREATE INDEX idx_journey_participants_customer ON public.customer_journey_participants(customer_id);
CREATE INDEX idx_marketing_metrics_establishment_date ON public.marketing_metrics(establishment_id, date);

-- Triggers para atualizar timestamps
CREATE TRIGGER update_customer_segments_updated_at
BEFORE UPDATE ON public.customer_segments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_marketing_templates_updated_at
BEFORE UPDATE ON public.marketing_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_journeys_updated_at
BEFORE UPDATE ON public.customer_journeys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();