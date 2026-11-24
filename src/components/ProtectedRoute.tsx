import { ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  userType?: "customer" | "establishment";
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  requireAuth = true, 
  userType, 
  redirectTo = "/auth" 
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Debug logs removed for production performance

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to auth if authentication is required but user is not logged in
  if (requireAuth && !isAuthenticated) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  // Redirect authenticated users away from auth page
  if (!requireAuth && isAuthenticated && user) {
    const dashboardRoute = user.type === "establishment" 
      ? "/establishment-dashboard" 
      : "/";
    
    return <Navigate to={dashboardRoute} replace />;
  }

  // Check user type if specified
  if (userType && user && user.type !== userType) {
    const correctRoute = user.type === "establishment" 
      ? "/establishment-dashboard" 
      : "/";
    return <Navigate to={correctRoute} replace />;
  }

  return <>{children}</>;
}