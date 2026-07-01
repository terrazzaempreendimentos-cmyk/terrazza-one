# Modulo Imoveis Premium

O Modulo Imoveis Premium transforma o cadastro imobiliario em uma entidade operacional completa do CRM Terrazza.

## Arquitetura

Imovel e uma entidade propria. Ele concentra dados comerciais, localizacao, proprietarios, financeiro, caracteristicas, documentacao, midia, publicacao, relacionamentos, timeline, manutencoes e inteligencia futura.

A estrutura principal continua em `imoveis`, expandida pelo SQL:

- `supabase/sql/015_expand_imoveis_premium.sql`

O relacionamento com proprietarios passa a usar a tabela:

- `imovel_proprietarios`

Essa tabela permite um ou varios proprietarios por imovel, sempre apontando para `pessoas`.

## Pessoas como base

Proprietarios devem vir do Cadastro Universal de Pessoas. A tela de Imoveis busca pessoas ativas cujo papel contenha `proprietario`.

As tabelas antigas continuam existindo apenas como compatibilidade. O campo legado `imoveis.proprietario_id` segue aceito para registros antigos, mas novos relacionamentos premium devem usar `imovel_proprietarios`.

## Abas do cadastro

O cadastro foi organizado em secoes/abas operacionais:

- Dados gerais.
- Localizacao.
- Proprietarios.
- Comercial.
- Financeiro.
- Caracteristicas.
- Documentacao.
- Fotos e Midia.
- Publicacao.
- Relacionamentos.
- Timeline.
- Manutencoes.
- Inteligencia.

Essa organizacao evita formularios gigantes e aproxima o CRM de uma experiencia corporativa.

Na fase final, a aba Comercial foi separada da aba Financeiro. Comercial organiza posicionamento, disponibilidade, origem, responsavel e leitura operacional; Financeiro fica dedicado a valores, taxas, comissoes e condicoes de negociacao.

## Listagem

A listagem passa a usar cards premium com:

- Foto ou placeholder.
- Codigo.
- Complemento.
- Titulo.
- Bairro e cidade.
- Valor principal.
- Tipo.
- Dormitorios.
- Garagens.
- Status.
- Proprietario principal.
- Responsavel.
- Acoes de visualizar, editar, duplicar, compartilhar e excluir logicamente.

## Busca e filtros

A busca considera codigo, titulo, bairro, cidade, proprietario, responsavel, status, finalidade e tipo.

Na fase final, a busca tambem considera complemento, para localizar rapidamente unidades, salas, apartamentos e referencias internas.

Os filtros incluem tipo, finalidade, cidade, bairro, faixa de valor, dormitorios, garagem, piscina, pet, condominio, status e responsavel.

## CRUD

O modulo suporta:

- Criar imovel.
- Editar imovel.
- Excluir logicamente com `ativo=false`.
- Duplicar imovel.
- Visualizar resumo operacional.
- Compartilhar dados essenciais por acao simples de e-mail, sem integracao externa.

Na edicao, o rodape fixo concentra as acoes operacionais: Cancelar, Salvar, Duplicar e Excluir logicamente.

## Campos profissionais e unicidade

O cadastro profissional de imoveis usa regras de consistencia antes de salvar e tambem respeita os indices unicos do Supabase.

- `codigo` e obrigatorio e unico entre imoveis ativos.
- `complemento` e obrigatorio para diferenciar unidades, salas, apartamentos ou referencias internas.
- `titulo` continua editavel manualmente, mas quando estiver vazio e o complemento for informado, o sistema usa o complemento como titulo inicial.
- `matricula` e opcional.
- Quando preenchida, `matricula` deve ser unica entre imoveis ativos.
- Em edicao, o proprio codigo e a propria matricula do imovel atual podem ser mantidos.
- Exclusao operacional segue o padrao de exclusao logica com `ativo=false`.

Caso o banco bloqueie uma duplicidade por indice unico, a tela deve apresentar mensagem clara para codigo ou matricula duplicada.

## Caracteristicas complementares

A tela ja apresenta caracteristicas estruturais salvas no cadastro atual, como piscina, academia, varanda, churrasqueira, energia solar, mobiliado, aceita pet, portaria, vista mar, frente mar e acessibilidade.

Tambem exibe uma area de caracteristicas complementares preparada para evolucao futura, incluindo closet, escritorio, deposito, dependencia, despensa, lavanderia, home office, home theater, adega, area gourmet, jardim e quintal. Esses itens aparecem como preparacao visual e nao criam novas colunas nesta fase.

## Integracoes futuras

O modulo conversa conceitualmente com:

- Cadastro Universal de Pessoas.
- Proprietarios.
- Leads.
- Timeline.
- Manutencoes.
- CRM.
- UCE Memoria e inteligencia futura.

Nesta fase, nao existe integracao com UCE, OpenAI, WhatsApp ou n8n.

## SQL necessario

Antes de usar os novos campos em producao, aplicar:

```sql
supabase/sql/015_expand_imoveis_premium.sql
```

O SQL adiciona colunas premium em `imoveis`, cria `imovel_proprietarios` e adiciona indices operacionais.

Para a fase final desta sprint, nao ha SQL novo. A tela usa a estrutura premium ja prevista e respeita as restricoes de codigo, complemento e matricula.
