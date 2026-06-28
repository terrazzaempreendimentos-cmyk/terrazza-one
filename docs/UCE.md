# UCE — Unita Cognitive Engine

UCE e a fundacao cognitiva que passa a sustentar a IA Comercial da Terrazza sem depender, nesta fase, de OpenAI, WhatsApp, Vista ou qualquer API externa.

## Objetivo

Criar um motor modular capaz de interpretar respostas curtas, preservar contexto, corrigir informacoes, gerar hipoteses comerciais, calcular score e preparar briefing progressivo.

## Estrutura

- `lib/uce/core`: tipos centrais e `processUCE`.
- `lib/uce/interpreters`: interpretadores contextual e temporal.
- `lib/uce/flow`: decisao da proxima pergunta.
- `lib/uce/memory`: correcoes e preservacao de memoria.
- `lib/uce/inference`: regras de hipoteses comerciais.
- `lib/uce/score`: score e temperatura.
- `lib/uce/briefing`: briefing estruturado.
- `lib/uce/knowledge`: base proprietaria de conhecimento consultavel.
- `lib/uce/domain`: dominios suportados.
- `lib/uce/specialists`: arquitetura de especialistas comerciais.
- `lib/uce/personas` e `lib/uce/commercial`: fundacoes comerciais auxiliares.

## Fluxo

Mensagem do usuario  
↓  
Interpretador contextual  
↓  
Interpretador temporal  
↓  
Memoria e correcoes  
↓  
Fluxo inteligente  
↓  
Inferencias comerciais  
↓  
Score  
↓  
Briefing  
↓  
Adapter legado para o simulador

## Arquitetura de Especialistas

A UCE deixa de conduzir todos os atendimentos com um unico roteiro. A primeira
decisao do `processUCE` passa a ser o objetivo do cliente. Esse objetivo ativa
um especialista comercial com persona, roteiro, perguntas, inferencias,
fechamento, briefing e handoff proprios.

Fluxo novo:

Objetivo do cliente  
â†“  
Especialista  
â†“  
Fluxo proprio  
â†“  
Perguntas proprias  
â†“  
Inferencias proprias  
â†“  
Fechamento proprio  
â†“  
Briefing proprio  
â†“  
Handoff proprio

A estrutura fica em `lib/uce/specialists`:

- `comprador`: compra de imovel, sem perguntas de pet, administracao ou aluguel atual.
- `vendedor`: venda de imovel, sem perguntas de pet.
- `locacao`: busca de imovel para aluguel como inquilino.
- `administracao`: proprietario que deseja administracao patrimonial.
- `captacao`: caso especial para "anunciar"; pergunta primeiro se e venda ou locacao e redireciona para venda ou administracao.
- `common`: tipos e utilitarios compartilhados pelos especialistas.

Cada especialista possui `persona.ts`, `roteiro.ts`, `questions.ts`,
`closing.ts`, `handoff.ts` e `briefing.ts`.

O processador central agora seleciona o especialista antes de decidir a proxima
pergunta. Depois disso, carrega o roteiro, as perguntas, o briefing, o fechamento
e o handoff daquele especialista. As regras de exclusao impedem que perguntas de
um objetivo vazem para outro, por exemplo pet em compra/venda, FGTS para
proprietario, financiamento em locacao e valor de aluguel para comprador.

No simulador, o especialista ativo aparece de forma explicita para validar o
roteamento da conversa, como "Especialista Comprador", "Especialista Locacao",
"Especialista Administracao", "Especialista Venda" ou "Especialista Captacao".

## Knowledge Engine

O Knowledge Engine e a fundacao de conhecimento proprietario da UCE. A OpenAI,
quando for conectada em sprint futura, nao deve guardar nem decidir o
conhecimento da Terrazza. O papel dela sera apenas transformar em linguagem
natural as decisoes e os dados selecionados pelo motor.

A UCE passa a ter uma camada propria para consultar informacoes institucionais,
comerciais, territoriais, juridicas, financeiras, scripts, objecoes, garantias,
documentacao, bairros, imoveis e FAQ. Nesta fundacao inicial, a base fica em
`lib/uce/knowledge/repository.ts` como uma lista estatica exportavel, ainda sem
banco e sem integracoes externas.

O fluxo previsto e:

Especialista ativo  
Ã¢â€ â€œ  
Consulta ao Knowledge Engine  
Ã¢â€ â€œ  
Resultados filtrados por dominio, categoria, tags e texto  
Ã¢â€ â€œ  
Ranking por categoria, tag, titulo, conteudo e prioridade  
Ã¢â€ â€œ  
Texto formatado para futura resposta assistida

Cada especialista deve consultar apenas as bases relevantes ao seu objetivo. Um
especialista de locacao, por exemplo, pode usar garantias, documentacao e FAQ de
locacao; um especialista de venda pode priorizar avaliacao comercial, objecoes e
scripts de proprietario.

Futuramente, essa camada podera trocar o reposititorio estatico por Supabase,
embeddings e RAG, mantendo o contrato central da UCE para Terrazza, Unita e
outros produtos.

## Knowledge Territorial

A primeira base territorial do Knowledge Engine cobre Maceio e cidades
estrategicas de Alagoas. Ela fica em `lib/uce/knowledge/territorial` e organiza
informacoes comerciais sobre bairros e cidades para apoiar roteiros,
qualificacao, briefing e handoff.

Cada bairro ou cidade registra:

- nome;
- cidade;
- estado;
- perfil territorial;
- tags;
- uso comercial recomendado;
- observacoes;
- nivel de demanda;
- perfil de publico;
- usos adequados, como locacao, venda, administracao, temporada e investimento.

A base inicial inclui bairros de Maceio como Ponta Verde, Pajucara, Jatiuca,
Farol, Gruta de Lourdes, Mangabeiras, Cruz das Almas, Jacarecica, Guaxuma,
Ipioca, Benedito Bentes, Serraria, Antares, Tabuleiro do Martins, Jacintinho,
Barro Duro e demais bairros mapeados na Sprint UCE-12.2.

Tambem inclui cidades de Alagoas relevantes para operacao imobiliaria e
turistica: Maceio, Marechal Deodoro, Barra de Sao Miguel, Paripueira, Maragogi,
Japaratinga, Sao Miguel dos Milagres, Porto de Pedras, Penedo e Arapiraca.

Funcoes principais:

- `buscarBairroMaceio(nome)`;
- `buscarCidadeAlagoas(nome)`;
- `obterPerfilTerritorial(nome)`;
- `sugerirUsoComercialPorLocal(local)`.

O modulo `lib/uce/domain/realEstate/locations.ts` passa a usar essa base para
detectar bairros e cidades conhecidos. Assim, os especialistas podem consultar
o perfil territorial sem depender de OpenAI, banco ou integracoes externas nesta
fase.

## Knowledge Comercial e Juridico

A Sprint UCE-12.3 adiciona a primeira base comercial, juridica e operacional da
Terrazza dentro do Knowledge Engine. Essa base continua estatica e versionada no
codigo, sem banco, OpenAI, WhatsApp ou integracoes externas.

Arquivos principais:

- `lib/uce/knowledge/commercial/terrazza.ts`;
- `lib/uce/knowledge/legal/realEstate.ts`;
- `lib/uce/knowledge/scripts/terrazza.ts`.

Conteudos iniciais:

- institucional da Terrazza Solucoes Imobiliarias, com atuacao em Maceio e
  Aracaju;
- foco inicial em Maceio para locacao e administracao;
- atuacao em Aracaju para captacao, venda e locacao;
- processo de administracao de imoveis: divulgacao, cadastro, analise cadastral,
  garantia locaticia, contrato, vistoria, cobranca, repasse, manutencao e
  suporte ao proprietario;
- fluxo de locacao: perfil do inquilino, documentacao, garantia, visita,
  proposta, analise, contrato e entrega de chaves;
- fluxo de venda: captacao, avaliacao comercial, documentacao, matricula, preco,
  negociacao e proposta;
- garantias: fiador, caucao, seguro fianca, titulo de capitalizacao e analise
  via Maximiza;
- objecoes: achei caro, condominio alto, vou pensar, nao tenho fiador, quero ver
  outros imoveis e estou so pesquisando;
- juridico basico: nao dar parecer juridico definitivo, encaminhar para
  especialista, evitar promessa de aprovacao, respeitar LGPD e tratar
  documentacao imobiliaria como orientacao inicial.

Esses itens sao agregados em `lib/uce/knowledge/repository.ts`, portanto
`queryKnowledge()` passa a consultar a base comercial, juridica e de scripts por
dominio, categoria, tags e texto. O objetivo e permitir que os especialistas da
UCE usem conhecimento proprietario da Terrazza antes de qualquer camada futura
de linguagem natural.

## LLM Adapter

A Sprint UCE-16.1 prepara uma camada isolada para futura integracao com OpenAI
em `lib/uce/llm`, ainda sem chave, dependencia ou chamada real de API.

A regra central permanece: a UCE decide. O `processUCE` continua responsavel por
especialista ativo, fluxo, score, handoff, status da conversa, conhecimento
consultado e proxima pergunta. A camada de LLM recebe esse resultado pronto e
apenas transforma a decisao em linguagem natural.

Arquivos principais:

- `types.ts`: contratos de entrada, saida, provider e resultado de guardrails;
- `promptBuilder.ts`: monta o prompt com especialista, objetivo, contexto,
  proxima pergunta decidida pela UCE, conhecimento consultado, tom de voz,
  restricoes, mensagem do usuario e status;
- `openaiAdapter.ts`: contem `generateNaturalResponse(input)`, hoje simulado,
  sem chamar OpenAI real;
- `guardrails.ts`: valida se a resposta nao inventa imovel, nao promete
  aprovacao, nao da parecer juridico definitivo, nao muda especialista, nao pede
  campo que a UCE nao pediu e nao contraria handoff;
- `fallback.ts`: gera uma resposta segura usando apenas a decisao do proprio
  UCE, protegendo o atendimento caso a OpenAI falhe no futuro.

Assim, quando a OpenAI for conectada, ela devera escrever a resposta final, mas
nao podera assumir controle do raciocinio operacional. Guardrails validam a
saida e o fallback garante continuidade segura do atendimento.

## Compatibilidade

O motor antigo em `lib/ia/motor` continua disponivel. A ponte inicial fica em:

- `lib/ia/motor/adapter.ts`
- `lib/ia/motor/turno.ts`

Assim, o simulador pode evoluir para UCE sem quebrar a interface visual e sem refatorar o CRM inteiro.

## Dominios futuros

A UCE nasce com foco em `real_estate`, mas sua estrutura ja prepara dominios como:

- leiloes;
- seguros;
- juridico;
- generico.

Nesta sprint, apenas o dominio imobiliario esta operacional.

## Commercial Intelligence Package

A Sprint UCE-02 adiciona uma camada comercial acima da interpretacao. A UCE
deixa de apenas entender campos e passa a orientar a conducao do atendimento:
qual estrategia usar, qual risco existe, quando escalar para humano e como o
corretor deve agir.

## Estrategias Comerciais

O modulo `lib/uce/commercial/strategies.ts` seleciona a estrategia ativa a partir
do contexto e das hipoteses. As estrategias iniciais sao:

- `modo_consultivo`;
- `modo_conversao`;
- `modo_captacao`;
- `modo_administracao`;
- `modo_reengajamento`;
- `modo_alto_padrao`;
- `modo_investidor`;
- `modo_juridico_cauteloso`.

Cada estrategia informa tom recomendado, risco, proxima melhor acao e mensagem
sugerida.

## Memoria Estrategica

O modulo `lib/uce/memory/strategicMemory.ts` prepara snapshots em memoria para
um futuro historico persistente do cliente. Ainda nao ha banco nesta fase.

Ele permite criar resumo, mesclar memorias e gerar saudacao de retorno, por
exemplo: "Na ultima conversa voce procurava apartamento na Ponta Verde ate R$
3.500. Isso continua igual?"

## Consciencia Comercial

O modulo `lib/uce/commercial/awareness.ts` avalia:

- chance de conversao;
- potencial financeiro;
- esforco necessario;
- urgencia;
- risco comercial;
- necessidade de escalar para humano.

Essa camada ajuda a IA a entender nao apenas o que foi dito, mas o momento
comercial do lead.

## Mentor do Corretor

O modulo `lib/uce/commercial/mentor.ts` gera orientacoes para o corretor humano:

- perfil psicologico provavel;
- objecoes provaveis;
- melhor abordagem;
- frases sugeridas;
- frases a evitar;
- alertas de risco;
- proxima melhor acao.

O objetivo e transformar o handoff em uma orientacao comercial util, nao apenas
em um resumo da conversa.

## Academia UCE

A pasta `lib/uce/academy` cria cenarios de treinamento e avaliacao futura. Nesta
sprint, os cenarios aparecem no simulador apenas como leitura.

Cenarios iniciais:

- inquilino urgente;
- inquilino sem pressa;
- proprietario administracao;
- comprador financiado;
- investidor;
- lead com objecao de preco;
- lead com objecao de fiador;
- alto padrao.

Futuramente, a academia podera comparar uma simulacao real com o comportamento
esperado e sugerir melhorias.

## Fechamento e Handoff

A UCE tambem precisa saber quando parar de perguntar. A partir da Sprint
UCE-09.3, o motor avalia se ja existem informacoes suficientes para preparar a
passagem humana.

O handoff pode acontecer quando ha, no minimo:

- objetivo;
- cidade ou bairro;
- tipo de imovel;
- valor;
- quartos, quando aplicavel;
- pet, quando aplicavel;
- urgencia ou prazo;
- score acima de 75.

Quando esses criterios sao atendidos, o `processUCE` nao gera nova pergunta. Ele
marca o atendimento como pronto para corretor, define o tipo de especialista,
gera uma mensagem final natural para o cliente e prepara o resumo de passagem.

Tipos iniciais de handoff:

- corretor;
- especialista de locacao;
- especialista de administracao;
- especialista de venda;
- atendimento humano.

Essa camada evita que a IA continue perguntando depois de ja ter qualificado o
lead. O objetivo e transformar a conversa em um atendimento completo, com
fechamento elegante e passagem clara para a equipe humana da Terrazza.
