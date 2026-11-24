-- Corrigir foreign key entre orders e profiles
-- Adicionar foreign key constraint para customer_id

ALTER TABLE public.orders 
ADD CONSTRAINT orders_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_orders_establishment_id ON public.orders(establishment_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);

-- Índices compostos para consultas específicas
CREATE INDEX IF NOT EXISTS idx_orders_establishment_status ON public.orders(establishment_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_establishment_created_at ON public.orders(establishment_id, created_at DESC);

-- Melhorar performance das consultas de dashboard
CREATE INDEX IF NOT EXISTS idx_establishments_user_id_active ON public.establishments(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_establishment_available ON public.products(establishment_id, is_available);

-- Habilitar realtime para orders (se não estiver habilitado)
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER TABLE public.orders REPLICA IDENTITY FULL;