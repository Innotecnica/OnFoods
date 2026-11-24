import { useState } from "react";
import i18n from "@/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import { useUserAddresses } from "@/hooks/useUserAddresses";
import { useAuth } from "@/contexts/AuthContext";
import { CartQuickActions } from "@/components/cart/CartQuickActions";
import { BulkCartActions } from "@/components/cart/BulkCartActions";
import { useCart } from "@/hooks/useCart";
import { useOrderWorkflow } from "@/hooks/useOrderWorkflow";
import { AppliedPromotion } from "@/hooks/usePromotions";
import { UnifiedDiscountApplicator, UnifiedDiscount } from "@/components/checkout/UnifiedDiscountApplicator";
import { 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus,
  MapPin,
  Phone,
  CreditCard,
  CheckCircle,
  Store,
  MessageSquare,
  ArrowLeft,
  ArrowRight,
  Settings,
  Clock,
  Truck,
  AlertTriangle,
  X,
  Receipt
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CartItemCard } from "@/components/cart/CartItemCard";
import { CartValidation } from "@/components/cart/CartValidation";
import { CheckoutProgress } from "@/components/checkout/CheckoutProgress";
import { OrderCompletionWorkflow } from "@/components/checkout/OrderCompletionWorkflow";

export default function Cart() {
  const { isAuthenticated, user } = useAuth();
  const { addresses } = useUserAddresses();
  const { carts, isLoading, updateQuantity, removeFromCart, clearCart, clearAllCarts, getEstablishmentPaymentInfo } = useCart();
  const { workflowData, executeWorkflow, resetWorkflow } = useOrderWorkflow();
  const navigate = useNavigate();
  
  const [selectedEstablishment, setSelectedEstablishment] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [orderNotes, setOrderNotes] = useState("");
  const [appliedDiscounts, setAppliedDiscounts] = useState<Record<string, UnifiedDiscount | null>>({});
  type CompletedOrder = {
    id: string;
    total_amount: number;
    payment_method: string;
    status: string;
    estimated_delivery_time?: string;
    establishment: { business_name: string; phone?: string };
    customer: { name: string; phone?: string };
    whatsapp_url?: string;
  };
  const [completedOrder, setCompletedOrder] = useState<CompletedOrder | null>(null);
  const [isCheckoutSheetOpen, setIsCheckoutSheetOpen] = useState(false);
  const [fulfillmentTypes, setFulfillmentTypes] = useState<Record<string, 'delivery' | 'pickup' | 'table'>>({});
  const [fulfillmentSupport, setFulfillmentSupport] = useState<Record<string, { supports_delivery: boolean; supports_pickup: boolean }>>({});
  const [tableNumbers, setTableNumbers] = useState<Record<string, string>>({});

  // Get default address or fallback
  const selectedAddress = isAuthenticated && addresses.length > 0 
    ? addresses.find(addr => addr.is_default) || addresses[0]
    : null;

  const cartArray = Object.values(carts);
  const totalCarts = cartArray.length;
  const totalItems = cartArray.reduce((total, cart) => 
    total + cart.items.reduce((cartTotal, item) => cartTotal + item.quantity, 0), 0
  );

  const handleCheckout = async (establishmentId: string) => {
    const cart = carts[establishmentId];
    const fulfillmentType = fulfillmentTypes[establishmentId] || 'delivery';
    if (!cart || ((fulfillmentType !== 'pickup' && fulfillmentType !== 'table') && !selectedAddress)) {
      toast({
        title: i18n.t('common:cart_error_title'),
        description: i18n.t('common:cart_error_desc'),
        variant: "destructive",
      });
      return;
    }

    try {
      const effectiveNotes = (fulfillmentType === 'table' && tableNumbers[establishmentId])
        ? `Mesa: ${tableNumbers[establishmentId]}${orderNotes ? ' - ' + orderNotes : ''}`
        : orderNotes;
      const result = await executeWorkflow({
        establishmentId,
        addressId: (fulfillmentType === 'pickup' || fulfillmentType === 'table') ? undefined : selectedAddress!.id,
        paymentMethod,
        notes: effectiveNotes,
        appliedDiscount: appliedDiscounts[establishmentId],
        cartItems: cart.items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.product.price,
          notes: item.notes || undefined,
        })),
        subtotal: cart.total,
        deliveryFee: (fulfillmentType === 'pickup' || fulfillmentType === 'table') ? 0 : (cart.establishment.delivery_fee || 0),
      });

      // Set completion state
      setCompletedOrder({
        id: result.orderId,
        total_amount: cart.total + ((fulfillmentType === 'pickup' || fulfillmentType === 'table') ? 0 : (cart.establishment.delivery_fee || 0)),
        payment_method: paymentMethod,
        status: 'confirmed',
        estimated_delivery_time: new Date(Date.now() + 40 * 60 * 1000).toISOString(),
        establishment: {
          business_name: cart.establishment.business_name,
          phone: cart.establishment.phone
        },
        customer: {
          name: user?.name || 'Cliente',
          phone: user?.phone || ''
        },
        whatsapp_url: result.whatsappUrl
      });

      // Handle redirects with popup blocker detection
      if (result.stripeUrl) {
        const popup = window.open(result.stripeUrl, '_blank');
        if (!popup) {
          toast({
            title: i18n.t('common:popup_blocked_title'),
            description: i18n.t('common:popup_blocked_desc_stripe'),
            variant: "destructive",
          });
        }
      } else if (result.whatsappUrl) {
        console.log('[CART] Opening WhatsApp URL:', result.whatsappUrl);
        const popup = window.open(result.whatsappUrl, '_blank');
        if (!popup || popup.closed || typeof popup.closed == 'undefined') {
          console.log('[CART] Pop-up blocked, showing fallback');
          toast({
            title: i18n.t('common:whatsapp_ready_title'),
            description: i18n.t('common:whatsapp_ready_desc'),
            action: (
              <Button 
                size="sm" 
                onClick={() => window.open(result.whatsappUrl, '_blank')}
                className="bg-green-600 hover:bg-green-700"
              >
                {i18n.t('common:open_whatsapp_button')}
              </Button>
            ),
            duration: 10000,
          });
        } else {
          console.log('[CART] WhatsApp opened successfully');
        }
      }

      // Success toast
      toast({
        title: i18n.t('common:order_created_success'),
        description: i18n.t('common:order_sent_establishment', { orderNumber: result.orderId.slice(-8) }),
      });

      // Close sheet and reset workflow after delay (cart already cleared by workflow)
      setTimeout(() => {
        setIsCheckoutSheetOpen(false);
        setSelectedEstablishment(null);
        resetWorkflow();
      }, 5000);

    } catch (error) {
      console.error('Checkout error:', error);
    }
  };

  const openCheckoutSheet = async (establishmentId: string) => {
    setSelectedEstablishment(establishmentId);
    
    // Set default payment method based on gateway
    const cart = carts[establishmentId];
    if (cart?.establishment.payment_gateway === 'stripe') {
      setPaymentMethod('credit_card');
    } else if (cart?.establishment.payment_gateway === 'whatsapp') {
      setPaymentMethod('cash');
    } else if (cart?.establishment.payment_gateway === 'mercado_pago') {
      setPaymentMethod('mercado_pago_pix');
    } else {
      setPaymentMethod('cash');
    }
    
    try {
      const { data } = await supabase
        .from('establishments')
        .select('supports_delivery, supports_pickup')
        .eq('id', establishmentId)
        .single();

      const supportsDelivery = data?.supports_delivery !== false;
      const supportsPickup = data?.supports_pickup === true;
      setFulfillmentSupport(prev => ({
        ...prev,
        [establishmentId]: { supports_delivery: supportsDelivery, supports_pickup: supportsPickup }
      }));
      setFulfillmentTypes(prev => ({
        ...prev,
        [establishmentId]: supportsDelivery ? 'delivery' : (supportsPickup ? 'pickup' : 'delivery')
      }));
    } catch (err) {
      setFulfillmentTypes(prev => ({ ...prev, [establishmentId]: 'delivery' }));
    }

    setIsCheckoutSheetOpen(true);
  };

  // Show completion workflow if order is completed
  if (completedOrder) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <OrderCompletionWorkflow 
          orderId={completedOrder.id}
          orderData={completedOrder}
          gateway={workflowData?.gateway || 'none'}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Carregando carrinho...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-6">
          <CardContent className="space-y-4">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-bold">{i18n.t('common:login_required_title')}</h2>
            <p className="text-muted-foreground">
              {i18n.t('common:login_required_desc')}
            </p>
            <Button asChild className="w-full">
              <Link to="/auth">{i18n.t('common:login')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (totalCarts === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-6">
          <CardContent className="space-y-4">
            <div className="bg-muted rounded-full p-4 w-fit mx-auto">
              <ShoppingBag className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold">{i18n.t('common:cart_empty')}</h2>
            <p className="text-muted-foreground">
              {i18n.t('common:view_all_cart_items')}
            </p>
            <Button asChild className="w-full bg-gradient-primary hover:opacity-90">
              <Link to="/establishments">
                <Store className="h-4 w-4 mr-2" />
                {i18n.t('common:explore_establishments')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header - Enhanced */}
      <div className="sticky top-0 z-40 bg-background/98 backdrop-blur-md supports-[backdrop-filter]:bg-background/95 border-b border-border/30 md:hidden safe-area-top">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate(-1)}
              className="h-10 w-10 p-0 rounded-xl touch-manipulation hover:bg-muted/50 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg gradient-text">Carrinho</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <ShoppingBag className="h-3 w-3" />
                {totalItems} item{totalItems > 1 ? 's' : ''} • {totalCarts} estabelecimento{totalCarts > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          {totalCarts > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                if (window.confirm(`Tem certeza que deseja limpar todos os ${totalCarts} carrinho${totalCarts > 1 ? 's' : ''}?\n\nEsta ação não pode ser desfeita.`)) {
                  clearAllCarts();
                }
              }}
              className="h-10 w-10 p-0 rounded-xl text-destructive hover:text-destructive/80 hover:bg-destructive/10 touch-manipulation transition-colors"
              title="Limpar todos os carrinhos"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Desktop Header - Enhanced */}
      <div className="hidden md:block bg-gradient-card border-b border-border/30">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold gradient-text">Seu Carrinho</h1>
              <div className="flex items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  <span>{totalItems} item{totalItems > 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  <span>{totalCarts} estabelecimento{totalCarts > 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
            
            {totalCarts > 1 && (
              <Button 
                variant="outline"
                onClick={() => {
                  if (window.confirm(`Tem certeza que deseja limpar todos os ${totalCarts} carrinhos?\n\nEsta ação removerá todos os itens e não pode ser desfeita.`)) {
                    clearAllCarts();
                  }
                }}
                className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 border-destructive/20 hover:border-destructive/40 transition-all"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar Todos os Carrinhos
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-20 md:pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cart Items - Mobile/Desktop */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress indicator - Enhanced */}
            {workflowData && workflowData.status !== 'completed' && (
              <Card className="bg-gradient-primary text-white border-0 shadow-lg animate-scale-in">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/30 border-t-white"></div>
                    <div>
                      <p className="font-semibold">Processando pedido...</p>
                      <p className="text-sm text-white/80">{workflowData.progress}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Address Alert - Enhanced */}
            {!selectedAddress && selectedEstablishment && (fulfillmentTypes[selectedEstablishment] !== 'pickup' && fulfillmentTypes[selectedEstablishment] !== 'table') && (
              <Card className="border-2 border-dashed border-blue-200 bg-gradient-to-r from-blue-50/80 to-blue-100/50 animate-fade-in hover-lift">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-100 rounded-full p-3">
                      <MapPin className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-blue-900 text-lg mb-2">Endereço necessário</h3>
                      <p className="text-blue-700 mb-4 leading-relaxed">
                        Adicione um endereço de entrega para finalizar seu pedido e receber seus itens favoritos.
                      </p>
                      <Button asChild className="bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all">
                        <Link to="/account">
                          <MapPin className="h-4 w-4 mr-2" />
                          Adicionar Endereço
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cart Items by Establishment - Enhanced */}
            <div className="space-y-6">
              {cartArray.map((cart, index) => (
                <Card key={cart.establishment_id} className={`overflow-hidden animate-fade-in hover-lift border-border/50 shadow-card hover:shadow-hover transition-all stagger-${Math.min(index + 1, 6)}`}>
                  <CardHeader className="bg-gradient-card border-b border-border/30 pb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="bg-gradient-primary rounded-xl p-3 shadow-lg">
                          <Store className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-xl font-bold">{cart.establishment.business_name}</CardTitle>
                          <div className="flex items-center gap-6 text-sm text-muted-foreground mt-2">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span className="font-medium">30-45 min</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4" />
                              <span className="font-medium">R$ {cart.establishment.delivery_fee.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant="secondary" 
                          className={`text-xs font-medium px-3 py-1 ${
                            cart.establishment.payment_gateway === 'whatsapp' ? 'bg-green-100 text-green-700 border-green-200' :
                            cart.establishment.payment_gateway === 'stripe' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                            cart.establishment.payment_gateway === 'mercado_pago' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                            'bg-gray-100 text-gray-700 border-gray-200'
                          }`}
                        >
                          {cart.establishment.payment_gateway === 'whatsapp' && '💬 WhatsApp'}
                          {cart.establishment.payment_gateway === 'stripe' && '💳 Stripe'}
                          {cart.establishment.payment_gateway === 'mercado_pago' && '💳 MercadoPago'}
                          {!['whatsapp', 'stripe', 'mercado_pago'].includes(cart.establishment.payment_gateway) && '📞 Contato'}
                        </Badge>
                        
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            if (window.confirm(`Tem certeza que deseja limpar o carrinho de ${cart.establishment.business_name}?\n\nTodos os ${cart.items.length} item${cart.items.length > 1 ? 's' : ''} serão removidos e esta ação não pode ser desfeita.`)) {
                              clearCart(cart.establishment_id);
                            }
                          }}
                          className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 h-10 w-10 p-0 rounded-xl transition-colors touch-manipulation"
                          title={`Limpar carrinho de ${cart.establishment.business_name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Quick Actions */}
                  <CartQuickActions 
                    cart={cart}
                    onClearCart={clearCart}
                  />

                  <CardContent className="p-0">
                    {/* Cart Items */}
                    <div className="divide-y divide-border/30">
                      {cart.items.map((item, itemIndex) => (
                        <div key={item.id} className={`animate-fade-in stagger-${Math.min(itemIndex + 1, 6)}`}>
                          <CartItemCard
                            item={item}
                            onUpdateQuantity={updateQuantity}
                            onRemove={removeFromCart}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Cart Summary - Enhanced */}
                    <div className="p-6 bg-gradient-card border-t border-border/30">
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Subtotal ({cart.items.length} item{cart.items.length > 1 ? 's' : ''})</span>
                          <span className="font-semibold text-lg">R$ {cart.total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Taxa de entrega</span>
                          <span className="font-semibold text-lg">R$ {cart.establishment.delivery_fee.toFixed(2)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center text-base">
                          <span className="font-bold">Total</span>
                          <span className="font-bold text-primary text-lg">
                            R$ {(cart.total + cart.establishment.delivery_fee).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Minimum Order Check */}
                      {cart.establishment.minimum_order > cart.total && (
                        <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                            <div className="text-sm">
                              <p className="font-medium text-orange-900">Pedido mínimo não atingido</p>
                              <p className="text-orange-700">
                                Adicione mais R$ {(cart.establishment.minimum_order - cart.total).toFixed(2)} 
                                para atingir o mínimo de R$ {cart.establishment.minimum_order.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Mobile Checkout Button */}
                      <div className="mt-4 md:hidden">
                        <Button
                          className="w-full h-12 bg-gradient-primary hover:opacity-90 shadow-lg transition-all hover:scale-[1.02] disabled:hover:scale-100 rounded-xl"
                          onClick={() => openCheckoutSheet(cart.establishment_id)}
                          disabled={!!workflowData || cart.establishment.minimum_order > cart.total}
                        >
                          {workflowData ? (
                            <div className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Enviando...</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-5 w-5" />
                              <span className="font-bold">Finalizar Pedido</span>
                            </div>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Desktop Checkout Sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-4 space-y-4">
              {cartArray.map((cart) => (
                <Card key={`sidebar-${cart.establishment_id}`} className="bg-gradient-card shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-primary" />
                      Finalizar Pedido
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {cart.establishment.business_name}
                    </p>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Quick Summary */}
                    <div className="bg-background/50 rounded-lg p-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>{cart.items.length} item{cart.items.length > 1 ? 's' : ''}</span>
                        <span className="font-medium">R$ {cart.total.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Entrega</span>
                        <span className="font-medium">R$ {cart.establishment.delivery_fee.toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold text-base">
                        <span>Total</span>
                        <span className="text-primary">R$ {(cart.total + cart.establishment.delivery_fee).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Delivery Info */}
                    {selectedAddress && (fulfillmentTypes[cart.establishment_id] !== 'pickup' && fulfillmentTypes[cart.establishment_id] !== 'table') && (
                      <div className="text-sm space-y-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium">Entregar em:</p>
                            <p className="text-muted-foreground">
                              {selectedAddress.street}, {selectedAddress.number}
                            </p>
                            <p className="text-muted-foreground">
                              {selectedAddress.neighborhood}, {selectedAddress.city}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    <Button
                      className="w-full h-12 bg-gradient-primary hover:opacity-90 shadow-lg transition-all hover:scale-[1.02] disabled:hover:scale-100 rounded-xl"
                      onClick={() => handleCheckout(cart.establishment_id)}
                      disabled={!!workflowData || ((fulfillmentTypes[cart.establishment_id] !== 'pickup' && fulfillmentTypes[cart.establishment_id] !== 'table') && !selectedAddress) || cart.establishment.minimum_order > cart.total}
                    >
                      {workflowData ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Finalizando...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-5 w-5" />
                          <span className="font-bold">Finalizar e Enviar</span>
                        </div>
                      )}
                    </Button>

                    {/* Payment Gateway Info */}
                    <div className="text-center">
                      <Badge variant="outline" className="text-xs">
                        {cart.establishment.payment_gateway === 'whatsapp' && '💬 Pedido será enviado via WhatsApp'}
                        {cart.establishment.payment_gateway === 'stripe' && '💳 Pagamento processado via Stripe'}
                        {cart.establishment.payment_gateway === 'mercado_pago' && '💳 Pagamento via Mercado Pago'}
                        {!['whatsapp', 'stripe', 'mercado_pago'].includes(cart.establishment.payment_gateway) && '📞 Contato direto com estabelecimento'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Checkout Sheet - Optimized Vertical Navigation */}
      <Sheet open={isCheckoutSheetOpen} onOpenChange={setIsCheckoutSheetOpen}>
        <SheetContent side="bottom" className="h-[95vh] p-0 flex flex-col">
          {/* Fixed Header */}
          <div className="flex-shrink-0 p-4 border-b bg-gradient-subtle sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Receipt className="h-5 w-5 text-primary" />
                  <h2 className="font-bold text-lg">Finalizar Pedido</h2>
                </div>
                {selectedEstablishment && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Store className="h-3 w-3" />
                    <span>{carts[selectedEstablishment]?.establishment.business_name}</span>
                  </div>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsCheckoutSheetOpen(false)}
                className="h-8 w-8 p-0 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Progress Indicator */}
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex-1 h-1 bg-primary/20 rounded-full overflow-hidden">
                <div className="w-full h-full bg-gradient-primary rounded-full animate-pulse"></div>
              </div>
              <span>1/4 - Revisar pedido</span>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-6">
              {selectedEstablishment && (
                <>
                  {/* Delivery Type Card */}
                  <div className="animate-fade-in" style={{ animationDelay: '0.05s' }}>
                    <Card className="shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Tipo de entrega</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Select 
                          value={fulfillmentTypes[selectedEstablishment] || 'delivery'} 
                          onValueChange={(val: 'delivery' | 'pickup' | 'table') => setFulfillmentTypes(prev => ({ ...prev, [selectedEstablishment]: val }))}
                        >
                          <SelectTrigger className="h-12">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(
                              fulfillmentSupport[selectedEstablishment]?.supports_delivery ?? true
                            ) && (
                              <SelectItem value="delivery">🚚 Delivery</SelectItem>
                            )}
                            {(
                              fulfillmentSupport[selectedEstablishment]?.supports_pickup ?? false
                            ) && (
                              <SelectItem value="pickup">🏪 Retirada no balcão</SelectItem>
                            )}
                            {(
                              fulfillmentSupport[selectedEstablishment]?.supports_pickup ?? false
                            ) && (
                              <SelectItem value="table">🪑 Retirada na mesa</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-2">
                          {fulfillmentTypes[selectedEstablishment] === 'pickup' 
                            ? 'Você retirará seu pedido no estabelecimento.' 
                            : fulfillmentTypes[selectedEstablishment] === 'table'
                              ? 'Consumo no local: informe o número da mesa (opcional).'
                              : 'Seu pedido será entregue no endereço selecionado.'}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  {selectedEstablishment && fulfillmentTypes[selectedEstablishment] === 'table' && (
                    <div className="animate-fade-in" style={{ animationDelay: '0.07s' }}>
                      <Card className="shadow-sm">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">Número da mesa (opcional)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <Label htmlFor="table_number">Mesa</Label>
                            <Input
                              id="table_number"
                              placeholder="Ex: 12"
                              value={tableNumbers[selectedEstablishment] || ''}
                              onChange={(e) => setTableNumbers(prev => ({ ...prev, [selectedEstablishment]: e.target.value }))}
                            />
                            <p className="text-xs text-muted-foreground">Se preferir, deixe em branco.</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                  {/* Order Summary Card */}
                  <div className="animate-fade-in">
                    <Card className="shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <ShoppingBag className="h-5 w-5 text-primary" />
                          Resumo do Pedido
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Items List */}
                        <div className="space-y-3 max-h-48 overflow-y-auto">
                          {carts[selectedEstablishment].items.map((item, index) => (
                            <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="secondary" className="text-xs px-2 py-0">
                                    {item.quantity}x
                                  </Badge>
                                  <span className="font-medium text-sm">{item.product.name}</span>
                                </div>
                                {item.notes && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <MessageSquare className="h-3 w-3" />
                                    {item.notes}
                                  </p>
                                )}
                              </div>
                              <span className="font-bold text-primary">
                                R$ {(item.product.price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                        
                        <Separator />
                        
                        {/* Price Breakdown */}
                        <div className="space-y-2 bg-gradient-subtle p-3 rounded-lg">
                          <div className="flex justify-between text-sm">
                            <span>Subtotal ({carts[selectedEstablishment].items.length} item{carts[selectedEstablishment].items.length > 1 ? 's' : ''})</span>
                            <span className="font-medium">R$ {carts[selectedEstablishment].total.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="flex items-center gap-1">
                              <Truck className="h-3 w-3" />
                              Taxa de entrega
                            </span>
                            <span className="font-medium">R$ {((fulfillmentTypes[selectedEstablishment] === 'pickup' || fulfillmentTypes[selectedEstablishment] === 'table') ? 0 : carts[selectedEstablishment].establishment.delivery_fee).toFixed(2)}</span>
                          </div>
                          {/* Applied Discount */}
                          {appliedDiscounts[selectedEstablishment] && (
                            <div className="flex justify-between text-sm text-green-600">
                              <span>Desconto ({appliedDiscounts[selectedEstablishment]!.name})</span>
                              <span>-R$ {appliedDiscounts[selectedEstablishment]!.discountAmount.toFixed(2)}</span>
                            </div>
                          )}
                          <Separator />
                          <div className="flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span className="text-primary">
                              R$ {(
                                carts[selectedEstablishment].total + 
                                ((fulfillmentTypes[selectedEstablishment] === 'pickup' || fulfillmentTypes[selectedEstablishment] === 'table') ? 0 : carts[selectedEstablishment].establishment.delivery_fee) - 
                                (appliedDiscounts[selectedEstablishment]?.discountAmount || 0)
                              ).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Payment Method Card */}
                  <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                    <Card className="shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <CreditCard className="h-5 w-5 text-primary" />
                          Forma de Pagamento
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger className="h-12">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">💰 Dinheiro na entrega</SelectItem>
                            <SelectItem value="pix">📱 PIX</SelectItem>
                            <SelectItem value="card_on_delivery">💳 Cartão na entrega</SelectItem>
                            {carts[selectedEstablishment]?.establishment.payment_gateway === 'stripe' && (
                              <>
                                <SelectItem value="credit_card">💳 Cartão de Crédito</SelectItem>
                                <SelectItem value="debit_card">💳 Cartão de Débito</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                        
                        {/* Payment Gateway Info */}
                        <div className="mt-3 p-2 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {carts[selectedEstablishment]?.establishment.payment_gateway === 'whatsapp' && (
                              <>
                                <Phone className="h-3 w-3" />
                                <span>Pedido será enviado via WhatsApp</span>
                              </>
                            )}
                            {carts[selectedEstablishment]?.establishment.payment_gateway === 'stripe' && (
                              <>
                                <CreditCard className="h-3 w-3" />
                                <span>Pagamento processado via Stripe</span>
                              </>
                            )}
                            {carts[selectedEstablishment]?.establishment.payment_gateway === 'mercado_pago' && (
                              <>
                                <CreditCard className="h-3 w-3" />
                                <span>Pagamento via Mercado Pago</span>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Delivery Address Card */}
                  {selectedAddress && selectedEstablishment && (fulfillmentTypes[selectedEstablishment] !== 'pickup') && (
                    <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
                      <Card className="shadow-sm">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-primary" />
                            Endereço de Entrega
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-gradient-subtle p-4 rounded-lg space-y-2">
                            <p className="font-semibold text-base">
                              {selectedAddress.street}, {selectedAddress.number}
                            </p>
                            <p className="text-muted-foreground">
                              {selectedAddress.neighborhood}
                            </p>
                            <p className="text-muted-foreground">
                              {selectedAddress.city} - {selectedAddress.state}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <span>CEP: {selectedAddress.zip_code}</span>
                            </p>
                            
                            {/* Estimated Delivery Time */}
                            <div className="mt-3 pt-3 border-t border-border/50">
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-primary" />
                                <span className="font-medium">Tempo estimado:</span>
                                <span className="text-muted-foreground">30-60 min</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Order Notes Card */}
                  <div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
                    <Card className="shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <MessageSquare className="h-5 w-5 text-primary" />
                          Observações (Opcional)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Textarea
                          placeholder="Ex: Sem cebola, bem passado, entregar no portão..."
                          value={orderNotes}
                          onChange={(e) => setOrderNotes(e.target.value)}
                          className="min-h-[100px] resize-none"
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          Suas observações serão enviadas junto com o pedido
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Unified Discount Card */}
                  <div className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
                    <UnifiedDiscountApplicator
                      establishmentId={selectedEstablishment}
                      orderTotal={carts[selectedEstablishment].total}
                      customerId={user?.id}
                      cartItems={carts[selectedEstablishment].items.map(item => ({
                        product_id: item.product_id,
                        quantity: item.quantity,
                        unit_price: item.product.price,
                      }))}
                      onDiscountApplied={(discount) => 
                        setAppliedDiscounts(prev => ({ ...prev, [selectedEstablishment]: discount }))
                      }
                    />
                  </div>

                  {/* Spacer for bottom button */}
                  <div className="h-20"></div>
                </>
              )}
            </div>
          </div>

          {/* Fixed Bottom Action */}
          <div className="flex-shrink-0 p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 sticky bottom-0">
            <Button
              className="w-full h-14 bg-gradient-primary hover:opacity-90 shadow-lg transition-all rounded-xl text-lg font-bold"
              onClick={() => selectedEstablishment && handleCheckout(selectedEstablishment)}
              disabled={!!workflowData || !selectedEstablishment || (selectedEstablishment && (fulfillmentTypes[selectedEstablishment] !== 'pickup' && fulfillmentTypes[selectedEstablishment] !== 'table') && !selectedAddress)}
            >
              {workflowData ? (
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Finalizando pedido...</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6" />
                  <span>Confirmar e Enviar Pedido</span>
                  <ArrowRight className="h-5 w-5" />
                </div>
              )}
            </Button>
            
            {/* Security Notice */}
            <p className="text-center text-xs text-muted-foreground mt-2">
              Seus dados estão protegidos e criptografados
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
