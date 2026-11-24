-- Add city and state columns to establishments table
ALTER TABLE public.establishments 
ADD COLUMN city TEXT,
ADD COLUMN state TEXT;

-- Create index for better performance on location queries
CREATE INDEX idx_establishments_city_state ON public.establishments(city, state);

-- Add a comment to explain the purpose
COMMENT ON COLUMN public.establishments.city IS 'Cidade do estabelecimento para filtros de localização';
COMMENT ON COLUMN public.establishments.state IS 'Estado do estabelecimento para filtros de localização';