// Cart Debug and Monitoring Utilities

export interface CartDebugInfo {
  timestamp: string;
  action: string;
  userId: string;
  cartId?: string;
  establishmentId?: string;
  productId?: string;
  quantity?: number;
  error?: string;
  metadata?: Record<string, any>;
}

class CartDebugLogger {
  private logs: CartDebugInfo[] = [];
  private maxLogs = 100;

  log(info: Omit<CartDebugInfo, 'timestamp'>) {
    const logEntry: CartDebugInfo = {
      ...info,
      timestamp: new Date().toISOString()
    };

    this.logs.unshift(logEntry);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Console log with emoji for easier identification
    const emoji = this.getActionEmoji(info.action);
    console.log(`${emoji} [CART-DEBUG] ${info.action}:`, logEntry);

    // Store in localStorage for debugging (development only)
    if (process.env.NODE_ENV === 'development') {
      try {
        localStorage.setItem('cart-debug-logs', JSON.stringify(this.logs));
      } catch (error) {
        console.warn('Failed to save cart debug logs to localStorage:', error);
      }
    }
  }

  private getActionEmoji(action: string): string {
    const emojiMap: Record<string, string> = {
      'cart_load': '📥',
      'cart_create': '🆕',
      'cart_clear': '🧹',
      'item_add': '➕',
      'item_remove': '➖',
      'item_update': '✏️',
      'checkout_start': '🛒',
      'checkout_complete': '✅',
      'checkout_error': '❌',
      'validation_error': '⚠️',
      'network_error': '🌐',
      'database_error': '💾'
    };
    return emojiMap[action] || '📝';
  }

  getLogs(): CartDebugInfo[] {
    return [...this.logs];
  }

  getLogsByAction(action: string): CartDebugInfo[] {
    return this.logs.filter(log => log.action === action);
  }

  getLogsByUser(userId: string): CartDebugInfo[] {
    return this.logs.filter(log => log.userId === userId);
  }

  getErrorLogs(): CartDebugInfo[] {
    return this.logs.filter(log => log.error);
  }

  clearLogs() {
    this.logs = [];
    if (process.env.NODE_ENV === 'development') {
      localStorage.removeItem('cart-debug-logs');
    }
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Performance monitoring
  timeAction<T>(action: string, userId: string, fn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    return fn().then(
      (result) => {
        const duration = performance.now() - startTime;
        this.log({
          action: `${action}_success`,
          userId,
          metadata: { duration: `${duration.toFixed(2)}ms` }
        });
        return result;
      },
      (error) => {
        const duration = performance.now() - startTime;
        this.log({
          action: `${action}_error`,
          userId,
          error: error.message,
          metadata: { duration: `${duration.toFixed(2)}ms` }
        });
        throw error;
      }
    );
  }
}

// Singleton instance
export const cartDebugLogger = new CartDebugLogger();

// Cart validation utilities
export interface CartValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metrics: {
    totalItems: number;
    totalValue: number;
    averageItemPrice: number;
    establishmentCount: number;
  };
}

export function validateCartSystem(carts: Record<string, any>, userId: string): CartValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const cartArray = Object.values(carts);
  const totalItems = cartArray.reduce((sum: number, cart: any) => 
    sum + cart.items.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0), 0
  );
  const totalValue = cartArray.reduce((sum: number, cart: any) => sum + cart.total, 0);
  const establishmentCount = cartArray.length;

  // Validation rules
  if (establishmentCount === 0) {
    warnings.push('Nenhum carrinho ativo');
  }

  if (totalItems > 50) {
    warnings.push(`Muitos itens no carrinho (${totalItems}). Considere finalizar alguns pedidos.`);
  }

  cartArray.forEach((cart: any, index: number) => {
    if (!cart.establishment_id) {
      errors.push(`Carrinho ${index + 1}: ID do estabelecimento inválido`);
    }

    if (!cart.items || cart.items.length === 0) {
      errors.push(`Carrinho ${index + 1}: Sem itens`);
    }

    cart.items?.forEach((item: any, itemIndex: number) => {
      if (!item.product_id) {
        errors.push(`Carrinho ${index + 1}, Item ${itemIndex + 1}: ID do produto inválido`);
      }
      if (item.quantity <= 0) {
        errors.push(`Carrinho ${index + 1}, Item ${itemIndex + 1}: Quantidade inválida`);
      }
      if (!item.product?.price || item.product.price <= 0) {
        errors.push(`Carrinho ${index + 1}, Item ${itemIndex + 1}: Preço inválido`);
      }
    });

    // Check minimum order
    if (cart.establishment?.minimum_order && cart.total < cart.establishment.minimum_order) {
      warnings.push(`Carrinho ${cart.establishment.business_name}: Valor mínimo não atingido`);
    }
  });

  const result: CartValidationResult = {
    isValid: errors.length === 0,
    errors,
    warnings,
    metrics: {
      totalItems,
      totalValue,
      averageItemPrice: totalItems > 0 ? totalValue / totalItems : 0,
      establishmentCount
    }
  };

  // Log validation result
  cartDebugLogger.log({
    action: 'cart_validation',
    userId,
    metadata: {
      result: result.isValid ? 'valid' : 'invalid',
      errorCount: errors.length,
      warningCount: warnings.length,
      ...result.metrics
    }
  });

  return result;
}

// Performance monitoring for cart operations
export function withCartDebug<T extends any[], R>(
  action: string,
  userId: string,
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    return cartDebugLogger.timeAction(action, userId, () => fn(...args));
  };
}

// Cart state analyzer for debugging
export function analyzeCartState(carts: Record<string, any>) {
  const analysis = {
    timestamp: new Date().toISOString(),
    totalCarts: Object.keys(carts).length,
    totalItems: 0,
    totalValue: 0,
    establishments: [] as string[],
    duplicateProducts: [] as string[],
    emptyCartsDetected: 0,
    inconsistencies: [] as string[]
  };

  const productCounts: Record<string, number> = {};
  
  Object.values(carts).forEach((cart: any) => {
    if (!cart.items || cart.items.length === 0) {
      analysis.emptyCartsDetected++;
      return;
    }

    analysis.totalItems += cart.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
    analysis.totalValue += cart.total || 0;
    
    if (cart.establishment?.business_name) {
      analysis.establishments.push(cart.establishment.business_name);
    }

    // Check for duplicate products
    cart.items.forEach((item: any) => {
      if (productCounts[item.product_id]) {
        productCounts[item.product_id]++;
        if (productCounts[item.product_id] === 2) {
          analysis.duplicateProducts.push(item.product?.name || item.product_id);
        }
      } else {
        productCounts[item.product_id] = 1;
      }

      // Check for inconsistencies
      const calculatedTotal = item.product.price * item.quantity;
      if (Math.abs(calculatedTotal - (item.total_price || calculatedTotal)) > 0.01) {
        analysis.inconsistencies.push(`Item ${item.product?.name}: preço inconsistente`);
      }
    });
  });

  console.log('🔍 [CART-ANALYSIS]', analysis);
  return analysis;
}

// Development only: expose debug tools to window
if (process.env.NODE_ENV === 'development') {
  (window as any).cartDebug = {
    logger: cartDebugLogger,
    validate: validateCartSystem,
    analyze: analyzeCartState
  };
}
