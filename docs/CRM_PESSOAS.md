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

1. Mapear campos equivalentes entre pessoas, proprietarios, inquilinos e corretores.
2. Definir estrategia de migracao sem apagar dados antigos.
3. Relacionar imoveis e negocios ao cadastro universal.
4. Integrar atendimentos, timeline e UCE Memoria.
5. Preparar identificacao por telefone/WhatsApp para reduzir duplicidade.
