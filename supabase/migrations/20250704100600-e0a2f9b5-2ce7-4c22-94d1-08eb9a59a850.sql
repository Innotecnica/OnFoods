-- Create function to update establishment rating and review count
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

-- Create trigger to automatically update rating when reviews change
DROP TRIGGER IF EXISTS update_establishment_rating_trigger ON public.reviews;
CREATE TRIGGER update_establishment_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_establishment_rating();