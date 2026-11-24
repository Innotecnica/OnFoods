import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useEstablishmentAuth } from "@/hooks/useEstablishmentAuth";

import { useEstablishmentOrders, Order } from "@/hooks/useEstablishmentOrders";
import { useEstablishmentProducts, Product } from "@/hooks/useEstablishmentProducts";
import { usePromotionsAndReviews, Promotion, Review as DashboardReview } from "@/hooks/usePromotionsAndReviews";
import { useRespondToReview } from "@/hooks/useReviews";
import { useRealTimeOrders } from "@/hooks/useRealTimeOrders";
import { useEstablishmentValidation } from "@/hooks/useEstablishmentValidation";
import { useStripeConnect } from "@/hooks/useStripeConnect";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { SocialMediaIntegration } from "@/components/marketing/SocialMediaIntegration";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardNavigation } from "@/components/dashboard/DashboardNavigation";
import { OrdersSection } from "@/components/dashboard/OrdersSection";
import { ProductsSection } from "@/components/dashboard/ProductsSection";
import { PromotionsSection } from "@/components/dashboard/PromotionsSection";
import { ReviewsSection } from "@/components/dashboard/ReviewsSection";
import { MarketingSection } from "@/components/dashboard/MarketingSection";
import { SettingsSection } from "@/components/dashboard/SettingsSection";
import { ChatbotSection } from "@/components/dashboard/ChatbotSection";
import { AnimatedTabContent } from "@/components/dashboard/AnimatedTabContent";
import { OptimizedDashboardOverview } from "@/components/dashboard/OptimizedDashboardOverview";
import { RealTimeOrdersWidget } from "@/components/dashboard/RealTimeOrdersWidget";
import { SubscriptionManager } from "@/components/subscription/SubscriptionManager";
import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";
import { WebhookConfiguration } from "@/components/subscription/WebhookConfiguration";
import { EstablishmentGuard } from "@/components/EstablishmentGuard";
// Remove unused StripeAccountSetup import
import { EstablishmentProfileEditor } from "@/components/settings/EstablishmentProfileEditor";
import { useSubscription } from "@/hooks/useSubscription";
import { useCustomerProfiles } from "@/hooks/useCustomerProfiles";
import { useMarketingCampaigns } from "@/hooks/useMarketingCampaigns";
import { WhatsAppIntegration } from "@/components/marketing/WhatsAppIntegration";
import { CustomerSegmentManager } from "@/components/marketing/CustomerSegmentManager";
import { CampaignCreator } from "@/components/marketing/CampaignCreator";
import { CampaignManager } from "@/components/marketing/CampaignManager";
import { CampaignAnalytics } from "@/components/marketing/CampaignAnalytics";
import { Campaign } from "@/types/marketing";
import { CustomerProfile } from "@/hooks/useCustomerProfiles";
import { redirectToStripeDashboard } from "@/utils/stripeRedirect";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UpdateOrderStatusModal } from "@/components/modals/UpdateOrderStatusModal";
import { EnhancedOrderDetailsModal } from "@/components/modals/EnhancedOrderDetailsModal";
import { ManageProductModal } from "@/components/modals/ManageProductModal";
import { CreatePromotionModal } from "@/components/modals/CreatePromotionModal";
import { RespondToReviewModal } from "@/components/modals/RespondToReviewModal";
import { TodayOrdersModal } from "@/components/modals/TodayOrdersModal";
import { TodayRevenueModal } from "@/components/modals/TodayRevenueModal";
import { ActiveProductsModal } from "@/components/modals/ActiveProductsModal";
import { ReviewsModal } from "@/components/modals/ReviewsModal";
import { toast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { MessageSquare, CreditCard, Wallet, AlertCircle } from "lucide-react";
import { PaymentGatewayConfig } from "@/components/settings/PaymentGatewayConfig";
import { PaymentGatewayFlow } from "@/components/settings/PaymentGatewayFlow";

export default function EstablishmentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isMobile, isTablet } = useIsMobile();
  const { establishment, isLoading: establishmentLoading } = useEstablishmentAuth();
  
  const { orders, isLoading: ordersLoading, updateOrderStatus, updateMultipleOrderStatus } = useEstablishmentOrders();
  const { products, categories, isLoading: productsLoading, createProduct, updateProduct, deleteProduct, refreshData: refreshProductsData } = useEstablishmentProducts();
  const { promotions, reviews, isLoading: promotionsLoading, createPromotion, updatePromotion, deletePromotion, refreshData: refreshReviewsData } = usePromotionsAndReviews();
  const respondToReview = useRespondToReview();
  const { newOrders, clearNewOrders } = useRealTimeOrders();
  const { subscription, createCheckoutSession } = useSubscription();
  const { validation, isLoading: validationLoading, refreshValidation } = useEstablishmentValidation();
  const { createStripeAccount } = useStripeConnect();
  const { customers, isLoading: customersLoading, getCustomerSegments, refreshCustomers } = useCustomerProfiles();
  const { campaigns: marketingCampaigns, isLoading: campaignsLoading, createCampaign, sendCampaign, getCampaignStats } = useMarketingCampaigns();

  // Tab navigation state with hash detection
  const [activeTab, setActiveTab] = useState("subscription");
  const tabs = useMemo(() => [
    "subscription",
    "orders",
    "products",
    "payments",
    "promotions",
    "reviews",
    "marketing",
    "social",
    "chatbot",
    "settings"
  ], []);
  
  // Handle URL hash for direct navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && tabs.includes(hash)) {
        setActiveTab(hash);
      }
    };

    // Check initial hash
    handleHashChange();
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [tabs]);

  // Update URL hash when tab changes
  useEffect(() => {
    if (activeTab && window.location.hash !== `#${activeTab}`) {
      window.history.replaceState(null, '', `#${activeTab}`);
    }
  }, [activeTab]);
  
  // Enhanced swipe navigation with visual feedback
  const { swipeHandlers, isSwiping, deltaX } = useSwipeNavigation({
    onSwipeLeft: () => {
      const currentIndex = tabs.indexOf(activeTab);
      if (currentIndex < tabs.length - 1) {
        setActiveTab(tabs[currentIndex + 1]);
      }
    },
    onSwipeRight: () => {
      const currentIndex = tabs.indexOf(activeTab);
      if (currentIndex > 0) {
        setActiveTab(tabs[currentIndex - 1]);
      }
    }
  }, { threshold: 40, trackMouse: true });

  // Keyboard navigation
  const { shortcuts } = useKeyboardNavigation({
    activeTab,
    setActiveTab,
    tabs,
    isEnabled: !isMobile // Disable on mobile to avoid conflicts
  });

  // Modal states
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderStatusModalOpen, setIsOrderStatusModalOpen] = useState(false);
  const [isOrderDetailsModalOpen, setIsOrderDetailsModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [isReviewResponseModalOpen, setIsReviewResponseModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<DashboardReview | null>(null);
  
  // Dashboard card modals
  const [isTodayOrdersModalOpen, setIsTodayOrdersModalOpen] = useState(false);
  const [isTodayRevenueModalOpen, setIsTodayRevenueModalOpen] = useState(false);
  const [isActiveProductsModalOpen, setIsActiveProductsModalOpen] = useState(false);
  const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false);

  // Filter states
  const [orderFilter, setOrderFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("");
  
  // Marketing states
  const [selectedCustomers, setSelectedCustomers] = useState<CustomerProfile[]>([]);
  const [showCampaignCreator, setShowCampaignCreator] = useState(false);
  const [showCampaignManager, setShowCampaignManager] = useState(false);
  const [showCampaignAnalytics, setShowCampaignAnalytics] = useState(false);
  const [selectedCampaignForEdit, setSelectedCampaignForEdit] = useState<Campaign | null>(null);
  
  // Payment gateway state
  const [paymentGateway, setPaymentGateway] = useState(establishment?.payment_gateway || "none");

  // Enhanced filtering states
  const [dateFilter, setDateFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [valueRangeFilter, setValueRangeFilter] = useState("all");

  // Memoized filtered data for better performance with advanced filters
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Basic text search
      const matchesFilter = !orderFilter || 
        order.customer_name?.toLowerCase().includes(orderFilter.toLowerCase()) ||
        order.customer_phone?.includes(orderFilter) ||
        order.id.toLowerCase().includes(orderFilter.toLowerCase());
      
      // Status filter
      const matchesStatus = !orderStatusFilter || orderStatusFilter === "all" || order.status === orderStatusFilter;
      
      // Date filter
      let matchesDate = true;
      if (dateFilter !== "all") {
        const orderDate = new Date(order.created_at);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        switch (dateFilter) {
          case "today": {
            matchesDate = orderDate.toDateString() === today.toDateString();
            break;
          }
          case "yesterday": {
            matchesDate = orderDate.toDateString() === yesterday.toDateString();
            break;
          }
          case "week": {
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            matchesDate = orderDate >= weekAgo;
            break;
          }
          case "month": {
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            matchesDate = orderDate >= monthAgo;
            break;
          }
        }
      }
      
      // Payment method filter
      const matchesPayment = paymentMethodFilter === "all" || order.payment_method === paymentMethodFilter;
      
      // Value range filter
      let matchesValue = true;
      if (valueRangeFilter !== "all") {
        const amount = order.total_amount;
        switch (valueRangeFilter) {
          case "0-25":
            matchesValue = amount >= 0 && amount <= 25;
            break;
          case "25-50":
            matchesValue = amount > 25 && amount <= 50;
            break;
          case "50-100":
            matchesValue = amount > 50 && amount <= 100;
            break;
          case "100+":
            matchesValue = amount > 100;
            break;
        }
      }
      
      return matchesFilter && matchesStatus && matchesDate && matchesPayment && matchesValue;
    });
  }, [orders, orderFilter, orderStatusFilter, dateFilter, paymentMethodFilter, valueRangeFilter]);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      return !productFilter || 
        product.name.toLowerCase().includes(productFilter.toLowerCase()) ||
        product.description?.toLowerCase().includes(productFilter.toLowerCase());
    });
  }, [products, productFilter]);

  // Mobile grid configuration
  const getGridCols = () => {
    if (isMobile) return "grid-cols-1";
    if (isTablet) return "grid-cols-2";
    return "grid-cols-3";
  };

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'confirmed': return 'bg-blue-500';
      case 'preparing': return 'bg-orange-500';
      case 'ready': return 'bg-green-500';
      case 'out_for_delivery': return 'bg-purple-500';
      case 'delivered': return 'bg-emerald-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'confirmed': return 'Confirmado';
      case 'preparing': return 'Preparando';
      case 'ready': return 'Pronto';
      case 'out_for_delivery': return 'Saiu para entrega';
      case 'delivered': return 'Entregue';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await deleteProduct(productId);
      toast({
        title: "Produto excluído",
        description: "O produto foi removido com sucesso."
      });
    } catch (error) {
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o produto.",
        variant: "destructive"
      });
    }
  };

  const handleToggleProductAvailability = async (productId: string, available: boolean) => {
    try {
      await updateProduct(productId, { is_available: available });
      toast({
        title: available ? "Produto disponibilizado" : "Produto indisponibilizado",
        description: "Status atualizado com sucesso."
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o status do produto.",
        variant: "destructive"
      });
    }
  };

  if (establishmentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!establishment) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className={`${isMobile ? 'px-4 py-4' : 'container mx-auto px-6 py-8'} space-y-6`}>
        
        {/* Enhanced Header */}
        <DashboardHeader
          establishment={establishment}
          newOrders={newOrders}
          isMobile={isMobile}
          onClearNewOrders={clearNewOrders}
        />

        {/* Overview Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <OptimizedDashboardOverview />
          </div>
          <div className="lg:col-span-1">
            <RealTimeOrdersWidget />
          </div>
        </div>

        {/* Enhanced Navigation with Swipe Indicators */}
        <div 
          {...swipeHandlers} 
          className={`touch-pan-y space-y-4 relative ${isSwiping ? 'transition-transform duration-200' : ''}`}
          style={{ transform: isMobile && isSwiping ? `translateX(${deltaX * 0.3}px)` : 'none' }}
        >
          {/* Swipe Indicator */}
          {isMobile && (
            <div className="flex justify-center mb-2">
              <div className="flex gap-1">
                {tabs.map((tab, index) => (
                  <div
                    key={tab}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      tabs.indexOf(activeTab) === index 
                        ? 'bg-primary w-6' 
                        : 'bg-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            
            {/* Enhanced Navigation */}
            <DashboardNavigation
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              tabs={tabs}
              isMobile={isMobile}
              isTablet={isTablet}
              newOrdersCount={newOrders.length}
              pendingReviewsCount={reviews.filter(r => !r.response).length}
            />

            {/* Subscription Tab */}
            <TabsContent value="subscription" className="space-y-6">
              <AnimatedTabContent activeTab={activeTab}>
                <div className="grid gap-6">
                  <SubscriptionManager />
                  
                  {validation.hasActiveSubscription && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-green-700">✓ Assinatura Ativa</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Sua assinatura está ativa e você pode receber pedidos.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </AnimatedTabContent>
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders" className="space-y-6">
              <AnimatedTabContent activeTab={activeTab}>
                <EstablishmentGuard>
                  <OrdersSection
                    filteredOrders={filteredOrders}
                    orderFilter={orderFilter}
                    setOrderFilter={setOrderFilter}
                    orderStatusFilter={orderStatusFilter}
                    setOrderStatusFilter={setOrderStatusFilter}
                    dateFilter={dateFilter}
                    setDateFilter={setDateFilter}
                    paymentMethodFilter={paymentMethodFilter}
                    setPaymentMethodFilter={setPaymentMethodFilter}
                    valueRangeFilter={valueRangeFilter}
                    setValueRangeFilter={setValueRangeFilter}
                    isMobile={isMobile}
                    onOrderSelect={(order) => {
                      setSelectedOrder(order);
                      setIsOrderDetailsModalOpen(true);
                    }}
                    onBulkStatusUpdate={updateMultipleOrderStatus}
                    getStatusColor={getStatusColor}
                    getStatusText={getStatusText}
                  />
                </EstablishmentGuard>
              </AnimatedTabContent>
            </TabsContent>

            {/* Products Tab */}
            <TabsContent value="products" className="space-y-6">
              <AnimatedTabContent activeTab={activeTab}>
                <EstablishmentGuard>
                  <ProductsSection
                    filteredProducts={filteredProducts}
                    productFilter={productFilter}
                    setProductFilter={setProductFilter}
                    isMobile={isMobile}
                    onAddProduct={() => {
                      setSelectedProduct(null);
                      setIsProductModalOpen(true);
                    }}
                    onEditProduct={(product) => {
                      setSelectedProduct(product);
                      setIsProductModalOpen(true);
                    }}
                    onDeleteProduct={handleDeleteProduct}
                    onToggleAvailability={handleToggleProductAvailability}
                    getGridCols={getGridCols}
                  />
                </EstablishmentGuard>
              </AnimatedTabContent>
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments" className="space-y-6">
              <AnimatedTabContent activeTab={activeTab}>
                <EstablishmentGuard>
                  <PaymentGatewayFlow establishment={establishment} />
                </EstablishmentGuard>
              </AnimatedTabContent>
            </TabsContent>

            {/* Promotions Tab */}
            <TabsContent value="promotions" className="space-y-6">
              <AnimatedTabContent activeTab={activeTab}>
                <EstablishmentGuard>
                  <PromotionsSection
                    promotions={promotions}
                    isLoading={promotionsLoading}
                    onCreatePromotion={() => {
                      setSelectedPromotion(null);
                      setIsPromotionModalOpen(true);
                    }}
                    onEditPromotion={(promotion) => {
                      setSelectedPromotion(promotion);
                      setIsPromotionModalOpen(true);
                    }}
                    onDeletePromotion={async (promotionId) => {
                      const success = await deletePromotion(promotionId);
                      if (success) {
                        toast({
                          title: "Promoção excluída",
                          description: "A promoção foi removida com sucesso."
                        });
                      }
                      return success;
                    }}
                    onToggleStatus={async (promotionId, isActive) => {
                      const success = await updatePromotion(promotionId, { is_active: isActive });
                      if (success) {
                        toast({
                          title: isActive ? "Promoção ativada" : "Promoção desativada",
                          description: `A promoção foi ${isActive ? 'ativada' : 'desativada'} com sucesso.`
                        });
                      }
                      return success;
                    }}
                    isMobile={isMobile}
                  />
                </EstablishmentGuard>
              </AnimatedTabContent>
            </TabsContent>

            {/* Reviews Tab */}
            <TabsContent value="reviews" className="space-y-6">
              <AnimatedTabContent activeTab={activeTab}>
                <EstablishmentGuard>
                  <ReviewsSection
                    reviews={reviews}
                    isLoading={promotionsLoading}
                    onRespondToReview={(review) => {
                      setSelectedReview(review);
                      setIsReviewResponseModalOpen(true);
                    }}
                    isMobile={isMobile}
                  />
                </EstablishmentGuard>
              </AnimatedTabContent>
            </TabsContent>

            {/* Marketing Tab */}
            <TabsContent value="marketing" className="space-y-6">
              <AnimatedTabContent activeTab={activeTab}>
                <EstablishmentGuard>
                  <MarketingSection isMobile={isMobile} />
                </EstablishmentGuard>
              </AnimatedTabContent>
            </TabsContent>

            {/* Social Tab */}
            <TabsContent value="social" className="space-y-6">
              <AnimatedTabContent activeTab={activeTab}>
                <EstablishmentGuard>
                  <SocialMediaIntegration />
                </EstablishmentGuard>
              </AnimatedTabContent>
            </TabsContent>

            {/* Chatbot Tab */}
            <TabsContent value="chatbot" className="space-y-6">
              <AnimatedTabContent activeTab={activeTab}>
                <EstablishmentGuard>
                  <ChatbotSection isMobile={isMobile} />
                </EstablishmentGuard>
              </AnimatedTabContent>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <AnimatedTabContent activeTab={activeTab}>
                <EstablishmentGuard>
                  <SettingsSection isMobile={isMobile} />
                  <WebhookConfiguration />
                </EstablishmentGuard>
              </AnimatedTabContent>
            </TabsContent>

          </Tabs>
          
          {/* Keyboard Shortcuts Hint - Desktop Only */}
          {!isMobile && (
            <div className="hidden lg:block mt-4">
              <div className="bg-gradient-to-r from-muted/30 to-muted/10 rounded-lg p-3 border border-border/30">
                <div className="flex justify-center items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-xs">←</kbd>
                    <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-xs">→</kbd>
                    Navegar
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-xs">1-8</kbd>
                    Ir para aba
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-xs">Home</kbd>
                    <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-xs">End</kbd>
                    Primeira/Última
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modals */}
        <EnhancedOrderDetailsModal
          order={selectedOrder}
          open={isOrderDetailsModalOpen}
          onOpenChange={setIsOrderDetailsModalOpen}
          getOrderStatusText={getStatusText}
          getOrderStatusColor={getStatusColor}
          onUpdateStatus={async (orderId, newStatus: "pending" | "confirmed" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "cancelled") => {
            try {
              await updateOrderStatus(orderId, newStatus);
              toast({
                title: "Status atualizado",
                description: "O status do pedido foi atualizado com sucesso."
              });
            } catch (error) {
              console.error('Error updating order status:', error);
              toast({
                title: "Erro ao atualizar",
                description: "Não foi possível atualizar o status do pedido.",
                variant: "destructive"
              });
            }
          }}
        />
        
        <UpdateOrderStatusModal
          isOpen={isOrderStatusModalOpen}
          onClose={() => setIsOrderStatusModalOpen(false)}
          order={selectedOrder}
          onUpdateStatus={async (orderId, newStatus: "pending" | "confirmed" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "cancelled") => {
            try {
              await updateOrderStatus(orderId, newStatus);
              toast({
                title: "Status atualizado",
                description: "O status do pedido foi atualizado com sucesso."
              });
              setIsOrderStatusModalOpen(false);
            } catch (error) {
              console.error('Error updating order status:', error);
              toast({
                title: "Erro ao atualizar",
                description: "Não foi possível atualizar o status do pedido.",
                variant: "destructive"
              });
            }
          }}
        />
        
        {/* Debug Panel for WhatsApp Testing */}
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
        </div>

        <ManageProductModal
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          product={selectedProduct}
          categories={categories}
          onSave={() => {
            setIsProductModalOpen(false);
          }}
          onCreateProduct={async (productData) => {
            try {
              await createProduct(productData);
              toast({
                title: "Produto criado",
                description: "O novo produto foi adicionado com sucesso."
              });
              return true;
            } catch (error) {
              console.error('Error saving product:', error);
              toast({
                title: "Erro ao salvar",
                description: "Não foi possível salvar o produto.",
                variant: "destructive"
              });
              return false;
            }
          }}
          onUpdateProduct={async (productId, productData) => {
            try {
              await updateProduct(productId, productData);
              toast({
                title: "Produto atualizado",
                description: "As informações do produto foram atualizadas."
              });
              return true;
            } catch (error) {
              console.error('Error updating product:', error);
              toast({
                title: "Erro ao atualizar",
                description: "Não foi possível atualizar o produto.",
                variant: "destructive"
              });
              return false;
            }
          }}
        />

        <CreatePromotionModal
          isOpen={isPromotionModalOpen}
          onClose={() => {
            setIsPromotionModalOpen(false);
            setSelectedPromotion(null);
          }}
          promotion={selectedPromotion}
          onSave={async (promotionData) => {
            try {
              let success = false;
              if (selectedPromotion) {
                // Update existing promotion
                success = await updatePromotion(selectedPromotion.id, promotionData);
                if (success) {
                  toast({
                    title: "Promoção atualizada",
                    description: "A promoção foi atualizada com sucesso."
                  });
                }
              } else {
                // Create new promotion
                success = await createPromotion(promotionData);
                if (success) {
                  toast({
                    title: "Promoção criada",
                    description: "A nova promoção foi criada com sucesso."
                  });
                }
              }
              if (success) {
                setIsPromotionModalOpen(false);
                setSelectedPromotion(null);
              }
              return success;
            } catch (error) {
              console.error('Error saving promotion:', error);
              toast({
                title: "Erro ao salvar",
                description: "Não foi possível salvar a promoção.",
                variant: "destructive"
              });
              return false;
            }
          }}
        />

        <RespondToReviewModal
          isOpen={isReviewResponseModalOpen}
          onClose={() => setIsReviewResponseModalOpen(false)}
          review={selectedReview}
          onSendResponse={async (reviewId: string, response: string) => {
            try {
              await respondToReview.mutateAsync({
                review_id: reviewId,
                establishment_id: establishment.id,
                response_text: response,
                is_public: true
              });
              setIsReviewResponseModalOpen(false);
              refreshReviewsData(); // Refresh reviews to show the new response
              return true;
            } catch (error) {
              console.error('Error responding to review:', error);
              toast({
                title: "Erro ao enviar",
                description: "Não foi possível enviar a resposta.",
                variant: "destructive"
              });
              return false;
            }
          }}
        />

        {/* Dashboard Card Modals */}
        <TodayOrdersModal
          isOpen={isTodayOrdersModalOpen}
          onClose={() => setIsTodayOrdersModalOpen(false)}
        />

        <TodayRevenueModal
          isOpen={isTodayRevenueModalOpen}
          onClose={() => setIsTodayRevenueModalOpen(false)}
        />

        <ActiveProductsModal
          isOpen={isActiveProductsModalOpen}
          onClose={() => setIsActiveProductsModalOpen(false)}
          onEditProduct={(product) => {
            setSelectedProduct(product);
            setIsProductModalOpen(true);
            setIsActiveProductsModalOpen(false);
          }}
          onToggleAvailability={(productId) => 
            handleToggleProductAvailability(productId, true)
          }
        />

        <ReviewsModal
          isOpen={isReviewsModalOpen}
          onClose={() => setIsReviewsModalOpen(false)}
          onRespondToReview={(review) => {
            setSelectedReview(review);
            setIsReviewResponseModalOpen(true);
            setIsReviewsModalOpen(false);
          }}
        />
      </div>
    </div>
  );
}
