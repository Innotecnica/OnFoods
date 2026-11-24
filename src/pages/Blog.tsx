import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Calendar,
  User,
  ArrowRight,
  TrendingUp,
  Utensils,
  Smartphone,
  Users,
  Clock
} from "lucide-react";

export default function Blog() {
  const categories = [
    { name: "Gastronomia", count: 15, icon: Utensils },
    { name: "Tecnologia", count: 12, icon: Smartphone },
    { name: "Mercado", count: 8, icon: TrendingUp },
    { name: "Comunidade", count: 10, icon: Users }
  ];

  const featuredPost = {
    title: "O futuro do delivery: tendências para 2024",
    excerpt: "Descubra as principais inovações que vão transformar o mercado de delivery nos próximos anos, desde tecnologias de IA até sustentabilidade.",
    author: "Equipe Onfoods",
    date: "15 Jan 2024",
    readTime: "5 min",
    category: "Tecnologia",
    image: "/placeholder-blog-featured.jpg"
  };

  const recentPosts = [
    {
      title: "Como otimizar seu restaurante para delivery",
      excerpt: "Dicas práticas para estabelecimentos que querem aumentar suas vendas online e melhorar a experiência do cliente.",
      author: "Maria Silva",
      date: "12 Jan 2024", 
      readTime: "3 min",
      category: "Gastronomia",
      image: "/placeholder-blog-1.jpg"
    },
    {
      title: "A importância da fotografia de alimentos",
      excerpt: "Como fotos profissionais podem aumentar significativamente as vendas dos seus pratos no delivery.",
      author: "João Santos",
      date: "10 Jan 2024",
      readTime: "4 min", 
      category: "Marketing",
      image: "/placeholder-blog-2.jpg"
    },
    {
      title: "Sustentabilidade no delivery: práticas eco-friendly",
      excerpt: "Conheça iniciativas sustentáveis que beneficiam o meio ambiente e fortalecem sua marca.",
      author: "Ana Costa",
      date: "08 Jan 2024",
      readTime: "6 min",
      category: "Sustentabilidade", 
      image: "/placeholder-blog-3.jpg"
    },
    {
      title: "Tecnologias que revolucionam o atendimento",
      excerpt: "Chatbots, IA e automação: como a tecnologia melhora a experiência do cliente.",
      author: "Pedro Lima",
      date: "05 Jan 2024",
      readTime: "5 min",
      category: "Tecnologia",
      image: "/placeholder-blog-4.jpg"
    },
    {
      title: "Gestão de custos no delivery: guia completo",
      excerpt: "Estratégias para controlar custos operacionais e maximizar a margem de lucro no delivery.",
      author: "Carla Mendes",
      date: "03 Jan 2024", 
      readTime: "7 min",
      category: "Mercado",
      image: "/placeholder-blog-5.jpg"
    },
    {
      title: "Marketing digital para restaurantes",
      excerpt: "Como usar redes sociais e marketing online para atrair mais clientes para seu estabelecimento.",
      author: "Lucas Ferreira",
      date: "01 Jan 2024",
      readTime: "4 min",
      category: "Marketing",
      image: "/placeholder-blog-6.jpg"
    }
  ];

  return (
    <div className="min-h-screen">
      <SEO 
        title="Blog - Onfoods"
        description="Acompanhe as últimas novidades sobre gastronomia, tecnologia e mercado de delivery no blog da Onfoods. Conteúdo especializado para estabelecimentos e consumidores."
      />

      {/* Hero Section */}
      <section className="bg-gradient-primary text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-6 bg-white/20 text-white border-white/30">
            Blog Onfoods
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 drop-shadow-lg">
            Universo
            <br />
            <span className="text-white/90">Gastronômico</span>
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto leading-relaxed mb-8">
            Descubra tendências, dicas e insights sobre gastronomia, tecnologia e o mundo do delivery.
          </p>
          
          {/* Search Bar */}
          <div className="max-w-md mx-auto relative">
            <Input 
              placeholder="Buscar artigos..." 
              className="pl-12 pr-4 py-3 bg-white/20 border-white/30 text-white placeholder:text-white/70 focus:bg-white focus:text-foreground"
            />
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/70" />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-gradient-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Explore por categoria</h2>
            <p className="text-muted-foreground">Encontre conteúdo específico para suas necessidades</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {categories.map((category, index) => (
              <Card key={index} className="text-center p-4 shadow-card hover:shadow-hover transition-all duration-300 group cursor-pointer hover:scale-105">
                <CardContent className="p-0">
                  <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                    <category.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-bold mb-1 group-hover:text-primary transition-colors">{category.name}</h3>
                  <p className="text-sm text-muted-foreground">{category.count} artigos</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Post */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-primary text-primary">
              Destaque
            </Badge>
            <h2 className="text-3xl font-bold mb-2">Artigo em destaque</h2>
          </div>

          <Card className="max-w-4xl mx-auto shadow-card overflow-hidden group hover:shadow-hover transition-all duration-300">
            <div className="md:flex">
              <div className="md:w-1/2">
                <div className="h-64 md:h-full bg-gradient-to-br from-primary/20 to-primary-glow/20 flex items-center justify-center">
                  <div className="text-center">
                    <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <TrendingUp className="h-10 w-10 text-primary" />
                    </div>
                    <p className="text-muted-foreground">Imagem do artigo</p>
                  </div>
                </div>
              </div>
              <div className="md:w-1/2 p-8">
                <Badge variant="outline" className="mb-4">{featuredPost.category}</Badge>
                <h3 className="text-2xl font-bold mb-4 group-hover:text-primary transition-colors">
                  {featuredPost.title}
                </h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {featuredPost.excerpt}
                </p>
                <div className="flex items-center text-sm text-muted-foreground mb-6 space-x-4">
                  <div className="flex items-center space-x-1">
                    <User className="h-4 w-4" />
                    <span>{featuredPost.author}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>{featuredPost.date}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{featuredPost.readTime}</span>
                  </div>
                </div>
                <Button className="group/btn">
                  Ler Artigo
                  <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Recent Posts */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-primary text-primary">
              Artigos Recentes
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Últimas publicações
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Mantenha-se atualizado com os conteúdos mais recentes do nosso blog.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {recentPosts.map((post, index) => (
              <Card key={index} className="shadow-card hover:shadow-hover transition-all duration-300 group overflow-hidden hover:scale-105">
                <div className="h-48 bg-gradient-to-br from-primary/10 to-primary-glow/10 flex items-center justify-center">
                  <div className="text-center">
                    <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Utensils className="h-8 w-8 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">Imagem do artigo</p>
                  </div>
                </div>
                <CardHeader>
                  <Badge variant="outline" className="w-fit mb-2">{post.category}</Badge>
                  <CardTitle className="group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4 leading-relaxed line-clamp-3">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center text-xs text-muted-foreground mb-4 space-x-3">
                    <div className="flex items-center space-x-1">
                      <User className="h-3 w-3" />
                      <span>{post.author}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{post.date}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{post.readTime}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full group/btn">
                    Ler Mais
                    <ArrowRight className="ml-2 h-3 w-3 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <Card className="max-w-2xl mx-auto bg-gradient-primary text-white shadow-card">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-4">Receba nossos artigos</h3>
              <p className="text-white/90 mb-6 leading-relaxed">
                Assine nossa newsletter e receba os melhores conteúdos sobre gastronomia 
                e delivery diretamente no seu e-mail.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <Input 
                  placeholder="Seu e-mail" 
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/70"
                />
                <Button variant="secondary">
                  Assinar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}