import { useState } from "react";
import i18n from "@/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StarRating } from "@/components/rating/StarRating";
import { EnhancedOrderDetailsModal } from "@/components/modals/EnhancedOrderDetailsModal";
import { 
  Calendar,
  Clock,
  MapPin,
  Star,
  Package,
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
  FileText,
  TrendingUp,
  Users,
  DollarSign,
  BarChart3
} from "lucide-react";
import { Link } from "react-router-dom";
import { useUserOrders, Order } from "@/hooks/useUserOrders";
import { useEstablishmentOrderHistory, OrderHistoryItem } from "@/hooks/useEstablishmentOrderHistory";
import { useAuth } from "@/contexts/AuthContext";

export default function Orders() {
  const { user } = useAuth();
  
  // Customer orders hook
  const { orders: customerOrders, isLoading: customerLoading, getOrderStatusText: customerGetStatusText, getOrderStatusColor: customerGetStatusColor } = useUserOrders();
  
  // Establishment orders hook
  const { orders: establishmentOrders, isLoading: establishmentLoading, stats, getOrderStatusText: establishmentGetStatusText, getOrderStatusColor: establishmentGetStatusColor } = useEstablishmentOrderHistory();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | OrderHistoryItem | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Determine which data to use based on user type
  const isEstablishment = user?.type === 'establishment';
  const orders = isEstablishment ? establishmentOrders : customerOrders;
  const isLoading = isEstablishment ? establishmentLoading : customerLoading;
  const getOrderStatusText = isEstablishment ? establishmentGetStatusText : customerGetStatusText;
  const getOrderStatusColor = isEstablishment ? establishmentGetStatusColor : customerGetStatusColor;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="h-4 w-4" />;
      case "preparing":
        return <Package className="h-4 w-4" />;
      case "out_for_delivery":
        return <Clock className="h-4 w-4" />;
      case "cancelled":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };


  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (isEstablishment ? 
                           (order as OrderHistoryItem).customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) :
                           (order as Order).establishment_name?.toLowerCase().includes(searchTerm.toLowerCase())
                         ) || false;
    const matchesStatus = !statusFilter || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <div className="text-muted-foreground">
            <h3 className="text-lg font-semibold mb-2">{i18n.t('common:login_required_title')}</h3>
            <p className="mb-4">{i18n.t('common:login_required_desc')}</p>
            <Button asChild>
              <Link to="/auth">{i18n.t('common:nav_home')}</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {isEstablishment ? i18n.t('common:orders_header_establishment') : i18n.t('common:orders_header_customer')}
          </h1>
          <p className="text-muted-foreground">
            {isEstablishment 
              ? i18n.t('common:orders_header_establishment_desc')
              : i18n.t('common:orders_header_customer_desc')
            }
          </p>
        </div>

        {/* Stats for establishments */}
        {isEstablishment && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-card border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{i18n.t('common:metric_total_orders')}</p>
                    <p className="text-2xl font-bold">{stats.totalOrders}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-card border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{i18n.t('common:metric_total_revenue')}</p>
                    <p className="text-2xl font-bold">
                      {stats.totalRevenue.toLocaleString(i18n.language === 'en' ? 'en-US' : i18n.language === 'es' ? 'es-ES' : 'pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-card border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{i18n.t('common:metric_active_orders')}</p>
                    <p className="text-2xl font-bold">{stats.pendingOrders}</p>
                  </div>
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-card border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{i18n.t('common:metric_completed_orders')}</p>
                    <p className="text-2xl font-bold">{stats.completedOrders}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{i18n.t('common:filters')}</CardTitle>
          </CardHeader>
          <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="search">{i18n.t('common:filters_search_label')}</Label>
                    <Input
                      id="search"
                      placeholder={isEstablishment ? i18n.t('common:filters_search_placeholder_establishment') : i18n.t('common:filters_search_placeholder_customer')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="status">{i18n.t('common:filters_status_label')}</Label>
                    <select
                      id="status"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background"
                    >
                      <option value="">{i18n.t('common:filters_status_all')}</option>
                      <option value="pending">{i18n.t('common:status_pending')}</option>
                      <option value="confirmed">{i18n.t('common:status_confirmed')}</option>
                      <option value="preparing">{i18n.t('common:status_preparing')}</option>
                      <option value="ready">{i18n.t('common:status_ready')}</option>
                      <option value="out_for_delivery">{i18n.t('common:status_out_for_delivery')}</option>
                      <option value="delivered">{i18n.t('common:status_delivered')}</option>
                      <option value="cancelled">{i18n.t('common:status_cancelled')}</option>
                    </select>
                  </div>
                </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <div className="space-y-6">
          {isLoading ? (
            <Card className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>{i18n.t('common:loading_orders')}</p>
            </Card>
          ) : filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <Card key={order.id} className="bg-gradient-card border-border/50">
                <CardContent className="p-6">
                  <div className="space-y-4">
                     {/* Order Header */}
                     <div className="flex items-center justify-between">
                       <div className="flex items-center space-x-4">
                         {(isEstablishment ? 
                           (order as OrderHistoryItem).customer_avatar : 
                           (order as Order).establishment_logo
                         ) && (
                           <img
                             src={isEstablishment ? 
                               (order as OrderHistoryItem).customer_avatar : 
                               (order as Order).establishment_logo
                             }
                             alt={isEstablishment ? 
                               (order as OrderHistoryItem).customer_name : 
                               (order as Order).establishment_name
                             }
                             className="w-16 h-16 rounded-lg object-cover"
                           />
                         )}
                         <div>
                           <h3 className="font-semibold text-lg">
                           {isEstablishment ? 
                               (order as OrderHistoryItem).customer_name || i18n.t('common:view_customer', { defaultValue: 'Cliente' }) : 
                               (order as Order).establishment_name
                             }
                           </h3>
                          <p className="text-sm text-muted-foreground">#{order.id.slice(-8)}</p>
                           <div className="flex items-center space-x-2 mt-1">
                             <Calendar className="h-4 w-4 text-muted-foreground" />
                             <span className="text-sm text-muted-foreground">
                               {new Date(order.created_at).toLocaleString(i18n.language === 'pt' ? 'pt-BR' : i18n.language === 'es' ? 'es-ES' : 'en-US')}
                             </span>
                           </div>
                           {isEstablishment && (order as OrderHistoryItem).customer_phone && (
                             <p className="text-xs text-muted-foreground mt-1">
                               📱 {(order as OrderHistoryItem).customer_phone}
                             </p>
                           )}
                         </div>
                       </div>
                      
                      <div className="text-right">
                        <Badge className={`${getOrderStatusColor(order.status)} flex items-center gap-1 mb-2`}>
                          {getStatusIcon(order.status)}
                          {getOrderStatusText(order.status)}
                        </Badge>
                        <p className="text-lg font-bold">
                          {order.total_amount.toLocaleString(i18n.language === 'en' ? 'en-US' : i18n.language === 'es' ? 'es-ES' : 'pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="bg-muted/30 rounded-lg p-4">
                      <h4 className="font-medium mb-2">{i18n.t('common:order_items_title', { defaultValue: 'Itens do pedido:' })}</h4>
                      <div className="space-y-1">
                        {order.order_items?.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span>{item.quantity}x {item.product_name}</span>
                            <span>
                              {item.total_price.toLocaleString(i18n.language === 'en' ? 'en-US' : i18n.language === 'es' ? 'es-ES' : 'pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              })}
                            </span>
                          </div>
                        )) || (
                          <p className="text-sm text-muted-foreground">{i18n.t('common:order_items_none', { defaultValue: 'Itens não disponíveis' })}</p>
                        )}
                        {order.delivery_fee && (
                          <div className="flex justify-between text-sm pt-2 border-t border-border">
                            <span>{i18n.t('common:delivery_fee_label', { defaultValue: 'Taxa de entrega' })}</span>
                            <span>
                              {order.delivery_fee.toLocaleString(i18n.language === 'en' ? 'en-US' : i18n.language === 'es' ? 'es-ES' : 'pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                      {order.notes && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <p className="text-sm text-muted-foreground">
                            <strong>{i18n.t('common:observations_label', { defaultValue: 'Observações:' })}</strong> {order.notes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Order Details */}
                    <div className="grid grid-cols-1 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex items-start space-x-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <span>{order.delivery_address}</span>
                        </div>
                      </div>
                      
                       <div className="space-y-2">
                         <p><strong>{i18n.t('common:payment_label', { defaultValue: 'Pagamento:' })}</strong> {order.payment_method || i18n.t('common:not_provided', { defaultValue: 'Não informado' })}</p>
                         {order.status === "delivered" && order.delivered_at && (
                           <p><strong>{i18n.t('common:delivered_at_label', { defaultValue: 'Entregue em:' })}</strong> {new Date(order.delivered_at).toLocaleString(i18n.language === 'pt' ? 'pt-BR' : i18n.language === 'es' ? 'es-ES' : 'en-US')}</p>
                         )}
                         {order.estimated_delivery_time && order.status !== "delivered" && (
                           <p><strong>{i18n.t('common:estimated_label', { defaultValue: 'Previsão:' })}</strong> {new Date(order.estimated_delivery_time).toLocaleString(i18n.language === 'pt' ? 'pt-BR' : i18n.language === 'es' ? 'es-ES' : 'en-US')}</p>
                         )}
                         {isEstablishment && (order as OrderHistoryItem).customer_phone && (
                           <p><strong>{i18n.t('common:contact_label', { defaultValue: 'Contato:' })}</strong> {(order as OrderHistoryItem).customer_phone}</p>
                         )}
                       </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-4 border-t border-border">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsDetailsModalOpen(true);
                        }}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        {i18n.t('common:view_details_button', { defaultValue: 'Ver Detalhes' })}
                      </Button>

                       <Button asChild variant="outline" size="sm">
                         <Link to={isEstablishment ? 
                           `/customer/${(order as OrderHistoryItem).customer_id}` : 
                           `/establishment/${(order as Order).establishment_id}`
                         }>
                           <Eye className="h-4 w-4 mr-2" />
                           {isEstablishment ? i18n.t('common:view_customer', { defaultValue: 'Ver Cliente' }) : i18n.t('common:view_establishment', { defaultValue: 'Ver Estabelecimento' })}
                         </Link>
                       </Button>

                       {!isEstablishment && order.status === "delivered" && (
                         <Button variant="outline" size="sm">
                           <Star className="h-4 w-4 mr-2" />
                           {i18n.t('common:review_button', { defaultValue: 'Avaliar' })}
                         </Button>
                       )}

                       {!isEstablishment && (
                         <Button variant="outline" size="sm">
                           {i18n.t('common:repeat_order_button', { defaultValue: 'Repetir Pedido' })}
                         </Button>
                       )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="p-8 text-center">
              <div className="text-muted-foreground mb-4">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold">{i18n.t('common:no_orders_title')}</h3>
                <p>{i18n.t('common:no_orders_desc')}</p>
              </div>
               <Button asChild className="bg-gradient-primary hover:opacity-90">
                 <Link to={isEstablishment ? "/establishment-dashboard" : "/establishments"}>
                   {isEstablishment ? i18n.t('common:back_to_dashboard') : i18n.t('common:make_order')}
                 </Link>
               </Button>
            </Card>
          )}
        </div>

        {/* Modal de Detalhes */}
        <EnhancedOrderDetailsModal
          order={selectedOrder as unknown as Order}
          open={isDetailsModalOpen}
          onOpenChange={setIsDetailsModalOpen}
          getOrderStatusText={getOrderStatusText}
          getOrderStatusColor={getOrderStatusColor}
        />
      </div>
    </div>
  );
}
