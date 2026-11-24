/**
 * Enhanced authentication timeout and session management utilities
 * Prevents hanging requests, manages session timeouts, and provides security monitoring
 */

import { supabase } from '@/integrations/supabase/client';

export const createTimeoutPromise = <T>(
  promise: Promise<T>, 
  timeoutMs: number = 15000,
  errorMessage = 'Request timeout'
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(errorMessage));
      }, timeoutMs);
    })
  ]);
};

export const withAuthTimeout = async <T>(
  authOperation: () => Promise<T>,
  timeoutMs: number = 10000,
  retries: number = 2
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Auth operation attempt ${attempt + 1}/${retries + 1}`);
      
      const result = await createTimeoutPromise(
        authOperation(),
        timeoutMs,
        `Authentication request timeout (${timeoutMs}ms)`
      );
      
      console.log('✅ Auth operation successful');
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.warn(`⚠️ Auth operation attempt ${attempt + 1} failed:`, lastError.message);
      
      if (attempt < retries) {
        // Progressive delay between retries
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error('❌ All auth operation attempts failed');
  throw lastError;
};

export const createAbortableAuth = (timeoutMs: number = 15000) => {
  const controller = new AbortController();
  
  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  
  const cleanup = () => {
    clearTimeout(timeout);
  };
  
  return {
    signal: controller.signal,
    abort: () => controller.abort(),
    cleanup
  };
};

// Enhanced session timeout manager
export class SessionTimeoutManager {
  private timeoutId: NodeJS.Timeout | null = null;
  private warningId: NodeJS.Timeout | null = null;
  private lastActivity: number = Date.now();
  private readonly sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
  private readonly warningTime = 5 * 60 * 1000; // 5 minutes warning
  private onWarning?: () => void;
  private onTimeout?: () => void;

  constructor() {
    this.bindActivityListeners();
  }

  private bindActivityListeners() {
    const activities = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    activities.forEach(activity => {
      document.addEventListener(activity, this.updateActivity.bind(this), { passive: true });
    });

    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }

  private updateActivity() {
    this.lastActivity = Date.now();
    
    if (this.timeoutId || this.warningId) {
      this.resetTimers();
      this.startTimers();
    }
  }

  private handleVisibilityChange() {
    if (!document.hidden) {
      this.updateActivity();
    }
  }

  public startTimers() {
    this.resetTimers();

    this.warningId = setTimeout(() => {
      this.onWarning?.();
    }, this.sessionTimeout - this.warningTime);

    this.timeoutId = setTimeout(() => {
      this.handleTimeout();
    }, this.sessionTimeout);
  }

  public resetTimers() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    if (this.warningId) {
      clearTimeout(this.warningId);
      this.warningId = null;
    }
  }

  private async handleTimeout() {
    console.warn('🔒 Session timeout triggered');
    
    try {
      await supabase.functions.invoke('log-security-event', {
        body: {
          eventType: 'session_timeout',
          details: {
            lastActivity: new Date(this.lastActivity).toISOString(),
            timeoutDuration: this.sessionTimeout
          }
        }
      });
    } catch (error) {
      console.error('Failed to log timeout event:', error);
    }

    this.onTimeout?.();
    this.resetTimers();
  }

  public setWarningCallback(callback: () => void) {
    this.onWarning = callback;
  }

  public setTimeoutCallback(callback: () => void) {
    this.onTimeout = callback;
  }

  public extendSession() {
    this.updateActivity();
    console.log('Session extended by user action');
  }

  public getRemainingTime(): number {
    const timeSinceLastActivity = Date.now() - this.lastActivity;
    return Math.max(0, this.sessionTimeout - timeSinceLastActivity);
  }

  public destroy() {
    this.resetTimers();
    
    const activities = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    activities.forEach(activity => {
      document.removeEventListener(activity, this.updateActivity.bind(this));
    });
    
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }
}