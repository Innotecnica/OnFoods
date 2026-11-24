export interface Campaign {
  id?: string;
  name: string;
  type: 'whatsapp' | 'email' | 'sms';
  content: string;
  target_audience: string;
  recipients_count: number;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  scheduled_at?: string | null;
  sent_at?: string | null;
  opens_count?: number;
  clicks_count?: number;
  conversions_count?: number;
  revenue_generated?: number;
  cost?: number;
  metadata: {
    personalize: boolean;
    include_promotion: boolean;
    promotion_code?: string;
    include_image: boolean;
    image_url?: string;
    customer_ids: string[];
    subject?: string;
  };
  establishment_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CampaignStats {
  total_sent: number;
  opens_count: number;
  clicks_count: number;
  conversions_count: number;
  revenue_generated: number;
}

// Automation interfaces
export interface AutomationRule {
  id?: string;
  name: string;
  description: string;
  type: 'remarketing' | 'behavior' | 'journey';
  is_active: boolean;
  trigger: {
    event: string;
    conditions: Record<string, unknown>;
    delay?: number; // minutes
  };
  actions: {
    type: 'send_message' | 'add_to_segment' | 'apply_promotion';
    config: Record<string, unknown>;
  }[];
  targeting: {
    customer_segments: string[];
    filters: Record<string, unknown>;
  };
  schedule?: {
    start_date?: string;
    end_date?: string;
    frequency?: 'once' | 'daily' | 'weekly' | 'monthly';
  };
  stats: {
    triggered_count: number;
    completed_count: number;
    conversion_count: number;
    revenue_generated: number;
  };
  establishment_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerJourney {
  id?: string;
  name: string;
  description: string;
  steps: JourneyStep[];
  is_active: boolean;
  stats: {
    participants: number;
    completed: number;
    conversion_rate: number;
  };
  establishment_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface JourneyStep {
  id: string;
  name: string;
  type: 'trigger' | 'condition' | 'action' | 'delay';
  config: Record<string, unknown>;
  next_steps: string[];
}

export interface MessageTemplate {
  welcome: string;
  promotion: string;
  retention: string;
  birthday: string;
  feedback: string;
}
