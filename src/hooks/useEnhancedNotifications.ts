/**
 * Hook para integração com sistema de notificações melhorado
 */

import { useCallback } from 'react';
import { notify, contextualMessages, NotificationType, NotificationPriority } from '@/utils/enhancedNotifications';
import { monitoring } from '@/utils/monitoring';

export function useEnhancedNotifications() {
  const showNotification = useCallback((
    type: NotificationType,
    title: string,
    description?: string,
    options?: {
      priority?: NotificationPriority;
      duration?: number;
      persistent?: boolean;
      action?: {
        label: string;
        onClick: () => void;
      };
    }
  ) => {
    notify.show({
      type,
      title,
      description,
      ...options
    });
  }, []);

  // Métodos de conveniência
  const success = useCallback((title: string, description?: string) => {
    notify.success(title, description);
  }, []);

  const error = useCallback((title: string, description?: string, canRetry = false, retryFn?: () => void) => {
    notify.error(title, description, {
      action: canRetry && retryFn ? {
        label: "Tentar novamente",
        onClick: retryFn
      } : undefined
    });
  }, []);

  const warning = useCallback((title: string, description?: string) => {
    notify.warning(title, description);
  }, []);

  const info = useCallback((title: string, description?: string) => {
    notify.info(title, description);
  }, []);

  const order = useCallback((title: string, description?: string, orderId?: string) => {
    notify.order(title, description, {
      action: orderId ? {
        label: "Ver pedido",
        onClick: () => window.location.href = `/orders?highlight=${orderId}`
      } : undefined
    });
  }, []);

  const payment = useCallback((title: string, description?: string) => {
    notify.payment(title, description);
  }, []);

  const loading = useCallback((title: string, description?: string) => {
    return notify.loading(title, description);
  }, []);

  const urgent = useCallback((title: string, description?: string) => {
    notify.urgent(title, description);
  }, []);

  // Mensagens contextuais
  const showLoginSuccess = useCallback((userName?: string) => {
    const message = contextualMessages.auth.loginSuccess(userName);
    notify.success(message.title, message.description);
  }, []);

  const showOrderCreated = useCallback((orderId: string) => {
    const message = contextualMessages.order.created(orderId);
    notify.order(message.title, message.description, {
      action: {
        label: "Ver pedido",
        onClick: () => window.location.href = `/orders?highlight=${orderId}`
      }
    });
  }, []);

  const showPaymentSuccess = useCallback((amount: number) => {
    const message = contextualMessages.payment.success(amount);
    notify.payment(message.title, message.description);
  }, []);

  const showItemAddedToCart = useCallback((productName: string) => {
    const message = contextualMessages.cart.itemAdded(productName);
    notify.success(message.title, message.description, {
      duration: 2000
    });
  }, []);

  const showConnectionLost = useCallback(() => {
    const message = contextualMessages.system.connectionLost();
    notify.urgent(message.title, message.description);
  }, []);

  const showConnectionRestored = useCallback(() => {
    const message = contextualMessages.system.connectionRestored();
    notify.success(message.title, message.description);
  }, []);

  // Configurações
  const setSoundEnabled = useCallback((enabled: boolean) => {
    notify.setSoundEnabled(enabled);
  }, []);

  const getSoundEnabled = useCallback(() => {
    return notify.getSoundEnabled();
  }, []);

  const getHistory = useCallback(() => {
    return notify.getHistory();
  }, []);

  const clearHistory = useCallback(() => {
    notify.clearHistory();
  }, []);

  // Analytics integration
  const trackNotificationInteraction = useCallback((action: string, notificationType: NotificationType) => {
    monitoring.trackEvent({
      event: 'notification_interaction',
      category: 'ui',
      label: action,
      customParameters: {
        notificationType,
        timestamp: Date.now()
      }
    });
  }, []);

  return {
    // Métodos básicos
    showNotification,
    success,
    error,
    warning,
    info,
    order,
    payment,
    loading,
    urgent,

    // Mensagens contextuais
    showLoginSuccess,
    showOrderCreated,
    showPaymentSuccess,
    showItemAddedToCart,
    showConnectionLost,
    showConnectionRestored,

    // Configurações
    setSoundEnabled,
    getSoundEnabled,
    getHistory,
    clearHistory,

    // Analytics
    trackNotificationInteraction
  };
}

export default useEnhancedNotifications;