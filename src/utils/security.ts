// Security utilities for production

interface SecurityEvent {
  type: 'auth_failure' | 'rate_limit' | 'suspicious_activity' | 'data_breach_attempt';
  userId?: string;
  ip?: string;
  userAgent?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

class SecurityMonitor {
  private events: SecurityEvent[] = [];
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();

  // Rate limiting
  checkRateLimit(identifier: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
    const now = Date.now();
    const existing = this.rateLimitMap.get(identifier);
    
    if (!existing || now > existing.resetTime) {
      this.rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (existing.count >= maxAttempts) {
      this.logSecurityEvent({
        type: 'rate_limit',
        ip: identifier,
        timestamp: now,
        metadata: { attempts: existing.count, maxAttempts }
      });
      return false;
    }
    
    existing.count++;
    return true;
  }

  // Input validation and sanitization
  sanitizeInput(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers
      .trim();
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) errors.push('Senha deve ter pelo menos 8 caracteres');
    if (!/[A-Z]/.test(password)) errors.push('Senha deve conter pelo menos uma letra maiúscula');
    if (!/[a-z]/.test(password)) errors.push('Senha deve conter pelo menos uma letra minúscula');
    if (!/\d/.test(password)) errors.push('Senha deve conter pelo menos um número');
    if (!/[^A-Za-z0-9]/.test(password)) errors.push('Senha deve conter pelo menos um caractere especial');
    
    // Check common passwords
    const commonPasswords = ['123456', 'password', 'admin', 'qwerty', '123456789'];
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Senha muito comum, escolha uma senha mais segura');
    }
    
    return { isValid: errors.length === 0, errors };
  }

  // Content Security Policy helpers
  generateCSPNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Secure data handling
  maskSensitiveData(data: any): any {
    const masked = { ...data };
    const sensitiveFields = ['password', 'cpf', 'cnpj', 'phone', 'email'];
    
    sensitiveFields.forEach(field => {
      if (masked[field]) {
        const value = masked[field].toString();
        if (field === 'email') {
          const [user, domain] = value.split('@');
          masked[field] = `${user.slice(0, 2)}***@${domain}`;
        } else if (field === 'phone') {
          masked[field] = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-****');
        } else if (field === 'cpf') {
          masked[field] = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '***.$2.***-**');
        } else {
          masked[field] = '***';
        }
      }
    });
    
    return masked;
  }

  // Session security
  generateSecureToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  validateSession(token: string): boolean {
    // Basic token validation
    return token.length >= 32 && /^[a-f0-9]+$/.test(token);
  }

  // Log security events
  logSecurityEvent(event: SecurityEvent) {
    this.events.push(event);
    
    // Send to monitoring in production
    if (import.meta.env.PROD) {
      this.sendSecurityAlert(event);
    }
    
    console.warn('Security Event:', event);
  }

  private sendSecurityAlert(event: SecurityEvent) {
    fetch('/api/security-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...event,
        url: window.location.href,
        timestamp: new Date().toISOString()
      })
    }).catch(err => console.error('Failed to send security alert:', err));
  }

  // Check for suspicious patterns
  detectSuspiciousActivity(actions: string[]): boolean {
    const suspiciousPatterns = [
      'rapid_requests', 'failed_auth', 'unusual_navigation', 
      'data_extraction', 'script_injection'
    ];
    
    const recentActions = actions.slice(-10); // Last 10 actions
    const suspiciousCount = recentActions.filter(action => 
      suspiciousPatterns.some(pattern => action.includes(pattern))
    ).length;
    
    if (suspiciousCount >= 3) {
      this.logSecurityEvent({
        type: 'suspicious_activity',
        timestamp: Date.now(),
        metadata: { actions: recentActions, suspiciousCount }
      });
      return true;
    }
    
    return false;
  }

  // Get security summary
  getSecurityEvents(type?: SecurityEvent['type']): SecurityEvent[] {
    return type 
      ? this.events.filter(e => e.type === type)
      : this.events;
  }
}

// Global security monitor instance
export const securityMonitor = new SecurityMonitor();

// React hooks for security
export const useSecurityValidation = () => {
  return {
    validateEmail: securityMonitor.validateEmail.bind(securityMonitor),
    validatePassword: securityMonitor.validatePassword.bind(securityMonitor),
    sanitizeInput: securityMonitor.sanitizeInput.bind(securityMonitor),
    checkRateLimit: securityMonitor.checkRateLimit.bind(securityMonitor)
  };
};

// Secure localStorage wrapper
export const secureStorage = {
  setItem: (key: string, value: string) => {
    try {
      // Encrypt sensitive data (implement your encryption)
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('Failed to store item securely:', error);
    }
  },
  
  getItem: (key: string): string | null => {
    try {
      // Decrypt data if needed
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Failed to retrieve item securely:', error);
      return null;
    }
  },
  
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove item securely:', error);
    }
  },
  
  clear: () => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Failed to clear storage securely:', error);
    }
  }
};

// CSRF protection
export const generateCSRFToken = (): string => {
  return securityMonitor.generateSecureToken();
};

export const validateCSRFToken = (token: string, expectedToken: string): boolean => {
  return token === expectedToken && token.length >= 32;
};