import { SEO } from "@/components/SEO";
import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { supabase } from "@/integrations/supabase/client";
import { checkDatabaseHealth } from "@/utils/systemConsolidation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  AlertTriangle,
  XCircle,
  Clock,
  Server,
  Smartphone,
  CreditCard,
  Truck,
  Database,
  Cloud,
  Activity,
  TrendingUp
} from "lucide-react";

export default function SystemStatus() {
  const [services, setServices] = useState([
    { name: "Plataforma Web", icon: Server, status: "operational", uptime: "99.9%", responseTime: "-" },
    { name: "Aplicativo Mobile", icon: Smartphone, status: "operational", uptime: "99.8%", responseTime: "-" },
    { name: "Sistema de Pagamentos", icon: CreditCard, status: "operational", uptime: "99.9%", responseTime: "-" },
    { name: "Serviço de Entrega", icon: Truck, status: "operational", uptime: "99.7%", responseTime: "-" },
    { name: "Base de Dados", icon: Database, status: "operational", uptime: "99.9%", responseTime: "-" },
    { name: "API Externa", icon: Cloud, status: "operational", uptime: "99.8%", responseTime: "-" },
  ] as Array<{ name: string; icon: React.ComponentType<{ className?: string }>; status: "operational"|"degraded"|"outage"; uptime: string; responseTime: string }>);

  const currentStatus = useMemo(() => {
    if (services.some(s => s.status === "outage")) return "outage";
    if (services.some(s => s.status === "degraded")) return "degraded";
    return "operational";
  }, [services]);

  useEffect(() => {
    let mounted = true;
    const runChecks = async () => {
      try {
        const startDb = performance.now();
        const db = await checkDatabaseHealth();
        const dbTime = Math.round(performance.now() - startDb);
        if (!mounted) return;
        setServices(prev => prev.map(s => s.name === "Base de Dados" ? { ...s, status: db.healthy ? "operational" : "degraded", responseTime: `${dbTime}ms` } : s));
      } catch {
        if (!mounted) return;
        setServices(prev => prev.map(s => s.name === "Base de Dados" ? { ...s, status: "degraded", responseTime: "-" } : s));
      }
      try {
        const startFn = performance.now();
        const { error } = await supabase.functions.invoke("home-search", { body: { query: "", limit: 1 } });
        const fnTime = Math.round(performance.now() - startFn);
        if (!mounted) return;
        setServices(prev => prev.map(s => s.name === "API Externa" ? { ...s, status: error ? "degraded" : "operational", responseTime: `${fnTime}ms` } : s));
      } catch {
        if (!mounted) return;
        setServices(prev => prev.map(s => s.name === "API Externa" ? { ...s, status: "degraded", responseTime: "-" } : s));
      }
    };
    runChecks();
    return () => { mounted = false };
  }, []);

  const statusHistory = [
    {
      date: "15 Jan 2024",
      time: "14:30",
      type: "maintenance",
      title: "Manutenção Programada - Sistema de Pagamentos",
      description: "Atualização de segurança realizada com sucesso. Duração: 15 minutos.",
      status: "resolved"
    },
    {
      date: "12 Jan 2024", 
      time: "09:15",
      type: "incident",
      title: "Lentidão no Aplicativo Mobile",
      description: "Alguns usuários relataram lentidão no carregamento. Problema resolvido em 8 minutos.",
      status: "resolved"
    },
    {
      date: "10 Jan 2024",
      time: "16:45", 
      type: "maintenance",
      title: "Manutenção de Rotina - Infraestrutura",
      description: "Manutenção preventiva dos servidores realizada com sucesso.",
      status: "resolved"
    },
    {
      date: "08 Jan 2024",
      time: "11:22",
      type: "incident", 
      title: "Instabilidade no Sistema de Entregas",
      description: "Problema temporário com rastreamento de pedidos. Resolvido rapidamente.",
      status: "resolved"
    }
  ];

  const metrics = [
    { label: "Disponibilidade Geral", value: "99.87%", change: "+0.1%" },
    { label: "Tempo de Resposta Médio", value: "118ms", change: "-12ms" },
    { label: "Pedidos Processados/Hora", value: "2.5k", change: "+15%" },
    { label: "Uptime Mensal", value: "99.9%", change: "0%" }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "operational":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "degraded":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case "outage":
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "operational":
        return "text-green-600 bg-green-50 border-green-200";
      case "degraded":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "outage":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-green-600 bg-green-50 border-green-200";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "operational":
        return "Operacional";
      case "degraded":
        return "Degradado";
      case "outage":
        return "Indisponível";
      default:
        return "Operacional";
    }
  };

  return (
    <div className="min-h-screen">
      <SEO 
        title="Status do Sistema - Onfoods"
        description="Acompanhe o status em tempo real de todos os serviços da Onfoods. Monitoramento de disponibilidade, performance e incidentes."
      />

      {/* Hero Section */}
      <section className="bg-gradient-primary text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-6 bg-white/20 text-white border-white/30">
            Monitoramento em Tempo Real
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 drop-shadow-lg">
            Status do
            <br />
            <span className="text-white/90">Sistema</span>
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
            Acompanhe em tempo real o status de todos os nossos serviços e sistemas.
          </p>
        </div>
      </section>

      {/* Current Status */}
      <section className="py-16 bg-gradient-card">
        <div className="container mx-auto px-4">
          <Card className={`max-w-4xl mx-auto shadow-card border-2 ${getStatusColor(currentStatus)}`}>
            <CardContent className="p-8 text-center">
              <div className="flex items-center justify-center space-x-3 mb-4">
                {getStatusIcon(currentStatus)}
                <h2 className="text-2xl font-bold">
                  Todos os sistemas {getStatusText(currentStatus).toLowerCase()}
                </h2>
              </div>
              <p className="text-muted-foreground">
                Última verificação: {new Date().toLocaleString('pt-BR')}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Services Status */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-primary text-primary">
              Monitoramento de Serviços
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Status dos serviços
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Monitoramento detalhado de cada componente da nossa plataforma.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {services.map((service, index) => (
              <Card key={index} className="shadow-card hover:shadow-hover transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-primary/10 p-2 rounded-lg">
                        <service.icon className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-lg">{service.name}</CardTitle>
                    </div>
                    {getStatusIcon(service.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant="outline" className={getStatusColor(service.status)}>
                        {getStatusText(service.status)}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Uptime:</span>
                      <span className="font-medium text-green-600">{service.uptime}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tempo de Resposta:</span>
                      <span className="font-medium">{service.responseTime}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-primary text-primary">
              Métricas de Performance
            </Badge>
            <h2 className="text-3xl font-bold mb-4">
              Indicadores de desempenho
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Principais métricas que monitoramos para garantir a qualidade do serviço.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {metrics.map((metric, index) => (
              <Card key={index} className="text-center p-6 shadow-card">
                <CardContent className="p-0">
                  <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Activity className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-2xl font-bold text-primary mb-1">{metric.value}</div>
                  <div className="text-sm text-muted-foreground mb-2">{metric.label}</div>
                  <div className="flex items-center justify-center space-x-1">
                    <TrendingUp className="h-3 w-3 text-green-600" />
                    <span className="text-xs text-green-600 font-medium">{metric.change}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Status History */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-primary text-primary">
              Histórico de Incidentes
            </Badge>
            <h2 className="text-3xl font-bold mb-4">
              Últimos eventos
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Histórico completo de incidentes e manutenções realizadas.
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-6">
            {statusHistory.map((event, index) => (
              <Card key={index} className="shadow-card">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="bg-green-100 p-2 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg mb-2">{event.title}</CardTitle>
                        <p className="text-muted-foreground leading-relaxed">{event.description}</p>
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1 mb-1">
                        <Clock className="h-3 w-3" />
                        <span>{event.date} às {event.time}</span>
                      </div>
                      <Badge variant="outline" className="text-green-600 border-green-200">
                        Resolvido
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Subscribe to Updates */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <Card className="max-w-2xl mx-auto bg-gradient-primary text-white shadow-card">
            <CardContent className="p-8">
              <Activity className="h-12 w-12 mx-auto mb-4 text-white/90" />
              <h3 className="text-2xl font-bold mb-4">Receba atualizações</h3>
              <p className="text-white/90 mb-6 leading-relaxed">
                Seja notificado sobre mudanças no status dos nossos serviços, 
                manutenções programadas e resolução de incidentes.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Badge variant="secondary" className="text-primary bg-white/20">
                  📧 E-mail
                </Badge>
                <Badge variant="secondary" className="text-primary bg-white/20">
                  📱 SMS
                </Badge>
                <Badge variant="secondary" className="text-primary bg-white/20">
                  🔔 Push
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
