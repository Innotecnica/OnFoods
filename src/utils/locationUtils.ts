import { getStateCodeFromName, BRAZILIAN_STATES } from "./brazilianStates";
import i18n from "@/i18n";

export interface LocationResult {
  city: string;
  state: string;
  formatted: string;
  confidence?: number;
  country?: string;
}

export interface GeocodeCache {
  [key: string]: {
    result: LocationResult | null;
    timestamp: number;
  };
}

// Cache for geocoding results (5 minutes TTL)
const geocodeCache: GeocodeCache = {};
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Valida se uma string representa um estado brasileiro válido
 */
export function isValidBrazilianState(state: string): boolean {
  if (!state?.trim()) return false;
  const normalizedState = state.trim().toUpperCase();
  return BRAZILIAN_STATES.some(s => s.code === normalizedState || s.name.toUpperCase() === normalizedState);
}

/**
 * Valida se uma string representa uma cidade válida (básico)
 */
export function isValidCityName(city: string): boolean {
  if (!city?.trim()) return false;
  
  // Verificações básicas para nome de cidade
  const normalizedCity = city.trim();
  
  // Deve ter pelo menos 2 caracteres
  if (normalizedCity.length < 2) return false;
  
  // Não deve conter apenas números
  if (/^\d+$/.test(normalizedCity)) return false;
  
  // Deve conter apenas letras, espaços, hífens e acentos
  if (!/^[a-zA-ZÀ-ÿ\s\-']+$/.test(normalizedCity)) return false;
  
  return true;
}

/**
 * Converte uma string de localização para cidade e estado válidos com validação
 */
export function parseLocationString(locationString: string): LocationResult | null {
  if (!locationString?.trim()) return null;

  const normalized = locationString.trim();
  
  // Se contém vírgula, assume formato "Cidade, Estado"
  if (normalized.includes(',')) {
    const parts = normalized.split(',').map(part => part.trim());
    if (parts.length >= 2) {
      const city = parts[0];
      const state = parts[1];
      
      // Validações
      if (!isValidCityName(city)) {
        console.warn('Invalid city name:', city);
        return null;
      }
      
      const stateCode = getStateCodeFromName(state) || state;
      return {
        city,
        state: stateCode,
        formatted: `${city}, ${stateCode}`,
        confidence: 0.9
      };
    }
  }
  
  // Se não tem vírgula, assume que é só a cidade
  if (isValidCityName(normalized)) {
    return {
      city: normalized,
      state: '',
      formatted: normalized,
      confidence: 0.5
    };
  }
  
  return null;
}

/**
 * Valida se uma localização tem cidade e estado válidos
 */
export function isValidLocation(location: LocationResult): boolean {
  return !!(
    location.city &&
    location.state &&
    isValidCityName(location.city)
  );
}

/**
 * Limpa o cache de geocoding expirado
 */
function cleanGeocodeCache(): void {
  const now = Date.now();
  Object.keys(geocodeCache).forEach(key => {
    if (now - geocodeCache[key].timestamp > CACHE_TTL) {
      delete geocodeCache[key];
    }
  });
}

/**
 * Converte coordenadas GPS para endereço formatado com cache
 */
export async function coordsToLocation(
  latitude: number, 
  longitude: number,
  options: { useCache?: boolean; timeout?: number } = {}
): Promise<LocationResult | null> {
  const { useCache = true, timeout = 10000 } = options;
  
  // Validação básica das coordenadas
  if (!latitude || !longitude || 
      latitude < -90 || latitude > 90 || 
      longitude < -180 || longitude > 180) {
    console.warn('Invalid coordinates:', { latitude, longitude });
    return null;
  }
  
  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  
  // Verificar cache se habilitado
  if (useCache && geocodeCache[cacheKey]) {
    const cached = geocodeCache[cacheKey];
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('🎯 Geocoding cache hit:', cacheKey);
      return cached.result;
    }
  }
  
  try {
    console.log('🌍 Geocoding coordinates:', { latitude, longitude });
    
    // Controller para timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const locale = i18n.language === 'es' ? 'es' : i18n.language === 'en' ? 'en' : 'pt';
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=${locale}`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📍 Raw geocoding data:', data);
    
    const city = data.city || data.locality || '';
    const stateName = data.principalSubdivision || '';
    const stateCode = getStateCodeFromName(stateName) || stateName;
    const country = data.countryName || '';
    
    let result: LocationResult | null = null;
    
    if (city && stateCode && isValidCityName(city)) {
      result = {
        city,
        state: stateCode,
        formatted: `${city}, ${stateCode}`,
        confidence: 0.8,
        country
      };
      console.log('✅ Geocoding success:', result);
    } else {
      console.warn('⚠️ Invalid geocoding result:', { city, stateName, stateCode });
    }
    
    // Cache do resultado (mesmo que seja null)
    if (useCache) {
      cleanGeocodeCache(); // Limpar cache expirado
      geocodeCache[cacheKey] = {
        result,
        timestamp: Date.now()
      };
    }
    
    return result;
  } catch (error) {
    console.error('❌ Geocoding error:', error);
    
    // Cache do erro por um tempo menor
    if (useCache) {
      geocodeCache[cacheKey] = {
        result: null,
        timestamp: Date.now()
      };
    }
    
    return null;
  }
}

/**
 * Auto-completa localização usando GPS se disponível com validação
 */
export function getLocationWithGPS(manualLocation: string, gpsLocation: any): string {
  // Se há localização manual válida, usa ela
  if (manualLocation?.trim()) {
    const parsed = parseLocationString(manualLocation);
    if (parsed && isValidLocation(parsed)) {
      return manualLocation;
    }
  }
  
  // Se não há manual mas tem GPS válido, usa o GPS
  if (gpsLocation?.city && gpsLocation?.state) {
    if (isValidCityName(gpsLocation.city) && isValidBrazilianState(gpsLocation.state)) {
      return `${gpsLocation.city}, ${gpsLocation.state}`;
    }
  }
  
  return '';
}

/**
 * Obtém estatísticas do cache de geocoding
 */
export function getGeocachingStats(): { entries: number; hitRate: number } {
  cleanGeocodeCache();
  return {
    entries: Object.keys(geocodeCache).length,
    hitRate: 0 // TODO: implementar contadores de hit/miss
  };
}

/**
 * Limpa completamente o cache de geocoding
 */
export function clearGeocodeCache(): void {
  Object.keys(geocodeCache).forEach(key => delete geocodeCache[key]);
  console.log('🧹 Geocoding cache cleared');
}
