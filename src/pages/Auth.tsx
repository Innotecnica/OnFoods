import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { withAuthTimeout } from "@/utils/authTimeout";
import { cleanupAuthState } from "@/utils/authCleanup";
import { validatePassword } from "@/utils/inputValidation";
import { 
  User, 
  Store, 
  Mail, 
  Lock, 
  Phone, 
  Calendar,
  MapPin,
  Building,
  ArrowLeft,
  Eye,
  EyeOff,
  FileText,
  DollarSign,
  Clock
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { BRAZILIAN_STATES, getCitiesByState } from "@/utils/brazilianStates";
import { OpeningHoursEditor } from "@/components/settings/OpeningHoursEditor";
import { OpeningHours } from "@/utils/openingHours";

export default function Auth() {
  const navigate = useNavigate();
  const { login, register, resetPassword, isLoading } = useAuth();
  const [searchParams] = useSearchParams();
  
  const [activeTab, setActiveTab] = useState("customer-login");
  const [userType, setUserType] = useState<"customer" | "establishment">("customer");
  const [showPassword, setShowPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [isPasswordResetMode, setIsPasswordResetMode] = useState(false);
  const [newPasswordData, setNewPasswordData] = useState({
    password: "",
    confirmPassword: ""
  });

  // Form states
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [resetEmail, setResetEmail] = useState("");
  const [customerData, setCustomerData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    phone: "",
    cpf: "",
    birthDate: "",
    state: "",
    city: ""
  });
  const [establishmentData, setEstablishmentData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    businessName: "",
    businessType: "",
    phone: "",
    cnpj: "",
    address: "",
    description: "",
    deliveryFee: "",
    minimumOrder: "",
    deliveryTimeMin: "",
    deliveryTimeMax: "",
    state: "",
    city: "",
    openingHours: null as OpeningHours | null
  });

  // Check for password reset and confirmation messages in URL params
  useEffect(() => {
    const checkForPasswordReset = () => {
      const type = searchParams.get('type');
      const message = searchParams.get('message');
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      
      // Handle email confirmation message
      if (message === 'confirm') {
        const userType = searchParams.get('type');
        const typeText = userType === 'establishment' ? 'estabelecimento' : 'cliente';
        
        toast({
          title: "Confirme seu email",
          description: `Por favor, verifique seu email para confirmar sua conta de ${typeText} e acessar a plataforma.`,
          variant: "default",
        });
      }
      
      // Handle password reset
      if (type === 'recovery' && accessToken && refreshToken) {
        setIsPasswordResetMode(true);
        toast({
          title: "Redefinir senha",
          description: "Digite sua nova senha abaixo.",
          variant: "default",
        });
        
        // Set the session with the tokens from URL
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
      }
    };

    checkForPasswordReset();
  }, [searchParams]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const userTypeParam = searchParams.get('userType');

    if (tabParam === 'customer-login' || tabParam === 'establishment-login' || tabParam === 'register') {
      setActiveTab(tabParam);
    }

    if (userTypeParam === 'customer' || userTypeParam === 'establishment') {
      setUserType(userTypeParam as 'customer' | 'establishment');
    }
  }, [searchParams]);

  // Helper functions for state and city management
  const getAvailableCities = (selectedState: string, userType: "customer" | "establishment") => {
    if (!selectedState) return [];
    return getCitiesByState(selectedState);
  };

  const handleStateChange = (state: string, userType: "customer" | "establishment") => {
    if (userType === "customer") {
      setCustomerData(prev => ({ ...prev, state, city: "" }));
    } else {
      setEstablishmentData(prev => ({ ...prev, state, city: "" }));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação básica
    if (!loginData.email || !loginData.password) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha email e senha.",
        variant: "destructive",
      });
      return;
    }

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(loginData.email)) {
      toast({
        title: "Email inválido",
        description: "Por favor, digite um email válido.",
        variant: "destructive",
      });
      return;
    }

    try {
      const success = await withAuthTimeout(
        () => login(loginData.email, loginData.password),
        10000, // 10 second timeout
        1 // 1 retry
      );
      
      if (success) {
        console.log('✅ Login success handled by AuthContext');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.message.includes('timeout')) {
        toast({
          title: "Tempo esgotado",
          description: "A conexão demorou muito. Tente novamente.",
          variant: "destructive",
        });
      }
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = userType === "customer" ? customerData : establishmentData;
    
    // Validação de campos obrigatórios
    if (!data.email || !data.password || !data.name || !data.state || !data.city) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios: email, senha, nome, estado e cidade.",
        variant: "destructive",
      });
      return;
    }

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      toast({
        title: "Email inválido",
        description: "Por favor, digite um email válido.",
        variant: "destructive",
      });
      return;
    }

    if (data.password !== data.confirmPassword) {
      toast({
        title: "Senhas não conferem",
        description: "As senhas digitadas não são iguais.",
        variant: "destructive",
      });
      return;
    }

    if (data.password.length < 12) {
      const validation = validatePassword(data.password);
      if (!validation.isValid) {
        toast({
          title: "Senha muito fraca",
          description: validation.errors.join(", "),
          variant: "destructive",
        });
        return;
      }
    }

    const registerData = {
      email: data.email,
      password: data.password,
      name: data.name,
      type: userType,
      phone: data.phone,
      state: data.state,
      city: data.city,
      ...(userType === "customer" ? {
        cpf: customerData.cpf,
        birthDate: customerData.birthDate
      } : {
        businessName: establishmentData.businessName,
        businessType: establishmentData.businessType,
        cnpj: establishmentData.cnpj,
        address: establishmentData.address,
        description: establishmentData.description,
        deliveryFee: establishmentData.deliveryFee ? parseFloat(establishmentData.deliveryFee) : 5.00,
        minimumOrder: establishmentData.minimumOrder ? parseFloat(establishmentData.minimumOrder) : 20.00,
        deliveryTimeMin: establishmentData.deliveryTimeMin ? parseInt(establishmentData.deliveryTimeMin) : 30,
        deliveryTimeMax: establishmentData.deliveryTimeMax ? parseInt(establishmentData.deliveryTimeMax) : 60,
        openingHours: establishmentData.openingHours
      })
    };

    console.log('🔄 [AUTH PAGE] Iniciando cadastro:', { email: data.email, type: userType });
    console.log('🔄 [AUTH PAGE] Dados completos do registro:', JSON.stringify(registerData, null, 2));
    
    const success = await register(registerData);
    if (success) {
      console.log('✅ [AUTH PAGE] Cadastro bem-sucedido, limpando formulários');
      // Clear forms on successful registration
      if (userType === "customer") {
        setCustomerData({
          email: "", password: "", confirmPassword: "", name: "",
          phone: "", cpf: "", birthDate: "", state: "", city: ""
        });
      } else {
        setEstablishmentData({
          email: "", password: "", confirmPassword: "", name: "", phone: "",
          businessName: "", businessType: "", cnpj: "", address: "",
          description: "", deliveryFee: "", minimumOrder: "",
          deliveryTimeMin: "", deliveryTimeMax: "", state: "", city: "",
          openingHours: null
        });
      }
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast({
        title: "Email obrigatório",
        description: "Por favor, digite seu email.",
        variant: "destructive",
      });
      return;
    }

    const success = await resetPassword(resetEmail);
    if (success) {
      setIsResetMode(false);
      setResetEmail("");
    }
  };

  const handleResendConfirmation = async () => {
    if (!loginData.email) {
      toast({
        title: "Email necessário",
        description: "Digite seu email primeiro para reenviar a confirmação.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Determinar o tipo de usuário baseado na aba ativa para o redirecionamento correto
      const isEstablishment = activeTab === "establishment-login";
      const userType = isEstablishment ? "establishment" : "customer";
      const redirectUrl = `${window.location.origin}/dashboard-redirect?type=${userType}`;
        
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: loginData.email,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        toast({
          title: "Erro ao reenviar",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Email reenviado!",
          description: "Verifique sua caixa de entrada para confirmar seu email.",
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao reenviar",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPasswordData.password || !newPasswordData.confirmPassword) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    if (newPasswordData.password !== newPasswordData.confirmPassword) {
      toast({
        title: "Senhas não conferem",
        description: "As senhas digitadas não são iguais.",
        variant: "destructive",
      });
      return;
    }

    if (newPasswordData.password.length < 12) {
      const validation = validatePassword(newPasswordData.password);
      if (!validation.isValid) {
        toast({
          title: "Senha muito fraca",
          description: validation.errors.join(", "),
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPasswordData.password
      });

      if (error) {
        toast({
          title: "Erro ao atualizar senha",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Senha atualizada!",
        description: "Sua senha foi alterada com sucesso. Redirecionando...",
      });

      // Clear URL params and redirect
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (error) {
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao atualizar a senha. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  if (isResetMode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="space-y-1">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsResetMode(false)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-2xl">Recuperar Senha</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Digite seu email para receber as instruções de recuperação
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Enviando..." : "Enviar Email de Recuperação"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isPasswordResetMode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center">Redefinir Senha</CardTitle>
              <p className="text-sm text-muted-foreground text-center">
                Digite sua nova senha para acessar sua conta
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Digite sua nova senha"
                      value={newPasswordData.password}
                      onChange={(e) => setNewPasswordData(prev => ({ ...prev, password: e.target.value }))}
                      className="pl-10 pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">Confirmar Nova Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-new-password"
                      type="password"
                      placeholder="Confirme sua nova senha"
                      value={newPasswordData.confirmPassword}
                      onChange={(e) => setNewPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
                  <p className="font-medium mb-1">Requisitos da senha:</p>
                  <ul className="space-y-1">
                    <li>• Mínimo de 6 caracteres</li>
                    <li>• As senhas devem ser idênticas</li>
                  </ul>
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Atualizando..." : "Atualizar Senha"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center mb-8">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all">
              <span className="text-white font-bold text-lg">D</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              DeliveryApp
            </span>
          </Link>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-12 bg-muted/50 border">
            <TabsTrigger value="customer-login" className="text-sm font-medium">
              <User className="w-4 h-4 mr-2" />
              Cliente
            </TabsTrigger>
            <TabsTrigger value="establishment-login" className="text-sm font-medium">
              <Store className="w-4 h-4 mr-2" />
              Estabelecimento
            </TabsTrigger>
            <TabsTrigger value="register" className="text-sm font-medium">
              Cadastrar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="customer-login" className="space-y-0">
            <Card className="border-0 shadow-xl bg-card/50 backdrop-blur">
              <CardHeader className="space-y-3 pb-6">
                <div className="flex items-center justify-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-2xl text-center">
                  Login Cliente
                </CardTitle>
                <p className="text-sm text-muted-foreground text-center">
                  Acesse sua conta para fazer pedidos
                </p>
              </CardHeader>
              <CardContent className="space-y-6 pt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer-login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="customer-login-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={loginData.email}
                        onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer-login-password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="customer-login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="********"
                        value={loginData.password}
                        onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                        className="pl-10 pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="link"
                      className="px-0 font-normal"
                      onClick={() => setIsResetMode(true)}
                    >
                      Esqueceu a senha?
                    </Button>
                  </div>
                  <Button type="submit" className="w-full h-11 font-medium" disabled={isLoading}>
                    {isLoading ? "Entrando..." : "Entrar como Cliente"}
                  </Button>
                </form>

                <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-dashed">
                  <div className="text-sm text-muted-foreground text-center">
                    <p className="mb-2">Problemas para entrar?</p>
                    <div className="space-y-1">
                      <p>• Verifique se seu email foi confirmado</p>
                      <p>• Confira sua caixa de entrada e spam</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={handleResendConfirmation}
                      disabled={!loginData.email}
                    >
                      Reenviar confirmação
                    </Button>
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="text-center text-sm text-muted-foreground">
                  Não tem uma conta?{" "}
                  <Button
                    variant="link"
                    className="px-0 font-normal"
                    onClick={() => {
                      setActiveTab("register");
                      setUserType("customer");
                    }}
                  >
                    Cadastre-se como Cliente
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="establishment-login" className="space-y-0">
            <Card className="border-0 shadow-xl bg-card/50 backdrop-blur">
              <CardHeader className="space-y-3 pb-6">
                <div className="flex items-center justify-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Store className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-2xl text-center">
                  Login Estabelecimento
                </CardTitle>
                <p className="text-sm text-muted-foreground text-center">
                  Acesse sua conta para gerenciar seu negócio
                </p>
              </CardHeader>
              <CardContent className="space-y-6 pt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="establishment-login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="establishment-login-email"
                        type="email"
                        placeholder="contato@seunegocio.com"
                        value={loginData.email}
                        onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="establishment-login-password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="establishment-login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="********"
                        value={loginData.password}
                        onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                        className="pl-10 pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="link"
                      className="px-0 font-normal"
                      onClick={() => setIsResetMode(true)}
                    >
                      Esqueceu a senha?
                    </Button>
                  </div>
                  <Button type="submit" className="w-full h-11 font-medium" disabled={isLoading}>
                    {isLoading ? "Entrando..." : "Entrar como Estabelecimento"}
                  </Button>
                </form>

                <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-dashed">
                  <div className="text-sm text-muted-foreground text-center">
                    <p className="mb-2">Problemas para entrar?</p>
                    <div className="space-y-1">
                      <p>• Verifique se seu email foi confirmado</p>
                      <p>• Confira sua caixa de entrada e spam</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={handleResendConfirmation}
                      disabled={!loginData.email}
                    >
                      Reenviar confirmação
                    </Button>
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="text-center text-sm text-muted-foreground">
                  Não tem uma conta?{" "}
                  <Button
                    variant="link"
                    className="px-0 font-normal"
                    onClick={() => {
                      setActiveTab("register");
                      setUserType("establishment");
                    }}
                  >
                    Cadastre-se como Estabelecimento
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card>
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl text-center">Criar Conta</CardTitle>
                <p className="text-sm text-muted-foreground text-center">
                  Escolha o tipo de conta que deseja criar
                </p>
              </CardHeader>
              <CardContent>
                {/* User Type Selection */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <Button
                    type="button"
                    variant={userType === "customer" ? "default" : "outline"}
                    className="h-auto p-4 flex flex-col items-center space-y-2"
                    onClick={() => setUserType("customer")}
                  >
                    <User className="h-6 w-6" />
                    <span className="text-sm">Cliente</span>
                  </Button>
                  <Button
                    type="button"
                    variant={userType === "establishment" ? "default" : "outline"}
                    className="h-auto p-4 flex flex-col items-center space-y-2"
                    onClick={() => setUserType("establishment")}
                  >
                    <Store className="h-6 w-6" />
                    <span className="text-sm">Estabelecimento</span>
                  </Button>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  {userType === "customer" ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="customer-name">Nome Completo *</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="customer-name"
                            placeholder="Seu nome completo"
                            value={customerData.name}
                            onChange={(e) => setCustomerData(prev => ({ ...prev, name: e.target.value }))}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customer-email">Email *</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="customer-email"
                            type="email"
                            placeholder="seu@email.com"
                            value={customerData.email}
                            onChange={(e) => setCustomerData(prev => ({ ...prev, email: e.target.value }))}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="customer-phone">Telefone</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="customer-phone"
                              placeholder="(11) 99999-9999"
                              value={customerData.phone}
                              onChange={(e) => setCustomerData(prev => ({ ...prev, phone: e.target.value }))}
                              className="pl-10"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="customer-cpf">CPF</Label>
                          <Input
                            id="customer-cpf"
                            placeholder="000.000.000-00"
                            value={customerData.cpf}
                            onChange={(e) => setCustomerData(prev => ({ ...prev, cpf: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customer-birth">Data de Nascimento</Label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="customer-birth"
                            type="date"
                            value={customerData.birthDate}
                            onChange={(e) => setCustomerData(prev => ({ ...prev, birthDate: e.target.value }))}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      
                      {/* Location Fields for Customer */}
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                           <Label htmlFor="customer-state">Estado *</Label>
                          <Select 
                            value={customerData.state} 
                            onValueChange={(value) => handleStateChange(value, "customer")}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o estado" />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                              {BRAZILIAN_STATES.map(state => (
                                <SelectItem key={state.code} value={state.code}>
                                  {state.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                         <div className="space-y-2">
                           <Label htmlFor="customer-city">Cidade *</Label>
                          <Select 
                            value={customerData.city} 
                            onValueChange={(value) => setCustomerData(prev => ({ ...prev, city: value }))}
                            disabled={!customerData.state}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={customerData.state ? "Selecione a cidade" : "Primeiro selecione o estado"} />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50 max-h-60">
                              {getAvailableCities(customerData.state, "customer").map(city => (
                                <SelectItem key={city.name} value={city.name}>
                                  {city.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="customer-password">Senha *</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="customer-password"
                            type="password"
                            placeholder="Mínimo 6 caracteres"
                            value={customerData.password}
                            onChange={(e) => setCustomerData(prev => ({ ...prev, password: e.target.value }))}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customer-confirm">Confirmar Senha *</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="customer-confirm"
                            type="password"
                            placeholder="Digite a senha novamente"
                            value={customerData.confirmPassword}
                            onChange={(e) => setCustomerData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="establishment-name">Nome do Responsável *</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="establishment-name"
                            placeholder="Nome do responsável"
                            value={establishmentData.name}
                            onChange={(e) => setEstablishmentData(prev => ({ ...prev, name: e.target.value }))}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="business-name">Nome do Estabelecimento *</Label>
                        <div className="relative">
                          <Store className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="business-name"
                            placeholder="Nome do seu negócio"
                            value={establishmentData.businessName}
                            onChange={(e) => setEstablishmentData(prev => ({ ...prev, businessName: e.target.value }))}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="business-type">Tipo de Estabelecimento</Label>
                        <Select 
                          value={establishmentData.businessType} 
                          onValueChange={(value) => setEstablishmentData(prev => ({ ...prev, businessType: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="restaurant">Restaurante</SelectItem>
                             <SelectItem value="pizzaria">Pizzaria</SelectItem>
                             <SelectItem value="hamburgueria">Hamburgueria</SelectItem>
                             <SelectItem value="padaria">Padaria</SelectItem>
                             <SelectItem value="lanchonete">Lanchonete</SelectItem>
                             <SelectItem value="confeitaria">Confeitaria</SelectItem>
                             <SelectItem value="sorveteria">Sorveteria</SelectItem>
                             <SelectItem value="bar">Bar</SelectItem>
                             <SelectItem value="cafe">Café</SelectItem>
                             <SelectItem value="japonesa">Japonesa</SelectItem>
                             <SelectItem value="italiana">Italiana</SelectItem>
                             <SelectItem value="brasileira">Brasileira</SelectItem>
                             <SelectItem value="mexicana">Mexicana</SelectItem>
                             <SelectItem value="chinesa">Chinesa</SelectItem>
                             <SelectItem value="farmacia">Farmácia</SelectItem>
                             <SelectItem value="mercado">Mercado</SelectItem>
                             <SelectItem value="outros">Outros</SelectItem>
                           </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="establishment-email">Email *</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="establishment-email"
                            type="email"
                            placeholder="contato@seunegocio.com"
                            value={establishmentData.email}
                            onChange={(e) => setEstablishmentData(prev => ({ ...prev, email: e.target.value }))}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="establishment-phone">Telefone</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="establishment-phone"
                              placeholder="(11) 99999-9999"
                              value={establishmentData.phone}
                              onChange={(e) => setEstablishmentData(prev => ({ ...prev, phone: e.target.value }))}
                              className="pl-10"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="establishment-cnpj">CNPJ</Label>
                          <div className="relative">
                            <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="establishment-cnpj"
                              placeholder="00.000.000/0000-00"
                              value={establishmentData.cnpj}
                              onChange={(e) => setEstablishmentData(prev => ({ ...prev, cnpj: e.target.value }))}
                              className="pl-10"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="establishment-address">Endereço</Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="establishment-address"
                            placeholder="Endereço completo do estabelecimento"
                            value={establishmentData.address}
                            onChange={(e) => setEstablishmentData(prev => ({ ...prev, address: e.target.value }))}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      
                      {/* Location Fields for Establishment */}
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                           <Label htmlFor="establishment-state">Estado *</Label>
                          <Select 
                            value={establishmentData.state} 
                            onValueChange={(value) => handleStateChange(value, "establishment")}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o estado" />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                              {BRAZILIAN_STATES.map(state => (
                                <SelectItem key={state.code} value={state.code}>
                                  {state.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                         <div className="space-y-2">
                           <Label htmlFor="establishment-city">Cidade *</Label>
                          <Select 
                            value={establishmentData.city} 
                            onValueChange={(value) => setEstablishmentData(prev => ({ ...prev, city: value }))}
                            disabled={!establishmentData.state}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={establishmentData.state ? "Selecione a cidade" : "Primeiro selecione o estado"} />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50 max-h-60">
                              {getAvailableCities(establishmentData.state, "establishment").map(city => (
                                <SelectItem key={city.name} value={city.name}>
                                  {city.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="establishment-description">Descrição</Label>
                        <div className="relative">
                          <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Textarea
                            id="establishment-description"
                            placeholder="Descreva seu estabelecimento..."
                            value={establishmentData.description}
                            onChange={(e) => setEstablishmentData(prev => ({ ...prev, description: e.target.value }))}
                            className="pl-10 min-h-[80px]"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="delivery-fee">Taxa de Entrega (R$)</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="delivery-fee"
                              type="number"
                              step="0.01"
                              placeholder="5.00"
                              value={establishmentData.deliveryFee}
                              onChange={(e) => setEstablishmentData(prev => ({ ...prev, deliveryFee: e.target.value }))}
                              className="pl-10"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="minimum-order">Pedido Mínimo (R$)</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="minimum-order"
                              type="number"
                              step="0.01"
                              placeholder="20.00"
                              value={establishmentData.minimumOrder}
                              onChange={(e) => setEstablishmentData(prev => ({ ...prev, minimumOrder: e.target.value }))}
                              className="pl-10"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="delivery-time-min">Tempo Min. (min)</Label>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="delivery-time-min"
                              type="number"
                              placeholder="30"
                              value={establishmentData.deliveryTimeMin}
                              onChange={(e) => setEstablishmentData(prev => ({ ...prev, deliveryTimeMin: e.target.value }))}
                              className="pl-10"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="delivery-time-max">Tempo Máx. (min)</Label>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="delivery-time-max"
                              type="number"
                              placeholder="60"
                              value={establishmentData.deliveryTimeMax}
                              onChange={(e) => setEstablishmentData(prev => ({ ...prev, deliveryTimeMax: e.target.value }))}
                              className="pl-10"
                            />
                          </div>
                         </div>
                       </div>
                       
                       {/* Opening Hours Section */}
                       <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                         <div className="flex items-center gap-2">
                           <Clock className="h-5 w-5 text-primary" />
                           <Label className="text-base font-semibold">Horário de Funcionamento</Label>
                         </div>
                         <p className="text-sm text-muted-foreground">
                           Configure os horários de funcionamento do seu estabelecimento (opcional - pode ser definido posteriormente)
                         </p>
                         <OpeningHoursEditor
                           initialHours={establishmentData.openingHours}
                           onSave={async (hours: OpeningHours) => {
                             setEstablishmentData(prev => ({ ...prev, openingHours: hours }));
                           }}
                           isLoading={false}
                         />
                       </div>
                       
                       <div className="space-y-2">
                         <Label htmlFor="establishment-password">Senha *</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="establishment-password"
                            type="password"
                            placeholder="Mínimo 6 caracteres"
                            value={establishmentData.password}
                            onChange={(e) => setEstablishmentData(prev => ({ ...prev, password: e.target.value }))}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="establishment-confirm">Confirmar Senha *</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="establishment-confirm"
                            type="password"
                            placeholder="Digite a senha novamente"
                            value={establishmentData.confirmPassword}
                            onChange={(e) => setEstablishmentData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <Button type="submit" className="w-full h-11 font-medium" disabled={isLoading}>
                    {isLoading ? "Criando conta..." : `Criar Conta ${userType === "customer" ? "de Cliente" : "de Estabelecimento"}`}
                  </Button>
                </form>

                <Separator className="my-6" />

                <div className="text-center text-sm text-muted-foreground">
                  Já tem uma conta?{" "}
                  <Button
                    variant="link"
                    className="px-0 font-normal"
                    onClick={() => setActiveTab(userType === "customer" ? "customer-login" : "establishment-login")}
                  >
                    Faça login
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
