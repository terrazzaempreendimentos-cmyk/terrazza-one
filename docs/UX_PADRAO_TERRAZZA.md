# UX Padrao Terrazza One

Este documento define o padrao visual e operacional do Terrazza One. O objetivo e manter o produto coeso, profissional e agradavel de usar sem alterar regras de negocio.

## Principio central

O CRM deve ser util mesmo sem IA. A inteligencia apoia a operacao, mas a experiencia principal precisa funcionar para cadastro, atendimento, agenda, pipeline, timeline, roleta e manutencoes.

## Cabecalhos

Paginas principais devem iniciar com:

- Badge curto do modulo quando fizer sentido.
- Titulo claro e direto.
- Subtitulo curto explicando a funcao da tela.
- Acao principal destacada no lado direito ou abaixo do texto em telas menores.

Exemplos de badge:

- Dashboard.
- Cadastros.
- CRM Comercial.
- UCE.
- Inteligencia.
- Administracao.

## Botoes

Primario:

- Usar azul profundo `#071E36`.
- Texto branco.
- Usar para Salvar, Novo, Criar e Cadastrar.

Secundario:

- Fundo branco ou `#F7F3ED`.
- Borda `#E8DDCB`.
- Texto `#071E36`.
- Usar para Cancelar, Voltar e Limpar filtros.

Perigo:

- Fundo vermelho claro.
- Borda vermelha clara.
- Texto vermelho.
- Usar para Excluir e Desativar.

Acoes:

- Botoes compactos em formato badge/pill.
- Usar para Editar, Visualizar, Duplicar e Compartilhar.

## Cards

Cards devem manter:

- Fundo branco.
- Borda suave `#E8DDCB`.
- Raio visual consistente entre `rounded-2xl` e `rounded-3xl`.
- Sombra discreta.
- Titulo curto.
- Valor principal em destaque quando for card de metrica.
- Descricao curta com texto secundario.
- Badge opcional para status, origem ou modulo.

## Badges

Badges devem ser curtos, legiveis e previsiveis.

Categorias padrao:

- Status.
- Temperatura.
- Prioridade.
- Origem.
- Finalidade.
- Tipo.
- Ativo/Inativo.
- Em breve.
- UCE.
- Premium.

Paleta recomendada:

- Azul profundo para status principal.
- Dourado discreto para premium, destaque e modulo.
- Verde para ativo/concluido.
- Ambar para pendente/medio.
- Vermelho para perigo, urgente ou erro.
- Cinza para inativo, rascunho ou indisponivel.

## Formularios

Formularios devem ter:

- Labels sempre visiveis.
- Placeholders curtos e exemplos reais.
- Campos obrigatorios claros.
- Mensagens de erro amigaveis.
- Secoes com titulo quando o formulario for longo.
- Abas quando a entidade tiver muitos blocos.
- Espacamento confortavel.
- Rodape fixo com acoes quando o formulario for longo.

Textos de erro devem explicar o problema sem culpar o usuario.

## Feedback

Estados esperados:

- Salvando...
- Salvo com sucesso.
- Erro ao salvar.
- Registro excluido.
- Validacao pendente.
- Nenhum resultado encontrado.
- Carregando.

Quando a acao real ainda nao existir, usar badge ou botao desabilitado com "Em breve".

## Filtros

Filtros devem seguir:

- Busca textual primeiro.
- Selects em seguida.
- Botao primario para aplicar.
- Botao secundario para limpar filtros.
- Contagem de resultados visivel.
- Filtros aplicados indicados quando possivel.

## Tabelas e listas

Preferir cards/listas responsivas quando houver muitos metadados. Acoes devem ficar alinhadas no rodape do card ou na ultima coluna.

Estados vazios devem ser amigaveis e objetivos:

- "Nenhum resultado encontrado para os filtros atuais."
- "Nenhum registro cadastrado ainda."
- "Esta area esta preparada para dados futuros."

## Sidebar

Ordem final:

- Dashboard.
- Cadastros.
- CRM.
- UCE.
- Inteligencia.
- Administracao.

Cadastros:

- Pessoas.
- Proprietarios.
- Inquilinos.
- Imoveis.
- Corretores.
- Parceiros.

CRM:

- Visao Geral.
- Leads.
- Atendimentos.
- Negocios.
- Kanban.
- Agenda Inteligente.
- Timeline.
- Atividades.
- Roleta Inteligente.
- Manutencoes e Conflitos.

## Nomenclatura

A interface deve estar em portugues. Evitar termos tecnicos em ingles quando houver equivalente claro.

Termos oficiais:

- UCE Memoria.
- UCE Conhecimento.
- UCE Correspondencias.
- UCE Aprendizado.
- UCE Perfil.
- Agenda Inteligente.
- Roleta Inteligente.
- Manutencoes e Conflitos.
- Inteligencia.

## Responsividade

Telas devem funcionar bem em notebooks e telas menores:

- Cards empilham antes de ficarem espremidos.
- Formularios longos usam grid responsivo.
- Acoes importantes continuam acessiveis.
- Sidebar deve permanecer legivel e com labels truncados quando necessario.
