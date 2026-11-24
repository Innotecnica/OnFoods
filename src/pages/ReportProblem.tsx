import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { 
  AlertTriangle, 
  Bug, 
  Smartphone,
  Globe,
  Send,
  CheckCircle,
  Phone,
  MessageCircle
} from "lucide-react";

export default function ReportProblem() {
  const problemTypes = [
    { value: "technical", label: "Problema Técnico", icon: Bug },
    { value: "order", label: "Problema com Pedido", icon: AlertTriangle },
    { value: "payment", label: "Problema de Pagamento", icon: AlertTriangle },
    { value: "delivery", label: "Problema de Entrega", icon: AlertTriangle },
    { value: "app", label: "Problema no App", icon: Smartphone },
    { value: "website", label: "Problema no Site", icon: Globe },
    { value: "other", label: "Outro", icon: AlertTriangle }
  ];

  const urgencyLevels = [
    { value: "low", label: "Baixa - Não urgente", color: "text-green-600" },
    { value: "medium", label: "Média - Moderadamente importante", color: "text-yellow-600" },
    { value: "high", label: "Alta - Precisa atenção rápida", color: "text-orange-600" },
    { value: "critical", label: "Crítica - Problema grave", color: "text-red-600" }
  ];

  return (
    <div className="min-h-screen">
      <SEO 
        title="Reportar Problema - Onfoods"
        description="Reporte problemas técnicos, com pedidos ou qualquer dificuldade que esteja enfrentando. Nossa equipe está aqui para ajudar."
      />

      {/* Hero Section */}
      <section className="bg-gradient-primary text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-6 bg-white/20 text-white border-white/30">
            Suporte Técnico
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 drop-shadow-lg">
            Reportar
            <br />
            <span className="text-white/90">Problema</span>
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
            Encontrou algum problema? Conte-nos os detalhes e nossa equipe técnica 
            resolverá o mais rápido possível.
          </p>
        </div>
      </section>

      {/* Emergency Contact */}
      <section className="py-12 bg-red-50 border-b border-red-200">
        <div className="container mx-auto px-4">
          <Card className="max-w-4xl mx-auto border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <AlertTriangle className="h-6 w-6 text-red-600 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-bold text-red-900 mb-2">Problema Urgente?</h3>
                  <p className="text-red-800 mb-4 leading-relaxed">
                    Se você está enfrentando um problema crítico que precisa de atenção imediata, 
                    entre em contato conosco diretamente pelos canais abaixo:
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <Button variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-100">
                      <Phone className="mr-2 h-4 w-4" />
                      (11) 9999-9999
                    </Button>
                    <Button variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-100">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      WhatsApp
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Report Form */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-primary text-primary">
              Formulário de Reporte
            </Badge>
            <h2 className="text-3xl font-bold mb-4">
              Descreva o problema
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Preencha o formulário abaixo com o máximo de detalhes possível. 
              Isso nos ajudará a resolver o problema mais rapidamente.
            </p>
          </div>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bug className="h-5 w-5 text-primary" />
                <span>Relatório de Problema</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Problem Type */}
              <div>
                <label className="text-sm font-medium mb-2 block">Tipo de Problema *</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de problema" />
                  </SelectTrigger>
                  <SelectContent>
                    {problemTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center space-x-2">
                          <type.icon className="h-4 w-4" />
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Urgency */}
              <div>
                <label className="text-sm font-medium mb-2 block">Nível de Urgência *</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o nível de urgência" />
                  </SelectTrigger>
                  <SelectContent>
                    {urgencyLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        <span className={level.color}>{level.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* User Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Nome *</label>
                  <Input placeholder="Seu nome completo" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">E-mail *</label>
                  <Input type="email" placeholder="seu@email.com" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Telefone</label>
                  <Input placeholder="(11) 99999-9999" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">ID do Pedido (se aplicável)</label>
                  <Input placeholder="ID do pedido relacionado" />
                </div>
              </div>

              {/* Problem Description */}
              <div>
                <label className="text-sm font-medium mb-2 block">Título do Problema *</label>
                <Input placeholder="Ex: Não consigo finalizar pedido" />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Descrição Detalhada *</label>
                <Textarea 
                  placeholder="Descreva o problema em detalhes: o que aconteceu, quando ocorreu, quais passos você estava seguindo, mensagens de erro, etc."
                  rows={6}
                />
              </div>

              {/* Technical Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Dispositivo</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione seu dispositivo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desktop">Desktop/Computador</SelectItem>
                      <SelectItem value="mobile">Celular</SelectItem>
                      <SelectItem value="tablet">Tablet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Navegador</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione seu navegador" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chrome">Google Chrome</SelectItem>
                      <SelectItem value="firefox">Mozilla Firefox</SelectItem>
                      <SelectItem value="safari">Safari</SelectItem>
                      <SelectItem value="edge">Microsoft Edge</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Additional Info */}
              <div>
                <label className="text-sm font-medium mb-2 block">Informações Adicionais</label>
                <Textarea 
                  placeholder="Qualquer informação adicional que possa ser útil (screenshots, passos para reproduzir o problema, etc.)"
                  rows={3}
                />
              </div>

              {/* Submit */}
              <div className="pt-4">
                <Button size="lg" className="w-full group">
                  Enviar Relatório
                  <Send className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  * Campos obrigatórios. Responderemos em até 24 horas.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Help Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <Card className="max-w-2xl mx-auto shadow-card">
            <CardContent className="p-8">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-4">Após o envio</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Nossa equipe técnica analisará seu relatório e entrará em contato em até 24 horas. 
                Para problemas críticos, o retorno será ainda mais rápido.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild>
                  <Link to="/help">
                    Central de Ajuda
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/contact">
                    Outros Contatos
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}