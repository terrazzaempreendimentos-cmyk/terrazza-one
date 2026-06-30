# CRM 2.0 Terrazza

O CRM 2.0 organiza a operacao diaria da Terrazza em torno de leads, atendimentos, agenda, timeline, kanban, roleta e corretores.

## Principio de arquitetura

- CRM e operacao: acompanha pessoas, oportunidades, tarefas, visitas, follow-ups e atendimento humano.
- UCE e inteligencia cognitiva: qualifica conversas, organiza contexto e sugere handoff.
- Inteligencia e analise: consolida indicadores, desempenho, conversao e leitura executiva.
- Administracao e configuracao: concentra usuarios, perfis, integracoes, logs e parametros do sistema.

Essa separacao evita misturar atendimento operacional com motor cognitivo, analise gerencial e configuracoes internas.

## Responsabilidades dos modulos

### Leads

Central de entrada e acompanhamento comercial. Deve mostrar origem, temperatura, status, responsavel e historico basico do relacionamento.

### Kanban

Visao de fluxo comercial por etapa:

- Novo
- Qualificando
- Em atendimento
- Visita/avaliacao
- Proposta
- Fechado
- Perdido

### Agenda Inteligente

Organiza tarefas, visitas, retornos, pendencias e compromissos. A visao operacional deve destacar hoje, proximas tarefas, atrasadas, concluidas e responsaveis.

### Timeline

Historico unificado de eventos do relacionamento comercial e operacional, incluindo lead criado, contato realizado, visita agendada, proposta enviada, manutencao registrada, handoff UCE e follow-up.

### Atendimentos

Fila futura de atendimentos humanos e automatizados, com origem, status, especialista UCE sugerido e responsavel operacional.

### Roleta Inteligente

Modulo futuro para distribuicao de leads e atendimentos entre corretores, considerando disponibilidade, perfil, desempenho e regras comerciais.

### Corretores

Cadastro operacional da equipe comercial. Pode permanecer em Cadastros, enquanto o CRM exibe apenas indicadores ou disponibilidade quando necessario.

## Roadmap CRM 2.0

1. Consolidar a pagina central do CRM com cards e blocos operacionais.
2. Evoluir Leads com temperatura, origem, status e prioridade.
3. Estruturar Kanban por etapas comerciais reais.
4. Refinar Agenda com tarefas de hoje, proximas, atrasadas e responsaveis.
5. Usar Timeline como registro central dos acontecimentos.
6. Preparar Atendimentos para receber WhatsApp, Instagram, site e entradas manuais.
7. Conectar futuramente dados do UCE, n8n e WhatsApp sem misturar responsabilidades.
8. Evoluir Roleta Inteligente para distribuicao operacional.
9. Criar indicadores executivos no modulo Inteligencia.

## Estado atual

Nesta fase, o CRM recebe estrutura visual e operacional premium, com dados existentes e placeholders controlados. Nao ha alteracao de banco, UCE, OpenAI, n8n ou WhatsApp.

## CRM 2.1 — Relacionamento Operacional

O CRM 2.1 aproxima visualmente Leads, Atendimentos e Timeline para que a operacao comece a funcionar como uma central real de relacionamento.

### Lead

Lead e a entidade comercial principal. Ele concentra dados de identificacao, origem, temperatura, status, responsavel, ultimo contato, proxima acao e especialista UCE sugerido.

### Atendimento

Atendimento e a conversa ou processo em andamento. Ele representa o relacionamento vivo com o cliente, podendo estar em andamento, aguardando cliente, aguardando corretor, pronto para handoff ou concluido.

### Timeline

Timeline e o historico dos acontecimentos. Ela registra eventos como lead criado, mensagem recebida, resposta enviada, handoff UCE, tarefa criada, visita agendada, proposta enviada, manutencao registrada e atendimento concluido.

### Papel futuro do UCE

O UCE devera alimentar esses tres modulos futuramente:

- Atualizando o contexto do lead.
- Sugerindo especialista, temperatura e proximos passos.
- Registrando eventos na timeline.
- Indicando quando um atendimento esta pronto para handoff.

Nesta etapa, a integracao e apenas visual e estrutural. Nao ha automacao, API externa, WhatsApp, n8n ou alteracao de banco.

## CRM-2.2 - Manutencoes e Conflitos

Manutencao e conflito passam a ter uma area operacional clara dentro do CRM. Nesta fase, ainda nao existe tabela nova nem persistencia: a tela prepara a experiencia e os conceitos para a futura entidade operacional.

### Entidade operacional futura

Manutencoes e conflitos deverao representar solicitacoes, pendencias, autorizacoes, orcamentos, execucoes, divergencias e encerramentos ligados a inquilinos, proprietarios e imoveis.

### Papel da UCE Memoria

A UCE Memoria podera ajudar a recuperar historico de:

- Inquilino.
- Proprietario.
- Imovel.
- Prestadores.
- Manutencoes recorrentes.
- Conflitos anteriores.
- Acordos, comunicacoes e riscos.

Isso evita perda de contexto e ajuda a administradora a agir com mais seguranca.

### Pre-atendimento futuro

O UCE podera futuramente fazer pre-atendimento de manutencoes e conflitos, coletando categoria, urgencia, fotos, impacto no uso do imovel, partes envolvidas e proxima acao recomendada.

### Automacoes futuras

n8n e WhatsApp poderao abrir solicitacoes automaticamente, registrar eventos na timeline, acionar responsaveis e atualizar status. Essa sprint nao cria automacao, nao conecta WhatsApp e nao altera banco.
