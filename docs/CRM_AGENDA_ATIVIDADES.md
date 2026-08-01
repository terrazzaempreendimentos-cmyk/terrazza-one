# CRM — Agenda e Atividades

## Escopo da auditoria

Esta auditoria cobre `/dashboard/crm/agenda`, `/dashboard/crm/atividades`, os componentes `AgendaSemanal` e `TaskCard`, os consumidores de `tarefas`, as migrations locais 004, 005 e 019 e as fronteiras com Lead, Atendimento, Negocio, Imovel, Pessoa e Timeline. Nenhuma pagina, permissao ou migration foi alterada.

## Inventario atual

| Area | Estado | Fonte e operacoes |
| --- | --- | --- |
| Agenda | Parcialmente funcional e legada | `SELECT` e `INSERT` direto em `tarefas`; `INSERT` separado em `timeline`; cliente SSR |
| Agenda semanal | Funcional para exibicao | Componente Client local; agrupa por `data`, ordena por `hora` e calcula atraso |
| Atividades | Mock | Quatro objetos locais; filtros e edicao sao apenas visuais |
| Detalhe | Ausente | Nao ha rota de detalhe sob Agenda ou Atividades |
| Dashboard CRM | Leitura parcial | Consulta `tarefas` e `timeline` para indicadores e listas |

Agenda exige `agenda.visualizar`, mas sua Server Action embutida exige apenas perfil ativo, nao `agenda.criar`. Atividades exige `atividades.visualizar` e nao possui action. O catalogo global ja declara permissoes de visualizar, criar e editar para ambos; escopos de corretor continuam futuros.

Agenda consulta `tarefas`, `leads`, `proprietarios`, `imoveis`, `inquilinos` e `corretores`. Ela grava primeiro `tarefas` e depois `timeline`. As gravacoes nao sao atomicas: falha da Timeline deixa a tarefa criada e devolve erro. O log atual inclui objeto bruto do Supabase e a mensagem ao usuario inclui mensagem tecnica. Nao existe UPDATE, exclusao, RPC, protecao contra duplo envio nem estado serializavel que preserve o formulario.

## Schema conhecido

A migration 004 comprova em `tarefas`:

| Coluna | Tipo e regra local comprovada |
| --- | --- |
| `id` | UUID, PK, default `gen_random_uuid()` |
| `titulo` | text, obrigatorio |
| `descricao` | text, opcional |
| `tipo` | text, default `tarefa` |
| `status` | text, default `pendente` |
| `prioridade` | text, default `media` |
| `data` | date, opcional |
| `hora` | time, opcional |
| `lead_id` | UUID opcional, FK `leads`, exclusao da origem resulta em null |
| `proprietario_id` | UUID opcional, FK legada `proprietarios`, exclusao da origem resulta em null |
| `imovel_id` | UUID opcional, FK `imoveis`, exclusao da origem resulta em null |
| `inquilino_id` | UUID opcional, FK legada `inquilinos`, exclusao da origem resulta em null |
| `corretor_id` | UUID opcional, FK legada `corretores`, exclusao da origem resulta em null |
| `responsavel` | text opcional, sem autoridade referencial |
| `origem` | text, default `manual` |
| `created_at` | timestamptz, default `now()` |

Nao ha constraints de catalogo, `updated_at`, autoria, timestamps finais, indices adicionais ou triggers documentados localmente. A PK cria indice implicito; nenhum outro indice esta declarado. A migration 019 comprova RLS habilitado, grants de SELECT/INSERT a `authenticated` e policies `admin_ativo_select_tarefas` e `admin_ativo_insert_tarefas`, ambas restritas a administrador ativo. Nao ha policy ou grant operacional de UPDATE documentado para `tarefas`.

O diagnostico administrativo posterior confirmou que `public.tarefas` possui zero registros e corresponde ao schema legado acima: somente a PK como indice, nenhum trigger, RLS ativo sem FORCE, SELECT/INSERT administrativos e nenhum UPDATE/DELETE para `authenticated`.

Nao existem migrations locais criando tabelas independentes `agenda`, `atividades`, `compromissos` ou `eventos`. Timeline e criada na migration 005 e posteriormente recebe RLS/policies; ela nao e fonte de pendencias.

## Fronteiras canonicas

- **Lead:** oportunidade comercial.
- **Atendimento:** caso operacional em acompanhamento.
- **Negocio:** operacao imobiliaria concreta.
- **Atividade:** acao executavel, pendente ou programada.
- **Agenda:** visao temporal das Atividades e compromissos.
- **Timeline:** historico imutavel do que ja aconteceu.
- **Mensagem:** comunicacao individual, que pode motivar uma Atividade, mas nao a substitui.

Atividade e definida como uma acao operacional com responsavel, prazo e estado controlado, relacionada opcionalmente a Lead, Atendimento, Negocio, Imovel ou Pessoa. A definicao atende ao objetivo atual, mas o schema legado ainda nao suporta responsavel canonico, Atendimento, Negocio ou Pessoa.

Agenda e uma visao temporal das Atividades e compromissos operacionais, sem possuir uma segunda fonte independente da mesma tarefa. Ela nao deve copiar registros para exibi-los em calendario.

## Catalogos propostos

O contrato em `lib/crm/atividades/catalogs.ts` classifica cada tipo. Confirmados pelo uso atual: tarefa interna (legado `tarefa`), ligacao, mensagem, reuniao, visita, avaliacao (legado `avaliacao_imovel`), retorno (legado `follow_up`), documentacao (legado `pendencia_documental`), assinatura e entrega de chaves. Recomendados e aprovados para o nucleo inicial: WhatsApp, e-mail, proposta e vistoria. `outro` e provisorio. Manutencao permanece fora do catalogo canonico por sua fronteira ainda pendente com o modulo patrimonial.

Os valores legados nao devem ser renomeados sem estrategia explicita de compatibilidade. O catalogo definitivo ainda requer aprovacao.

Origens canonicas: `manual`, `lead`, `atendimento`, `negocio`, `agenda` e `integracao`. `agenda` identifica somente o ponto da interface que criou a Atividade; nao representa fonte paralela.

Status propostos: `pendente`, `em_andamento`, `aguardando`, `concluida` e `cancelada`. `atrasada` nao e persistido: deriva de prazo vencido e estado nao final. O mock atual usa `atrasada`, mas isso nao valida o valor como status canonico.

Prioridades: `baixa`, `normal`, `alta`, `urgente`, em paridade nominal com Atendimentos. O legado `media` exige compatibilidade ou migracao consciente para `normal`.

## Datas e compromissos

Essenciais futuros: inicio planejado, prazo/fim planejado, dia inteiro, `created_at`, `updated_at`, `concluida_em` e `cancelada_em`. Inicio planejado e prazo nao se confundem com criacao ou realizacao efetiva. Conclusao e cancelamento exigem timestamps reais.

Possiveis, ainda nao aprovados: lembrete, recorrencia, fuso, duracao, reagendamento e inicio efetivo. Recomenda-se armazenar timestamps com fuso e uma regra explicita para dia inteiro.

Tarefa e compromisso devem inicialmente ser uma unica entidade Atividade quando diferirem apenas por horario, duracao, local e participantes. Uma entidade paralela so se justifica se aparecerem invariantes distintos. Participantes, local e videoconferencia seguem pendentes.

## Relacionamentos propostos

- `id` UUID;
- `lead_id` opcional para `leads.id`;
- `atendimento_id` opcional para `atendimentos.id`;
- `negocio_id` opcional para `negocios.id`;
- `imovel_id` opcional para `imoveis.id`;
- `pessoa_id` opcional para `pessoas.id`;
- `responsavel_id` para `pessoas.id`;
- `criado_por_user_id` para `auth.users.id`;
- `concluido_por_user_id` para `auth.users.id`.

Novas relacoes nao devem apontar para identidades operacionais legadas. UUIDs de tabelas diferentes nao podem ser aproximados ou conciliados por nome, telefone, e-mail ou metadata. As colunas legadas devem ser preservadas ate uma migracao segura, sem backfill especulativo.

Ainda precisa ser decidido se existe um vinculo principal ou se Lead, Atendimento e Negocio podem coexistir. Coexistencia pode ser valida quando os vinculos forem coerentes, mas exigira validacao transacional. `responsavel_id` deve identificar Pessoa existente e ativa; papel operacional compativel pode ser exigido por tipo. A visao “minhas atividades” depende do vinculo canonico Auth para Pessoa, ainda ausente.

## Estados e transicoes

O helper puro `transitions.ts` permite:

- pendente para em andamento, aguardando, concluida ou cancelada;
- em andamento para aguardando, concluida ou cancelada;
- aguardando para em andamento, concluida ou cancelada.

Valor desconhecido, mesmo estado, transicao de estado final e reabertura comum falham fechados. Conclusao e cancelamento exigem autor e timestamp. O contrato provisoriamente exige motivo no cancelamento; essa regra precisa de aprovacao antes da migration. Reabertura deve ser uma operacao administrativa futura, explicita e auditavel.

Conclusao pode exigir resumo ou resultado, mas isso permanece decisao comercial. Nao deve sincronizar automaticamente Lead, Atendimento ou Negocio. Cancelamento nao apaga a Atividade e deve encerrar lembretes futuros; catalogo de motivos e politica de preservacao ainda estao pendentes.

## Agenda e indicadores

Visoes necessarias: hoje, semana, mes, atrasadas, proximas, concluidas, por responsavel, por tipo e por modulo relacionado. Todas consultam a mesma fonte canonica.

Indicadores diretos: pendentes hoje, atrasadas, concluidas hoje, urgentes e proximas. Tempo medio de conclusao, taxa de reagendamento, cumprimento de prazo e carga por responsavel dependem de novos campos e nao podem ser inferidos dos mocks.

## Recorrencia

Nao ha uso real comprovado. Fica fora do MVP. Evolucao futura deve separar regra recorrente, ocorrencias materializadas, alteracao de uma ocorrencia e cancelamento da serie.

## Timeline

Timeline e historico imutavel e nao permite editar ou concluir acoes. Eventos de conclusao, cancelamento ou reagendamento poderao ser gravados por RPC atomica. Na Sprint 3D, a visao global sera movida para Administracao e retirada do corretor; eventos relacionados poderao aparecer nos detalhes dos modulos conforme ownership futuro. Nada foi alterado nesta sprint.

## Papeis, RLS e privacidade

- Administrador: visao global e operacoes conforme autorizacao.
- Gestor: visao de equipe e atribuicao, sujeitas a RLS futura.
- Corretor: somente suas Atividades, bloqueado ate existir Auth para Pessoa e RLS de ownership.
- Atendimento: escopo operacional ainda precisa ser definido.

As policies atuais de `tarefas` sao administrativas e nao realizam esses escopos. Permissao de pagina nao substitui RLS nem autorizacao da futura RPC.

Listagens e logs nao devem expor documentos, contatos normalizados, payloads, credenciais, observacoes internas completas, motivos sensiveis ou mensagens privadas. Logs: modulo, operacao, etapa e codigo tecnico.

## Lacunas e riscos

1. Atividades e mock e diverge da Agenda real.
2. Agenda depende de tres cadastros legados e de responsavel textual.
3. Criacao de tarefa e Timeline nao e atomica.
4. Action nao exige permissao granular de criacao.
5. Erro bruto e mensagem tecnica podem vazar detalhes.
6. Tipos, status e prioridades sao texto livre sem constraints.
7. Nao ha edicao/conclusao canonica nem concorrencia otimista.
8. `atrasada` aparece como status no mock, embora deva ser calculada.
9. `media` legado diverge de `normal`.
10. Schema e contagem reais dependem da consulta administrativa.

## Decisoes pendentes

1. Catalogo definitivo de tipos.
2. Compromisso e tarefa na mesma entidade.
3. Responsavel obrigatorio.
4. Vinculo principal.
5. Multiplos vinculos simultaneos.
6. Conclusao com resultado ou resumo obrigatorio.
7. Cancelamento com motivo e eventual catalogo.
8. Reabertura administrativa.
9. Recorrencia.
10. Lembretes.
11. Escopo do perfil atendimento.
12. Ownership do corretor e Auth para Pessoa.
13. Participantes.
14. Locais e videoconferencia.
15. Sincronizacoes futuras explicitas.
16. Retencao historica.

## Migration 038 preparada

`038_atividades_core_canonico.sql` evolui `public.tarefas`, que esta vazia, sem criar tabela paralela. Reutiliza titulo, descricao, tipo, status, prioridade, origem, Lead, Imovel e criacao; adiciona planejamento, execucao, autoria e relacoes canonicas. Preserva integralmente as colunas e FKs legadas, sem backfill ou conversao de identidade.

Cancelamento exige motivo aparado de 3 a 1000 caracteres, autor e timestamp. Atraso continua calculado, recorrencia e lembretes nao foram adicionados e nao existe sincronizacao automatica com Lead, Atendimento, Negocio ou Timeline. RLS, policies e grants permanecem administrativos e inalterados. A migration foi apenas preparada, nao executada.

Essa direcao foi materializada na migration 039, com RPCs atomicas `SECURITY DEFINER`, autorizacao interna, concorrencia, validacao entre relacionamentos e eventos transacionais de Timeline. A aplicacao nao recebe UPDATE direto.

## RPCs de Atividades abertas — migration 039 preparada

A migration `039_atividades_rpc_abertas.sql` cria quatro funcoes nominais:

- `criar_atividade(jsonb)`;
- `atualizar_atividade(uuid, timestamptz, jsonb)`;
- `iniciar_atividade(uuid, timestamptz)`;
- `alterar_estado_atividade(uuid, text, timestamptz, text)`.

Todas sao `SECURITY DEFINER`, usam `search_path = pg_catalog`, obtem autoria por `auth.uid()` e autorizam exclusivamente perfil ativo administrador ou gestor por `usuario_tem_papel(text[])`. Corretor e atendimento permanecem bloqueados enquanto Auth para Pessoa nao existir. PUBLIC e `anon` nao recebem EXECUTE; somente `authenticated` pode invocar, sem substituir a autorizacao interna.

### Allowlist e criacao

Criacao e edicao aceitam somente titulo, descricao, tipo, prioridade, origem, os cinco relacionamentos canonicos opcionais, responsavel, inicio/fim planejados, dia inteiro, local, link de reuniao e observacoes internas. ID, estado, autoria, execucao, encerramento, atividade anterior, ativo, datas de auditoria e todas as colunas legadas sao rejeitados.

Criacao sempre produz Atividade pendente e ativa, com autoria da sessao. UUIDs, catalogos, limites, datas e existencia/estado dos relacionamentos sao validados. Atendimento e Negocio precisam pertencer ao Lead informado quando ambos estiverem presentes. Responsavel precisa ser Pessoa ativa com nome valido; nenhum papel comercial e inferido.

### Edicao, inicio e estados abertos

Edicao bloqueia a linha com `FOR UPDATE`, exige Atividade ativa em estado aberto e compara exatamente `updated_at`. Campos omitidos sao preservados e `null` remove somente valor opcional. Estado, autoria e timestamps operacionais permanecem protegidos; o trigger da migration 038 continua sendo a unica autoridade de `updated_at`.

Inicio e o caminho exclusivo de `pendente` para `em_andamento`; preenche `iniciado_em` apenas se ainda estiver nulo. A movimentacao comum permite somente `pendente` para `aguardando`, `em_andamento` para `aguardando` e `aguardando` para `em_andamento`. Estados finais, mesma situacao, saltos, inativos e fotografia divergente sao bloqueados. A observacao opcional, limitada a 500 caracteres, vai somente para a Timeline.

### Timeline, atomicidade e privacidade

Cada RPC executa uma unica mutacao em `tarefas` e exige exatamente um evento na Timeline: `atividade_criada`, `atividade_atualizada`, `atividade_iniciada` ou `atividade_estado_alterado`. A Timeline recebe apenas o Lead quando existente, porque e o unico vinculo canonico suportado por seu schema atual. Descricoes sao genericas, sem UUIDs, nomes, contatos, documentos, valores ou payload. Falha do evento reverte a operacao integralmente.

Edicao e transicoes usam concorrencia otimista sem retry ou ultima gravacao vencedora. Nenhuma RPC altera Lead, Atendimento, Negocio, Imovel, Pessoa, Kanban ou Agenda. As RPCs nao concluem, cancelam, reabrem ou arquivam Atividades.

O contrato `lib/crm/atividades/rpc-contracts.ts` centraliza payloads, retornos, mensagens sanitizadas, UUID/timestamp, limite de observacao e transicoes abertas. A Sprint 3C3B deve tratar conclusao, cancelamento e eventual reabertura administrativa com autoria, timestamps, concorrencia e Timeline atomica.
