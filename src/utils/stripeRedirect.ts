// Secure Stripe Connect URL generation via edge function
import { supabase } from "@/integrations/supabase/client";

export const redirectToStripeConnect = async () => {
  try {
    const { data, error } = await supabase.functions.invoke('get-stripe-connect-url');
    
    if (error) {
      console.error('Error getting Stripe Connect URL:', error);
      // Fallback to dashboard setup
      redirectToStripeDashboard();
      return;
    }

    if (data?.url) {
      // Open Stripe Connect URL in new tab
      window.open(data.url, '_blank');
    } else {
      // Fallback to dashboard setup
      redirectToStripeDashboard();
    }
  } catch (error) {
    console.error('Error getting Stripe Connect URL:', error);
    // Fallback to dashboard setup
    redirectToStripeDashboard();
  }
};

// Alternative: redirect to Stripe dashboard setup
export const redirectToStripeDashboard = () => {
  // Direct URL to Stripe Connect setup in dashboard
  const stripeSetupUrl = 'https://dashboard.stripe.com/connect/accounts/overview';
  
  // Open in new tab
  window.open(stripeSetupUrl, '_blank');
};