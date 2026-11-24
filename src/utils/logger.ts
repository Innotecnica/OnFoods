// Enhanced logging utility with structured logging and context
interface LogContext {
  userId?: string;
  sessionId?: string;
  feature?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  data?: unknown;
  error?: Error;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'performance';

class Logger {
  private isDevelopment: boolean;
  private context: LogContext = {};
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory

  constructor() {
    this.isDevelopment = import.meta.env.DEV || false;
  }

  // Set global context for all logs
  setContext(context: Partial<LogContext>): void {
    this.context = { ...this.context, ...context };
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    data?: unknown,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: { ...this.context },
      data,
      error
    };

    // Store in memory (production logging)
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Remove oldest log
    }

    return entry;
  }

  private formatMessage(entry: LogEntry): void {
    if (!this.isDevelopment) return;
    
    const { level, message, timestamp, context, data } = entry;
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    const contextStr = context?.feature ? ` [${context.feature}]` : '';
    
    if (data && typeof data === 'object') {
      console.groupCollapsed(`${prefix}${contextStr} ${message}`);
      console.log('Context:', context);
      console.log('Data:', data);
      console.groupEnd();
    } else {
      console.log(`${prefix}${contextStr} ${message}`, data || '');
    }
  }

  debug(message: string, data?: unknown): void {
    const entry = this.createLogEntry('debug', message, data);
    this.formatMessage(entry);
  }

  info(message: string, data?: unknown): void {
    const entry = this.createLogEntry('info', message, data);
    this.formatMessage(entry);
  }

  warn(message: string, data?: unknown): void {
    const entry = this.createLogEntry('warn', message, data);
    this.formatMessage(entry);
    if (this.isDevelopment) {
      console.warn(message, data);
    }
  }

  error(message: string, error?: Error | unknown): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const entry = this.createLogEntry('error', message, undefined, errorObj);
    
    // Always log errors to console
    console.error(`[${entry.timestamp}] [ERROR] ${message}`, errorObj);
  }

  performance(label: string, fn: () => void): void {
    if (!this.isDevelopment) {
      fn();
      return;
    }
    
    const start = performance.now();
    try {
      fn();
    } finally {
      const duration = performance.now() - start;
      this.createLogEntry('performance', `${label} completed`, { duration: `${duration.toFixed(2)}ms` });
    }
  }

  async performanceAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - start;
      
      if (this.isDevelopment || duration > 1000) { // Log slow operations even in production
        this.createLogEntry('performance', `${label} completed`, { 
          duration: `${duration.toFixed(2)}ms`,
          slow: duration > 1000 
        });
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.error(`${label} failed after ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  }

  // Get logs for debugging or error reporting
  getLogs(level?: LogLevel): LogEntry[] {
    return level ? this.logs.filter(log => log.level === level) : this.logs;
  }

  // Clear logs
  clearLogs(): void {
    this.logs = [];
  }

  // Feature-specific logging
  feature(featureName: string) {
    return {
      debug: (message: string, data?: unknown) => {
        this.setContext({ feature: featureName });
        this.debug(message, data);
      },
      info: (message: string, data?: unknown) => {
        this.setContext({ feature: featureName });
        this.info(message, data);
      },
      warn: (message: string, data?: unknown) => {
        this.setContext({ feature: featureName });
        this.warn(message, data);
      },
      error: (message: string, error?: Error | unknown) => {
        this.setContext({ feature: featureName });
        this.error(message, error);
      }
    };
  }
}

export const logger = new Logger();