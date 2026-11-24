import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useHomePage } from "@/hooks/useHomePage";

import { useGeolocation } from "@/hooks/useGeolocation";
import { useFeaturedEstablishments } from "@/hooks/useFeaturedEstablishments";
import { useTrendingProducts } from "@/hooks/useTrendingProducts";
import { getLocationWithGPS, parseLocationString, isValidLocation } from "@/utils/locationUtils";
import { SimplifiedHero } from "@/components/home/SimplifiedHero";
import { HomeLoadingSkeleton } from "@/components/home/LoadingSkeleton";
import { StatsSection } from "@/components/home/StatsSection";
import { FeaturedEstablishmentsCarousel } from "@/components/home/FeaturedEstablishmentsCarousel";
import { TrendingProductsCarousel } from "@/components/home/TrendingProductsCarousel";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, Sparkles, ArrowRight, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function Home() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedLocation, setSelectedLocation] = useState("");
  const { location: gpsLocation, requestLocation, isLoading: gpsLoading } = useGeolocation();
  const { featuredEstablishments, popularProducts, stats, isLoading: homeLoading, error: homeError } = useHomePage(gpsLocation);

  // Preparar filtros de localização
  const locationFilter = useMemo(() => {
    const parsed = parseLocationString(selectedLocation);
    if (parsed && isValidLocation(parsed)) {
      return { city: parsed.city, state: parsed.state };
    }
    if (gpsLocation?.city && gpsLocation?.state) {
      return { city: gpsLocation.city, state: gpsLocation.state };
    }
    return undefined;
  }, [selectedLocation, gpsLocation]);

  // Hooks para os carrosséis
  const { 
    establishments: featuredEstablishmentsCarousel, 
    isLoading: establishmentsLoading 
  } = useFeaturedEstablishments(locationFilter);
  
  const { 
    products: trendingProductsCarousel, 
    isLoading: productsLoading 
  } = useTrendingProducts(locationFilter);

  const handleCategorySelect = (category: string) => {
    const searchParams = new URLSearchParams();
    searchParams.set('category', category);
    
    const searchLocation = selectedLocation || getLocationWithGPS('', gpsLocation);
    if (searchLocation) {
      searchParams.set('location', searchLocation);
    }
    
    navigate(`/products?${searchParams.toString()}`);
  };

  const handleLocationSearch = (location: string) => {
    setSelectedLocation(location);
  };

  if (homeLoading) {
    return <HomeLoadingSkeleton />;
  }

  const showHomeWarning = !!homeError;

  // Redirect establishment users to their dashboard
  if (user?.type === 'establishment') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-4 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-6">
            <ChevronRight className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-2">{t('common:home_est_welcome_title', { name: user.name })}</h1>
            <p className="text-gray-600 mb-6">{t('common:home_est_welcome_desc')}</p>
          </div>
          <Button asChild className="w-full">
            <Link to="/establishment-dashboard">
              {t('common:home_go_to_dashboard_button')}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title={t('common:seo_home_title')}
        description={t('common:seo_home_desc')}
        keywords={t('common:seo_home_keywords')}
      />
      
      <div className="min-h-screen safe-area-top safe-area-bottom">
        {showHomeWarning && (
          <div className="container mx-auto px-4 pt-6">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-red-100 text-red-600 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold">{t('common:home_error_title')}</div>
                    <div className="text-sm text-gray-600">{homeError}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => window.location.reload()}>{t('common:retry_button')}</Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/system-status">{t('common:view_system_status_button')}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        {/* Simplified Hero Section */}
        <SimplifiedHero
          onCategorySelect={handleCategorySelect}
          onLocationSearch={handleLocationSearch}
          gpsLocation={gpsLocation}
          gpsLoading={gpsLoading}
          onRequestLocation={requestLocation}
        />

        {/* Content Sections */}
        <div className="container mx-auto px-4 py-12 space-y-16">
          
          {/* Featured Establishments Carousel */}
          <section className="animate-fade-in">
            <FeaturedEstablishmentsCarousel 
              establishments={featuredEstablishmentsCarousel}
              isLoading={establishmentsLoading}
              activeLocation={locationFilter}
            />
          </section>

          {/* Trending Products Carousel */}
          <section className="animate-fade-in [animation-delay:200ms]">
            <TrendingProductsCarousel 
              products={trendingProductsCarousel}
              isLoading={productsLoading}
            />
          </section>


          {/* Stats Section */}
          {stats && (
            <section className="animate-fade-in [animation-delay:600ms]">
              <StatsSection stats={stats} />
            </section>
          )}

          {/* Call to Action */}
          <section className="animate-fade-in [animation-delay:800ms]">
            <Card className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0">
              <CardContent className="text-center py-12">
                <Sparkles className="h-12 w-12 mx-auto mb-4 text-white/80" />
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  {t('common:home_cta_title')}
                </h2>
                <p className="text-lg text-white/90 mb-6 max-w-2xl mx-auto">
                  {t('common:home_cta_subtitle')}
                </p>
                <Button size="lg" variant="secondary" asChild>
                  <Link to="/products">
                    {t('common:home_cta_button')}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </>
  );
}
