import { useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { errorHandler } from '@/utils/errorHandler';

export function useErrorHandler() {
  const showUserError = useCallback((message: string, title: string = 'Erro') => {
    toast({
      title,
      description: message,
      variant: 'destructive',
    });
  }, []);

  const handleError = useCallback((
    error: Error | string,
    context?: Record<string, any>,
    showToUser: boolean = true,
    userMessage?: string
  ) => {
    // Log the error
    if (typeof error === 'string') {
      errorHandler.logError({
        message: error,
        severity: 'medium',
        context
      });
    } else {
      errorHandler.logError(error, context);
    }

    // Show user-friendly message if requested
    if (showToUser) {
      const displayMessage = userMessage || (typeof error === 'string' ? error : 'Ocorreu um erro inesperado');
      showUserError(displayMessage);
    }
  }, [showUserError]);

  const handleAsyncOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    errorMessage: string = 'Operação falhou',
    showErrorToUser: boolean = true
  ): Promise<T | null> => {
    try {
      return await operation();
    } catch (error) {
      handleError(error as Error, { operation: errorMessage }, showErrorToUser, errorMessage);
      return null;
    }
  }, [handleError]);

  return {
    handleError,
    handleAsyncOperation,
    showUserError
  };
}