import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { securityMonitor } from '@/utils/security';
import { supabase } from '@/integrations/supabase/client';
import { env } from '@/utils/environment';

interface SecurityContextType {
  csrfToken: string;
  isSecureConnection: boolean;
  sessionValid: boolean;
  refreshCSRF: () => void;
  validateSession: () => Promise<boolean>;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

interface SecurityProviderProps {
  children: ReactNode;
}

export function SecurityProvider({ children }: SecurityProviderProps) {
  const [csrfToken, setCsrfToken] = useState('');
  const [isSecureConnection, setIsSecureConnection] = useState(false);
  const [sessionValid, setSessionValid] = useState(true);

  useEffect(() => {
    // Initialize security
    initializeSecurity();
    
    // Set up security monitoring
    const interval = setInterval(monitorSecurity, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const initializeSecurity = () => {
    // Check connection security
    setIsSecureConnection(window.location.protocol === 'https:');
    
    // Generate initial CSRF token
    refreshCSRF();
    
    // Validate existing session
    validateSession();
    
    // Set up Content Security Policy (if not set by server)
    if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      const nonce = securityMonitor.generateCSPNonce();
      const cspMeta = document.createElement('meta');
      cspMeta.setAttribute('http-equiv', 'Content-Security-Policy');
      const supabaseUrl = env.getSupabaseUrl();
      const supabaseHost = supabaseUrl ? supabaseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') : '';
      const analyticsEnabled = import.meta.env.VITE_ENABLE_ANALYTICS === 'true';
      const scriptSrc = [
        `'self'`,
        `'nonce-${nonce}'`,
        `https://js.stripe.com`,
        ...(analyticsEnabled ? [
          `https://www.googletagmanager.com`,
          `https://www.google-analytics.com`
        ] : [])
      ].join(' ');
      const connectSrc = [
        `'self'`,
        `https://api.stripe.com`,
        ...(supabaseHost ? [`https://${supabaseHost}`] : []),
        ...(analyticsEnabled ? [`https://www.google-analytics.com`] : [])
      ].join(' ');
      cspMeta.setAttribute('content', 
        `default-src 'self'; ` +
        `script-src ${scriptSrc}; ` +
        `style-src 'self' 'unsafe-inline'; ` +
        `img-src 'self' data: https:; ` +
        `connect-src ${connectSrc}; ` +
        `frame-src 'self' https://js.stripe.com;`
      );
      document.head.appendChild(cspMeta);
    }
  };

  const refreshCSRF = () => {
    const newToken = securityMonitor.generateSecureToken();
    setCsrfToken(newToken);
    
    // Store in session storage (more secure than localStorage for CSRF)
    sessionStorage.setItem('csrf_token', newToken);
  };

  const validateSession = async (): Promise<boolean> => {
    try {
      const hasSupabase = !!env.getSupabaseUrl() && !!env.getSupabaseAnonKey();
      if (!hasSupabase) {
        setSessionValid(true);
        return true;
      }
      // Validate session via secure Supabase RPC (server-side checks)
      const { data, error } = await supabase.rpc('validate_secure_session');
      const result = (data as any) as { valid?: boolean; reason?: string };
      const isValid = !error && result?.valid === true;
      setSessionValid(isValid);

      if (!isValid) {
        securityMonitor.logSecurityEvent({
          type: 'auth_failure',
          timestamp: Date.now(),
          metadata: { reason: result?.reason || 'session_invalid' }
        });
      }

      return isValid;
    } catch (error) {
      console.error('Session validation failed:', error);
      setSessionValid(false);
      return false;
    }
  };

  const monitorSecurity = () => {
    // Check for suspicious activity patterns
    const userActions = JSON.parse(sessionStorage.getItem('user_actions') || '[]');
    const suspicious = securityMonitor.detectSuspiciousActivity(userActions);
    
    if (suspicious) {
      // Additional security measures
      refreshCSRF();
      const hasSupabase = !!env.getSupabaseUrl() && !!env.getSupabaseAnonKey();
      if (hasSupabase) {
        validateSession();
      }
    }
    
    // Refresh CSRF token periodically
    if (Date.now() % (15 * 60 * 1000) < 30000) { // Every 15 minutes
      refreshCSRF();
    }
  };

  const value: SecurityContextType = {
    csrfToken,
    isSecureConnection,
    sessionValid,
    refreshCSRF,
    validateSession
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
}

export const useSecurity = (): SecurityContextType => {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};

// HOC for protected components
export function withSecurity<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function SecurityEnhancedComponent(props: P) {
    const { sessionValid, isSecureConnection } = useSecurity();
    
    // Security checks
    if (!isSecureConnection && import.meta.env.PROD) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Conexão Insegura</h2>
            <p className="text-muted-foreground">Esta página requer uma conexão HTTPS segura.</p>
          </div>
        </div>
      );
    }
    
    if (!sessionValid) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Sessão Inválida</h2>
            <p className="text-muted-foreground">Por favor, faça login novamente.</p>
          </div>
        </div>
      );
    }
    
    return <Component {...props} />;
  };
}
