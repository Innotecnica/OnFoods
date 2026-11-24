
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProductSearch, ProductSearchFilters } from "./useProductSearch";
import { useGeolocation } from "./useGeolocation";
import { supabase } from "@/integrations/supabase/client";

interface UserAddress {
  id: string;
  city: string;
  state: string;
  is_default: boolean;
}

export function useProductsWithLocation() {
  const { isAuthenticated, user } = useAuth();
  const { location, requestLocation, hasPermission } = useGeolocation();
  const { products, isLoading, error, searchProducts } = useProductSearch();
  const debounceTimerRef = useRef<number | undefined>(undefined);
  
  const [userAddress, setUserAddress] = useState<UserAddress | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [useGPSLocation, setUseGPSLocation] = useState(false); // New state to control GPS vs Address

  // Load user's default address if authenticated
  const loadUserAddress = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setUserAddress(null);
      return;
    }
    
    try {
      setLoadingAddress(true);
      
      // First try to get from user profile
      if (user.city && user.state) {
        setUserAddress({
          id: 'profile',
          city: user.city,
          state: user.state,
          is_default: true
        });
        console.log('📍 Using location from user profile:', { city: user.city, state: user.state });
        return;
      }
      
      // Fallback to addresses table
      const { data, error } = await supabase
        .from('addresses')
        .select('id, city, state, is_default')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading user address:', error);
        return;
      }

      if (data) {
        console.log('📍 User default address loaded:', data);
        setUserAddress(data);
      } else {
        setUserAddress(null);
      }
    } catch (err) {
      console.error('Error loading user address:', err);
      setUserAddress(null);
    } finally {
      setLoadingAddress(false);
    }
  }, [isAuthenticated, user]);

  // Load address when authentication state changes
  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserAddress();
    } else {
      setUserAddress(null);
    }
  }, [isAuthenticated, user, loadUserAddress]);

  // Determine current location based on toggle state
  const currentLocation = useMemo(() => {
    // For authenticated users
    if (isAuthenticated) {
      if (useGPSLocation && location) {
        console.log('📍 Using GPS location for authenticated user:', location);
        return {
          city: location.city,
          state: location.state,
          source: 'gps' as const
        };
      } else if (userAddress) {
        console.log('📍 Using user address:', userAddress);
        return {
          city: userAddress.city,
          state: userAddress.state,
          source: 'user_address' as const
        };
      }
    } else {
      // For non-authenticated users, only GPS
      if (location) {
        console.log('📍 Using GPS location for non-authenticated user:', location);
        return {
          city: location.city,
          state: location.state,
          source: 'gps' as const
        };
      }
    }

    console.log('📍 No location available');
    return null;
  }, [isAuthenticated, userAddress, location, useGPSLocation]);

  // Search with location filters - only when location filter is enabled
  const searchProductsWithLocation = useCallback((filters: Omit<ProductSearchFilters, 'city' | 'state'> = {}, forceLocation?: { city?: string; state?: string } | { city: string; state: string }) => {
    // If no location provided, use current location
    if (!forceLocation && !currentLocation) {
      console.log('🔍 No location available for location-based search, falling back to global search');
      return searchProducts(filters);
    }

    const locationToUse = forceLocation || currentLocation;
    
    if (!locationToUse) {
      console.log('🔍 No location available for location-based search, falling back to global search');
      return searchProducts(filters);
    }

    // Build search filters with location
    const searchFilters: ProductSearchFilters = {
      ...filters,
      ...(locationToUse.city && { city: locationToUse.city }),
      ...(locationToUse.state && { state: locationToUse.state })
    };

    console.log('🔍 Searching products with location filters:', {
      filters: searchFilters,
      locationSource: locationToUse === currentLocation ? currentLocation?.source : 'forced'
    });

    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }
    return new Promise((resolve) => {
      debounceTimerRef.current = window.setTimeout(async () => {
        const result = await searchProducts(searchFilters);
        resolve(result);
      }, 300);
    });
  }, [currentLocation, searchProducts]);

  // Search without location filters
  const searchProductsGlobal = useCallback((filters: Omit<ProductSearchFilters, 'city' | 'state'> = {}) => {
    console.log('🌍 Searching products globally (no location filter)');
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }
    return new Promise((resolve) => {
      debounceTimerRef.current = window.setTimeout(async () => {
        const result = await searchProducts(filters);
        resolve(result);
      }, 300);
    });
  }, [searchProducts]);

  // Toggle between GPS and user address
  const toggleLocationSource = useCallback(() => {
    if (!isAuthenticated) return; // Only authenticated users can toggle
    
    setUseGPSLocation(prev => !prev);
  }, [isAuthenticated]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    // Product data
    products,
    isLoading,
    error,
    
    // Location data
    userAddress,
    loadingAddress,
    location,
    hasPermission,
    
    // Location info
    currentLocation,
    useGPSLocation,
    
    // Search functions
    searchProductsWithLocation,
    searchProductsGlobal,
    requestLocation,
    toggleLocationSource,
    
    // Status flags
    isLocationAvailable: !!(currentLocation),
    isUsingUserAddress: !!(isAuthenticated && !useGPSLocation && userAddress),
    isUsingGPS: !!((isAuthenticated && useGPSLocation && location) || (!isAuthenticated && location)),
    canToggleLocation: !!(isAuthenticated && userAddress && location)
  };
}
