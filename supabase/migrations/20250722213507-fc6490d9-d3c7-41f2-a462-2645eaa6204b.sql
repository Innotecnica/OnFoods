-- Atualizar tabela establishment_subscriptions para melhor suporte a webhooks
ALTER TABLE public.establishment_subscriptions 
ADD COLUMN IF NOT EXISTS webhook_events_processed jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS last_webhook_event_id text,
ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'manual'::text;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_establishment_subscriptions_stripe_customer 
ON public.establishment_subscriptions(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_establishment_subscriptions_stripe_subscription 
ON public.establishment_subscriptions(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_establishment_subscriptions_status 
ON public.establishment_subscriptions(status, current_period_end);

-- Função para processar eventos de webhook
CREATE OR REPLACE FUNCTION public.process_stripe_webhook_event(
  p_event_type text,
  p_event_id text,
  p_stripe_subscription_id text,
  p_stripe_customer_id text,
  p_subscription_data jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  establishment_record RECORD;
  result jsonb := '{"processed": false, "message": "Unknown error"}'::jsonb;
  discount_info jsonb := null;
BEGIN
  -- Validar se o evento já foi processado
  IF EXISTS (
    SELECT 1 FROM establishment_subscriptions 
    WHERE last_webhook_event_id = p_event_id
  ) THEN
    RETURN '{"processed": false, "message": "Event already processed", "duplicate": true}'::jsonb;
  END IF;

  -- Buscar establishment pelo stripe_customer_id
  SELECT e.id, e.user_id, es.id as subscription_id
  INTO establishment_record
  FROM establishments e
  LEFT JOIN establishment_subscriptions es ON e.id = es.establishment_id
  WHERE es.stripe_customer_id = p_stripe_customer_id
  LIMIT 1;

  IF establishment_record.id IS NULL THEN
    RETURN '{"processed": false, "message": "Establishment not found for customer"}'::jsonb;
  END IF;

  -- Extrair informações de desconto se disponível
  IF p_subscription_data ? 'discount' AND 
     p_subscription_data->'discount' IS NOT NULL AND
     p_subscription_data->'discount' != 'null'::jsonb THEN
    discount_info := jsonb_build_object(
      'coupon_id', p_subscription_data->'discount'->'coupon'->>'id',
      'amount_off', p_subscription_data->'discount'->'coupon'->'amount_off',
      'percent_off', p_subscription_data->'discount'->'coupon'->'percent_off'
    );
  END IF;

  -- Processar diferentes tipos de eventos
  CASE p_event_type
    WHEN 'customer.subscription.created' THEN
      UPDATE establishment_subscriptions
      SET 
        stripe_subscription_id = p_stripe_subscription_id,
        status = CASE 
          WHEN p_subscription_data->>'status' = 'active' THEN 'active'
          WHEN p_subscription_data->>'status' = 'trialing' THEN 'trialing'
          ELSE 'inactive'
        END,
        current_period_start = to_timestamp((p_subscription_data->>'current_period_start')::bigint),
        current_period_end = to_timestamp((p_subscription_data->>'current_period_end')::bigint),
        cancel_at_period_end = (p_subscription_data->>'cancel_at_period_end')::boolean,
        trial_end = CASE 
          WHEN p_subscription_data->>'trial_end' IS NOT NULL AND p_subscription_data->>'trial_end' != 'null'
          THEN to_timestamp((p_subscription_data->>'trial_end')::bigint)
          ELSE NULL
        END,
        subscription_metadata = p_subscription_data || COALESCE(discount_info, '{}'::jsonb),
        webhook_last_sync = NOW(),
        last_webhook_event_id = p_event_id,
        sync_status = 'webhook',
        updated_at = NOW()
      WHERE establishment_id = establishment_record.id;

      result := '{"processed": true, "action": "subscription_created"}'::jsonb;

    WHEN 'customer.subscription.updated' THEN
      UPDATE establishment_subscriptions
      SET 
        status = CASE 
          WHEN p_subscription_data->>'status' = 'active' THEN 'active'
          WHEN p_subscription_data->>'status' = 'trialing' THEN 'trialing'
          WHEN p_subscription_data->>'status' = 'canceled' THEN 'canceled'
          WHEN p_subscription_data->>'status' = 'past_due' THEN 'past_due'
          ELSE 'inactive'
        END,
        current_period_start = to_timestamp((p_subscription_data->>'current_period_start')::bigint),
        current_period_end = to_timestamp((p_subscription_data->>'current_period_end')::bigint),
        cancel_at_period_end = (p_subscription_data->>'cancel_at_period_end')::boolean,
        trial_end = CASE 
          WHEN p_subscription_data->>'trial_end' IS NOT NULL AND p_subscription_data->>'trial_end' != 'null'
          THEN to_timestamp((p_subscription_data->>'trial_end')::bigint)
          ELSE NULL
        END,
        subscription_metadata = p_subscription_data || COALESCE(discount_info, '{}'::jsonb),
        webhook_last_sync = NOW(),
        last_webhook_event_id = p_event_id,
        sync_status = 'webhook',
        updated_at = NOW()
      WHERE establishment_id = establishment_record.id;

      result := '{"processed": true, "action": "subscription_updated"}'::jsonb;

    WHEN 'customer.subscription.deleted' THEN
      UPDATE establishment_subscriptions
      SET 
        status = 'canceled',
        cancel_at_period_end = true,
        subscription_metadata = p_subscription_data || COALESCE(discount_info, '{}'::jsonb),
        webhook_last_sync = NOW(),
        last_webhook_event_id = p_event_id,
        sync_status = 'webhook',
        updated_at = NOW()
      WHERE establishment_id = establishment_record.id;

      result := '{"processed": true, "action": "subscription_canceled"}'::jsonb;

    WHEN 'invoice.payment_succeeded' THEN
      UPDATE establishment_subscriptions
      SET 
        webhook_last_sync = NOW(),
        last_webhook_event_id = p_event_id,
        sync_status = 'webhook',
        updated_at = NOW()
      WHERE establishment_id = establishment_record.id;

      result := '{"processed": true, "action": "payment_succeeded"}'::jsonb;

    WHEN 'invoice.payment_failed' THEN
      UPDATE establishment_subscriptions
      SET 
        status = 'past_due',
        webhook_last_sync = NOW(),
        last_webhook_event_id = p_event_id,
        sync_status = 'webhook',
        updated_at = NOW()
      WHERE establishment_id = establishment_record.id;

      result := '{"processed": true, "action": "payment_failed"}'::jsonb;

    ELSE
      result := jsonb_build_object(
        'processed', false, 
        'message', 'Unhandled event type: ' || p_event_type
      );
  END CASE;

  -- Registrar no histórico
  IF result->>'processed' = 'true' THEN
    PERFORM log_subscription_action(
      establishment_record.user_id,
      establishment_record.id,
      p_event_type,
      NULL,
      (result->>'action'),
      p_stripe_subscription_id,
      jsonb_build_object(
        'webhook_event_id', p_event_id,
        'stripe_subscription_id', p_stripe_subscription_id,
        'processed_at', NOW()
      )
    );
  END IF;

  RETURN result;
END;
$$;