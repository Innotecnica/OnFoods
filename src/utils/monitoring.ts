// Enhanced monitoring and analytics
import React from 'react';

interface AnalyticsEvent {
  event: string;
  category: string;
  label?: string;
  value?: number;
  customParameters?: Record<string, any>;
  timestamp?: number;
}

interface UserAction {
  action: string;
  timestamp: number;
  page: string;
  elementId?: string;
  metadata?: Record<string, any>;
}

class MonitoringService {
  private events: AnalyticsEvent[] = [];
  private userActions: UserAction[] = [];
  private sessionId: string;
  private userId?: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupEventListeners();
    this.trackPageLoad();
  }

  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private setupEventListeners() {
    // Track clicks
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      this.trackUserAction('click', {
        elementTag: target.tagName,
        elementId: target.id,
        elementClass: target.className,
        elementText: target.textContent?.slice(0, 50)
      });
    });

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.trackUserAction(document.hidden ? 'page_hidden' : 'page_visible');
    });

    // Track errors
    window.addEventListener('error', (event) => {
      this.trackError('javascript_error', event.error);
    });

    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError('unhandled_promise_rejection', event.reason);
    });

    // Track beforeunload
    window.addEventListener('beforeunload', () => {
      this.sendBeacon();
    });
  }

  private trackPageLoad() {
    this.trackEvent({
      event: 'page_view',
      category: 'navigation',
      customParameters: {
        page: window.location.pathname,
        referrer: document.referrer,
        sessionId: this.sessionId,
        timestamp: Date.now()
      }
    });
  }

  // Public methods
  setUserId(userId: string) {
    this.userId = userId;
  }

  trackEvent(event: AnalyticsEvent) {
    const enhancedEvent = {
      ...event,
      timestamp: event.timestamp || Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    this.events.push(enhancedEvent);
    
    // Send to analytics services
    this.sendToAnalytics(enhancedEvent);
    
    console.debug('Analytics event:', enhancedEvent);
  }

  trackUserAction(action: string, metadata?: Record<string, any>) {
    const userAction: UserAction = {
      action,
      timestamp: Date.now(),
      page: window.location.pathname,
      metadata
    };

    this.userActions.push(userAction);
    
    // Keep only last 100 actions in memory
    if (this.userActions.length > 100) {
      this.userActions = this.userActions.slice(-100);
    }
    
    // Store in session for security monitoring
    sessionStorage.setItem('user_actions', JSON.stringify(
      this.userActions.map(a => a.action)
    ));
  }

  trackError(type: string, error: any) {
    const errorEvent: AnalyticsEvent = {
      event: 'error',
      category: 'error',
      label: type,
      customParameters: {
        message: error?.message || error,
        stack: error?.stack,
        sessionId: this.sessionId,
        userId: this.userId,
        url: window.location.href
      }
    };

    this.trackEvent(errorEvent);
  }

  trackConversion(event: string, value?: number, metadata?: Record<string, any>) {
    this.trackEvent({
      event: 'conversion',
      category: 'ecommerce',
      label: event,
      value,
      customParameters: {
        ...metadata,
        conversionType: event
      }
    });
  }

  trackPerformance(metric: string, value: number, metadata?: Record<string, any>) {
    this.trackEvent({
      event: 'performance_metric',
      category: 'performance',
      label: metric,
      value,
      customParameters: metadata
    });
  }

  private sendToAnalytics(event: AnalyticsEvent) {
    // Send to Google Analytics 4
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', event.event, {
        event_category: event.category,
        event_label: event.label,
        value: event.value,
        custom_parameters: event.customParameters
      });
    }

    // Send to custom analytics endpoint
    if (import.meta.env.PROD && import.meta.env.VITE_ENABLE_ANALYTICS === 'true') {
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      }).catch(() => {});
    }
  }

  private sendBeacon() {
    // Send remaining events before page unload
    if (this.events.length > 0 && navigator.sendBeacon) {
      const data = JSON.stringify({
        events: this.events,
        userActions: this.userActions,
        sessionEnd: Date.now()
      });
      
      if (import.meta.env.VITE_ENABLE_ANALYTICS === 'true') {
        navigator.sendBeacon('/api/analytics/beacon', data);
      }
    }
  }

  // Business metrics
  trackBusinessMetric(metric: string, value: number, dimensions?: Record<string, any>) {
    this.trackEvent({
      event: 'business_metric',
      category: 'business',
      label: metric,
      value,
      customParameters: {
        ...dimensions,
        businessMetric: metric
      }
    });
  }

  // User engagement
  trackEngagement(action: string, duration?: number) {
    this.trackEvent({
      event: 'user_engagement',
      category: 'engagement',
      label: action,
      value: duration,
      customParameters: {
        engagementAction: action,
        sessionDuration: Date.now() - parseInt(this.sessionId, 36)
      }
    });
  }

  // Feature usage
  trackFeatureUsage(feature: string, context?: Record<string, any>) {
    this.trackEvent({
      event: 'feature_usage',
      category: 'features',
      label: feature,
      customParameters: {
        ...context,
        feature
      }
    });
  }

  // A/B testing
  trackExperiment(experimentId: string, variant: string, converted?: boolean) {
    this.trackEvent({
      event: 'experiment_exposure',
      category: 'experiments',
      label: `${experimentId}_${variant}`,
      customParameters: {
        experimentId,
        variant,
        converted: converted || false
      }
    });
  }

  // Get analytics summary
  getEvents(category?: string): AnalyticsEvent[] {
    return category 
      ? this.events.filter(e => e.category === category)
      : this.events;
  }

  getUserActions(): UserAction[] {
    return this.userActions;
  }
}

// Global monitoring instance
export const monitoring = new MonitoringService();

// React hooks for monitoring
export const useAnalytics = () => {
  return {
    trackEvent: monitoring.trackEvent.bind(monitoring),
    trackConversion: monitoring.trackConversion.bind(monitoring),
    trackPerformance: monitoring.trackPerformance.bind(monitoring),
    trackBusinessMetric: monitoring.trackBusinessMetric.bind(monitoring),
    trackEngagement: monitoring.trackEngagement.bind(monitoring),
    trackFeatureUsage: monitoring.trackFeatureUsage.bind(monitoring),
    trackExperiment: monitoring.trackExperiment.bind(monitoring)
  };
};

// Higher-order component for automatic tracking
export function withTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
): React.ComponentType<P> {
  return function TrackedComponent(props: P) {
    const analytics = useAnalytics();
    
    React.useEffect(() => {
      analytics.trackFeatureUsage('component_render', { componentName });
    }, [analytics]);
    
    return React.createElement(Component, props);
  };
}
