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
- `lib/uce/domain`: dominios suportados.
- `lib/uce/personas` e `lib/uce/commercial`: fundacoes para especializacao futura.

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
