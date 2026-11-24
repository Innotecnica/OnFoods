-- Add missing foreign keys for reviews system

-- Add foreign key for reviews table to profiles
ALTER TABLE public.reviews 
ADD CONSTRAINT reviews_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Add foreign key for product_reviews table to profiles (if not already exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'product_reviews_customer_id_fkey' 
        AND table_name = 'product_reviews'
    ) THEN
        ALTER TABLE public.product_reviews 
        ADD CONSTRAINT product_reviews_customer_id_fkey 
        FOREIGN KEY (customer_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
    END IF;
END $$;