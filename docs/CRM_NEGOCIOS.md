# Contrato canonico de Negocios

## Estado real no repositorio

A rota real e `/dashboard/crm/negocios`. Ela exige `negocios.visualizar`, mas usa
quatro objetos locais ficticios e quatro pipelines locais. Nao consulta Supabase,
nao possui Server Action e nao chama RPC. Os botoes de criacao, edicao, movimento e
exclusao logica estao desabilitados.

O dashboard do CRM nao consulta Negocios: calcula os indicadores "Propostas abertas"
e "Negocios em negociacao" a partir de estados legados de Leads. A sidebar possui
link para a rota. A pagina de Pessoa e Atividades exibem apenas placeholders ou
mocks textuais relacionados a Negocio.

As buscas locais encontraram zero consultas, inserts, updates, deletes ou RPCs sobre
`negocios`, e zero referencias a `negocio_id` no modelo operacional. Valores e
comissoes encontrados pertencem ao cadastro de Imovel, nao a uma operacao comercial.

## Schema confirmado e lacunas

Nenhuma migration anterior cria ou altera `public.negocios`. A verificacao manual
no Supabase real retornou `NULL` para `to_regclass('public.negocios')`, confirmando
que a tabela nao existe e que nao ha schema ou registros legados a preservar.

A consulta somente de leitura abaixo permanece como roteiro independente de
diagnostico e verificacao estrutural.

```sql
-- DIAGNOSTICO SOMENTE DE LEITURA — NAO EXECUTADO PELO CODEX
select
  to_regclass('public.negocios') as tabela_negocios;

-- Execute a contagem somente se a consulta anterior retornar public.negocios.
-- select count(*) as quantidade_registros from public.negocios;

select
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default,
  character_maximum_length,
  numeric_precision,
  numeric_scale
from information_schema.columns
where table_schema = 'public'
  and table_name = 'negocios'
order by ordinal_position;

select
  constraint_name,
  constraint_type,
  pg_get_constraintdef(pc.oid, true) as definicao
from information_schema.table_constraints tc
join pg_catalog.pg_constraint pc
  on pc.conname = tc.constraint_name
 and pc.conrelid = to_regclass('public.negocios')
where tc.table_schema = 'public'
  and tc.table_name = 'negocios'
order by constraint_type, constraint_name;

select
  con.conname as foreign_key,
  pg_get_constraintdef(con.oid, true) as definicao
from pg_catalog.pg_constraint con
where con.conrelid = to_regclass('public.negocios')
  and con.contype = 'f'
order by con.conname;

select
  indexname,
  indexdef
from pg_catalog.pg_indexes
where schemaname = 'public'
  and tablename = 'negocios'
order by indexname;

select
  c.relrowsecurity as rls_ativado,
  c.relforcerowsecurity as rls_forcado
from pg_catalog.pg_class c
where c.oid = to_regclass('public.negocios');

select
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_catalog.pg_policies
where schemaname = 'public'
  and tablename = 'negocios'
order by policyname;

select
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'negocios'
order by grantee, privilege_type;
```

## Definicao canonica

Negocio e a unidade comercial que representa uma operacao imobiliaria concreta em
negociacao ou formalizacao, vinculada a um Lead, podendo envolver Imovel, partes,
responsavel, valores, proposta, contrato e fechamento.

## Fronteiras dos modulos

- **Lead:** oportunidade e interesse ainda em qualificacao ou conducao.
- **Atendimento:** acompanhamento operacional, comunicacao, espera e conducao humana.
- **Negocio:** operacao concreta, proposta, negociacao, documentacao, contrato e fechamento.
- **Imovel:** ativo imobiliario relacionado, quando aplicavel.
- **Pessoa:** identidade canonica de todas as partes e do responsavel.
- **Atividade:** acao futura executavel.
- **Agenda:** visao temporal de Atividades e compromissos.
- **Timeline:** historico imutavel de eventos.

Nao existe sincronizacao automatica proposta entre Lead, Atendimento, Kanban ou
Negocio. Cada mudanca futura precisa de regra e RPC explicitas.

## Identidade e relacionamentos propostos

- `negocios.id`: UUID proprio;
- `negocios.lead_id -> leads.id`: recomendado como obrigatorio no primeiro nucleo;
- `negocios.atendimento_id -> atendimentos.id`: opcional e sem inferencia;
- `negocios.imovel_id -> imoveis.id`: opcional conforme o tipo;
- `negocios.responsavel_id -> pessoas.id`: Pessoa responsavel canonica;
- partes da operacao: sempre `pessoas.id`.

Nao usar tabelas legadas `corretores`, `proprietarios` ou `inquilinos`, nem nome,
telefone, e-mail ou metadata Auth como identidade.

### Modelo de partes

Colunas fixas como `comprador_id`, `vendedor_id`, `locatario_id` e `proprietario_id`
sao simples, mas nao representam coparticipacao, multiplos proprietarios ou papeis
adicionais sem proliferar colunas e regras nulas.

A decisao aprovada e `negocios_partes`, com UUID, `negocio_id`, `pessoa_id`, papel
controlado, indicador de parte principal, estado logico e timestamps. Esse modelo
suporta varias Pessoas por papel e preserva o historico. Os papeis iniciais sao
`proprietario`, `vendedor`, `comprador`, `locador`, `locatario`, `contratante`,
`parceiro` e `outro`.

## Tipos de Negocio

Os tipos definitivos do MVP sao `venda`, `locacao`, `administracao` e `outro`.
Captacao e avaliacao sao processos anteriores em Lead, Atendimento ou Atividade.
Parceria nao e tipo: podera ser origem, caracteristica ou participacao futura.

## Etapas e status

Etapas operacionais propostas, ordenadas e independentes do Kanban de Leads:

1. `estruturacao`;
2. `proposta`;
3. `negociacao`;
4. `documentacao`;
5. `contrato`;
6. `assinatura`.

Assinatura permanece provisoriamente separada porque representa a formalizacao, nao
a preparacao do contrato. `concluido`, `perdido` e `cancelado` nao sao etapas: sao
status. Isso evita duplicidade semantica.

Status aprovados:

- `ativo`: sempre acompanhado de uma etapa operacional;
- `concluido`: fechamento com resultado e timestamp;
- `perdido`: insucesso comercial com resultado, motivo e timestamp;
- `cancelado`: encerramento administrativo com resultado, motivo e timestamp.

Arquivamento logico usa `ativo = false`, preservando o status final verdadeiro,
resultado e datas. Nenhuma operacao futura pode alterar Negocio inativo.

## Resultados

Conclusao provisoria: `venda_fechada`, `locacao_fechada`,
`administracao_contratada`, `parceria_concluida`, `outro`.

Perda provisoria: `preco`, `documentacao`, `imovel_indisponivel`,
`proprietario_desistiu`, `cliente_desistiu`, `concorrencia`,
`financiamento_reprovado`, `sem_acordo`, `outro`.

Cancelamento provisorio: `duplicidade`, `cadastro_incorreto`, `operacao_invalida`,
`solicitacao_administrativa`, `outro`.

Perdido significa que uma operacao comercial valida nao foi concretizada. Cancelado
significa que o registro nao deve continuar por motivo administrativo ou de
enquadramento. Os catalogos ainda exigem aprovacao operacional.

## Valores e comissoes

### MVP comercial

- valor anunciado, proposto, negociado e fechado;
- moeda, inicialmente BRL;
- comissao percentual prevista;
- comissao prevista e efetiva;
- condicoes de pagamento em texto controlado;
- sinal e indicacao de financiamento;
- observacao financeira comercial limitada.

Valor fechado e comissao efetiva somente fazem sentido no encerramento. Comissao
prevista pode ser calculada a partir de percentual e base, mas o valor calculado
precisa de regra de arredondamento e autoridade definidas.

### Futuro ou fora do CRM

Honorarios e taxas podem ser registrados como previsao futura. Parcelas, contas a
pagar/receber, conciliacao, fluxo bancario, emissao fiscal, repasse e contabilidade
pertencem a modulo financeiro/ERP e nao ao nucleo de Negocios.

## Datas

Essenciais: `created_at`, `updated_at`, `aberto_em`, `proposta_em`,
`previsao_fechamento`, `fechado_em`, `perdido_em`, `cancelado_em`.

Possiveis: `contrato_enviado_em`, `contrato_assinado_em`, `inicio_vigencia`,
`fim_vigencia`, `entrega_chaves_em`.

Futuras e financeiras: vencimentos, parcelas e repasses. Nenhuma data foi adicionada
ao banco nesta sprint.

## Transicoes propostas

O helper puro permite avancos sequenciais e retornos controlados entre etapas:

- estruturacao -> proposta;
- proposta -> estruturacao | negociacao;
- negociacao -> proposta | documentacao;
- documentacao -> negociacao | contrato;
- contrato -> documentacao | assinatura;
- assinatura -> contrato.

Conclusao parte provisoriamente de assinatura e exige resultado. Perda e cancelamento
partem de estado ativo e exigem motivo e resultado de seus catalogos. Mesmo estado,
saltos arbitrarios, registro inativo e retorno de qualquer estado final sao
rejeitados. Arquivamento requer operacao administrativa propria futura.

## Encerramento e reabertura

Conclusao, perda e cancelamento devem preencher campos e timestamps coerentes sem
apagar o historico. Reabrir o mesmo registro simplifica consultas, mas mistura dois
ciclos comerciais e dificulta auditoria de valores e partes.

A recomendacao e criar novo Negocio vinculado por `negocio_anterior_id`, preservando
o anterior final. A reabertura deve ser exclusiva de administrador/gestor, exigir
motivo e fotografia de concorrencia, e impedir dois Negocios ativos equivalentes
conforme chave comercial ainda a definir.

## Concorrencia e atomicidade futuras

Cada RPC futura deve usar `SECURITY DEFINER`, `search_path = pg_catalog`,
`auth.uid()`, perfil ativo, `FOR UPDATE` e comparacao de `updated_at`. A operacao deve
executar uma mutacao canonica e um evento obrigatorio de Timeline na mesma transacao.
Falha da Timeline reverte tudo. Frontend nunca envia papel ou usuario, e o retorno
deve conter somente campos minimos.

## Permissoes

Existem hoje: `negocios.visualizar`, `negocios.criar`, `negocios.editar`,
`negocios.concluir`, `negocios.perder`, `negocios.cancelar`, `negocios.reabrir` e
`negocios.arquivar`. Administrador e gestor possuem todas; corretor e atendimento
possuem apenas visualizacao. As actions exigem a permissao especifica e perfil ativo
administrador ou gestor antes de ler o formulario.

Corretor poderia operar somente atribuidos depois de ownership seguro. Atendimento
teria apenas leitura relacionada, sem encerramento administrativo.

## Ownership e RLS

`usuarios_perfis.user_id` identifica Auth e `pessoas.id` identifica a Pessoa
operacional, mas nao existe vinculo canonico entre ambos. Nao inferir por nome,
e-mail, telefone, metadata ou papel. Enquanto esse vinculo faltar, nao liberar
escopo proprio nem criar policy aproximada. Pelas policies atualmente documentadas,
administrador e o unico perfil plenamente suportado para operacao direta nas tabelas.

## Decisoes pendentes

1. Assinatura permanece etapa propria apos validacao operacional?
2. Regras adicionais que diferenciam perdido e cancelado.
3. Valores obrigatorios por tipo.
4. Base, percentual e arredondamento de comissao.
5. Resultado de conclusao permitido por tipo.
6. Permitir criacao manual desde a primeira versao?
7. Regra futura de criacao a partir de Atendimento.
8. Poderes e escopo do corretor.
9. Visibilidade do perfil atendimento.
10. Precondicoes para arquivamento logico.

## Direcao da proxima migration

A auditoria real confirmou que a tabela nao existe. A migration preparada,
`032_negocios_core_canonico.sql`, cria `negocios` e `negocios_partes` vazias, usa
Pessoas canonicas, separa etapa/status/resultado, preserva arquivamento em `ativo`,
adiciona timestamps, checks, FKs, indices, RLS fail-closed e policies exclusivas do
administrador. Ela nao cria RPC nem automacao com Lead, Atendimento ou Kanban e nao
foi aplicada nesta sprint.

## Sprint 3B3A: RPCs de Negocios ativos

A migration `033_negocios_rpc_ativos.sql` prepara tres operacoes atomicas:

- `criar_negocio(p_payload jsonb, p_partes jsonb)`;
- `atualizar_negocio(p_negocio_id uuid, p_updated_at_esperado timestamptz, p_payload jsonb, p_partes jsonb)`;
- `movimentar_negocio(p_negocio_id uuid, p_etapa_destino text, p_updated_at_esperado timestamptz, p_observacao text default null)`.

As funcoes sao `SECURITY DEFINER`, usam `search_path = pg_catalog`, derivam a
identidade de `auth.uid()` e exigem perfil ativo administrador ou gestor por
`usuario_tem_papel`. `PUBLIC` e `anon` nao possuem `EXECUTE`; somente
`authenticated` recebe o grant, ainda sujeito a autorizacao interna.

O payload fechado aceita somente relacionamentos canonicos, tipo, titulo, textos,
moeda, valores, comissoes e datas operacionais previstas no schema. Identidade,
etapa, status, arquivamento, resultado, autoria, encerramento e timestamps
estruturais permanecem sob controle do banco/RPC. Criacao exige Lead, tipo e titulo;
moeda omitida usa `BRL`. Venda, locacao e administracao exigem Imovel ativo.

As partes aceitam apenas `pessoa_id`, `papel`, `principal`,
`participacao_percentual` e `observacoes`. Toda Pessoa enviada deve existir e estar
ativa. Duplicidade por Pessoa/papel e dois principais para o mesmo papel sao
bloqueados. Nao se exige soma de participacoes igual a cem. Temporariamente,
`p_partes = []` e valido porque o Lead ainda nao possui Pessoa interessada canonica.

A criacao bloqueia o Lead, valida os relacionamentos, cria um Negocio, insere as
partes e registra Timeline obrigatoria. A edicao bloqueia o Negocio, compara
`updated_at`, preserva campos omitidos e sincroniza partes sem `DELETE`: removidas
ficam inativas, preservadas sao atualizadas, vinculos historicos podem ser
reativados e novos sao inseridos. O principal e reorganizado antes da nova
fotografia para respeitar o indice unico.

Depois da criacao, `lead_id` e estrutural e imutavel. A edicao sempre usa o Lead
original do Negocio. O mesmo `lead_id` pode ser reenviado por compatibilidade, mas
valor nulo, UUID invalido ou tentativa de troca falha como relacionamento invalido.
Atendimento informado continua obrigado a pertencer ao Lead original, e a Timeline
da edicao sempre referencia esse mesmo Lead.

A movimentacao admite somente avanco ou retorno adjacente entre `estruturacao`,
`proposta`, `negociacao`, `documentacao`, `contrato` e `assinatura`. Mesmo estado,
salto, estado final e registro arquivado falham. Datas comerciais nao sao
preenchidas automaticamente. Edicao e movimentacao usam `FOR UPDATE` e fotografia
de `updated_at`; divergencia falha sem sobrescrita silenciosa.

Timeline usa os eventos `negocio_criado`, `negocio_atualizado` e
`negocio_etapa_alterada`, com referencia ao Lead. A observacao de movimentacao e
opcional, aparada e limitada a 500 caracteres. Quando ausente, a descricao permanece
generica; quando presente, e persistida na descricao da Timeline como conteudo
operacional. Ela nao e registrada em logs. Falha da Timeline reverte toda a
operacao. Os retornos sao minimos e seus validadores fail-closed ficam em
`lib/crm/negocios/rpc-contracts.ts`.

As RPCs nao alteram Lead, Atendimento, Imovel ou Pessoa; nao criam Atividade; nao
concluem, perdem, cancelam, reabrem ou arquivam Negocio; e nao implementam ownership
de corretor. O plano manual cobre autorizacao, allowlists, relacionamentos, partes,
concorrencia, transicoes, falha de Timeline e rollback. A Sprint 3B3B deve conectar
somente essas operacoes ativas na aplicacao.

## Sprint 3B4A: interface operacional ativa

A rota `/dashboard/crm/negocios` deixou de usar mocks e consulta por SSR as tabelas
canonicas `negocios` e `negocios_partes`, com projecoes explicitas e aliases definidos
pelas FKs. A tela organiza todos os estados ativos nas seis etapas canonicas, exibe
indicadores derivados dos valores persistidos, filtros reais e uma secao compacta de
encerrados recentes somente para leitura.

Criacao, edicao e movimentacao usam exclusivamente `criar_negocio`,
`atualizar_negocio` e `movimentar_negocio`. Cada Server Action autoriza antes de ler
`FormData`, valida uma allowlist, cria cliente SSR na execucao, chama exatamente uma
RPC e valida o retorno fail-closed. Nao existe escrita direta em Negocio, partes,
Timeline ou Lead.

O formulario aceita zero ou mais partes formadas apenas por Pessoas ativas. Pessoa,
papel, principal, participacao e observacao sao validados no navegador, novamente na
Action e finalmente na RPC. Atendimento opcional e revalidado contra o Lead, Imovel
obrigatorio por tipo precisa estar ativo e o responsavel usa somente Pessoa com papel
corretor. Nenhuma tabela pessoal legada participa do fluxo.

Na edicao, o registro e consultado especificamente pelo UUID, `ativo = true` e status
operacional ativo. O formulario recebe chave pelo UUID, Lead somente leitura e a
fotografia de `updated_at`. A movimentacao oferece apenas vizinhos definidos no
catalogo central e persiste observacao opcional pela RPC. Concorrencia nao gera retry
nem sobrescrita silenciosa.

Os formularios usam `useActionState`, preservam valores e partes em erro, exibem
mensagem com `role="alert"`, desabilitam o `fieldset` durante o envio e revalidam
somente os caminhos de Negocios, dashboard e detalhe do Lead apos sucesso. Nao ha
sincronizacao automatica com Lead, Atendimento, Kanban, Agenda ou Atividades.

Limitacao de seguranca existente: as RPCs autorizam administrador e gestor, mas as
policies diretas criadas na migration 032 continuam exclusivas do administrador.
Sem ampliar RLS nesta sprint, o gestor pode receber erro nas leituras SSR diretas.
Essa diferenca precisa ser resolvida por migration futura revisada, nunca por bypass
no frontend ou cliente administrativo.

Roteiro manual: validar pagina vazia; criar com e sem partes; validar Atendimento do
mesmo Lead; bloquear Imovel ausente; editar preservando o Lead; trocar principal;
mover para etapa adjacente nos dois sentidos; tentar salto; simular fotografia
desatualizada; verificar Timeline e testar filtros. Encerramento, perda, cancelamento,
reabertura e arquivamento permanecem desconectados ate a Sprint 3B4B.

## Sprint 3B3B: encerramento, reabertura e arquivamento

A migration `034_negocios_rpc_finais.sql` acrescenta `concluir_negocio`,
`perder_negocio`, `cancelar_negocio`, `reabrir_negocio` e `arquivar_negocio`.
Todas usam identidade de `auth.uid()`, perfil ativo administrador/gestor, `SECURITY
DEFINER`, `search_path = pg_catalog`, lock pessimista e fotografia de `updated_at`.
Somente `authenticated` recebe `EXECUTE`; a autorizacao interna continua obrigatoria.

### Status operacional e arquivamento

`status_operacional` descreve o ciclo comercial: `ativo`, `concluido`, `perdido` ou
`cancelado`. A coluna `ativo` representa exclusivamente arquivamento logico. Um
Negocio encerrado normalmente continua com `ativo = true` e pode originar uma
reabertura. `ativo = false` preserva status, etapa, resultado, valores, partes,
datas e autoria, e bloqueia edicao, movimento, encerramento e reabertura.

### Conclusao

A conclusao valida resultado compativel com o tipo e exige partes ativas minimas:

- venda: proprietario ou vendedor, e comprador;
- locacao: proprietario ou locador, e locatario;
- administracao: proprietario ou contratante;
- outro: ao menos uma parte ativa.

Venda e locacao exigem `valor_fechado` final positivo. O valor informado substitui
o persistido; valor nulo preserva o atual. Administracao e outro aceitam valor nulo
ou nao negativo. Comissao efetiva e opcional, nao negativa e preservada quando o
argumento for nulo. A operacao preenche resultado, autoria e timestamp de conclusao
sem alterar etapa, relacionamentos ou partes.

### Perda e cancelamento

Perda e cancelamento usam catalogos distintos e exigem motivo aparado entre 3 e
1.000 caracteres, persistido em `motivo_encerramento`. Observacao opcional de ate
500 caracteres vai somente para a Timeline. O motivo integral de perda ou
cancelamento nao e duplicado automaticamente no evento. Valores, partes, Lead,
Atendimento, Imovel e responsavel permanecem inalterados.

### Reabertura e copia seletiva

Reabrir cria um novo UUID e nunca modifica o Negocio anterior. O anterior deve estar
encerrado, nao arquivado, corresponder a fotografia e ainda nao possuir sucessor. O
indice parcial unico `idx_negocios_negocio_anterior_unico` impede definitivamente
dois sucessores diretos, mas permite cadeias como B -> A e C -> B.

`reabrir_negocio` e o caminho exclusivo para criar um registro com
`negocio_anterior_id`. Depois da migration 034, `criar_negocio` cria somente ciclos
originais: o campo omitido ou enviado como JSON `null` resulta sempre em
`negocio_anterior_id = null`; qualquer outro valor e bloqueado. Assim, nenhuma
criacao generica contorna motivo, fotografia, copia seletiva ou evento de reabertura.

O novo ciclo copia Lead, tipo, Imovel, responsavel, titulo (salvo substituicao),
descricao, observacoes internas, moeda, valor anunciado, comissao percentual e
prevista, condicoes comerciais e observacao financeira. Nao copia Atendimento,
valores de proposta/negociacao/fechamento, comissao efetiva, sinal, financiamento,
datas comerciais, previsao anterior, vigencia, resultado, motivo, encerramento ou
autoria anterior. Inicio e fim de vigencia devem ser informados novamente.

Somente partes ativas sao copiadas, com novos UUIDs e timestamps, preservando Pessoa,
papel, principal, participacao e observacoes. Nenhuma parte do anterior e alterada.
O motivo da reabertura fica somente na Timeline e respeita o limite de 500 caracteres.
Antes da copia, todas as Pessoas dessas partes precisam existir e permanecer ativas.
Uma unica Pessoa ausente ou inativa bloqueia atomicamente a reabertura; nenhuma parte
e descartada, corrigida ou copiada parcialmente.

### Arquivamento, concorrencia e Timeline

Arquivamento exige estado final e motivo entre 3 e 500 caracteres, executa apenas
`ativo = false` e nao desativa partes. Todas as cinco RPCs usam `FOR UPDATE`,
comparam `updated_at`, nao fazem retry e falham sem sobrescrita silenciosa. A
reabertura tambem bloqueia o Lead e converte violacao do indice em mensagem
sanitizada.

Cada operacao registra exatamente um evento obrigatorio: `negocio_concluido`,
`negocio_perdido`, `negocio_cancelado`, `negocio_reaberto` ou
`negocio_arquivado`. Falha da Timeline reverte a mutacao correspondente. Motivos e
observacoes destinados ao evento nao sao registrados em logs.

As RPCs nao alteram Lead ou Atendimento, nao movimentam outros Kanbans, nao criam
Atividade e nao implementam ownership. A Sprint 3B4 futura deve criar a interface
operacional consumindo os contratos fail-closed de `rpc-contracts.ts`.

## Sprint 3B4B: interface de encerramento e preservacao historica

A interface conecta exclusivamente `concluir_negocio`, `perder_negocio`,
`cancelar_negocio`, `reabrir_negocio` e `arquivar_negocio`. Cada Server Action exige
a permissao especifica, confirma perfil administrador ou gestor, valida UUID,
fotografia de `updated_at`, catalogos e limites, executa uma unica RPC e valida o
retorno com o contrato fail-closed. Nao existem INSERT, UPDATE, DELETE, retry ou
escrita direta na Timeline.

Negocios ativos oferecem conclusao, perda e cancelamento. A conclusao orienta sobre
as partes minimas: venda exige proprietario ou vendedor e comprador; locacao exige
proprietario ou locador e locatario; administracao exige proprietario ou contratante;
outro exige ao menos uma parte. A RPC permanece a autoridade definitiva e nenhuma
Pessoa ou parte e criada ou alterada durante o encerramento.

Perda e cancelamento usam catalogos distintos, motivo entre 3 e 1.000 caracteres e
observacao opcional de ate 500. Conclusao usa resultado canonico, valor fechado e
comissao conforme o contrato. Todos os formularios usam `useActionState`, permanecem
montados em erro, bloqueiam duplo envio e exibem somente mensagens catalogadas.

Negocios finais ativos podem ser reabertos quando nao possuem sucessor direto. A
reabertura cria um novo registro exclusivamente pela RPC, preserva o ciclo anterior
e nunca chama `criar_negocio`. A listagem identifica registros originados de ciclo
anterior e registros com ciclo posterior somente por `negocio_anterior_id`, sem
exibir UUIDs. Arquivamento exige motivo entre 3 e 500 caracteres, usa exclusivamente
`arquivar_negocio` e remove logicamente o registro das visoes operacionais sem apagar
status, resultado, valores, partes, datas ou autoria.

Concorrencia nunca gera retry: a divergencia de `updated_at` mostra mensagem segura
e revalida a fotografia atual. Sucesso revalida Negocios, dashboard, lista de Leads e
o detalhe do Lead relacionado. Nenhuma operacao converte ou arquiva Lead, altera
Atendimento, Kanban, Agenda, Atividade, Imovel ou Pessoa. Timeline permanece sob
responsabilidade exclusiva das RPCs.

Roteiro manual: concluir venda/locacao com e sem partes minimas; concluir com valor
obrigatorio; registrar perda; cancelar separadamente; simular `updated_at` obsoleto;
reabrir um encerrado e confirmar novo UUID sem alterar o anterior; bloquear segunda
reabertura; bloquear Pessoa participante inativa; arquivar um encerrado; confirmar
que o arquivado sai das visoes; verificar os cinco eventos correspondentes na
Timeline e confirmar ausencia de mudancas em Lead, Atendimento e Kanban.
