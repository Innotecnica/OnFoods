import { logger } from './logger';
import type { ApiResponse, PaginatedResponse } from '@/types';

// Enhanced API utility with better error handling and logging
interface ApiOptions {
  retries?: number;
  timeout?: number;
  enableCache?: boolean;
  signal?: AbortSignal;
}

interface PaginationParams {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

class ApiClient {
  private baseUrl: string;
  private defaultOptions: ApiOptions;
  private cache = new Map<string, { data: unknown; timestamp: number; ttl: number }>();

  constructor(baseUrl = '', options: ApiOptions = {}) {
    this.baseUrl = baseUrl;
    this.defaultOptions = {
      retries: 3,
      timeout: 10000,
      enableCache: false,
      ...options
    };
  }

  private getCacheKey(url: string, options?: Record<string, unknown>): string {
    return `${url}:${JSON.stringify(options || {})}`;
  }

  private isValidCacheEntry(entry: { timestamp: number; ttl: number }): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit & ApiOptions = {}
  ): Promise<T> {
    const { retries = this.defaultOptions.retries, timeout = this.defaultOptions.timeout, enableCache, ...fetchOptions } = options;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    let lastError: Error;
    
    for (let attempt = 0; attempt <= retries!; attempt++) {
      try {
        logger.debug(`API Request attempt ${attempt + 1}`, { url, method: fetchOptions.method || 'GET' });
        
        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        logger.debug('API Request successful', { url, status: response.status });
        
        return data;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`API Request failed (attempt ${attempt + 1})`, { url, error: lastError.message });
        
        if (attempt < retries!) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    clearTimeout(timeoutId);
    logger.error(`API Request failed after ${retries! + 1} attempts`, lastError);
    throw lastError!;
  }

  async get<T>(endpoint: string, params?: Record<string, unknown>, options: ApiOptions = {}): Promise<ApiResponse<T>> {
    const url = new URL(endpoint, this.baseUrl);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    const cacheKey = this.getCacheKey(url.toString(), params);
    
    // Check cache
    if (options.enableCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (this.isValidCacheEntry(cached)) {
        logger.debug('Cache hit', { url: url.toString() });
        return { data: cached.data as T, error: null, isLoading: false };
      } else {
        this.cache.delete(cacheKey);
      }
    }
    
    try {
      const data = await this.fetchWithRetry<T>(url.toString(), {
        method: 'GET',
        ...options
      });
      
      // Cache successful response
      if (options.enableCache) {
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
          ttl: 300000 // 5 minutes default
        });
      }
      
      return { data, error: null, isLoading: false };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { data: null, error: errorMessage, isLoading: false };
    }
  }

  async post<T>(endpoint: string, data?: unknown, options: ApiOptions = {}): Promise<ApiResponse<T>> {
    const url = new URL(endpoint, this.baseUrl);
    
    try {
      const result = await this.fetchWithRetry<T>(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
        ...options
      });
      
      return { data: result, error: null, isLoading: false };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { data: null, error: errorMessage, isLoading: false };
    }
  }

  async put<T>(endpoint: string, data?: unknown, options: ApiOptions = {}): Promise<ApiResponse<T>> {
    const url = new URL(endpoint, this.baseUrl);
    
    try {
      const result = await this.fetchWithRetry<T>(url.toString(), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
        ...options
      });
      
      return { data: result, error: null, isLoading: false };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { data: null, error: errorMessage, isLoading: false };
    }
  }

  async delete<T>(endpoint: string, options: ApiOptions = {}): Promise<ApiResponse<T>> {
    const url = new URL(endpoint, this.baseUrl);
    
    try {
      const result = await this.fetchWithRetry<T>(url.toString(), {
        method: 'DELETE',
        ...options
      });
      
      return { data: result, error: null, isLoading: false };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { data: null, error: errorMessage, isLoading: false };
    }
  }

  // Paginated GET request
  async getPaginated<T>(
    endpoint: string,
    params?: Record<string, unknown> & PaginationParams,
    options: ApiOptions = {}
  ): Promise<PaginatedResponse<T>> {
    const { page = 1, limit = 20, orderBy, orderDirection = 'desc', ...otherParams } = params || {};
    
    const searchParams = {
      ...otherParams,
      page,
      limit,
      ...(orderBy && { order_by: orderBy, order_direction: orderDirection })
    };
    
    const response = await this.get<{ data: T[]; total: number }>(endpoint, searchParams, options);
    
    if (response.error) {
      return {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        hasMore: false
      };
    }
    
    const { data: items = [], total = 0 } = response.data || {};
    
    return {
      data: items,
      total,
      page,
      limit,
      hasMore: page * limit < total
    };
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
    logger.debug('API cache cleared');
  }

  // Remove expired cache entries
  cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isValidCacheEntry(entry)) {
        this.cache.delete(key);
      }
    }
    logger.debug('API cache cleanup completed');
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Helper functions for common operations
export const handleApiError = (error: unknown, context = ''): string => {
  const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
  logger.error(`API Error ${context}`, error);
  
  // Map common error messages to user-friendly Portuguese
  const errorMap: Record<string, string> = {
    'Network request failed': 'Falha na conexão. Verifique sua internet.',
    'Timeout': 'Operação demorou muito para responder. Tente novamente.',
    'Unauthorized': 'Você não tem permissão para esta ação.',
    'Forbidden': 'Acesso negado.',
    'Not Found': 'Recurso não encontrado.',
    'Internal Server Error': 'Erro interno do servidor. Tente novamente mais tarde.'
  };
  
  return errorMap[errorMessage] || errorMessage;
};

export const createFormData = (data: Record<string, unknown>): FormData => {
  const formData = new FormData();
  
  Object.entries(data).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      if (value instanceof File) {
        formData.append(key, value);
      } else if (typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value));
      }
    }
  });
  
  return formData;
};