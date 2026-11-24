import { useState } from "react";
import i18n from "@/i18n";
import { formatCurrency } from "@/utils/formatting";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StarRating } from "@/components/rating/StarRating";
import { useProductDetail } from "@/hooks/useProductDetail";
import { useProductReviews } from "@/hooks/useProductReviews";
import { ProductReviewModal } from "@/components/modals/ProductReviewModal";
import { ProductReviewCard } from "@/components/reviews/ProductReviewCard";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserAddresses } from "@/hooks/useUserAddresses";
import { ProductShareModal } from "@/components/modals/ProductShareModal";
import { 
  Star,
  Plus,
  Minus,
  ShoppingCart,
  Heart,
  Share2,
  MapPin,
  Clock,
  MessageSquare,
  Phone,
  Loader2,
  Package
} from "lucide-react";

export default function ProductDetail() {
  const { id } = useParams();
  const { product, isLoading, error } = useProductDetail(id || "");
  const { reviews, isLoading: reviewsLoading } = useProductReviews(id);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const { profile } = useUserProfile();
  const { addresses } = useUserAddresses();
  const navigate = useNavigate();

  const increaseQuantity = () => setQuantity(prev => prev + 1);
  const decreaseQuantity = () => setQuantity(prev => Math.max(1, prev - 1));

  const addToCart = () => {
    if (!isAuthenticated) {
      toast({
        title: "Login necessário",
        description: "Você precisa estar logado para adicionar produtos ao carrinho.",
        action: (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/auth')}
          >
            Fazer Login
          </Button>
        ),
      });
      return;
    }

    toast({
      title: "Produto adicionado!",
      description: `${quantity}x ${product?.name} foi adicionado ao carrinho.`,
    });
  };

  const handleWhatsApp = () => {
    if (!isAuthenticated) {
      toast({
        title: "Login necessário",
        description: "Você precisa estar logado para fazer pedidos pelo WhatsApp.",
        action: (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/auth')}
          >
            Fazer Login
          </Button>
        ),
      });
      return;
    }

    if (!profile || !addresses.length) {
      toast({
        title: "Informações incompletas",
        description: "Adicione um endereço de entrega antes de fazer o pedido.",
        variant: "destructive"
      });
      return;
    }

    if (product?.establishment?.phone) {
      const phone = product.establishment.phone.replace(/\D/g, '');
      const defaultAddress = addresses.find(addr => addr.is_default) || addresses[0];
      const addressText = `${defaultAddress.street}, ${defaultAddress.number}${defaultAddress.complement ? `, ${defaultAddress.complement}` : ''} - ${defaultAddress.neighborhood}, ${defaultAddress.city}/${defaultAddress.state} - CEP: ${defaultAddress.zip_code}`;
      
      const message = `🍕 *NOVO PEDIDO* 

👤 *DADOS DO CLIENTE*
📱 Nome: ${profile.name}
📞 Telefone: ${profile.phone || 'Não informado'}

🛒 *RESUMO DO PEDIDO*
• ${quantity}x ${product.name}
• Preço unitário: R$ ${product.price.toFixed(2)}
• Total: R$ ${(product.price * quantity).toFixed(2)}

📍 *ENDEREÇO DE ENTREGA*
${addressText}

⏰ *TEMPO DE PREPARO*
Aproximadamente ${product.preparation_time || 15} minutos

🍴 *ESTABELECIMENTO*
${product.establishment.business_name}

💬 Aguardo confirmação do pedido!`;
      
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      toast({
        title: "WhatsApp indisponível",
        description: "Este estabelecimento não possui WhatsApp cadastrado.",
        variant: "destructive"
      });
    }
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    toast({
      title: isFavorite ? "Removido dos favoritos" : "Adicionado aos favoritos",
      description: `${product?.name} ${isFavorite ? 'foi removido dos' : 'foi adicionado aos'} seus favoritos.`,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span>Carregando produto...</span>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <div className="text-muted-foreground mb-4">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold">Produto não encontrado</h3>
            <p>{error || "O produto que você procura não existe."}</p>
          </div>
          <Link to="/products">
            <Button variant="outline">Voltar aos Produtos</Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Images array (usar image_url do produto + imagens placeholder)
  const images = [
    product.image_url || "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800",
    "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=800",
    "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800"
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary">Início</Link>
            <span>/</span>
            <Link to="/products" className="hover:text-primary">Produtos</Link>
            <span>/</span>
            {product.establishment && (
              <>
                <Link to={`/establishment/${product.establishment.id}`} className="hover:text-primary">
                  {product.establishment.business_name}
                </Link>
                <span>/</span>
              </>
            )}
            <span className="text-foreground">{product.name}</span>
          </div>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Images */}
          <div>
            <div className="relative mb-4">
              <div className="aspect-square rounded-2xl overflow-hidden">
                <img
                  src={images[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute top-4 right-4 flex space-x-2">
                <Button
                  size="sm"
                  variant={isFavorite ? "default" : "outline"}
                  className="bg-white/80 backdrop-blur hover:bg-white/90"
                  onClick={toggleFavorite}
                >
                  <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current text-red-500' : ''}`} />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/80 backdrop-blur hover:bg-white/90"
                  onClick={() => setShareModalOpen(true)}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Image thumbnails */}
            <div className="flex space-x-2">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedImage === index ? 'border-primary' : 'border-transparent'
                  }`}
                >
                  <img src={image} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
              <div className="flex items-center space-x-2 mb-4">
                <StarRating rating={product.rating || 0} readonly />
                <span className="font-medium">{product.rating?.toFixed(1) || "0.0"}</span>
                <span className="text-muted-foreground">({product.total_reviews || 0} avaliações)</span>
              </div>
              {product.category && (
                <Badge variant="secondary" className="mb-4">{product.category.name}</Badge>
              )}
            </div>

            {/* Establishment */}
            {product.establishment && (
              <Card className="bg-gradient-card border-border/50">
                <CardContent className="p-4">
                  <Link 
                    to={`/establishment/${product.establishment.id}`}
                    className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
                  >
                    <img
                      src={product.establishment.logo_url || "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=100"}
                      alt={product.establishment.business_name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold">{product.establishment.business_name}</h3>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span>{product.establishment.rating || 0}</span>
                        </div>
                        <span>•</span>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{product.establishment.delivery_time_min || 30}-{product.establishment.delivery_time_max || 60} min</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Price and Quantity */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <span className="text-3xl font-bold text-primary">{formatCurrency(product.price)}</span>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={decreaseQuantity}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <Button variant="outline" size="sm" onClick={increaseQuantity}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <span className="text-muted-foreground">
                  {`Total: ${formatCurrency(product.price * quantity)}`}
                </span>
              </div>

              <div className="space-y-3">
                <Button
                  className="w-full bg-gradient-primary hover:opacity-90 h-12"
                  onClick={addToCart}
                  disabled={!product.is_available}
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  {product.is_available ? "Adicionar ao Carrinho" : "Indisponível"}
                </Button>

                <Button
                  variant="outline"
                  className="w-full h-12"
                  onClick={handleWhatsApp}
                  disabled={!product.is_available}
                >
                  <Phone className="h-5 w-5 mr-2" />
                  Pedir pelo WhatsApp
                </Button>
              </div>
            </div>

            {/* Product Details */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Descrição</h3>
                <p className="text-muted-foreground">
                  {product.description || "Sem descrição disponível."}
                </p>
              </div>

              {product.ingredients && product.ingredients.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Ingredientes</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    {product.ingredients.map((ingredient, index) => (
                      <li key={index}>{ingredient}</li>
                    ))}
                  </ul>
                </div>
              )}

              {product.allergens && product.allergens.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Alérgenos</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.allergens.map((allergen, index) => (
                      <Badge key={index} variant="destructive">{allergen}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {product.nutritional_info && (
                <div>
                  <h3 className="font-semibold mb-2">Informações Nutricionais</h3>
                  <div className="text-sm text-muted-foreground">
                    {JSON.stringify(product.nutritional_info)}
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Tempo de preparo: {product.preparation_time || 15} min</span>
              </div>

              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Package className="h-4 w-4" />
                <span>Status: {product.is_available ? "Disponível" : "Indisponível"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Avaliações do Produto</h2>
            {isAuthenticated && (
              <Button 
                variant="outline"
                onClick={() => setIsReviewModalOpen(true)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Avaliar Produto
              </Button>
            )}
          </div>
          
          {reviewsLoading ? (
            <div className="text-center py-8">
              <span>Carregando avaliações...</span>
            </div>
          ) : reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review) => (
                <ProductReviewCard key={review.id} review={review} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Ainda não há avaliações para este produto.</p>
              {isAuthenticated && (
                <p className="text-sm text-muted-foreground mt-1">Seja o primeiro a avaliar!</p>
              )}
            </div>
          )}
        </section>

        {/* Review Modal */}
        {product && (
          <ProductReviewModal
            productId={product.id}
            productName={product.name}
            isOpen={isReviewModalOpen}
            onClose={() => setIsReviewModalOpen(false)}
          />
        )}

        {/* Share Modal */}
        <ProductShareModal
          product={product}
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
        />
      </div>
    </div>
  );
}
