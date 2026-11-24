import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { 
  Target, 
  Users, 
  Heart, 
  Award,
  Rocket,
  Shield,
  Star,
  ArrowRight
} from "lucide-react";
import { useTranslation } from "react-i18next";

export default function About() {
  const { t } = useTranslation();
  const values = [
    {
      icon: Heart,
      title: t('common:about_values_passion_title'),
      description: t('common:about_values_passion_desc')
    },
    {
      icon: Users,
      title: t('common:about_values_community_title'),
      description: t('common:about_values_community_desc')
    },
    {
      icon: Shield,
      title: t('common:about_values_trust_title'),
      description: t('common:about_values_trust_desc')
    },
    {
      icon: Award,
      title: t('common:about_values_excellence_title'),
      description: t('common:about_values_excellence_desc')
    }
  ];

  const stats = [
    { number: "10.000+", label: t('common:about_stats_establishments_label') },
    { number: "500.000+", label: t('common:about_stats_orders_label') },
    { number: "50+", label: t('common:about_stats_cities_label') },
    { number: "4.8", label: t('common:about_stats_avg_rating_label'), icon: Star }
  ];

  return (
    <div className="min-h-screen">
      <SEO 
        title={t('common:seo_about_title')}
        description={t('common:seo_about_desc')}
      />

      {/* Hero Section */}
      <section className="bg-gradient-primary text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-6 bg-white/20 text-white border-white/30">
            {t('common:about_hero_badge')}
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 drop-shadow-lg">
            {t('common:about_hero_title')}
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
            {t('common:about_hero_subtitle')}
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-card">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <Card key={index} className="text-center p-6 shadow-card hover:shadow-hover transition-all duration-300">
                <CardContent className="p-0">
                  <div className="flex items-center justify-center mb-2">
                    <span className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                      {stat.number}
                    </span>
                    {stat.icon && <stat.icon className="h-6 w-6 text-yellow-500 ml-1 fill-current" />}
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Target className="h-6 w-6 text-primary" />
                <Badge variant="outline" className="border-primary text-primary">
                  {t('common:about_mission_badge')}
                </Badge>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                {t('common:about_mission_title')}
              </h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                {t('common:about_mission_p1')}
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {t('common:about_mission_p2')}
              </p>
            </div>
            <div className="relative">
              <div className="bg-gradient-primary rounded-2xl p-8 text-white shadow-card">
                <Rocket className="h-12 w-12 mb-4 text-white/90" />
                <h3 className="text-2xl font-bold mb-4">{t('common:about_vision_title')}</h3>
                <p className="text-white/90 leading-relaxed">
                  {t('common:about_vision_text')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-primary text-primary">
              {t('common:about_values_badge')}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('common:about_values_title')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('common:about_values_subtitle')}
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

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('common:about_cta_title')}
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t('common:about_cta_subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="group">
              <Link to="/establishments">
                {t('common:about_cta_discover_button')}
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/contact">
                {t('common:about_cta_contact_button')}
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
