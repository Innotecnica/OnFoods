import { useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { env } from "@/utils/environment";

interface ProductionGuardProps {
  children: React.ReactNode;
}

export function ProductionGuard({ children }: ProductionGuardProps) {
  useEffect(() => {
    // Enhanced production monitoring and security
    const isProduction = !window.location.hostname.includes('localhost') && 
                        !window.location.hostname.includes('lovableproject.com');
    const hasSupabase = !!env.getSupabaseUrl() && !!env.getSupabaseAnonKey();
    
    // Security headers validation in production
    if (isProduction) {
      validateSecurityHeaders();
    }
    
    // Enhanced error handling with security monitoring
    const handleUnhandledError = (event: ErrorEvent) => {
      const error = event.error;
      
      // Log security-related errors with high priority
      if (error?.message?.toLowerCase().includes('security') || 
          error?.message?.toLowerCase().includes('unauthorized') ||
          error?.message?.toLowerCase().includes('forbidden')) {
        if (hasSupabase) {
          supabase.functions.invoke('log-security-event', {
            body: {
              eventType: 'client_security_error',
              details: {
                message: error.message,
                stack: error.stack,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                userAgent: navigator.userAgent,
                url: window.location.href
              }
            }
          }).catch(console.error);
        }
      }
      
      if (isProduction) {
        console.error('[PROD] Critical error:', {
          message: error?.message,
          stack: error?.stack,
          timestamp: new Date().toISOString(),
          url: window.location.href
        });
        
        toast({
          title: "Erro do sistema",
          description: "Um erro inesperado ocorreu. Nossa equipe foi notificada.",
          variant: "destructive",
        });
      }
    };
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isProduction && event.reason?.message) {
        console.error('[PROD] Promise rejection:', {
          reason: event.reason.message,
          stack: event.reason.stack,
          timestamp: new Date().toISOString(),
          url: window.location.href
        });
        
        // Log network-related rejections as potential security issues
        if (event.reason?.message?.toLowerCase().includes('network') ||
            event.reason?.message?.toLowerCase().includes('fetch')) {
          if (hasSupabase) {
            supabase.functions.invoke('log-security-event', {
              body: {
                eventType: 'network_error',
                details: {
                  message: event.reason.message,
                  stack: event.reason.stack,
                  type: 'promise_rejection'
                }
              }
            }).catch(console.error);
          }
        }
      }
    };

    // CSP violation handler
    const handleCSPViolation = (event: SecurityPolicyViolationEvent) => {
      console.error('[CSP] Security policy violation:', {
        blockedURI: event.blockedURI,
        violatedDirective: event.violatedDirective,
        originalPolicy: event.originalPolicy,
        timestamp: new Date().toISOString()
      });
      
      if (hasSupabase) {
        supabase.functions.invoke('log-security-event', {
          body: {
            eventType: 'csp_violation',
            details: {
              blockedURI: event.blockedURI,
              violatedDirective: event.violatedDirective,
              originalPolicy: event.originalPolicy,
              sourceFile: event.sourceFile,
              lineNumber: event.lineNumber,
              columnNumber: event.columnNumber
            }
          }
        }).catch(console.error);
      }
    };
    
    // Enhanced security monitoring
    let rapidClickCount = 0;
    let rapidClickTimer: NodeJS.Timeout;
    
    const handleSuspiciousActivity = () => {
      rapidClickCount++;
      
      clearTimeout(rapidClickTimer);
      rapidClickTimer = setTimeout(() => {
        rapidClickCount = 0;
      }, 1000);
      
      if (rapidClickCount > 20) {
        if (hasSupabase) {
          supabase.functions.invoke('log-security-event', {
            body: {
              eventType: 'suspicious_activity',
              details: {
                type: 'rapid_clicking',
                count: rapidClickCount,
                timestamp: new Date().toISOString()
              }
            }
          }).catch(console.error);
        }
        
        rapidClickCount = 0;
      }
    };
    
    // Add all event listeners
    window.addEventListener('error', handleUnhandledError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    document.addEventListener('securitypolicyviolation', handleCSPViolation);
    document.addEventListener('click', handleSuspiciousActivity);
    
    return () => {
      window.removeEventListener('error', handleUnhandledError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      document.removeEventListener('securitypolicyviolation', handleCSPViolation);
      document.removeEventListener('click', handleSuspiciousActivity);
      clearTimeout(rapidClickTimer);
    };
  }, []);

  const validateSecurityHeaders = () => {
    const hasSupabase = !!env.getSupabaseUrl() && !!env.getSupabaseAnonKey();
    // Check HTTPS enforcement
    if (window.location.protocol !== 'https:') {
      console.warn('[SECURITY] Application should be served over HTTPS in production');
      
      if (hasSupabase) {
        supabase.functions.invoke('log-security-event', {
          body: {
            eventType: 'insecure_connection',
            details: {
              protocol: window.location.protocol,
              host: window.location.host
            }
          }
        }).catch(console.error);
      }
    }

    // Validate security headers
    fetch(window.location.origin, { method: 'HEAD' })
      .then(response => {
        const headers = response.headers;
        const requiredHeaders = [
          'strict-transport-security',
          'x-content-type-options',
          'x-frame-options',
          'x-xss-protection',
          'content-security-policy'
        ];

        const missingHeaders = requiredHeaders.filter(header => !headers.get(header));
        
        if (missingHeaders.length > 0) {
          console.warn('[SECURITY] Missing security headers:', missingHeaders);
          
          if (hasSupabase) {
            supabase.functions.invoke('log-security-event', {
              body: {
                eventType: 'missing_security_headers',
                details: {
                  missingHeaders,
                  currentHeaders: Object.fromEntries(headers.entries())
                }
              }
            }).catch(console.error);
          }
        }
      })
      .catch(error => {
        console.warn('[SECURITY] Could not validate security headers:', error);
      });
  };
  
  return <>{children}</>;
}
