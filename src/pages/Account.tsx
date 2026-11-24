import { useState, useRef, useEffect } from "react";
import i18n from "@/i18n";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  User, 
  MapPin, 
  ShoppingBag,
  Bell, 
  Shield,
  Edit,
  Plus,
  Trash2,
  LogOut,
  Upload,
  Clock,
  History,
  Store,
  Package,
  BarChart3,
  Settings,
  CreditCard,
  MessageSquare
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserAddresses } from "@/hooks/useUserAddresses";
import { useUserOrders } from "@/hooks/useUserOrders";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { useEstablishmentAuth } from "@/hooks/useEstablishmentAuth";
import { useEstablishmentOrders } from "@/hooks/useEstablishmentOrders";
import { useEstablishmentDeletion } from "@/hooks/useEstablishmentDeletion";
import { redirectToStripeConnect } from "@/utils/stripeRedirect";
import { AddressModal } from "@/components/modals/AddressModal";
import { ChangePasswordModal } from "@/components/modals/ChangePasswordModal";
import { DeleteEstablishmentModal } from "@/components/modals/DeleteEstablishmentModal";
import { SavedCardsManager } from "@/components/cards/SavedCardsManager";
import { MobileTabNavigation } from "@/components/account/MobileTabNavigation";
import { PaymentGatewayFlow } from "@/components/settings/PaymentGatewayFlow";
import { toast } from "@/hooks/use-toast";
import type { Address, CreateAddressData } from "@/hooks/useUserAddresses";
import { formatCurrency, formatDate } from "@/utils/formatting";
import type { PaymentGateway } from "@/types";

export default function Account() {
  const navigate = useNavigate();
  const { user, logout, isLoading: authLoading } = useAuth();
  const { profile, isLoading: profileLoading, isUpdating, updateProfile, uploadAvatar, changePassword } = useUserProfile();
  const { addresses, isLoading: addressesLoading, isUpdating: addressUpdating, createAddress, updateAddress, deleteAddress, setDefaultAddress } = useUserAddresses();
  const { orders, isLoading: ordersLoading, getOrderStatusText, getOrderStatusColor } = useUserOrders();
  const { preferences: notifications, setPreferences: setNotifications, isUpdating: notificationsUpdating, updatePreferences } = useNotificationPreferences();
  
  // Establishment-specific hooks
  const { establishment, isLoading: establishmentLoading, updateEstablishment } = useEstablishmentAuth();
  const { orders: establishmentOrders, isLoading: establishmentOrdersLoading } = useEstablishmentOrders();
  const { deleteEstablishment, isDeleting } = useEstablishmentDeletion();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    cpf: '',
    birth_date: '',
  });
  const [establishmentData, setEstablishmentData] = useState({
    business_name: '',
    business_type: '',
    cnpj: '',
    address: '',
    phone: '',
    description: '',
    delivery_fee: 0,
    minimum_order: 0,
    delivery_time_min: 30,
    delivery_time_max: 60,
    payment_gateway: 'none' as PaymentGateway,
  });
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  
  // Get tab from URL params with state management
  const urlParams = new URLSearchParams(window.location.search);
  const [currentTab, setCurrentTab] = useState(urlParams.get('tab') || 'profile');

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    // Update URL without page reload
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('tab', tab);
    window.history.replaceState({}, '', newUrl.toString());
  };

  // Handle saving notification preferences
  const handleSaveNotifications = async () => {
    await updatePreferences(notifications);
  };

  // Update form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        phone: profile.phone || '',
        cpf: profile.cpf || '',
        birth_date: profile.birth_date || '',
      });
    }
  }, [profile]);

  // Update establishment data when establishment loads
  useEffect(() => {
    if (establishment) {
      setEstablishmentData({
        business_name: establishment.business_name || '',
        business_type: establishment.business_type || '',
        cnpj: establishment.cnpj || '',
        address: establishment.address || '',
        phone: establishment.phone || '',
        description: establishment.description || '',
        delivery_fee: establishment.delivery_fee || 0,
        minimum_order: establishment.minimum_order || 0,
        delivery_time_min: establishment.delivery_time_min || 30,
        delivery_time_max: establishment.delivery_time_max || 60,
        payment_gateway: ((value => {
          const valid: PaymentGateway[] = ['stripe', 'whatsapp', 'mercado_pago', 'none'];
          return valid.includes(value as PaymentGateway)
            ? (value as PaymentGateway)
            : 'none';
        })(establishment.payment_gateway)) as PaymentGateway,
      });
    }
  }, [establishment]);

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleProfileUpdate = async () => {
    const success = await updateProfile(formData);
    if (success) {
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      });
    }
  };

  const handleEstablishmentUpdate = async () => {
    const success = await updateEstablishment(establishmentData);
    if (success) {
      toast({
        title: "Estabelecimento atualizado",
        description: "As informações do estabelecimento foram atualizadas com sucesso.",
      });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input to allow same file selection
    e.target.value = '';

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Formato inválido",
        description: "Use apenas arquivos JPG, PNG ou WEBP.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 2MB.",
        variant: "destructive",
      });
      return;
    }

    // Validate image dimensions
    const img = new Image();
    img.onload = async () => {
      try {
        // Check minimum dimensions
        if (img.width < 100 || img.height < 100) {
          toast({
            title: "Resolução insuficiente",
            description: "A imagem deve ter pelo menos 100x100px.",
            variant: "destructive",
          });
          return;
        }

        // Check maximum dimensions
        if (img.width > 1000 || img.height > 1000) {
          toast({
            title: "Resolução muito alta",
            description: "Recomendamos máximo 1000x1000px para melhor desempenho.",
          });
        }

        // Check aspect ratio for better UI
        const aspectRatio = img.width / img.height;
        if (aspectRatio < 0.5 || aspectRatio > 2) {
          toast({
            title: "Proporções inadequadas",
            description: "Para melhor resultado, use uma imagem mais quadrada.",
          });
        }

        await uploadAvatar(file);
      } catch (error) {
        console.error('Avatar upload error:', error);
        toast({
          title: "Erro no upload",
          description: "Não foi possível fazer upload do avatar.",
          variant: "destructive",
        });
      }
    };

    img.onerror = () => {
      toast({
        title: "Arquivo corrompido",
        description: "Não foi possível carregar a imagem. Tente outro arquivo.",
        variant: "destructive",
      });
    };

    img.src = URL.createObjectURL(file);
  };

  const handleAddressEdit = (address: Address) => {
    setSelectedAddress(address);
    setIsAddressModalOpen(true);
  };

  const handleAddressCreate = () => {
    setSelectedAddress(null);
    setIsAddressModalOpen(true);
  };

  const handleAddressSave = async (addressData: CreateAddressData) => {
    if (selectedAddress) {
      return await updateAddress(selectedAddress.id, addressData);
    } else {
      return await createAddress(addressData);
    }
  };

  const handleStripeConnect = async () => {
    try {
      await redirectToStripeConnect();
      toast({
        title: "Stripe Connect",
        description: "Redirecionando para configuração do Stripe Connect...",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao configurar Stripe Connect",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isLoading = authLoading || profileLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-6 lg:py-8 max-w-7xl">
        {/* Enhanced Header */}
        <div className="bg-card/80 backdrop-blur-sm rounded-xl border shadow-sm p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-primary/20">
                <AvatarImage src={profile?.avatar_url || ''} alt={profile?.name || ''} />
                <AvatarFallback className="text-xl bg-gradient-primary text-white">
                  {profile?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Olá, {profile?.name?.split(' ')[0] || 'Usuário'}!
                </h1>
                <p className="text-muted-foreground">
                  {user.type === 'establishment' 
                    ? 'Gerencie seu estabelecimento e pedidos' 
                    : 'Gerencie suas informações e preferências'
                  }
                </p>
                <Badge variant={user.type === "customer" ? "default" : "secondary"} className="mt-2">
                  {user.type === "customer" ? "👤 Cliente" : "🏪 Estabelecimento"}
                </Badge>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="flex items-center gap-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all"
            >
              <LogOut className="h-4 w-4" />
              {i18n.t('common:logout')}
            </Button>
          </div>
        </div>

        {/* Mobile Tab Navigation */}
        <MobileTabNavigation 
          currentTab={currentTab}
          onTabChange={handleTabChange}
          userType={user.type}
        />

        {/* Improved Navigation Tabs */}
        <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
          {user.type === 'establishment' ? (
            <div className="hidden lg:block bg-card/80 backdrop-blur-sm rounded-xl border shadow-sm p-2">
              <TabsList className="grid w-full grid-cols-6 gap-1 bg-transparent">
                <TabsTrigger value="profile" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                  <User className="h-4 w-4" />
                  <span>Perfil</span>
                </TabsTrigger>
                <TabsTrigger value="establishment" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                  <Store className="h-4 w-4" />
                  <span>Estabelecimento</span>
                </TabsTrigger>
                <TabsTrigger value="payments" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                  <CreditCard className="h-4 w-4" />
                  <span>Pagamentos</span>
                </TabsTrigger>
                <TabsTrigger value="orders" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                  <Package className="h-4 w-4" />
                  <span>Pedidos</span>
                </TabsTrigger>
                <TabsTrigger value="security" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                  <Shield className="h-4 w-4" />
                  <span>Segurança</span>
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                  <Bell className="h-4 w-4" />
                  <span>Notificações</span>
                </TabsTrigger>
              </TabsList>
            </div>
          ) : (
            <div className="hidden lg:block bg-card/80 backdrop-blur-sm rounded-xl border shadow-sm p-2">
              <TabsList className="grid w-full grid-cols-6 gap-1 bg-transparent">
                <TabsTrigger value="profile" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                  <User className="h-4 w-4" />
                  <span>Perfil</span>
                </TabsTrigger>
                <TabsTrigger value="addresses" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                  <MapPin className="h-4 w-4" />
                  <span>Endereços</span>
                </TabsTrigger>
                <TabsTrigger value="cards" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                  <CreditCard className="h-4 w-4" />
                  <span>Cartões</span>
                </TabsTrigger>
                <TabsTrigger value="orders" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                  <ShoppingBag className="h-4 w-4" />
                  <span>Pedidos</span>
                </TabsTrigger>
                <TabsTrigger value="security" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                  <Shield className="h-4 w-4" />
                  <span>Segurança</span>
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                  <Bell className="h-4 w-4" />
                  <span>Notificações</span>
                </TabsTrigger>
              </TabsList>
            </div>
          )}

          {/* Enhanced Profile Tab */}
          <TabsContent value="profile">
            <Card className="bg-card/80 backdrop-blur-sm border shadow-sm">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-t-lg">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  Informações Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-8 p-6">
                {/* Avatar Section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-4 bg-muted/30 rounded-xl">
                  <Avatar className="h-24 w-24 border-4 border-primary/20 shadow-lg">
                    <AvatarImage src={profile?.avatar_url || ''} alt={profile?.name || ''} />
                    <AvatarFallback className="text-xl bg-gradient-primary text-white">
                      {profile?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="text-lg font-semibold">{profile?.name || 'Nome não informado'}</h3>
                      <p className="text-muted-foreground">{profile?.email}</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUpdating}
                      className="bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 border-primary/20"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {isUpdating ? "Enviando..." : "Alterar Foto"}
                    </Button>
                     <p className="text-xs text-muted-foreground">
                       JPG, PNG, WEBP • máx. 2MB • mín. 100x100px
                     </p>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Nome Completo
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="h-12 transition-all focus:ring-2 focus:ring-primary/20"
                      placeholder="Digite seu nome completo"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                      📧 E-mail
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile?.email || ''}
                      disabled
                      className="h-12 bg-muted/50 border-muted"
                    />
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      🔒 O email não pode ser alterado
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                      📱 Telefone
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="(11) 99999-9999"
                      className="h-12 transition-all focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="cpf" className="text-sm font-medium flex items-center gap-2">
                      📄 CPF
                    </Label>
                    <Input
                      id="cpf"
                      value={formData.cpf}
                      onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                      placeholder="000.000.000-00"
                      className="h-12 transition-all focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="birth_date" className="text-sm font-medium flex items-center gap-2">
                      🎂 Data de Nascimento
                    </Label>
                    <Input
                      id="birth_date"
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                      className="h-12 transition-all focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      👤 Tipo de Conta
                    </Label>
                    <div className="flex items-center space-x-2 p-3 bg-muted/30 rounded-lg">
                      <Badge variant={user.type === "customer" ? "default" : "secondary"} className="text-sm">
                        {user.type === "customer" ? "🛒 Cliente" : "🏪 Estabelecimento"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {user.type === "customer" ? "Conta para fazer pedidos" : "Conta para vender produtos"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="flex justify-end pt-6 border-t">
                  <Button 
                    onClick={handleProfileUpdate} 
                    disabled={isUpdating}
                    className="bg-gradient-primary hover:opacity-90 shadow-lg px-8 h-12"
                  >
                    {isUpdating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <User className="h-4 w-4 mr-2" />
                        Salvar Alterações
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Establishment Tab - Only for establishments */}
          {user.type === 'establishment' && (
            <TabsContent value="establishment">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    Dados do Estabelecimento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="business_name">Nome do Negócio</Label>
                      <Input
                        id="business_name"
                        value={establishmentData.business_name}
                        onChange={(e) => setEstablishmentData({...establishmentData, business_name: e.target.value})}
                        placeholder="Nome do seu estabelecimento"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="business_type">Tipo de Negócio</Label>
                      <Input
                        id="business_type"
                        value={establishmentData.business_type}
                        onChange={(e) => setEstablishmentData({...establishmentData, business_type: e.target.value})}
                        placeholder="Ex: Restaurante, Padaria, etc."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cnpj">CNPJ</Label>
                      <Input
                        id="cnpj"
                        value={establishmentData.cnpj}
                        onChange={(e) => setEstablishmentData({...establishmentData, cnpj: e.target.value})}
                        placeholder="00.000.000/0000-00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="establishment_phone">Telefone do Estabelecimento</Label>
                      <Input
                        id="establishment_phone"
                        value={establishmentData.phone}
                        onChange={(e) => setEstablishmentData({...establishmentData, phone: e.target.value})}
                        placeholder="(11) 99999-9999"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address">Endereço</Label>
                      <Input
                        id="address"
                        value={establishmentData.address}
                        onChange={(e) => setEstablishmentData({...establishmentData, address: e.target.value})}
                        placeholder="Endereço completo do estabelecimento"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="description">Descrição</Label>
                      <Input
                        id="description"
                        value={establishmentData.description}
                        onChange={(e) => setEstablishmentData({...establishmentData, description: e.target.value})}
                        placeholder="Descreva seu estabelecimento"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="delivery_fee">Taxa de Entrega (R$)</Label>
                      <Input
                        id="delivery_fee"
                        type="number"
                        step="0.01"
                        value={establishmentData.delivery_fee}
                        onChange={(e) => setEstablishmentData({...establishmentData, delivery_fee: parseFloat(e.target.value) || 0})}
                        placeholder="5.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="minimum_order">Pedido Mínimo (R$)</Label>
                      <Input
                        id="minimum_order"
                        type="number"
                        step="0.01"
                        value={establishmentData.minimum_order}
                        onChange={(e) => setEstablishmentData({...establishmentData, minimum_order: parseFloat(e.target.value) || 0})}
                        placeholder="20.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="delivery_time_min">Tempo Mínimo de Entrega (min)</Label>
                      <Input
                        id="delivery_time_min"
                        type="number"
                        value={establishmentData.delivery_time_min}
                        onChange={(e) => setEstablishmentData({...establishmentData, delivery_time_min: parseInt(e.target.value) || 30})}
                        placeholder="30"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="delivery_time_max">Tempo Máximo de Entrega (min)</Label>
                      <Input
                        id="delivery_time_max"
                        type="number"
                        value={establishmentData.delivery_time_max}
                        onChange={(e) => setEstablishmentData({...establishmentData, delivery_time_max: parseInt(e.target.value) || 60})}
                        placeholder="60"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      onClick={handleEstablishmentUpdate} 
                      disabled={isUpdating}
                      className="bg-gradient-primary hover:opacity-90"
                    >
                      {isUpdating ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Payment Gateway Tab - Only for establishments */}
          {user.type === 'establishment' && (
            <TabsContent value="payments">
              {establishment ? (
                <PaymentGatewayFlow establishment={establishment} />
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Carregando informações do estabelecimento...</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}

          {/* Addresses Tab - Only for customers */}
          {user.type === 'customer' && (
            <TabsContent value="addresses">
              <div className="space-y-6">
                {/* Header with actions */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <MapPin className="h-5 w-5" />
                          Meus Endereços
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Gerencie seus endereços de entrega
                        </p>
                      </div>
                      <Button 
                        onClick={handleAddressCreate} 
                        className="bg-gradient-primary hover:opacity-90"
                        disabled={addressUpdating}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Endereço
                      </Button>
                    </div>
                  </CardHeader>
                </Card>

                {/* Loading state */}
                {addressesLoading && (
                  <Card>
                    <CardContent className="p-8">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <span className="ml-3 text-muted-foreground">Carregando endereços...</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Empty state */}
                {!addressesLoading && addresses.length === 0 && (
                  <Card>
                    <CardContent className="p-8">
                      <div className="text-center">
                        <MapPin className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">Nenhum endereço cadastrado</h3>
                        <p className="text-muted-foreground mb-6">
                          Adicione seu primeiro endereço para facilitar suas compras
                        </p>
                        <Button 
                          onClick={handleAddressCreate}
                          className="bg-gradient-primary hover:opacity-90"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar Primeiro Endereço
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Address list */}
                {!addressesLoading && addresses.length > 0 && (
                  <div className="grid gap-4">
                    {addresses.map((address) => (
                      <Card key={address.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-primary" />
                                  <h4 className="font-semibold text-lg">
                                    {address.street}, {address.number}
                                  </h4>
                                </div>
                                {address.is_default && (
                                  <Badge className="bg-gradient-primary text-white border-0">
                                    Endereço Padrão
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="space-y-1 text-muted-foreground">
                                {address.complement && (
                                  <p className="text-sm">
                                    <span className="font-medium">Complemento:</span> {address.complement}
                                  </p>
                                )}
                                <p className="text-sm">
                                  <span className="font-medium">Bairro:</span> {address.neighborhood}
                                </p>
                                <p className="text-sm">
                                  <span className="font-medium">Cidade:</span> {address.city} - {address.state}
                                </p>
                                <p className="text-sm">
                                  <span className="font-medium">CEP:</span> {address.zip_code}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-2 ml-4">
                              {!address.is_default && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setDefaultAddress(address.id)}
                                  disabled={addressUpdating}
                                  className="w-full"
                                >
                                  Definir como Padrão
                                </Button>
                              )}
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleAddressEdit(address)}
                                  disabled={addressUpdating}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => deleteAddress(address.id)}
                                  disabled={address.is_default || addressUpdating}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Address metadata */}
                          <div className="mt-4 pt-4 border-t border-border">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>
                                Adicionado em {new Date(address.created_at).toLocaleDateString('pt-BR')}
                              </span>
                              {address.is_default && (
                                <span className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                                  Usado para entregas
                                </span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          )}

          {/* Saved Cards Tab - Only for customers */}
          {user.type === 'customer' && (
            <TabsContent value="cards">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Cartões Salvos
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Gerencie seus cartões salvos para pagamentos rápidos e seguros
                    </p>
                  </CardHeader>
                </Card>
                
                <SavedCardsManager />
              </div>
            </TabsContent>
          )}

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  {user.type === 'establishment' ? 'Pedidos Recebidos' : 'Meus Pedidos'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {user.type === 'establishment' ? (
                  // Establishment Orders View
                  establishmentOrdersLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : establishmentOrders.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum pedido recebido ainda</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {establishmentOrders.map((order) => (
                        <div key={order.id} className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold">{order.customer_name}</h4>
                                <Badge className={`
                                  ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                                  ${order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' : ''}
                                  ${order.status === 'preparing' ? 'bg-orange-100 text-orange-800' : ''}
                                  ${order.status === 'ready' ? 'bg-purple-100 text-purple-800' : ''}
                                  ${order.status === 'out_for_delivery' ? 'bg-indigo-100 text-indigo-800' : ''}
                                  ${order.status === 'delivered' ? 'bg-green-100 text-green-800' : ''}
                                  ${order.status === 'cancelled' ? 'bg-red-100 text-red-800' : ''}
                                `}>
                                  {order.status === 'pending' && 'Pendente'}
                                  {order.status === 'confirmed' && 'Confirmado'}
                                  {order.status === 'preparing' && 'Preparando'}
                                  {order.status === 'ready' && 'Pronto'}
                                  {order.status === 'out_for_delivery' && 'Saiu para entrega'}
                                  {order.status === 'delivered' && 'Entregue'}
                                  {order.status === 'cancelled' && 'Cancelado'}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Pedido #{order.id.slice(-8)} • {formatDate(order.created_at, 'short')} às {formatDate(order.created_at, 'time')}
                              </p>
                              {order.customer_phone && (
                                <p className="text-sm text-muted-foreground">
                                  <strong>Telefone:</strong> {order.customer_phone}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{formatCurrency(order.total_amount)}</p>
                              <p className="text-sm text-muted-foreground">
                                Método: {order.payment_method === 'credit_card' ? 'Cartão de Crédito' : 
                                         order.payment_method === 'debit_card' ? 'Cartão de Débito' :
                                         order.payment_method === 'pix' ? 'PIX' : 'Dinheiro'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                              <strong>Endereço de entrega:</strong> {order.delivery_address}
                            </p>
                            
                            {order.order_items && order.order_items.length > 0 && (
                              <div>
                                <p className="text-sm font-medium mb-1">Itens:</p>
                                <div className="space-y-1">
                                  {order.order_items.map((item) => (
                                    <p key={item.id} className="text-sm text-muted-foreground">
                                      {item.quantity}x {item.product_name} - {formatCurrency(item.total_price)}
                                      {item.notes && <span className="italic"> - {item.notes}</span>}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {order.notes && (
                              <p className="text-sm text-muted-foreground">
                                <strong>Observações do cliente:</strong> {order.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  // Customer Orders View
                  ordersLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum pedido encontrado</p>
                      <Button
                        className="mt-4"
                        onClick={() => navigate('/establishments')}
                      >
                        Fazer primeiro pedido
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <div key={order.id} className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold">{order.establishment_name}</h4>
                                <Badge className={getOrderStatusColor(order.status)}>
                                  {getOrderStatusText(order.status)}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Pedido #{order.id.slice(-8)} • {formatDate(order.created_at, 'short')}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{formatCurrency(order.total_amount)}</p>
                              {order.delivered_at && (
                                <p className="text-sm text-muted-foreground">
                                  Entregue em {formatDate(order.delivered_at, 'short')}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                              <strong>Endereço:</strong> {order.delivery_address}
                            </p>
                            
                            {order.order_items && order.order_items.length > 0 && (
                              <div>
                                <p className="text-sm font-medium mb-1">Itens:</p>
                                <div className="space-y-1">
                                  {order.order_items.map((item) => (
                                    <p key={item.id} className="text-sm text-muted-foreground">
                                      {item.quantity}x {item.product_name} - {formatCurrency(item.total_price)}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {order.notes && (
                              <p className="text-sm text-muted-foreground">
                                <strong>Observações:</strong> {order.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Segurança
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Alterar Senha</h4>
                      <p className="text-sm text-muted-foreground">
                        Altere sua senha para manter sua conta segura
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setIsPasswordModalOpen(true)}
                    >
                      Alterar Senha
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Exclusão de Conta - Apenas para estabelecimentos */}
              {user.type === 'establishment' && (
                <Card className="border-destructive/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      <Trash2 className="h-5 w-5" />
                      Zona de Perigo
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Ações irreversíveis que afetam permanentemente sua conta
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 border border-destructive/30 rounded-lg bg-destructive/5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-destructive mb-2">
                            Excluir Conta do Estabelecimento
                          </h4>
                          <div className="space-y-2 text-sm text-muted-foreground">
                            <p>
                              <strong>Esta ação é permanente e irreversível.</strong> Ao excluir sua conta, você perderá:
                            </p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                              <li>Todos os produtos e categorias</li>
                              <li>Histórico completo de pedidos</li>
                              <li>Avaliações e comentários dos clientes</li>
                              <li>Configurações de pagamento</li>
                              <li>Dados de marketing e campanhas</li>
                              <li>Informações financeiras</li>
                            </ul>
                            <p className="font-medium text-destructive mt-3">
                              ⚠️ Após a exclusão, não será possível recuperar nenhum dado ou reativar a conta.
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          onClick={() => setIsDeleteModalOpen(true)}
                          className="ml-4 flex-shrink-0"
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                              Excluindo...
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir Conta
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Preferências de Notificação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Atualizações de Pedidos</h4>
                      <p className="text-sm text-muted-foreground">
                        Receba notificações sobre o status dos seus pedidos
                      </p>
                    </div>
                    <Switch
                      checked={notifications.orders}
                      onCheckedChange={(checked) => setNotifications({...notifications, orders: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Promoções e Ofertas</h4>
                      <p className="text-sm text-muted-foreground">
                        Receba ofertas especiais e promoções dos estabelecimentos
                      </p>
                    </div>
                    <Switch
                      checked={notifications.promotions}
                      onCheckedChange={(checked) => setNotifications({...notifications, promotions: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Newsletter</h4>
                      <p className="text-sm text-muted-foreground">
                        Receba nossa newsletter semanal com novidades
                      </p>
                    </div>
                    <Switch
                      checked={notifications.newsletter}
                      onCheckedChange={(checked) => setNotifications({...notifications, newsletter: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">SMS</h4>
                      <p className="text-sm text-muted-foreground">
                        Receba atualizações importantes via SMS
                      </p>
                    </div>
                    <Switch
                      checked={notifications.sms}
                      onCheckedChange={(checked) => setNotifications({...notifications, sms: checked})}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    className="bg-gradient-primary hover:opacity-90"
                    onClick={handleSaveNotifications}
                    disabled={notificationsUpdating}
                  >
                    {notificationsUpdating ? "Salvando..." : "Salvar Preferências"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modals */}
        <AddressModal
          address={selectedAddress}
          isOpen={isAddressModalOpen}
          onClose={() => {
            setIsAddressModalOpen(false);
            setSelectedAddress(null);
          }}
          onSave={handleAddressSave}
          isLoading={addressUpdating}
        />

        <ChangePasswordModal
          isOpen={isPasswordModalOpen}
          onClose={() => setIsPasswordModalOpen(false)}
          onSave={changePassword}
          isLoading={isUpdating}
        />

        {/* Modal de Exclusão - Apenas para estabelecimentos */}
        {user.type === 'establishment' && (
          <DeleteEstablishmentModal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={deleteEstablishment}
            establishmentName={establishment?.business_name || 'Estabelecimento'}
            isLoading={isDeleting}
          />
        )}
      </div>
    </div>
  );
}
