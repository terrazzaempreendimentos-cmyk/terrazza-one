# Roleta operacional do Terrazza CRM

## Fase atual

A Roleta opera com distribuicao canonica automatica. A interface envia somente
o Lead e o motivo opcional; a Pessoa-corretora e calculada exclusivamente pela
RPC `distribuir_lead_roleta_automatica` dentro do PostgreSQL.

Sao elegiveis Pessoas ativas com papel `corretor` e nome valido. Leads precisam
estar ativos, sem responsavel e nas etapas `novo` ou `qualificacao`.

O algoritmo no banco ordena as Pessoas-corretoras por:

1. menor numero de distribuicoes canonicas;
2. quem nunca recebeu Lead;
3. distribuicao mais antiga;
4. nome normalizado;
5. `pessoas.id` como criterio tecnico estavel.

Somente registros com `corretor_pessoa_id` e status `distribuido` entram no
calculo. Dados de `public.corretores` e `corretor_id` legado sao ignorados.

A unica mutacao operacional da aplicacao e a RPC automatica. Ela reutiliza a
RPC manual `distribuir_lead_para_corretor` para atribuir o Lead a `pessoas.id`,
mover para atendimento e registrar historico e Timeline atomicamente. Nao
existe fallback da pagina para a RPC manual.

A escolha usa bloqueio transacional global da Roleta, evitando que duas
distribuicoes automaticas calculem a mesma fotografia de balanceamento.

## Limites atuais

## Pessoa e configuracao operacional

`public.pessoas` continua sendo a identidade canonica. Participacao, disponibilidade,
peso, capacidade e filtros pertencem exclusivamente a `corretores_configuracoes`,
em relacao 1:1 com Pessoa. Nao existe configuracao automatica nem backfill: Pessoa
sem configuracao fica fora da Roleta automatica em modo fail-closed.

Participar exige simultaneamente configuracao com `participa_roleta` e `disponivel`,
Pessoa ativa, papel `corretor`, nome valido, capacidade disponivel e filtros
compativeis.

## Capacidade e filtros

Carga ativa conta Leads canonicos atribuidos, ativos e nas etapas atendimento,
visita/avaliacao, proposta, negociacao ou documentacao. Capacidade nula significa
sem limite; capacidade atingida torna a Pessoa inelegivel.

Arrays vazios de cidades, objetivos ou canais aceitam qualquer valor. Array
preenchido exige correspondencia; campo nulo do Lead somente e aceito quando o
filtro correspondente estiver vazio. Cidade compara trim e caixa, sem fuzzy
matching nem correcao de grafia. Objetivos e canais usam IDs canonicos exatos.

## Peso, desempate e concorrencia

O indice ponderado e `distribuicoes canonicas / peso`; menor indice recebe
primeiro. Peso maior tende a aumentar a participacao, sem prometer proporcao
perfeita em amostras pequenas. Desempates usam menor carga, quem nunca recebeu,
distribuicao mais antiga, nome normalizado e `pessoas.id`.

A RPC automatica usa advisory transaction lock constante e exclusivo da Roleta.
Assim, distribuicoes automaticas concorrentes recalculam sequencialmente a
fotografia global. A RPC manual permanece disponivel e e reutilizada para manter
atribuição, historico e Timeline atomicos. O criterio automatico e a constante
`roleta_automatica`, nunca um valor livre vindo do cliente.

## Limites atuais

A pagina possui painel administrativo para criar e editar configuracoes. Somente
administrador com `configuracoes.administrar` pode consultar ou modificar pesos,
capacidade, filtros e observacoes. Gestor pode distribuir pela RPC protegida,
mas nao consulta detalhes administrativos.

Cada card preserva os valores em erros esperados, bloqueia duplo envio e usa
controle otimista de concorrencia por `updated_at`. Retirar da Roleta usa
`participa_roleta=false`; pausa temporaria usa `disponivel=false`. Nao existe
DELETE de configuracao.

Ainda nao existem horarios, pausas programadas, reatribuicao, metas, integracao
com WhatsApp ou distribuicao por webhook.

## Testes manuais planejados

1. Administrador ve todas as Pessoas-corretoras e gestor nao ve o painel.
2. Corretor e atendimento nao conseguem salvar configuracoes.
3. Criar, editar, pausar e retirar uma configuracao da Roleta.
4. Rejeitar peso, capacidade, cidade duplicada, objetivo e canal invalidos.
5. Rejeitar Pessoa inativa ou sem papel corretor.
6. Validar ausencia de configuracao, indisponibilidade, capacidade e filtros.
7. Distribuir com arrays vazios e com filtros compativeis.
8. Confirmar criterio `roleta_automatica`, Lead em atendimento e Timeline.
9. Executar duas distribuicoes concorrentes e validar serializacao.
10. Validar retorno inesperado fail-closed e gestor sem acesso administrativo.
