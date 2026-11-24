/**
 * Sistema de notificações melhorado com feedback inteligente
 * UI/UX otimizada e mensagens contextuais
 */

import { toast } from "@/hooks/use-toast";
import { monitoring } from "@/utils/monitoring";
import React from 'react';

export type NotificationType = 
  | 'success' 
  | 'error' 
  | 'warning' 
  | 'info' 
  | 'loading'
  | 'order'
  | 'payment'
  | 'system';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationConfig {
  title: string;
  description?: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  sound?: boolean;
  icon?: React.ReactNode;
  metadata?: Record<string, any>;
}

interface NotificationTheme {
  variant: 'default' | 'destructive';
  className: string;
  duration: number;
  sound?: string;
}

class EnhancedNotificationSystem {
  private soundEnabled: boolean = true;
  private notificationHistory: Array<NotificationConfig & { timestamp: number }> = [];
  private lastNotificationTime: Record<string, number> = {};
  
  constructor() {
    // Recuperar preferências do localStorage
    this.soundEnabled = localStorage.getItem('notification_sound') !== 'false';
  }

  private getTheme(type: NotificationType, priority: NotificationPriority): NotificationTheme {
    const themes: Record<NotificationType, NotificationTheme> = {
      success: {
        variant: 'default',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-900',
        duration: 4000,
        sound: '/sounds/success.mp3'
      },
      error: {
        variant: 'destructive',
        className: 'border-red-200 bg-red-50 text-red-900 shadow-lg',
        duration: 6000,
        sound: '/sounds/error.mp3'
      },
      warning: {
        variant: 'default',
        className: 'border-amber-200 bg-amber-50 text-amber-900',
        duration: 5000,
        sound: '/sounds/warning.mp3'
      },
      info: {
        variant: 'default',
        className: 'border-blue-200 bg-blue-50 text-blue-900',
        duration: 4000
      },
      loading: {
        variant: 'default',
        className: 'border-slate-200 bg-slate-50 text-slate-900',
        duration: 10000
      },
      order: {
        variant: 'default',
        className: 'border-primary/20 bg-primary/5 text-primary',
        duration: 5000,
        sound: '/sounds/order.mp3'
      },
      payment: {
        variant: 'default',
        className: 'border-green-200 bg-green-50 text-green-900',
        duration: 4000,
        sound: '/sounds/payment.mp3'
      },
      system: {
        variant: 'default',
        className: 'border-slate-200 bg-slate-50 text-slate-700',
        duration: 3000
      }
    };

    const theme = themes[type];
    
    // Ajustar duração baseada na prioridade
    if (priority === 'urgent') theme.duration = 10000;
    if (priority === 'high') theme.duration = 7000;
    if (priority === 'low') theme.duration = 2000;

    return theme;
  }

  private shouldPlaySound(type: NotificationType, priority: NotificationPriority): boolean {
    if (!this.soundEnabled) return false;
    
    // Sempre tocar som para notificações urgentes
    if (priority === 'urgent') return true;
    
    // Tocar som para tipos importantes
    return ['error', 'order', 'payment'].includes(type);
  }

  private playNotificationSound(soundPath?: string) {
    if (!soundPath || !this.soundEnabled) return;
    
    try {
      const audio = new Audio(soundPath);
      audio.volume = 0.6;
      audio.play().catch(() => {
        // Ignorar erros de reprodução de som
      });
    } catch (error) {
      // Ignorar erros de criação de áudio
    }
  }

  private isDuplicate(config: NotificationConfig): boolean {
    const key = `${config.title}-${config.description}`;
    const now = Date.now();
    const lastTime = this.lastNotificationTime[key];
    
    // Prevenir duplicatas em 2 segundos
    if (lastTime && (now - lastTime) < 2000) {
      return true;
    }
    
    this.lastNotificationTime[key] = now;
    return false;
  }

  private trackNotification(config: NotificationConfig) {
    // Adicionar ao histórico
    this.notificationHistory.unshift({
      ...config,
      timestamp: Date.now()
    });
    
    // Manter apenas as últimas 50 notificações
    this.notificationHistory = this.notificationHistory.slice(0, 50);
    
    // Rastrear analytics
    monitoring.trackEvent({
      event: 'notification_shown',
      category: 'ui',
      label: config.type || 'default',
      customParameters: {
        title: config.title,
        priority: config.priority || 'normal',
        duration: config.duration
      }
    });
  }

  show(config: NotificationConfig) {
    // Verificar duplicatas
    if (this.isDuplicate(config)) {
      return;
    }

    const type = config.type || 'info';
    const priority = config.priority || 'normal';
    const theme = this.getTheme(type, priority);
    
    // Reproduzir som se necessário
    if (this.shouldPlaySound(type, priority)) {
      this.playNotificationSound(theme.sound);
    }

    // Rastrear notificação
    this.trackNotification(config);

    // Mostrar toast com tema personalizado
    const toastConfig: any = {
      title: config.title,
      description: config.description,
      variant: theme.variant,
      duration: config.persistent ? 1000000 : (config.duration || theme.duration),
      className: theme.className
    };

    if (config.action) {
      toastConfig.action = React.createElement('button', {
        onClick: config.action.onClick,
        className: 'inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary',
        children: config.action.label
      });
    }

    toast(toastConfig);

    // Notificação browser se urgente e permitido
    if (priority === 'urgent' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(config.title, {
        body: config.description,
        icon: '/favicon.ico',
        tag: type,
        requireInteraction: true
      });
    }
  }

  // Métodos de conveniência
  success(title: string, description?: string, options?: Partial<NotificationConfig>) {
    this.show({
      title,
      description,
      type: 'success',
      ...options
    });
  }

  error(title: string, description?: string, options?: Partial<NotificationConfig>) {
    this.show({
      title,
      description,
      type: 'error',
      priority: 'high',
      ...options
    });
  }

  warning(title: string, description?: string, options?: Partial<NotificationConfig>) {
    this.show({
      title,
      description,
      type: 'warning',
      ...options
    });
  }

  info(title: string, description?: string, options?: Partial<NotificationConfig>) {
    this.show({
      title,
      description,
      type: 'info',
      ...options
    });
  }

  loading(title: string, description?: string): () => void {
    const loadingToast = this.show({
      title,
      description,
      type: 'loading',
      persistent: true
    });

    // Retornar função para dismissar
    return () => {
      // Toast será automaticamente removido pelo timeout padrão
    };
  }

  order(title: string, description?: string, options?: Partial<NotificationConfig>) {
    this.show({
      title,
      description,
      type: 'order',
      priority: 'high',
      ...options
    });
  }

  payment(title: string, description?: string, options?: Partial<NotificationConfig>) {
    this.show({
      title,
      description,
      type: 'payment',
      priority: 'high',
      ...options
    });
  }

  system(title: string, description?: string, options?: Partial<NotificationConfig>) {
    this.show({
      title,
      description,
      type: 'system',
      priority: 'low',
      ...options
    });
  }

  urgent(title: string, description?: string, options?: Partial<NotificationConfig>) {
    this.show({
      title,
      description,
      type: 'error',
      priority: 'urgent',
      persistent: true,
      ...options
    });
  }

  // Configurações
  setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    localStorage.setItem('notification_sound', enabled.toString());
  }

  getSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  getHistory() {
    return this.notificationHistory;
  }

  clearHistory() {
    this.notificationHistory = [];
    this.lastNotificationTime = {};
  }
}

// Instância global
export const notify = new EnhancedNotificationSystem();

// Mensagens contextuais inteligentes
export const contextualMessages = {
  auth: {
    loginSuccess: (name?: string) => ({
      title: "Bem-vindo de volta!",
      description: name ? `Olá, ${name}! Que bom ter você aqui.` : "Login realizado com sucesso"
    }),
    loginError: () => ({
      title: "Erro no login",
      description: "Verifique suas credenciais e tente novamente"
    }),
    logoutSuccess: () => ({
      title: "Logout realizado",
      description: "Você foi desconectado com segurança"
    })
  },

  cart: {
    itemAdded: (productName: string) => ({
      title: "Item adicionado!",
      description: `${productName} foi adicionado ao seu carrinho`
    }),
    itemRemoved: (productName: string) => ({
      title: "Item removido",
      description: `${productName} foi removido do carrinho`
    }),
    cleared: () => ({
      title: "Carrinho limpo",
      description: "Todos os itens foram removidos"
    })
  },

  order: {
    created: (orderId: string) => ({
      title: "Pedido realizado! 🎉",
      description: `Seu pedido #${orderId.slice(-8)} foi confirmado e está sendo preparado`
    }),
    statusUpdate: (status: string, orderId: string) => ({
      title: `Pedido ${status === 'delivered' ? 'entregue!' : 'atualizado'}`,
      description: `Pedido #${orderId.slice(-8)} - ${getStatusMessage(status)}`
    }),
    cancelled: (orderId: string) => ({
      title: "Pedido cancelado",
      description: `Pedido #${orderId.slice(-8)} foi cancelado`
    })
  },

  payment: {
    success: (amount: number) => ({
      title: "Pagamento confirmado! ✅",
      description: `Pagamento de R$ ${amount.toFixed(2)} processado com sucesso`
    }),
    failed: (reason?: string) => ({
      title: "Pagamento não processado",
      description: reason || "Houve um problema com o pagamento. Tente novamente."
    }),
    processing: () => ({
      title: "Processando pagamento...",
      description: "Aguarde enquanto confirmamos seu pagamento"
    })
  },

  system: {
    maintenance: () => ({
      title: "Manutenção programada",
      description: "O sistema ficará offline brevemente para melhorias"
    }),
    updated: () => ({
      title: "Sistema atualizado",
      description: "Nova versão disponível com melhorias e correções"
    }),
    connectionLost: () => ({
      title: "Conexão perdida",
      description: "Verifique sua internet e recarregue a página"
    }),
    connectionRestored: () => ({
      title: "Conectado novamente",
      description: "Sua conexão foi restabelecida"
    })
  }
};

function getStatusMessage(status: string): string {
  const messages = {
    'pending': 'Aguardando confirmação',
    'confirmed': 'Confirmado e em preparação',
    'preparing': 'Sendo preparado com carinho',
    'ready': 'Pronto para entrega',
    'out_for_delivery': 'Saiu para entrega',
    'delivered': 'Entregue com sucesso!',
    'cancelled': 'Cancelado'
  };
  
  return messages[status] || status;
}