import i18n from '@/i18n'
import { COUNTRY_STATES } from '@/utils/brazilianStates'

const getLocale = (): string => {
  const lang = i18n.language
  if (lang === 'pt') return 'pt-BR'
  if (lang === 'es') return 'es-ES'
  return 'en-US'
}

export { getLocale }

const COUNTRY_LOCALE: Record<string, string> = {
  BR: 'pt-BR',
  AR: 'es-AR',
  PY: 'es-PY',
  UY: 'es-UY',
  CO: 'es-CO',
  BO: 'es-BO',
  CL: 'es-CL',
  PE: 'es-PE',
}

const COUNTRY_CURRENCY: Record<string, string> = {
  BR: 'BRL',
  AR: 'ARS',
  PY: 'PYG',
  UY: 'UYU',
  CO: 'COP',
  BO: 'BOB',
  CL: 'CLP',
  PE: 'PEN',
}

export const inferCountryFromState = (state: string | undefined | null): string => {
  if (!state) return 'BR'
  const normalized = state.toLowerCase().trim()
  for (const [code, states] of Object.entries(COUNTRY_STATES)) {
    if (states.some(s => s.code.toLowerCase() === normalized || s.name.toLowerCase() === normalized)) {
      return code
    }
  }
  return 'BR'
}

// Currency formatting
export const formatCurrency = (value: number, currency = 'BRL'): string => {
  return new Intl.NumberFormat(getLocale(), {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatCurrencyByCountry = (value: number, countryCode?: string): string => {
  const code = countryCode && COUNTRY_LOCALE[countryCode] ? countryCode : 'BR'
  const locale = COUNTRY_LOCALE[code] || getLocale()
  const currency = COUNTRY_CURRENCY[code] || 'BRL'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

// Number formatting  
export const formatNumber = (value: number, decimals = 0): string => {
  return new Intl.NumberFormat(getLocale(), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const formatNumberByCountry = (value: number, decimals = 0, countryCode?: string): string => {
  const code = countryCode && COUNTRY_LOCALE[countryCode] ? countryCode : 'BR'
  const locale = COUNTRY_LOCALE[code] || getLocale()
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

// Percentage formatting
export const formatPercentage = (value: number, decimals = 1): string => {
  return new Intl.NumberFormat(getLocale(), {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
};

// Phone formatting
export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  
  return phone;
};

// CNPJ formatting
export const formatCNPJ = (cnpj: string): string => {
  const cleaned = cnpj.replace(/\D/g, '');
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

// Date formatting
export const formatDate = (date: string | Date, format: 'short' | 'long' | 'time' | 'datetime' = 'short'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  switch (format) {
    case 'short':
      return dateObj.toLocaleDateString(getLocale());
    case 'long':
      return dateObj.toLocaleDateString(getLocale(), {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    case 'time':
      return dateObj.toLocaleTimeString(getLocale(), {
        hour: '2-digit',
        minute: '2-digit',
      });
    case 'datetime':
      return `${formatDate(dateObj, 'short')} ${formatDate(dateObj, 'time')}`;
    default:
      return dateObj.toLocaleDateString(getLocale());
  }
};

// Relative time formatting
export const formatRelativeTime = (date: string | Date): string => {
  const now = new Date();
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'agora mesmo';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `há ${minutes} minuto${minutes > 1 ? 's' : ''}`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `há ${hours} hora${hours > 1 ? 's' : ''}`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `há ${days} dia${days > 1 ? 's' : ''}`;
  } else {
    return formatDate(dateObj, 'short');
  }
};

// Text formatting
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength).trim()}...`;
};

export const capitalizeFirstLetter = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

export const capitalizeWords = (text: string): string => {
  return text
    .split(' ')
    .map(word => capitalizeFirstLetter(word))
    .join(' ');
};

// URL formatting
export const createSlug = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
};

// Business status formatting
export const formatBusinessStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'pending': 'Pendente',
    'active': 'Ativo',
    'inactive': 'Inativo',
    'suspended': 'Suspenso',
    'cancelled': 'Cancelado',
  };
  
  return statusMap[status] || capitalizeFirstLetter(status);
};

// Order status formatting
export const formatOrderStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'pending': 'Pendente',
    'confirmed': 'Confirmado',
    'preparing': 'Preparando',
    'ready': 'Pronto',
    'out_for_delivery': 'Saiu para entrega',
    'delivered': 'Entregue',
    'cancelled': 'Cancelado',
  };
  
  return statusMap[status] || capitalizeFirstLetter(status);
};

// File size formatting
export const formatFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const formattedSize = (bytes / Math.pow(1024, i)).toFixed(1);
  
  return `${formattedSize} ${sizes[i]}`;
};

// Duration formatting
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${remainingMinutes}min`;
    }
  }
};

// Distance formatting
export const formatDistance = (distanceInKm: number): string => {
  if (distanceInKm < 1) {
    return `${Math.round(distanceInKm * 1000)}m`;
  } else {
    return `${distanceInKm.toFixed(1)}km`;
  }
};
