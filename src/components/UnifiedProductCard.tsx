import { useState, memo, useCallback } from "react";
import i18n from "@/i18n";
import { formatCurrency } from "@/utils/formatting";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Eye, ShoppingCart, Plus, Minus, Heart, Share2, MapPin, Timer, TrendingUp } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/hooks/useCart";
import LazyImage from "@/components/LazyImage";

interface UnifiedProductCardProps {
  product: {
    id: string;
    name: string;
    description?: string;
    image_url?: string;
    price: number;
    rating?: number;
    total_reviews?: number;
    category_name?: string;
    establishment?: {
      id: string;
      business_name: string;
      phone?: string;
    };
    is_available?: boolean;
    preparation_time?: number;
    ingredients?: string[];
    discount_percentage?: number;
  };
  onAddToCart?: (productId: string, quantity: number) => void;
  onFavoriteToggle?: (id: string, isFavorite: boolean) => void;
  isFavorite?: boolean;
  showTrending?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
}

export const UnifiedProductCard = memo(({ 
  product, 
  onAddToCart, 
  onFavoriteToggle, 
  isFavorite: initialFavorite = false,
  showTrending = false,
  variant = 'default'
}: UnifiedProductCardProps) => {
  const [quantity, setQuantity] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  
  const { isAuthenticated } = useAuth();
  const { addToCart: addToCartHook } = useCart();
  const navigate = useNavigate();

  const addToCart = useCallback(async () => {
    if (!isAuthenticated) {
      toast({
        title: i18n.t('common:login_required_title'),
        description: i18n.t('common:login_required_desc'),
        action: (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/auth')}
          >
            {i18n.t('common:login')}
          </Button>
        ),
      });
      return;
    }

    if (product.is_available === false) {
      toast({
        title: i18n.t('common:unavailable_label'),
        description: i18n.t('common:product_unavailable_desc', { defaultValue: 'Este produto não está disponível no momento.' }),
        variant: "destructive",
      });
      return;
    }

    try {
      setIsAddingToCart(true);
      
      if (onAddToCart) {
        onAddToCart(product.id, quantity);
      } else {
        await addToCartHook(product.id, quantity);
      }
      
      toast({
        title: i18n.t('common:product_added_title', { defaultValue: 'Produto adicionado!' }),
        description: i18n.t('common:product_added_desc', { count: quantity, name: product.name, defaultValue: `${quantity}x ${product.name} foi adicionado ao seu carrinho.` }),
      });
    } catch (error) {
      console.error('Erro ao adicionar ao carrinho:', error);
      toast({
        title: i18n.t('common:error_add_product_title', { defaultValue: 'Erro ao adicionar produto' }),
        description: i18n.t('common:error_add_product_desc', { defaultValue: 'Tente novamente em alguns segundos.' }),
        variant: "destructive",
      });
    } finally {
      setIsAddingToCart(false);
    }
  }, [isAuthenticated, navigate, onAddToCart, product.id, product.name, quantity, addToCartHook, product.is_available]);

  const increaseQuantity = useCallback(() => setQuantity(prev => Math.min(prev + 1, 10)), []);
  const decreaseQuantity = useCallback(() => setQuantity(prev => Math.max(1, prev - 1)), []);

  const toggleFavorite = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newFavoriteState = !isFavorite;
    setIsFavorite(newFavoriteState);
    onFavoriteToggle?.(product.id, newFavoriteState);
    
      toast({
        title: newFavoriteState 
          ? i18n.t('common:favorite_added_title') 
          : i18n.t('common:favorite_removed_title'),
        description: newFavoriteState 
          ? i18n.t('common:favorite_added_desc', { name: product.name })
          : i18n.t('common:favorite_removed_desc', { name: product.name }),
      });
  }, [isFavorite, onFavoriteToggle, product.id, product.name]);

  if (!product?.id) return null;

  const hasRating = product.total_reviews && product.total_reviews > 0;
  const hasDiscount = product.discount_percentage && product.discount_percentage > 0;
  const originalPrice = hasDiscount ? product.price / (1 - product.discount_percentage / 100) : product.price;

  const formatPrice = (price: number) => formatCurrency(price);

  // Compact variant for mobile lists
  if (variant === 'compact') {
    return (
      <Card className="overflow-hidden hover:shadow-md transition-shadow border-border/50">
        <div className="flex gap-3 p-3">
          <div className="relative w-16 h-16 flex-shrink-0">
            <LazyImage
              src={product.image_url || "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=200&q=80"}
              alt={product.name}
              className="w-full h-full object-cover rounded-lg"
            />
            {!product.is_available && (
              <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                <span className="text-xs text-white font-medium">{i18n.t('common:unavailable_label')}</span>
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm line-clamp-1">{product.name}</h3>
            <p className="text-xs text-muted-foreground line-clamp-1">{product.description}</p>
            
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-primary">{formatPrice(product.price)}</span>
                {hasRating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs">{product.rating?.toFixed(1)}</span>
                  </div>
                )}
              </div>
              
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3"
                disabled={!product.is_available || isAddingToCart}
                onClick={addToCart}
              >
                <ShoppingCart className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Default variant
  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-card border-border/50 rounded-xl">
      <CardHeader className="p-0 relative">
        <div className="relative h-44 sm:h-52 w-full overflow-hidden rounded-t-xl">
          <LazyImage
            src={product.image_url || "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=600&q=80"}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10" />
          
          {!product.is_available && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm">
              <Badge variant="destructive" className="text-sm px-4 py-2 font-semibold shadow-lg">
                {i18n.t('common:unavailable_label')}
              </Badge>
            </div>
          )}

          {showTrending && (
            <div className="absolute top-3 left-3">
              <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-xs px-2.5 py-1 rounded-full shadow-lg">
                <TrendingUp className="h-3 w-3 mr-1" />
                {i18n.t('common:trending_label')}
              </Badge>
            </div>
          )}

          {hasDiscount && (
            <div className="absolute top-3 left-3">
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-xs px-2.5 py-1 rounded-full shadow-lg">
                -{product.discount_percentage}%
              </Badge>
            </div>
          )}

          <div className="absolute bottom-3 left-3">
            <div className="flex flex-col items-start gap-1">
              {hasDiscount && (
                <Badge variant="secondary" className="text-xs line-through bg-white/70 text-gray-600 px-2 py-0.5 rounded">
                  {formatPrice(originalPrice)}
                </Badge>
              )}
              <Badge className={`text-white font-bold text-base px-3 py-1.5 shadow-lg rounded-full ${
                hasDiscount 
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600' 
                  : 'bg-gradient-to-r from-primary to-primary/80'
              }`}>
                {formatPrice(product.price)}
              </Badge>
            </div>
          </div>

          <div className="absolute top-3 right-3 z-10 flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className={`bg-white/95 backdrop-blur-sm rounded-full h-9 w-9 p-0 shadow-lg transition-all duration-200 hover:scale-105 ${
                isFavorite 
                  ? 'text-red-500 hover:text-red-600' 
                  : 'text-gray-600 hover:text-red-500'
              }`}
              onClick={toggleFavorite}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        <div className="space-y-2">
          <h3 className="font-bold text-lg leading-tight text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              {hasRating ? (
                <div className="flex items-center space-x-1 bg-yellow-50 px-2 py-1 rounded-full">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-semibold text-yellow-700">{product.rating?.toFixed(1)}</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                  <Star className="h-3.5 w-3.5" />
                  <span className="text-xs">{i18n.t('common:new_label')}</span>
                </div>
              )}
            </div>
            
            {product.preparation_time && (
              <div className="flex items-center space-x-1 text-xs text-muted-foreground bg-orange-50 px-2 py-1 rounded-full">
                <Timer className="h-3 w-3 text-orange-600" />
                <span className="text-orange-700 font-medium">{product.preparation_time} min</span>
              </div>
            )}
          </div>

          {product.description && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {product.description}
            </p>
          )}

          {product.establishment?.id && (
            <Link 
              to={`/establishments/${product.establishment.id}`}
              className="inline-flex items-center space-x-1 text-sm text-primary hover:text-primary/80 font-medium transition-colors bg-primary/5 px-2 py-1 rounded-lg hover:bg-primary/10"
            >
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{product.establishment.business_name}</span>
            </Link>
          )}
        </div>

        <div className="bg-muted/20 rounded-xl p-3 border border-muted/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">{i18n.t('common:quantity_label')}</span>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={decreaseQuantity}
                disabled={quantity <= 1}
                className="h-8 w-8 p-0 rounded-full"
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span className="w-8 text-center text-base font-bold">{quantity}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={increaseQuantity}
                disabled={quantity >= 10}
                className="h-8 w-8 p-0 rounded-full"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-muted/30 pt-3">
            <span className="text-sm font-semibold">{i18n.t('common:total_label')}</span>
            <span className="text-lg font-bold text-primary">
              {formatPrice(product.price * quantity)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-11 rounded-xl font-medium"
          >
            <Link to={`/products/${product.id}`}>
              <Eye className="h-4 w-4 mr-2" />
              {i18n.t('common:details_button_full')}
            </Link>
          </Button>
          <Button
            size="sm"
            className="h-11 bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 font-bold shadow-lg rounded-xl"
            disabled={!product.is_available || isAddingToCart}
            onClick={addToCart}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            {isAddingToCart ? "..." : i18n.t('common:add_to_cart')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});
