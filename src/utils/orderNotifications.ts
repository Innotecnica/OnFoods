import { supabase } from "@/integrations/supabase/client";
import { notify, contextualMessages } from "@/utils/enhancedNotifications";

export async function sendOrderNotificationToEstablishment(orderId: string) {
  try {
    const { data, error } = await supabase.functions.invoke('send-order-notification', {
      body: { 
        orderId,
        notificationType: 'new_order'
      }
    });

    if (error) {
      console.error('Error sending order notification:', error);
      notify.error(
        "Erro ao enviar notificação",
        "Não foi possível notificar o estabelecimento sobre o pedido",
        { priority: 'high' }
      );
      return { success: false, error: error.message };
    }

    console.log('Order notification sent successfully:', data);
    notify.success(
      "Notificação enviada",
      "O estabelecimento foi notificado sobre seu pedido"
    );
    return { success: true, data };
  } catch (error) {
    console.error('Error in sendOrderNotificationToEstablishment:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function updateOrderStatusWithNotification(
  orderId: string, 
  newStatus: string, 
  customerPhone?: string
) {
  try {
    // Update order status
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        status: newStatus as any,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      throw updateError;
    }

    // Send status update notification if customer phone is available
    if (customerPhone) {
      const { data, error } = await supabase.functions.invoke('send-order-status-notification', {
        body: { 
          orderId,
          status: newStatus,
          customerPhone
        }
      });

      if (error) {
        console.error('Error sending status notification:', error);
      } else {
        console.log('Status notification sent:', data);
      }
    }

    const statusMessage = contextualMessages.order.statusUpdate(newStatus, orderId);
    notify.order(statusMessage.title, statusMessage.description, {
      priority: newStatus === 'delivered' ? 'high' : 'normal',
      action: {
        label: "Ver pedido",
        onClick: () => window.location.href = `/orders?highlight=${orderId}`
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating order status:', error);
    notify.error(
      "Erro ao atualizar status",
      "Não foi possível atualizar o status do pedido. Tente novamente.",
      { 
        priority: 'high',
        action: {
          label: "Tentar novamente",
          onClick: () => updateOrderStatusWithNotification(orderId, newStatus, customerPhone)
        }
      }
    );
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'Pendente',
    'confirmed': 'Confirmado',
    'preparing': 'Preparando',
    'ready': 'Pronto',
    'out_for_delivery': 'Saiu para entrega',
    'delivered': 'Entregue',
    'cancelled': 'Cancelado'
  };
  
  return statusMap[status] || status;
}