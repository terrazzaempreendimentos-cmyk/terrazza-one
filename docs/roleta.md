# Roleta operacional do Terrazza CRM

## Fase atual

A Roleta opera com distribuicao canonica assistida. A interface seleciona o
Lead, mas a Pessoa-corretora e calculada exclusivamente no servidor e nao e
enviada pelo navegador.

Sao elegiveis Pessoas ativas com papel `corretor` e nome valido. Leads precisam
estar ativos, sem responsavel e nas etapas `novo` ou `qualificacao`.

O algoritmo ordena as Pessoas-corretoras por:

1. menor numero de distribuicoes canonicas;
2. quem nunca recebeu Lead;
3. distribuicao mais antiga;
4. nome normalizado;
5. `pessoas.id` como criterio tecnico estavel.

Somente registros com `corretor_pessoa_id` e status `distribuido` entram no
calculo. Dados de `public.corretores` e `corretor_id` legado sao ignorados.

A unica mutacao da aplicacao e a RPC `distribuir_lead_para_corretor`, que
atomicamente atribui o Lead a `pessoas.id`, move o Lead para atendimento e
registra o historico da Roleta e a Timeline obrigatoria.

A escolha e deterministica com os dados disponiveis, mas nao garante
balanceamento global perfeito entre requisicoes simultaneas de Leads diferentes,
pois a selecao ocorre antes do bloqueio transacional realizado pela RPC.

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

A infraestrutura ainda nao esta conectada a pagina. Tambem nao existem interface
administrativa de configuracoes, horarios, pausas automaticas, reatribuicao,
metas, integracao com WhatsApp ou distribuicao por webhook.
