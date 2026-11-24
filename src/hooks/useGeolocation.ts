import { useState, useEffect } from 'react';
import i18n from '@/i18n';
import { toast } from '@/hooks/use-toast';
import { getStateCodeFromName } from '@/utils/brazilianStates';
import { coordsToLocation } from '@/utils/locationUtils';
import { supabase } from '@/integrations/supabase/client';

export interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  country: string;
  address?: string;
}

export interface GeolocationState {
  location: LocationData | null;
  isLoading: boolean;
  error: string | null;
  hasPermission: boolean | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    isLoading: false,
    error: null,
    hasPermission: null,
  });

  const reverseGeocode = async (latitude: number, longitude: number): Promise<{ city: string; state: string; country: string; address?: string }> => {
    try {
      console.log('🌍 Starting enhanced reverse geocoding for coordinates:', { latitude, longitude });
      
      // Use enhanced Supabase edge function with error handling
      const { data, error } = await supabase.functions.invoke('reverse-geocode', {
        body: { 
          latitude, 
          longitude, 
          precision: 'high',
          useCache: true 
        }
      }).catch(err => {
        console.warn('⚠️ Reverse geocode function failed, using fallback:', err);
        return { data: null, error: err };
      });
      
      if (error) {
        console.error('❌ Supabase geocoding error:', error);
        throw error;
      }
      
      if (data?.success && data?.data) {
        console.log('✅ Enhanced geocoding success:', {
          location: data.data,
          provider: data.data.provider,
          confidence: data.data.confidence,
          accuracy: data.data.accuracy,
          cached: data.cached,
          responseTime: data.responseTime
        });
        
        return {
          city: data.data.city,
          state: data.data.state,
          country: data.data.country,
          address: data.data.address || `${data.data.city}, ${data.data.state}`
        };
      }
      
      throw new Error(data?.error || 'Enhanced geocoding failed');
    } catch (error) {
      console.error('❌ Enhanced geocoding error:', error);
      const fallbackLocation = await coordsToLocation(latitude, longitude, { useCache: true });
      if (fallbackLocation?.city && fallbackLocation?.state) {
        return {
          city: fallbackLocation.city,
          state: fallbackLocation.state,
          country: fallbackLocation.country || 'Unknown',
          address: fallbackLocation.formatted
        };
      }
      const fallbackData = getBrazilianLocationFallback(latitude, longitude);
      return fallbackData;
    }
  };

  // Cache helpers
  const getCachedLocation = (): LocationData | null => {
    try {
      const raw = localStorage.getItem('cached_location');
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number' && data.city && data.state) {
        return data as LocationData;
      }
      return null;
    } catch {
      return null;
    }
  };

  const saveCachedLocation = (loc: LocationData) => {
    try { localStorage.setItem('cached_location', JSON.stringify(loc)); } catch { /* ignore */ }
  };

  // Permissions API (best-effort; Safari iOS does not support for geolocation)
  useEffect(() => {
    if ('permissions' in navigator && typeof (navigator as any).permissions?.query === 'function') {
      try {
        (navigator as any).permissions.query({ name: 'geolocation' }).then((status: any) => {
          const st = status.state as 'granted' | 'denied' | 'prompt';
          setState(prev => ({ ...prev, hasPermission: st === 'granted' ? true : st === 'denied' ? false : null }));
          status.onchange = () => {
            const next = status.state as 'granted' | 'denied' | 'prompt';
            setState(prev => ({ ...prev, hasPermission: next === 'granted' ? true : next === 'denied' ? false : null }));
          };
        }).catch(() => void 0);
      } catch { /* ignore */ }
    }
  }, []);

  // Fallback inteligente para coordenadas brasileiras
  const getBrazilianLocationFallback = (lat: number, lon: number) => {
    // Regiões aproximadas do Brasil
    const regions = [
      { name: 'São Paulo', state: 'SP', bounds: { minLat: -24.5, maxLat: -23.0, minLon: -47.0, maxLon: -46.0 }},
      { name: 'Rio de Janeiro', state: 'RJ', bounds: { minLat: -23.2, maxLat: -22.7, minLon: -43.8, maxLon: -43.0 }},
      { name: 'Belo Horizonte', state: 'MG', bounds: { minLat: -20.1, maxLat: -19.7, minLon: -44.1, maxLon: -43.8 }},
      { name: 'Brasília', state: 'DF', bounds: { minLat: -16.1, maxLat: -15.4, minLon: -48.2, maxLon: -47.2 }},
      { name: 'Salvador', state: 'BA', bounds: { minLat: -13.2, maxLat: -12.7, minLon: -38.8, maxLon: -38.3 }},
      { name: 'Fortaleza', state: 'CE', bounds: { minLat: -4.0, maxLat: -3.6, minLon: -38.8, maxLon: -38.4 }},
      { name: 'Recife', state: 'PE', bounds: { minLat: -8.3, maxLat: -7.9, minLon: -35.1, maxLon: -34.7 }},
      { name: 'Porto Alegre', state: 'RS', bounds: { minLat: -30.3, maxLat: -29.9, minLon: -51.5, maxLon: -51.0 }},
      { name: 'Curitiba', state: 'PR', bounds: { minLat: -25.7, maxLat: -25.3, minLon: -49.5, maxLon: -49.1 }}
    ];
    
    // Tenta encontrar a região mais próxima
    for (const region of regions) {
      if (lat >= region.bounds.minLat && lat <= region.bounds.maxLat &&
          lon >= region.bounds.minLon && lon <= region.bounds.maxLon) {
        return {
          city: region.name,
          state: region.state,
          country: 'Brasil',
          address: `${region.name}, ${region.state}, Brasil`
        };
      }
    }
    
    // Fallback geral para o Brasil
    return {
      city: 'São Paulo',
      state: 'SP',
      country: 'Brasil',
      address: 'São Paulo, SP, Brasil'
    };
  };

  const requestLocation = async () => {
    const isSecure = typeof window !== 'undefined' ? window.isSecureContext : false;

    if (!isSecure) {
      const cached = getCachedLocation();
      if (cached) {
        setState({ location: cached, isLoading: false, error: null, hasPermission: null });
        toast({
          title: i18n.t('common:gps_disabled_title', { defaultValue: '🏠 GPS desativado' }),
          description: i18n.t('common:using_profile_location_tip', { defaultValue: 'Usando localização do seu perfil automaticamente' }),
        });
        return;
      }
      setState(prev => ({ ...prev, error: 'Contexto não seguro: use HTTPS ou localhost', hasPermission: false }));
      toast({
        title: i18n.t('common:requesting_location_title', { defaultValue: '🔍 Solicitando localização' }),
        description: i18n.t('common:requesting_location_desc', { defaultValue: "Clique em 'Permitir' quando o navegador solicitar acesso à localização." }),
        variant: 'destructive',
      });
    }

    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, error: 'Geolocalização não é suportada neste navegador', hasPermission: false }));
      toast({
        title: i18n.t('common:gps_disabled_title', { defaultValue: '🏠 GPS desativado' }),
        description: i18n.t('common:inline_auth_instruction', { defaultValue: 'Ative o GPS ou selecione estado e cidade manualmente' }),
        variant: 'destructive',
      });
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    toast({
      title: i18n.t('common:gps_activating_title', { defaultValue: '📍 Ativando GPS' }),
      description: i18n.t('common:gps_collecting_desc', { defaultValue: 'Coletando sua localização...' }),
    });

    const highAccuracyOpts: PositionOptions = { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 };
    const lowAccuracyOpts: PositionOptions = { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 };

    const onSuccess = async (position: GeolocationPosition) => {
      try {
        const { latitude, longitude } = position.coords;
        const geocodeData = await reverseGeocode(latitude, longitude);
        const stateCode = getStateCodeFromName(geocodeData.state) || geocodeData.state;

        const locationData: LocationData = { latitude, longitude, ...geocodeData, state: stateCode };

        saveCachedLocation(locationData);

        setState({ location: locationData, isLoading: false, error: null, hasPermission: true });
        toast({
          title: i18n.t('common:location_loaded_title', { defaultValue: '📍 Localização carregada' }),
          description: i18n.t('common:location_loaded_desc_profile', { city: geocodeData.city, state: stateCode, defaultValue: `Usando ${geocodeData.city}, ${stateCode} do seu perfil` }),
        });
      } catch (error) {
        console.error('❌ Error processing location:', error);
        setState(prev => ({ ...prev, isLoading: false, error: 'Erro ao processar localização' }));
      }
    };

    const onError = (error: GeolocationPositionError) => {
      let msg = 'Erro ao obter localização';
      switch (error.code) {
        case error.PERMISSION_DENIED: msg = 'Permissão de localização negada'; break;
        case error.POSITION_UNAVAILABLE: msg = 'Localização indisponível'; break;
        case error.TIMEOUT: msg = 'Tempo limite para obter localização'; break;
      }

      // Retry low accuracy once, then short watchPosition
      if (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE) {
        navigator.geolocation.getCurrentPosition(onSuccess, () => {
          const watchId = navigator.geolocation.watchPosition(onSuccess, () => {
            const cached = getCachedLocation();
            if (cached) {
              setState({ location: cached, isLoading: false, error: null, hasPermission: true });
              toast({ title: i18n.t('common:location_loaded_title'), description: i18n.t('common:using_profile_location_tip') });
            } else {
              setState(prev => ({ ...prev, isLoading: false, error: msg, hasPermission: false }));
              toast({ title: i18n.t('common:gps_searching_title', { defaultValue: '🔍 Buscando localização GPS' }), description: msg, variant: 'destructive' });
            }
          }, lowAccuracyOpts);
          setTimeout(() => navigator.geolocation.clearWatch(watchId), 10000);
        }, lowAccuracyOpts);
        return;
      }

      setState(prev => ({ ...prev, isLoading: false, error: msg, hasPermission: error.code !== error.PERMISSION_DENIED ? null : false }));
      toast({ title: i18n.t('common:gps_disabled_title', { defaultValue: '🏠 GPS desativado' }), description: msg, variant: 'destructive' });
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError, highAccuracyOpts);
  };

  const clearLocation = () => {
    setState({
      location: null,
      isLoading: false,
      error: null,
      hasPermission: null,
    });
  };

  return {
    ...state,
    requestLocation,
    clearLocation,
  };
}
