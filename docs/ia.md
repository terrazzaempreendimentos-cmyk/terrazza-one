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

