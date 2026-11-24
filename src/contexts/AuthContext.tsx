import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User as SupabaseUser, Session } from "@supabase/supabase-js";
import { cleanupAuthState, safeSignOut, validateAuthState, clearUserCache } from "@/utils/authCleanup";

export interface User {
  id: string;
  email: string;
  name: string;
  type: "customer" | "establishment";
  phone?: string;
  avatar?: string;
  city?: string;
  state?: string;
  // Establishment specific fields
  businessName?: string;
  businessType?: string;
  address?: string;
  cnpj?: string;
  // Customer specific fields
  cpf?: string;
  birthDate?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  type: "customer" | "establishment";
  state: string;
  city: string;
  phone?: string;
  businessName?: string;
  businessType?: string;
  address?: string;
  cnpj?: string;
  cpf?: string;
  birthDate?: string;
  description?: string;
  deliveryFee?: number;
  minimumOrder?: number;
  deliveryTimeMin?: number;
  deliveryTimeMax?: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Prevent multiple concurrent profile loads
  const [profileLoading, setProfileLoading] = useState(false);

  const loadUserProfile = useCallback(async (supabaseUser: SupabaseUser, authEvent?: string) => {
    if (profileLoading) {
      console.log('⏳ Profile already loading, skipping...');
      return;
    }
    try {
      setProfileLoading(true);
      console.log('📋 Loading profile for user:', supabaseUser.id, 'Event:', authEvent);
      let attempt = 0;
      const maxAttempts = 2;
      let profile = null;
      while (attempt < maxAttempts && !profile) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', supabaseUser.id)
            .maybeSingle();
          if (error) {
            console.error(`❌ Error loading profile (attempt ${attempt + 1}):`, error);
            if (error.message.includes('Load failed') || error.message.includes('network')) {
              attempt++;
              if (attempt < maxAttempts) {
                console.log(`⏳ Retrying profile load in 1s...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
              }
            } else {
              break;
            }
          } else {
            profile = data;
            break;
          }
        } catch (networkError) {
          console.error(`❌ Network error loading profile (attempt ${attempt + 1}):`, networkError);
          attempt++;
          if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      if (!profile) {
        console.warn('⚠️ No profile found after retries for user:', supabaseUser.id);
        return;
      }
      console.log('Profile loaded:', profile);
      const userData: User = {
        id: profile.user_id,
        email: profile.email,
        name: profile.name,
        type: profile.type,
        phone: profile.phone,
        avatar: profile.avatar_url,
        cpf: profile.cpf,
        birthDate: profile.birth_date,
        city: profile.city,
        state: profile.state,
      };
      if (profile.type === 'establishment') {
        console.log('Loading establishment data for user...');
        const { data: establishment, error: estError } = await supabase
          .from('establishments')
          .select('*')
          .eq('user_id', supabaseUser.id)
          .maybeSingle();
        if (estError) {
          console.error('Error loading establishment:', estError);
        } else if (establishment) {
          console.log('Establishment loaded:', establishment);
          userData.businessName = establishment.business_name;
          userData.businessType = establishment.business_type;
          userData.address = establishment.address;
          userData.cnpj = establishment.cnpj;
        }
        if (authEvent === 'SIGNED_IN') {
          console.log('🎯 Redirecting establishment user to dashboard');
          setTimeout(() => {
            window.location.replace('/establishment-dashboard');
          }, 500);
          return;
        }
      }
      console.log('✅ Setting user data:', userData);
      localStorage.setItem('userProfileCache', JSON.stringify(userData));
      setUser(userData);
      if (authEvent === 'SIGNED_IN' && profile.type === 'customer') {
        console.log('� Redirecting customer user to home');
        setTimeout(() => {
          window.location.replace('/');
        }, 500);
      }
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
    } finally {
      setProfileLoading(false);
    }
  }, [profileLoading]);

  useEffect(() => {
    let isMounted = true;
    let authSubscription: any = null;

    const initializeAuth = async () => {
      try {
        // Clean up any existing auth state on initialization
        const existingSession = await supabase.auth.getSession();
        if (!existingSession.data.session) {
          setUser(null);
          setSession(null);
          // Clear any cached user data if no session exists
          localStorage.removeItem('userProfileCache');
        }

        // Set up auth state listener FIRST to catch all events
        authSubscription = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!isMounted) return;
            
            setSession(session);
            
            if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
              
              // Check if returning from Stripe checkout
              const urlParams = new URLSearchParams(window.location.search);
              const isStripeReturn = urlParams.get('success') === 'true' || urlParams.get('canceled') === 'true';
              
              if (isStripeReturn) {
                console.log('🎯 [AUTH] Detectado retorno do Stripe checkout, preservando sessão...');
              }
              
              // Load profile immediately for authenticated users
              if (isMounted) {
                loadUserProfile(session.user, event);
            }
            } else if (event === 'SIGNED_OUT' || (!session && event !== 'TOKEN_REFRESHED')) {
              // Don't clear user state if returning from Stripe
              const urlParams = new URLSearchParams(window.location.search);
              const isStripeReturn = urlParams.get('success') === 'true' || urlParams.get('canceled') === 'true';
              
              if (isStripeReturn) {
                console.log('🔒 [AUTH] Retorno do Stripe detectado, não fazendo logout automático');
                return; // Don't clear the session when returning from Stripe
              }
              
              console.log('🚪 Clearing user state due to sign out or no session');
              setUser(null);
              localStorage.removeItem('userProfileCache');
            }
            
            // Always update loading state after processing
            if (event !== 'TOKEN_REFRESHED') {
              setIsLoading(false);
            }
          }
        );

        // Get initial session AFTER setting up listener
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        // If there's an initial session, it will be handled by the listener
        if (!initialSession) {
          setIsLoading(false);
        }
        
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      if (authSubscription?.data?.subscription) {
        authSubscription.data.subscription.unsubscribe();
      } else if (authSubscription?.unsubscribe) {
        authSubscription.unsubscribe();
      }
    };
  }, [loadUserProfile]);


  const refreshUser = async () => {
    if (session?.user) {
      await loadUserProfile(session.user);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      console.log('🔄 Iniciando processo de login para:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Erro no login:', error);
        
        let errorMessage = error.message;
        
        if (error.message === "Invalid login credentials") {
          errorMessage = "Email ou senha incorretos.";
        } else if (error.message === "Email not confirmed") {
          errorMessage = "Email não confirmado. Verifique sua caixa de entrada ou entre em contato com o suporte.";
        } else if (error.message.includes("Database error")) {
          errorMessage = "Erro no servidor. Tente novamente em alguns instantes.";
        } else if (error.message.includes("Invalid email")) {
          errorMessage = "Email inválido. Verifique o formato do email.";
        } else if (error.message.includes("Too many requests")) {
          errorMessage = "Muitas tentativas de login. Tente novamente em alguns minutos.";
        }
        
        toast({
          title: "Erro no login",
          description: errorMessage,
          variant: "destructive",
        });
        return false;
      }

      if (data.user && data.session) {
        console.log('✅ Login bem-sucedido para:', data.user.email);
        console.log('👤 Metadados do usuário:', data.user.user_metadata);
        console.log('🔑 Session criada:', !!data.session);
        
        // Set session manually to ensure it persists
        setSession(data.session);
        
        // Don't manually load profile here - let onAuthStateChange handle it
        toast({
          title: "Login realizado com sucesso!",
          description: "Redirecionando...",
        });
        
        return true;
      }
      
      console.log('⚠️ Login sem dados de usuário');
      return false;
    } catch (error) {
      console.error('💥 Erro inesperado no login:', error);
      toast({
        title: "Erro no login",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const sendWelcomeEmail = async (email: string, name: string, businessName?: string, type: 'customer' | 'establishment' = 'customer') => {
    try {
      console.log('📧 [EMAIL DEBUG] Iniciando processo de envio de email:', { 
        email, 
        name, 
        type, 
        businessName,
        hostname: window.location.hostname 
      });
      
      // Use the correct confirmation URL with dashboard-redirect  
      const confirmationUrl = `${window.location.origin}/dashboard-redirect?type=${type}`;
      
      console.log('📧 [EMAIL DEBUG] URL de confirmação gerada:', confirmationUrl);
      
      const { data, error } = await supabase.functions.invoke('send-welcome-email', {
        body: { 
          email, 
          name, 
          businessName, 
          type, 
          confirmationUrl 
        }
      });
      
      console.log('📧 [EMAIL DEBUG] Resposta da Edge Function:', { data, error });
      
      if (error) {
        console.error('❌ [EMAIL DEBUG] Erro ao enviar email:', error);
        // Don't fail registration due to email issues
        toast({
          title: "Conta criada!",
          description: "Conta criada com sucesso. Verifique seu email para confirmação.",
          variant: "default",
        });
        return { success: false, error };
      } 
      
      console.log('✅ [EMAIL DEBUG] Email enviado com sucesso:', data);
      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada para confirmar sua conta.",
      });
      
      return { success: true, data };
    } catch (error) {
      console.error('❌ [EMAIL DEBUG] Exceção ao enviar email:', error);
      // Don't fail registration due to email issues
      toast({
        title: "Conta criada!",
        description: "Conta criada com sucesso. Verifique seu email para confirmação.",
        variant: "default",
      });
      return { success: false, error };
    }
  };

  const register = async (userData: RegisterData): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      console.log('🔄 [REGISTER] Iniciando registro para:', userData.email, 'Tipo:', userData.type);
      
      // Circuit breaker - check connectivity first
      try {
        const connectivityTest = await fetch(`${window.location.origin}/health`, { 
          method: 'HEAD',
          signal: AbortSignal.timeout(3000)
        });
        console.log('🌐 [REGISTER] Teste de conectividade:', connectivityTest.ok ? 'OK' : 'FAILED');
      } catch (connectivityError) {
        console.warn('⚠️ [REGISTER] Problemas de conectividade detectados');
        toast({
          title: "Problemas de conexão",
          description: "Verifique sua conexão com a internet e tente novamente.",
          variant: "destructive",
        });
        return false;
      }
      
      // Validate email domain before attempting signup
      const emailDomain = userData.email.split('@')[1];
      if (!emailDomain || emailDomain.length < 3) {
        toast({
          title: "Email inválido",
          description: "O domínio do email não é válido.",
          variant: "destructive",
        });
        return false;
      }
      
      const redirectUrl = `${window.location.origin}/dashboard-redirect?type=${userData.type}`;
      
      // Enhanced retry logic with exponential backoff
      let attempt = 0;
      const maxAttempts = 2; // Reduced attempts for faster UX
      let lastError;
      let authData: any = null;
      
      while (attempt < maxAttempts && !authData) {
        try {
          console.log(`🔄 [REGISTER] Tentativa ${attempt + 1}/${maxAttempts}`);
          
          // Show progress to user
          if (attempt > 0) {
            toast({
              title: "Tentando novamente...",
              description: `Tentativa ${attempt + 1} de ${maxAttempts}`,
            });
          }
          
          const signupResult = await Promise.race([
            supabase.auth.signUp({
              email: userData.email,
              password: userData.password,
              options: {
                emailRedirectTo: redirectUrl,
                data: {
                  name: userData.name,
                  type: userData.type,
                  phone: userData.phone,
                  city: userData.city,
                  state: userData.state,
                  // Only include non-empty fields
                  ...(userData.cpf && { cpf: userData.cpf }),
                  ...(userData.birthDate && { birth_date: userData.birthDate }),
                  ...(userData.businessName && { business_name: userData.businessName }),
                  ...(userData.businessType && { business_type: userData.businessType }),
                  ...(userData.cnpj && { cnpj: userData.cnpj }),
                  ...(userData.address && { address: userData.address }),
                  ...(userData.description && { description: userData.description }),
                  ...(userData.deliveryFee && { delivery_fee: userData.deliveryFee }),
                  ...(userData.minimumOrder && { minimum_order: userData.minimumOrder }),
                  ...(userData.deliveryTimeMin && { delivery_time_min: userData.deliveryTimeMin }),
                  ...(userData.deliveryTimeMax && { delivery_time_max: userData.deliveryTimeMax })
                }
              }
            }),
            // Timeout after 15 seconds
            new Promise<any>((_, reject) => 
              setTimeout(() => reject(new Error('Signup timeout')), 15000)
            )
          ]) as any;
          
          if (signupResult?.error) {
            lastError = signupResult.error;
            
            // Check for specific non-retryable errors
            if (signupResult.error.message?.includes('User already registered') ||
                signupResult.error.message?.includes('user_repeated_signup') ||
                signupResult.error.message?.includes('Invalid email') ||
                signupResult.error.message?.includes('Password should be at least')) {
              break; // Don't retry these errors
            }
            
            // Retryable network errors
            if (signupResult.error.message?.includes('Load failed') || 
                signupResult.error.message?.includes('network') || 
                signupResult.error.message?.includes('timeout') ||
                signupResult.error.name === 'AuthRetryableFetchError') {
              attempt++;
              if (attempt < maxAttempts) {
                const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Max 5s delay
                console.log(`⏳ [REGISTER] Erro de rede, tentando novamente em ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
              }
            } else {
              break; // Unknown error, don't retry
            }
          } else if (signupResult?.data) {
            authData = signupResult.data;
            break; // Success
          }
          
        } catch (networkError) {
          console.error(`❌ [REGISTER] Erro na tentativa ${attempt + 1}:`, networkError);
          lastError = networkError;
          
          if (networkError.message === 'Signup timeout') {
            toast({
              title: "Timeout",
              description: "O servidor está demorando para responder. Tente novamente.",
              variant: "destructive",
            });
            break;
          }
          
          attempt++;
          if (attempt < maxAttempts) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // Check final result
      if (!authData || lastError) {
        console.error('❌ [REGISTER] Falha final:', lastError);
        
        let errorMessage = "Erro desconhecido no cadastro.";
        
        if (lastError) {
          // Enhanced error handling
          if (lastError.message.includes("User already registered") || lastError.message.includes("user_repeated_signup")) {
            errorMessage = "Este email já está cadastrado. Tente fazer login ou recuperar sua senha.";
          } else if (lastError.message.includes("Invalid email")) {
            errorMessage = "Email inválido. Verifique o formato do email.";
          } else if (lastError.message.includes("Password should be at least")) {
            errorMessage = "A senha deve ter pelo menos 6 caracteres.";
          } else if (lastError.message.includes("Unable to validate email address")) {
            errorMessage = "Email inválido. Verifique se o formato está correto.";
          } else if (lastError.message.includes("Signup requires a valid password")) {
            errorMessage = "Senha inválida. Use pelo menos 6 caracteres.";
          } else if (lastError.message.includes("Load failed") || 
                     lastError.name === 'AuthRetryableFetchError' ||
                     lastError.message.includes("network") ||
                     lastError.message.includes("timeout")) {
            errorMessage = "Problemas de conexão. Verifique sua internet e tente novamente.";
          } else if (lastError.message.includes("Database error") || 
                     lastError.message.includes("Internal server error")) {
            errorMessage = "Erro temporário no servidor. Tente novamente em alguns minutos.";
          } else {
            errorMessage = `Erro no cadastro: ${lastError.message}`;
          }
        }
        
        toast({
          title: "Erro no cadastro",
          description: errorMessage,
          variant: "destructive",
        });
        return false;
      }

      console.log('✅ [REGISTER] Cadastro realizado com sucesso:', {
        user: authData.user?.email,
        user_id: authData.user?.id,
        confirmed: !!authData.user?.email_confirmed_at,
        type: userData.type
      });

      // Show immediate success feedback
      toast({
        title: "Conta criada com sucesso!",
        description: `Bem-vindo, ${userData.name}! ${!authData.user?.email_confirmed_at ? 'Verifique seu email para confirmar sua conta.' : 'Sua conta foi ativada automaticamente.'}`,
      });

      // Send welcome email asynchronously (don't block the registration flow)
      setTimeout(async () => {
        try {
          console.log('📧 [EMAIL] Enviando email de boas-vindas...');
          const emailResult = await sendWelcomeEmail(
            userData.email, 
            userData.name, 
            userData.businessName, 
            userData.type
          );
          console.log('📧 [EMAIL] Email enviado:', emailResult.success ? 'sucesso' : 'falha');
        } catch (emailError) {
          console.warn('⚠️ [EMAIL] Falha no envio de email (não crítico):', emailError);
        }
      }, 1000); // Small delay to ensure user sees success message first

      return true;
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Erro no cadastro",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?type=recovery&reset=true`,
      });

      if (error) {
        toast({
          title: "Erro ao enviar email",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Email de recuperação enviado!",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });
      return true;
    } catch (error) {
      toast({
        title: "Erro ao enviar email",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Starting logout process...');
      setIsLoading(true);
      
      // Use robust cleanup utility
      const success = await safeSignOut(supabase);
      
      // Clear local state regardless of API call result
      setUser(null);
      setSession(null);
      clearUserCache();
      
      if (success) {
        console.log('✅ Logout completed successfully');
        toast({
          title: "Logout realizado",
          description: "Você foi desconectado com sucesso.",
        });
      } else {
        console.log('⚠️ Logout completed with warnings');
        toast({
          title: "Logout realizado",
          description: "Sessão encerrada localmente.",
          variant: "default",
        });
      }
      
      // Force page refresh for clean state
      setTimeout(() => {
        window.location.href = '/auth';
      }, 500);
      
    } catch (error) {
      console.error('❌ Unexpected logout error:', error);
      
      // Force cleanup even on error
      cleanupAuthState();
      setUser(null);
      setSession(null);
      
      toast({
        title: "Logout realizado",
        description: "Sessão encerrada.",
        variant: "default",
      });
      
      // Force page refresh
      setTimeout(() => {
        window.location.href = '/auth';
      }, 500);
    } finally {
      setIsLoading(false);
    }
  };

  const isAuthenticated = !!user && !!session;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      login,
      register,
      logout,
      resetPassword,
      isLoading,
      isAuthenticated,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
