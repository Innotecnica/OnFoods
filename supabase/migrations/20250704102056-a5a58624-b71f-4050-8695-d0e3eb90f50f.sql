-- Create table for product reviews
CREATE TABLE public.product_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add rating fields to products table
ALTER TABLE public.products 
ADD COLUMN rating NUMERIC DEFAULT 0,
ADD COLUMN total_reviews INTEGER DEFAULT 0;

-- Enable Row Level Security
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Create policies for product reviews
CREATE POLICY "Product reviews are viewable by everyone" 
ON public.product_reviews 
FOR SELECT 
USING (true);

CREATE POLICY "Customers can create product reviews" 
ON public.product_reviews 
FOR INSERT 
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can update their own product reviews" 
ON public.product_reviews 
FOR UPDATE 
USING (auth.uid() = customer_id);

-- Create function to update product rating
CREATE OR REPLACE FUNCTION public.update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the product's rating and total_reviews
  UPDATE public.products 
  SET 
    rating = COALESCE((
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM public.product_reviews 
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
    ), 0),
    total_reviews = (
      SELECT COUNT(*)
      FROM public.product_reviews 
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
    )
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update product rating
CREATE TRIGGER update_product_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_product_rating();

-- Add index for better performance
CREATE INDEX idx_product_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX idx_product_reviews_customer_id ON public.product_reviews(customer_id);