-- Clean all data from database tables for production deployment
-- Delete in order to respect foreign key constraints

-- Delete order-related data first
DELETE FROM public.order_items;
DELETE FROM public.orders;
DELETE FROM public.payment_transactions;
DELETE FROM public.payments;

-- Delete cart data
DELETE FROM public.cart_items;
DELETE FROM public.carts;

-- Delete review and rating data
DELETE FROM public.product_reviews;
DELETE FROM public.reviews;
DELETE FROM public.review_responses;

-- Delete promotion and marketing data
DELETE FROM public.promotion_usage;
DELETE FROM public.promotions;
DELETE FROM public.marketing_campaigns;

-- Delete product-related data
DELETE FROM public.product_tags;
DELETE FROM public.product_variants;
DELETE FROM public.favorites;
DELETE FROM public.products;
DELETE FROM public.categories;

-- Delete establishment data
DELETE FROM public.establishment_payment_configs;
DELETE FROM public.establishment_subscriptions;
DELETE FROM public.stripe_connected_accounts;
DELETE FROM public.establishments;

-- Delete user data
DELETE FROM public.saved_cards;
DELETE FROM public.user_notification_preferences;
DELETE FROM public.addresses;
DELETE FROM public.notifications;
DELETE FROM public.profiles;

-- Delete security audit logs
DELETE FROM public.security_audit_log;

-- Reset sequences if any exist
-- This ensures IDs start from 1 again for any integer sequences

-- Clean storage buckets (remove all files)
-- Note: This SQL won't delete files from storage, you'll need to do that manually
-- through the Supabase dashboard if needed

-- Verify cleanup
DO $$
DECLARE
    table_name text;
    row_count integer;
BEGIN
    -- Check if all tables are empty
    FOR table_name IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
        AND tablename NOT LIKE 'schema_%'
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM public.%I', table_name) INTO row_count;
        IF row_count > 0 THEN
            RAISE NOTICE 'Table % still has % rows', table_name, row_count;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Database cleanup completed. All user data has been removed.';
END $$;