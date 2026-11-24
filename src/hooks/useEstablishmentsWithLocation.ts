
import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useEstablishmentSearch, EstablishmentSearchFilters } from "./useEstablishmentSearch";
import { useGeolocation, LocationData } from "./useGeolocation";
import { supabase } from "@/integrations/supabase/client";

interface UserAddress {
  id: string;
  city: string;
  state: string;
  is_default: boolean;
}

export function useEstablishmentsWithLocation(gpsLocation?: LocationData | null) {
  const { isAuthenticated, user } = useAuth();
  const { establishments, isLoading, error, searchEstablishments } = useEstablishmentSearch();
  
  const [userAddress, setUserAddress] = useState<UserAddress | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(false);

  // Load user's default address if authenticated
  const loadUserAddress = useCallback(async () => {
    try {
      setLoadingAddress(true);
      const { data, error } = await supabase
        .from('addresses')
        .select('id, city, state, is_default')
        .eq('user_id', user?.id)
        .eq('is_default', true)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading user address:', error);
        return;
      }

      if (data) {
        console.log('📍 User default address loaded:', data);
        setUserAddress(data);
      }
    } catch (err) {
      console.error('Error loading user address:', err);
    } finally {
      setLoadingAddress(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserAddress();
    }
  }, [isAuthenticated, user, loadUserAddress]);

  // Memoize the current location to prefer GPS over user address
  const currentLocation = useMemo(() => {
    // Priorizar GPS quando disponível
    if (gpsLocation) {
      console.log('📍 Using GPS location:', gpsLocation);
      return {
        city: gpsLocation.city,
        state: gpsLocation.state, // Já convertido para código
        source: 'gps' as const
      };
    }

    console.log('📍 No GPS location available');
    return null;
  }, [gpsLocation]);

  // Enhanced search function that considers location
  const searchEstablishmentsWithLocation = useCallback((filters: Omit<EstablishmentSearchFilters, 'city' | 'state'> = {}) => {
    const searchFilters: EstablishmentSearchFilters = {
      ...filters,
      ...(currentLocation && {
        city: currentLocation.city,
        state: currentLocation.state
      })
    };

    console.log('🔍 Searching establishments with location filters:', {
      filters: searchFilters,
      locationSource: currentLocation?.source || 'none'
    });

    return searchEstablishments(searchFilters);
  }, [currentLocation, searchEstablishments]);

  // Search without location (show all)
  const searchEstablishmentsGlobal = useCallback((filters: Omit<EstablishmentSearchFilters, 'city' | 'state'> = {}) => {
    console.log('🌍 Searching establishments globally (no location filter)');
    return searchEstablishments(filters);
  }, [searchEstablishments]);

  return {
    // Establishment data
    establishments,
    isLoading,
    error,
    
    // Location data
    userAddress,
    loadingAddress,
    currentLocation,
    
    // Search functions
    searchEstablishmentsWithLocation,
    searchEstablishmentsGlobal,
    
    // Status flags
    isLocationAvailable: !!gpsLocation,
    isUsingUserAddress: false, // Desativado conforme solicitado
    isUsingGPS: !!gpsLocation,
    isLocationFiltered: !!currentLocation
  };
}
