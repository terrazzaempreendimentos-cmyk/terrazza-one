export type TipoLeadSimulador =
  | "proprietario"
  | "inquilino"
  | "comprador"
  | "vendedor"
  | "corretor_parceiro";

export type RespostasSimuladas = {
  tipoLead: TipoLeadSimulador;
  origem: string;
  cidade: string;
  canal: string;
};

export function gerarMensagemInicial(
  tipoLead: TipoLeadSimulador,
  origem: string,
) {
  const origemTexto = origem.replaceAll("_", " ");

  switch (tipoLead) {
    case "proprietario":
      return `Olá, tudo bem? Sou a IA Comercial da Terrazza. Vi que seu contato veio por ${origemTexto}. Vou te ajudar a entender como podemos administrar ou captar seu imóvel para locação com segurança, posicionamento correto e acompanhamento profissional.`;
    case "inquilino":
      return `Olá, tudo bem? Sou a IA Comercial da Terrazza. Vou te ajudar a organizar sua busca por imóvel para locação e entender o que faz sentido para o seu momento.`;
    case "comprador":
      return `Olá, tudo bem? Sou a IA Comercial da Terrazza. Vou entender seu objetivo de compra para orientar os próximos passos com clareza, segurança e foco nas melhores oportunidades.`;
    case "vendedor":
      return `Olá, tudo bem? Sou a IA Comercial da Terrazza. Vou entender o imóvel que você deseja vender, sua expectativa e o melhor caminho comercial para uma avaliação inicial.`;
    case "corretor_parceiro":
      return `Olá, tudo bem? Sou a IA Comercial da Terrazza. Vou entender se você possui algum imóvel ou cliente para indicação, parceria, administração ou locação.`;
    default:
      return "Olá, tudo bem? Sou a IA Comercial da Terrazza. Vou te ajudar a organizar as informações para encaminhar o atendimento da melhor forma.";
  }
}

export function gerarPerguntasQualificacao(tipoLead: TipoLeadSimulador) {
  switch (tipoLead) {
    case "proprietario":
      return [
        "O imóvel fica em qual cidade e bairro?",
        "Ele está vazio, ocupado ou ainda em preparação?",
        "Você pretende apenas alugar ou também deseja administração completa?",
        "Qual valor de aluguel você imagina para esse imóvel?",
        "O imóvel possui condomínio, IPTU ou alguma taxa relevante?",
        "Você já tem fotos, documentação e chaves disponíveis para avaliação?",
      ];
    case "inquilino":
      return [
        "Qual cidade você procura?",
        "Tem algum bairro de preferência?",
        "Qual faixa de aluguel seria confortável?",
        "Quantos quartos você precisa?",
        "Você possui pet?",
        "Qual o prazo ideal para mudança?",
      ];
    case "comprador":
      return [
        "Qual cidade você deseja comprar?",
        "Tem bairros de preferência?",
        "Qual valor aproximado pretende investir?",
        "A compra seria com financiamento?",
        "Você pretende usar FGTS?",
        "Qual sua urgência para comprar?",
      ];
    case "vendedor":
      return [
        "O imóvel que deseja vender fica em qual cidade e bairro?",
        "Qual tipo de imóvel é?",
        "Qual valor você imagina para venda?",
        "O imóvel está ocupado ou disponível?",
        "Você já possui documentação atualizada?",
        "Qual o prazo desejado para venda?",
      ];
    case "corretor_parceiro":
      return [
        "Você possui imóvel para indicar para administração ou locação?",
        "O imóvel fica em qual cidade e bairro?",
        "O proprietário já autorizou o contato?",
        "Qual é o perfil do imóvel?",
        "Existe alguma condição comercial combinada?",
      ];
    default:
      return [
        "Qual é seu principal objetivo?",
        "Em qual cidade deseja atendimento?",
        "Qual prazo você tem em mente?",
      ];
  }
}

export function calcularScoreSimulado(respostas: RespostasSimuladas) {
  let score = 35;

  if (respostas.cidade.trim()) score += 15;
  if (respostas.canal === "whatsapp") score += 10;
  if (respostas.origem === "qr_code_placa") score += 15;

  if (respostas.tipoLead === "proprietario") score += 15;
  if (respostas.tipoLead === "inquilino") score += 10;
  if (respostas.tipoLead === "comprador") score += 8;
  if (respostas.tipoLead === "corretor_parceiro") score += 6;

  return Math.min(score, 100);
}

export function temperaturaPorScore(score: number) {
  if (score >= 75) return "quente";
  if (score >= 50) return "morno";

  return "frio";
}

export function sugestaoProximaAcao(tipoLead: TipoLeadSimulador) {
  switch (tipoLead) {
    case "proprietario":
      return "Agendar avaliação comercial do imóvel e solicitar dados básicos para pré-cadastro.";
    case "inquilino":
      return "Enviar opções compatíveis quando houver estoque aderente e criar tarefa de follow-up.";
    case "comprador":
      return "Validar faixa de investimento, forma de pagamento e disponibilidade para atendimento consultivo.";
    case "vendedor":
      return "Coletar dados do imóvel e encaminhar para avaliação de preço e estratégia comercial.";
    case "corretor_parceiro":
      return "Entender a indicação, validar autorização e direcionar para responsável por parcerias.";
    default:
      return "Encaminhar para triagem comercial.";
  }
}

export function sugestaoPassagemCorretor(tipoLead: TipoLeadSimulador) {
  switch (tipoLead) {
    case "proprietario":
      return "Passar para corretor com foco em captação e administração de imóveis.";
    case "inquilino":
      return "Passar para corretor de locação com briefing de cidade, bairro, valor e urgência.";
    case "comprador":
      return "Passar para corretor de vendas com briefing financeiro e região desejada.";
    case "vendedor":
      return "Passar para corretor de vendas/captação para avaliação do imóvel.";
    case "corretor_parceiro":
      return "Passar para responsável por relacionamento com parceiros.";
    default:
      return "Passar para equipe comercial da Terrazza.";
  }
}
