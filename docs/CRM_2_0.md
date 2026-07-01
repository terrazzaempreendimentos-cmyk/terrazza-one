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

## CRM-2.4 - Manutencoes conectadas a UCE Memoria

Cada manutencao ou conflito cadastrado passa a alimentar a UCE Memoria automaticamente. Isso transforma ocorrencias operacionais em historico consultavel da administracao imobiliaria.

### Historico por caso

Ao criar uma manutencao ou conflito, o CRM registra uma memoria principal com tipo, categoria, status, prioridade, resumo, descricao e proxima acao. A origem fica marcada como `crm_manutencoes`.

### Historico por entidade

Quando o caso possui inquilino, proprietario ou imovel vinculado, o CRM tambem registra memorias relacionadas nessas entidades. Assim, o historico deixa de ficar preso ao chamado e passa a acompanhar as pessoas e o imovel.

### Uso futuro

O pre-atendimento futuro podera consultar essas memorias antes de responder uma nova solicitacao. Isso prepara a Terrazza para identificar reincidencia, risco operacional, conflitos recorrentes e pontos sensiveis na administracao.

### Gestao inteligente

Com a UCE Memoria alimentada por manutencoes e conflitos, a administracao imobiliaria ganha base para decisoes mais consistentes, menos perda de contexto e melhor acompanhamento entre inquilinos, proprietarios e imoveis.

## CRM-2.5 - Cadastro Universal de Pessoas

Pessoa passa a ser a entidade base de relacionamento do CRM. Uma mesma pessoa pode ter multiplos papeis, como proprietario, inquilino, comprador, vendedor, corretor, parceiro, prestador e investidor.

### Por que existe

O cadastro universal reduz duplicidade e evita que a mesma pessoa seja cadastrada varias vezes em fluxos diferentes. Jose pode ser proprietario e investidor; Maria pode ser inquilina e compradora; Carlos pode ser corretor e proprietario.

### Relacao com modulos futuros

Pessoas prepara a integracao futura com UCE, imoveis, negocios, atendimentos, timeline, documentos e WhatsApp. O historico de uma pessoa podera acompanhar todos os papeis dela dentro da operacao.

### Preservacao dos cadastros antigos

Proprietarios, inquilinos e corretores continuam preservados nesta etapa. Nao ha migracao automatica, exclusao de tabelas antigas ou alteracao do relacionamento de imoveis.

## Modulo 02 - Imoveis Premium

Imoveis passa a ser um modulo premium do CRM Profissional. O cadastro deixa de ser um formulario simples e passa a ser uma entidade imobiliaria completa, organizada por abas: dados gerais, localizacao, proprietarios, financeiro, caracteristicas, documentacao, midia, publicacao, relacionamentos, timeline, manutencoes e inteligencia.

### Relacao com Pessoas

Pessoas e a base dos proprietarios. A tela de Imoveis busca pessoas ativas com papel `proprietario` e permite relacionar um ou varios proprietarios ao mesmo imovel por meio da tabela `imovel_proprietarios`.

O campo legado `imoveis.proprietario_id` segue existindo para compatibilidade com cadastros antigos. A migracao completa deve ser planejada separadamente, sem apagar historico.

### Operacao imobiliaria

O modulo inclui listagem em cards, busca avancada, filtros principais, criacao, edicao, exclusao logica, visualizacao e duplicacao de imoveis.

### Futuro

O modulo esta preparado para conversar com Leads, Timeline, Manutencoes, CRM e UCE Memoria. Nesta etapa nao ha integracao com UCE, OpenAI, WhatsApp ou n8n.

Documento complementar: `docs/MODULO_IMOVEIS.md`.

## CRM-2.7 - Dashboard e Cadastros Premium

O Dashboard geral passa a funcionar como uma visao executiva da operacao. Ele consolida resumo operacional, prioridades do dia, visao comercial e destaques futuros do UCE em um painel mais util para acompanhamento diario.

Pessoas segue como cadastro matriz. Proprietarios e Inquilinos continuam sendo visoes operacionais filtradas por papel dentro de `pessoas`, evitando duplicidade de dados e mantendo o relacionamento centralizado.

Imoveis permanece como entidade propria, relacionada a Pessoas e preparada para conexoes futuras com Leads, Timeline, Manutencoes e CRM.

O UCE aparece como apoio contextual, com blocos de memoria, insights, correspondencias e alertas inteligentes em formato placeholder. Ele nao se torna obrigatorio em todos os modulos e nao altera a responsabilidade operacional do CRM.

O menu de Cadastros passa a priorizar Pessoas antes das visoes filtradas:

- Pessoas.
- Proprietarios.
- Inquilinos.
- Imoveis.
- Corretores.
- Parceiros.

## CRM-2.8 - Validacoes e Correcoes Criticas

Esta etapa adiciona regras operacionais de qualidade de cadastro sem alterar UCE, OpenAI, n8n ou WhatsApp.

### Documentos

Pessoas, Proprietarios e Inquilinos passam a validar CPF/CNPJ antes de salvar. Pessoas fisicas usam CPF; pessoas juridicas usam CNPJ. Documentos invalidos devem bloquear o cadastro.

### Endereco

Os formularios principais passam a usar consulta ViaCEP para preencher endereco, bairro, cidade e estado a partir do CEP. O campo estado usa lista nacional de UFs.

### Corretores

Corretores recebem visao premium com resumo, filtros e validacao de CRECI unico entre corretores ativos. Tambem existe SQL para reforco no cadastro legado de corretores.

### Imoveis

Imoveis passam a exigir codigo e complemento. Quando o titulo estiver vazio, o complemento passa a ser usado automaticamente como titulo inicial, mantendo edicao manual posterior.

### Agenda

A Agenda Inteligente passa a navegar visualmente entre semana anterior, semana atual e proxima semana, filtrando as tarefas carregadas em memoria pela semana selecionada.

## CRM-2.9 - Telas Premium e Historico de Manutencao

Esta etapa eleva Leads, Roleta Inteligente e Manutencoes ao padrao visual e operacional do CRM profissional, sem alterar UCE, OpenAI, n8n, WhatsApp ou banco.

### Leads Premium

Leads passa a exibir cabecalho premium, cards de resumo, busca, filtros por tipo, status, origem, temperatura e responsavel. Cada lead mostra origem, temperatura, status, responsavel, especialista UCE sugerido, proxima acao e atalhos para visualizar, editar, arquivar, abrir atendimento e timeline.

### Roleta Inteligente Premium

A Roleta ganha filtros por cidade, tipo de lead, status do corretor e corretor. A tela passa a destacar corretores disponiveis, leads aguardando distribuicao, score visual e historico recente de distribuicao.

### Manutencoes e Conflitos

Manutencoes passa a ter filtros operacionais mais completos: imovel, inquilino, proprietario, responsavel, status, prioridade, categoria, periodo, tipo e risco.

### Historico anual do imovel

Ao selecionar um imovel, a tela de Manutencoes exibe um historico anual com quantidade de manutencoes, conflitos, casos abertos, resolvidos, criticos e uma linha do tempo agrupada por mes. O modulo de Imoveis tambem passa a apontar para esse historico, preparando a administracao para leitura operacional por imovel.

## CRM-2.8.4 - Corretores Unificados

Corretores passa a ser uma visao operacional unificada. A tela consolida pessoas ativas com papel `corretor` e registros ativos da tabela antiga `corretores`.

Pessoas e a base futura do cadastro. A tabela antiga continua existindo por compatibilidade com rotinas, relacionamentos e registros ja criados.

A lista unificada normaliza nome, CRECI, telefone, WhatsApp, email, cidade, status e origem. Quando existe duplicidade por CRECI, a visao prioriza o Cadastro Universal de Pessoas. Quando nao ha CRECI, a deduplicacao tenta usar nome e telefone/WhatsApp.

Cada registro exibe badge de origem:

- Cadastro Universal.
- Cadastro antigo.

Novos corretores devem nascer como Pessoas com papel `corretor`. Registros antigos ainda podem ser editados ou excluidos logicamente enquanto a migracao definitiva nao acontece.

A Roleta Inteligente usa a mesma lista unificada, garantindo que o corretor visivel em Cadastros tambem esteja disponivel para distribuicao operacional de leads.

## Modulo 03 - CRM Comercial Profissional

O CRM Comercial passa a funcionar como central operacional real da Terrazza para leads, atendimentos, negocios, pipeline, kanban, agenda, timeline, atividades e roleta.

### Separacao de responsabilidades

- CRM e operacao comercial.
- UCE e apoio cognitivo.
- Inteligencia e analise.
- Administracao e configuracao.
- ERP financeiro, boletos, repasses e pagamentos ficam fora deste modulo.

### Negocios

Negocios representam oportunidades comerciais em andamento. Eles conectam pessoa, imovel, tipo de oportunidade, etapa, valor estimado, probabilidade, responsavel, origem, temperatura, proxima acao e status.

### Pipelines

Cada tipo de negocio possui jornada propria:

- Venda: do novo lead ao contrato, fechado ou perdido.
- Locacao: da qualificacao a ficha cadastral, analise, contrato e entrega de chaves.
- Administracao: do novo proprietario a avaliacao, documentacao, fotos, publicacao e administracao ativa.
- Captacao: do novo contato a avaliacao, proposta comercial, autorizacao, publicacao e ativo.

### Agenda, Timeline e Atividades

Agenda organiza compromissos com data. Timeline registra historico operacional. Atividades concentra tarefas comerciais, follow-ups, documentos, propostas e proximos passos.

### Roleta

Roleta Inteligente segue como distribuicao manual assistida nesta etapa, usando lista unificada de corretores e mantendo historico visual da distribuicao.

Documento complementar: `docs/MODULO_CRM_COMERCIAL.md`.

## UX-01 - Polimento Geral do Produto

O UX-01 padroniza a experiencia visual e operacional do Terrazza One sem alterar regras de negocio, banco, UCE, OpenAI, n8n ou WhatsApp.

### Padrao visual

As paginas principais devem usar cabecalho consistente com badge de modulo, titulo claro, subtitulo curto e acao principal destacada. Cards, filtros, listas, formularios e estados vazios devem seguir a identidade premium da Terrazza: fundo claro sofisticado, azul profundo, dourado discreto, cards brancos, bordas suaves e sombras leves.

### Menu e nomenclatura

O menu segue a ordem final:

- Dashboard.
- Cadastros.
- CRM.
- UCE.
- Inteligencia.
- Administracao.

Cadastros prioriza Pessoas, Proprietarios, Inquilinos, Imoveis, Corretores e Parceiros. CRM organiza Visao Geral, Leads, Atendimentos, Negocios, Kanban, Agenda Inteligente, Timeline, Atividades, Roleta Inteligente e Manutencoes e Conflitos.

### Principio operacional

O CRM deve ser util mesmo sem IA. UCE, OpenAI e automacoes futuras podem enriquecer o contexto, mas a operacao comercial precisa continuar clara, navegavel e profissional por si so.

Documento complementar: `docs/UX_PADRAO_TERRAZZA.md`.
