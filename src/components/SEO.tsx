import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
}

export function SEO({ 
  title = "OnFoods - Conectando Você aos Melhores Sabores do Brasil",
  description = "Descubra os melhores restaurantes e estabelecimentos gastronômicos da sua região. OnFoods conecta você aos sabores únicos, oferecendo experiências culinárias excepcionais com facilidade e praticidade.",
  keywords = "delivery brasil, comida brasileira, restaurantes locais, pedidos online, gastronomia regional, food delivery, aplicativo comida, onfoods, culinária artesanal, pratos típicos",
  image = "https://onfoods.co/images/og-hero.jpg",
  url,
  type = "website"
}: SEOProps) {
  // Get current URL if not provided
  const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : 'https://onfoods.co');

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content="OnFoods" />
      <meta name="robots" content="index, follow" />
      <meta name="language" content="pt-BR" />
      <meta name="geo.region" content="BR" />
      <meta name="geo.country" content="Brazil" />
      
      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="OnFoods" />
      <meta property="og:locale" content="pt_BR" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@onfoods" />
      <meta name="twitter:creator" content="@onfoods" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      
      {/* Mobile & PWA */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
      <meta name="theme-color" content="#ff6b35" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="OnFoods" />
      
      {/* Performance & SEO */}
      <meta name="preconnect" content="https://fonts.googleapis.com" />
      <meta name="preconnect" content="https://images.unsplash.com" />
      <meta name="dns-prefetch" content="https://api.onfoods.co" />
      
      {/* Structured Data for Local Business */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "OnFoods",
          "url": currentUrl,
          "logo": "https://onfoods.co/logo.png",
          "description": description,
          "address": {
            "@type": "PostalAddress",
            "addressCountry": "BR"
          },
          "sameAs": [
            "https://instagram.com/onfoods",
            "https://facebook.com/onfoods"
          ]
        })}
      </script>
      
      {/* Canonical URL */}
      <link rel="canonical" href={currentUrl} />
      
      {/* Alternate languages */}
      <link rel="alternate" hrefLang="pt-br" href={currentUrl} />
      <link rel="alternate" hrefLang="x-default" href={currentUrl} />
    </Helmet>
  );
}