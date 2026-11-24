import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Cookie,
  Shield,
  Eye,
  Settings,
  Calendar,
  CheckCircle,
  AlertCircle,
  Info
} from "lucide-react";

export default function Cookies() {
  const lastUpdate = "01 Janeiro 2024";

  const cookieTypes = [
    {
      name: "Cookies Essenciais",
      icon: Shield,
      description: "Necessários para o funcionamento básico do site",
      purpose: "Autenticação, segurança, preferências de navegação",
      duration: "Durante a sessão ou até 1 ano",
      required: true,
      examples: ["session_id", "auth_token", "language_preference"]
    },
    {
      name: "Cookies de Performance",
      icon: Settings,
      description: "Coletam informações sobre como você usa nosso site",
      purpose: "Análise de desempenho, otimização da experiência",
      duration: "Até 2 anos",
      required: false,
      examples: ["_ga", "_gid", "performance_metrics"]
    },
    {
      name: "Cookies de Funcionalidade",
      icon: Eye,
      description: "Lembram suas escolhas e preferências",
      purpose: "Personalização, configurações de usuário",
      duration: "Até 1 ano",
      required: false,
      examples: ["theme_preference", "location_settings", "cart_items"]
    },
    {
      name: "Cookies de Marketing",
      icon: Cookie,
      description: "Utilizados para personalizar anúncios e conteúdo",
      purpose: "Publicidade direcionada, análise de campanhas",
      duration: "Até 90 dias",
      required: false,
      examples: ["ad_preferences", "marketing_id", "campaign_data"]
    }
  ];

  const thirdPartyCookies = [
    {
      service: "Google Analytics",
      purpose: "Análise de tráfego e comportamento dos usuários",
      cookies: ["_ga", "_gid", "_gat"],
      privacy: "https://policies.google.com/privacy"
    },
    {
      service: "Google Maps",
      purpose: "Exibição de mapas e localização",
      cookies: ["CONSENT", "NID"],
      privacy: "https://policies.google.com/privacy"
    },
    {
      service: "Stripe",
      purpose: "Processamento de pagamentos",
      cookies: ["__stripe_mid", "__stripe_sid"],
      privacy: "https://stripe.com/privacy"
    }
  ];

  const managementSteps = [
    {
      browser: "Chrome",
      steps: "Configurações → Privacidade e segurança → Cookies e outros dados de sites"
    },
    {
      browser: "Firefox", 
      steps: "Configurações → Privacidade e segurança → Cookies e dados de sites"
    },
    {
      browser: "Safari",
      steps: "Preferências → Privacidade → Gerenciar dados de sites"
    },
    {
      browser: "Edge",
      steps: "Configurações → Privacidade, pesquisa e serviços → Cookies"
    }
  ];

  return (
    <div className="min-h-screen">
      <SEO 
        title="Política de Cookies - Onfoods"
        description="Entenda como utilizamos cookies para melhorar sua experiência na Onfoods. Informações sobre tipos, finalidades e como gerenciar suas preferências."
      />

      {/* Hero Section */}
      <section className="bg-gradient-primary text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-6 bg-white/20 text-white border-white/30">
            Transparência Digital
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 drop-shadow-lg">
            Política de
            <br />
            <span className="text-white/90">Cookies</span>
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
            Entenda como utilizamos cookies para melhorar sua experiência e personalizar nossos serviços.
          </p>
        </div>
      </section>

      {/* Last Update */}
      <section className="py-8 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Última atualização: {lastUpdate}</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Versão atual</span>
            </div>
          </div>
        </div>
      </section>

      {/* What are Cookies */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <Card className="max-w-4xl mx-auto border-blue-200 bg-blue-50">
            <CardContent className="p-8">
              <div className="flex items-start space-x-4">
                <Info className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-blue-900 mb-2">O que são Cookies?</h3>
                  <p className="text-blue-800 leading-relaxed mb-4">
                    Cookies são pequenos arquivos de texto armazenados no seu dispositivo quando você visita um site. 
                    Eles nos ajudam a lembrar suas preferências, melhorar a funcionalidade do site e personalizar sua experiência.
                  </p>
                  <p className="text-blue-800 leading-relaxed">
                    Na Onfoods, utilizamos cookies de forma responsável e transparente, sempre respeitando sua privacidade 
                    e dando a você controle sobre como seus dados são utilizados.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Cookie Preferences */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-primary text-primary">
              Suas Preferências
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Gerencie seus cookies
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Você tem controle total sobre quais cookies permitir. Ajuste suas preferências abaixo.
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-6">
            {cookieTypes.map((type, index) => (
              <Card key={index} className="shadow-card">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="bg-primary/10 p-3 rounded-lg">
                        <type.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{type.name}</CardTitle>
                        <p className="text-muted-foreground mb-3 leading-relaxed">{type.description}</p>
                        
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong className="text-foreground">Finalidade:</strong>
                            <p className="text-muted-foreground">{type.purpose}</p>
                          </div>
                          <div>
                            <strong className="text-foreground">Duração:</strong>
                            <p className="text-muted-foreground">{type.duration}</p>
                          </div>
                        </div>
                        
                        <div className="mt-3">
                          <strong className="text-foreground text-sm">Exemplos:</strong>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {type.examples.map((example, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {example}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4">
                      <Switch 
                        checked={type.required ? true : undefined}
                        disabled={type.required}
                      />
                      {type.required && (
                        <p className="text-xs text-muted-foreground mt-1">Obrigatório</p>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>

          <div className="text-center mt-8">
            <Button size="lg" className="mr-4">
              Salvar Preferências
            </Button>
            <Button variant="outline" size="lg">
              Aceitar Todos
            </Button>
          </div>
        </div>
      </section>

      {/* Third Party Cookies */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-primary text-primary">
              Serviços Terceirizados
            </Badge>
            <h2 className="text-3xl font-bold mb-4">
              Cookies de terceiros
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Alguns cookies são definidos por serviços terceirizados que utilizamos para melhorar nossa plataforma.
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-6">
            {thirdPartyCookies.map((service, index) => (
              <Card key={index} className="shadow-card">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg mb-2">{service.service}</CardTitle>
                      <p className="text-muted-foreground mb-3 leading-relaxed">{service.purpose}</p>
                      
                      <div className="mb-3">
                        <strong className="text-foreground text-sm">Cookies utilizados:</strong>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {service.cookies.map((cookie, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {cookie}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href={service.privacy} target="_blank" rel="noopener noreferrer">
                        Política de Privacidade
                      </a>
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How to Manage */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-primary text-primary">
              Controle Total
            </Badge>
            <h2 className="text-3xl font-bold mb-4">
              Como gerenciar cookies no seu navegador
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Você pode controlar e excluir cookies através das configurações do seu navegador.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {managementSteps.map((guide, index) => (
              <Card key={index} className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5 text-primary" />
                    <span>{guide.browser}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{guide.steps}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="max-w-2xl mx-auto mt-12 border-orange-200 bg-orange-50">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-orange-900 mb-2">Importante</h4>
                  <p className="text-orange-800 text-sm leading-relaxed">
                    Desabilitar certos cookies pode afetar a funcionalidade do site. 
                    Cookies essenciais são necessários para o funcionamento básico da plataforma.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Contact */} 
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <Card className="max-w-2xl mx-auto shadow-card">
            <CardContent className="p-8">
              <Cookie className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-4">Dúvidas sobre cookies?</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Se você tiver alguma dúvida sobre nossa política de cookies ou 
                como utilizamos essas tecnologias, entre em contato conosco.
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><strong>E-mail:</strong> cookies@onfoods.com.br</p>
                <p><strong>Telefone:</strong> (11) 9999-9999</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}