import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaymentGatewayConfig } from "@/components/settings/PaymentGatewayConfig";
import { EstablishmentProfileEditor } from "@/components/settings/EstablishmentProfileEditor";
import { useEstablishmentAuth } from "@/hooks/useEstablishmentAuth";
import { 
  Settings, 
  CreditCard, 
  Bell, 
  Store, 
  BarChart3
} from "lucide-react";

export default function EstablishmentSettings() {
  const { establishment, isLoading, refreshEstablishment } = useEstablishmentAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando configurações...</p>
        </div>
      </div>
    );
  }

  if (!establishment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Store className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Estabelecimento não encontrado</h2>
            <p className="text-muted-foreground mb-4">
              Você precisa criar um estabelecimento primeiro.
            </p>
            <Button asChild>
              <a href="/dashboard">Voltar ao Dashboard</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Configurações</h1>
            <p className="text-muted-foreground">{establishment.business_name}</p>
          </div>
        </div>

        <Tabs defaultValue="payments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Pagamentos
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payments">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configuração de Pagamentos</CardTitle>
                  <p className="text-muted-foreground">
                    Configure seus próprios gateways de pagamento para receber diretamente na sua conta.
                  </p>
                </CardHeader>
              </Card>
              
              <PaymentGatewayConfig establishmentId={establishment.id} />
            </div>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Notificações</CardTitle>
                <p className="text-muted-foreground">
                  Configure como você deseja receber notificações de pedidos.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Notificações por Email</h4>
                      <p className="text-sm text-muted-foreground">
                        Receber emails quando novos pedidos chegarem
                      </p>
                    </div>
                    <Badge variant="secondary">Em breve</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Notificações WhatsApp</h4>
                      <p className="text-sm text-muted-foreground">
                        Receber mensagens no WhatsApp para novos pedidos
                      </p>
                    </div>
                    <Badge variant="secondary">Em breve</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <EstablishmentProfileEditor 
              establishment={establishment} 
              onUpdate={refreshEstablishment}
            />
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Analytics</CardTitle>
                <p className="text-muted-foreground">
                  Configure relatórios e análises de vendas.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Relatórios Automáticos</h4>
                      <p className="text-sm text-muted-foreground">
                        Receber relatórios de vendas por email
                      </p>
                    </div>
                    <Badge variant="secondary">Em breve</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Integração Google Analytics</h4>
                      <p className="text-sm text-muted-foreground">
                        Conectar com Google Analytics para análises avançadas
                      </p>
                    </div>
                    <Badge variant="secondary">Em breve</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}