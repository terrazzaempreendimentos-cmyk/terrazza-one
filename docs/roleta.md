# Roleta Inteligente Terrazza CRM

## Fase atual

A Roleta Inteligente está na fase de distribuição manual assistida.

Nesta etapa, o sistema lista corretores ativos e leads disponíveis com status
`novo` ou `ia_qualificando`. A decisão de distribuição ainda é feita por uma
pessoa da equipe, que escolhe o corretor responsável e confirma a ação pelo
painel da Roleta.

Ao distribuir um lead, o sistema:

- registra a distribuição em `roleta_distribuicoes`;
- atualiza o responsável do lead;
- altera o status do lead para `corretor`;
- incrementa o contador `leads_recebidos` do corretor;
- registra um evento na Timeline com origem `roleta_inteligente`.

Se o registro na Timeline falhar, a distribuição não é bloqueada.

## Fase futura

Em uma sprint futura, a Roleta poderá evoluir para um algoritmo inteligente de
distribuição automática ou semiautomática.

Critérios futuros previstos:

- disponibilidade do corretor;
- especialidade;
- cidade base;
- performance comercial;
- carga atual de leads;
- tempo médio de resposta;
- taxa de conversão;
- aderência entre perfil do lead e perfil do corretor.

## O que ainda não existe

Nesta fase, a Roleta ainda não possui:

- algoritmo automático;
- randomização;
- IA de decisão;
- integração com WhatsApp;
- integração com Vista ERP;
- notificações automáticas.

O objetivo atual é validar o fluxo operacional, a estrutura de dados e a
experiência de distribuição dentro do Terrazza CRM.
