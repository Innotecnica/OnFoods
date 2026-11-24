import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "react-router-dom";
import { 
  Search, 
  HelpCircle, 
  ShoppingCart, 
  CreditCard,
  Truck,
  User,
  Settings,
  Phone,
  MessageCircle,
  ExternalLink
} from "lucide-react";

export default function Help() {
  const categories = [
    {
      icon: ShoppingCart,
      title: "Pedidos",
      description: "Como fazer, acompanhar e cancelar pedidos",
      count: "15 artigos"
    },
    {
      icon: CreditCard,
      title: "Pagamentos",
      description: "Métodos de pagamento, reembolsos e cupons",
      count: "12 artigos"
    },
    {
      icon: Truck,
      title: "Entregas",
      description: "Prazos, taxas e problemas com entrega",
      count: "10 artigos"
    },
    {
      icon: User,
      title: "Conta",
      description: "Perfil, segurança e configurações",
      count: "8 artigos"
    },
    {
      icon: Settings,
      title: "Estabelecimentos",
      description: "Para parceiros que querem se cadastrar",
      count: "20 artigos"
    },
    {
      icon: HelpCircle,
      title: "Outras Dúvidas",
      description: "Tópicos gerais e diversos",
      count: "6 artigos"
    }
  ];

  const faqs = [
    {
      question: "Como faço meu primeiro pedido?",
      answer: "Para fazer seu primeiro pedido: 1) Acesse nossa plataforma, 2) Escolha um estabelecimento, 3) Selecione os produtos, 4) Adicione ao carrinho, 5) Preencha seus dados de entrega, 6) Escolha a forma de pagamento e 7) Finalize o pedido."
    },
    {
      question: "Quais formas de pagamento são aceitas?",
      answer: "Aceitamos cartão de crédito, cartão de débito, PIX e dinheiro na entrega. Para pagamentos online, todas as transações são protegidas por criptografia de segurança."
    },
    {
      question: "Qual o tempo médio de entrega?",
      answer: "O tempo de entrega varia de acordo com a distância e o estabelecimento, mas geralmente fica entre 30 a 60 minutos. Você pode acompanhar o status do seu pedido em tempo real."
    },
    {
      question: "Como posso cancelar um pedido?",
      answer: "Você pode cancelar seu pedido através do app ou site, na seção 'Meus Pedidos', desde que o estabelecimento ainda não tenha iniciado o preparo. Após isso, entre em contato conosco."
    },
    {
      question: "O que fazer se meu pedido chegou errado?",
      answer: "Se houver algum problema com seu pedido, entre em contato conosco imediatamente através do chat, WhatsApp ou telefone. Resolveremos a situação rapidamente."
    },
    {
      question: "Como cadastrar meu restaurante na plataforma?",
      answer: "Para cadastrar seu estabelecimento, acesse nossa seção de parceiros ou entre em contato conosco. Nossa equipe comercial irá orientá-lo sobre todo o processo de cadastro e integração."
    },
    {
      question: "Há taxa de entrega?",
      answer: "A taxa de entrega varia por estabelecimento e distância. Muitos locais oferecem frete grátis para pedidos acima de um valor mínimo. A taxa é sempre informada antes da finalização do pedido."
    },
    {
      question: "Posso usar cupons de desconto?",
      answer: "Sim! Você pode aplicar cupons de desconto durante o checkout. Os cupons podem ser encontrados no app, por e-mail ou através de promoções especiais dos estabelecimentos."
    }
  ];

  const quickActions = [
    {
      icon: MessageCircle,
      title: "Chat ao Vivo",
      description: "Fale conosco agora",
      action: "Iniciar Chat"
    },
    {
      icon: Phone,
      title: "Telefone",
      description: "(11) 9999-9999",
      action: "Ligar Agora"
    }
  ];

  return (
    <div className="min-h-screen">
      <SEO 
        title="Central de Ajuda - Onfoods"
        description="Encontre respostas para suas dúvidas sobre pedidos, entregas, pagamentos e muito mais na nossa central de ajuda."
      />

      {/* Hero Section */}
      <section className="bg-gradient-primary text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-6 bg-white/20 text-white border-white/30">
            Central de Ajuda
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 drop-shadow-lg">
            Como podemos
            <br />
            <span className="text-white/90">te ajudar?</span>
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto leading-relaxed mb-8">
            Encontre respostas rápidas para suas dúvidas ou entre em contato com nossa equipe de suporte.
          </p>
          
          {/* Search Bar */}
          <div className="max-w-md mx-auto relative">
            <Input 
              placeholder="Buscar por palavra-chave..." 
              className="pl-12 pr-4 py-3 bg-white/20 border-white/30 text-white placeholder:text-white/70 focus:bg-white focus:text-foreground"
            />
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/70" />
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-16 bg-gradient-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Precisa de ajuda urgente?</h2>
            <p className="text-muted-foreground">Nossa equipe está pronta para ajudar</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4 max-w-md mx-auto">
            {quickActions.map((action, index) => (
              <Card key={index} className="shadow-card hover:shadow-hover transition-all duration-300 group cursor-pointer">
                <CardContent className="p-6 text-center">
                  <action.icon className="h-8 w-8 text-primary mx-auto mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="font-bold mb-1">{action.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{action.description}</p>
                  <Button size="sm" className="w-full">
                    {action.action}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-primary text-primary">
              Categorias de Ajuda
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Explore por categoria
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Encontre rapidamente o que precisa navegando pelas nossas categorias organizadas.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category, index) => (
              <Card key={index} className="p-6 shadow-card hover:shadow-hover transition-all duration-300 group hover:scale-105 cursor-pointer">
                <CardContent className="p-0">
                  <div className="flex items-start space-x-4">
                    <div className="bg-primary/10 p-3 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <category.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">
                        {category.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                        {category.description}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {category.count}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-primary text-primary">
              Perguntas Frequentes
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Dúvidas mais comuns
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Compilamos as perguntas mais frequentes para ajudar você a encontrar respostas rapidamente.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="bg-card border border-border rounded-lg px-6">
                  <AccordionTrigger className="text-left hover:no-underline py-6">
                    <span className="font-medium">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6 text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <Card className="max-w-2xl mx-auto bg-gradient-primary text-white shadow-card">
            <CardContent className="p-8">
              <HelpCircle className="h-12 w-12 mx-auto mb-4 text-white/90" />
              <h3 className="text-2xl font-bold mb-4">Não encontrou sua resposta?</h3>
              <p className="text-white/90 mb-6 leading-relaxed">
                Nossa equipe de suporte está sempre pronta para ajudar com qualquer dúvida ou problema específico.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="secondary" size="lg" asChild>
                  <Link to="/contact">
                    Entrar em Contato
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="border-white/30 text-white hover:bg-white hover:text-primary">
                  Chat ao Vivo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}