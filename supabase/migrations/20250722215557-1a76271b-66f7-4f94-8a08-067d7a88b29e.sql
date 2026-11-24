-- Create workflow functions
CREATE OR REPLACE FUNCTION public.handle_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  customer_profile RECORD;
  establishment_profile RECORD;
  notification_message TEXT;
  notification_title TEXT;
BEGIN
  -- Only proceed if status actually changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get customer profile
  SELECT p.name, p.phone, p.user_id 
  INTO customer_profile
  FROM public.profiles p
  WHERE p.user_id = NEW.customer_id;

  -- Get establishment info
  SELECT e.business_name, e.user_id
  INTO establishment_profile
  FROM public.establishments e
  WHERE e.id = NEW.establishment_id;

  -- Generate notification message based on new status
  CASE NEW.status
    WHEN 'confirmed' THEN
      notification_title := 'Pedido Confirmado';
      notification_message := 'Seu pedido foi confirmado e está sendo preparado!';
    WHEN 'preparing' THEN
      notification_title := 'Preparando Pedido';
      notification_message := 'Sua comida está sendo preparada com carinho!';
    WHEN 'ready' THEN
      notification_title := 'Pedido Pronto';
      notification_message := 'Seu pedido está pronto para retirada/entrega!';
    WHEN 'out_for_delivery' THEN
      notification_title := 'Saiu para Entrega';
      notification_message := 'Seu pedido saiu para entrega e chegará em breve!';
    WHEN 'delivered' THEN
      notification_title := 'Pedido Entregue';
      notification_message := 'Seu pedido foi entregue com sucesso!';
    WHEN 'cancelled' THEN
      notification_title := 'Pedido Cancelado';
      notification_message := 'Seu pedido foi cancelado. Entre em contato conosco se tiver dúvidas.';
    ELSE
      notification_title := 'Status Atualizado';
      notification_message := 'Status do seu pedido foi atualizado para: ' || NEW.status;
  END CASE;

  -- Create notification for customer
  INSERT INTO public.notifications (
    user_id,
    order_id,
    type,
    title,
    message,
    phone_number,
    metadata,
    priority
  ) VALUES (
    NEW.customer_id,
    NEW.id,
    'order_status_update',
    notification_title,
    notification_message,
    customer_profile.phone,
    jsonb_build_object(
      'order_id', NEW.id,
      'status', NEW.status,
      'establishment_name', establishment_profile.business_name,
      'customer_name', customer_profile.name,
      'total_amount', NEW.total_amount,
      'action_url', '/orders'
    ),
    CASE NEW.status
      WHEN 'ready' THEN 'high'
      WHEN 'out_for_delivery' THEN 'high'
      WHEN 'delivered' THEN 'medium'
      WHEN 'cancelled' THEN 'high'
      ELSE 'medium'
    END
  );

  -- Queue notification for external processing (WhatsApp, etc.)
  INSERT INTO public.notification_queue (
    type,
    recipient,
    message,
    establishment_id,
    order_id,
    metadata
  ) VALUES (
    'order_status_update',
    customer_profile.phone,
    notification_message,
    NEW.establishment_id,
    NEW.id,
    jsonb_build_object(
      'customer_name', customer_profile.name,
      'order_id', NEW.id,
      'new_status', NEW.status,
      'establishment_id', NEW.establishment_id,
      'notification_type', 'order_status_update'
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle new orders
CREATE OR REPLACE FUNCTION public.handle_new_order()
RETURNS TRIGGER AS $$
DECLARE
  customer_profile RECORD;
  establishment_profile RECORD;
BEGIN
  -- Get customer profile
  SELECT p.name, p.phone 
  INTO customer_profile
  FROM public.profiles p
  WHERE p.user_id = NEW.customer_id;

  -- Get establishment info
  SELECT e.business_name, e.user_id, e.phone
  INTO establishment_profile
  FROM public.establishments e
  WHERE e.id = NEW.establishment_id;

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
    'Novo Pedido Recebido',
    format('Novo pedido #%s de %s - R$ %s', 
           substring(NEW.id::text, 1, 8), 
           COALESCE(customer_profile.name, 'Cliente'), 
           to_char(NEW.total_amount, 'FM999G999D00')),
    jsonb_build_object(
      'order_id', NEW.id,
      'customer_name', customer_profile.name,
      'customer_phone', customer_profile.phone,
      'total_amount', NEW.total_amount,
      'establishment_name', establishment_profile.business_name,
      'action_url', '/dashboard'
    ),
    'high'
  );

  -- Queue WhatsApp notification to establishment
  INSERT INTO public.notification_queue (
    type,
    recipient,
    message,
    establishment_id,
    order_id,
    metadata
  ) VALUES (
    'new_order_whatsapp',
    establishment_profile.phone,
    format('🛒 NOVO PEDIDO! #%s de %s - R$ %s',
           substring(NEW.id::text, 1, 8),
           COALESCE(customer_profile.name, 'Cliente'),
           to_char(NEW.total_amount, 'FM999G999D00')),
    NEW.establishment_id,
    NEW.id,
    jsonb_build_object(
      'order_id', NEW.id,
      'customer_name', customer_profile.name,
      'customer_phone', customer_profile.phone,
      'total_amount', NEW.total_amount,
      'message_type', 'order_summary'
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for order management
DROP TRIGGER IF EXISTS trigger_order_status_change ON public.orders;
CREATE TRIGGER trigger_order_status_change
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_status_change();

DROP TRIGGER IF EXISTS trigger_new_order ON public.orders;
CREATE TRIGGER trigger_new_order
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_order();