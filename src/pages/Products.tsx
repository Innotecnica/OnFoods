import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UnifiedProductCard } from "@/components/UnifiedProductCard";
import { OptimizedLocationSelector } from "@/components/filters/OptimizedLocationSelector";
import { ProductActiveFilters } from "@/components/products/ProductActiveFilters";
import { Search, ArrowUpDown, SlidersHorizontal, X, Loader2, ChevronDown, Package, ShoppingBag } from "lucide-react";
import { SEO } from "@/components/SEO";
import { PRODUCT_CATEGORIES } from "@/utils/productCategories";
import { UnsupportedCityMessage } from "@/components/products/UnsupportedCityMessage";
import { useProductSearch } from "@/hooks/useProductSearch";
import { useOptimizedFilters } from "@/hooks/useOptimizedFilters";
import { isCitySupported } from "@/utils/brazilianStates";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { formatCurrencyByCountry, inferCountryFromState } from "@/utils/formatting";

export default function Products() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { 
    products, 
    isLoading, 
    error, 
    searchProducts,
  } = useProductSearch();

  // Use optimized filter system
  const {
    filters,
    locationFilter,
    apiFilters,
    metrics,
    setSelectedCategory,
    setSearchTerm,
    setSortBy,
    setMinRating,
    setPriceRange,
    setOnlyAvailable,
    setOnlyPromotion,
    clearAllFilters,
  } = useOptimizedFilters('products');
  
  const [favorites, setFavorites] = useState<string[]>([]);

  // Initialize filters from URL parameters
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    if (category && category !== filters.selectedCategory) {
      setSelectedCategory(category);
    }
    if (search && search !== filters.searchTerm) {
      setSearchTerm(search);
    }
    initializedRef.current = true;
  }, [searchParams, filters.selectedCategory, filters.searchTerm, setSelectedCategory, setSearchTerm]);

  // Search products when filters change - debounced and stable
  useEffect(() => {
    const filtersToUse = apiFilters;
    if (!filtersToUse) {
      return;
    }

    const timeoutId = setTimeout(() => {
      searchProducts(filtersToUse);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [apiFilters, searchProducts]); // Simplified dependency

  // Dynamic categories from product categories
  const categories = useMemo(() => 
    PRODUCT_CATEGORIES.map(cat => cat.name).sort(), 
    []
  );

  // Check if selected city is supported
  const isCitySupportedForSearch = useMemo(() => {
    const { activeLocation } = locationFilter;
    if (!activeLocation || activeLocation.source === 'gps') {
      return true; // GPS locations and no location are always supported
    }
    return isCitySupported(activeLocation.city, activeLocation.state);
  }, [locationFilter]);

  const countryCode = useMemo(() => inferCountryFromState(locationFilter.activeLocation?.state), [locationFilter.activeLocation]);

  // Enhanced sorting
  const sortedProducts = useMemo(() => {
    const sorted = [...products];
    
    switch (filters.sortBy) {
      case "popular":
        return sorted.sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
      case "rating":
        return sorted.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
      case "price_asc":
        return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
      case "price_desc":
        return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
      case "delivery_time":
        return sorted.sort((a, b) => (a.preparation_time || 0) - (b.preparation_time || 0));
      case "reviews":
        return sorted.sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
      default:
        return sorted;
    }
  }, [products, filters.sortBy]);

  // Favorites management
  const toggleFavorite = useCallback((productId: string) => {
    setFavorites(prev => {
      const isRemoving = prev.includes(productId);
      const product = products.find(p => p.id === productId);
      
      if (product) {
        toast({
          title: isRemoving ? "Removido dos favoritos" : "Adicionado aos favoritos",
          description: `${product.name} ${isRemoving ? 'foi removido dos' : 'foi adicionado aos'} seus favoritos.`,
        });
      }
      
      return isRemoving 
        ? prev.filter(id => id !== productId)
        : [...prev, productId];
    });
  }, [products]);

  // Handle city selection from unsupported city message
  const handleCitySelect = useCallback((cityName: string) => {
    locationFilter.setSelectedCity(cityName);
  }, [locationFilter]);

  return (
    <>
      <SEO 
        title={t('common:products_seo_title')}
        description={t('common:products_seo_desc')}
        keywords={t('common:products_seo_keywords')}
      />
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center">
              <ShoppingBag className="h-4 w-4 text-primary-foreground" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {t('common:products_title')}
            </h1>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base">
            {t('common:products_subtitle')}
          </p>
        </div>

        {/* Location Selector */}
        <div className="animate-fade-in">
          <OptimizedLocationSelector
            activeLocation={locationFilter.activeLocation}
            isGpsEnabled={locationFilter.isGpsEnabled}
            isGpsLoading={locationFilter.isGpsLoading}
            manualState={locationFilter.manualState}
            manualCity={locationFilter.manualCity}
            profileLocation={locationFilter.profileLocation}
            isAuthenticated={locationFilter.isAuthenticated}
            onToggleGps={locationFilter.toggleGps}
            onStateChange={locationFilter.setSelectedState}
            onCityChange={locationFilter.setSelectedCity}
          />
        </div>

        {/* Search and Controls */}
        <div className="space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder={t('common:search_products_placeholder')}
              value={filters.searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 rounded-xl bg-muted/50 border-border/50 focus:bg-background transition-colors"
            />
          </div>
          
          {/* Sort and Filter */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
            <Select value={filters.sortBy} onValueChange={(value) => setSortBy(value as typeof filters.sortBy)}>
              <SelectTrigger className="h-11 rounded-xl border-border/50">
                <ArrowUpDown className="h-4 w-4 mr-2 text-primary" />
                <SelectValue placeholder={t('common:sort_placeholder')} />
                <ChevronDown className="h-4 w-4 opacity-50" />
              </SelectTrigger>
              <SelectContent className="rounded-xl bg-background border shadow-lg z-[100]">
                <SelectItem value="relevance">{t('common:sort_relevance')}</SelectItem>
                <SelectItem value="popular">{t('common:sort_popular')}</SelectItem>
                <SelectItem value="rating">{t('common:sort_rating')}</SelectItem>
                <SelectItem value="price_asc">{t('common:sort_price_asc')}</SelectItem>
                <SelectItem value="price_desc">{t('common:sort_price_desc')}</SelectItem>
                <SelectItem value="delivery_time">{t('common:sort_delivery_time')}</SelectItem>
                <SelectItem value="reviews">{t('common:sort_reviews')}</SelectItem>
              </SelectContent>
            </Select>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="h-11 rounded-xl border-border/50 relative">
                  <SlidersHorizontal className="h-4 w-4 mr-2 text-primary" />
                  <span className="hidden sm:inline">{t('common:filters')}</span>
                  <span className="sm:hidden">{t('common:filter')}</span>
                  {metrics.activeFiltersCount > 0 && (
                    <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-primary text-primary-foreground">
                      {metrics.activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:w-80 overflow-y-auto rounded-t-2xl sm:rounded-t-none">
              <SheetHeader className="space-y-4">
                <div className="flex items-center justify-between">
                    <SheetTitle className="text-lg font-semibold">🎯 {t('common:filters')}</SheetTitle>
                    {metrics.activeFiltersCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-destructive">
                        <X className="h-4 w-4 mr-1" />
                        {t('common:clear')} ({metrics.activeFiltersCount})
                      </Button>
                    )}
                  </div>
                </SheetHeader>

                <div className="space-y-4 mt-6">
                  {/* Category Filter */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{t('common:category')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Select value={filters.selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('common:all_categories')} />
                        </SelectTrigger>
                        <SelectContent className="bg-background border shadow-lg z-[100] max-h-80">
                          <SelectItem value="all">{t('common:all_categories')}</SelectItem>
                          {categories.map((category, index) => {
                            const categoryInfo = PRODUCT_CATEGORIES.find(cat => cat.name === category);
                            return (
                              <SelectItem key={`${category}-${index}`} value={category}>
                                <div className="flex items-center gap-2">
                                  <span>{categoryInfo?.icon || "🍽️"}</span>
                                  <span>{category}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>

                  {/* Rating and Price */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{t('common:rating_and_price')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>{t('common:min_rating')}</Label>
                        <Select 
                          value={filters.minRating.toString()} 
                          onValueChange={(value) => setMinRating(Number(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('common:any_rating')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">{t('common:any_rating')}</SelectItem>
                            <SelectItem value="3">{t('common:rating_three_plus')}</SelectItem>
                            <SelectItem value="4">{t('common:rating_four_plus')}</SelectItem>
                            <SelectItem value="4.5">{t('common:rating_four_half_plus')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <Label>
                          {t('common:price_range_label', { defaultValue: 'Faixa de Preço:' })} {formatCurrencyByCountry(filters.priceRange?.[0] || 0, countryCode)} - {formatCurrencyByCountry(filters.priceRange?.[1] || 100, countryCode)}
                        </Label>
                        <Slider
                          value={filters.priceRange || [0, 100]}
                          onValueChange={setPriceRange}
                          max={100}
                          min={0}
                          step={5}
                          className="w-full"
                        />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{formatCurrencyByCountry(0, countryCode)}</span>
                          <span>{formatCurrencyByCountry(100, countryCode)}+</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Options */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{t('common:options')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="available">{t('common:available_only')}</Label>
                        <Switch
                          id="available"
                          checked={filters.onlyAvailable || false}
                          onCheckedChange={setOnlyAvailable}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="promotion">{t('common:promotion_only')}</Label>
                        <Switch
                          id="promotion"
                          checked={filters.onlyPromotion || false}
                          onCheckedChange={setOnlyPromotion}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Unsupported City Message */}
        {!isCitySupportedForSearch && locationFilter.activeLocation?.source === 'manual' && (
          <UnsupportedCityMessage 
            cityName={locationFilter.activeLocation.city}
            stateCode={locationFilter.activeLocation.state}
            onCitySelect={handleCitySelect}
          />
        )}

        {/* Products Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">{t('common:loading_products')}</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t('common:error_loading_products')}</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => searchProducts({})} variant="outline">
              {t('common:try_again')}
            </Button>
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="text-center py-12">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {locationFilter.activeLocation 
                ? t('common:products_none_title')
                : t('common:products_none_title')
              }
            </h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              {locationFilter.activeLocation 
                ? t('common:products_none_desc_with_location')
                : t('common:products_none_desc')
              }
            </p>
            {!locationFilter.activeLocation ? (
              <div className="text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4 max-w-md mx-auto">
                <p className="font-medium">{t('common:location_required_title')}</p>
                <p className="font-medium">{t('common:location_required_products_hint')}</p>
              </div>
            ) : (
              metrics.activeFiltersCount > 0 && (
                <Button onClick={filterActions.clearAllFilters} variant="outline" className="mb-4">
                  <X className="h-4 w-4 mr-2" />
                  {t('common:clear')}
                </Button>
              )
            )}
            {locationFilter.activeLocation && (
              <Button 
                onClick={() => {
                  filterActions.clearAllFilters();
                  locationFilter.setSelectedCity('');
                  locationFilter.setSelectedState('');
                }} 
                variant="ghost"
                className="text-sm"
              >
                🌍 {t('common:search_all_locations')}
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Results Summary */}
            <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3 mb-4">
              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  {t('common:products_found_count', { count: sortedProducts.length })}
                </span>
              </div>
              {locationFilter.activeLocation && (
                <span className="text-xs text-muted-foreground">
                  📍 {locationFilter.activeLocation.city}, {locationFilter.activeLocation.state}
                </span>
              )}
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {sortedProducts.map((product) => (
                <UnifiedProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={(productId, quantity) => {
                    console.log('Adding to cart:', { productId, quantity });
                    toast({
                      title: t('common:product_added_title'),
                      description: t('common:product_added_desc', { name: product.name }),
                    });
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
