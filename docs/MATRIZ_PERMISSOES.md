# Matriz central de permissões

Esta matriz define o catálogo e a intenção de acesso por papel. Ela está aplicada somente ao conjunto inicial de Server Actions não condicionadas descrito abaixo. Ainda não está aplicada às páginas, à sidebar, às demais Server Actions ou ao RLS. Uma tela visível não significa que a autorização por permissão esteja ativa.

Hoje, `requireActiveProfile()` verifica somente se há usuário autenticado com perfil válido e ativo. Os escopos por responsável dependem da futura unificação entre Supabase Auth, Corretores, Pessoas, Leads e os demais registros operacionais. O RLS operacional também ainda não foi criado.

Legenda:

- **Permitido**: incluído na matriz do papel, sem escopo individual previsto nesta etapa.
- **Negado**: não incluído na matriz do papel.
- **Futuro/condicionado**: incluído na matriz, mas dependerá de vínculo e escopo seguro ainda não implementados.

| Módulo/Ação | Administrador | Gestor | Corretor | Atendimento | Escopo futuro |
|---|---|---|---|---|---|
| dashboard.visualizar | Permitido | Permitido | Permitido | Permitido | — |
| pessoas.visualizar | Permitido | Permitido | Permitido | Permitido | Relacionado para corretor, a definir |
| pessoas.criar | Permitido | Permitido | Futuro/condicionado | Permitido | Relacionado ao atendimento do corretor |
| pessoas.editar | Permitido | Permitido | Futuro/condicionado | Permitido | Relacionado ao atendimento do corretor |
| pessoas.arquivar | Permitido | Permitido | Negado | Negado | — |
| corretores.visualizar | Permitido | Permitido | Negado | Negado | — |
| corretores.administrar | Permitido | Permitido | Negado | Negado | — |
| corretores.arquivar | Permitido | Permitido | Negado | Negado | — |
| imoveis.visualizar | Permitido | Permitido | Permitido | Permitido | — |
| imoveis.criar | Permitido | Permitido | Futuro/condicionado | Negado | Próprio/captado pelo corretor |
| imoveis.editar | Permitido | Permitido | Futuro/condicionado | Negado | Próprio/captado pelo corretor |
| imoveis.arquivar | Permitido | Permitido | Negado | Negado | — |
| leads.visualizar | Permitido | Permitido | Futuro/condicionado | Permitido | Atribuído ao corretor |
| leads.criar | Permitido | Permitido | Negado | Permitido | — |
| leads.editar | Permitido | Permitido | Futuro/condicionado | Permitido | Atribuído ao corretor |
| leads.arquivar | Permitido | Permitido | Negado | Negado | — |
| leads.distribuir | Permitido | Permitido | Negado | Negado | — |
| kanban.usar | Permitido | Permitido | Futuro/condicionado | Permitido | Leads atribuídos ao corretor |
| agenda.visualizar | Permitido | Permitido | Futuro/condicionado | Permitido | Própria para corretor |
| agenda.criar | Permitido | Permitido | Negado | Permitido | — |
| agenda.editar | Permitido | Permitido | Futuro/condicionado | Permitido | Própria para corretor |
| timeline.visualizar | Permitido | Permitido | Futuro/condicionado | Permitido | Relacionada ao corretor |
| timeline.criar | Permitido | Permitido | Negado | Permitido | Registrar evento |
| roleta.visualizar | Permitido | Permitido | Permitido | Permitido | Corretor vê somente o resultado, regra futura |
| roleta.usar | Permitido | Permitido | Negado | Negado | Operação da roleta |
| atendimentos.visualizar | Permitido | Permitido | Futuro/condicionado | Permitido | Atribuído ao corretor |
| atendimentos.criar | Permitido | Permitido | Negado | Permitido | — |
| atendimentos.editar | Permitido | Permitido | Futuro/condicionado | Permitido | Atribuído ao corretor |
| atendimentos.assumir | Permitido | Permitido | Futuro/condicionado | Permitido | Atribuição segura a definir |
| negocios.visualizar | Permitido | Permitido | Futuro/condicionado | Permitido | Próprio para corretor |
| negocios.criar | Permitido | Permitido | Negado | Negado | — |
| negocios.editar | Permitido | Permitido | Negado | Negado | — |
| negocios.concluir | Permitido | Permitido | Negado | Negado | — |
| negocios.perder | Permitido | Permitido | Negado | Negado | — |
| negocios.cancelar | Permitido | Permitido | Negado | Negado | — |
| negocios.reabrir | Permitido | Permitido | Negado | Negado | — |
| negocios.arquivar | Permitido | Permitido | Negado | Negado | — |
| atividades.visualizar | Permitido | Permitido | Futuro/condicionado | Permitido | Própria para corretor |
| atividades.criar | Permitido | Permitido | Negado | Permitido | — |
| atividades.editar | Permitido | Permitido | Futuro/condicionado | Permitido | Própria para corretor |
| manutencoes.visualizar | Permitido | Permitido | Futuro/condicionado | Permitido | Atribuída ao corretor |
| manutencoes.criar | Permitido | Permitido | Negado | Negado | — |
| manutencoes.editar | Permitido | Permitido | Negado | Permitido | — |
| manutencoes.arquivar | Permitido | Permitido | Negado | Negado | — |
| ia.usar | Permitido | Permitido | Permitido | Permitido | — |
| ia_conhecimento.visualizar | Permitido | Permitido | Negado | Negado | — |
| ia_conhecimento.criar | Permitido | Permitido | Negado | Negado | — |
| ia_conhecimento.editar | Permitido | Permitido | Negado | Negado | — |
| ia_memorias.visualizar | Permitido | Permitido | Negado | Negado | — |
| ia_memorias.criar | Permitido | Permitido | Negado | Negado | — |
| usuarios.administrar | Permitido | Negado | Negado | Negado | — |
| configuracoes.administrar | Permitido | Negado | Negado | Negado | Configurações críticas |

## Escopos futuros

Os metadados em `FUTURE_PERMISSION_SCOPES` registram os escopos previstos — `proprio`, `atribuido`, `relacionado` e `todos` — sem aplicá-los. A primeira etapa de implementação deverá criar relacionamentos confiáveis e regras de banco para:

- leads atribuídos ao corretor;
- agenda própria do corretor;
- imóveis captados pelo corretor;
- atendimentos atribuídos;
- negócios próprios;
- atividades próprias;
- timeline relacionada;
- manutenções atribuídas.

Até essa infraestrutura existir, essas marcações são documentação de intenção e não uma garantia de isolamento de dados.

## Proteção de páginas e navegação

Todas as páginas atuais sob `/dashboard` exigem no servidor a permissão de visualização correspondente antes de consultar dados. O fluxo diferencia ausência de sessão, perfil pendente/inativo e permissão insuficiente. O simulador, por ser Client Component, usa um layout server-only dedicado.

| Rota | Permissão |
|---|---|
| `/dashboard` | `dashboard.visualizar` |
| `/dashboard/pessoas` e `/dashboard/pessoas/[id]` | `pessoas.visualizar` |
| `/dashboard/proprietarios` e `/dashboard/inquilinos` | `pessoas.visualizar` |
| `/dashboard/corretores` e `/dashboard/crm/corretores` | `corretores.visualizar` |
| `/dashboard/imoveis` | `imoveis.visualizar` |
| `/dashboard/crm` | `dashboard.visualizar` |
| `/dashboard/crm/leads` e `/dashboard/crm/leads/[id]` | `leads.visualizar` |
| `/dashboard/crm/kanban` | `kanban.usar` |
| `/dashboard/crm/agenda` | `agenda.visualizar` |
| `/dashboard/crm/timeline` | `timeline.visualizar` |
| `/dashboard/crm/roleta` | `roleta.visualizar` |
| `/dashboard/crm/atendimentos` | `atendimentos.visualizar` |
| `/dashboard/crm/negocios` | `negocios.visualizar` |
| `/dashboard/crm/atividades` | `atividades.visualizar` |
| `/dashboard/crm/manutencoes` | `manutencoes.visualizar` |
| `/dashboard/crm/ia` e `/dashboard/crm/ia/simulador` | `ia.usar` |
| `/dashboard/crm/ia/conhecimento` | `ia_conhecimento.visualizar` |
| `/dashboard/crm/ia/memorias` | `ia_memorias.visualizar` |
| `/dashboard/crm/ia-whatsapp` | `ia.usar` |

A sidebar recebe do servidor somente a lista de permissões do papel, sem UUID ou perfil completo, filtra os links e oculta grupos vazios. A rota órfã de IA WhatsApp continua protegida, mas não foi adicionada à navegação. O link de Configurações foi removido porque essa rota não existe.

Os botões de criar, editar, arquivar, distribuir e administrar ainda podem aparecer em algumas telas para papéis sem a permissão visual correspondente. A adequação desses controles visuais permanece pendente; as operações críticas já protegidas continuam impondo autorização no servidor.

As páginas de Atendimentos, Negócios e Atividades continuam usando dados simulados. A proteção de visualização não altera nem promove esses mocks a dados reais.

## Aplicação atual

`requirePermission()` protege somente:

- o uso do simulador OpenAI;
- a criação de conhecimento e memórias da IA;
- a distribuição de leads;
- os arquivamentos lógicos de pessoas, proprietários, inquilinos, corretores, imóveis, leads e manutenções;
- a criação e edição operacional de corretores.

Temporariamente, `salvarPessoa`, `salvarProprietario`, `salvarInquilino`, `salvarLead`, `cadastrarTarefa`, `salvarCaso` e a mensagem da IA Comercial continuam protegidos apenas por `requireActiveProfile()`. A autorização granular dessas operações depende de escopos próprios, atribuídos ou relacionados e não deve ser inferida como implementada.

`salvarImovel` exige `imoveis.criar` ou `imoveis.editar`, conforme a operação, e `duplicarImovel` reutiliza `imoveis.criar`. Enquanto o escopo de ownership dos corretores não estiver implementado, ambas também restringem a operação aos papéis `administrador` e `gestor`, falhando fechadas para corretor e atendimento.
