# Contrato canonico de Atendimentos

## Definicao

Atendimento e a unidade operacional de acompanhamento de um Lead, conduzida por
uma Pessoa responsavel, desde a entrada na fila humana ate sua conclusao ou
cancelamento.

Ele nao e o cadastro do Lead, uma mensagem, tarefa, compromisso, evento da
Timeline, Negocio ou conversa cognitiva interna da IA.

## Inventario e estado atual

- A rota real e `/dashboard/crm/atendimentos`, protegida apenas para visualizacao
  por `atendimentos.visualizar`.
- A pagina possui cinco cards e cinco colunas alimentados por um array local de
  cinco registros ficticios. IDs, nomes, canais, origens, temperaturas,
  especialistas, mensagens e proximos passos sao mocks.
- A pagina nao cria cliente Supabase, nao consulta `public.atendimentos` e nao
  possui mutacao, action, RPC, filtro real ou detalhe real.
- O dashboard principal executa a unica consulta operacional encontrada:
  `public.atendimentos`, com projecao explicita `id, status`, somente para contar
  linhas. Nao trata separadamente erro dessa consulta.
- Nao existe referencia a `atendimento_id` no codigo ou nos SQLs locais.
- Nao existe INSERT, UPDATE, DELETE ou RPC de Atendimento no projeto.
- Sidebar e matriz apontam para a rota existente. A matriz declara permissoes de
  visualizar, criar, editar e assumir, mas somente a guarda de pagina esta em uso.
- Nao existe tabela local de mensagens. `ia_conversas` guarda pares de texto da IA
  vinculados opcionalmente a Lead; nao e Atendimento nem conversa omnichannel.

## Schema legado conhecido e limites da auditoria

Antes da migration 029, a auditoria do banco real confirmou a tabela vazia e as
colunas `id uuid`, `proprietario_id uuid`, `status text`, `score text`, `origem
text`, `observacao text` e `created_at timestamptz`. Existem somente a PK em `id`
e a FK legada `proprietario_id -> public.proprietarios(id)`. A migration preserva
integralmente `proprietario_id`, `score`, `observacao`, a PK e a FK legada.

A migration 019 comprova estruturalmente que a tabela precisa existir para a
migration concluir e registra:

- RLS habilitada;
- revogacao total de `anon`;
- revogacao inicial de `authenticated` e devolucao somente de `SELECT`;
- policy `admin_ativo_select_atendimentos`, exclusiva de administrador ativo;
- nenhum grant de INSERT, UPDATE ou DELETE;
- nenhuma policy de escrita.

FKs, indices e constraints legados permanecem **desconhecidos pelos arquivos
locais**. A proxima etapa deve levantar `information_schema`, `pg_constraint`,
`pg_indexes`, `pg_policies`, grants e contagens antes de alterar a tabela. Nao se
deve inferir schema a partir dos mocks.

## Fronteiras dos modulos

| Modulo | Autoridade |
| --- | --- |
| Lead | Identidade da oportunidade, origem, contatos, interesse, etapa e responsavel comercial. |
| Atendimento | Caso operacional, fila, responsavel, prioridade, estado, SLA, resumo e encerramento. |
| Mensagem | Comunicacao individual recebida ou enviada; futuramente pertence a conversa ou Atendimento. |
| Atividade | Acao a realizar, com prazo, responsavel e status; pode nascer do Atendimento. |
| Agenda | Visao temporal de atividades, visitas e compromissos; nao e autoridade dos dados. |
| Timeline | Historico administrativo imutavel do que ocorreu; nao representa pendencia. |
| Negocio | Operacao comercial com imovel, partes, proposta, valores e fechamento. |
| IA/UCE | Contexto cognitivo e conversa automatizada; nao substitui o caso operacional humano. |

Essa separacao evita duplicar mensagem em `resumo`, usar Timeline como tarefa ou
tratar a etapa do Lead como status do Atendimento.

## Identidade, relacionamentos e cardinalidade

Direcao canonica do MVP:

- `atendimento.id`: UUID;
- `lead_id -> public.leads.id`, obrigatorio para novos registros;
- `responsavel_id -> public.pessoas.id`;
- `criado_por_id` e `encerrado_por_id`: identidade Auth ou identidade de acesso a
  definir apos auditoria;
- eventual `atendimento_anterior_id` para reabertura por novo registro;
- `conversa_id` somente apos contrato de conversas;
- nenhum `negocio_id` antes do contrato de Negocios.

Nao usar `public.corretores`, nome, telefone, e-mail ou metadata como identidade.
Registros legados com `lead_id` ausente precisam ser contados e classificados antes
de qualquer `NOT NULL`.

Regra aprovada para o MVP: um Lead pode ter varios Atendimentos historicos, mas
somente um nao final aberto. Concluidos e cancelados permanecem imutaveis no
historico; reabertura cria novo Atendimento relacionado, sem reutilizar
silenciosamente o finalizado.

## Catalogos canonicos

Os contratos TypeScript definem valores fechados, labels, descricoes, ordem e
variantes visuais.

### Status

`aguardando`, `em_atendimento`, `aguardando_cliente`, `aguardando_interno`,
`concluido`, `cancelado`.

`concluido` e `cancelado` sao finais. Conclusao exige resultado; cancelamento
exige resultado de cancelamento e motivo.

### Prioridade

`baixa`, `normal`, `alta`, `urgente`. O default futuro sugerido e `normal`.
Prioridade organiza fila e SLA, sem alterar etapa ou autorizacao.

### Canal

O contrato de Atendimentos usa `manual`, `whatsapp`, `email`, `site`, `instagram`,
`facebook`, `portal`, `telefone`, `indicacao`, `outro`. A inclusao de `email` foi
aprovada para Atendimento. O catalogo de Leads permanece sem `email`, criando uma
divergencia temporaria deliberada: contato do Lead e canal do Atendimento possuem
responsabilidades distintas.

### Origem operacional

`distribuicao_manual`, `roleta_automatica`, `handoff_ia`, `criacao_manual`,
`reabertura`, `integracao`. Origem descreve como o Atendimento nasceu e nao se
confunde com canal do Lead, `origem_detalhe` ou criterio da Roleta.

### Resultado

`qualificado`, `visita_agendada`, `proposta_iniciada`, `encaminhado_negocio`,
`convertido`, `sem_interesse`, `sem_contato`, `atendimento_duplicado`,
`cancelado_solicitante`, `outro`.

O resultado fica nulo em estados abertos. Visita, proposta, encaminhamento e
conversao sao resultados declarados: nao criam Atividade, Negocio nem alteram Lead
automaticamente. O catalogo final ainda exige aprovacao comercial.

## Transicoes

- `aguardando -> em_atendimento | cancelado`;
- `em_atendimento -> aguardando_cliente | aguardando_interno | concluido | cancelado`;
- `aguardando_cliente -> em_atendimento | aguardando_interno | concluido | cancelado`;
- `aguardando_interno -> em_atendimento | aguardando_cliente | concluido | cancelado`;
- estados finais nao possuem transicao operacional comum.

Os helpers sao puros, sem banco ou React, rejeitam estado desconhecido, mesmo
estado, salto nao catalogado, finalizacao sem resultado e cancelamento sem motivo
ou resultado apropriado. Reabertura e marcada como operacao administrativa e nao
como transicao comum.

## Assuncao, distribuicao e transferencia

Distribuicao define o responsavel comercial do Lead pela Roleta. Assuncao registra
que uma Pessoa autorizada iniciou o caso, muda `aguardando` para `em_atendimento`
e preenche `assumido_em`, sem trocar silenciosamente `leads.responsavel_id`.

Administrador e gestor podem assumir, direcionar, concluir e cancelar. Gestor pode
assumir conforme decisao comercial confirmada. Corretor devera assumir somente caso
atribuido a si. O perfil atendimento ainda precisa de regras aprovadas.

A transferencia auditavel atual troca o responsavel do Lead. Quando Atendimento
for persistido, a troca do responsavel aberto e a RPC da Roleta precisarao ser
atomicas ou coordenadas por uma unica operacao transacional; dois updates isolados
criariam divergencia.

## Handoff da IA

Direcao futura, sem sincronizacao nesta sprint:

1. Lead em `aguardando_humano` pode originar Atendimento `aguardando`.
2. Distribuicao define responsavel.
3. Assuncao move Atendimento para `em_atendimento` e deve ser coerente com handoff
   `humano`.
4. Encerramento pode atualizar handoff apenas por regra transacional aprovada.

Criacao automatica por handoff ou distribuicao ainda exige decisao e idempotencia.

## SLA, datas e classificacao

| Campo | Natureza | Prioridade |
| --- | --- | --- |
| `created_at`, `updated_at` | persistidos; auditoria tecnica | Essencial na proxima migration |
| `iniciado_em`, `assumido_em` | eventos reais de inicio/assuncao | Essencial |
| `concluido_em`, `cancelado_em` | eventos reais de encerramento | Essencial |
| `prazo_primeira_resposta_em`, `prazo_resolucao_em` | prazos calculados e persistidos para auditoria | Essencial apos regra de SLA aprovada |
| `primeira_resposta_em` | evento real | Dependente do modelo de interacao/mensagem |
| `ultima_interacao_em` | evento real derivado de interacoes | Dependente do WhatsApp/conversas |
| `proxima_acao_em` | planejamento operacional | Futuro; pode pertencer a Atividade |
| SLA vencido | comparacao entre prazo e evento | Calculavel |
| tempos medios | agregacao de timestamps | Calculavel |

Expediente, feriados e SLA por canal precisam ser aprovados antes de calcular prazos.

## Conteudo operacional

Campos futuros e limites defensivos propostos:

- `assunto`: 160;
- `resumo`: 2.000;
- `observacoes_internas`: 4.000;
- `motivo_cancelamento`: 1.000;
- `resultado_detalhe`: 2.000.

`resumo` nao armazena transcricoes. Mensagens terao estrutura, retencao e regras de
privacidade proprias. Observacoes internas precisam de decisao de visibilidade.

## Fila e indicadores

Diretamente obtidos quando status e prioridade existirem: aguardando, em atendimento,
aguardando cliente, aguardando interno e urgentes. Dependem de novos timestamps ou
regras: SLA vencido, concluidos hoje, tempo medio ate assumir e tempo medio de
Atendimento. Os dois ultimos sao calculados; nao devem virar contadores editaveis.

## Visao por papel

- **Administrador:** todos os casos, filtros globais, assuncao, transferencia,
  conclusao, cancelamento e auditoria.
- **Gestor:** todos os casos operacionais, assuncao, transferencia, conclusao e SLA.
- **Corretor:** somente proprios/atribuidos; assume atribuidos, muda estado, cria
  Atividade e registra resumo; sem Timeline administrativa global.
- **Atendimento:** fila e poderes ainda dependem de aprovacao operacional.

As permissoes atuais expressam intencao, nao ownership implementado.

## Ownership e RLS futura

A aplicacao possui `usuarios_perfis.user_id -> auth.users.id`, mas nao existe coluna
ou tabela que vincule um usuario Auth a `pessoas.id`. `pessoas` tambem nao possui
`user_id`. Isso bloqueia RLS segura de escopo proprio para corretor.

Nao resolver por nome, e-mail ou metadata. A futura RLS precisa combinar perfil
ativo, papel, vinculo Auth/Pessoa aprovado, `atendimento.responsavel_id` e escopo.
Administrador e gestor terao leitura ampla; corretor, somente atribuida. As policies
atuais permitem apenas SELECT do administrador e nao permitem escrita em Atendimento.

## WhatsApp futuro

Serao necessarios contrato de conversa, mensagens individuais, identificador externo
idempotente, canal, direcao, timestamps, status de entrega, remetente/destinatario,
consentimento, opt-out, retencao e vinculo ao Lead/Atendimento. Telefone normalizado
serve para localizar identidade, nunca como FK. Nenhuma dessas tabelas e criada agora.

## Decisoes que exigem aprovacao

1. Momento e regra da criacao automatica apos distribuicao.
2. Criacao automatica no handoff da IA.
3. Poderes exatos do perfil atendimento.
4. Catalogo final de resultados apos validacao operacional.
5. SLA por canal.
6. Expediente e feriados.
7. Sincronizacao com etapa e handoff do Lead.
8. Retencao e privacidade de mensagens.
9. Visibilidade de observacoes internas.
10. Modelo explicito de vinculo entre Auth e Pessoa.

## Migration 029 preparada, nao aplicada

`029_atendimentos_core_canonico.sql` implementa incrementalmente o nucleo aprovado.
Ela aborta se a tabela nao estiver vazia, se a estrutura legada divergir, se novas
colunas ja existirem ou se identidades e helper de autorizacao estiverem ausentes.
Sem backfill ou criacao automatica, ela:

1. adicionar FKs canonicas `lead_id` e `responsavel_id`, sem migrar identidade por nome;
2. adicionar status, prioridade `normal`, origem e canal com checks fechados;
3. adicionar assunto, resumo e campos controlados de encerramento;
4. adicionar timestamps essenciais e trigger de `updated_at`;
5. validar coerencia entre status final, resultado, motivo e timestamps;
6. criar indices de fila, responsavel, SLA e Lead;
7. criar unicidade parcial por `lead_id` para estados nao finais;
8. manter RLS habilitada e preparar policies separadas em etapa de ownership;
9. nao criar Atendimento automaticamente e nao remover campos legados.

A precondicao de zero linhas permite tornar `lead_id`, status, origem, prioridade,
canal, `created_at` e `updated_at` obrigatorios sem backfill. A migration nao amplia
grants nem policies e nao cria Atendimento.

Decisoes aprovadas adicionais: corretor nao assume Atendimento de outro responsavel;
criacao automatica por distribuicao e handoff ficam para RPC posterior; nao ha SLA
por expediente/feriados nesta fase; nao existe vinculo Auth/Pessoa inferido; colunas
legadas permanecem fora dos novos fluxos.
