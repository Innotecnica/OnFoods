import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  FileText,
  User,
  Eye,
  Download,
  Trash2,
  Edit,
  Lock,
  Mail,
  CheckCircle,
  Calendar,
  Send
} from "lucide-react";

export default function LGPD() {
  const lastUpdate = "01 Janeiro 2024";

  const dataRights = [
    {
      icon: Eye,
      title: "Direito de Acesso",
      description: "Confirmar a existência de tratamento de dados pessoais",
      action: "Solicitar informações sobre quais dados temos sobre você"
    },
    {
      icon: Edit,
      title: "Direito de Correção",
      description: "Correção de dados incompletos, inexatos ou desatualizados",
      action: "Solicitar correção de informações incorretas"
    },
    {
      icon: Trash2,
      title: "Direito de Exclusão",
      description: "Eliminação de dados desnecessários ou tratados irregularmente",
      action: "Solicitar remoção de dados pessoais"
    },
    {
      icon: Download,
      title: "Direito de Portabilidade",
      description: "Portabilidade de dados para outro fornecedor",
      action: "Solicitar transferência de dados"
    },
    {
      icon: Lock,
      title: "Direito de Oposição",
      description: "Oposição ao tratamento em determinadas circunstâncias",
      action: "Contestar o uso de dados pessoais"
    },
    {
      icon: FileText,
      title: "Direito de Informação",
      description: "Informações sobre uso compartilhamento de dados",
      action: "Solicitar detalhes sobre tratamento"
    }
  ];

  const requestTypes = [
    { value: "access", label: "Solicitar Acesso aos Dados" },
    { value: "correction", label: "Correção de Dados" },
    { value: "deletion", label: "Exclusão de Dados" },
    { value: "portability", label: "Portabilidade de Dados" },
    { value: "opposition", label: "Oposição ao Tratamento" },
    { value: "information", label: "Informações sobre Tratamento" },
    { value: "complaint", label: "Reclamação LGPD" },
    { value: "other", label: "Outro" }
  ];

  const legalBases = [
    {
      base: "Consentimento",
      description: "Quando você nos autoriza expressamente a usar seus dados",
      examples: ["Newsletter", "Marketing personalizado", "Cookies não essenciais"]
    },
    {
      base: "Execução de Contrato",
      description: "Para cumprir obrigações contratuais dos nossos serviços",
      examples: ["Processamento de pedidos", "Entrega de produtos", "Atendimento ao cliente"]
    },
    {
      base: "Interesse Legítimo",
      description: "Para fins legítimos que não violem seus direitos fundamentais",
      examples: ["Segurança da plataforma", "Prevenção de fraudes", "Melhorias no serviço"]
    },
    {
      base: "Obrigação Legal",
      description: "Para cumprimento de obrigações legais e regulamentares",
      examples: ["Emissão de notas fiscais", "Relatórios fiscais", "Registros contábeis"]
    }
  ];

  return (
    <div className="min-h-screen">
      <SEO 
        title="LGPD - Lei Geral de Proteção de Dados | Onfoods"
        description="Conheça nossos procedimentos LGPD, exercite seus direitos sobre dados pessoais e saiba como protegemos sua privacidade na Onfoods."
      />

      {/* Hero Section */}
      <section className="bg-gradient-primary text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-6 bg-white/20 text-white border-white/30">
            Lei Geral de Proteção de Dados
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 drop-shadow-lg">
            LGPD
            <br />
            <span className="text-white/90">na Onfoods</span>
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
            Conheça seus direitos sobre dados pessoais e como exercê-los. 
            Transparência e controle sobre suas informações.
          </p>
        </div>
      </section>

      {/* Last Update */}
      <section className="py-8 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Última atualização: {lastUpdate}</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Em conformidade</span>
            </div>
          </div>
        </div>
      </section>

      {/* LGPD Overview */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <Card className="max-w-4xl mx-auto border-green-200 bg-green-50">
            <CardContent className="p-8">
              <div className="flex items-start space-x-4">
                <Shield className="h-8 w-8 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-green-900 mb-3 text-xl">Nossa Conformidade com a LGPD</h3>
                  <p className="text-green-800 leading-relaxed mb-4">
                    A Onfoods está em total conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018). 
                    Implementamos processos, controles e medidas técnicas para garantir a proteção dos seus dados pessoais.
                  </p>
                  <p className="text-green-800 leading-relaxed">
                    Você tem direitos específicos sobre seus dados pessoais, e nós facilitamos o exercício desses direitos 
                    através de canais diretos e processos transparentes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Data Rights */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-primary text-primary">
              Seus Direitos
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Direitos do titular de dados
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A LGPD garante direitos específicos sobre seus dados pessoais. Conheça-os e saiba como exercê-los.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {dataRights.map((right, index) => (
              <Card key={index} className="shadow-card hover:shadow-hover transition-all duration-300 group hover:scale-105">
                <CardHeader>
                  <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                    <right.icon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-center text-lg">{right.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center mb-4 leading-relaxed">
                    {right.description}
                  </p>
                  <p className="text-sm text-center font-medium text-primary">
                    {right.action}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Exercise Rights Form */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-primary text-primary">
              Exercer Direitos
            </Badge>
            <h2 className="text-3xl font-bold mb-4">
              Solicite o exercício dos seus direitos
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Use o formulário abaixo para exercer qualquer dos seus direitos previstos na LGPD. 
              Responderemos em até 15 dias úteis conforme a lei.
            </p>
          </div>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-primary" />
                <span>Solicitação LGPD</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Request Type */}
              <div>
                <label className="text-sm font-medium mb-2 block">Tipo de Solicitação *</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de solicitação" />
                  </SelectTrigger>
                  <SelectContent>
                    {requestTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Nome Completo *</label>
                  <Input placeholder="Seu nome completo" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">E-mail *</label>
                  <Input type="email" placeholder="seu@email.com" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">CPF *</label>
                  <Input placeholder="000.000.000-00" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Telefone</label>
                  <Input placeholder="(11) 99999-9999" />
                </div>
              </div>

              {/* Request Details */}
              <div>
                <label className="text-sm font-medium mb-2 block">Descrição da Solicitação *</label>
                <Textarea 
                  placeholder="Descreva detalhadamente sua solicitação, incluindo quais dados específicos você quer acessar, corrigir, excluir, etc."
                  rows={5}
                />
              </div>

              {/* Document Upload */}
              <div>
                <label className="text-sm font-medium mb-2 block">Documento de Identificação</label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Anexe uma cópia do seu documento de identidade para verificação
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Formatos aceitos: PDF, JPG, PNG (máx. 5MB)
                  </p>
                </div>
              </div>

              {/* Privacy Notice */}
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold text-blue-900 mb-1 text-sm">Proteção dos Dados</h4>
                      <p className="text-blue-800 text-xs leading-relaxed">
                        Todos os dados fornecidos neste formulário serão utilizados exclusivamente para 
                        processar sua solicitação LGPD e serão tratados com máxima segurança e confidencialidade.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Submit */}
              <div className="pt-4">
                <Button size="lg" className="w-full group">
                  Enviar Solicitação LGPD
                  <Send className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  * Campos obrigatórios. Responderemos em até 15 dias úteis conforme a LGPD.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Legal Bases */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-primary text-primary">
              Bases Legais
            </Badge>
            <h2 className="text-3xl font-bold mb-4">
              Como utilizamos seus dados
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Conheça as bases legais que utilizamos para o tratamento dos seus dados pessoais.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {legalBases.map((base, index) => (
              <Card key={index} className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Lock className="h-5 w-5 text-primary" />
                    <span>{base.base}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4 leading-relaxed">{base.description}</p>
                  
                  <div>
                    <strong className="text-foreground text-sm">Exemplos de uso:</strong>
                    <ul className="mt-2 space-y-1">
                      {base.examples.map((example, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-center space-x-2">
                          <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                          <span>{example}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* DPO Contact */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <Card className="max-w-2xl mx-auto shadow-card">
            <CardContent className="p-8">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <User className="h-6 w-6 text-primary" />
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Encarregado de Proteção de Dados (DPO)</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Nosso DPO é responsável por garantir a conformidade com a LGPD e atender suas solicitações 
                relacionadas ao tratamento de dados pessoais.
              </p>
              <div className="space-y-2 text-sm text-muted-foreground mb-6">
                <p><strong>E-mail:</strong> dpo@onfoods.com.br</p>
                <p><strong>Telefone:</strong> (11) 9999-9999</p>
                <p><strong>Horário:</strong> Segunda a Sexta, 9h às 18h</p>
              </div>
              <Button asChild>
                <a href="mailto:dpo@onfoods.com.br">
                  Contatar DPO
                  <Mail className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}