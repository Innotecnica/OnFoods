-- Create function to update establishment rating
CREATE OR REPLACE FUNCTION public.update_establishment_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the establishment's rating and total_reviews
  UPDATE public.establishments 
  SET 
    rating = COALESCE((
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM public.reviews 
      WHERE establishment_id = COALESCE(NEW.establishment_id, OLD.establishment_id)
    ), 0),
    total_reviews = (
      SELECT COUNT(*)
      FROM public.reviews 
      WHERE establishment_id = COALESCE(NEW.establishment_id, OLD.establishment_id)
    )
  WHERE id = COALESCE(NEW.establishment_id, OLD.establishment_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT
CREATE TRIGGER trigger_update_establishment_rating_insert
AFTER INSERT ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_establishment_rating();

-- Create trigger for UPDATE
CREATE TRIGGER trigger_update_establishment_rating_update
AFTER UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_establishment_rating();

-- Create trigger for DELETE
CREATE TRIGGER trigger_update_establishment_rating_delete
AFTER DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_establishment_rating();

-- Update existing establishments to have correct ratings
UPDATE public.establishments 
SET 
  rating = COALESCE((
    SELECT ROUND(AVG(rating)::numeric, 2)
    FROM public.reviews 
    WHERE establishment_id = establishments.id
  ), 0),
  total_reviews = (
    SELECT COUNT(*)
    FROM public.reviews 
    WHERE establishment_id = establishments.id
  );