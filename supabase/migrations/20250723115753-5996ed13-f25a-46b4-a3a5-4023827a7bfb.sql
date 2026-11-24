-- Limpar carrinhos órfãos (sem itens)
DELETE FROM carts 
WHERE id NOT IN (
  SELECT DISTINCT cart_id 
  FROM cart_items 
  WHERE cart_id IS NOT NULL
);

-- Adicionar índices para performance do carrinho
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id_product_id ON cart_items(cart_id, product_id);
CREATE INDEX IF NOT EXISTS idx_carts_user_establishment ON carts(user_id, establishment_id);

-- Criar função para limpeza automática de carrinhos órfãos
CREATE OR REPLACE FUNCTION cleanup_orphaned_carts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Remover carrinhos sem itens há mais de 1 hora
  DELETE FROM carts 
  WHERE id NOT IN (
    SELECT DISTINCT cart_id 
    FROM cart_items 
    WHERE cart_id IS NOT NULL
  )
  AND created_at < NOW() - INTERVAL '1 hour';
  
  -- Log limpeza
  INSERT INTO security_audit_log (event_type, details)
  VALUES ('cart_cleanup', jsonb_build_object(
    'cleaned_at', NOW(),
    'type', 'orphaned_carts'
  ));
END;
$$;