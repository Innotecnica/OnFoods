interface ErrorDetails {
  code?: string;
  message: string;
  context?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface ErrorReport {
  timestamp: Date;
  userAgent: string;
  url: string;
  userId?: string;
  error: ErrorDetails;
}

class ErrorHandler {
  private static instance: ErrorHandler;
  private errorQueue: ErrorReport[] = [];
  private maxQueueSize = 100;

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  logError(error: Error | ErrorDetails, context?: Record<string, any>): void {
    const errorDetails: ErrorDetails = error instanceof Error ? {
      message: error.message,
      code: error.name,
      context,
      severity: this.determineSeverity(error.message)
    } : error;

    const report: ErrorReport = {
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getCurrentUserId(),
      error: errorDetails
    };

    // Add to queue
    this.errorQueue.push(report);
    
    // Maintain queue size
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }

    // Console logging based on severity
    this.logToConsole(report);

    // Critical errors should be reported immediately
    if (errorDetails.severity === 'critical') {
      this.reportCriticalError(report);
    }
  }

  private determineSeverity(message: string): ErrorDetails['severity'] {
    if (message.includes('auth') || message.includes('security') || message.includes('payment')) {
      return 'critical';
    }
    if (message.includes('network') || message.includes('timeout')) {
      return 'high';
    }
    if (message.includes('validation') || message.includes('format')) {
      return 'medium';
    }
    return 'low';
  }

  private logToConsole(report: ErrorReport): void {
    const { error } = report;
    
    switch (error.severity) {
      case 'critical':
        console.error('🚨 CRITICAL ERROR:', report);
        break;
      case 'high':
        console.error('❌ HIGH SEVERITY:', report);
        break;
      case 'medium':
        console.warn('⚠️ MEDIUM SEVERITY:', report);
        break;
      case 'low':
        console.info('ℹ️ LOW SEVERITY:', report);
        break;
    }
  }

  private getCurrentUserId(): string | undefined {
    try {
      const userCache = localStorage.getItem('userProfileCache');
      if (userCache) {
        const user = JSON.parse(userCache);
        return user.id;
      }
    } catch (e) {
      // Ignore error in error handler
    }
    return undefined;
  }

  private async reportCriticalError(report: ErrorReport): Promise<void> {
    try {
      // In a real app, this would send to monitoring service
      console.error('📊 REPORTING CRITICAL ERROR:', report);
      
      // Could integrate with services like Sentry, LogRocket, etc.
      // await fetch('/api/error-reporting', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(report)
      // });
    } catch (e) {
      console.error('Failed to report critical error:', e);
    }
  }

  getErrorHistory(): ErrorReport[] {
    return [...this.errorQueue];
  }

  clearHistory(): void {
    this.errorQueue = [];
  }
}

export const errorHandler = ErrorHandler.getInstance();

// Helper function for common error scenarios
export function handleAsyncError<T>(
  promise: Promise<T>,
  context?: Record<string, any>
): Promise<T | null> {
  return promise.catch((error) => {
    errorHandler.logError(error, context);
    return null;
  });
}

// Wrapper for API calls
export async function safeApiCall<T>(
  apiCall: () => Promise<T>,
  errorMessage: string = 'API call failed',
  context?: Record<string, any>
): Promise<T | null> {
  try {
    return await apiCall();
  } catch (error) {
    errorHandler.logError({
      message: `${errorMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'medium',
      context
    });
    return null;
  }
}