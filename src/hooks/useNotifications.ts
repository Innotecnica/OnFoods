import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

export interface Notification {
  id: string;
  user_id: string;
  order_id: string | null;
  type: string;
  title: string;
  message: string;
  phone_number: string | null;
  sent_at: string;
  read_at: string | null;
  created_at: string | null;
  read: boolean;
  time: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  action_url?: string;
  expires_at?: string;
  metadata?: Record<string, any>;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { user } = useAuth();

  // Check for browser notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          toast({
            title: "Notificações ativadas",
            description: "Você receberá notificações push sobre seus pedidos.",
          });
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    }
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    
    try {
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.3;
      audio.play().catch(console.error);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }, [soundEnabled]);

  // Show browser notification
  const showBrowserNotification = useCallback((notification: Notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const browserNotification = new Notification(notification.title || 'OnFoods', {
          body: notification.message,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: notification.id,
          requireInteraction: notification.priority === 'urgent',
          silent: false,
        });

        browserNotification.onclick = () => {
          window.focus();
          if (notification.action_url) {
            window.location.href = notification.action_url;
          }
          browserNotification.close();
        };

        // Auto close after 8 seconds unless urgent
        if (notification.priority !== 'urgent') {
          setTimeout(() => browserNotification.close(), 8000);
        }
      } catch (error) {
        console.error('Error showing browser notification:', error);
      }
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('sent_at', { ascending: false })
        .limit(100); // Increased limit for better pagination

      if (error) {
        console.error('Error loading notifications:', error);
        setError('Erro ao carregar notificações');
        return;
      }

      const formattedNotifications = (data || []).map(notification => ({
        ...notification,
        read: !!notification.read_at,
        time: formatDistanceToNow(new Date(notification.sent_at), {
          addSuffix: true,
          locale: ptBR
        }),
        priority: (notification.metadata as any)?.priority || 'medium',
        title: (notification.metadata as any)?.title || getNotificationTitle(notification.type),
        action_url: (notification.metadata as any)?.action_url,
        expires_at: (notification.metadata as any)?.expires_at,
        metadata: notification.metadata as Record<string, any> || {}
      }));

      // Filter out expired notifications
      const validNotifications = formattedNotifications.filter(n => 
        !n.expires_at || new Date(n.expires_at) > new Date()
      );

      setNotifications(validNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setError('Erro ao carregar notificações');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      // Optimistic update
      setNotifications(prev => prev.map(notif => 
        notif.id === notificationId ? { 
          ...notif, 
          read: true, 
          read_at: new Date().toISOString() 
        } : notif
      ));

      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) {
        // Revert optimistic update on error
        setNotifications(prev => prev.map(notif => 
          notif.id === notificationId ? { 
            ...notif, 
            read: false, 
            read_at: null 
          } : notif
        ));
        console.error('Error marking notification as read:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      
      if (unreadNotifications.length === 0) return;

      const unreadIds = unreadNotifications.map(n => n.id);
      const readTimestamp = new Date().toISOString();
      
      // Optimistic update
      setNotifications(prev => prev.map(notif => ({
        ...notif,
        read: true,
        read_at: readTimestamp
      })));

      const { error } = await supabase
        .from('notifications')
        .update({ read_at: readTimestamp })
        .in('id', unreadIds)
        .eq('user_id', user.id);

      if (error) {
        // Revert optimistic update on error
        setNotifications(prev => prev.map(notif => {
          const wasUnread = unreadNotifications.find(u => u.id === notif.id);
          return wasUnread ? { 
            ...notif, 
            read: false, 
            read_at: null 
          } : notif;
        }));
        console.error('Error marking all notifications as read:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!user) return;

    try {
      // Optimistic update
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) {
        // Revert optimistic update on error
        loadNotifications();
        console.error('Error deleting notification:', error);
        throw error;
      }

      toast({
        title: "Notificação removida",
        duration: 1500,
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({
        title: "Erro ao remover notificação",
        variant: "destructive",
      });
    }
  };

  const clearOldNotifications = async (daysOld: number = 30) => {
    if (!user) return;

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .lt('sent_at', cutoffDate.toISOString());

      if (error) {
        console.error('Error clearing old notifications:', error);
        throw error;
      }

      await loadNotifications();
      toast({
        title: "Notificações antigas removidas",
        description: `Notificações com mais de ${daysOld} dias foram removidas`,
      });
    } catch (error) {
      console.error('Error clearing old notifications:', error);
      toast({
        title: "Erro ao limpar notificações antigas",
        variant: "destructive",
      });
    }
  };

  // Get notification title based on type
  const getNotificationTitle = (type: string): string => {
    switch(type) {
      case "new_order": return "Novo Pedido";
      case "order_status_update": return "Status do Pedido";
      case "order_confirmed": return "Pedido Confirmado";
      case "order_preparing": return "Preparando Pedido";
      case "order_ready": return "Pedido Pronto";
      case "order_delivered": return "Pedido Entregue";
      case "order_cancelled": return "Pedido Cancelado";
      case "review": return "Nova Avaliação";
      case "delivery": return "Entrega";
      case "promotion": return "Promoção Especial";
      case "whatsapp_sent": return "WhatsApp Enviado";
      case "whatsapp_failed": return "Falha no WhatsApp";
      default: return "Notificação";
    }
  };

  useEffect(() => {
    if (user) {
      loadNotifications();
      requestNotificationPermission();
    }
  }, [user, requestNotificationPermission, loadNotifications]);

  // Setup real-time subscription with enhanced error handling and CSP compliance
  useEffect(() => {
    if (!user) return;

    let channel: any = null;
    let retryAttempts = 0;
    const maxRetries = 3;

    const setupSubscription = () => {
      try {
        console.log('🔔 Setting up notifications subscription for user:', user.id);
        
        channel = supabase
          .channel('notifications')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`
            },
            (payload) => {
              try {
                const newNotification = {
                  ...payload.new,
                  read: false,
                  priority: (payload.new.metadata as any)?.priority || 'medium',
                  title: (payload.new.metadata as any)?.title || getNotificationTitle(payload.new.type),
                  action_url: (payload.new.metadata as any)?.action_url,
                  expires_at: (payload.new.metadata as any)?.expires_at,
                  metadata: payload.new.metadata as Record<string, any> || {},
                  time: formatDistanceToNow(new Date(payload.new.sent_at), {
                    addSuffix: true,
                    locale: ptBR
                  })
                } as Notification;

                setNotifications(prev => [newNotification, ...prev.slice(0, 99)]); // Keep max 100 notifications
                
                // Show browser notification
                showBrowserNotification(newNotification);
                
                // Play sound for important notifications
                if (newNotification.priority === 'high' || newNotification.priority === 'urgent') {
                  playNotificationSound();
                }

                // Show toast for urgent notifications
                if (newNotification.priority === 'urgent') {
                  toast({
                    title: newNotification.title,
                    description: newNotification.message,
                    duration: 8000,
                  });
                }
              } catch (error) {
                console.error('Error processing real-time notification:', error);
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`
            },
            (payload) => {
              try {
                setNotifications(prev => prev.map(notif =>
                  notif.id === payload.new.id
                    ? {
                        ...notif,
                        ...payload.new,
                        read: !!payload.new.read_at,
                        time: formatDistanceToNow(new Date(payload.new.sent_at), {
                          addSuffix: true,
                          locale: ptBR
                        })
                      }
                    : notif
                ));
              } catch (error) {
                console.error('Error processing real-time notification update:', error);
              }
            }
          )
          .subscribe((status) => {
            console.log('🔔 Subscription status:', status);
            
            if (status === 'SUBSCRIBED') {
              console.log('✅ Successfully subscribed to notifications');
              retryAttempts = 0; // Reset retry count on success
            } else if (status === 'CHANNEL_ERROR') {
              console.warn('❌ Channel subscription error - notifications will work without real-time updates');
              
              // Retry connection with backoff if CSP/connectivity issues
              if (retryAttempts < maxRetries) {
                retryAttempts++;
                setTimeout(() => {
                  if (channel) {
                    try {
                      supabase.removeChannel(channel);
                    } catch (e) {
                      console.warn('Error removing failed channel:', e);
                    }
                  }
                  setupSubscription();
                }, 2000 * retryAttempts); // Exponential backoff
              }
            } else if (status === 'TIMED_OUT') {
              console.warn('⏰ Subscription timed out - retrying...');
              
              if (retryAttempts < maxRetries) {
                retryAttempts++;
                setTimeout(setupSubscription, 1000 * retryAttempts);
              }
            }
          });

      } catch (error) {
        console.warn('⚠️ Could not set up real-time notifications (likely CSP restriction):', error);
        
        // Set up polling fallback if real-time fails
        const pollInterval = setInterval(() => {
          loadNotifications();
        }, 30000); // Poll every 30 seconds
        
        return () => clearInterval(pollInterval);
      }
    };

    setupSubscription();

    return () => {
      if (channel) {
        console.log('🧹 Cleaning up notifications subscription');
        try {
          supabase.removeChannel(channel);
        } catch (error) {
          console.warn('Warning during subscription cleanup:', error);
        }
      }
    };
  }, [user, showBrowserNotification, playNotificationSound, loadNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const urgentCount = notifications.filter(n => !n.read && n.priority === 'urgent').length;

  const getNotificationIcon = (type: string) => {
    switch(type) {
      case "new_order": return "🍕";
      case "order_status_update": return "📱";
      case "order_confirmed": return "✅";
      case "order_preparing": return "👨‍🍳";
      case "order_ready": return "🎉";
      case "order_delivered": return "🚚";
      case "order_cancelled": return "❌";
      case "review": return "⭐";
      case "delivery": return "🚚";
      case "promotion": return "🎁";
      case "whatsapp_sent": return "✅";
      case "whatsapp_failed": return "❌";
      default: return "📱";
    }
  };

  const getNotificationPriorityColor = (priority: string) => {
    switch(priority) {
      case "urgent": return "destructive";
      case "high": return "orange";
      case "medium": return "primary";
      case "low": return "secondary";
      default: return "primary";
    }
  };

  return {
    notifications,
    isLoading,
    error,
    unreadCount,
    urgentCount,
    soundEnabled,
    setSoundEnabled,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearOldNotifications,
    getNotificationIcon,
    getNotificationTitle,
    getNotificationPriorityColor,
    requestNotificationPermission,
    refetch: loadNotifications
  };
}
