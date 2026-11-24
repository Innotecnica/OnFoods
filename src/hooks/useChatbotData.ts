import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface ChatbotConfig {
  id?: string;
  whatsapp_phone: string;
  whatsapp_token: string;
  whatsapp_verify_token: string;
  webhook_url: string;
  is_active: boolean;
  welcome_message: string;
  ai_personality: string;
  auto_response_delay: number;
  business_hours_start: string;
  business_hours_end: string;
  outside_hours_message: string;
}

interface ChatbotMetrics {
  total_messages: number;
  messages_today: number;
  active_conversations: number;
  response_time_avg: number;
}

interface ConversationLog {
  id: string;
  customer_phone: string;
  message: string;
  response: string;
  created_at: string;
  response_time_ms: number;
}

export const useChatbotData = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [config, setConfig] = useState<ChatbotConfig>({
    whatsapp_phone: "",
    whatsapp_token: "",
    whatsapp_verify_token: "",
    webhook_url: "",
    is_active: false,
    welcome_message: "Olá! Bem-vindo(a) ao nosso estabelecimento! Como posso ajudá-lo(a) hoje?",
    ai_personality: "Você é um atendente virtual especializado em vendas e atendimento ao cliente. Seja sempre cordial, prestativo e direto.",
    auto_response_delay: 2000,
    business_hours_start: "08:00",
    business_hours_end: "22:00",
    outside_hours_message: "Obrigado pelo contato! Nosso atendimento funciona das 8h às 22h. Retornaremos assim que possível."
  });

  const [metrics, setMetrics] = useState<ChatbotMetrics>({
    total_messages: 0,
    messages_today: 0,
    active_conversations: 0,
    response_time_avg: 0
  });

  const [conversationLogs, setConversationLogs] = useState<ConversationLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadChatbotConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('chatbot_configs')
        .select('*')
        .eq('user_id', user?.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (data) {
        setConfig({
          ...config,
          id: data.id,
          whatsapp_phone: data.whatsapp_phone,
          whatsapp_token: data.whatsapp_token,
          whatsapp_verify_token: data.whatsapp_verify_token,
          webhook_url: data.webhook_url || "",
          is_active: data.is_active,
          welcome_message: data.welcome_message,
          ai_personality: data.ai_personality,
          auto_response_delay: data.auto_response_delay,
          business_hours_start: data.business_hours_start,
          business_hours_end: data.business_hours_end,
          outside_hours_message: data.outside_hours_message
        });
      }
    } catch (error) {
      console.error('Error loading chatbot config:', error);
      toast({
        title: "Erro ao carregar",
        description: "Erro ao carregar configurações do chatbot.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, config, toast]);

  const saveChatbotConfig = async (newConfig: Partial<ChatbotConfig>) => {
    try {
      const userId = user?.id;
      if (!userId) {
        throw new Error('Usuário não autenticado');
      }

      const configData = {
        user_id: userId,
        whatsapp_phone: newConfig.whatsapp_phone || config.whatsapp_phone,
        whatsapp_token: newConfig.whatsapp_token || config.whatsapp_token,
        whatsapp_verify_token: newConfig.whatsapp_verify_token || config.whatsapp_verify_token,
        webhook_url: newConfig.webhook_url || config.webhook_url,
        is_active: newConfig.is_active ?? config.is_active,
        welcome_message: newConfig.welcome_message || config.welcome_message,
        ai_personality: newConfig.ai_personality || config.ai_personality,
        auto_response_delay: newConfig.auto_response_delay || config.auto_response_delay,
        business_hours_start: newConfig.business_hours_start || config.business_hours_start,
        business_hours_end: newConfig.business_hours_end || config.business_hours_end,
        outside_hours_message: newConfig.outside_hours_message || config.outside_hours_message,
        updated_at: new Date().toISOString()
      };

      const { data, error } = config.id 
        ? await supabase
            .from('chatbot_configs')
            .update(configData)
            .eq('id', config.id)
            .select()
            .single()
        : await supabase
            .from('chatbot_configs')
            .insert(configData)
            .select()
            .single();

      if (error) throw error;

      if (data && !config.id) {
        setConfig(prev => ({ ...prev, id: data.id }));
      }

      toast({
        title: "Configuração salva",
        description: "Configurações do chatbot salvas com sucesso!",
      });

      return true;
    } catch (error) {
      console.error('Error saving chatbot config:', error);
      toast({
        title: "Erro ao salvar",
        description: "Erro ao salvar configurações do chatbot.",
        variant: "destructive",
      });
      return false;
    }
  };

  const loadMetrics = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .eq('type', 'whatsapp_message');
      
      if (error) throw error;
      
      const today = new Date().toDateString();
      const todayMessages = data?.filter(msg => 
        new Date(msg.created_at).toDateString() === today
      ) || [];
      
      setMetrics({
        total_messages: data?.length || 0,
        messages_today: todayMessages.length,
        active_conversations: Math.floor(Math.random() * 5), // Simulated
        response_time_avg: 2.3
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  }, [user?.id]);

  const loadConversationLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .eq('type', 'whatsapp_message')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      const logs: ConversationLog[] = data?.map(notification => ({
        id: notification.id,
        customer_phone: notification.phone_number || 'N/A',
        message: notification.message,
        response: 'Resposta automática gerada pelo bot', 
        created_at: notification.created_at,
        response_time_ms: Math.floor(Math.random() * 3000) + 1000 // Simulated
      })) || [];
      
      setConversationLogs(logs);
    } catch (error) {
      console.error('Error loading conversation logs:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadChatbotConfig();
      loadMetrics();
      loadConversationLogs();
    }
  }, [user?.id, loadChatbotConfig, loadMetrics, loadConversationLogs]);

  return {
    config,
    setConfig,
    metrics,
    conversationLogs,
    isLoading,
    loadChatbotConfig,
    saveChatbotConfig,
    loadMetrics,
    loadConversationLogs
  };
};
