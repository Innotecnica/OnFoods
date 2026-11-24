import { useState, memo, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UnifiedProductCard } from "@/components/UnifiedProductCard";
import { StarRating } from "@/components/rating/StarRating";
import { ImageGalleryModal } from "@/components/modals/ImageGalleryModal";
import { ReviewModal } from "@/components/modals/ReviewModal";
import { ShareModal } from "@/components/modals/ShareModal";
import { EstablishmentMapModal } from "@/components/modals/EstablishmentMapModal";
import { Breadcrumb } from "@/components/navigation/Breadcrumb";
import { useEstablishmentDetail } from "@/hooks/useEstablishmentDetail";
import { useEstablishmentDetailProducts } from "@/hooks/useEstablishmentDetailProducts";
import { useEstablishmentReviews } from "@/hooks/useReviews";
import { useIsMobile } from "@/hooks/useIsMobile";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/hooks/useCart";
import { formatOpeningHours } from "@/utils/openingHours";
import { 
  MapPin, 
  Clock, 
  Star,
  Heart,
  Share2,
  Camera,
  MessageSquare,
  Search,
  Filter,
  Map,
  Navigation,
  ShoppingCart,
  Loader2,
  Truck,
  Package,
  Phone,
  Timer,
  DollarSign,
  Users,
  Grid3X3,
  SortAsc,
  Info,
  ImageIcon,
  Store,
  TrendingUp,
  Shield,
  ArrowLeft,
  ChevronRight,
  CalendarDays,
  Utensils,
  Sparkles,
  Award,
  Zap,
  ThumbsUp,
  Eye,
  CreditCard,
  MapPin as Location
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BaseEstablishment, ProductWithCategory } from "@/types";
import type { Review as EstablishmentReview } from "@/hooks/useReviews";

// Enhanced Hero Component with Modern Design
const EstablishmentHero = memo(({ establishment, isFavorite, onToggleFavorite, onShare }: {
  establishment: BaseEstablishment;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onShare: () => void;
}) => {
  const { isMobile } = useIsMobile();

  return (
    <div className="relative group">
      {/* Enhanced Hero Image with Modern Gradient Overlays */}
      <div className="relative h-[300px] sm:h-[400px] lg:h-[500px] rounded-3xl overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-accent/20 z-10" />
        <picture className="w-full h-full">
          <source 
            srcSet={`${establishment.banner_url || "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b"}?w=1920&q=80&format=avif`} 
            type="image/avif" 
          />
          <source 
            srcSet={`${establishment.banner_url || "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b"}?w=1920&q=80&format=webp`} 
            type="image/webp" 
          />
          <img
            src={`${establishment.banner_url || "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b"}?w=1920&q=80`}
            alt={`${establishment.business_name} - Cover`}
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            loading="eager"
            sizes="100vw"
          />
        </picture>
        
        {/* Modern Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-20" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/30 z-20" />
        
        {/* Navigation Controls - Floating Design */}
        <div className="absolute top-6 left-6 right-6 flex justify-between items-start z-30">
          <Link to="/establishments">
            <Button
              size="sm"
              variant="ghost"
              className="glass border-white/20 text-white hover:bg-white/20 h-12 w-12 p-0 rounded-2xl transition-all duration-300 hover:scale-110 shadow-xl backdrop-blur-xl"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>

          <div className="flex gap-3">
            <Button
              size="sm"
              variant="ghost"
              className={`glass border-white/20 text-white hover:bg-white/20 h-12 w-12 p-0 rounded-2xl transition-all duration-300 hover:scale-110 shadow-xl backdrop-blur-xl ${
                isFavorite ? 'bg-red-500/20 border-red-300/30' : ''
              }`}
              onClick={onToggleFavorite}
              aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            >
              <Heart className={`h-5 w-5 transition-all duration-300 ${isFavorite ? 'fill-current text-red-400 animate-pulse' : ''}`} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="glass border-white/20 text-white hover:bg-white/20 h-12 w-12 p-0 rounded-2xl transition-all duration-300 hover:scale-110 shadow-xl backdrop-blur-xl"
              onClick={onShare}
              aria-label="Compartilhar estabelecimento"
            >
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Hero Content - Modern Layout */}
        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8 z-30">
          <div className="space-y-6 animate-fade-in" style={{ animationDelay: '0.5s' }}>
            {/* Status and Category Badges */}
            <div className="flex flex-wrap items-center gap-3">
              <Badge 
                variant={establishment.is_active ? "default" : "destructive"} 
                className={`glass backdrop-blur-xl font-bold text-sm px-4 py-2.5 rounded-2xl shadow-lg border transition-all duration-300 hover:scale-105 ${
                  establishment.is_active 
                    ? 'bg-green-500/20 border-green-300/30 text-green-100 shadow-green-500/25' 
                    : 'bg-red-500/20 border-red-300/30 text-red-100 shadow-red-500/25'
                }`}
              >
                <div className={`w-2 h-2 rounded-full mr-2 ${establishment.is_active ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
                {establishment.is_active ? "Aberto agora" : "Fechado"}
              </Badge>
              <Badge className="glass text-white border-white/30 font-medium px-4 py-2 text-sm rounded-2xl shadow-lg transition-all duration-300 hover:scale-105 hover:bg-white/10 backdrop-blur-xl">
                <Store className="h-4 w-4 mr-2" />
                {establishment.business_type || "Estabelecimento"}
              </Badge>
            </div>
            
            {/* Enhanced Title */}
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-white leading-tight drop-shadow-2xl bg-gradient-to-r from-white to-white/90 bg-clip-text">
                {establishment.business_name}
              </h1>
              {establishment.description && (
                <p className="text-white/90 text-lg max-w-2xl leading-relaxed drop-shadow-lg line-clamp-2">
                  {establishment.description}
                </p>
              )}
            </div>
            
            {/* Key Stats - Modern Card Design */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass border-white/20 rounded-2xl px-4 py-4 transition-all duration-300 hover:bg-white/10 hover:scale-105 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="bg-yellow-500/20 p-2 rounded-xl">
                    <Star className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <StarRating rating={establishment.rating || 0} readonly size="sm" />
                      <span className="font-bold text-white text-lg">{(establishment.rating || 0).toFixed(1)}</span>
                    </div>
                    <span className="text-white/70 text-sm">({establishment.total_reviews || 0} avaliações)</span>
                  </div>
                </div>
              </div>
              
              <div className="glass border-white/20 rounded-2xl px-4 py-4 transition-all duration-300 hover:bg-white/10 hover:scale-105 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-500/20 p-2 rounded-xl">
                    <Timer className="h-5 w-5 text-orange-400" />
                  </div>
                  <div>
                    <span className="font-bold text-white text-lg">{establishment.delivery_time_min || 30}-{establishment.delivery_time_max || 60}min</span>
                    <p className="text-white/70 text-sm">Tempo de entrega</p>
                  </div>
                </div>
              </div>
              
              <div className="glass border-white/20 rounded-2xl px-4 py-4 transition-all duration-300 hover:bg-white/10 hover:scale-105 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="bg-green-500/20 p-2 rounded-xl">
                    <Truck className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <span className="font-bold text-white text-lg">
                      {establishment.delivery_fee === 0 ? 'Grátis' : `R$ ${establishment.delivery_fee.toFixed(2)}`}
                    </span>
                    <p className="text-white/70 text-sm">Taxa de entrega</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Cards - Modern Design */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        <Card className="group hover:shadow-2xl hover:border-primary/30 transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardContent className="p-6 text-center">
            <div className="bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              <Timer className="h-8 w-8 text-primary" />
            </div>
            <p className="text-lg font-bold text-foreground">{establishment.delivery_time_min || 30}-{establishment.delivery_time_max || 60}min</p>
            <p className="text-sm text-muted-foreground">Tempo estimado</p>
          </CardContent>
        </Card>
        
        <Card className="group hover:shadow-2xl hover:border-primary/30 transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardContent className="p-6 text-center">
            <div className="bg-gradient-to-br from-green-500/10 to-green-500/20 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-lg font-bold text-foreground">
              {establishment.delivery_fee === 0 ? 'Grátis' : `R$ ${establishment.delivery_fee.toFixed(2)}`}
            </p>
            <p className="text-sm text-muted-foreground">Taxa de entrega</p>
          </CardContent>
        </Card>
        
        <Card className="group hover:shadow-2xl hover:border-primary/30 transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardContent className="p-6 text-center">
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/20 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              <Package className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-lg font-bold text-foreground">R$ {(establishment.minimum_order || 0).toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">Pedido mínimo</p>
          </CardContent>
        </Card>
        
        <Card className="group hover:shadow-2xl hover:border-primary/30 transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <Link to="/cart">
              <Button 
                className={`w-full h-full bg-gradient-primary hover:shadow-2xl font-bold text-base transition-all duration-300 hover:scale-105 min-h-[120px] flex flex-col gap-3 rounded-2xl ${
                  !establishment.is_active ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={!establishment.is_active}
                size="lg"
              >
                <ShoppingCart className="h-8 w-8" />
                <span>{establishment.is_active ? 'Ver Carrinho' : 'Indisponível'}</span>
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

// Enhanced Loading Component
const LoadingEstablishment = () => (
  <div className="min-h-screen bg-background flex items-center justify-center p-4">
    <Card className="p-8 text-center max-w-md w-full shadow-2xl border-0">
      <div className="space-y-6">
        <div className="h-16 w-16 rounded-full bg-gradient-primary/20 flex items-center justify-center mx-auto animate-bounce-in">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <div className="space-y-3">
          <div className="h-6 bg-muted rounded-xl animate-shimmer"></div>
          <div className="h-4 bg-muted/60 rounded-lg w-3/4 mx-auto animate-shimmer"></div>
        </div>
        <p className="text-sm text-muted-foreground">Carregando estabelecimento...</p>
      </div>
    </Card>
  </div>
);

// Enhanced Error Component
const EstablishmentError = ({ error }: { error: string }) => (
  <div className="min-h-screen bg-background flex items-center justify-center p-4">
    <Card className="p-8 text-center max-w-md w-full shadow-2xl border-0">
      <div className="space-y-6">
        <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <MapPin className="h-10 w-10 text-destructive" />
        </div>
        <div>
          <h3 className="text-xl font-bold mb-3">Estabelecimento não encontrado</h3>
          <p className="text-muted-foreground text-sm mb-6 leading-relaxed">{error || "O estabelecimento que você procura não existe ou não está mais disponível."}</p>
        </div>
        <Link to="/establishments">
          <Button variant="outline" className="w-full hover:scale-105 transition-transform h-12 rounded-xl">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar aos Estabelecimentos
          </Button>
        </Link>
      </div>
    </Card>
  </div>
);

// Enhanced Products Section
interface ProductsSectionProps {
  products: ProductWithCategory[];
  productsLoading: boolean;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedCategory: string;
  setSelectedCategory: (value: string) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
  categories: string[];
  onAddToCart: (productId: string, quantity: number) => void;
  establishment: BaseEstablishment;
}

const ProductsSection = memo(({ 
  products, 
  productsLoading, 
  searchTerm, 
  setSearchTerm, 
  selectedCategory, 
  setSelectedCategory, 
  sortBy, 
  setSortBy,
  categories,
  onAddToCart,
  establishment
}: ProductsSectionProps) => {
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || selectedCategory === "all" || product.category_name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case "price_asc": return a.price - b.price;
      case "price_desc": return b.price - a.price;
      case "name": return a.name.localeCompare(b.name);
      case "rating": return (b.rating || 0) - (a.rating || 0);
      default: return 0;
    }
  });

  if (productsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="bg-gradient-primary/10 rounded-full p-4 mb-6">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Carregando cardápio...</h3>
        <p className="text-muted-foreground">Preparando os melhores produtos para você</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold flex items-center gap-3">
              <Utensils className="h-8 w-8 text-primary" />
              Cardápio
            </h2>
            <p className="text-muted-foreground">
              {sortedProducts.length} {sortedProducts.length === 1 ? 'produto disponível' : 'produtos disponíveis'}
            </p>
          </div>
          {establishment.is_active && (
            <Badge className="bg-green-500/10 text-green-700 border-green-200 px-4 py-2 rounded-xl">
              <Sparkles className="h-4 w-4 mr-2" />
              Disponível para pedidos
            </Badge>
          )}
        </div>
      </div>

      {/* Enhanced Search and Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
          <Input
            type="text"
            placeholder="Buscar no cardápio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-14 text-base rounded-2xl bg-muted/30 border-border/50 focus:bg-background transition-all duration-300 shadow-lg focus:shadow-xl"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-12 rounded-xl border-border/50 bg-background shadow-md hover:shadow-lg transition-all duration-300">
              <Filter className="h-4 w-4 mr-2 text-primary" />
              <SelectValue placeholder="Todas as categorias" />
            </SelectTrigger>
            <SelectContent className="rounded-xl bg-background border shadow-2xl z-[100]">
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4" />
                  Todas as categorias
                </div>
              </SelectItem>
              {categories.map((category: string) => (
                <SelectItem key={category} value={category || ""}>
                  {category || "Sem categoria"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-12 rounded-xl border-border/50 bg-background shadow-md hover:shadow-lg transition-all duration-300">
              <SortAsc className="h-4 w-4 mr-2 text-primary" />
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent className="rounded-xl bg-background border shadow-2xl z-[100]">
              <SelectItem value="default">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Relevância
                </div>
              </SelectItem>
              <SelectItem value="name">Nome A-Z</SelectItem>
              <SelectItem value="price_asc">💰 Menor preço</SelectItem>
              <SelectItem value="price_desc">💎 Maior preço</SelectItem>
              <SelectItem value="rating">⭐ Melhor avaliados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Products Grid */}
      {sortedProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {sortedProducts.map((product, index: number) => (
            <div key={product.id} className="animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
              <UnifiedProductCard 
                product={{
                  ...product,
                  establishment: {
                    id: establishment.id,
                    business_name: establishment.business_name,
                    phone: establishment.phone
                  }
                }}
                onAddToCart={onAddToCart}
                showTrending={(product as unknown as { order_count?: number }).order_count ? ((product as unknown as { order_count?: number }).order_count! > 10) : false}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="bg-muted/30 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <Package className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-3">Nenhum produto encontrado</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Não encontramos produtos que correspondam aos seus filtros. Tente ajustar a busca ou explore outras categorias.
          </p>
          <Button 
            variant="outline" 
            onClick={() => {
              setSearchTerm("");
              setSelectedCategory("");
              setSortBy("");
            }}
            className="hover:scale-105 transition-transform h-12 px-8 rounded-xl"
          >
            <Filter className="h-4 w-4 mr-2" />
            Limpar filtros
          </Button>
        </div>
      )}
    </div>
  );
});

export default function EstablishmentDetail() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { isMobile } = useIsMobile();
  const { establishment, isLoading: establishmentLoading, error: establishmentError } = useEstablishmentDetail(id || "");
  const { data: products, isLoading: productsLoading } = useEstablishmentDetailProducts(id || "");
  const { data: reviews = [], isLoading: reviewsLoading } = useEstablishmentReviews(id || "");
  
  const [isFavorite, setIsFavorite] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortBy, setSortBy] = useState("");

  const toggleFavorite = useCallback(() => {
    setIsFavorite(!isFavorite);
    toast({
      title: isFavorite ? "💔 Removido dos favoritos" : "❤️ Adicionado aos favoritos",
      description: `${establishment?.business_name} ${isFavorite ? 'foi removido dos' : 'foi adicionado aos'} seus favoritos.`,
    });
  }, [isFavorite, establishment?.business_name]);

  const openGallery = useCallback((index: number) => {
    setGalleryIndex(index);
    setIsGalleryOpen(true);
  }, []);

  const openMaps = useCallback(() => {
    if (establishment?.address) {
      setIsMapModalOpen(true);
    } else {
      toast({
        title: "📍 Endereço não disponível",
        description: "Este estabelecimento não possui endereço cadastrado.",
        variant: "destructive"
      });
    }
  }, [establishment?.address]);

  const handleAddToCart = useCallback(async (productId: string, quantity: number = 1) => {
    if (!isAuthenticated) {
      toast({
        title: "🔐 Login necessário",
        description: "Você precisa estar logado para adicionar produtos ao carrinho.",
        action: (
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/auth'}>
            Entrar
          </Button>
        ),
      });
      return;
    }

    try {
      await addToCart(productId, quantity);
      toast({
        title: "✅ Produto adicionado!",
        description: "Produto foi adicionado ao seu carrinho com sucesso.",
      });
    } catch (error) {
      toast({
        title: "❌ Erro ao adicionar produto",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  }, [isAuthenticated, addToCart]);

  if (establishmentLoading) {
    return <LoadingEstablishment />;
  }

  if (establishmentError || !establishment) {
    return <EstablishmentError error={establishmentError || ""} />;
  }

  const categories = [...new Set(products.map(p => p.category_name))];
  const breadcrumbItems = [
    { label: "Estabelecimentos", href: "/establishments" },
    { label: establishment.business_name }
  ];

  const images = [
    establishment.banner_url || "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800&q=80",
    "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=600&q=80",
    "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=80"
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Enhanced Breadcrumb */}
        {!isMobile && (
          <div className="mb-8">
            <Breadcrumb items={breadcrumbItems} />
          </div>
        )}
        
        {/* Hero Section */}
        <div className="mb-8">
          <EstablishmentHero
            establishment={establishment}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
            onShare={() => setIsShareModalOpen(true)}
          />
        </div>

        {/* Main Content with Enhanced Tabs */}
        <div>
          <Tabs defaultValue="menu" className="w-full">
            {/* Modern Sticky Tab Navigation */}
            <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50 mb-8 -mx-4 px-4 py-4 shadow-lg">
              <TabsList className="w-full grid grid-cols-4 h-16 bg-gradient-to-r from-muted/50 to-muted/30 rounded-2xl p-2 border border-border/50 shadow-lg">
                <TabsTrigger 
                  value="menu" 
                  className="flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all duration-500 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xl data-[state=active]:scale-105"
                >
                  <Utensils className="h-4 w-4" />
                  <span className="hidden sm:inline">Cardápio</span>
                  <span className="sm:hidden">Menu</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="info" 
                  className="flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all duration-500 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xl data-[state=active]:scale-105"
                >
                  <Info className="h-4 w-4" />
                  <span className="hidden sm:inline">Informações</span>
                  <span className="sm:hidden">Info</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="photos" 
                  className="flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all duration-500 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xl data-[state=active]:scale-105"
                >
                  <Camera className="h-4 w-4" />
                  <span className="hidden sm:inline">Galeria</span>
                  <span className="sm:hidden">Fotos</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="reviews" 
                  className="flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all duration-500 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xl data-[state=active]:scale-105"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">Avaliações</span>
                  <span className="sm:hidden">Reviews</span>
                  {reviews.length > 0 && (
                    <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-primary-foreground text-primary rounded-full">
                      {reviews.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Menu Tab */}
            <TabsContent value="menu" className="space-y-8">
              <ProductsSection
                products={products}
                productsLoading={productsLoading}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                sortBy={sortBy}
                setSortBy={setSortBy}
                categories={categories}
                onAddToCart={handleAddToCart}
                establishment={establishment}
              />
            </TabsContent>

            {/* Enhanced Info Tab */}
            <TabsContent value="info" className="space-y-8">
              <div>
                <h2 className="text-2xl lg:text-3xl font-bold mb-8 flex items-center gap-3">
                  <Info className="h-8 w-8 text-primary" />
                  Informações do Estabelecimento
                </h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="group bg-gradient-to-br from-card to-card/50 border-border/50 hover:shadow-2xl hover:border-primary/30 transition-all duration-500 hover:-translate-y-1">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-3 text-xl">
                        <div className="bg-primary/10 p-2 rounded-xl">
                          <Location className="h-5 w-5 text-primary" />
                        </div>
                        Localização
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-muted-foreground leading-relaxed">
                        {establishment.address || "Endereço não informado"}
                      </p>
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full hover:scale-105 transition-transform h-12 rounded-xl"
                        onClick={openMaps}
                      >
                        <Map className="h-5 w-5 mr-2" />
                        Ver no mapa
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="group bg-gradient-to-br from-card to-card/50 border-border/50 hover:shadow-2xl hover:border-primary/30 transition-all duration-500 hover:-translate-y-1">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-3 text-xl">
                        <div className="bg-primary/10 p-2 rounded-xl">
                          <Clock className="h-5 w-5 text-primary" />
                        </div>
                        Horário de Funcionamento
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed">
                        {formatOpeningHours(establishment.opening_hours)}
                      </p>
                    </CardContent>
                  </Card>

                  {establishment.phone && (
                    <Card className="group bg-gradient-to-br from-card to-card/50 border-border/50 hover:shadow-2xl hover:border-primary/30 transition-all duration-500 hover:-translate-y-1">
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-3 text-xl">
                          <div className="bg-primary/10 p-2 rounded-xl">
                            <Phone className="h-5 w-5 text-primary" />
                          </div>
                          Contato
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-lg font-medium">{establishment.phone}</p>
                      </CardContent>
                    </Card>
                  )}

                  <Card className="group bg-gradient-to-br from-card to-card/50 border-border/50 hover:shadow-2xl hover:border-primary/30 transition-all duration-500 hover:-translate-y-1">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-3 text-xl">
                        <div className="bg-primary/10 p-2 rounded-xl">
                          <Store className="h-5 w-5 text-primary" />
                        </div>
                        Sobre o Estabelecimento
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed">
                        {establishment.description || "Sem descrição disponível no momento."}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Enhanced Photos Tab */}
            <TabsContent value="photos" className="space-y-8">
              <div>
                <h2 className="text-2xl lg:text-3xl font-bold mb-8 flex items-center gap-3">
                  <Camera className="h-8 w-8 text-primary" />
                  Galeria de Fotos
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {images.map((image, index) => (
                    <div 
                      key={index} 
                      className="group relative aspect-square rounded-3xl overflow-hidden cursor-pointer transition-all duration-700 hover:shadow-2xl hover:-translate-y-3"
                      onClick={() => openGallery(index)}
                    >
                      <picture className="w-full h-full">
                        <source 
                          srcSet={`${image}?w=800&q=80&format=avif`} 
                          type="image/avif" 
                        />
                        <source 
                          srcSet={`${image}?w=800&q=80&format=webp`} 
                          type="image/webp" 
                        />
                        <img 
                          src={`${image}?w=800&q=80`} 
                          alt={`Foto ${index + 1} do ${establishment.business_name}`} 
                          className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-1000" 
                          loading="lazy"
                          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                        />
                      </picture>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center">
                        <div className="glass border-white/20 rounded-2xl p-4 transform scale-0 group-hover:scale-100 transition-transform duration-500 backdrop-blur-xl">
                          <Eye className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Enhanced Reviews Tab */}
            <TabsContent value="reviews" className="space-y-8">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-2xl lg:text-3xl font-bold flex items-center gap-3">
                      <MessageSquare className="h-8 w-8 text-primary" />
                      Avaliações dos Clientes
                    </h2>
                    <p className="text-muted-foreground mt-2">
                      {reviews.length} {reviews.length === 1 ? 'avaliação' : 'avaliações'} • 
                      Média: {establishment.rating ? establishment.rating.toFixed(1) : '0.0'} ⭐
                    </p>
                  </div>
                  <Button 
                    onClick={() => setIsReviewModalOpen(true)}
                    className="bg-gradient-primary hover:opacity-90 hover:scale-105 transition-all h-12 px-8 rounded-xl"
                  >
                    <MessageSquare className="h-5 w-5 mr-2" />
                    Escrever avaliação
                  </Button>
                </div>
              </div>
              
              {reviewsLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="bg-gradient-primary/10 rounded-full p-4 mb-6">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Carregando avaliações...</h3>
                  <p className="text-muted-foreground">Buscando opiniões dos clientes</p>
                </div>
              ) : reviews.length > 0 ? (
                <div className="space-y-6">
                  {reviews.map((review: EstablishmentReview, index: number) => (
                    <Card 
                      key={review.id} 
                      className="group bg-gradient-to-br from-card to-card/50 border-border/50 hover:shadow-2xl hover:border-primary/30 transition-all duration-500 hover:-translate-y-1 animate-fade-in"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <CardContent className="p-8">
                        <div className="flex items-start gap-6">
                          <Avatar className="h-16 w-16 border-2 border-primary/20 shadow-lg">
                            <AvatarImage src={review.customer.avatar_url || undefined} alt={review.customer.name} />
                            <AvatarFallback className="bg-gradient-primary text-white font-bold text-lg">
                              {review.customer.name.split(' ').map((n) => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 gap-3">
                              <h4 className="font-bold text-xl">{review.customer.name}</h4>
                              <div className="flex items-center gap-3">
                                <Badge variant="secondary" className="rounded-xl">
                                  <CalendarDays className="h-3 w-3 mr-1" />
                                  {new Date(review.created_at).toLocaleDateString('pt-BR')}
                                </Badge>
                              </div>
                            </div>
                            <div className="mb-4">
                              <StarRating rating={review.rating} readonly size="md" showValue />
                            </div>
                            {review.comment && (
                              <p className="text-muted-foreground mb-6 leading-relaxed text-base">{review.comment}</p>
                            )}
                            {review.response && (
                              <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl p-6 border-l-4 border-primary">
                                <div className="flex items-center gap-3 mb-3">
                                  <Store className="h-5 w-5 text-primary" />
                                  <span className="font-semibold text-primary">Resposta do estabelecimento</span>
                                  <Badge variant="default" className="rounded-xl">
                                    <Award className="h-3 w-3 mr-1" />
                                    Respondida
                                  </Badge>
                                </div>
                                <p className="leading-relaxed">{review.response.response_text}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="bg-muted/30 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Nenhuma avaliação ainda</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Seja o primeiro a avaliar este estabelecimento e ajude outros clientes!
                  </p>
                  <Button 
                    onClick={() => setIsReviewModalOpen(true)}
                    className="bg-gradient-primary hover:scale-105 transition-transform h-12 px-8 rounded-xl"
                  >
                    <MessageSquare className="h-5 w-5 mr-2" />
                    Escrever primeira avaliação
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Modals */}
        <ImageGalleryModal
          isOpen={isGalleryOpen}
          onClose={() => setIsGalleryOpen(false)}
          images={images}
          initialIndex={galleryIndex}
        />

        <ReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          establishmentId={establishment.id}
          establishmentName={establishment.business_name}
        />

        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          establishmentId={establishment.id}
          establishmentName={establishment.business_name}
        />

        <EstablishmentMapModal
          isOpen={isMapModalOpen}
          onClose={() => setIsMapModalOpen(false)}
          address={establishment.address || ""}
          establishmentName={establishment.business_name}
        />
      </div>
    </div>
  );
}
