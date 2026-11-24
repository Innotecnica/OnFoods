import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEstablishmentAuth } from "@/hooks/useEstablishmentAuth";
import { AlertTriangle, CheckCircle, XCircle, Clock, User, Building } from "lucide-react";

export default function WorkflowAnalysis() {
  const [testResults, setTestResults] = useState<Record<string, unknown>[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { establishment, isLoading } = useEstablishmentAuth();

  const runFullAnalysis = async () => {
    setIsAnalyzing(true);
    const results: Record<string, unknown>[] = [];

    try {
      // Test 1: Check auth state
      results.push({
        test: "Estado de Autenticação",
        status: isAuthenticated ? "pass" : "fail",
        details: isAuthenticated ? "Usuário autenticado" : "Usuário não autenticado",
        data: { user: !!user, email: user?.email, type: user?.type }
      });

      // Test 2: Check session
      const { data: { session } } = await supabase.auth.getSession();
      results.push({
        test: "Sessão Supabase",
        status: session ? "pass" : "fail", 
        details: session ? "Sessão ativa" : "Sem sessão ativa",
        data: { 
          hasSession: !!session,
          userId: session?.user?.id,
          email: session?.user?.email,
          confirmedAt: session?.user?.confirmed_at
        }
      });

      // Test 3: Check profile in database
      if (session?.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        results.push({
          test: "Profile no Banco",
          status: profile ? "pass" : "fail",
          details: profile ? "Profile encontrado" : `Profile não encontrado: ${profileError?.message}`,
          data: profile
        });

        // Test 4: Check establishment in database (if user is establishment)
        if (profile?.type === 'establishment') {
          const { data: estData, error: estError } = await supabase
            .from('establishments')
            .select('*')
            .eq('user_id', session.user.id)
            .single();

          results.push({
            test: "Estabelecimento no Banco",
            status: estData ? "pass" : "fail",
            details: estData ? "Estabelecimento encontrado" : `Estabelecimento não encontrado: ${estError?.message}`,
            data: estData
          });

          // Test 5: Check RLS policies
          try {
            const { data: testSelect, error: selectError } = await supabase
              .from('establishments')
              .select('id, business_name')
              .eq('user_id', session.user.id);

            results.push({
              test: "Políticas RLS - SELECT",
              status: !selectError ? "pass" : "fail",
              details: !selectError ? "SELECT permitido" : `Erro RLS: ${selectError.message}`,
              data: { records: testSelect?.length || 0 }
            });
          } catch (error: unknown) {
            results.push({
              test: "Políticas RLS - SELECT",
              status: "fail",
              details: `Erro RLS: ${error instanceof Error ? error.message : String(error)}`,
              data: null
            });
          }

          // Test 6: Check establishment onboarding status
          const hasBasicInfo = estData?.business_name && estData?.business_type;
          const hasCompleteInfo = hasBasicInfo && estData?.address;
          
          results.push({
            test: "Status do Onboarding",
            status: hasCompleteInfo ? "pass" : hasBasicInfo ? "warning" : "fail",
            details: hasCompleteInfo ? "Onboarding completo" : 
                    hasBasicInfo ? "Informações básicas presentes" : "Faltam informações básicas",
            data: {
              hasBasicInfo,
              hasCompleteInfo,
              isActive: estData?.is_active,
              needsOnboarding: !hasBasicInfo
            }
          });
        }
      }

      // Test 7: Check hooks state
      results.push({
        test: "Estado dos Hooks",
        status: "info",
        details: "Estado atual dos hooks de autenticação",
        data: {
          establishment: !!establishment,
          hasCompleteInfo: establishment?.business_name && establishment?.business_type && establishment?.address,
          isLoading,
          establishmentData: establishment ? {
            id: establishment.id,
            business_name: establishment.business_name,
            business_type: establishment.business_type,
            is_active: establishment.is_active
          } : null
        }
      });

      // Test 8: Check triggers
      try {
        const { data: triggerTest } = await supabase.rpc('get_nearby_establishments', {});
        results.push({
          test: "Funções do Banco",
          status: "pass",
          details: "Funções RPC funcionando",
          data: { functionsWorking: true }
        });
      } catch (error: unknown) {
        results.push({
          test: "Funções do Banco", 
          status: "warning",
          details: `Erro nas funções: ${error instanceof Error ? error.message : String(error)}`,
          data: { functionsWorking: false }
        });
      }

    } catch (error: unknown) {
      results.push({
        test: "Análise Geral",
        status: "fail",
        details: `Erro na análise: ${error instanceof Error ? error.message : String(error)}`,
        data: null
      });
    }

    setTestResults(results);
    setIsAnalyzing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning": return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "fail": return <XCircle className="h-4 w-4 text-red-500" />;
      case "info": return <User className="h-4 w-4 text-blue-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pass": return "border-green-200 bg-green-50";
      case "warning": return "border-yellow-200 bg-yellow-50";
      case "fail": return "border-red-200 bg-red-50";
      case "info": return "border-blue-200 bg-blue-50";
      default: return "border-gray-200 bg-gray-50";
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-6xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Análise Completa do Workflow</h1>
          <p className="text-muted-foreground">Análise detalhada do fluxo de registro e login de estabelecimentos</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="h-5 w-5" />
              <span>Análise do Sistema</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={runFullAnalysis}
              disabled={isAnalyzing}
              className="w-full"
            >
              {isAnalyzing ? "Analisando..." : "Executar Análise Completa"}
            </Button>

            {testResults.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Resultados dos Testes:</h3>
                
                 {testResults.map((result, index) => (
                   <Card key={index} className={`border-2 ${getStatusColor(String(result.status))}`}>
                     <CardContent className="pt-4">
                       <div className="flex items-start space-x-3">
                         {getStatusIcon(String(result.status))}
                         <div className="flex-1 min-w-0">
                           <div className="flex items-center justify-between">
                             <h4 className="font-medium">{String(result.test)}</h4>
                             <Badge variant={
                               result.status === "pass" ? "default" :
                               result.status === "warning" ? "secondary" :
                               result.status === "fail" ? "destructive" : "outline"
                             }>
                               {String(result.status).toUpperCase()}
                             </Badge>
                           </div>
                           <p className="text-sm text-muted-foreground mt-1">
                             {String(result.details)}
                           </p>
                          {result.data && (
                            <details className="mt-2">
                              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                Ver dados detalhados
                              </summary>
                              <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto max-h-32">
                                {JSON.stringify(result.data, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Summary */}
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Resumo:</strong> {testResults.filter(r => r.status === "pass").length} passou, {" "}
                    {testResults.filter(r => r.status === "warning").length} aviso, {" "}
                    {testResults.filter(r => r.status === "fail").length} falha
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current Status */}
        <Card>
          <CardHeader>
            <CardTitle>Status Atual do Sistema</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <h3 className="font-medium">Usuário</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {user ? `${user.name} (${user.type})` : "Não autenticado"}
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <h3 className="font-medium">Estabelecimento</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {establishment ? establishment.business_name : "Não encontrado"}
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <h3 className="font-medium">Status</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {establishment?.business_name && establishment?.business_type ? "Completo" : "Incompleto"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
