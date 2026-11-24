import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Search, Store, Package, ArrowLeft, MapPin, Filter, Tag, ChevronDown, SlidersHorizontal, Grid, List, ArrowUpDown, Clock, Star, TrendingUp, X, RefreshCw, Zap, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { UnifiedEstablishmentCard } from "@/components/UnifiedEstablishmentCard";
import { UnifiedProductCard } from "@/components/UnifiedProductCard";
import { AdvancedSearchInput } from "@/components/search/AdvancedSearchInput";
import { QuickFilters } from "@/components/search/QuickFilters";
import type { QuickFilter } from "@/components/search/QuickFilters";
import { SEO } from "@/components/SEO";
import { useHomeSearch } from "@/hooks/useHomeSearch";
import { useGeolocation } from "@/hooks/useGeolocation";
import { Skeleton } from "@/components/ui/skeleton";
import { getLocationWithGPS } from "@/utils/locationUtils";
import { extractCategoriesFromQuery, getPrimaryCategory } from "@/utils/categoryMatcher";
import { PRODUCT_CATEGORIES } from "@/utils/productCategories";
import type { EstablishmentSearchResult, ProductSearchResult } from "@/types";

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Core state
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Enhanced UI state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'relevance' | 'rating' | 'delivery_time' | 'price'>('relevance');
  const [activeTab, setActiveTab] = useState<'all' | 'establishments' | 'products'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [deliveryTimeFilter, setDeliveryTimeFilter] = useState<string>('');
  const [ratingFilter, setRatingFilter] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { location: gpsLocation, requestLocation } = useGeolocation();
  const { searchResults, isSearching, search, error } = useHomeSearch();
  
  // Refs for preventing loops
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSearchRef = useRef<string>('');
  const isSearchingRef = useRef(false);

  // Get popular categories for easier selection
  const popularCategories = useMemo(() => PRODUCT_CATEGORIES.slice(0, 20), []);

  // Debounced search function
  const performSearch = useCallback(async (category: string, searchLocation: string) => {
    if (!category || isSearchingRef.current) return;
    
    const searchKey = `${category}-${searchLocation}`;
    if (lastSearchRef.current === searchKey) return;
    
    console.log('🔍 Performing search:', { category, searchLocation, searchKey });
    
    lastSearchRef.current = searchKey;
    isSearchingRef.current = true;
    
    try {
      await search(category, searchLocation, category);
    } finally {
      isSearchingRef.current = false;
    }
  }, [search]);

  // Initialize from URL params only once
  useEffect(() => {
    if (isInitialized) return;
    
    const categoryParam = searchParams.get('category');
    const locationParam = searchParams.get('location');
    
    console.log('🚀 Initializing from URL:', { categoryParam, locationParam });
    
    if (categoryParam) {
      setSelectedCategory(categoryParam);
      
      // Use GPS location if no location param and GPS is available
      const finalLocation = locationParam || (gpsLocation?.city && gpsLocation?.state 
        ? `${gpsLocation.city}, ${gpsLocation.state}` 
        : '');
      
      if (finalLocation && !locationParam) {
        setLocation(finalLocation);
      } else if (locationParam) {
        setLocation(locationParam);
      }
      
      // Perform initial search
      performSearch(categoryParam, finalLocation);
    }
    
    setIsInitialized(true);
  }, [searchParams, gpsLocation, performSearch, isInitialized]);

  // Auto-fill GPS location only when needed
  useEffect(() => {
    if (!isInitialized || location || !gpsLocation?.city || !gpsLocation?.state) return;
    
    const autoLocation = `${gpsLocation.city}, ${gpsLocation.state}`;
    console.log('🌍 Auto-filling GPS location:', autoLocation);
    
    setLocation(autoLocation);
    
    // Update URL if there's a category selected
    if (selectedCategory) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('location', autoLocation);
      setSearchParams(newParams, { replace: true });
    }
  }, [gpsLocation, location, selectedCategory, isInitialized, searchParams, setSearchParams]);

  // Handle category change with debounced search
  const handleCategoryChange = useCallback((category: string) => {
    console.log('📝 Category changed:', category);
    setSelectedCategory(category);
    
    if (!category) return;
    
    const searchLocation = getLocationWithGPS(location, gpsLocation);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Update URL immediately
    const newParams = new URLSearchParams();
    newParams.set('category', category);
    if (searchLocation) {
      newParams.set('location', searchLocation);
    }
    setSearchParams(newParams);
    
    // Debounced search
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(category, searchLocation);
    }, 300);
  }, [location, gpsLocation, setSearchParams, performSearch]);

  // Handle search button click
  const handleSearch = useCallback(() => {
    if (!selectedCategory) return;
    
    const searchLocation = getLocationWithGPS(location, gpsLocation);
    performSearch(selectedCategory, searchLocation);
  }, [selectedCategory, location, gpsLocation, performSearch]);

  // Handle location change
  const handleLocationChange = useCallback(() => {
    if (!selectedCategory) return;
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    const newParams = new URLSearchParams();
    newParams.set('category', selectedCategory);
    if (location) {
      newParams.set('location', location);
    }
    setSearchParams(newParams);
    
    // Debounced search
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(selectedCategory, location);
    }, 500);
  }, [selectedCategory, location, setSearchParams, performSearch]);

  // Handle keyboard events
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLocationChange();
    }
  }, [handleLocationChange]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Memoized location placeholder
  const locationPlaceholder = useMemo(() => {
    if (gpsLocation?.city && gpsLocation?.state) {
      return `${gpsLocation.city}, ${gpsLocation.state}`;
    }
    return "Digite seu endereço ou ative GPS";
  }, [gpsLocation]);

  // Memoized results data
  const resultsData = useMemo(() => {
    const totalResults = searchResults.establishments.length + searchResults.products.length;
    const hasResults = totalResults > 0;
    const selectedCategoryObj = PRODUCT_CATEGORIES.find(cat => cat.name === selectedCategory);
    
    return {
      totalResults,
      hasResults,
      selectedCategoryObj,
      establishmentsCount: searchResults.establishments.length,
      productsCount: searchResults.products.length
    };
  }, [searchResults, selectedCategory]);

  // Filter and sort logic
  const filteredResults = useMemo((): { establishments: EstablishmentSearchResult[]; products: ProductSearchResult[] } => {
    let filteredEstablishments = [...searchResults.establishments];
    const filteredProducts = [...searchResults.products];

    // Apply filters
    if (ratingFilter > 0) {
      filteredEstablishments = filteredEstablishments.filter(est => est.rating >= ratingFilter);
    }

    if (deliveryTimeFilter) {
      const maxTime = parseInt(deliveryTimeFilter);
      filteredEstablishments = filteredEstablishments.filter(est => est.delivery_time_max <= maxTime);
    }

    // Sort establishments
    switch (sortBy) {
      case 'rating':
        filteredEstablishments.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'delivery_time':
        filteredEstablishments.sort((a, b) => (a.delivery_time_max || 0) - (b.delivery_time_max || 0));
        break;
      case 'price':
        filteredProducts.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
    }

    return {
      establishments: filteredEstablishments,
      products: filteredProducts
    };
  }, [searchResults, ratingFilter, deliveryTimeFilter, sortBy]);

  // Quick filter handler
  const handleQuickFilter = useCallback((filter: QuickFilter) => {
    if (filter.type === 'category') {
      handleCategoryChange(filter.value);
    } else if (filter.type === 'sort') {
      setSortBy(filter.value as typeof sortBy);
    }
  }, [handleCategoryChange]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (ratingFilter > 0) count++;
    if (deliveryTimeFilter) count++;
    if (sortBy !== 'relevance') count++;
    return count;
  }, [ratingFilter, deliveryTimeFilter, sortBy]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    if (!selectedCategory) return;
    
    setIsRefreshing(true);
    try {
      const searchLocation = getLocationWithGPS(location, gpsLocation);
      await performSearch(selectedCategory, searchLocation);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedCategory, location, gpsLocation, performSearch]);

  return (
    <>
      <SEO 
        title={selectedCategory ? `${selectedCategory} - Buscar produtos` : "Buscar por categoria"}
        description={selectedCategory ? `Encontre produtos de ${selectedCategory} na sua região` : "Selecione uma categoria para encontrar produtos"}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Optimized Mobile-First Header */}
        <div className="bg-white shadow-sm border-b sticky top-0 z-40 safe-area-top">
          <div className="container mx-auto px-4 py-3">
            
            {/* Mobile Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate('/')}
                  className="shrink-0 h-9 w-9"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-0 flex-1">
                  <h1 className="text-base sm:text-lg font-semibold truncate">
                    {selectedCategory ? `Buscar ${selectedCategory}` : 'Buscar por Categoria'}
                  </h1>
                  {resultsData.hasResults && (
                    <p className="text-xs text-gray-500">
                      {resultsData.totalResults} resultado{resultsData.totalResults !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={isRefreshing || isSearching}
                  className="h-9 w-9"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowMobileSearch(!showMobileSearch)}
                  className="h-9 w-9 sm:hidden"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Enhanced Search Form - Collapsible on Mobile */}
            <div className={`space-y-3 transition-all duration-300 ${showMobileSearch ? 'block' : 'hidden sm:block'}`}>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <AdvancedSearchInput
                    value={selectedCategory}
                    onChange={setSelectedCategory}
                    placeholder="Buscar produtos, categorias..."
                    className="h-10 sm:h-12"
                  />
                </div>
                <div className="sm:w-56 relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={locationPlaceholder}
                    value={location || getLocationWithGPS('', gpsLocation)}
                    onChange={(e) => setLocation(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="pl-10 h-10 sm:h-12"
                  />
                </div>
                <Button 
                  onClick={handleSearch}
                  disabled={isSearching || !selectedCategory}
                  className="shrink-0 h-10 sm:h-12 px-4 sm:px-6"
                >
                  {isSearching ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span className="ml-2 hidden sm:inline">Buscar</span>
                </Button>
              </div>

              {/* Quick Filters - Horizontal Scroll on Mobile */}
              <div className="overflow-x-auto pb-1">
                <QuickFilters 
                  onFilterSelect={handleQuickFilter}
                  className="flex gap-2 w-max sm:w-auto sm:flex-wrap"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results Content */}
        <div className="container mx-auto px-4 py-4 sm:py-6 safe-area-bottom">
          
          {/* Enhanced Filters & Controls */}
          {resultsData.hasResults && !isSearching && (
            <Card className="mb-4 sm:mb-6 shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  
                  {/* Results Summary - Compact on Mobile */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center shrink-0">
                      {resultsData.selectedCategoryObj && (
                        <span className="text-base sm:text-lg text-white">{resultsData.selectedCategoryObj.icon}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm sm:text-lg font-bold text-gray-900 truncate">
                        {selectedCategory}
                        {location && (
                          <span className="text-xs sm:text-sm font-normal text-gray-600 ml-2 block sm:inline">
                            em {location}
                          </span>
                        )}
                      </h2>
                      <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-600">
                        <span>
                          {resultsData.totalResults} resultado{resultsData.totalResults !== 1 ? 's' : ''}
                        </span>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline">
                          {resultsData.establishmentsCount} estabelecimento{resultsData.establishmentsCount !== 1 ? 's' : ''} • {resultsData.productsCount} produto{resultsData.productsCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Controls */}
                  <div className="flex items-center gap-2">
                    {/* Advanced Filters */}
                    <Popover open={showFilters} onOpenChange={setShowFilters}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="relative">
                          <SlidersHorizontal className="h-4 w-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">{i18n.t('common:filters')}</span>
                          {activeFiltersCount > 0 && (
                            <Badge variant="secondary" className="ml-1 sm:ml-2 h-4 w-4 p-0 flex items-center justify-center text-xs">
                              {activeFiltersCount}
                            </Badge>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80" align="end">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Filtros Avançados</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setRatingFilter(0);
                                setDeliveryTimeFilter('');
                                setSortBy('relevance');
                              }}
                            >
                              Limpar
                            </Button>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <label className="text-sm font-medium">{i18n.t('common:min_rating')}</label>
                              <Select value={ratingFilter.toString()} onValueChange={(value) => setRatingFilter(parseFloat(value))}>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder={i18n.t('common:any_rating')} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">{i18n.t('common:any_rating')}</SelectItem>
                                  <SelectItem value="3">3+ estrelas</SelectItem>
                                  <SelectItem value="4">4+ estrelas</SelectItem>
                                  <SelectItem value="4.5">4.5+ estrelas</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <label className="text-sm font-medium">{i18n.t('common:max_delivery_time')}</label>
                              <Select value={deliveryTimeFilter} onValueChange={setDeliveryTimeFilter}>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder={i18n.t('common:any_time')} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">{i18n.t('common:any_time')}</SelectItem>
                                  <SelectItem value="30">Até 30 min</SelectItem>
                                  <SelectItem value="45">Até 45 min</SelectItem>
                                  <SelectItem value="60">Até 1 hora</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>

                    {/* Sort */}
                    <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'relevance' | 'rating' | 'delivery_time' | 'price')}>
                      <SelectTrigger className="w-32 sm:w-40">
                        <ArrowUpDown className="h-4 w-4 mr-1 sm:mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="relevance">{i18n.t('common:sort_relevance')}</SelectItem>
                        <SelectItem value="rating">{i18n.t('common:sort_rating')}</SelectItem>
                        <SelectItem value="delivery_time">{i18n.t('common:sort_delivery_time')}</SelectItem>
                        <SelectItem value="price">{i18n.t('common:sort_price_asc')}</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* View Mode - Hidden on Mobile */}
                    <div className="hidden sm:flex border rounded-lg">
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className="rounded-r-none"
                      >
                        <Grid className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                        className="rounded-l-none border-l"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {isSearching && (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-20" />
              </div>
              <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-48 sm:h-64 rounded-lg" />
                ))}
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isSearching && (
            <div className="text-center py-8 sm:py-12">
              <Card className="bg-red-50 border-red-200 max-w-md mx-auto">
                <CardContent className="p-6">
                  <div className="text-red-600 mb-2">
                    <X className="h-12 w-12 mx-auto mb-4" />
                    <p className="font-medium">Erro na busca</p>
                  </div>
                  <p className="text-red-500 text-sm mt-1 mb-4">{error}</p>
                  <Button 
                    variant="outline" 
                    onClick={handleSearch}
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Tentar novamente
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Enhanced Results with Tabs */}
          {resultsData.hasResults && !isSearching && (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'establishments' | 'products')} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4 sm:mb-6">
                <TabsTrigger value="all" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                  <Search className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>Todos</span>
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {resultsData.totalResults}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="establishments" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                  <Store className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Estabelecimentos</span>
                  <span className="sm:hidden">Locais</span>
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {resultsData.establishmentsCount}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="products" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                  <Package className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>Produtos</span>
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {resultsData.productsCount}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-6 sm:space-y-8">
                {/* Establishments */}
                {filteredResults.establishments.length > 0 && (
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                      <Store className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                      Estabelecimentos ({filteredResults.establishments.length})
                    </h3>
                    <div className={`grid gap-3 sm:gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                      {filteredResults.establishments.map((establishment: EstablishmentSearchResult) => (
                        <UnifiedEstablishmentCard 
                          key={establishment.id}
                          establishment={{
                            id: establishment.id,
                            business_name: establishment.business_name,
                            business_type: establishment.business_type || "Restaurante",
                            address: establishment.address,
                            phone: establishment.phone || "",
                            delivery_fee: establishment.delivery_fee,
                            delivery_time_min: establishment.delivery_time_min,
                            delivery_time_max: establishment.delivery_time_max,
                            rating: establishment.rating,
                            total_reviews: establishment.total_reviews,
                            banner_url: establishment.banner_url || establishment.logo_url,
                            is_active: establishment.is_active
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Products */}
                {filteredResults.products.length > 0 && (
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                      <Package className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
                      Produtos ({filteredResults.products.length})
                    </h3>
                    <div className={`grid gap-3 sm:gap-4 ${viewMode === 'grid' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'}`}>
                      {filteredResults.products.map((product: ProductSearchResult) => (
                        <UnifiedProductCard 
                          key={product.id}
                          product={{
                            id: product.id,
                            name: product.name,
                            description: product.description || "",
                            price: product.price,
                            image_url: product.image_url,
                            establishment: {
                              id: product.establishment?.id ?? "",
                              business_name: product.establishment?.business_name ?? "Estabelecimento"
                            },
                            is_available: product.is_available
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="establishments">
                <div className={`grid gap-3 sm:gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                  {filteredResults.establishments.map((establishment: EstablishmentSearchResult) => (
                    <UnifiedEstablishmentCard 
                      key={establishment.id}
                      establishment={{
                        id: establishment.id,
                        business_name: establishment.business_name,
                        business_type: establishment.business_type || "Restaurante",
                        address: establishment.address,
                        phone: establishment.phone || "",
                        delivery_fee: establishment.delivery_fee,
                        delivery_time_min: establishment.delivery_time_min,
                        delivery_time_max: establishment.delivery_time_max,
                        rating: establishment.rating,
                        total_reviews: establishment.total_reviews,
                        banner_url: establishment.banner_url || establishment.logo_url,
                        is_active: establishment.is_active
                      }}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="products">
                <div className={`grid gap-3 sm:gap-4 ${viewMode === 'grid' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'}`}>
                  {filteredResults.products.map((product: ProductSearchResult) => (
                    <UnifiedProductCard 
                      key={product.id}
                      product={{
                        id: product.id,
                        name: product.name,
                        description: product.description || "",
                        price: product.price,
                        image_url: product.image_url,
                        establishment: {
                          id: product.establishment?.id ?? "",
                          business_name: product.establishment?.business_name ?? "Estabelecimento"
                        },
                        is_available: product.is_available
                      }}
                    />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* Enhanced No Results State */}
          {!resultsData.hasResults && !isSearching && selectedCategory && !error && (
            <div className="text-center py-8 sm:py-16">
              <Card className="bg-gradient-to-br from-gray-50 to-blue-50 max-w-lg mx-auto">
                <CardContent className="p-6 sm:p-8">
                  <Search className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">
                    Nenhum resultado encontrado
                  </h3>
                  
                  <div className="space-y-3 mb-6">
                    <p className="text-sm sm:text-base text-gray-600 font-medium">
                      Não encontramos produtos da categoria "{selectedCategory}"
                      {location && <span className="text-gray-500"> em {location}</span>}
                    </p>
                    
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-3 sm:p-4">
                        <p className="text-blue-700 text-xs sm:text-sm">
                          💡 <strong>Dicas:</strong> Tente expandir sua busca removendo filtros de localização ou busque por categorias similares
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="mb-6">
                    <p className="text-sm text-gray-600 mb-3">Experimente essas categorias:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {popularCategories.slice(0, 6).map((cat) => (
                        <Badge 
                          key={cat.name} 
                          variant="outline" 
                          className="cursor-pointer hover:bg-blue-50 transition-colors text-xs"
                          onClick={() => handleCategoryChange(cat.name)}
                        >
                          <span className="mr-1">{cat.icon}</span>
                          {cat.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setSelectedCategory('');
                          setSearchParams({});
                        }}
                        className="w-full text-sm"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Limpar categoria
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setLocation('');
                          if (selectedCategory) {
                            const newParams = new URLSearchParams();
                            newParams.set('category', selectedCategory);
                            setSearchParams(newParams);
                          }
                        }}
                        className="w-full text-sm"
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        Buscar em todo país
                      </Button>
                    </div>
                    
                    <Button 
                      onClick={() => navigate('/establishments')}
                      className="w-full"
                    >
                      <Store className="h-4 w-4 mr-2" />
                      Ver todos os estabelecimentos
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* No Category Selected State */}
          {!selectedCategory && !isSearching && (
            <div className="text-center py-8 sm:py-16">
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 max-w-md mx-auto">
                <CardContent className="p-6 sm:p-8">
                  <Search className="h-12 w-12 sm:h-16 sm:w-16 text-blue-400 mx-auto mb-4" />
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">
                    Selecione uma categoria
                  </h3>
                  <p className="text-sm sm:text-base text-gray-500 mb-6">
                    Escolha uma categoria acima para encontrar produtos na sua região.
                  </p>
                  <Button 
                    onClick={() => navigate('/establishments')}
                    className="w-full"
                  >
                    <Store className="h-4 w-4 mr-2" />
                    Explorar estabelecimentos
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
