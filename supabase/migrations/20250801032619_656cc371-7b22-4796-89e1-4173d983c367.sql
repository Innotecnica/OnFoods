-- Corrigir problemas de segurança identificados pelo linter

-- 1. Corrigir funções sem search_path definido
ALTER FUNCTION public.log_security_event SET search_path = 'public';
ALTER FUNCTION public.handle_establishment_signup SET search_path = 'public';
ALTER FUNCTION public.validate_cart_item SET search_path = 'public';
ALTER FUNCTION public.validate_order_creation SET search_path = 'public';
ALTER FUNCTION public.update_cart_stats SET search_path = 'public';
ALTER FUNCTION public.handle_new_order_notification SET search_path = 'public';
ALTER FUNCTION public.check_subscription_rate_limit SET search_path = 'public';
ALTER FUNCTION public.log_subscription_action SET search_path = 'public';
ALTER FUNCTION public.cleanup_orphaned_carts SET search_path = 'public';
ALTER FUNCTION public.detect_suspicious_auth_patterns SET search_path = 'public';
ALTER FUNCTION public.enhanced_auth_cleanup SET search_path = 'public';
ALTER FUNCTION public.get_customer_promotions SET search_path = 'public';
ALTER FUNCTION public.validate_password_strength_server SET search_path = 'public';
ALTER FUNCTION public.validate_user_password SET search_path = 'public';
ALTER FUNCTION public.migrate_users_without_profiles SET search_path = 'public';
ALTER FUNCTION public.schedule_auth_cleanup SET search_path = 'public';