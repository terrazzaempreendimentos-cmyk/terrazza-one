export type CategoriaObjecao =
  | "preco"
  | "condominio"
  | "documentacao"
  | "indecisao"
  | "comparacao"
  | "prazo"
  | "fiador"
  | "garantia"
  | "localizacao"
  | "visita"
  | "proprietario"
  | "financiamento";

export type RiscoComercial = "baixo" | "medio" | "alto";

export type ObjecaoComercial = {
  categoria: CategoriaObjecao;
  sinais: string[];
  leituraComercial: string;
  risco: RiscoComercial;
  respostaSugerida: string;
  proximaPergunta: string;
};

export const objecoesComerciais: ObjecaoComercial[] = [
  {
    categoria: "preco",
    sinais: ["achei caro", "esta caro", "muito caro", "preco alto", "valor alto"],
    leituraComercial:
      "O lead percebe desalinhamento entre valor e beneficio. Precisa de comparativo, contexto e reforco de valor.",
    risco: "medio",
    respostaSugerida:
      "Entendo sua percepcao. Antes de descartarmos, vale comparar o valor com localizacao, estado do imovel e condicoes. As vezes o ponto decisivo nao e apenas preco, mas custo-beneficio.",
    proximaPergunta:
      "Qual faixa de valor ficaria confortavel para voce considerar sem sair da regiao desejada?",
  },
  {
    categoria: "condominio",
    sinais: ["condominio alto", "condominio caro", "taxa alta", "muito condominio"],
    leituraComercial:
      "A taxa de condominio virou barreira de custo mensal. E importante separar aluguel, taxas e beneficios do condominio.",
    risco: "medio",
    respostaSugerida:
      "Faz sentido olhar isso com cuidado. O ideal e avaliar o custo total mensal e o que o condominio entrega em estrutura, seguranca e praticidade.",
    proximaPergunta:
      "Qual seria o custo total mensal maximo que voce gostaria de manter?",
  },
  {
    categoria: "indecisao",
    sinais: [
      "vou pensar",
      "preciso pensar",
      "estou so pesquisando",
      "so pesquisando",
      "preciso falar com minha esposa",
      "preciso falar com meu marido",
      "vou conversar",
    ],
    leituraComercial:
      "O lead ainda nao demonstrou decisao plena. Pode precisar de seguranca, comparacao ou envolvimento de outro decisor.",
    risco: "medio",
    respostaSugerida:
      "Claro, e uma decisao importante. Posso te ajudar a organizar os criterios para voce comparar com mais seguranca, sem pressa e sem pressao.",
    proximaPergunta:
      "O que mais pesa na sua decisao hoje: valor, localizacao, prazo ou seguranca?",
  },
  {
    categoria: "comparacao",
    sinais: ["quero ver outros imoveis", "vi outro", "tem outras opcoes", "comparar"],
    leituraComercial:
      "O lead esta em fase comparativa. Precisa de curadoria e criterios objetivos para nao dispersar.",
    risco: "baixo",
    respostaSugerida:
      "Perfeito. Comparar e saudavel quando temos criterios claros. Posso te ajudar a separar opcoes realmente equivalentes.",
    proximaPergunta:
      "Quais pontos voce quer comparar: bairro, valor, tamanho, condominio ou estado do imovel?",
  },
  {
    categoria: "fiador",
    sinais: ["nao tenho fiador", "sem fiador", "fiador e problema"],
    leituraComercial:
      "Existe barreira de garantia locaticia. O atendimento deve orientar alternativas sem prometer aprovacao.",
    risco: "alto",
    respostaSugerida:
      "Entendo. A falta de fiador nao encerra necessariamente as possibilidades, mas precisamos avaliar quais garantias podem se encaixar no seu perfil.",
    proximaPergunta:
      "Voce teria interesse em avaliar outras garantias, como seguro fianca, caução ou titulo de capitalizacao?",
  },
  {
    categoria: "garantia",
    sinais: ["seguro fianca", "caucao", "garantia", "titulo de capitalizacao"],
    leituraComercial:
      "O lead esta sensivel as condicoes de garantia. Precisa entender opcoes e custo total.",
    risco: "medio",
    respostaSugerida:
      "Garantia e uma parte importante da locacao. O melhor caminho e avaliar a opcao mais viavel para seu perfil e para as regras do proprietario.",
    proximaPergunta:
      "Qual garantia voce considera mais viavel hoje?",
  },
  {
    categoria: "proprietario",
    sinais: ["proprietario pede muito", "dono pede muito", "proprietario nao negocia"],
    leituraComercial:
      "Ha percepcao de desalinhamento com expectativa do proprietario. Pode exigir negociacao assistida.",
    risco: "medio",
    respostaSugerida:
      "Entendo. Quando a expectativa do proprietario parece alta, o melhor e trabalhar com dados e uma proposta bem posicionada.",
    proximaPergunta:
      "Qual valor ou condicao faria sentido para voce apresentar em uma proposta?",
  },
  {
    categoria: "financiamento",
    sinais: [
      "nao sei se aprova financiamento",
      "nao sei se aprova",
      "financiamento",
      "credito",
      "score baixo",
    ],
    leituraComercial:
      "Existe incerteza financeira. Precisa de encaminhamento consultivo e possivel corretor humano.",
    risco: "alto",
    respostaSugerida:
      "Esse ponto merece cuidado. Sem prometer aprovacao, o ideal e organizar renda, entrada, credito e documentacao para entender viabilidade.",
    proximaPergunta:
      "Voce ja fez alguma simulacao ou analise de credito recentemente?",
  },
  {
    categoria: "localizacao",
    sinais: ["longe", "localizacao ruim", "bairro nao gosto", "fora de mao"],
    leituraComercial:
      "A localizacao pode ser impeditivo real. Melhor calibrar regioes alternativas antes de insistir.",
    risco: "medio",
    respostaSugerida:
      "Localizacao e um criterio central. Se essa regiao nao encaixa, vale ajustarmos para bairros com rotina mais aderente.",
    proximaPergunta:
      "Quais bairros voce considera ideais ou aceitaveis?",
  },
  {
    categoria: "visita",
    sinais: ["quero visitar", "posso visitar", "ver o imovel", "agendar visita"],
    leituraComercial:
      "Sinal de alta intencao. Deve acelerar passagem para corretor ou agenda.",
    risco: "baixo",
    respostaSugerida:
      "Excelente. Visita e um passo importante para validar se o imovel realmente encaixa na sua rotina.",
    proximaPergunta:
      "Qual melhor dia e periodo para voce visitar?",
  },
  {
    categoria: "documentacao",
    sinais: ["documentacao", "documentos", "cpf", "comprovante", "renda"],
    leituraComercial:
      "O lead esta entrando em etapa operacional. Precisa de clareza sem parecer burocratico.",
    risco: "medio",
    respostaSugerida:
      "A documentacao ajuda a deixar o processo mais seguro e previsivel. Podemos organizar isso por etapas.",
    proximaPergunta:
      "Voce ja tem comprovante de renda e documentos pessoais atualizados?",
  },
  {
    categoria: "prazo",
    sinais: ["tenho pressa", "prazo curto", "preciso rapido", "urgente", "quanto antes"],
    leituraComercial:
      "Prazo curto aumenta intencao, mas exige foco e reducao de alternativas.",
    risco: "baixo",
    respostaSugerida:
      "Entendi. Com prazo curto, o melhor e focar nas opcoes mais aderentes e evitar perda de tempo com imoveis fora do perfil.",
    proximaPergunta:
      "Qual e a data limite ideal para resolver isso?",
  },
];

export function detectarObjecaoComercial(mensagemUsuario: string) {
  const texto = mensagemUsuario
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return (
    objecoesComerciais.find((objecao) =>
      objecao.sinais.some((sinal) =>
        texto.includes(
          sinal
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, ""),
        ),
      ),
    ) ?? null
  );
}
