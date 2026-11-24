import { useState, useCallback, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocationFilter } from "@/hooks/useLocationFilter";
import { useCategoryMapping } from "@/hooks/useCategoryMapping";
import { ProductSearchFilters } from "@/hooks/useProductSearch";
import { EstablishmentSearchFilters } from "@/hooks/useEstablishmentSearch";
import { toast } from "@/hooks/use-toast";

export interface BaseFilters {
  searchTerm: string;
  selectedCategory: string;
  minRating: number;
  sortBy: ProductSearchFilters['sort_by'];
}

export interface ProductFilters extends BaseFilters {
  priceRange: number[];
  onlyAvailable: boolean;
  onlyPromotion: boolean;
}

export interface EstablishmentFilters extends BaseFilters {
  businessType: string;
  maxDeliveryFee: number;
  maxDeliveryTime: number;
  onlyOpen: boolean;
}

export interface FilterMetrics {
  activeFiltersCount: number;
  hasLocationFilter: boolean;
  hasContentFilters: boolean;
}

const DEFAULT_PRODUCT_FILTERS: ProductFilters = {
  searchTerm: "",
  selectedCategory: "all",
  minRating: 0,
  sortBy: "relevance",
  priceRange: [0, 100],
  onlyAvailable: false,
  onlyPromotion: false,
};

const DEFAULT_ESTABLISHMENT_FILTERS: EstablishmentFilters = {
  searchTerm: "",
  selectedCategory: "all",
  minRating: 0,
  sortBy: "relevance",
  businessType: "all",
  maxDeliveryFee: 50,
  maxDeliveryTime: 60,
  onlyOpen: false,
};

export interface ProductFilterActions {
  setSearchTerm: (value: string) => void;
  setSelectedCategory: (value: string) => void;
  setMinRating: (value: number) => void;
  setSortBy: (value: ProductSearchFilters['sort_by']) => void;
  setPriceRange: (value: number[]) => void;
  setOnlyAvailable: (value: boolean) => void;
  setOnlyPromotion: (value: boolean) => void;
  clearAllFilters: () => void;
}

export interface EstablishmentFilterActions {
  setSearchTerm: (value: string) => void;
  setSelectedCategory: (value: string) => void;
  setMinRating: (value: number) => void;
  setSortBy: (value: ProductSearchFilters['sort_by']) => void;
  setBusinessType: (value: string) => void;
  setMaxDeliveryFee: (value: number) => void;
  setMaxDeliveryTime: (value: number) => void;
  setOnlyOpen: (value: boolean) => void;
  clearAllFilters: () => void;
}

export function useOptimizedFilters(type: 'products'): {
  filters: ProductFilters;
  locationFilter: ReturnType<typeof useLocationFilter>;
  apiFilters: ProductSearchFilters | null;
  metrics: FilterMetrics;
} & ProductFilterActions;

export function useOptimizedFilters(type: 'establishments'): {
  filters: EstablishmentFilters;
  locationFilter: ReturnType<typeof useLocationFilter>;
  apiFilters: EstablishmentSearchFilters | null;
  metrics: FilterMetrics;
} & EstablishmentFilterActions;

export function useOptimizedFilters(type: 'products' | 'establishments') {
  const { getCategoryIdByName } = useCategoryMapping();
  const locationFilter = useLocationFilter();
  const { t } = useTranslation();
  
  // Initialize filters based on type
  const [filters, setFilters] = useState<ProductFilters | EstablishmentFilters>(
    type === 'products' ? DEFAULT_PRODUCT_FILTERS : DEFAULT_ESTABLISHMENT_FILTERS
  );

  useEffect(() => {
    const hasShown = sessionStorage.getItem('locationWarningShown');
    const noLocation = !locationFilter.activeLocation;
    const isSearchActive = !!filters.searchTerm?.trim();
    let otherFiltersActive = filters.selectedCategory !== "all" || filters.minRating > 0;
    if (type === 'products') {
      const pf = filters as ProductFilters;
      otherFiltersActive = otherFiltersActive || pf.priceRange[0] > 0 || pf.priceRange[1] < 100 || pf.onlyAvailable || pf.onlyPromotion;
    } else {
      const ef = filters as EstablishmentFilters;
      otherFiltersActive = otherFiltersActive || ef.businessType !== "all" || ef.maxDeliveryFee < 50 || ef.maxDeliveryTime < 60 || ef.onlyOpen;
    }
    if (noLocation && otherFiltersActive && !isSearchActive && !hasShown) {
      toast({
        title: t('common:location_required_title'),
        description: type === 'products' 
          ? t('common:location_required_products_hint') 
          : t('common:location_required_establishments_hint'),
        duration: 4000,
      });
      sessionStorage.setItem('locationWarningShown', 'true');
    }
  }, [locationFilter.activeLocation, type, filters, t]);

  // Filter actions
  const actions = useMemo(() => ({
    setSearchTerm: (value: string) => 
      setFilters(prev => ({ ...prev, searchTerm: value })),
    
    setSelectedCategory: (value: string) => 
      setFilters(prev => ({ ...prev, selectedCategory: value })),
    
    setMinRating: (value: number) => 
      setFilters(prev => ({ ...prev, minRating: value })),
    
    setSortBy: (value: ProductSearchFilters['sort_by']) => 
      setFilters(prev => ({ ...prev, sortBy: value })),
    
    // Product-specific actions
    ...(type === 'products' && {
      setPriceRange: (value: number[]) => 
        setFilters(prev => ({ ...prev, priceRange: value })),
      
      setOnlyAvailable: (value: boolean) => 
        setFilters(prev => ({ ...prev, onlyAvailable: value })),
      
      setOnlyPromotion: (value: boolean) => 
        setFilters(prev => ({ ...prev, onlyPromotion: value })),
    }),
    
    // Establishment-specific actions
    ...(type === 'establishments' && {
      setBusinessType: (value: string) => 
        setFilters(prev => ({ ...prev, businessType: value })),
      
      setMaxDeliveryFee: (value: number) => 
        setFilters(prev => ({ ...prev, maxDeliveryFee: value })),
      
      setMaxDeliveryTime: (value: number) => 
        setFilters(prev => ({ ...prev, maxDeliveryTime: value })),
      
      setOnlyOpen: (value: boolean) => 
        setFilters(prev => ({ ...prev, onlyOpen: value })),
    }),
    
    clearAllFilters: () => {
      setFilters(type === 'products' ? DEFAULT_PRODUCT_FILTERS : DEFAULT_ESTABLISHMENT_FILTERS);
      toast({
        title: "🧹 Filtros limpos",
        description: "Todos os filtros foram removidos",
      });
    },
  }), [type]);

  // Generate API filters for products - only when location is available and stable
  const productApiFilters = useMemo((): ProductSearchFilters | null => {
    if (type !== 'products') return null;
    const productFilters = filters as ProductFilters;
    const locationApi = locationFilter.getLocationForApi();

    const hasLocation = !!(locationApi.city && locationApi.state);
    const hasContentFilters = !!(
      productFilters.searchTerm.trim() ||
      (productFilters.selectedCategory && productFilters.selectedCategory !== "all") ||
      productFilters.priceRange[0] > 0 ||
      productFilters.priceRange[1] < 100 ||
      productFilters.minRating > 0 ||
      productFilters.onlyAvailable
    );

    if (!hasLocation && !hasContentFilters) {
      return null;
    }

    const apiFilters: ProductSearchFilters = {
      sort_by: productFilters.sortBy,
      limit: 50,
      ...(locationApi.city && { city: locationApi.city }),
      ...(locationApi.state && { state: locationApi.state }),
    };

    if (productFilters.searchTerm.trim()) {
      apiFilters.query = productFilters.searchTerm.trim();
    }

    if (productFilters.selectedCategory && productFilters.selectedCategory !== "all") {
      const categoryId = getCategoryIdByName(productFilters.selectedCategory);
      if (categoryId) {
        apiFilters.category_id = categoryId;
      }
    }

    if (productFilters.priceRange[0] > 0) {
      apiFilters.min_price = productFilters.priceRange[0];
    }
    if (productFilters.priceRange[1] < 100) {
      apiFilters.max_price = productFilters.priceRange[1];
    }
    if (productFilters.minRating > 0) {
      apiFilters.min_rating = productFilters.minRating;
    }
    if (productFilters.onlyAvailable) {
      apiFilters.only_available = true;
    }

    return apiFilters;
  }, [
    type,
    filters,
    locationFilter,
    getCategoryIdByName
  ]);

  // Generate API filters for establishments - only when location is available and stable
  const establishmentApiFilters = useMemo((): EstablishmentSearchFilters | null => {
    if (type !== 'establishments') return null;
    const estFilters = filters as EstablishmentFilters;
    const locationApi = locationFilter.getLocationForApi();

    const hasLocation = !!(locationApi.city && locationApi.state);
    const hasContentFilters = !!(
      (estFilters.searchTerm || '').trim() ||
      (estFilters.businessType && estFilters.businessType !== "all") ||
      (estFilters.minRating || 0) > 0 ||
      (estFilters.maxDeliveryFee || 50) < 50 ||
      (estFilters.maxDeliveryTime || 60) < 60 ||
      !!estFilters.onlyOpen
    );

    if (!hasLocation && !hasContentFilters) {
      return null;
    }

    const apiFilters: EstablishmentSearchFilters = {
      searchQuery: estFilters.searchTerm || '',
      limit: 50,
      onlyActive: true,
      minRating: estFilters.minRating || 0,
      minDeliveryFee: 0,
      maxDeliveryFee: estFilters.maxDeliveryFee || 50,
      maxDeliveryTime: estFilters.maxDeliveryTime || 60,
      onlyOpen: estFilters.onlyOpen || false,
      ...(locationApi.city && { city: locationApi.city }),
      ...(locationApi.state && { state: locationApi.state }),
    };

    if (estFilters.businessType && estFilters.businessType !== "all") {
      apiFilters.businessType = estFilters.businessType;
    }

    return apiFilters;
  }, [
    type,
    filters,
    locationFilter
  ]);

  // Calculate metrics
  const metrics: FilterMetrics = useMemo(() => {
    const hasLocation = !!locationFilter.activeLocation;
    let contentFiltersCount = 0;

    if (filters.searchTerm.trim()) contentFiltersCount++;
    if (filters.selectedCategory !== "all") contentFiltersCount++;
    if (filters.minRating > 0) contentFiltersCount++;

    if (type === 'products') {
      const productFilters = filters as ProductFilters;
      if (productFilters.priceRange[0] > 0 || productFilters.priceRange[1] < 100) contentFiltersCount++;
      if (productFilters.onlyAvailable) contentFiltersCount++;
      if (productFilters.onlyPromotion) contentFiltersCount++;
    }

    if (type === 'establishments') {
      const estFilters = filters as EstablishmentFilters;
      if (estFilters.businessType !== "all") contentFiltersCount++;
      if (estFilters.maxDeliveryFee < 50) contentFiltersCount++;
      if (estFilters.maxDeliveryTime < 60) contentFiltersCount++;
      if (estFilters.onlyOpen) contentFiltersCount++;
    }

    return {
      activeFiltersCount: contentFiltersCount + (hasLocation ? 1 : 0),
      hasLocationFilter: hasLocation,
      hasContentFilters: contentFiltersCount > 0,
    };
  }, [filters, locationFilter.activeLocation, type]);

  return {
    // Core state
    filters,
    locationFilter,
    
    // Actions
    ...actions,
    
    // API-ready filters
    apiFilters: type === 'products' ? productApiFilters : establishmentApiFilters,
    
    // Metrics
    metrics,
  };
}
