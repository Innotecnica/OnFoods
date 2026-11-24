import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  Send,
  Clock,
  Users,
  Heart,
  HelpCircle,
  Building,
  Lightbulb,
  Star
} from "lucide-react";

export default function TalkToUs() {
  const contactReasons = [
    { value: "suggestion", label: "Sugestão de Melhoria", icon: Lightbulb },
    { value: "feedback", label: "Feedback sobre o Serviço", icon: Star },
    { value: "partnership", label: "Proposta de Parceria", icon: Building },
    { value: "support", label: "Dúvida ou Suporte", icon: HelpCircle },
    { value: "compliment", label: "Elogio", icon: Heart },
    { value: "other", label: "Outro Assunto", icon: MessageCircle }
  ];

  const responseTime = [
    { reason: "Sugestões e Feedback", time: "24-48 horas" },
    { reason: "Parcerias Comerciais", time: "2-3 dias úteis" },
    { reason: "Suporte Geral", time: "4-6 horas" },
    { reason: "Elogios", time: "24 horas" }
  ];

  return (
    <div className="min-h-screen">
      <SEO 
        title="Fale Conosco - Onfoods"
        description="Queremos ouvir você! Envie suas sugestões, feedback, dúvidas ou propostas. Sua opinião é fundamental para melhorarmos nossos serviços."
      />

      {/* Hero Section */}
      <section className="bg-gradient-primary text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-6 bg-white/20 text-white border-white/30">
            Comunicação Direta
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 drop-shadow-lg">
            Fale
            <br />
            <span className="text-white/90">Conosco</span>
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
            Sua opinião é muito importante para nós. Compartilhe suas ideias, 
            sugestões ou simplesmente conte como podemos melhorar.
          </p>
        </div>
      </section>

      {/* Why Talk to Us */}
      <section className="py-16 bg-gradient-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Por que falar conosco?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Acreditamos que a comunicação direta com nossos usuários é fundamental 
              para construir um serviço cada vez melhor.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="text-center p-6 shadow-card hover:shadow-hover transition-all duration-300 group hover:scale-105">
              <CardContent className="p-0">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-3">Escuta Ativa</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Valorizamos cada opinião e usamos seu feedback para melhorar nossos serviços continuamente.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-6 shadow-card hover:shadow-hover transition-all duration-300 group hover:scale-105">
              <CardContent className="p-0">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                  <Clock className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-3">Resposta Rápida</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Comprometemo-nos a responder todas as mensagens de forma rápida e personalizada.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-6 shadow-card hover:shadow-hover transition-all duration-300 group hover:scale-105">
              <CardContent className="p-0">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                  <Heart className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-3">Relacionamento</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Construímos relacionamentos duradouros baseados na confiança e transparência.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-primary text-primary">
              Formulário de Contato
            </Badge>
            <h2 className="text-3xl font-bold mb-4">
              Nos conte o que pensa
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Use o formulário abaixo para nos enviar sua mensagem. Todos os campos são importantes 
              para que possamos dar o melhor retorno possível.
            </p>
          </div>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                <span>Sua Mensagem</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Contact Reason */}
              <div>
                <label className="text-sm font-medium mb-2 block">Motivo do Contato *</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o motivo do seu contato" />
                  </SelectTrigger>
                  <SelectContent>
                    {contactReasons.map((reason) => (
                      <SelectItem key={reason.value} value={reason.value}>
                        <div className="flex items-center space-x-2">
                          <reason.icon className="h-4 w-4" />
                          <span>{reason.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Personal Info */}
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
                  <label className="text-sm font-medium mb-2 block">Você é</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione seu perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Cliente</SelectItem>
                      <SelectItem value="establishment">Estabelecimento Parceiro</SelectItem>
                      <SelectItem value="potential">Potencial Parceiro</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="text-sm font-medium mb-2 block">Assunto *</label>
                <Input placeholder="Descreva brevemente o assunto da sua mensagem" />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Mensagem *</label>
                <Textarea 
                  placeholder="Conte-nos em detalhes sua sugestão, feedback, dúvida ou proposta. Quanto mais informações você compartilhar, melhor poderemos ajudar!"
                  rows={6}
                />
              </div>

              {/* Priority */}
              <div>
                <label className="text-sm font-medium mb-2 block">Prioridade</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a urgência da sua mensagem" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <span className="text-green-600">Baixa - Não é urgente</span>
                    </SelectItem>
                    <SelectItem value="medium">
                      <span className="text-yellow-600">Média - Resposta em alguns dias</span>
                    </SelectItem>
                    <SelectItem value="high">
                      <span className="text-orange-600">Alta - Preciso de resposta rápida</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Submit */}
              <div className="pt-4">
                <Button size="lg" className="w-full group">
                  Enviar Mensagem
                  <Send className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  * Campos obrigatórios. Sua mensagem será tratada com confidencialidade.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Response Times */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-primary text-primary">
              Tempo de Resposta
            </Badge>
            <h2 className="text-2xl font-bold mb-4">Quando você receberá nossa resposta</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Nos comprometemos com prazos claros para cada tipo de contato.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {responseTime.map((item, index) => (
              <Card key={index} className="text-center p-6 shadow-card">
                <CardContent className="p-0">
                  <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-bold mb-2">{item.reason}</h3>
                  <p className="text-sm text-primary font-medium">{item.time}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Appreciation */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <Card className="max-w-2xl mx-auto bg-gradient-primary text-white shadow-card">
            <CardContent className="p-8">
              <Heart className="h-12 w-12 mx-auto mb-4 text-white/90" />
              <h3 className="text-2xl font-bold mb-4">Obrigado por falar conosco!</h3>
              <p className="text-white/90 mb-6 leading-relaxed">
                Cada mensagem que recebemos nos ajuda a construir uma plataforma melhor. 
                Sua participação é fundamental para o nosso crescimento e melhoria contínua.
              </p>
              <p className="text-white/80 text-sm">
                💡 Dica: Nos siga nas redes sociais para acompanhar novidades e melhorias baseadas no seu feedback!
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}