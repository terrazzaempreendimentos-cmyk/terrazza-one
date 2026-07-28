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

A pagina da Roleta e uma tela operacional: apresenta indicadores, resumo compacto
da equipe, fila automatica, atendimentos atribuidos, transferencia e historico.
A configuracao completa fica em `/dashboard/corretores`, junto da identidade e
dos dados comerciais da Pessoa-corretora. Somente administrador com
`configuracoes.administrar` consulta ou modifica pesos, capacidade, filtros e
observacoes. Gestor pode distribuir e transferir, mas recebe apenas a mensagem
operacional de que a configuracao e administrada pela gestao.

Cada card preserva os valores em erros esperados, bloqueia duplo envio e usa
controle otimista de concorrencia por `updated_at`. Retirar da Roleta usa
`participa_roleta=false`; pausa temporaria usa `disponivel=false`. Nao existe
DELETE de configuracao.

Pessoa ativa que recebe papel `corretor` nao ganha configuracao automaticamente:
ela aparece como `Configuracao da Roleta pendente`, com valores visuais iniciais
fora da Roleta, indisponivel, peso 1, capacidade sem limite e filtros vazios. Esses
valores somente sao persistidos quando o administrador salva conscientemente.

Os quatro estados visuais sao `Disponivel na Roleta` (participa e disponivel),
`Pausado` (participa e indisponivel), `Fora da Roleta` (nao participa) e
`Configuracao da Roleta pendente` (registro inexistente). Retirar o papel corretor
nao apaga configuracao; a RPC deixa de considerar a Pessoa elegivel e a pagina
administrativa alerta sobre configuracoes participantes sem Pessoa-corretora ativa.
Controle de disponibilidade pelo proprio corretor permanece evolucao futura.

Ainda nao existem horarios, pausas programadas, metas, integracao
com WhatsApp ou distribuicao por webhook.

## Reatribuicao manual

Distribuicao escolhe o primeiro responsavel para um Lead ainda nao atribuido.
Reatribuicao transfere deliberadamente um Lead operacional ja atribuido entre
duas Pessoas-corretoras. Administrador e gestor podem executar a transferencia,
sempre com motivo entre 3 e 500 caracteres.

A reatribuicao preserva etapa, status operacional, status legado, handoff e todo
o historico anterior. Uma nova linha em `roleta_distribuicoes` registra
estruturalmente responsavel anterior, novo responsavel, motivo, timestamp e o
criterio `reatribuicao_manual`. A Timeline recebe obrigatoriamente um evento
`lead_reatribuido`; falha em qualquer escrita reverte toda a operacao.

Por ser uma decisao excepcional autorizada, o novo responsavel precisa ser uma
Pessoa ativa com papel `corretor`, mas nao precisa participar da Roleta automatica,
estar disponivel nela ou respeitar peso, filtros e capacidade configurada.

A RPC exige o responsavel esperado e bloqueia o Lead com `FOR UPDATE`. Se outra
operacao alterar o responsavel enquanto a transferencia aguarda, ela falha sem
sobrescrever silenciosamente. A etapa atual deve estar entre atendimento,
visita/avaliacao, proposta, negociacao ou documentacao.

A interface de transferencia esta disponivel no detalhe real do Lead e no bloco
`Atendimentos atribuidos` da Roleta. Ela e exibida somente a administrador e
gestor com `leads.distribuir` e `leads.editar`, exige nova Pessoa-corretora e
motivo, preserva os campos em erros esperados e usa exclusivamente a RPC
`reatribuir_lead_corretor`. Corretor e atendimento nao recebem o controle.

O historico distingue distribuicao inicial de reatribuicao e, nesta ultima,
exibe responsavel anterior e atual por FKs explicitas de `pessoas`. Motivo e
descricao administrativa de Timeline ficam restritos aos perfis autorizados a
transferir. Capacidade e disponibilidade da Roleta automatica nao bloqueiam a
decisao manual autorizada. O `handoff_status` atual continua preservado.

As policies atuais documentadas na migration 019 ainda limitam SELECT de Leads,
Pessoas, Roleta e Timeline ao administrador. Portanto, o gestor possui permissao
na aplicacao, mas podera receber bloqueio do RLS ate uma evolucao especifica das
policies; a interface nao contorna esse limite e nao usa credencial administrativa.

## Testes manuais planejados

1. Administrador ve o botao.
2. Gestor ve o botao, sujeito a limitacao RLS conhecida.
3. Corretor nao ve o botao.
4. Atendimento nao ve o botao.
5. Lead sem responsavel nao oferece transferencia.
6. Lead em etapa inelegivel nao oferece transferencia.
7. Lead fechado, perdido ou arquivado nao oferece transferencia.
8. Motivo vazio e rejeitado preservando o formulario.
9. Motivo curto e rejeitado preservando o formulario.
10. Motivo excessivo e rejeitado preservando o formulario.
11. Nova Pessoa inexistente e rejeitada.
12. Pessoa inativa e rejeitada.
13. Pessoa sem papel corretor e rejeitada.
14. Mesmo responsavel e rejeitado.
15. Reatribuicao valida pelo detalhe do Lead.
16. Reatribuicao valida pela Roleta.
17. Etapa permanece inalterada.
18. Status permanece inalterado.
19. Responsavel canonico e atualizado.
20. Historico original e preservado.
21. Novo historico de reatribuicao e criado.
22. Evento obrigatorio e criado na Timeline.
23. Pessoa fora da Roleta automatica pode receber a transferencia.
24. Duas abas transferindo o mesmo Lead geram divergencia do responsavel esperado.
25. Falha da Timeline causa rollback integral.
26. Pessoa historica indisponivel usa fallback seguro sem ocultar o evento.
27. Leads, detalhe, Roleta, Kanban e Timeline sao revalidados no sucesso.

## Testes manuais planejados da reorganizacao

1. Administrador abre Roleta e nao ve formularios extensos.
2. Resumo compacto apresenta totais.
3. Botao leva para Corretores.
4. Administrador abre configuracao de uma Pessoa.
5. Salva configuracao existente.
6. Cria configuracao ausente.
7. Apenas um formulario fica expandido.
8. Pessoa pendente permanece fora da Roleta.
9. Pessoa disponivel recebe badge correto.
10. Pessoa pausada recebe badge correto.
11. Pessoa fora da Roleta recebe badge correto.
12. Retirada do papel nao apaga configuracao.
13. Gestor nao ve formulario administrativo.
14. Corretor nao ve formulario.
15. Roleta continua distribuindo.
16. Transferencia continua funcionando.
17. Historico continua funcionando.
18. Erro preserva o formulario.
19. Duplo envio permanece bloqueado.
20. Layout funciona em tela menor.
