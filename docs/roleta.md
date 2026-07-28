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

Ainda nao existem distribuicao automatica por webhook, reatribuicao, metas,
disponibilidade por horario, pesos personalizados ou integracao com WhatsApp.
