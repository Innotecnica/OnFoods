// Input validation utilities for enhanced security

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254; // RFC 5321 limit
};

export const validateUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

export const validatePassword = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (password.length < 12) {
    errors.push('Senha deve ter pelo menos 12 caracteres');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra maiúscula');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra minúscula');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Senha deve conter pelo menos um número');
  }
  
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Senha deve conter pelo menos um caractere especial');
  }
  
  // Check for common patterns
  const commonPatterns = ['password', '123456', 'qwerty', 'abc123', 'admin', 'user', 'guest'];
  if (commonPatterns.some(pattern => password.toLowerCase().includes(pattern))) {
    errors.push('Senha não deve conter padrões comuns');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const sanitizeString = (input: string, maxLength: number = 1000): string => {
  if (!input) return '';
  
  // Enhanced XSS prevention patterns
  const sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/expression\s*\(/gi, '')
    .trim();
  
  return sanitized.slice(0, maxLength);
};

// Additional validation functions for enhanced security
export const validateAmount = (amount: string | number): boolean => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return !isNaN(numAmount) && numAmount >= 0 && numAmount <= 999999.99;
};

export const validateTextInput = (
  text: string, 
  minLength: number = 0, 
  maxLength: number = 1000,
  allowEmpty: boolean = true
): { isValid: boolean; error?: string } => {
  if (!allowEmpty && (!text || text.trim().length === 0)) {
    return { isValid: false, error: 'Campo obrigatório' };
  }
  
  if (text && text.length < minLength) {
    return { isValid: false, error: `Mínimo de ${minLength} caracteres` };
  }
  
  if (text && text.length > maxLength) {
    return { isValid: false, error: `Máximo de ${maxLength} caracteres` };
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /on\w+\s*=/i,
    /expression\s*\(/i
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(text)) {
      return { isValid: false, error: 'Entrada contém caracteres inválidos' };
    }
  }
  
  return { isValid: true };
};

// Client-side rate limiting helper
export const checkClientRateLimit = (key: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean => {
  const now = Date.now();
  const attempts = JSON.parse(localStorage.getItem(`rate_limit_${key}`) || '[]');
  
  // Filter attempts within window
  const recentAttempts = attempts.filter((timestamp: number) => now - timestamp < windowMs);
  
  if (recentAttempts.length >= maxAttempts) {
    return false;
  }
  
  // Add current attempt
  recentAttempts.push(now);
  localStorage.setItem(`rate_limit_${key}`, JSON.stringify(recentAttempts));
  
  return true;
};

export const validatePhoneNumber = (phone: string): boolean => {
  // Brazilian phone number validation
  const phoneRegex = /^(?:\+55\s?)?(?:\(?\d{2}\)?\s?)(?:9?\d{4}-?\d{4})$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

export const validateCNPJ = (cnpj: string): boolean => {
  const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
  
  if (cleanCNPJ.length !== 14) return false;
  
  // Check for known invalid CNPJs
  if (/^(\d)\1+$/.test(cleanCNPJ)) return false;
  
  // CNPJ validation algorithm
  let sum = 0;
  let weight = 2;
  
  for (let i = 11; i >= 0; i--) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  
  const digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  
  sum = 0;
  weight = 2;
  
  for (let i = 12; i >= 0; i--) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  
  const digit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  
  return digit1 === parseInt(cleanCNPJ.charAt(12)) && digit2 === parseInt(cleanCNPJ.charAt(13));
};

export const validateCPF = (cpf: string): boolean => {
  const cleanCPF = cpf.replace(/[^\d]/g, '');
  
  if (cleanCPF.length !== 11) return false;
  
  // Check for known invalid CPFs
  if (/^(\d)\1+$/.test(cleanCPF)) return false;
  
  // CPF validation algorithm
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  
  let digit1 = 11 - (sum % 11);
  if (digit1 === 10 || digit1 === 11) digit1 = 0;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  
  let digit2 = 11 - (sum % 11);
  if (digit2 === 10 || digit2 === 11) digit2 = 0;
  
  return digit1 === parseInt(cleanCPF.charAt(9)) && digit2 === parseInt(cleanCPF.charAt(10));
};