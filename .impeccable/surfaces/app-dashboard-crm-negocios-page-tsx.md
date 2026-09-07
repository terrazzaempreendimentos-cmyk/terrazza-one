---
version: 1
slug: "app-dashboard-crm-negocios-page-tsx"
primary_target: "app/dashboard/crm/negocios/page.tsx"
related_targets: ["app/dashboard/crm/negocios/actions.ts","app/dashboard/crm/negocios/operation-forms.tsx"]
---

# Negócios — Kanban

Target: `app/dashboard/crm/negocios/page.tsx`

Approved desktop comp: `.impeccable/mocks/negocios-kanban-trilho-operacional.png`

Approved responsive reference: `.impeccable/mocks/negocios-kanban-mobile-reference.png`

## Direction contract

THESIS: Um trilho operacional horizontal torna o avanço dos Negócios legível e manipulável, recusando a grade de painéis independentes.

OWN-WORLD: Marfim, azul-marinho Terrazza, dourado contido, bordas bege finas, cartões compactos e estados semânticos discretos.

STORY: A equipe filtra a carteira, lê volume/valor/parados por etapa e move somente um passo permitido.

FIRST VIEWPORT: Cabeçalho e indicadores compactos, filtros preservados e quadro dominante com seis colunas, cabeçalhos métricos fixos e cartões densos.

FORM: Desktop usa trilho Kanban horizontal; mobile usa foco por etapa, lista vertical e ações Voltar/Avançar, sem drag.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Boundaries

- Preserve filtros, toggle, contagem, valor total e indicador de estagnação.
- Somente Administrador/Gestor arrastam; Corretor/Atendimento permanecem em leitura.
- Destinos não adjacentes nunca aceitam drop.
- A RPC `movimentar_negocio` permanece autoridade de permissão, transição e concorrência.
- Os comps são referência de composição; dados, textos rasterizados e elementos não existentes no produto não devem ser copiados literalmente.
