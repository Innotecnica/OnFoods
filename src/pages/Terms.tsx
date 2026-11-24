import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Scale, 
  Shield, 
  AlertCircle,
  Calendar,
  CheckCircle
} from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Terms() {
  const { t } = useTranslation();
  const lastUpdate = "01 Janeiro 2024";

  const sections = [
    {
      id: "acceptance",
      title: "1. Aceitação dos Termos",
      content: [
        "Ao acessar e usar a plataforma Onfoods, você aceita e concorda em cumprir estes Termos de Uso.",
        "Se você não concordar com qualquer parte destes termos, não deve usar nossos serviços.",
        "Reservamo-nos o direito de modificar estes termos a qualquer momento, sendo as alterações comunicadas através da plataforma."
      ]
    },
    {
      id: "services",
      title: "2. Descrição dos Serviços",
      content: [
        "A Onfoods é uma plataforma digital que conecta usuários (clientes) a estabelecimentos comerciais (restaurantes, lanchonetes, etc.) para pedidos de comida online.",
        "Atuamos como intermediário na transação entre clientes e estabelecimentos parceiros.",
        "Não somos responsáveis pela qualidade, preparo ou características dos produtos oferecidos pelos estabelecimentos.",
        "Os estabelecimentos são responsáveis pelo cumprimento de todas as normas sanitárias e regulamentações aplicáveis."
      ]
    },
    {
      id: "registration",
      title: "3. Cadastro e Conta do Usuário",
      content: [
        "Para usar nossos serviços, você deve criar uma conta fornecendo informações verdadeiras, precisas e completas.",
        "Você é responsável por manter a confidencialidade de sua conta e senha.",
        "Você deve notificar-nos imediatamente sobre qualquer uso não autorizado de sua conta.",
        "Reservamo-nos o direito de suspender ou encerrar contas que violem estes termos."
      ]
    },
    {
      id: "orders",
      title: "4. Pedidos e Pagamentos",
      content: [
        "Todos os pedidos estão sujeitos à disponibilidade dos produtos e aceitação pelo estabelecimento.",
        "Os preços dos produtos são definidos pelos estabelecimentos parceiros e podem variar sem aviso prévio.",
        "O pagamento deve ser realizado através dos métodos disponíveis na plataforma.",
        "Taxas de entrega e serviço são claramente informadas antes da finalização do pedido.",
        "Cancelamentos só são possíveis antes do início do preparo do pedido pelo estabelecimento."
      ]
    },
    {
      id: "delivery",
      title: "5. Entrega",
      content: [
        "Os prazos de entrega são estimativas fornecidas pelos estabelecimentos e podem variar devido a fatores externos.",
        "A entrega é realizada no endereço fornecido pelo cliente no momento do pedido.",
        "É responsabilidade do cliente fornecer informações corretas e completas para entrega.",
        "Não nos responsabilizamos por atrasos causados por condições climáticas, trânsito ou outros fatores externos."
      ]
    },
    {
      id: "responsibilities",
      title: "6. Responsabilidades do Usuário",
      content: [
        "Usar a plataforma apenas para fins legais e de acordo com estes termos.",
        "Não transmitir conteúdo ofensivo, fraudulento ou que viole direitos de terceiros.",
        "Fornecer informações precisas e atualizadas em seu perfil e pedidos.",
        "Estar presente no endereço de entrega no horário estimado.",
        "Tratar entregadores e atendentes com respeito e cortesia."
      ]
    },
    {
      id: "prohibited",
      title: "7. Uso Proibido",
      content: [
        "Usar a plataforma para atividades ilegais ou não autorizadas.",
        "Tentar obter acesso não autorizado aos sistemas da plataforma.",
        "Reproduzir, distribuir ou modificar qualquer parte da plataforma sem autorização.",
        "Usar informações de outros usuários para fins comerciais ou promocionais.",
        "Criar múltiplas contas para contornar limitações ou restrições."
      ]
    },
    {
      id: "liability",
      title: "8. Limitação de Responsabilidade",
      content: [
        "A Onfoods atua como intermediário e não se responsabiliza pela qualidade dos produtos ou serviços dos estabelecimentos.",
        "Não garantimos que a plataforma estará disponível ininterruptamente ou livre de erros.",
        "Nossa responsabilidade é limitada ao valor do pedido em questão.",
        "Não nos responsabilizamos por danos indiretos, lucros cessantes ou danos morais."
      ]
    },
    {
      id: "data",
      title: "9. Proteção de Dados",
      content: [
        "O tratamento de dados pessoais segue nossa Política de Privacidade, em conformidade com a LGPD.",
        "Coletamos apenas dados necessários para prestação dos serviços.",
        "Seus dados não serão compartilhados com terceiros sem seu consentimento, exceto quando necessário para cumprimento do serviço.",
        "Você tem direito de acesso, correção e exclusão de seus dados pessoais."
      ]
    },
    {
      id: "termination",
      title: "10. Encerramento",
      content: [
        "Você pode encerrar sua conta a qualquer momento através das configurações da plataforma.",
        "Podemos suspender ou encerrar sua conta em caso de violação destes termos.",
        "O encerramento não afeta pedidos já realizados e suas respectivas obrigações.",
        "Dados pessoais serão tratados conforme nossa Política de Privacidade após o encerramento."
      ]
    },
    {
      id: "changes",
      title: "11. Alterações nos Termos",
      content: [
        "Podemos modificar estes termos a qualquer momento para refletir mudanças em nossos serviços ou na legislação.",
        "Alterações significativas serão comunicadas através da plataforma ou por e-mail.",
        "O uso continuado da plataforma após as alterações constitui aceitação dos novos termos.",
        "Recomendamos revisar periodicamente estes termos para se manter informado."
      ]
    },
    {
      id: "law",
      title: "12. Lei Aplicável e Foro",
      content: [
        "Estes termos são regidos pelas leis brasileiras.",
        "Qualquer disputa será submetida ao foro da comarca de São Paulo/SP.",
        "Tentaremos resolver disputas amigavelmente antes de qualquer procedimento legal.",
        "Em caso de conflito entre estes termos e a legislação aplicável, prevalecerá a lei."
      ]
    }
  ];

  return (
    <div className="min-h-screen">
      <SEO 
        title={t('common:seo_terms_title')}
        description={t('common:seo_terms_desc')}
      />

      {/* Hero Section */}
      <section className="bg-gradient-primary text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-6 bg-white/20 text-white border-white/30">
            {t('common:terms_hero_badge')}
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 drop-shadow-lg">
            {t('common:terms_hero_title')}
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
            {t('common:terms_hero_subtitle')}
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
              <span>{t('common:version_current_label')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Important Notice */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <Card className="max-w-4xl mx-auto border-orange-200 bg-orange-50">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <AlertCircle className="h-6 w-6 text-orange-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-orange-900 mb-2">{t('common:important_notice_title')}</h3>
                  <p className="text-orange-800 leading-relaxed">
                    {t('common:important_notice_text')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Terms Content */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {sections.map((section, index) => (
              <Card key={section.id} className="mb-8 shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <FileText className="h-5 w-5 text-primary" />
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

      {/* Contact Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <Card className="max-w-2xl mx-auto text-center shadow-card">
            <CardContent className="p-8">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <Scale className="h-6 w-6 text-primary" />
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Dúvidas sobre os Termos?</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Se você tiver alguma dúvida sobre estes Termos de Uso, 
                entre em contato com nossa equipe jurídica.
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><strong>E-mail:</strong> juridico@onfoods.com.br</p>
                <p><strong>Telefone:</strong> (11) 9999-9999</p>
                <p><strong>Endereço:</strong> São Paulo, SP - Brasil</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
