-- Add foreign key for product_reviews table to profiles (if not exists)
ALTER TABLE public.product_reviews 
ADD CONSTRAINT product_reviews_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;