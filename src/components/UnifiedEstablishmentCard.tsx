import { useState, memo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Clock, MapPin, Eye, MessageSquare, CreditCard, ShoppingBag, Truck, Timer, Heart, Zap } from "lucide-react";
import { formatOpeningHours } from "@/utils/openingHours";
import { getEstablishmentTypeData } from "@/utils/establishmentTypes";
import LazyImage from "@/components/LazyImage";
import i18n from "@/i18n";

interface UnifiedEstablishmentCardProps {
  establishment: {
    id: string;
    business_name: string;
    business_type?: string | null;
    banner_url?: string | null;
    address?: string | null;
    phone?: string | null;
    rating: number;
    total_reviews: number;
    delivery_time_min: number;
    delivery_time_max: number;
    delivery_fee: number;
    is_active: boolean;
    opening_hours?: any;
    payment_gateway?: string;
  };
  onFavoriteToggle?: (id: string, isFavorite: boolean) => void;
  isFavorite?: boolean;
  variant?: 'default' | 'compact' | 'hero';
}

export const UnifiedEstablishmentCard = memo(({ 
  establishment, 
  onFavoriteToggle, 
  isFavorite: initialFavorite = false,
  variant = 'default'
}: UnifiedEstablishmentCardProps) => {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);

  const formatDeliveryTime = useCallback(() => {
    if (establishment.delivery_time_min === establishment.delivery_time_max) {
      return `${establishment.delivery_time_min}min`;
    }
    return `${establishment.delivery_time_min}-${establishment.delivery_time_max}min`;
  }, [establishment.delivery_time_min, establishment.delivery_time_max]);

  const businessData = getEstablishmentTypeData(establishment.business_type);
  const hasRating = establishment.total_reviews > 0;
  const isFastDelivery = establishment.delivery_time_max <= 30;
  const isFreeDelivery = establishment.delivery_fee === 0;

  const toggleFavorite = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newFavoriteState = !isFavorite;
    setIsFavorite(newFavoriteState);
    onFavoriteToggle?.(establishment.id, newFavoriteState);
  }, [establishment.id, isFavorite, onFavoriteToggle]);

  // Compact variant for lists
  if (variant === 'compact') {
    return (
      <Card className="overflow-hidden hover:shadow-md transition-shadow border-border/50">
        <div className="flex gap-3 p-3">
          <div className="relative w-16 h-16 flex-shrink-0">
            <LazyImage
              src={establishment.banner_url || "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=200&q=80"}
              alt={establishment.business_name}
              className="w-full h-full object-cover rounded-lg"
            />
            {!establishment.is_active && (
              <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                <span className="text-xs text-white font-medium">{i18n.t('common:establishment_status_closed')}</span>
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm line-clamp-1">{establishment.business_name}</h3>
            <p className="text-xs text-muted-foreground">{businessData.label}</p>
            
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                {hasRating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs">{establishment.rating.toFixed(1)}</span>
                  </div>
                )}
                <span className="text-xs text-muted-foreground">{formatDeliveryTime()}</span>
              </div>
              
              <Button asChild size="sm" variant="outline" className="h-7 px-2 text-xs">
                <Link to={`/establishments/${establishment.id}`}>
                  {i18n.t('common:details_button_short')}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Hero variant for featured establishments
  if (variant === 'hero') {
    return (
      <Card className="group relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 bg-card border-0 rounded-2xl">
        <CardHeader className="p-0 relative">
          <div className="relative h-60 w-full overflow-hidden rounded-t-2xl">
            <LazyImage
              src={establishment.banner_url || "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800&q=80"}
              alt={`${establishment.business_name} - ${businessData.label}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <h3 className="font-bold text-xl mb-2 line-clamp-2">{establishment.business_name}</h3>
              <div className="flex items-center gap-3 mb-3">
                {hasRating && (
                  <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-semibold">{establishment.rating.toFixed(1)}</span>
                  </div>
                )}
                <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30">
                  {businessData.emoji} {businessData.label}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge className={`${isFreeDelivery ? 'bg-green-500' : 'bg-primary'} text-white font-medium`}>
                  <Truck className="h-3 w-3 mr-1" />
                  {isFreeDelivery ? 'Grátis' : `R$ ${establishment.delivery_fee.toFixed(2)}`}
                </Badge>
                <Badge className="bg-white/20 backdrop-blur-sm text-white">
                  <Timer className="h-3 w-3 mr-1" />
                  {formatDeliveryTime()}
                </Badge>
              </div>
            </div>

            <div className="absolute top-4 right-4">
              <Button
                variant="ghost"
                size="sm"
                className={`bg-white/20 backdrop-blur-sm rounded-full h-10 w-10 p-0 border border-white/30 ${
                  isFavorite ? 'text-red-400' : 'text-white hover:text-red-400'
                }`}
                onClick={toggleFavorite}
              >
                <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <Button asChild size="lg" className="w-full h-12 text-base font-semibold">
            <Link to={`/establishments/${establishment.id}`}>
              <ShoppingBag className="h-5 w-5 mr-2" />
              Ver Cardápio
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Default variant
  return (
    <Card className="group relative overflow-hidden transition-all duration-500 hover:shadow-xl hover:-translate-y-2 bg-card border rounded-xl animate-fade-in hover:border-primary/20">
      <CardHeader className="p-0 relative">
        <div className="relative h-44 w-full overflow-hidden rounded-t-xl">
          <LazyImage
            src={establishment.banner_url || "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800&q=80"}
            alt={`${establishment.business_name} - ${businessData.label}`}
            className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-110"
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent transition-opacity duration-300 group-hover:from-black/50" />
          
          {!establishment.is_active && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center backdrop-blur-md transition-all duration-300">
              <Badge variant="destructive" className="text-sm px-4 py-2 shadow-lg font-semibold rounded-full animate-pulse">
                {i18n.t('common:establishment_status_closed')}
              </Badge>
            </div>
          )}

          <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 transition-all duration-300 group-hover:scale-105">
            <Badge className="text-xs px-3 py-1.5 bg-background/95 text-foreground rounded-full font-medium backdrop-blur-sm shadow-sm transition-all duration-300 hover:bg-primary hover:text-primary-foreground">
              {businessData.emoji} {businessData.label}
            </Badge>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className={`bg-background/95 backdrop-blur-sm rounded-full h-9 w-9 p-0 shadow-md transition-all duration-300 hover:scale-110 hover:shadow-lg ${
                  isFavorite ? 'text-red-500 hover:text-red-600 bg-red-50/95' : 'text-muted-foreground hover:text-red-500 hover:bg-red-50/95'
                }`}
                onClick={toggleFavorite}
              >
                <Heart className={`h-4 w-4 transition-all duration-300 ${isFavorite ? 'fill-current scale-110' : 'hover:scale-110'}`} />
              </Button>
              
              <Badge 
                className={`text-xs px-3 py-1.5 rounded-full font-medium backdrop-blur-sm shadow-sm transition-all duration-300 ${
                  establishment.is_active 
                    ? 'bg-green-500/90 text-white hover:bg-green-500' 
                    : 'bg-red-500/90 text-white hover:bg-red-500'
                }`}
              >
                {establishment.is_active ? `🟢 ${i18n.t('common:establishment_status_open')}` : `🔴 ${i18n.t('common:establishment_status_closed')}`}
              </Badge>
            </div>
          </div>

          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 transition-all duration-300 group-hover:scale-105">
            <div className="flex gap-2">
              <Badge className={`text-xs px-3 py-1.5 rounded-full font-medium backdrop-blur-sm shadow-sm transition-all duration-300 hover:scale-105 ${
                isFreeDelivery
                  ? 'bg-green-500/90 text-white hover:bg-green-500' 
                  : 'bg-primary/90 text-primary-foreground hover:bg-primary'
              }`}>
                <Truck className="h-3 w-3 mr-1" />
                {isFreeDelivery ? `🆓 ${i18n.t('common:delivery_free')}` : `💰 R$ ${establishment.delivery_fee.toFixed(2)}`}
              </Badge>
              
              {isFastDelivery && (
                <Badge className="bg-orange-500/90 text-white text-xs px-3 py-1.5 rounded-full font-medium backdrop-blur-sm shadow-sm transition-all duration-300 hover:scale-105 hover:bg-orange-500">
                  <Zap className="h-3 w-3 mr-1" />
                  ⚡ Rápido
                </Badge>
              )}
            </div>

            <Badge className="bg-background/95 text-foreground text-xs px-3 py-1.5 rounded-full font-medium backdrop-blur-sm shadow-sm transition-all duration-300 hover:scale-105">
              <Timer className="h-3 w-3 mr-1" />
              {formatDeliveryTime()}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-4">
        <div className="space-y-3">
          <h3 className="font-bold text-xl leading-tight text-foreground line-clamp-2 group-hover:text-primary transition-all duration-300 hover:scale-[1.02]">
            {establishment.business_name}
          </h3>

          <div className="flex items-center gap-3">
            {hasRating ? (
              <>
                <div className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-50 to-orange-50 px-3 py-2 rounded-xl border border-yellow-200/50 shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-md">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 animate-pulse" />
                  <span className="text-sm font-bold text-yellow-700">{establishment.rating.toFixed(1)}</span>
                </div>
                <span className="text-sm text-muted-foreground bg-muted/50 px-2 py-1 rounded-lg transition-all duration-300 hover:bg-muted">
                  ({establishment.total_reviews} {establishment.total_reviews === 1 ? 'avaliação' : 'avaliações'})
                </span>
              </>
            ) : (
              <div className="flex items-center gap-1.5 text-muted-foreground bg-gradient-to-r from-muted to-muted/50 px-3 py-2 rounded-xl border transition-all duration-300 hover:scale-105">
                <Star className="h-4 w-4" />
                <span className="text-sm font-medium">🆕 Novo</span>
              </div>
            )}
          </div>
        </div>

        {establishment.payment_gateway && (
          <div className="flex gap-2 flex-wrap">
            {establishment.payment_gateway === 'whatsapp' && (
              <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200 px-3 py-1.5 rounded-full font-medium transition-all duration-300 hover:scale-105 hover:bg-green-100">
                <MessageSquare className="h-3 w-3 mr-1" />
                💬 WhatsApp
              </Badge>
            )}
            {(establishment.payment_gateway === 'stripe' || establishment.payment_gateway === 'mercado_pago') && (
              <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-200 px-3 py-1.5 rounded-full font-medium transition-all duration-300 hover:scale-105 hover:bg-blue-100">
                <CreditCard className="h-3 w-3 mr-1" />
                💳 Cartão
              </Badge>
            )}
          </div>
        )}

        {establishment.address && (
          <div className="flex items-start gap-3 text-sm text-muted-foreground bg-gradient-to-r from-muted/30 to-muted/50 rounded-xl p-4 border transition-all duration-300 hover:scale-[1.02] hover:shadow-sm">
            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary animate-pulse" />
            <span className="line-clamp-2 leading-relaxed">{establishment.address}</span>
          </div>
        )}

        {establishment.opening_hours && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground bg-gradient-to-r from-muted/30 to-muted/50 rounded-xl p-4 border transition-all duration-300 hover:scale-[1.02] hover:shadow-sm">
            <Clock className="h-4 w-4 flex-shrink-0 text-primary animate-pulse" />
            <span className="font-medium">{formatOpeningHours(establishment.opening_hours)}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-3">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-11 rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-md border-2 hover:border-primary/50"
          >
            <Link to={`/establishments/${establishment.id}`}>
              <Eye className="h-4 w-4 mr-2" />
              {i18n.t('common:details_button_full')}
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            className={`h-11 rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg ${
              establishment.is_active 
                ? 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-md' 
                : 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
            }`}
            disabled={!establishment.is_active}
          >
            <Link 
              to={`/establishments/${establishment.id}`} 
              className={!establishment.is_active ? 'pointer-events-none' : ''}
              tabIndex={!establishment.is_active ? -1 : 0}
            >
              <ShoppingBag className="h-4 w-4 mr-2" />
              {establishment.is_active ? `🛒 ${i18n.t('common:menu_label', { defaultValue: 'Cardápio' })}` : `🚫 ${i18n.t('common:closed_status_label', { defaultValue: 'Fechado' })}`}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});
