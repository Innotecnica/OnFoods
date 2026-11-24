import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  Lock, 
  Eye, 
  UserCheck,
  Calendar,
  CheckCircle,
  AlertCircle,
  Database
} from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Privacy() {
  const { t } = useTranslation();
  const lastUpdate = "01 Janeiro 2024";

  const dataTypes = [
    {
      category: t('common:privacy_dt_identification_category'),
      items: [
        t('common:privacy_dt_identification_item_name'),
        t('common:privacy_dt_identification_item_email'),
        t('common:privacy_dt_identification_item_phone'),
        t('common:privacy_dt_identification_item_cpf'),
        t('common:privacy_dt_identification_item_birthdate'),
      ]
    },
    {
      category: t('common:privacy_dt_location_category'),
      items: [
        t('common:privacy_dt_location_item_addresses'),
        t('common:privacy_dt_location_item_geolocation'),
        t('common:privacy_dt_location_item_history'),
      ]
    },
    {
      category: t('common:privacy_dt_payment_category'),
      items: [
        t('common:privacy_dt_payment_item_tokenized_card'),
        t('common:privacy_dt_payment_item_transactions'),
        t('common:privacy_dt_payment_item_preferred'),
      ]
    },
    {
      category: t('common:privacy_dt_usage_category'),
      items: [
        t('common:privacy_dt_usage_item_orders'),
        t('common:privacy_dt_usage_item_preferences'),
        t('common:privacy_dt_usage_item_reviews'),
        t('common:privacy_dt_usage_item_browsing'),
      ]
    }
  ];

  const rights = [
    {
      icon: Eye,
      title: t('common:privacy_rights_access_title'),
      description: t('common:privacy_rights_access_desc')
    },
    {
      icon: UserCheck,
      title: t('common:privacy_rights_correction_title'),
      description: t('common:privacy_rights_correction_desc')
    },
    {
      icon: Lock,
      title: t('common:privacy_rights_deletion_title'),
      description: t('common:privacy_rights_deletion_desc')
    },
    {
      icon: Database,
      title: t('common:privacy_rights_portability_title'),
      description: t('common:privacy_rights_portability_desc')
    }
  ];

  const sections = [
    {
      id: "introduction",
      title: t('common:privacy_section_introduction_title'),
      content: [
        t('common:privacy_section_introduction_p1'),
        t('common:privacy_section_introduction_p2'),
        t('common:privacy_section_introduction_p3'),
        t('common:privacy_section_introduction_p4'),
      ]
    },
    {
      id: "controller",
      title: t('common:privacy_section_controller_title'),
      content: [
        t('common:privacy_section_controller_p1'),
        t('common:privacy_section_controller_p2'),
        t('common:privacy_section_controller_p3'),
        t('common:privacy_section_controller_p4'),
      ]
    },
    {
      id: "collection",
      title: t('common:privacy_section_collection_title'),
      content: [
        t('common:privacy_section_collection_p1'),
        t('common:privacy_section_collection_p2'),
        t('common:privacy_section_collection_p3'),
        t('common:privacy_section_collection_p4'),
      ]
    },
    {
      id: "purposes",
      title: t('common:privacy_section_purposes_title'),
      content: [
        t('common:privacy_section_purposes_p1'),
        t('common:privacy_section_purposes_p2'),
        t('common:privacy_section_purposes_p3'),
        t('common:privacy_section_purposes_p4'),
        t('common:privacy_section_purposes_p5'),
        t('common:privacy_section_purposes_p6'),
      ]
    },
    {
      id: "legal-basis",
      title: t('common:privacy_section_legal_basis_title'),
      content: [
        t('common:privacy_section_legal_basis_p1'),
        t('common:privacy_section_legal_basis_p2'),
        t('common:privacy_section_legal_basis_p3'),
        t('common:privacy_section_legal_basis_p4'),
      ]
    },
    {
      id: "sharing",
      title: t('common:privacy_section_sharing_title'),
      content: [
        t('common:privacy_section_sharing_p1'),
        t('common:privacy_section_sharing_p2'),
        t('common:privacy_section_sharing_p3'),
        t('common:privacy_section_sharing_p4'),
        t('common:privacy_section_sharing_p5'),
      ]
    },
    {
      id: "security",
      title: t('common:privacy_section_security_title'),
      content: [
        t('common:privacy_section_security_p1'),
        t('common:privacy_section_security_p2'),
        t('common:privacy_section_security_p3'),
        t('common:privacy_section_security_p4'),
        t('common:privacy_section_security_p5'),
      ]
    },
    {
      id: "retention",
      title: t('common:privacy_section_retention_title'),
      content: [
        t('common:privacy_section_retention_p1'),
        t('common:privacy_section_retention_p2'),
        t('common:privacy_section_retention_p3'),
        t('common:privacy_section_retention_p4'),
        t('common:privacy_section_retention_p5'),
      ]
    },
    {
      id: "cookies",
      title: t('common:privacy_section_cookies_title'),
      content: [
        t('common:privacy_section_cookies_p1'),
        t('common:privacy_section_cookies_p2'),
        t('common:privacy_section_cookies_p3'),
        t('common:privacy_section_cookies_p4'),
        t('common:privacy_section_cookies_p5'),
      ]
    },
    {
      id: "international",
      title: t('common:privacy_section_international_title'),
      content: [
        t('common:privacy_section_international_p1'),
        t('common:privacy_section_international_p2'),
        t('common:privacy_section_international_p3'),
        t('common:privacy_section_international_p4'),
      ]
    },
    {
      id: "minors",
      title: t('common:privacy_section_minors_title'),
      content: [
        t('common:privacy_section_minors_p1'),
        t('common:privacy_section_minors_p2'),
        t('common:privacy_section_minors_p3'),
        t('common:privacy_section_minors_p4'),
      ]
    },
    {
      id: "changes",
      title: t('common:privacy_section_changes_title'),
      content: [
        t('common:privacy_section_changes_p1'),
        t('common:privacy_section_changes_p2'),
        t('common:privacy_section_changes_p3'),
        t('common:privacy_section_changes_p4'),
      ]
    }
  ];

  return (
    <div className="min-h-screen">
      <SEO 
        title={t('common:seo_privacy_title')}
        description={t('common:seo_privacy_desc')}
      />

      {/* Hero Section */}
      <section className="bg-gradient-primary text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-6 bg-white/20 text-white border-white/30">
            {t('common:privacy_hero_badge')}
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 drop-shadow-lg">
            {t('common:privacy_hero_title')}
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
            {t('common:privacy_hero_subtitle')}
          </p>
        </div>
      </section>

      {/* Last Update */}
      <section className="py-8 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>{t('common:last_update_label')} {lastUpdate}</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>{t('common:lgpd_compliance_label')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* LGPD Compliance */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <Card className="max-w-4xl mx-auto border-green-200 bg-green-50">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <Shield className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-green-900 mb-2">{t('common:lgpd_card_title')}</h3>
                  <p className="text-green-800 leading-relaxed">
                    {t('common:lgpd_card_text')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Data Types */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-primary text-primary">
              {t('common:data_collected_badge')}
            </Badge>
            <h2 className="text-3xl font-bold mb-4">{t('common:data_collected_title')}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('common:data_collected_subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {dataTypes.map((type, index) => (
              <Card key={index} className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Database className="h-5 w-5 text-primary" />
                    <span>{type.category}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {type.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-center space-x-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Rights */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-primary text-primary">
              {t('common:rights_badge')}
            </Badge>
            <h2 className="text-3xl font-bold mb-4">{t('common:rights_title')}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('common:rights_subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {rights.map((right, index) => (
              <Card key={index} className="text-center p-6 shadow-card hover:shadow-hover transition-all duration-300 group hover:scale-105">
                <CardContent className="p-0">
                  <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                    <right.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg mb-3">{right.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{right.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Policy Content */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {sections.map((section, index) => (
              <Card key={section.id} className="mb-8 shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <span>{section.title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {section.content.map((paragraph, pIndex) => (
                      <p key={pIndex} className="text-muted-foreground leading-relaxed">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact DPO */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <Card className="max-w-2xl mx-auto text-center shadow-card">
            <CardContent className="p-8">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <Lock className="h-6 w-6 text-primary" />
                <UserCheck className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">{t('common:dpo_contact_title')}</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                {t('common:dpo_contact_text')}
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><strong>{t('common:dpo_email_label')}</strong> dpo@onfoods.com.br</p>
                <p><strong>{t('common:dpo_phone_label')}</strong> (11) 9999-9999</p>
                <p><strong>{t('common:dpo_subject_label')}</strong> "Exercício de Direitos LGPD"</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
