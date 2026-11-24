-- Create trigger to update product rating when product reviews are added/updated/deleted
DROP TRIGGER IF EXISTS update_product_rating_trigger ON product_reviews;

CREATE TRIGGER update_product_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON product_reviews
  FOR EACH ROW EXECUTE FUNCTION update_product_rating();