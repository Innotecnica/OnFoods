import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Newspaper, 
  Download, 
  Camera,
  Users,
  Award,
  TrendingUp,
  FileText,
  Mail,
  Phone,
  ExternalLink
} from "lucide-react";

export default function Press() {
  const pressReleases = [
    {
      date: "15 Jan 2024",
      title: "Onfoods anuncia expansão para 50 novas cidades brasileiras",
      summary: "Plataforma de delivery alcança marco de 10 mil estabelecimentos parceiros e planeja crescimento acelerado.",
      category: "Expansão"
    },
    {
      date: "03 Jan 2024", 
      title: "Onfoods fecha 2023 com crescimento de 150% no faturamento",
      summary: "Empresa registra aumento significativo no número de pedidos e estabelecimentos parceiros.",
      category: "Resultados"
    },
    {
      date: "10 Dez 2023",
      title: "Onfoods lança programa de sustentabilidade com entregas neutras em carbono",
      summary: "Iniciativa visa compensar 100% das emissões de CO2 das entregas através de projetos ambientais.",
      category: "Sustentabilidade"
    },
    {
      date: "25 Nov 2023",
      title: "Onfoods recebe prêmio de 'Melhor App de Delivery' do ano",
      summary: "Reconhecimento vem pela inovação em tecnologia e experiência do usuário.",
      category: "Premiação"
    }
  ];

  const mediaKit = [
    {
      type: "Logos",
      description: "Logos oficiais em diferentes formatos e variações",
      format: "PNG, SVG, EPS",
      size: "2.5 MB"
    },
    {
      type: "Fotos Executivos",
      description: "Fotos profissionais da equipe de liderança",
      format: "JPG, PNG",
      size: "15 MB"  
    },
    {
      type: "Screenshots App",
      description: "Capturas de tela da plataforma e aplicativo",
      format: "PNG, JPG",
      size: "8 MB"
    },
    {
      type: "Infográficos",
      description: "Dados e estatísticas da empresa em formato visual",
      format: "PNG, PDF",
      size: "5 MB"
    }
  ];

  const companyFacts = [
    { label: "Ano de Fundação", value: "2020" },
    { label: "Estabelecimentos Parceiros", value: "10.000+" },
    { label: "Cidades Atendidas", value: "50+" },
    { label: "Pedidos Entregues", value: "500.000+" },
    { label: "Colaboradores", value: "250+" },
    { label: "Faturamento 2023", value: "R$ 50M+" }
  ];

  const awards = [
    {
      year: "2023",
      title: "Melhor App de Delivery",
      organization: "Tech Awards Brasil",
      description: "Reconhecimento pela inovação em tecnologia"
    },
    {
      year: "2023", 
      title: "Startup do Ano - Categoria Food Tech",
      organization: "Startup Awards",
      description: "Premiação pelo crescimento e impacto no setor"
    },
    {
      year: "2022",
      title: "Melhor Experiência do Usuário",
      organization: "UX Design Awards",
      description: "Reconhecimento pelo design centrado no usuário"
    }
  ];

  return (
    <div className="min-h-screen">
      <SEO 
        title="Imprensa - Onfoods"
        description="Área de imprensa da Onfoods. Press releases, kit de mídia, informações corporativas e contatos para jornalistas."
      />

      {/* Hero Section */}
      <section className="bg-gradient-primary text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-6 bg-white/20 text-white border-white/30">
            Área de Imprensa
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 drop-shadow-lg">
            Sala de
            <br />
            <span className="text-white/90">Imprensa</span>
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
            Informações corporativas, press releases e recursos para jornalistas e comunicadores.
          </p>
        </div>
      </section>

      {/* Press Contact */}
      <section className="py-16 bg-gradient-card">
        <div className="container mx-auto px-4">
          <Card className="max-w-4xl mx-auto shadow-card">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Contato para Imprensa</h2>
                <p className="text-muted-foreground">Para entrevistas, informações ou esclarecimentos</p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div className="text-center">
                  <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-bold mb-2">E-mail</h3>
                  <p className="text-muted-foreground mb-2">imprensa@onfoods.com.br</p>
                  <p className="text-sm text-muted-foreground">Resposta em até 2 horas</p>
                </div>
                
                <div className="text-center">
                  <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Phone className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-bold mb-2">Telefone</h3>
                  <p className="text-muted-foreground mb-2">(11) 9999-9999</p>
                  <p className="text-sm text-muted-foreground">Seg-Sex, 9h às 18h</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Company Facts */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-primary text-primary">
              Sobre a Empresa
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Onfoods em números
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Dados atualizados sobre nossa operação e crescimento no mercado brasileiro.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {companyFacts.map((fact, index) => (
              <Card key={index} className="text-center p-6 shadow-card hover:shadow-hover transition-all duration-300">
                <CardContent className="p-0">
                  <div className="text-2xl font-bold text-primary mb-2">{fact.value}</div>
                  <div className="text-sm text-muted-foreground">{fact.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Press Releases */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-primary text-primary">
              Press Releases
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Últimas notícias
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Acompanhe os principais anúncios e novidades da Onfoods.
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-6">
            {pressReleases.map((release, index) => (
              <Card key={index} className="shadow-card hover:shadow-hover transition-all duration-300 group">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant="outline">{release.category}</Badge>
                        <span className="text-sm text-muted-foreground">{release.date}</span>
                      </div>
                      <CardTitle className="group-hover:text-primary transition-colors mb-2">
                        {release.title}
                      </CardTitle>
                      <p className="text-muted-foreground leading-relaxed">{release.summary}</p>
                    </div>
                    <Button variant="outline" className="group/btn">
                      Ler Mais
                      <ExternalLink className="ml-2 h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Awards */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-primary text-primary">
              Reconhecimentos
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Prêmios e conquistas
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Principais premiações e reconhecimentos recebidos pela Onfoods.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {awards.map((award, index) => (
              <Card key={index} className="text-center p-6 shadow-card hover:shadow-hover transition-all duration-300 group hover:scale-105">
                <CardContent className="p-0">
                  <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                    <Award className="h-8 w-8 text-primary" />
                  </div>
                  <Badge variant="outline" className="mb-3">{award.year}</Badge>
                  <h3 className="font-bold text-lg mb-2">{award.title}</h3>
                  <p className="text-sm font-medium text-primary mb-2">{award.organization}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{award.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Media Kit */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-primary text-primary">
              Kit de Mídia
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Recursos para jornalistas
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Baixe logos, fotos e outros recursos oficiais da Onfoods.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {mediaKit.map((item, index) => (
              <Card key={index} className="shadow-card hover:shadow-hover transition-all duration-300 group">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-primary/10 p-2 rounded-lg group-hover:bg-primary/20 transition-colors">
                        <Camera className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{item.type}</CardTitle>
                        <p className="text-sm text-muted-foreground">{item.format} • {item.size}</p>
                      </div>
                    </div>
                    <Button size="sm" className="group/btn">
                      <Download className="h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}