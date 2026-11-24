import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UnifiedEstablishmentCard } from "@/components/UnifiedEstablishmentCard";
import { OptimizedLocationSelector } from "@/components/filters/OptimizedLocationSelector";
import { Search, ArrowUpDown, SlidersHorizontal, X, Loader2, ChevronDown, Utensils, MapPin } from "lucide-react";
import { useEstablishmentSearch } from "@/hooks/useEstablishmentSearch";
import { useOptimizedFilters } from "@/hooks/useOptimizedFilters";
import { SEO } from "@/components/SEO";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { formatCurrencyByCountry, inferCountryFromState } from "@/utils/formatting";

type SortByType = 'rating_time' | 'rating' | 'delivery_time' | 'delivery_fee' | 'distance' | 'reviews';

const BUSINESS_TYPES = [
  { value: "all", i18nKey: "all_types", icon: "🏪" },
  { value: "restaurant", i18nKey: "business_type_restaurant", icon: "🍽️" },
  { value: "pizzeria", i18nKey: "business_type_pizzeria", icon: "🍕" },
  { value: "bakery", i18nKey: "business_type_bakery", icon: "🥖" },
  { value: "ice_cream", i18nKey: "business_type_ice_cream", icon: "🍦" },
  { value: "snack_bar", i18nKey: "business_type_snack_bar", icon: "🍔" },
  { value: "barbecue", i18nKey: "business_type_barbecue", icon: "🥩" },
  { value: "japanese", i18nKey: "business_type_japanese", icon: "🍱" },
  { value: "coffee_shop", i18nKey: "business_type_coffee_shop", icon: "☕" },
  { value: "bar", i18nKey: "business_type_bar", icon: "🍻" },
  { value: "other", i18nKey: "business_type_other", icon: "🏪" }
];

export default function Establishments() {
  const { t } = useTranslation();
  const { 
    establishments, 
    isLoading, 
    error, 
    searchEstablishments,
  } = useEstablishmentSearch();

  // Use optimized filter system
  const {
    filters,
    locationFilter,
    apiFilters,
    metrics,
    ...filterActions
  } = useOptimizedFilters('establishments');
  
  const [favorites, setFavorites] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortByType>('rating_time');
  const countryCode = useMemo(() => inferCountryFromState(locationFilter.activeLocation?.state), [locationFilter.activeLocation]);

  // Search establishments when filters change - debounced and stable
  useEffect(() => {
    // Don't search if no valid API filters are available
    if (!apiFilters) {
      console.log('🚫 No valid API filters, skipping establishment search');
      return;
    }

    const timeoutId = setTimeout(() => {
      console.log('🔍 Searching establishments with filters:', apiFilters);
      searchEstablishments(apiFilters);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [apiFilters, searchEstablishments]); // Simplified dependency

  // Enhanced sorting
  const sortedEstablishments = useMemo(() => {
    const sorted = [...establishments];
    
    switch (sortBy) {
      case "rating_time":
        return sorted.sort((a, b) => {
          const ratingScore = (b.rating || 0) - (a.rating || 0);
          const timeScore = (a.delivery_time_min || 0) - (b.delivery_time_min || 0);
          return (ratingScore * 0.7) + (timeScore * 0.3);
        });
      case "rating":
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case "delivery_time":
        return sorted.sort((a, b) => (a.delivery_time_min || 0) - (b.delivery_time_min || 0));
      case "delivery_fee":
        return sorted.sort((a, b) => (a.delivery_fee || 0) - (b.delivery_fee || 0));
      case "reviews":
        return sorted.sort((a, b) => (b.total_reviews || 0) - (a.total_reviews || 0));
      default:
        return sorted;
    }
  }, [establishments, sortBy]);

  // Favorites management
  const toggleFavorite = useCallback((establishmentId: string) => {
    setFavorites(prev => {
      const isRemoving = prev.includes(establishmentId);
      const establishment = establishments.find(e => e.id === establishmentId);
      
      if (establishment) {
        toast({
          title: isRemoving ? "Removido dos favoritos" : "Adicionado aos favoritos",
          description: `${establishment.business_name} ${isRemoving ? 'foi removido dos' : 'foi adicionado aos'} seus favoritos.`,
        });
      }
      
      return isRemoving 
        ? prev.filter(id => id !== establishmentId)
        : [...prev, establishmentId];
    });
  }, [establishments]);

  return (
    <>
      <SEO 
        title="Restaurantes e Estabelecimentos - Onfoods"
        description="Descubra os melhores restaurantes da sua região no Onfoods. Encontre estabelecimentos próximos, compare avaliações e faça seu pedido online."
        keywords="restaurantes, estabelecimentos, delivery, comida, onfoods, pedidos online"
      />
      <div className="space-y-4 sm:space-y-6">
        

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
              placeholder={t('common:search_establishments_placeholder')}
              value={filters.searchTerm}
              onChange={(e) => filterActions.setSearchTerm(e.target.value)}
              className="pl-10 h-11 rounded-xl bg-muted/50 border-border/50 focus:bg-background transition-colors"
            />
          </div>
          
          {/* Sort and Filter */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortByType)}>
              <SelectTrigger className="h-11 rounded-xl border-border/50">
                <ArrowUpDown className="h-4 w-4 mr-2 text-primary" />
                <SelectValue placeholder={t('common:sort_placeholder')} />
                <ChevronDown className="h-4 w-4 opacity-50" />
              </SelectTrigger>
              <SelectContent className="rounded-xl bg-background border shadow-lg z-[100]">
                <SelectItem value="rating_time">{t('common:sort_rating_time')}</SelectItem>
                <SelectItem value="rating">{t('common:sort_rating')}</SelectItem>
                <SelectItem value="delivery_time">{t('common:sort_delivery_time')}</SelectItem>
                <SelectItem value="delivery_fee">{t('common:sort_delivery_fee')}</SelectItem>
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
                      <Button variant="ghost" size="sm" onClick={filterActions.clearAllFilters} className="text-destructive">
                        <X className="h-4 w-4 mr-1" />
                        {t('common:clear')} ({metrics.activeFiltersCount})
                      </Button>
                    )}
                  </div>
                </SheetHeader>

                <div className="space-y-4 mt-6">
                  {/* Business Type Filter */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{t('common:business_type')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Select 
                        value={filters.businessType || "all"} 
                        onValueChange={filterActions.setBusinessType}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('common:all_types')} />
                        </SelectTrigger>
                        <SelectContent className="bg-background border shadow-lg z-[100] max-h-80">
                          {BUSINESS_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <span>{type.icon}</span>
                                <span>{t(`common:${type.i18nKey}`)}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>

                  {/* Rating and Delivery */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{t('common:rating_and_delivery')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>{t('common:min_rating')}</Label>
                        <Select 
                          value={filters.minRating.toString()} 
                          onValueChange={(value) => filterActions.setMinRating(Number(value))}
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

                      <div className="space-y-2">
                        <Label>{t('common:max_delivery_fee')}</Label>
                        <Select 
                          value={filters.maxDeliveryFee?.toString() || "50"} 
                          onValueChange={(value) => filterActions.setMaxDeliveryFee(Number(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('common:any_fee')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="50">{t('common:any_fee')}</SelectItem>
                            <SelectItem value="0">{t('common:delivery_free')}</SelectItem>
                            <SelectItem value="5">{t('common:up_to_amount', { amount: formatCurrencyByCountry(5, countryCode) })}</SelectItem>
                            <SelectItem value="10">{t('common:up_to_amount', { amount: formatCurrencyByCountry(10, countryCode) })}</SelectItem>
                            <SelectItem value="15">{t('common:up_to_amount', { amount: formatCurrencyByCountry(15, countryCode) })}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>{t('common:max_delivery_time')}</Label>
                        <Select 
                          value={filters.maxDeliveryTime?.toString() || "60"} 
                          onValueChange={(value) => filterActions.setMaxDeliveryTime(Number(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('common:any_time', { defaultValue: 'Qualquer tempo' })} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="60">{t('common:any_time')}</SelectItem>
                            <SelectItem value="30">{t('common:up_to_minutes_30')}</SelectItem>
                            <SelectItem value="45">{t('common:up_to_minutes_45')}</SelectItem>
                            <SelectItem value="60">{t('common:up_to_one_hour')}</SelectItem>
                          </SelectContent>
                        </Select>
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
                        <Label htmlFor="onlyOpen">{t('common:only_open')}</Label>
                        <Switch
                          id="onlyOpen"
                          checked={filters.onlyOpen || false}
                          onCheckedChange={filterActions.setOnlyOpen}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">{t('common:loading_establishments')}</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <Utensils className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t('common:error_loading_establishments')}</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => searchEstablishments({})} variant="outline">
              {t('common:try_again')}
            </Button>
          </div>
        ) : sortedEstablishments.length > 0 ? (
          <>
            {/* Results Summary */}
            <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3 mb-4">
              <div className="flex items-center space-x-2">
                <Utensils className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  {t('common:establishments_found_count', { count: sortedEstablishments.length })}
                </span>
              </div>
              {locationFilter.activeLocation && (
                <span className="text-xs text-muted-foreground">
                  📍 {locationFilter.activeLocation.city}, {locationFilter.activeLocation.state}
                </span>
              )}
            </div>

            {/* Establishments Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {sortedEstablishments.map((establishment) => (
                <UnifiedEstablishmentCard 
                  key={establishment.id}
                  establishment={establishment}
                  onFavoriteToggle={toggleFavorite}
                  isFavorite={favorites.includes(establishment.id)}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Utensils className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {locationFilter.activeLocation 
                ? t('common:establishments_none_in_city', { city: locationFilter.activeLocation.city, state: locationFilter.activeLocation.state })
                : t('common:establishments_none_title')
              }
            </h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              {locationFilter.activeLocation 
                ? t('common:establishments_none_desc_with_location')
                : t('common:establishments_none_desc')
              }
            </p>
            {!locationFilter.activeLocation ? (
              <div className="text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4 max-w-md mx-auto">
                <p className="font-medium">{t('common:location_required_title')}</p>
                <p>{t('common:location_required_establishments_hint')}</p>
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
        )}
      </div>
    </>
  );
}
