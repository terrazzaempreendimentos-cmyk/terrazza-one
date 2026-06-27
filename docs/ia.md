# Arquitetura da IA Comercial Terrazza

Este documento descreve a arquitetura inicial da IA Comercial da Terrazza. Nesta sprint, o módulo é apenas estrutural: não há integração com OpenAI, WhatsApp, Vista, APIs externas ou banco em execução.

## Arquitetura da IA

A IA Comercial será a camada de inteligência responsável por receber mensagens de diferentes canais, interpretar intenção comercial, qualificar contatos e preparar encaminhamentos para o Terrazza CRM.

Componentes previstos:

- Interface interna em `/dashboard/crm/ia`
- Contexto operacional em `lib/ia/contexto.ts`
- Prompts reutilizáveis em `lib/ia/prompts.ts`
- Prompt central em `lib/ia/systemPrompt.ts`
- Ferramentas futuras em `lib/ia/tools.ts`
- Tabelas futuras para conversas, memórias e logs

## Fluxo de atendimento

Fluxo previsto:

1. Cliente entra por WhatsApp, Site, Instagram, Facebook ou API Vista.
2. A IA identifica intenção, perfil e urgência.
3. A IA cruza contexto comercial da Terrazza.
4. A IA cria ou atualiza um lead.
5. A IA sugere próximos passos.
6. O atendimento pode gerar tarefa, memória, log ou encaminhamento para corretor.

## Integrações futuras

### OpenAI

Será usada futuramente como motor de linguagem para interpretar mensagens, gerar respostas, resumir conversas e acionar ferramentas internas.

### WhatsApp

Será um canal de entrada e saída para atendimento comercial, qualificação inicial e follow-up.

### Vista

Será usado futuramente para consulta e sincronização de imóveis, proprietários, disponibilidade e informações operacionais.

### Site, Instagram e Facebook

Serão canais de captação e atendimento inicial, conectados à mesma camada de IA Comercial.

## Memória

A memória permitirá registrar informações reutilizáveis sobre atendimento, preferências, padrões comerciais, objeções frequentes e histórico relevante.

Memórias previstas:

- Memórias comerciais
- Memórias por lead
- Memórias por proprietário
- Memórias por imóvel
- Memórias operacionais

## Base de Conhecimento

A Base de Conhecimento será usada futuramente pela IA Comercial para responder
com base no conhecimento interno da Terrazza, evitando respostas genéricas e
mantendo alinhamento com regras, processos, linguagem e contexto operacional da
empresa.

Ela poderá armazenar conteúdos sobre atendimento, locação, venda, garantias,
documentação, proprietários, inquilinos, corretores, Vista ERP, OKE Sistemas,
LGPD, processos jurídicos e diretrizes comerciais.

Nesta etapa, a tabela `ia_conhecimento` apenas guarda o conteúdo manualmente
cadastrado. Ainda não há embeddings, RAG, upload de documentos, OpenAI ou
consulta automática pela IA.

## Conhecimentos Prioritários

A Base de Conhecimento possui campos de organização para indicar quais conteúdos
devem receber maior atenção operacional no futuro uso pela IA Comercial.

- `fixado`: conteúdo que deve ter maior peso operacional e aparecer primeiro na
  organização interna.
- `prioridade`: importância do conhecimento para respostas futuras da IA. Pode
  ser baixa, normal, alta ou crítica.
- `palavras_chave`: termos que ajudam na busca, filtragem e recuperação futura
  do conhecimento.
- `observacoes`: notas internas da equipe sobre uso, cuidado, contexto ou
  interpretação daquele conteúdo.

Esses campos preparam a futura recuperação de conhecimento interno da Terrazza,
mas ainda não implementam embeddings, RAG ou consulta automática pela IA.

## IA Comercial MVP

Nesta fase, a IA Comercial ainda não utiliza OpenAI, streaming, embeddings ou
RAG real. O módulo funciona como MVP operacional para validar o fluxo principal
antes da conexão com o motor de IA definitivo.

O MVP consulta os registros ativos da tabela `ia_conhecimento` e gera uma
resposta simulada com base em categoria, título e palavras-chave dos conteúdos
cadastrados. Quando encontra conteúdos relacionados, lista até três referências
internas para orientar o atendimento. Quando não encontra, informa que ainda não
há conteúdo interno suficiente sobre o tema.

Cada interação é registrada em `ia_conversas`, mantendo histórico da pergunta do
usuário e da resposta simulada da IA. Também é criado um evento na `timeline`
com origem `ia_comercial`, sem bloquear a conversa caso o registro da timeline
falhe.

O objetivo desta etapa é validar:

- uso da Base de Conhecimento;
- histórico de conversas;
- registro arquitetural na Timeline;
- experiência de chat interno;
- preparação para futura integração com OpenAI.

OpenAI, WhatsApp, Vista ERP, embeddings e RAG real serão conectados em sprints
futuras.

## Ferramentas

As ferramentas serão funções internas que a IA poderá chamar futuramente.

Ferramentas previstas:

- Buscar imóveis
- Criar lead
- Atualizar status de lead
- Criar tarefa
- Registrar evento na timeline
- Consultar Vista
- Gerar resumo para corretor
- Preparar resposta para WhatsApp
