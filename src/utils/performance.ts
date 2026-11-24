import { useEffect, useRef } from 'react';
import { logger } from '@/utils/logger';

interface PerformanceMetrics {
  renderTime: number;
  componentName: string;
  props?: any;
  timestamp: number;
}

// Performance monitoring hook
export function usePerformanceMonitor(componentName: string, props?: any) {
  const renderStartTime = useRef<number>(performance.now());
  const mountTime = useRef<number | null>(null);

  useEffect(() => {
    // Component mounted
    mountTime.current = performance.now();
    const mountDuration = mountTime.current - renderStartTime.current;
    
    logger.debug(`Component MOUNTED: ${componentName}`, {
      mountTime: `${mountDuration.toFixed(2)}ms`
    });

    return () => {
      // Component unmounted
      const unmountTime = performance.now();
      const totalLifetime = unmountTime - (mountTime.current || renderStartTime.current);
      
      logger.debug(`Component UNMOUNTED: ${componentName}`, {
        lifetime: `${totalLifetime.toFixed(2)}ms`
      });
    };
  }, [componentName]);

  useEffect(() => {
    // Re-render detected
    const renderEndTime = performance.now();
    const renderDuration = renderEndTime - renderStartTime.current;
    
    if (renderDuration > 16) { // Warn if render takes more than one frame (16ms)
      logger.warn(`SLOW RENDER: ${componentName}`, {
        renderTime: `${renderDuration.toFixed(2)}ms`,
        props: props ? Object.keys(props).length : 0
      });
    }
    
    renderStartTime.current = performance.now();
  });
}

// Bundle size analyzer
export function analyzeBundleSize() {
  if (typeof window === 'undefined') return;

  const scripts = Array.from(document.querySelectorAll('script[src]'));
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
  
  logger.info('Bundle Analysis', {
    scripts: scripts.length,
    styles: styles.length,
    scriptsSize: scripts.reduce((acc, script) => {
      const src = (script as HTMLScriptElement).src;
      return acc + (src ? src.length : 0);
    }, 0),
    navigation: performance.navigation?.type,
    timing: performance.timing ? {
      loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
      domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
      firstPaint: performance.timing.responseStart - performance.timing.navigationStart
    } : null
  });
}

// Memory usage monitor
export function useMemoryMonitor() {
  useEffect(() => {
    if (!('memory' in performance)) return;

    const checkMemory = () => {
      const memory = (performance as any).memory;
      if (memory) {
        const used = memory.usedJSHeapSize / 1024 / 1024; // MB
        const total = memory.totalJSHeapSize / 1024 / 1024; // MB
        const limit = memory.jsHeapSizeLimit / 1024 / 1024; // MB
        
        if (used > 50) { // Warn if using more than 50MB
          logger.warn('HIGH MEMORY USAGE', {
            used: `${used.toFixed(2)}MB`,
            total: `${total.toFixed(2)}MB`,
            limit: `${limit.toFixed(2)}MB`,
            percentage: `${((used / limit) * 100).toFixed(1)}%`
          });
        }
      }
    };

    const interval = setInterval(checkMemory, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);
}

// Network performance monitor
export function useNetworkMonitor() {
  useEffect(() => {
    if (!('connection' in navigator)) return;

    const connection = (navigator as any).connection;
    if (connection) {
      logger.info('Network Status', {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      });

      const handleConnectionChange = () => {
        logger.info('Network Changed', {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt
        });
      };

      connection.addEventListener('change', handleConnectionChange);
      return () => connection.removeEventListener('change', handleConnectionChange);
    }
  }, []);
}

// Error boundary performance
export class PerformanceErrorBoundary extends Error {
  constructor(
    message: string,
    public componentStack: string,
    public errorBoundary: string
  ) {
    super(message);
    this.name = 'PerformanceErrorBoundary';
    
    logger.error('Performance Error Boundary Triggered', {
      message,
      componentStack,
      errorBoundary,
      timestamp: new Date().toISOString()
    });
  }
}
