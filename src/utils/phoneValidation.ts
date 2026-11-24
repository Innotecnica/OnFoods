/**
 * Utilitários para validação e formatação de números de telefone
 */

export interface PhoneValidationResult {
  isValid: boolean;
  formatted: string;
  international: string;
  national: string;
  error?: string;
}

/**
 * Valida e formata número de telefone brasileiro
 */
export function validateAndFormatPhone(phone: string, countryCode: string = 'BR'): PhoneValidationResult {
  if (!phone || typeof phone !== 'string') {
    return {
      isValid: false,
      formatted: '',
      international: '',
      national: '',
      error: 'Número de telefone é obrigatório'
    };
  }

  // Remove todos os caracteres não numéricos
  const cleaned = phone.replace(/\D/g, '');

  // Validação para números brasileiros
  if (countryCode === 'BR') {
    return validateBrazilianPhone(cleaned);
  }

  // Validação genérica para outros países
  return validateInternationalPhone(cleaned, countryCode);
}

/**
 * Valida número de telefone brasileiro
 */
function validateBrazilianPhone(cleaned: string): PhoneValidationResult {
  let phoneNumber = cleaned;

  // Remove código do país (55) se presente
  if (phoneNumber.startsWith('55')) {
    phoneNumber = phoneNumber.substring(2);
  }

  // Adiciona 9 no celular se estiver faltando
  if (phoneNumber.length === 10 && ['2', '3', '4', '5'].includes(phoneNumber[2])) {
    // Telefone fixo (2x) xxxx-xxxx - OK
  } else if (phoneNumber.length === 10 && ['6', '7', '8', '9'].includes(phoneNumber[2])) {
    // Celular sem o 9: (xx) xxxx-xxxx -> (xx) 9xxxx-xxxx
    phoneNumber = phoneNumber.substring(0, 2) + '9' + phoneNumber.substring(2);
  } else if (phoneNumber.length === 11 && phoneNumber[2] === '9') {
    // Celular com 9: (xx) 9xxxx-xxxx - OK
  } else {
    return {
      isValid: false,
      formatted: '',
      international: '',
      national: '',
      error: 'Formato de telefone brasileiro inválido. Use (xx) xxxx-xxxx ou (xx) 9xxxx-xxxx'
    };
  }

  // Validar DDD
  const ddd = phoneNumber.substring(0, 2);
  const validDDDs = [
    '11', '12', '13', '14', '15', '16', '17', '18', '19', // SP
    '21', '22', '24', // RJ
    '27', '28', // ES
    '31', '32', '33', '34', '35', '37', '38', // MG
    '41', '42', '43', '44', '45', '46', // PR
    '47', '48', '49', // SC
    '51', '53', '54', '55', // RS
    '61', // DF
    '62', '64', // GO
    '63', // TO
    '65', '66', // MT
    '67', // MS
    '68', // AC
    '69', // RO
    '71', '73', '74', '75', '77', // BA
    '79', // SE
    '81', '87', // PE
    '82', // AL
    '83', // PB
    '84', // RN
    '85', '88', // CE
    '86', '89', // PI
    '91', '93', '94', // PA
    '92', '97', // AM
    '95', // RR
    '96', // AP
    '98', '99', // MA
  ];

  if (!validDDDs.includes(ddd)) {
    return {
      isValid: false,
      formatted: '',
      international: '',
      national: '',
      error: `DDD ${ddd} não é válido para Brasil`
    };
  }

  // Formato final
  const formatted = `(${ddd}) ${phoneNumber.substring(2, phoneNumber.length - 4)}-${phoneNumber.substring(phoneNumber.length - 4)}`;
  const international = `+55${phoneNumber}`;
  const national = phoneNumber;

  return {
    isValid: true,
    formatted,
    international,
    national,
    error: undefined
  };
}

/**
 * Valida número internacional (genérico)
 */
function validateInternationalPhone(cleaned: string, countryCode: string): PhoneValidationResult {
  // Códigos de país comuns
  const countryCodes: Record<string, { code: string; minLength: number; maxLength: number }> = {
    'US': { code: '1', minLength: 10, maxLength: 10 },
    'BR': { code: '55', minLength: 10, maxLength: 11 },
    'AR': { code: '54', minLength: 10, maxLength: 11 },
    'MX': { code: '52', minLength: 10, maxLength: 12 },
    'CL': { code: '56', minLength: 8, maxLength: 9 },
    'CO': { code: '57', minLength: 10, maxLength: 10 },
    'PE': { code: '51', minLength: 9, maxLength: 9 },
  };

  const country = countryCodes[countryCode.toUpperCase()];
  if (!country) {
    return {
      isValid: false,
      formatted: cleaned,
      international: cleaned,
      national: cleaned,
      error: `Código de país ${countryCode} não suportado`
    };
  }

  let phoneNumber = cleaned;

  // Remove código do país se presente
  if (phoneNumber.startsWith(country.code)) {
    phoneNumber = phoneNumber.substring(country.code.length);
  }

  // Validar comprimento
  if (phoneNumber.length < country.minLength || phoneNumber.length > country.maxLength) {
    return {
      isValid: false,
      formatted: '',
      international: '',
      national: '',
      error: `Número deve ter entre ${country.minLength} e ${country.maxLength} dígitos para ${countryCode}`
    };
  }

  const international = `+${country.code}${phoneNumber}`;
  const formatted = phoneNumber;
  const national = phoneNumber;

  return {
    isValid: true,
    formatted,
    international,
    national,
    error: undefined
  };
}

/**
 * Formata número para WhatsApp (sem + e espaços)
 */
export function formatPhoneForWhatsApp(phone: string, countryCode: string = 'BR'): string {
  const validation = validateAndFormatPhone(phone, countryCode);
  
  if (!validation.isValid) {
    throw new Error(validation.error || 'Número de telefone inválido');
  }

  // Remove todos os caracteres especiais, mantém apenas números
  return validation.international.replace(/\D/g, '');
}

/**
 * Extrai DDD de número brasileiro
 */
export function extractDDD(phone: string): string | null {
  const cleaned = phone.replace(/\D/g, '');
  
  // Remove código do país se presente
  let phoneNumber = cleaned;
  if (phoneNumber.startsWith('55')) {
    phoneNumber = phoneNumber.substring(2);
  }

  if (phoneNumber.length >= 10) {
    return phoneNumber.substring(0, 2);
  }

  return null;
}

/**
 * Verifica se é número de celular (tem 9 no terceiro dígito)
 */
export function isMobileNumber(phone: string): boolean {
  const validation = validateAndFormatPhone(phone);
  
  if (!validation.isValid) {
    return false;
  }

  const cleaned = validation.national;
  return cleaned.length === 11 && cleaned[2] === '9';
}

/**
 * Sanitiza número para armazenamento seguro
 */
export function sanitizePhoneForStorage(phone: string, countryCode: string = 'BR'): string {
  const validation = validateAndFormatPhone(phone, countryCode);
  
  if (!validation.isValid) {
    return '';
  }

  return validation.international;
}