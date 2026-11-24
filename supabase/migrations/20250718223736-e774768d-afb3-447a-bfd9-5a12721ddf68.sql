-- Create chatbot_configs table for WhatsApp integration settings
CREATE TABLE public.chatbot_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  whatsapp_phone TEXT NOT NULL,
  whatsapp_token TEXT NOT NULL,
  whatsapp_verify_token TEXT NOT NULL,
  webhook_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  welcome_message TEXT NOT NULL DEFAULT 'Olá! Bem-vindo(a) ao nosso estabelecimento! Como posso ajudá-lo(a) hoje?',
  ai_personality TEXT NOT NULL DEFAULT 'Você é um atendente virtual especializado em vendas e atendimento ao cliente. Seja sempre cordial, prestativo e direto.',
  auto_response_delay INTEGER NOT NULL DEFAULT 2000,
  business_hours_start TIME NOT NULL DEFAULT '08:00:00',
  business_hours_end TIME NOT NULL DEFAULT '22:00:00',
  outside_hours_message TEXT NOT NULL DEFAULT 'Obrigado pelo contato! Nosso atendimento funciona das 8h às 22h. Retornaremos assim que possível.',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.chatbot_configs ENABLE ROW LEVEL SECURITY;

-- Create policies for chatbot_configs
CREATE POLICY "Users can view their own chatbot configs" 
ON public.chatbot_configs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chatbot configs" 
ON public.chatbot_configs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chatbot configs" 
ON public.chatbot_configs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chatbot configs" 
ON public.chatbot_configs 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updating updated_at timestamp
CREATE TRIGGER update_chatbot_configs_updated_at
BEFORE UPDATE ON public.chatbot_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();