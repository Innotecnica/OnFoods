// Environment Configuration Manager - Production Ready
class EnvironmentConfig {
  private static instance: EnvironmentConfig;
  private config: Map<string, string> = new Map();
  
  private constructor() {
    this.initializeConfig();
  }
  
  public static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig.instance) {
      EnvironmentConfig.instance = new EnvironmentConfig();
    }
    return EnvironmentConfig.instance;
  }

  private initializeConfig(): void {
    const supabaseUrl = this.sanitizeEnv(import.meta.env?.VITE_SUPABASE_URL || '');
    const supabaseAnon = this.sanitizeEnv(import.meta.env?.VITE_SUPABASE_ANON_KEY || '');
    const stripeKey = this.sanitizeEnv(import.meta.env?.VITE_STRIPE_PUBLISHABLE_KEY || '');

    if (supabaseUrl) this.config.set('SUPABASE_URL', supabaseUrl);
    if (supabaseAnon) this.config.set('SUPABASE_ANON_KEY', supabaseAnon);
    if (stripeKey) this.config.set('STRIPE_PUBLISHABLE_KEY', stripeKey);

    if (!this.config.has('SUPABASE_URL')) {
      const fallbackUrl = this.secureGet('SUPABASE_URL');
      if (fallbackUrl) this.config.set('SUPABASE_URL', fallbackUrl);
    }
    if (!this.config.has('SUPABASE_ANON_KEY')) {
      const fallbackAnon = this.secureGet('SUPABASE_ANON_KEY');
      if (fallbackAnon) this.config.set('SUPABASE_ANON_KEY', fallbackAnon);
    }

    this.config.set('CSP_NONCE', this.generateNonce());
  }

  // Sanitize env strings to avoid accidental backticks/quotes/whitespace
  private sanitizeEnv(input: string): string {
    if (!input) return '';
    let v = input.trim();
    // Remove wrapping quotes/backticks
    if ((v.startsWith('`') && v.endsWith('`')) || (v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) {
      v = v.slice(1, -1).trim();
    }
    return v;
  }

  public get(key: string): string {
    const value = this.config.get(key);
    if (!value) {
      console.warn(`Environment variable ${key} not found`);
      return '';
    }
    return value;
  }

  public isProduction(): boolean {
    return window.location.hostname !== 'localhost' && 
           !window.location.hostname.includes('lovableproject.com');
  }

  public isDevelopment(): boolean {
    return !this.isProduction();
  }

  public getStripeKey(): string {
    return this.get('STRIPE_PUBLISHABLE_KEY');
  }

  public getSupabaseUrl(): string {
    return this.get('SUPABASE_URL');
  }

  public getSupabaseAnonKey(): string {
    return this.get('SUPABASE_ANON_KEY');
  }

  private generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Rate limiting check
  public checkRateLimit(action: string, maxAttempts: number = 5, windowMs: number = 300000): boolean {
    const key = `rateLimit_${action}`;
    const now = Date.now();
    const stored = localStorage.getItem(key);
    
    if (!stored) {
      localStorage.setItem(key, JSON.stringify({ count: 1, resetTime: now + windowMs }));
      return true;
    }
    
    const data = JSON.parse(stored);
    
    if (now > data.resetTime) {
      localStorage.setItem(key, JSON.stringify({ count: 1, resetTime: now + windowMs }));
      return true;
    }
    
    if (data.count >= maxAttempts) {
      return false;
    }
    
    data.count++;
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  }

  // Secure local storage management
  public secureSet(key: string, value: string): void {
    try {
      // In production, consider encryption
      if (this.isProduction()) {
        console.warn('Consider implementing encryption for sensitive data');
      }
      localStorage.setItem(`secure_${key}`, value);
    } catch (error) {
      console.error('Failed to store data securely:', error);
    }
  }

  public secureGet(key: string): string | null {
    try {
      return localStorage.getItem(`secure_${key}`);
    } catch (error) {
      console.error('Failed to retrieve secure data:', error);
      return null;
    }
  }

  public secureRemove(key: string): void {
    try {
      localStorage.removeItem(`secure_${key}`);
    } catch (error) {
      console.error('Failed to remove secure data:', error);
    }
  }
}

export const env = EnvironmentConfig.getInstance();
