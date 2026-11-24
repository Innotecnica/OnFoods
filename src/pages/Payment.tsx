import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { StripePaymentForm } from "@/components/checkout/StripePaymentForm";
import { MercadoPagoPaymentForm } from "@/components/checkout/MercadoPagoPaymentForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { UnifiedDiscountApplicator, UnifiedDiscount } from "@/components/checkout/UnifiedDiscountApplicator";
import { useCart } from "@/hooks/useCart";

interface PaymentOrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string | null;
  products: {
    name: string;
    price: number;
  };
}

interface PaymentOrder {
  id: string;
  customer_id: string;
  establishment_id: string;
  address_id: string;
  status: string;
  total_amount: number;
  delivery_fee: number | null;
  discount_amount: number | null;
  created_at: string;
  establishments: {
    business_name: string;
    payment_gateway: string;
  };
  addresses: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  order_items: PaymentOrderItem[];
}

export default function PaymentPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [appliedDiscount, setAppliedDiscount] = useState<UnifiedDiscount | null>(null);

  const loadOrder = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          establishments!inner(business_name, payment_gateway),
          addresses!inner(*),
          order_items!inner(
            *,
            products!inner(name, price)
          )
        `)
        .eq('id', orderId)
        .eq('customer_id', user?.id)
        .single();

      if (error) throw error;
      setOrder(data);
    } catch (error) {
      console.error('Error loading order:', error);
      toast({
        title: "Erro",
        description: "Pedido não encontrado",
        variant: "destructive",
      });
      navigate('/orders');
    } finally {
      setIsLoading(false);
    }
  }, [orderId, user, navigate]);

  useEffect(() => {
    if (orderId && user) {
      loadOrder();
    }
  }, [orderId, user, loadOrder]);

  const handlePaymentSuccess = async () => {
    // Clear the cart for this establishment since the order was completed
    if (order?.establishment_id) {
      try {
        await clearCart(order.establishment_id);
      } catch (error) {
        console.error('Error clearing cart after successful payment:', error);
        // Don't block the success flow if cart clearing fails
      }
    }

    toast({
      title: "Pagamento confirmado!",
      description: "Seu pedido foi confirmado e será enviado para o estabelecimento.",
      duration: 4000,
    });
    navigate('/orders');
  };

  const handlePaymentError = () => {
    toast({
      title: "Erro no pagamento",
      description: "Houve um problema com o pagamento. Tente novamente.",
      variant: "destructive",
    });
  };

  const handleDiscountApplied = (discount: UnifiedDiscount | null) => {
    setAppliedDiscount(discount);
  };

  const calculateDiscountAmount = () => {
    if (!appliedDiscount || !order) return 0;
    return appliedDiscount.discountAmount;
  };

  const getFinalTotal = () => {
    if (!order) return 0;
    const discount = calculateDiscountAmount();
    return Math.max(0, order.total_amount - discount);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando pedido...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Pedido não encontrado</h2>
            <p className="text-muted-foreground mb-4">
              O pedido solicitado não foi encontrado ou você não tem acesso a ele.
            </p>
            <Button onClick={() => navigate('/orders')}>
              Voltar para Pedidos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if it's Mercado Pago payment
  if (order?.establishments?.payment_gateway === 'mercado_pago') {
    return <MercadoPagoPaymentForm />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" onClick={() => navigate('/cart')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Carrinho
          </Button>
          <h1 className="text-2xl font-bold">Finalizar Pagamento</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold">{order.establishments.business_name}</h3>
                <p className="text-sm text-muted-foreground">
                  Pedido #{order.id.substring(0, 8).toUpperCase()}
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Itens do Pedido:</h4>
                {order.order_items.map((item: PaymentOrderItem) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.quantity}x {item.products.name}</span>
                    <span>R$ {item.total_price.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>R$ {(order.total_amount - (order.delivery_fee || 0)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Taxa de entrega</span>
                  <span>R$ {(order.delivery_fee || 0).toFixed(2)}</span>
                </div>
                {appliedDiscount && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Desconto ({appliedDiscount.name})</span>
                    <span>-R$ {calculateDiscountAmount().toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>R$ {getFinalTotal().toFixed(2)}</span>
                </div>
              </div>

              {/* Unified Discount Field */}
              <div className="border-t pt-4">
                <UnifiedDiscountApplicator
                  establishmentId={order.establishment_id}
                  orderTotal={order.total_amount - (order.delivery_fee || 0)}
                  customerId={user?.id}
                  onDiscountApplied={handleDiscountApplied}
                />
              </div>

              <div className="bg-muted/50 p-3 rounded-lg">
                <h4 className="font-medium mb-1">Endereço de Entrega:</h4>
                <p className="text-sm">
                  {order.addresses.street}, {order.addresses.number}
                  <br />
                  {order.addresses.neighborhood}, {order.addresses.city} - {order.addresses.state}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <StripePaymentForm
            orderId={order.id}
            establishmentId={order.establishment_id}
            couponCode={appliedDiscount?.type === 'coupon' ? appliedDiscount.id : undefined}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        </div>
      </div>
    </div>
  );
}
