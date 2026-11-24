import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Campaign } from "@/types/marketing";

export function useMarketingCampaigns() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCampaigns = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Get establishment ID
      const { data: establishment } = await supabase
        .from('establishments')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!establishment) return;

      // Get campaigns
      const { data: campaignsData, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('establishment_id', establishment.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading campaigns:', error);
        return;
      }

      const processedCampaigns: Campaign[] = (campaignsData || []).map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        type: campaign.type as 'whatsapp' | 'email' | 'sms',
        content: campaign.content,
        target_audience: campaign.target_audience,
        recipients_count: campaign.recipients_count || 0,
        status: campaign.status as 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed',
        scheduled_at: campaign.scheduled_at,
        sent_at: campaign.sent_at,
        metadata: (campaign.metadata as any) || {
          personalize: false,
          include_promotion: false,
          promotion_code: '',
          include_image: false,
          image_url: '',
          customer_ids: []
        },
        establishment_id: campaign.establishment_id,
        created_at: campaign.created_at,
        updated_at: campaign.updated_at
      }));

      setCampaigns(processedCampaigns);

    } catch (error) {
      console.error('Error loading campaigns:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as campanhas.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.type === 'establishment') {
      loadCampaigns();
    }
  }, [loadCampaigns, user?.type]);

  const createCampaign = async (campaignData: Omit<Campaign, 'id' | 'establishment_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return false;

    try {
      // Get establishment ID
      const { data: establishment } = await supabase
        .from('establishments')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!establishment) return false;

      const { error } = await supabase
        .from('marketing_campaigns')
        .insert({
          ...campaignData,
          establishment_id: establishment.id
        });

      if (error) {
        console.error('Error creating campaign:', error);
        return false;
      }

      await loadCampaigns();
      return true;

    } catch (error) {
      console.error('Error creating campaign:', error);
      return false;
    }
  };

  const updateCampaign = async (campaignId: string, updates: Partial<Campaign>) => {
    try {
      const { error } = await supabase
        .from('marketing_campaigns')
        .update(updates)
        .eq('id', campaignId);

      if (error) {
        console.error('Error updating campaign:', error);
        return false;
      }

      await loadCampaigns();
      return true;

    } catch (error) {
      console.error('Error updating campaign:', error);
      return false;
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    try {
      const { error } = await supabase
        .from('marketing_campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) {
        console.error('Error deleting campaign:', error);
        return false;
      }

      await loadCampaigns();
      return true;

    } catch (error) {
      console.error('Error deleting campaign:', error);
      return false;
    }
  };

  const sendCampaign = async (campaign: Campaign, selectedCustomers: any[]) => {
    try {
      if (campaign.type === 'whatsapp') {
        // Send WhatsApp campaign using existing edge function
        const { error } = await supabase.functions.invoke('send-whatsapp-order', {
          body: {
            type: 'campaign',
            campaign: {
              ...campaign,
              customer_ids: selectedCustomers.map(c => c.id)
            },
            customers: selectedCustomers
          }
        });

        if (error) throw error;

        // Update campaign status
        await updateCampaign(campaign.id!, {
          status: 'sent',
          sent_at: new Date().toISOString(),
          recipients_count: selectedCustomers.length
        });

        return true;
      }

      // TODO: Implement email and SMS sending
      toast({
        title: "Tipo de campanha não suportado",
        description: "Atualmente apenas campanhas WhatsApp são suportadas.",
        variant: "destructive",
      });
      return false;

    } catch (error) {
      console.error('Error sending campaign:', error);
      return false;
    }
  };

  const getCampaignStats = () => {
    const totalCampaigns = campaigns.length;
    const sentCampaigns = campaigns.filter(c => c.status === 'sent').length;
    const totalRecipients = campaigns.reduce((sum, c) => sum + (c.recipients_count || 0), 0);
    const activeCampaigns = campaigns.filter(c => c.status === 'sending' || c.status === 'scheduled').length;

    return {
      totalCampaigns,
      sentCampaigns,
      totalRecipients,
      activeCampaigns,
      campaignsByType: {
        whatsapp: campaigns.filter(c => c.type === 'whatsapp').length,
        email: campaigns.filter(c => c.type === 'email').length,
        sms: campaigns.filter(c => c.type === 'sms').length
      }
    };
  };

  const refreshCampaigns = () => {
    loadCampaigns();
  };

  return {
    campaigns,
    isLoading,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    sendCampaign,
    getCampaignStats,
    refreshCampaigns
  };
}
