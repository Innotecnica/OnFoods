-- Consolidar triggers de pedidos para evitar duplicação
-- Remove trigger duplicado
DROP TRIGGER IF EXISTS on_order_created ON public.orders;
DROP FUNCTION IF EXISTS handle_new_order_notification();

-- Melhorar a função principal de novos pedidos
CREATE OR REPLACE FUNCTION public.handle_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  customer_profile RECORD;
  establishment_profile RECORD;
  notification_priority text := 'high';
BEGIN
  -- Get customer profile
  SELECT p.name, p.phone 
  INTO customer_profile
  FROM public.profiles p
  WHERE p.user_id = NEW.customer_id;

  -- Get establishment info
  SELECT e.business_name, e.user_id, e.phone, e.payment_gateway
  INTO establishment_profile
  FROM public.establishments e
  WHERE e.id = NEW.establishment_id;

  -- Determine priority based on payment method
  IF NEW.payment_method = 'cash' OR NEW.payment_method = 'card_on_delivery' THEN
    notification_priority := 'urgent';
  END IF;

  -- Create notification for establishment owner
  INSERT INTO public.notifications (
    user_id,
    order_id,
    type,
    title,
    message,
    metadata,
    priority
  ) VALUES (
    establishment_profile.user_id,
    NEW.id,
    'new_order',
    '🛒 Novo Pedido Recebido',
    format('Pedido #%s de %s - R$ %s', 
           substring(NEW.id::text, 1, 8), 
           COALESCE(customer_profile.name, 'Cliente'), 
           to_char(NEW.total_amount, 'FM999G999D00')),
    jsonb_build_object(
      'order_id', NEW.id,
      'customer_name', customer_profile.name,
      'customer_phone', customer_profile.phone,
      'total_amount', NEW.total_amount,
      'establishment_name', establishment_profile.business_name,
      'payment_method', NEW.payment_method,
      'gateway', establishment_profile.payment_gateway,
      'action_url', '/establishment-dashboard'
    ),
    notification_priority
  );

  -- Queue WhatsApp notification for WhatsApp-enabled establishments
  IF establishment_profile.payment_gateway = 'whatsapp' AND establishment_profile.phone IS NOT NULL THEN
    INSERT INTO public.notification_queue (
      type,
      recipient,
      message,
      establishment_id,
      order_id,
      priority,
      metadata
    ) VALUES (
      'whatsapp_order_summary',
      establishment_profile.phone,
      format('🛒 NOVO PEDIDO! #%s de %s - R$ %s',
             substring(NEW.id::text, 1, 8),
             COALESCE(customer_profile.name, 'Cliente'),
             to_char(NEW.total_amount, 'FM999G999D00')),
      NEW.establishment_id,
      NEW.id,
      notification_priority,
      jsonb_build_object(
        'order_id', NEW.id,
        'customer_name', customer_profile.name,
        'customer_phone', customer_profile.phone,
        'total_amount', NEW.total_amount,
        'message_type', 'order_summary',
        'gateway', 'whatsapp'
      )
    );
  END IF;

  -- Log metrics for analytics
  INSERT INTO public.system_metrics (
    metric_name,
    metric_value,
    tags,
    source
  ) VALUES (
    'orders_created',
    1,
    jsonb_build_object(
      'establishment_id', NEW.establishment_id,
      'payment_method', NEW.payment_method,
      'gateway', establishment_profile.payment_gateway,
      'total_amount', NEW.total_amount
    ),
    'order_system'
  );

  RETURN NEW;
END;
$function$;

-- Criar função para processar fila de notificações WhatsApp com retry
CREATE OR REPLACE FUNCTION public.process_whatsapp_notification_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  notification_record RECORD;
  retry_count INTEGER;
BEGIN
  -- Process pending WhatsApp notifications
  FOR notification_record IN 
    SELECT * FROM notification_queue 
    WHERE type LIKE 'whatsapp%' 
      AND status = 'pending'
      AND next_attempt_at <= NOW()
      AND attempts < max_attempts
    ORDER BY priority DESC, created_at ASC
    LIMIT 10
  LOOP
    BEGIN
      -- Attempt to send via edge function
      PERFORM net.http_post(
        url := format('%s/functions/v1/whatsapp-unified-handler', current_setting('app.supabase_url')),
        headers := jsonb_build_object(
          'Authorization', format('Bearer %s', current_setting('app.supabase_anon_key')),
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'to', notification_record.recipient,
          'message', notification_record.message,
          'messageType', 'order_summary',
          'orderId', notification_record.order_id,
          'establishmentId', notification_record.establishment_id
        )
      );
      
      -- Mark as completed
      UPDATE notification_queue 
      SET status = 'completed',
          updated_at = NOW()
      WHERE id = notification_record.id;
      
    EXCEPTION
      WHEN OTHERS THEN
        -- Increment attempt count and set next retry
        retry_count := notification_record.attempts + 1;
        
        UPDATE notification_queue 
        SET attempts = retry_count,
            last_error = SQLERRM,
            next_attempt_at = NOW() + (retry_count * interval '5 minutes'),
            status = CASE 
              WHEN retry_count >= notification_record.max_attempts THEN 'failed'
              ELSE 'pending'
            END,
            updated_at = NOW()
        WHERE id = notification_record.id;
        
        -- Log error for monitoring
        INSERT INTO system_metrics (
          metric_name,
          metric_value,
          tags,
          source
        ) VALUES (
          'whatsapp_notification_failed',
          1,
          jsonb_build_object(
            'order_id', notification_record.order_id,
            'attempt', retry_count,
            'error', SQLERRM
          ),
          'notification_system'
        );
    END;
  END LOOP;
END;
$function$;

-- Melhorar índices para performance
CREATE INDEX IF NOT EXISTS idx_notification_queue_processing 
ON notification_queue (status, next_attempt_at, priority DESC, created_at) 
WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_notifications_realtime 
ON notifications (user_id, created_at DESC, read_at) 
WHERE type = 'new_order';

-- Trigger para limpeza automática de notificações antigas
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Archive old completed notifications (>30 days)
  DELETE FROM notification_queue 
  WHERE status = 'completed' 
    AND created_at < NOW() - INTERVAL '30 days';
  
  -- Remove old failed notifications (>7 days)
  DELETE FROM notification_queue 
  WHERE status = 'failed' 
    AND created_at < NOW() - INTERVAL '7 days';
    
  -- Log cleanup metrics
  INSERT INTO system_metrics (
    metric_name,
    metric_value,
    tags,
    source
  ) VALUES (
    'notification_cleanup_completed',
    1,
    jsonb_build_object('timestamp', NOW()),
    'maintenance_system'
  );
END;
$function$;