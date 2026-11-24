import { ValidationResult } from '@/types';

// Generic validation utility
export class Validator {
  private errors: string[] = [];
  private warnings: string[] = [];

  // String validations
  required(value: unknown, fieldName: string): this {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      this.errors.push(`${fieldName} é obrigatório`);
    }
    return this;
  }

  minLength(value: string, min: number, fieldName: string): this {
    if (value && value.length < min) {
      this.errors.push(`${fieldName} deve ter pelo menos ${min} caracteres`);
    }
    return this;
  }

  maxLength(value: string, max: number, fieldName: string): this {
    if (value && value.length > max) {
      this.errors.push(`${fieldName} deve ter no máximo ${max} caracteres`);
    }
    return this;
  }

  email(value: string, fieldName: string = 'Email'): this {
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      this.errors.push(`${fieldName} deve ter um formato válido`);
    }
    return this;
  }

  phone(value: string, fieldName: string = 'Telefone'): this {
    if (value && !/^[\d\s\-\(\)\+]{10,}$/.test(value.replace(/\s/g, ''))) {
      this.errors.push(`${fieldName} deve ter um formato válido`);
    }
    return this;
  }

  // Number validations
  min(value: number, min: number, fieldName: string): this {
    if (value !== undefined && value < min) {
      this.errors.push(`${fieldName} deve ser no mínimo ${min}`);
    }
    return this;
  }

  max(value: number, max: number, fieldName: string): this {
    if (value !== undefined && value > max) {
      this.errors.push(`${fieldName} deve ser no máximo ${max}`);
    }
    return this;
  }

  positive(value: number, fieldName: string): this {
    if (value !== undefined && value <= 0) {
      this.errors.push(`${fieldName} deve ser um valor positivo`);
    }
    return this;
  }

  // Custom validation
  custom(condition: boolean, errorMessage: string): this {
    if (!condition) {
      this.errors.push(errorMessage);
    }
    return this;
  }

  // Warning (non-blocking)
  warn(condition: boolean, warningMessage: string): this {
    if (!condition) {
      this.warnings.push(warningMessage);
    }
    return this;
  }

  // Get validation result
  result(): ValidationResult {
    return {
      isValid: this.errors.length === 0,
      errors: [...this.errors],
      warnings: [...this.warnings]
    };
  }

  // Reset for reuse
  reset(): this {
    this.errors = [];
    this.warnings = [];
    return this;
  }
}

// Factory function for validation
export const validate = () => new Validator();

// Common validation functions
export const validateEstablishment = (data: {
  business_name?: string;
  business_type?: string;
  phone?: string;
  email?: string;
  address?: string;
  delivery_fee?: number;
  minimum_order?: number;
  delivery_time_min?: number;
  delivery_time_max?: number;
}): ValidationResult => {
  return validate()
    .required(data.business_name, 'Nome do negócio')
    .minLength(data.business_name || '', 2, 'Nome do negócio')
    .maxLength(data.business_name || '', 100, 'Nome do negócio')
    .required(data.business_type, 'Tipo de negócio')
    .required(data.phone, 'Telefone')
    .phone(data.phone || '')
    .email(data.email || '')
    .required(data.address, 'Endereço')
    .min(data.delivery_fee || 0, 0, 'Taxa de entrega')
    .positive(data.minimum_order || 0, 'Pedido mínimo')
    .min(data.delivery_time_min || 0, 1, 'Tempo mínimo de entrega')
    .max(data.delivery_time_max || 0, 480, 'Tempo máximo de entrega')
    .custom(
      (data.delivery_time_min || 0) <= (data.delivery_time_max || 0),
      'Tempo mínimo deve ser menor ou igual ao tempo máximo'
    )
    .result();
};

export const validateProduct = (data: {
  name?: string;
  description?: string;
  price?: number;
  category_id?: string;
  preparation_time?: number;
}): ValidationResult => {
  return validate()
    .required(data.name, 'Nome do produto')
    .minLength(data.name || '', 2, 'Nome do produto')
    .maxLength(data.name || '', 100, 'Nome do produto')
    .required(data.description, 'Descrição')
    .minLength(data.description || '', 10, 'Descrição')
    .maxLength(data.description || '', 500, 'Descrição')
    .required(data.price, 'Preço')
    .positive(data.price || 0, 'Preço')
    .required(data.category_id, 'Categoria')
    .required(data.preparation_time, 'Tempo de preparo')
    .positive(data.preparation_time || 0, 'Tempo de preparo')
    .max(data.preparation_time || 0, 240, 'Tempo de preparo')
    .result();
};

// URL validation
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// CNPJ validation (simplified)
export const isValidCNPJ = (cnpj: string): boolean => {
  const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
  return cleanCNPJ.length === 14 && /^\d{14}$/.test(cleanCNPJ);
};

// Business hours validation
export const validateBusinessHours = (hours: Record<string, { isOpen: boolean; openTime: string; closeTime: string }>): ValidationResult => {
  const validator = validate();
  
  Object.entries(hours).forEach(([day, schedule]) => {
    if (schedule.isOpen) {
      validator
        .required(schedule.openTime, `Horário de abertura - ${day}`)
        .required(schedule.closeTime, `Horário de fechamento - ${day}`)
        .custom(
          schedule.openTime < schedule.closeTime,
          `Horário de abertura deve ser anterior ao fechamento - ${day}`
        );
    }
  });
  
  return validator.result();
};