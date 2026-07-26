# CRM Pessoas

O Cadastro Universal de Pessoas e a base futura de relacionamento do CRM Terrazza. Ele permite que uma mesma pessoa tenha varios papeis comerciais e operacionais sem duplicar cadastros.

## Estrutura do cadastro

O cadastro possui blocos principais:

- Dados principais: nome, tipo de pessoa, CPF/CNPJ, RG/IE, nascimento, estado civil e profissao.
- Contatos: email, telefone, celular e WhatsApp.
- Endereco: CEP, endereco, numero, complemento, bairro, cidade e estado.
- Papeis no CRM: proprietario, inquilino, comprador, vendedor, corretor, parceiro, prestador e investidor.
- Relacionamento: origem, status, responsavel, temperatura e score de relacionamento.
- UCE: resumo, perfil comportamental e observacoes.
- Observacoes gerais.

## Identidade e papeis canonicos

`public.pessoas` e a fonte unica de identidade comercial. Proprietario,
inquilino, corretor e demais classificacoes sao papeis acumulaveis da mesma
Pessoa. Usuarios de acesso e `usuarios_perfis.papel` permanecem separados e nao
representam papeis comerciais.

`pessoas.papeis` e a fonte operacional canonica nesta fase. A tabela
`pessoa_papeis` permanece vazia e nao operacional ate uma decisao futura de
migracao; o codigo nao grava nas duas estruturas em paralelo.

Retirar um papel nao exclui a Pessoa. Quando uma visao especializada remove o
unico papel existente, a Pessoa e arquivada; com outros papeis, somente o papel
daquela visao e retirado. Arquivar a Pessoa central a torna indisponivel em
todas as visoes.

## Pessoas como cadastro matriz

A partir do CRM-2.6, Pessoas passa a ser o cadastro matriz para novos registros de relacionamento.

- Proprietarios e uma visao filtrada de pessoas ativas com papel `proprietario`.
- Inquilinos e uma visao filtrada de pessoas ativas com papel `inquilino`.
- Corretores e uma visao filtrada de pessoas ativas com papel `corretor`.
- A edicao nessas telas atualiza o registro em `pessoas`.
- A exclusao operacional remove apenas o papel correspondente quando a pessoa possui multiplos papeis.
- Retirar o ultimo papel mantem a Pessoa ativa, sem papel comercial, para evitar
  que a classificacao arquive implicitamente a identidade central.

As tabelas `proprietarios`, `inquilinos` e `corretores` estao congeladas. Elas
permanecem no schema apenas para constraints e relacionamentos historicos; nao
recebem novos cadastros nem atualizacoes por fluxos de identidade da aplicacao.

## Imoveis

Imoveis continuam sendo uma entidade propria. O vinculo legado `imoveis.proprietario_id` ainda aponta para a tabela antiga de proprietarios.

Novos vinculos de proprietarios usam exclusivamente `imovel_proprietarios`,
referenciando `pessoas.id`. O campo `imoveis.proprietario_id` nao e preenchido
por novos fluxos e permanece apenas como coluna de compatibilidade estrutural.

Campos historicos `responsavel_id`, `proprietario_id`, `inquilino_id` e
`corretor_id` que ainda possuem FK para tabelas legadas nao devem receber IDs de
Pessoa sem migration propria. Agenda, Timeline e Manutencoes mantem esses
campos somente para leitura/compatibilidade ate a evolucao do schema.

## Leads e Roleta

O futuro `leads.responsavel_id` deve apontar para uma Pessoa com papel
`corretor`. A Roleta ja seleciona somente Pessoas-corretoras, mas a persistencia
canonica dessa identidade depende de migration: nomes textuais e
`public.corretores` nao devem orientar o novo schema.

## Relacao com modulos futuros

Pessoas devera se conectar futuramente com:

- Imoveis.
- Negocios.
- Leads.
- Atendimentos.
- Timeline.
- UCE Memoria.
- Documentos.
- WhatsApp.

## Exclusao logica

Pessoas seguem o padrao oficial de CRUD operacional:

- Nao usar delete fisico.
- Excluir significa atualizar `ativo=false`.
- Atualizar `updated_at`.
- Pedir confirmacao antes da exclusao.
- Manter o registro recuperavel para historico e auditoria.

## Proximos passos

1. Definir estrategia de migracao sem apagar dados antigos.
2. Relacionar imoveis e negocios diretamente ao cadastro universal.
3. Consolidar campos especificos de inquilino e corretor sem duplicar pessoas.
4. Integrar atendimentos, timeline e UCE Memoria.
5. Preparar identificacao por telefone/WhatsApp para reduzir duplicidade.
