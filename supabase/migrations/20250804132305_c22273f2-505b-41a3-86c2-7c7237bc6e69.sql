-- Fix remaining functions without proper search_path (Critical Security Issue)
CREATE OR REPLACE FUNCTION public.update_product_rating()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  avg_rating NUMERIC;
  total_reviews INTEGER;
BEGIN
  -- Calculate new average rating and total reviews for the product
  SELECT 
    ROUND(AVG(rating), 2),
    COUNT(*)
  INTO avg_rating, total_reviews
  FROM product_reviews
  WHERE product_id = COALESCE(NEW.product_id, OLD.product_id);

  -- Update product with new values
  UPDATE products
  SET 
    rating = COALESCE(avg_rating, 0),
    total_reviews = total_reviews,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);

  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_cart_stats()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Atualizar updated_at do carrinho quando itens são modificados
  UPDATE carts 
  SET updated_at = NOW() 
  WHERE id = COALESCE(NEW.cart_id, OLD.cart_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.detect_suspicious_auth_patterns()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  recent_attempts integer;
  client_ip inet := inet_client_addr();
BEGIN
  -- Count recent failed login attempts from the same IP
  SELECT COUNT(*)
  INTO recent_attempts
  FROM security_audit_log
  WHERE event_type = 'failed_login_attempt'
    AND ip_address = client_ip
    AND created_at > NOW() - INTERVAL '15 minutes';
  
  -- Log if there are multiple recent attempts
  IF recent_attempts >= 3 THEN
    PERFORM log_otp_security_event(
      'suspicious_auth_pattern',
      NEW.email,
      jsonb_build_object(
        'recent_attempts', recent_attempts,
        'source_ip', client_ip,
        'pattern_type', 'multiple_failed_attempts'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_user_password()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  validation_result jsonb;
BEGIN
  -- Só validar se há uma nova senha criptografada
  IF NEW.encrypted_password IS DISTINCT FROM OLD.encrypted_password THEN
    -- Log da tentativa de mudança de senha
    PERFORM log_security_event(
      'password_change_attempt',
      NEW.id,
      jsonb_build_object(
        'user_id', NEW.id,
        'timestamp', NOW()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_session_security()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Log session validation attempts
  PERFORM log_otp_security_event(
    'session_validation',
    NEW.email,
    jsonb_build_object(
      'user_id', NEW.id,
      'confirmation_token_present', NEW.confirmation_token IS NOT NULL,
      'recovery_token_present', NEW.recovery_token IS NOT NULL
    )
  );
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_order_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  FROM profiles p
  WHERE p.user_id = NEW.customer_id;

  -- Get establishment info
  SELECT e.business_name, e.user_id
  INTO establishment_profile
  FROM establishments e
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
      notification_message := 'Seu pedido foi cancelado.';
    ELSE
      RETURN NEW; -- No notification for unknown status
  END CASE;

  -- Create notification for customer
  INSERT INTO notifications (
    user_id,
    order_id,
    type,
    title,
    message,
    metadata,
    priority
  ) VALUES (
    customer_profile.user_id,
    NEW.id,
    'order_status_update',
    notification_title,
    notification_message,
    jsonb_build_object(
      'order_id', NEW.id,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'establishment_name', establishment_profile.business_name
    ),
    'high'
  );

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_single_default_card()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- If setting a card as default, unset all other default cards for this user
  IF NEW.is_default = true THEN
    UPDATE saved_cards 
    SET is_default = false 
    WHERE user_id = NEW.user_id 
      AND id != NEW.id 
      AND is_default = true;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Strengthen RLS policies by replacing overly permissive WITH CHECK: true policies

-- Replace overly permissive marketing_events INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert events" ON marketing_events;
CREATE POLICY "Users can insert events for their establishments" ON marketing_events
  FOR INSERT 
  WITH CHECK (
    establishment_id IN (
      SELECT establishments.id 
      FROM establishments 
      WHERE establishments.user_id = auth.uid()
    ) 
    AND auth.uid() IS NOT NULL
  );

-- Replace overly permissive marketing_metrics INSERT policy  
DROP POLICY IF EXISTS "System can insert metrics" ON marketing_metrics;
CREATE POLICY "Establishment owners can insert their metrics" ON marketing_metrics
  FOR INSERT 
  WITH CHECK (
    establishment_id IN (
      SELECT establishments.id 
      FROM establishments 
      WHERE establishments.user_id = auth.uid()
    )
  );

-- Add controlled DELETE policies for sensitive data with audit trails

-- Orders DELETE policy with establishment ownership validation
CREATE POLICY "Establishment owners can delete their orders" ON orders
  FOR DELETE 
  USING (
    establishment_id IN (
      SELECT establishments.id 
      FROM establishments 
      WHERE establishments.user_id = auth.uid()
    )
  );

-- Secure DELETE function for orders with audit logging
CREATE OR REPLACE FUNCTION public.secure_delete_order(p_order_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  order_record RECORD;
  establishment_id UUID;
BEGIN
  -- Verify establishment ownership
  SELECT id INTO establishment_id 
  FROM establishments 
  WHERE user_id = auth.uid();
  
  IF establishment_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get order details for audit log
  SELECT * INTO order_record
  FROM orders 
  WHERE id = p_order_id 
  AND establishment_id = secure_delete_order.establishment_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Log the deletion for audit trail
  INSERT INTO security_audit_log (
    event_type,
    user_id,
    details
  ) VALUES (
    'order_deletion',
    auth.uid(),
    jsonb_build_object(
      'order_id', p_order_id,
      'customer_id', order_record.customer_id,
      'total_amount', order_record.total_amount,
      'status', order_record.status,
      'establishment_id', establishment_id
    )
  );
  
  -- Delete the order
  DELETE FROM orders WHERE id = p_order_id;
  
  RETURN true;
END;
$function$;

-- Add input validation function for sensitive operations
CREATE OR REPLACE FUNCTION public.validate_establishment_input(p_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb := '{"valid": true, "errors": []}'::jsonb;
  errors text[] := '{}';
BEGIN
  -- Validate business name
  IF p_data->>'business_name' IS NULL OR length(trim(p_data->>'business_name')) < 2 THEN
    errors := array_append(errors, 'Nome do estabelecimento deve ter pelo menos 2 caracteres');
  END IF;
  
  -- Validate phone
  IF p_data->>'phone' IS NOT NULL AND NOT (p_data->>'phone' ~ '^[+]?[0-9\s\-\(\)]{10,15}$') THEN
    errors := array_append(errors, 'Telefone deve ter formato válido');
  END IF;
  
  -- Validate email
  IF p_data->>'email' IS NOT NULL AND NOT (p_data->>'email' ~ '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$') THEN
    errors := array_append(errors, 'Email deve ter formato válido');
  END IF;
  
  -- Validate CNPJ if provided
  IF p_data->>'cnpj' IS NOT NULL AND NOT validate_cnpj_format(p_data->>'cnpj') THEN
    errors := array_append(errors, 'CNPJ deve ter formato válido');
  END IF;
  
  result := jsonb_build_object(
    'valid', array_length(errors, 1) IS NULL,
    'errors', errors
  );
  
  RETURN result;
END;
$function$;

-- Add enhanced authentication monitoring
CREATE OR REPLACE FUNCTION public.monitor_auth_attempts()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  client_ip inet := inet_client_addr();
  user_agent text := current_setting('request.headers', true)::json->>'user-agent';
BEGIN
  -- Log authentication attempt
  INSERT INTO security_audit_log (
    event_type,
    user_id,
    ip_address,
    user_agent,
    details
  ) VALUES (
    'auth_attempt',
    NEW.id,
    client_ip,
    user_agent,
    jsonb_build_object(
      'email', NEW.email,
      'confirmed', NEW.email_confirmed_at IS NOT NULL,
      'last_sign_in', NEW.last_sign_in_at
    )
  );
  
  RETURN NEW;
END;
$function$;