import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { 
  Search, 
  ShoppingCart, 
  CreditCard, 
  Truck,
  Smartphone,
  MapPin,
  Clock,
  Star,
  Shield,
  ArrowRight,
  CheckCircle
} from "lucide-react";

export default function HowItWorks() {
  const steps = [
    {
      number: "01",
      icon: Search,
      title: "Descubra",
      description: "Explore centenas de restaurantes e encontre exatamente o que você está procurando",
      details: "Use nossa busca inteligente para filtrar por categoria, preço, avaliação e tempo de entrega."
    },
    {
      number: "02", 
      icon: ShoppingCart,
      title: "Escolha",
      description: "Adicione seus pratos favoritos ao carrinho e personalize como desejar",
      details: "Veja fotos, descrições detalhadas, ingredientes e personalize seu pedido."
    },
    {
      number: "03",
      icon: CreditCard,
      title: "Pague",
      description: "Finalize seu pedido com segurança usando seu método de pagamento preferido",
      details: "Aceitamos cartão de crédito, débito, PIX e dinheiro na entrega."
    },
    {
      number: "04",
      icon: Truck,
      title: "Receba",
      description: "Acompanhe seu pedido em tempo real e receba na sua casa",
      details: "Receba notificações sobre o status do seu pedido do preparo até a entrega."
    }
  ];

  const features = [
    {
      icon: Smartphone,
      title: "App Intuitivo",
      description: "Interface simples e fácil de usar para todos os perfis de usuário"
    },
    {
      icon: MapPin,
      title: "Entrega Rápida",
      description: "Rede de entregadores qualificados para maior agilidade"
    },
    {
      icon: Shield,
      title: "Pagamento Seguro",
      description: "Transações protegidas com criptografia de ponta"
    },
    {
      icon: Star,
      title: "Avaliações Reais",
      description: "Sistema de avaliações transparente e confiável"
    },
    {
      icon: Clock,
      title: "Tempo Real",
      description: "Acompanhe seu pedido desde o preparo até a entrega"
    },
    {
      icon: CheckCircle,
      title: "Garantia",
      description: "Satisfação garantida ou seu dinheiro de volta"
    }
  ];

  const benefits = [
    "Mais de 10.000 estabelecimentos parceiros",
    "Entrega em média de 30 minutos",
    "Suporte 24/7 para resolver qualquer problema",
    "Programa de fidelidade com descontos exclusivos",
    "Sem taxa de entrega para pedidos acima de R$ 30",
    "Notificações em tempo real via WhatsApp"
  ];

  return (
    <div className="min-h-screen">
      <SEO 
        title="Como Funciona - Onfoods"
        description="Descubra como é fácil pedir comida pela Onfoods. Do pedido à entrega, tudo pensado para sua comodidade."
      />

      {/* Hero Section */}
      <section className="bg-gradient-primary text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-6 bg-white/20 text-white border-white/30">
            Simples e Rápido
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 drop-shadow-lg">
            Como funciona a
            <br />
            <span className="text-white/90">Onfoods</span>
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto leading-relaxed mb-8">
            Em apenas 4 passos simples, você tem acesso aos melhores sabores da sua região, 
            com entrega rápida e segura direto na sua casa.
          </p>
          <Button size="lg" variant="secondary" asChild className="group">
            <Link to="/establishments">
              Fazer Primeiro Pedido
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-primary text-primary">
              Processo Simples
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              4 passos para saborear
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Nossa plataforma foi desenvolvida para ser intuitiva e eficiente, 
              garantindo a melhor experiência do pedido à entrega.
            </p>
          </div>

          <div className="space-y-16">
            {steps.map((step, index) => (
              <div key={index} className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-12`}>
                <div className="flex-1 text-center lg:text-left">
                  <div className="flex items-center justify-center lg:justify-start space-x-4 mb-4">
                    <div className="bg-primary/10 text-primary text-xl font-bold w-12 h-12 rounded-full flex items-center justify-center">
                      {step.number}
                    </div>
                    <Badge variant="outline" className="border-primary text-primary">
                      Passo {step.number}
                    </Badge>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold mb-4">{step.title}</h3>
                  <p className="text-lg text-muted-foreground mb-4 leading-relaxed">
                    {step.description}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.details}
                  </p>
                </div>
                <div className="flex-1 flex justify-center">
                  <Card className="p-8 shadow-card hover:shadow-hover transition-all duration-300 group hover:scale-105">
                    <CardContent className="p-0 text-center">
                      <div className="bg-gradient-primary w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <step.icon className="h-12 w-12 text-white" />
                      </div>
                      <h4 className="font-bold text-lg">{step.title}</h4>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-primary text-primary">
              Vantagens
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Por que escolher a Onfoods?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Oferecemos muito mais que apenas delivery. Uma experiência completa 
              pensada em cada detalhe.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 shadow-card hover:shadow-hover transition-all duration-300 group hover:scale-105">
                <CardContent className="p-0">
                  <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="outline" className="mb-4 border-primary text-primary">
                Benefícios Exclusivos
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Muito mais que delivery
              </h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Quando você escolhe a Onfoods, tem acesso a benefícios exclusivos 
                que tornam sua experiência ainda melhor.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-primary rounded-2xl p-8 text-white shadow-card">
              <h3 className="text-2xl font-bold mb-6">Pronto para começar?</h3>
              <p className="text-white/90 mb-6 leading-relaxed">
                Faça seu primeiro pedido agora e descubra por que milhares de pessoas 
                já escolheram a Onfoods como sua plataforma de delivery preferida.
              </p>
              <Button variant="secondary" size="lg" asChild className="w-full group">
                <Link to="/establishments">
                  Explorar Restaurantes
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}