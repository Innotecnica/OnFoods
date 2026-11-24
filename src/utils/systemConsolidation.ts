// System consolidation utilities
import { supabase } from "@/integrations/supabase/client";

// Clean up unused sessions and data
export const cleanupSystem = async () => {
  try {
    // Clear expired data from localStorage
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes('_timestamp')) {
        const timestamp = localStorage.getItem(key);
        if (timestamp && Date.now() - parseInt(timestamp) > 24 * 60 * 60 * 1000) {
          localStorage.removeItem(key);
          localStorage.removeItem(key.replace('_timestamp', ''));
        }
      }
    });

    // Clear search cache older than 1 hour
    const searchCache = localStorage.getItem('searchCache');
    if (searchCache) {
      try {
        const cache = JSON.parse(searchCache);
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        const cleanedCache = Object.fromEntries(
          Object.entries(cache).filter(([key, value]: [string, any]) => 
            value.timestamp && value.timestamp > oneHourAgo
          )
        );
        localStorage.setItem('searchCache', JSON.stringify(cleanedCache));
      } catch (e) {
        localStorage.removeItem('searchCache');
      }
    }

    console.log('🧹 System cleanup completed');
  } catch (error) {
    console.error('Error during system cleanup:', error);
  }
};

// Initialize system optimization
export const initializeSystemOptimization = () => {
  // Run cleanup on page load
  cleanupSystem();

  // Schedule periodic cleanup
  setInterval(cleanupSystem, 15 * 60 * 1000); // Every 15 minutes

  // Cleanup on page unload
  window.addEventListener('beforeunload', cleanupSystem);
};

// Performance monitoring
export const logPerformanceMetrics = () => {
  if ('performance' in window) {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    console.log('📊 Performance Metrics:', {
      pageLoadTime: navigation.loadEventEnd - navigation.fetchStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
      firstContentfulPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime,
      memoryUsage: (performance as any).memory ? {
        used: Math.round((performance as any).memory.usedJSHeapSize / 1048576),
        total: Math.round((performance as any).memory.totalJSHeapSize / 1048576),
      } : null
    });
  }
};

// Database connection health check
export const checkDatabaseHealth = async () => {
  try {
    const start = Date.now();
    const { data, error } = await supabase
      .from('establishments')
      .select('id')
      .limit(1);
    
    const responseTime = Date.now() - start;
    
    console.log('🏥 Database Health:', {
      status: error ? 'error' : 'healthy',
      responseTime: `${responseTime}ms`,
      error: error?.message
    });

    return { healthy: !error, responseTime, error };
  } catch (error) {
    console.error('Database health check failed:', error);
    return { healthy: false, responseTime: 0, error };
  }
};