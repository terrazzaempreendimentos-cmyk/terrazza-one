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

## Papeis

Uma pessoa pode ter multiplos papeis ao mesmo tempo. O campo `papeis` em `pessoas` guarda um array simples para a primeira versao. A tabela `pessoa_papeis` foi criada para evolucao futura com historico e relacoes mais granulares.

## Pessoas como cadastro matriz

A partir do CRM-2.6, Pessoas passa a ser o cadastro matriz para novos registros de relacionamento.

- Proprietarios e uma visao filtrada de pessoas ativas com papel `proprietario`.
- Inquilinos e uma visao filtrada de pessoas ativas com papel `inquilino`.
- Corretores e uma visao filtrada de pessoas ativas com papel `corretor`.
- A edicao nessas telas atualiza o registro em `pessoas`.
- A exclusao operacional remove apenas o papel correspondente quando a pessoa possui multiplos papeis.
- Se a pessoa possui somente aquele papel, a exclusao operacional marca `ativo=false`.

As tabelas antigas seguem existindo para compatibilidade e historico. Nenhuma migracao automatica em massa deve ser executada nesta fase.

## Imoveis

Imoveis continuam sendo uma entidade propria. O vinculo legado `imoveis.proprietario_id` ainda aponta para a tabela antiga de proprietarios.

Para preparar a transicao, o select de proprietario em Imoveis passa a mostrar:

- Pessoas ativas com papel `proprietario`.
- Cadastros legados de proprietarios.

Quando uma Pessoa matriz e escolhida em Imoveis, o sistema cria ou reaproveita um cadastro legado minimo apenas para manter o vinculo atual funcionando. Isso nao substitui uma migracao planejada; e uma ponte de compatibilidade ate a modelagem definitiva.

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
