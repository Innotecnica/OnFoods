import { useEffect, useRef } from 'react';
import { logger } from '@/utils/logger';

interface PerformanceMetrics {
  renderTime: number;
  componentName: string;
  props?: any;
  timestamp: number;
}

interface WebVitalMetrics {
  name: string;
  duration: number;
  timestamp: number;
  type: 'navigation' | 'resource' | 'custom';
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: WebVitalMetrics[] = [];
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.setupObservers();
    this.trackCoreWebVitals();
  }

  private setupObservers() {
    // Navigation timing
    if ('performance' in window && 'PerformanceObserver' in window) {
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            this.recordMetric({
              name: 'page_load',
              duration: entry.duration,
              timestamp: Date.now(),
              type: 'navigation',
              metadata: {
                domContentLoaded: (entry as PerformanceNavigationTiming).domContentLoadedEventEnd,
                loadComplete: (entry as PerformanceNavigationTiming).loadEventEnd
              }
            });
          }
        }
      });
      
      try {
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navObserver);
      } catch (e) {
        console.warn('Navigation observer not supported:', e);
      }
    }
  }

  private trackCoreWebVitals() {
    if (!('PerformanceObserver' in window)) return;

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    try {
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        
        this.recordMetric({
          name: 'cumulative_layout_shift',
          duration: clsValue,
          timestamp: Date.now(),
          type: 'custom'
        });
      });
      
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);
    } catch (e) {
      console.warn('CLS observer not supported:', e);
    }

    // Largest Contentful Paint (LCP)
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        this.recordMetric({
          name: 'largest_contentful_paint',
          duration: lastEntry.startTime,
          timestamp: Date.now(),
          type: 'custom'
        });
      });
      
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);
    } catch (e) {
      console.warn('LCP observer not supported:', e);
    }

    // First Input Delay (FID)
    try {
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric({
            name: 'first_input_delay',
            duration: (entry as any).processingStart - entry.startTime,
            timestamp: Date.now(),
            type: 'custom'
          });
        }
      });
      
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);
    } catch (e) {
      console.warn('FID observer not supported:', e);
    }
  }

  recordMetric(metric: WebVitalMetrics) {
    this.metrics.push(metric);
    
    // Send to analytics in production
    if (import.meta.env.PROD && import.meta.env.VITE_ENABLE_ANALYTICS === 'true') {
      this.sendToAnalytics(metric);
    }
    
    console.debug('Performance metric:', metric);
  }

  private sendToAnalytics(metric: WebVitalMetrics) {
    // Send to your analytics service
    fetch('/api/performance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...metric,
        url: window.location.pathname,
        userAgent: navigator.userAgent
      })
    }).catch(() => {});
  }

  // Measure custom operations
  measureAsync<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const start = performance.now();
    
    return operation().then(result => {
      const duration = performance.now() - start;
      this.recordMetric({
        name,
        duration,
        timestamp: Date.now(),
        type: 'custom'
      });
      return result;
    });
  }

  // Get performance summary
  getMetrics(type?: WebVitalMetrics['type']): WebVitalMetrics[] {
    return type 
      ? this.metrics.filter(m => m.type === type)
      : this.metrics;
  }

  // Clean up observers
  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export const usePerformanceMetric = (name: string) => {
  const start = performance.now();
  
  return () => {
    const duration = performance.now() - start;
    performanceMonitor.recordMetric({
      name,
      duration,
      timestamp: Date.now(),
      type: 'custom'
    });
  };
};

// Bundle size tracking
export const trackBundleSize = () => {
  if ('navigation' in performance) {
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    performanceMonitor.recordMetric({
      name: 'bundle_size',
      duration: navEntry.transferSize || 0,
      timestamp: Date.now(),
      type: 'resource',
      metadata: {
        compressed: navEntry.transferSize,
        uncompressed: navEntry.decodedBodySize
      }
    });
  }
};
