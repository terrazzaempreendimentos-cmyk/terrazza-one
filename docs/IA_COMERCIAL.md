# IA Comercial Terrazza

## Missão

A IA Comercial da Terrazza deve atuar como uma corretora sênior digital, especializada em qualificar leads, entender necessidades, recomendar próximos passos e preparar a passagem de bastão para corretores humanos.

## Princípio central

A IA não é um chatbot.  
Ela é a primeira camada comercial da Terrazza.

## Canais futuros

- WhatsApp
- Instagram
- Facebook
- QR Code de placa
- Site
- Portais
- Vista ERP

## Objetivo do atendimento

- responder em segundos
- identificar o perfil do cliente
- qualificar o lead
- registrar tudo no CRM
- gerar Timeline
- criar tarefas
- sugerir corretor
- preparar briefing
- recomendar imóveis futuramente

## Tipos de lead

1. Proprietário querendo alugar imóvel
2. Inquilino procurando imóvel
3. Comprador
4. Vendedor
5. Corretor parceiro
6. Cliente administrativo

## Prioridade inicial

A prioridade inicial da Terrazza será:

Maceió  
Locação  
Administração de imóveis  
Captação de proprietários  
Qualificação de inquilinos

## Tom de voz

- profissional
- acolhedor
- consultivo
- seguro
- objetivo
- elegante
- sem linguagem robótica
- sem parecer formulário

## A IA deve evitar

- prometer aprovação
- dar parecer jurídico definitivo
- informar imóvel inexistente
- inventar dados
- falar de preço sem base
- pressionar o cliente
- responder fora da política da Terrazza

## Fluxo geral

Lead chega  
↓  
IA cumprimenta  
↓  
IA identifica intenção  
↓  
IA qualifica  
↓  
IA gera resumo  
↓  
IA calcula temperatura do lead  
↓  
IA registra no CRM  
↓  
IA cria Timeline  
↓  
IA cria tarefa  
↓  
IA prepara passagem de bastão

## Passagem de bastão

Quando o lead estiver qualificado, a IA deve entregar ao corretor:

- nome
- telefone
- intenção
- cidade
- bairro
- faixa de valor
- tipo de imóvel
- urgência
- objeções
- resumo da conversa
- score do lead
- sugestão de abordagem

## Score do Lead

0 a 100

Critérios:

- urgência
- clareza de necessidade
- faixa de valor definida
- resposta rápida
- documentação ou crédito
- interesse real
- disponibilidade para visita
- aderência ao estoque

## Regra de ouro

A IA deve conversar como uma pessoa, mas registrar como um sistema.

## Simulador Interno

Antes da conexão com o WhatsApp real, os fluxos da IA Comercial serão testados
no Simulador Interno.

O simulador permite validar cenários de atendimento por tipo de lead, origem,
cidade e canal, sem gravar dados no banco e sem acionar integrações externas.

Esse ambiente será usado para aperfeiçoar:

- tom de voz;
- abertura da conversa;
- perguntas de qualificação;
- cálculo de score;
- temperatura do lead;
- resumo comercial;
- passagem de bastão para corretores humanos.

O objetivo é testar e ajustar o comportamento da IA antes que ela converse com
clientes reais pelo WhatsApp, Instagram, Site ou outros canais.

## Scripts de Qualificação

Cada tipo de lead terá um roteiro próprio de qualificação para orientar a IA
Comercial sem transformar a conversa em um formulário rígido.

Os scripts definem objetivo, perguntas obrigatórias, perguntas opcionais,
critérios de score, condição de passagem para corretor e próxima ação sugerida.
Com isso, a IA pode conversar de forma natural, acolhedora e consultiva, mas sem
perder o padrão comercial da Terrazza.

Os roteiros iniciais contemplam:

- proprietário;
- inquilino;
- comprador;
- vendedor;
- corretor parceiro.

Esses scripts serão usados no Simulador Interno antes de qualquer integração com
WhatsApp, OpenAI, Vista ERP ou canais externos.

# Motor Cognitivo

O Motor Cognitivo é o início do cérebro operacional da IA Comercial da Terrazza.
Ele define contexto, memória, perguntas, decisões, score e briefing antes de
qualquer modelo de linguagem ser acionado.

A OpenAI não toma decisões.

Quem toma decisões é o Motor Cognitivo da Terrazza. O GPT, quando for conectado
em sprint futura, deverá apenas transformar as decisões do motor em linguagem
natural, respeitando o tom de voz, o script comercial e as regras internas da
Terrazza.

Toda futura integração deverá conversar primeiro com o Motor Cognitivo.

Fluxo definitivo:

Cliente  
↓  
Motor Cognitivo  
↓  
Base Conhecimento  
↓  
Imóveis  
↓  
CRM  
↓  
Agenda  
↓  
Timeline  
↓  
Roleta  
↓  
OpenAI  
↓  
Resposta

Nunca permitir que OpenAI decida o fluxo da conversa.

## Conversa por Turnos

O Motor Cognitivo agora consegue simular uma conversa real por turnos dentro do
Simulador Interno da IA Comercial.

Nesta fase, sem OpenAI e sem WhatsApp, o motor ja consegue:

- interpretar respostas simples do usuario;
- extrair cidade, bairro, tipo de imovel, valor, quartos, pet, financiamento,
  FGTS, urgencia e objetivo;
- atualizar o contexto do lead a cada mensagem;
- identificar lacunas pendentes;
- decidir a proxima pergunta;
- recalcular score e temperatura;
- gerar briefing progressivo para o corretor;
- simular uma resposta consultiva, acolhedora e profissional.

Esse fluxo permite treinar o comportamento comercial da IA antes de qualquer
integracao externa. A regra permanece: o Motor Cognitivo decide o fluxo, e a
OpenAI, em sprint futura, apenas transformara essa decisao em linguagem natural.

## Simulador Avancado

O Simulador Avancado prepara a IA Comercial para uma futura integracao real com
OpenAI, WhatsApp, Vista ERP e demais canais, sem depender ainda de nenhuma API
externa.

Nesta etapa, o Motor Cognitivo passa a exibir:

- estado cognitivo da conversa;
- progresso da qualificacao;
- confianca por campo;
- hipoteses comerciais;
- condicao de qualificacao completa;
- possibilidade de passagem para corretor;
- card de passagem de bastao simulada.

Os estados cognitivos previstos sao:

- identificando_intencao;
- qualificando_perfil;
- coletando_detalhes;
- preparando_briefing;
- pronto_para_corretor.

A confianca por campo indica se informacoes como cidade, bairro, tipo de imovel,
valor, objetivo e urgencia foram preenchidas com boa seguranca, inferidas pelo
fluxo ou ainda estao ausentes.

As hipoteses comerciais ajudam a IA a interpretar o atendimento antes de falar
com um modelo externo. Exemplos: lead de locacao, lead de compra, perfil
familiar, alta urgencia, potencial de administracao, necessidade de financiamento
e lead de alto padrao.

A passagem de bastao simulada gera um card interno com briefing, score,
temperatura, campos coletados, campos pendentes, hipotese principal e sugestao de
abordagem para o corretor humano.

O objetivo desta sprint e testar fluxo, memoria, lacunas, score, briefing e
handoff antes de integrar OpenAI e WhatsApp.

## Motor de Inferencia Comercial

O Motor de Inferencia Comercial analisa o contexto completo da conversa e gera
hipoteses comerciais probabilisticas, como faria um corretor experiente durante a
qualificacao.

Essas hipoteses nunca substituem informacoes reais fornecidas pelo cliente. Elas
servem para enriquecer o atendimento, orientar perguntas melhores e preparar um
briefing mais inteligente para o corretor humano.

Exemplos de inferencias iniciais:

- casa pode indicar provavel familia;
- apartamento pode indicar perfil urbano;
- tres ou mais quartos aumentam a chance de perfil familiar;
- casa com pet pode indicar necessidade de quintal;
- valor acima de 5 mil pode indicar alto padrao;
- objetivo de administracao indica grande potencial de captacao;
- objetivo de compra indica cliente comprador;
- objetivo de locacao indica cliente locatario.

## Personas Comerciais

A IA Comercial passa a selecionar uma persona operacional conforme os sinais do
lead. A persona nao muda os dados do cliente; ela muda o angulo comercial da
qualificacao.

Personas iniciais:

- Corretor Senior;
- Especialista Locacao;
- Especialista Administracao;
- Especialista Alto Padrao;
- Especialista Investidor;
- Especialista Primeiro Imovel.

Regras iniciais de selecao:

- lead proprietario direciona para Especialista Administracao;
- lead inquilino direciona para Especialista Locacao;
- compra direciona para Especialista Primeiro Imovel;
- investidor direciona para Especialista Investidor;
- valor alto direciona para Especialista Alto Padrao.

## Hipoteses

As hipoteses possuem titulo, descricao, confianca e categoria. As categorias
iniciais sao:

- familia;
- perfilFinanceiro;
- administracao;
- compra;
- locacao;
- investidor;
- urgencia;
- perfilImovel.

Quando uma hipotese tiver alta confianca, ela pode contribuir com bonus no score
comercial, sempre de forma limitada e sem substituir respostas reais.

## Fluxo Cognitivo

Fluxo atual do simulador:

Cliente responde  
↓  
Motor extrai informacoes reais  
↓  
Motor atualiza contexto  
↓  
Motor gera inferencias comerciais  
↓  
Motor seleciona persona  
↓  
Motor recalcula score  
↓  
Motor decide proxima pergunta  
↓  
Motor atualiza briefing  
↓  
Simulador exibe raciocinio, persona e hipoteses

Esse fluxo transforma o simulador em uma academia de treinamento da IA Comercial,
antes de qualquer integracao com OpenAI, WhatsApp ou Vista ERP.

## Futuro

A IA deverá consultar:

- Base de Conhecimento
- Imóveis
- Leads
- Timeline
- Agenda
- Roleta Inteligente
- Vista ERP
- WhatsApp
