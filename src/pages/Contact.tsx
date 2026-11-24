import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Phone, 
  Mail, 
  MapPin, 
  Clock,
  MessageCircle,
  Send,
  HelpCircle,
  Users,
  Building
} from "lucide-react";

export default function Contact() {
  const contactMethods = [
    {
      icon: Phone,
      title: "Telefone",
      description: "Ligue para nós",
      contact: "(11) 9999-9999",
      available: "24/7"
    },
    {
      icon: Mail,
      title: "E-mail",
      description: "Envie uma mensagem",
      contact: "contato@onfoods.com.br",
      available: "Resposta em até 2h"
    },
    {
      icon: MessageCircle,
      title: "WhatsApp",
      description: "Chat direto",
      contact: "(11) 9999-9999",
      available: "Seg-Sex 8h-18h"
    },
    {
      icon: MapPin,
      title: "Endereço",
      description: "Nos visite",
      contact: "São Paulo, SP - Brasil",
      available: "Seg-Sex 9h-18h"
    }
  ];

  const helpTopics = [
    {
      icon: HelpCircle,
      title: "Dúvidas Gerais",
      description: "Tire suas dúvidas sobre como usar a plataforma"
    },
    {
      icon: Users,
      title: "Suporte ao Cliente",
      description: "Problemas com pedidos, entregas ou pagamentos"
    },
    {
      icon: Building,
      title: "Parceria Comercial",
      description: "Quero cadastrar meu estabelecimento"
    }
  ];

  return (
    <div className="min-h-screen">
      <SEO 
        title="Contato - Onfoods"
        description="Entre em contato conosco. Estamos aqui para ajudar com suas dúvidas, sugestões e resolver qualquer problema."
      />

      {/* Hero Section */}
      <section className="bg-gradient-primary text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-6 bg-white/20 text-white border-white/30">
            Fale Conosco
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 drop-shadow-lg">
            Estamos aqui
            <br />
            <span className="text-white/90">para ajudar</span>
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
            Tem alguma dúvida, sugestão ou precisa de ajuda? Nossa equipe está sempre 
            pronta para oferecer o melhor suporte.
          </p>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-primary text-primary">
              Como Falar Conosco
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Escolha o melhor canal
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Oferecemos diversos canais de atendimento para garantir que você 
              sempre tenha acesso ao suporte que precisa.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactMethods.map((method, index) => (
              <Card key={index} className="text-center p-6 shadow-card hover:shadow-hover transition-all duration-300 group hover:scale-105">
                <CardContent className="p-0">
                  <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                    <method.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{method.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{method.description}</p>
                  <p className="font-medium text-foreground mb-2">{method.contact}</p>
                  <Badge variant="outline" className="text-xs">
                    {method.available}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Form */}
            <div>
              <Badge variant="outline" className="mb-4 border-primary text-primary">
                Envie uma Mensagem
              </Badge>
              <h2 className="text-3xl font-bold mb-6">
                Nos conte como podemos ajudar
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Preencha o formulário abaixo e nossa equipe entrará em contato o mais breve possível.
              </p>

              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Send className="h-5 w-5 text-primary" />
                    <span>Formulário de Contato</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
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
                      <label className="text-sm font-medium mb-2 block">Assunto *</label>
                      <Input placeholder="Qual o motivo do contato?" />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Mensagem *</label>
                    <Textarea 
                      placeholder="Descreva sua dúvida, sugestão ou problema..." 
                      rows={5}
                    />
                  </div>

                  <Button size="lg" className="w-full group">
                    Enviar Mensagem
                    <Send className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    * Campos obrigatórios. Responderemos em até 2 horas úteis.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Help Topics */}
            <div>
              <Badge variant="outline" className="mb-4 border-primary text-primary">
                Tópicos de Ajuda
              </Badge>
              <h3 className="text-2xl font-bold mb-6">
                Encontre ajuda rápida
              </h3>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Antes de entrar em contato, veja se conseguimos ajudar com estes tópicos mais comuns.
              </p>

              <div className="space-y-4">
                {helpTopics.map((topic, index) => (
                  <Card key={index} className="p-6 shadow-card hover:shadow-hover transition-all duration-300 group cursor-pointer">
                    <CardContent className="p-0 flex items-start space-x-4">
                      <div className="bg-primary/10 p-3 rounded-lg group-hover:bg-primary/20 transition-colors">
                        <topic.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold mb-2 group-hover:text-primary transition-colors">
                          {topic.title}
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {topic.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Office Hours */}
              <Card className="mt-8 bg-gradient-primary text-white shadow-card">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <Clock className="h-6 w-6 text-white/90" />
                    <h4 className="font-bold text-lg">Horário de Atendimento</h4>
                  </div>
                  <div className="space-y-2 text-white/90">
                    <div className="flex justify-between">
                      <span>Segunda a Sexta:</span>
                      <span className="font-medium">8h às 18h</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sábado:</span>
                      <span className="font-medium">9h às 15h</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Domingo:</span>
                      <span className="font-medium">Fechado</span>
                    </div>
                  </div>
                  <p className="text-white/80 text-sm mt-4">
                    * Suporte de emergência 24/7 via WhatsApp
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}