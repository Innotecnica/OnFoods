-- Add foreign keys for review tables to profiles
ALTER TABLE public.reviews 
ADD CONSTRAINT reviews_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.product_reviews 
ADD CONSTRAINT product_reviews_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;