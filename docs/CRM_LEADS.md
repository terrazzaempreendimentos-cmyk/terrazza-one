# Contrato canônico de Leads

Este documento registra o contrato-alvo do módulo de Leads. A Sprint 2B não altera banco, páginas, ações ou dados; os catálogos ainda não são usados para persistência.

## Conceitos separados

- **Etapa do funil** posiciona o lead no fluxo comercial e alimentará o Kanban.
- **Status operacional** informa se o registro está ativo, convertido, perdido ou arquivado. Ele não determina sozinho a coluna do Kanban.
- **Temperatura** expressa intenção ou urgência. Pode ser manual, sugerida pela IA ou futuramente recalculada por sinais, sem ser inferida da etapa.
- **Handoff** informa quem conduz a conversa. Não é etapa nem status operacional.
- **Canal de entrada** informa por onde o contato chegou; **origem comercial** informa a ação, referência ou ativo que o gerou.

## Etapas do funil

Fluxo normal: `novo → qualificacao → atendimento → visita_avaliacao → proposta → negociacao → documentacao → fechado`.

`perdido` é uma etapa final alternativa. Os identificadores persistíveis não usam acentos. Rótulos, descrições, ordem, indicação de etapa final e variante semântica estão centralizados em `lib/crm/leads/catalogs.ts`.

### Compatibilidade legada

| Valor atual | Etapa canônica |
| --- | --- |
| vazio | `novo` |
| `ia_qualificando` | `qualificacao` |
| `corretor`, `em_atendimento` | `atendimento` |
| `visita`, `avaliacao`, `avaliacao_imovel` | `visita_avaliacao` |
| `proposta` | `proposta` |
| `negociacao` | `negociacao` |
| `contrato`, `documentacao` | `documentacao` |
| `fechado` | `fechado` |
| `perdido` | `perdido` |

O helper de compatibilidade é puro, não grava dados e retorna `null` para valores desconhecidos.

## Status e temperatura

Status operacionais: `ativo`, `convertido`, `perdido`, `arquivado`.

- Etapas de `novo` a `documentacao` normalmente usam `ativo`.
- `fechado` normalmente corresponde a `convertido`.
- `perdido` normalmente corresponde ao status `perdido`.
- `arquivado` representa retirada lógica da operação.

Essas correspondências são orientações, não automações implementadas nesta sprint.

Temperaturas: `frio`, `morno`, `quente`. O código atual ainda calcula temperatura a partir de `status`; essa compatibilidade deverá ser removida apenas quando existir campo próprio e migração controlada.

## Tipo de relacionamento e objetivo

Tipos canônicos: `interessado_imovel`, `proprietario_anunciante`, `proprietario_administracao`, `avaliacao_imovel`, `investidor`, `parceiro`, `outro`.

Objetivos canônicos: `comprar`, `alugar`, `vender`, `anunciar_locacao`, `administrar_imovel`, `avaliar_imovel`, `investir`, `outro`.

Mapeamento dos tipos atuais:

| Tipo legado | Tipo canônico |
| --- | --- |
| `comprador`, `inquilino` | `interessado_imovel` |
| `vendedor` | `proprietario_anunciante` |
| `proprietario` | `proprietario_anunciante` (decisão provisória) |
| `corretor parceiro` | `parceiro` |

O valor legado `proprietario` é ambíguo: pode representar anúncio, administração ou avaliação. Antes de migrar dados, a área comercial deve aprovar o padrão ou classificar cada registro pelo objetivo. Valores livres desconhecidos falham de forma fechada (`null`), sem serem silenciosamente convertidos para `outro`.

## Canal e origem

Canais: `manual`, `whatsapp`, `site`, `instagram`, `facebook`, `portal`, `telefone`, `indicacao`, `outro`.

Origens comerciais iniciais: `campanha`, `placa_qr_code`, `portal_especifico`, `indicacao`, `imovel_especifico`, `outro`. A futura persistência deve admitir detalhamento separado, como campanha, nome do portal, indicador ou `imovel_id`, sem sobrecarregar o canal.

## Handoff

Estados: `ia`, `aguardando_humano`, `humano`, `devolvido_ia`, `encerrado`.

- A IA encaminha quando precisa de decisão humana, há pedido explícito, risco, baixa confiança ou regra comercial de assunção.
- `aguardando_humano` registra a fila sem fingir que alguém assumiu.
- Atendente ou corretor muda para `humano` somente ao assumir efetivamente.
- `devolvido_ia` permite automação posterior sob regra explícita.
- `encerrado` encerra o ciclo de condução, sem determinar conversão ou perda.

## Identidade do responsável

A identidade futura do responsável será `responsavel_id`, UUID com FK para `pessoas(id)`. Para atribuição comercial, a Pessoa deve estar ativa e possuir o papel `corretor`. `leads.responsavel` textual é legado: renomear uma Pessoa não pode quebrar vínculos, o frontend não deve enviar nome livre como identidade e a Roleta deve operar com `pessoas.id`.

## Transições

`lib/crm/leads/transitions.ts` separa a validade estrutural da autorização:

- avanço e retorno são limitados à etapa imediatamente adjacente;
- qualquer etapa não final pode ir para `perdido`;
- `perdido` pode estruturalmente reabrir em uma etapa operacional não final, mas exige futuramente autorização de administrador ou gestor;
- `fechado` não possui reabertura automática;
- saltos, retornos múltiplos, destino igual à origem e strings desconhecidas são bloqueados.

O helper não consulta banco, não recebe papel informado pelo frontend e não concede autorização. A camada server-side futura deverá validar a permissão real do perfil antes de efetivar uma reabertura.

## Decisões comerciais pendentes

1. Confirmar o destino do tipo legado genérico `proprietario`.
2. Confirmar se avanço no Kanban será apenas adjacente ou se perfis específicos poderão pular etapas.
3. Definir se a reabertura de perdido retorna à etapa anterior registrada ou a uma etapa escolhida e auditada.
4. Definir os sinais e a governança da temperatura sugerida pela IA.
5. Aprovar catálogo e campos de detalhamento das origens comerciais.
6. Definir quando atendimento assume e quando a responsabilidade passa especificamente ao corretor.

## Próxima migration proposta

Após aprovação comercial, uma migration incremental poderá separar os conceitos em colunas próprias: etapa canônica, status operacional, temperatura, tipo, objetivo, canal, origem detalhada, handoff e `responsavel_id`. Ela deverá criar constraints/índices/FK de forma compatível, preservar valores legados para reconciliação, migrar apenas mapeamentos inequívocos e não remover `status`, `origem` ou `responsavel` textual até a aplicação estar totalmente migrada.

## Compatibilidade temporária da aplicação

Desde a Sprint 2D, o cadastro e a edição manual gravam os campos canônicos como autoridade. Enquanto Kanban, detalhe e consumidores legados não forem migrados, a mesma mutação também deriva:

- `status` de `etapa_funil`, pelo helper canônico de compatibilidade;
- `tipo_lead` de `tipo_relacionamento`;
- `objetivo` de `objetivo_imobiliario`;
- `origem` de `canal`;
- `responsavel` do nome da Pessoa-corretora validada no servidor.

O responsável canônico é sempre `responsavel_id → pessoas.id`. Os campos textuais não podem ser usados como identidade ou autoridade e deverão ser removidos apenas após todos os consumidores serem migrados.
