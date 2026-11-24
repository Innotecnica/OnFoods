import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function DashboardRedirect() {
  const { user, isLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  
  useEffect(() => {
    const urlType = searchParams.get('type');
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    
    console.log('🔗 DashboardRedirect called with params:', { urlType, hasTokens: !!(accessToken && refreshToken) });
    
    // Handle email confirmation tokens
    if (accessToken && refreshToken && !user && !isLoading) {
      console.log('🔗 Email confirmation detected, processing tokens...');
      // Set the session with the tokens from URL
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      }).then(() => {
        console.log('✅ Session set from email confirmation tokens');
      }).catch((error) => {
        console.error('❌ Error setting session from tokens:', error);
      });
      return;
    }
    
    // If no user and we have a type hint from email, redirect to auth with message
    if (!isLoading && !user) {
      if (urlType) {
        setRedirectPath(`/auth?message=confirm&type=${urlType}`);
      } else {
        setRedirectPath("/auth");
      }
      return;
    }
    
    if (user) {
      // Redirect based on user type (prioritize actual user type over URL hint)
      if (user.type === "establishment") {
        setRedirectPath("/establishment-dashboard");
      } else {
        setRedirectPath("/");
      }
    }
  }, [user, isLoading, searchParams]);
  
  // Show loading while determining redirect path
  if (isLoading || !redirectPath) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Redirecionando...</p>
        </div>
      </div>
    );
  }
  
  return <Navigate to={redirectPath} replace />;
}