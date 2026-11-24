import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { 
  Briefcase, 
  Users, 
  Heart,
  Zap,
  MapPin,
  Clock,
  DollarSign,
  Star,
  ArrowRight,
  Coffee,
  Laptop,
  Target
} from "lucide-react";

export default function Careers() {
  const values = [
    {
      icon: Heart,
      title: "Paixão pelo que fazemos",
      description: "Trabalhamos com amor pela gastronomia e tecnologia"
    },
    {
      icon: Users,
      title: "Trabalho em equipe",
      description: "Colaboração e apoio mútuo são fundamentais"
    },
    {
      icon: Zap,
      title: "Inovação constante",
      description: "Sempre buscamos maneiras de melhorar e evoluir"
    },
    {
      icon: Target,
      title: "Foco no resultado",
      description: "Orientados a objetivos e metas claras"
    }
  ];

  const benefits = [
    {
      icon: DollarSign,
      title: "Salário Competitivo",
      description: "Remuneração acima do mercado + participação nos resultados"
    },
    {
      icon: Clock,
      title: "Flexibilidade",
      description: "Horário flexível e possibilidade de home office"
    },
    {
      icon: Coffee,
      title: "Ambiente Descontraído",
      description: "Escritório moderno com café, snacks e área de descanso"
    },
    {
      icon: Laptop,
      title: "Equipamentos",
      description: "Notebook, celular e todos os equipamentos necessários"
    },
    {
      icon: Star,
      title: "Crescimento",
      description: "Plano de carreira estruturado e investimento em capacitação"
    },
    {
      icon: Heart,
      title: "Bem-estar",
      description: "Plano de saúde, auxílio academia e programa de qualidade de vida"
    }
  ];

  const openPositions = [
    {
      title: "Desenvolvedor(a) Frontend React",
      department: "Tecnologia",
      type: "Full-time",
      location: "São Paulo/SP",
      level: "Pleno/Sênior",
      description: "Buscamos profissional para desenvolver interfaces incríveis para nossa plataforma de delivery."
    },
    {
      title: "Desenvolvedor(a) Backend Node.js",
      department: "Tecnologia", 
      type: "Full-time",
      location: "São Paulo/SP",
      level: "Pleno/Sênior",
      description: "Oportunidade para trabalhar com APIs de alta escala e microserviços."
    },
    {
      title: "UX/UI Designer",
      department: "Design",
      type: "Full-time", 
      location: "São Paulo/SP",
      level: "Pleno",
      description: "Criar experiências digitais memoráveis para milhões de usuários."
    },
    {
      title: "Analista de Marketing Digital",
      department: "Marketing",
      type: "Full-time",
      location: "São Paulo/SP", 
      level: "Júnior/Pleno",
      description: "Desenvolver estratégias de marketing para crescimento da base de usuários."
    },
    {
      title: "Customer Success",
      department: "Atendimento",
      type: "Full-time",
      location: "Remoto",
      level: "Júnior/Pleno", 
      description: "Garantir a satisfação e sucesso dos nossos estabelecimentos parceiros."
    }
  ];

  return (
    <div className="min-h-screen">
      <SEO 
        title="Carreiras - Onfoods"
        description="Faça parte do nosso time! Conheça nossas vagas abertas e construa sua carreira na Onfoods. Venha transformar o delivery no Brasil conosco."
      />

      {/* Hero Section */}
      <section className="bg-gradient-primary text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-6 bg-white/20 text-white border-white/30">
            Trabalhe Conosco
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 drop-shadow-lg">
            Sua carreira
            <br />
            <span className="text-white/90">começa aqui</span>
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
            Junte-se ao nosso time e ajude a transformar o delivery no Brasil. 
            Trabalhe em uma empresa inovadora que valoriza seus talentos.
          </p>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-primary text-primary">
              Nossos Valores
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              O que nos move
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Nossos valores definem como trabalhamos e como construímos relacionamentos duradouros.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <Card key={index} className="text-center p-6 shadow-card hover:shadow-hover transition-all duration-300 group hover:scale-105">
                <CardContent className="p-0">
                  <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                    <value.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg mb-3">{value.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-primary text-primary">
              Benefícios
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Por que trabalhar na Onfoods?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Oferecemos muito mais que um emprego. Construímos carreiras e cuidamos das pessoas.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <Card key={index} className="p-6 shadow-card hover:shadow-hover transition-all duration-300 group">
                <CardContent className="p-0">
                  <div className="flex items-start space-x-4">
                    <div className="bg-primary/10 p-3 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <benefit.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-2">{benefit.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{benefit.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-primary text-primary">
              Vagas Abertas
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Oportunidades disponíveis
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Encontre a posição ideal para dar o próximo passo na sua carreira.
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-6">
            {openPositions.map((position, index) => (
              <Card key={index} className="shadow-card hover:shadow-hover transition-all duration-300 group">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="group-hover:text-primary transition-colors">
                        {position.title}
                      </CardTitle>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline">{position.department}</Badge>
                        <Badge variant="outline">{position.level}</Badge>
                        <Badge variant="outline" className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3" />
                          <span>{position.location}</span>
                        </Badge>
                        <Badge variant="outline">{position.type}</Badge>
                      </div>
                    </div>
                    <Button className="group/btn">
                      Ver Vaga
                      <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{position.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Application CTA */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <Card className="max-w-2xl mx-auto bg-gradient-primary text-white shadow-card">
            <CardContent className="p-8">
              <Briefcase className="h-12 w-12 mx-auto mb-4 text-white/90" />
              <h3 className="text-2xl font-bold mb-4">Não encontrou a vaga ideal?</h3>
              <p className="text-white/90 mb-6 leading-relaxed">
                Estamos sempre em busca de talentos excepcionais. Envie seu currículo 
                e entraremos em contato quando surgir uma oportunidade para o seu perfil.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="secondary" size="lg">
                  Enviar Currículo
                </Button>
                <Button variant="outline" size="lg" className="border-white/30 text-white hover:bg-white hover:text-primary" asChild>
                  <Link to="/contact">
                    Falar com RH
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