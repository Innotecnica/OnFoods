-- Enable real-time updates for orders table
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Enable real-time updates for order_items table  
ALTER TABLE public.order_items REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;

-- Enable real-time updates for establishments table for stats
ALTER TABLE public.establishments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.establishments;