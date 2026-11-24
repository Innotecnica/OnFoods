import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from '@/hooks/use-toast';

export interface LocationData {
  city: string;
  state: string;
  source: 'gps' | 'profile' | 'manual';
}

export function useLocationFilter() {
  const { isAuthenticated } = useAuth();
  const { profile } = useUserProfile();
  const { location: gpsLocation, requestLocation, isLoading: gpsLoading } = useGeolocation();
  const { t } = useTranslation();
  
  const [isGpsEnabled, setIsGpsEnabled] = useState(false);
  const [manualState, setManualState] = useState('');
  const [manualCity, setManualCity] = useState('');

  // Determine active location based on priority
  const activeLocation = useMemo((): LocationData | null => {
    // Priority 1: GPS when enabled
    if (isGpsEnabled && gpsLocation?.city && gpsLocation?.state) {
      return {
        city: gpsLocation.city,
        state: gpsLocation.state,
        source: 'gps'
      };
    }

    // Priority 2: Manual selection
    if (manualState && manualCity) {
      return {
        city: manualCity,
        state: manualState,
        source: 'manual'
      };
    }

    // Priority 3: Profile (for authenticated users)
    if (isAuthenticated && profile?.city && profile?.state) {
      return {
        city: profile.city,
        state: profile.state,
        source: 'profile'
      };
    }

    return null;
  }, [isGpsEnabled, gpsLocation, manualState, manualCity, isAuthenticated, profile]);

  // Auto-load profile location on mount for authenticated users - prevent loops
  useEffect(() => {
    if (isAuthenticated && profile?.city && profile?.state && !manualState && !manualCity && !isGpsEnabled) {
      console.log('🏠 Auto-loading profile location:', { city: profile.city, state: profile.state });
      setManualState(profile.state);
      setManualCity(profile.city);
      
      // Show toast only once per session
      const hasShownProfileToast = sessionStorage.getItem('profileLocationLoaded');
      if (!hasShownProfileToast) {
        toast({
          title: t('common:location_loaded_title'),
          description: t('common:location_loaded_desc_profile', { city: profile.city, state: profile.state }),
          duration: 3000,
        });
        sessionStorage.setItem('profileLocationLoaded', 'true');
      }
    }
  }, [isAuthenticated, profile?.city, profile?.state, manualCity, manualState, isGpsEnabled, t]);

  // Handle GPS toggle
  const toggleGps = (enabled: boolean) => {
    setIsGpsEnabled(enabled);
    
    if (enabled) {
      // Clear manual selection when GPS is enabled
      setManualState('');
      setManualCity('');
      requestLocation();
      
      toast({
        title: t('common:gps_activating_title'),
        description: t('common:gps_collecting_desc'),
      });
    } else {
      // Restore profile location if available
      if (isAuthenticated && profile?.city && profile?.state) {
        setManualState(profile.state);
        setManualCity(profile.city);
        
        toast({
          title: t('common:gps_disabled_title'),
          description: t('common:gps_disabled_desc_profile', { city: profile.city, state: profile.state }),
        });
      }
    }
  };

  // Handle manual state selection
  const setSelectedState = (state: string) => {
    setManualState(state);
    if (state !== manualState) {
      setManualCity(''); // Clear city when state changes
    }
    if (state) {
      setIsGpsEnabled(false); // Disable GPS on manual selection
    }
  };

  // Handle manual city selection
  const setSelectedCity = (city: string) => {
    setManualCity(city);
    if (city) {
      setIsGpsEnabled(false); // Disable GPS on manual selection
    }
  };

  // Check if location is required
  const isLocationRequired = !activeLocation;

  // Get location for API calls
  const getLocationForApi = () => {
    if (!activeLocation) return {};
    return {
      city: activeLocation.city,
      state: activeLocation.state
    };
  };

  return {
    // Current active location
    activeLocation,
    
    // GPS state
    isGpsEnabled,
    isGpsLoading: gpsLoading,
    toggleGps,
    
    // Manual selection state
    manualState,
    manualCity,
    setSelectedState,
    setSelectedCity,
    
    // Profile location for reference
    profileLocation: profile?.city && profile?.state ? { city: profile.city, state: profile.state } : null,
    
    // Utilities
    isLocationRequired,
    getLocationForApi,
    isAuthenticated,
  };
}
