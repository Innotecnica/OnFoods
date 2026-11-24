-- Create table for product images
CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Product images are viewable by everyone" 
ON public.product_images 
FOR SELECT 
USING (true);

CREATE POLICY "Establishment owners can manage their product images" 
ON public.product_images 
FOR ALL 
USING (
  product_id IN (
    SELECT p.id 
    FROM products p
    JOIN establishments e ON p.establishment_id = e.id
    WHERE e.user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_product_images_updated_at 
BEFORE UPDATE ON public.product_images 
FOR EACH ROW 
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX idx_product_images_display_order ON public.product_images(product_id, display_order);

-- Function to ensure only one primary image per product
CREATE OR REPLACE FUNCTION public.ensure_single_primary_image()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting an image as primary, unset all other primary images for this product
  IF NEW.is_primary = true THEN
    UPDATE public.product_images 
    SET is_primary = false 
    WHERE product_id = NEW.product_id 
      AND id != NEW.id 
      AND is_primary = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for ensuring single primary image
CREATE TRIGGER ensure_single_primary_image_trigger
BEFORE INSERT OR UPDATE ON public.product_images
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_primary_image();