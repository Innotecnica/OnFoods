import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

export interface OrderValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface OrderData {
  establishment_id: string;
  total_amount: number;
  delivery_fee: number;
  payment_method: string;
  address_id?: string;
  items: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

export function useOrderValidation() {
  const [isValidating, setIsValidating] = useState(false);

  const validateOrder = async (orderData: OrderData): Promise<OrderValidationResult> => {
    setIsValidating(true);
    
    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Basic validation
      if (!orderData.establishment_id) {
        errors.push('Estabelecimento não selecionado');
      }

      if (!orderData.items || orderData.items.length === 0) {
        errors.push('Carrinho vazio');
      }

      if (orderData.total_amount <= 0) {
        errors.push('Valor total inválido');
      }

      if (!orderData.payment_method) {
        errors.push('Método de pagamento não selecionado');
      }

      if (!orderData.address_id) {
        warnings.push('Endereço de entrega não informado');
      }

      // Validate items
      for (const item of orderData.items || []) {
        if (!item.product_id) {
          errors.push('Produto inválido no carrinho');
        }
        
        if (item.quantity <= 0) {
          errors.push('Quantidade inválida');
        }
        
        if (item.unit_price <= 0) {
          errors.push('Preço unitário inválido');
        }
        
        if (item.total_price !== item.unit_price * item.quantity) {
          errors.push('Erro no cálculo do total do item');
        }
      }

      const result: OrderValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings
      };

      if (!result.isValid) {
        toast({
          title: "Erro na validação do pedido",
          description: errors.join(', '),
          variant: "destructive",
        });
      }

      return result;
    } catch (error) {
      console.error('Error validating order:', error);
      return {
        isValid: false,
        errors: ['Erro interno na validação'],
        warnings: []
      };
    } finally {
      setIsValidating(false);
    }
  };

  return {
    validateOrder,
    isValidating
  };
}