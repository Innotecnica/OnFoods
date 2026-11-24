-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  order_id uuid NULL,
  type text NOT NULL,
  title text NULL,
  message text NOT NULL,
  phone_number text NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  read_at timestamp with time zone NULL,
  created_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  action_url text NULL,
  expires_at timestamp with time zone NULL
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON public.notifications(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON public.notifications(read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_order_id ON public.notifications(order_id) WHERE order_id IS NOT NULL;

-- Create order status workflow table
CREATE TABLE IF NOT EXISTS public.order_status_workflow (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL,
  previous_status text NULL,
  new_status text NOT NULL,
  changed_by uuid NULL,
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  notes text NULL,
  metadata jsonb DEFAULT '{}',
  CONSTRAINT fk_order_workflow_order
    FOREIGN KEY (order_id) 
    REFERENCES public.orders(id) 
    ON DELETE CASCADE
);

-- Enable RLS on order_status_workflow
ALTER TABLE public.order_status_workflow ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for order workflow
CREATE POLICY "Users can view order workflow for their orders"
  ON public.order_status_workflow
  FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders 
      WHERE customer_id = auth.uid() 
         OR establishment_id IN (
           SELECT id FROM establishments WHERE user_id = auth.uid()
         )
    )
  );

CREATE POLICY "Establishments can insert order workflow"
  ON public.order_status_workflow
  FOR INSERT
  WITH CHECK (
    order_id IN (
      SELECT id FROM orders 
      WHERE establishment_id IN (
        SELECT id FROM establishments WHERE user_id = auth.uid()
      )
    )
  );

-- Create indexes for order workflow
CREATE INDEX IF NOT EXISTS idx_order_workflow_order_id ON public.order_status_workflow(order_id);
CREATE INDEX IF NOT EXISTS idx_order_workflow_changed_at ON public.order_status_workflow(changed_at DESC);

-- Function to handle order status changes
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

  -- Log the status change
  INSERT INTO public.order_status_workflow (
    order_id,
    previous_status,
    new_status,
    changed_by,
    notes,
    metadata
  ) VALUES (
    NEW.id,
    OLD.status,
    NEW.status,
    auth.uid(),
    'Status automatically updated',
    jsonb_build_object(
      'order_id', NEW.id,
      'previous_status', OLD.status,
      'new_status', NEW.status,
      'timestamp', now()
    )
  );

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

-- Create trigger for order status changes
DROP TRIGGER IF EXISTS trigger_order_status_change ON public.orders;
CREATE TRIGGER trigger_order_status_change
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_status_change();

-- Function to handle new orders
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

-- Create trigger for new orders
DROP TRIGGER IF EXISTS trigger_new_order ON public.orders;
CREATE TRIGGER trigger_new_order
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_order();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_queue;