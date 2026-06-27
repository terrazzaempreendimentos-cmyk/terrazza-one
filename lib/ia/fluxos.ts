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
      return `Ola, tudo bem? Sou a IA Comercial da Terrazza. Vi que seu contato veio por ${origemTexto}. Vou te ajudar a entender como podemos administrar ou captar seu imovel para locacao com seguranca, posicionamento correto e acompanhamento profissional.`;
    case "inquilino":
      return "Ola, tudo bem? Sou a IA Comercial da Terrazza. Vou te ajudar a organizar sua busca por imovel para locacao e entender o que faz sentido para o seu momento.";
    case "comprador":
      return "Ola, tudo bem? Sou a IA Comercial da Terrazza. Vou entender seu objetivo de compra para orientar os proximos passos com clareza, seguranca e foco nas melhores oportunidades.";
    case "vendedor":
      return "Ola, tudo bem? Sou a IA Comercial da Terrazza. Vou entender o imovel que voce deseja vender, sua expectativa e o melhor caminho comercial para uma avaliacao inicial.";
    case "corretor_parceiro":
      return "Ola, tudo bem? Sou a IA Comercial da Terrazza. Vou entender se voce possui algum imovel ou cliente para indicacao, parceria, administracao ou locacao.";
    default:
      return "Ola, tudo bem? Sou a IA Comercial da Terrazza. Vou te ajudar a organizar as informacoes para encaminhar o atendimento da melhor forma.";
  }
}

export function gerarPerguntasQualificacao(tipoLead: TipoLeadSimulador) {
  switch (tipoLead) {
    case "proprietario":
      return [
        "O imovel fica em qual cidade e bairro?",
        "Ele esta vazio, ocupado ou ainda em preparacao?",
        "Voce pretende apenas alugar ou tambem deseja administracao completa?",
        "Qual valor de aluguel voce imagina para esse imovel?",
        "O imovel possui condominio, IPTU ou alguma taxa relevante?",
        "Voce ja tem fotos, documentacao e chaves disponiveis para avaliacao?",
      ];
    case "inquilino":
      return [
        "Qual cidade voce procura?",
        "Tem algum bairro de preferencia?",
        "Qual faixa de aluguel seria confortavel?",
        "Quantos quartos voce precisa?",
        "Voce possui pet?",
        "Qual o prazo ideal para mudanca?",
      ];
    case "comprador":
      return [
        "Qual cidade voce deseja comprar?",
        "Tem bairros de preferencia?",
        "Qual valor aproximado pretende investir?",
        "A compra seria com financiamento?",
        "Voce pretende usar FGTS?",
        "Qual sua urgencia para comprar?",
      ];
    case "vendedor":
      return [
        "O imovel que deseja vender fica em qual cidade e bairro?",
        "Qual tipo de imovel e?",
        "Qual valor voce imagina para venda?",
        "O imovel esta ocupado ou disponivel?",
        "Voce ja possui documentacao atualizada?",
        "Qual o prazo desejado para venda?",
      ];
    case "corretor_parceiro":
      return [
        "Voce possui imovel para indicar para administracao ou locacao?",
        "O imovel fica em qual cidade e bairro?",
        "O proprietario ja autorizou o contato?",
        "Qual e o perfil do imovel?",
        "Existe alguma condicao comercial combinada?",
      ];
    default:
      return [
        "Qual e seu principal objetivo?",
        "Em qual cidade deseja atendimento?",
        "Qual prazo voce tem em mente?",
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
      return "Agendar avaliacao comercial do imovel e solicitar dados basicos para pre-cadastro.";
    case "inquilino":
      return "Enviar opcoes compativeis quando houver estoque aderente e criar tarefa de follow-up.";
    case "comprador":
      return "Validar faixa de investimento, forma de pagamento e disponibilidade para atendimento consultivo.";
    case "vendedor":
      return "Coletar dados do imovel e encaminhar para avaliacao de preco e estrategia comercial.";
    case "corretor_parceiro":
      return "Entender a indicacao, validar autorizacao e direcionar para responsavel por parcerias.";
    default:
      return "Encaminhar para triagem comercial.";
  }
}

export function sugestaoPassagemCorretor(tipoLead: TipoLeadSimulador) {
  switch (tipoLead) {
    case "proprietario":
      return "Passar para corretor com foco em captacao e administracao de imoveis.";
    case "inquilino":
      return "Passar para corretor de locacao com briefing de cidade, bairro, valor e urgencia.";
    case "comprador":
      return "Passar para corretor de vendas com briefing financeiro e regiao desejada.";
    case "vendedor":
      return "Passar para corretor de vendas/captacao para avaliacao do imovel.";
    case "corretor_parceiro":
      return "Passar para responsavel por relacionamento com parceiros.";
    default:
      return "Passar para equipe comercial da Terrazza.";
  }
}
