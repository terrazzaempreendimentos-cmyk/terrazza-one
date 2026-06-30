# Padrao CRUD Operacional Terrazza

Este documento define o padrao inicial para criacao, listagem, edicao e exclusao logica nas areas operacionais e cadastros do Terrazza One.

## Criar

- Usar Server Actions em formularios.
- Validar campos obrigatorios antes de inserir.
- Usar valores opcionais como `null` quando estiverem vazios.
- Chamar `revalidatePath` apos salvar.

## Listar

- Listar apenas registros ativos sempre que a tabela possuir coluna `ativo`.
- Ordenar por `created_at desc` em listas operacionais.
- Exibir fallback visual quando nao houver registros.

## Editar

- Usar parametro de URL, como `?edit=id`, para carregar dados existentes no formulario.
- O mesmo formulario pode criar ou atualizar.
- Alterar o texto do botao para `Salvar alteracoes` quando estiver em modo edicao.
- Oferecer acao `Cancelar edicao`.
- Atualizar `updated_at` em toda edicao.
- Chamar `revalidatePath` apos salvar.

## Excluir logicamente

- Nao usar delete fisico em telas operacionais.
- Excluir significa atualizar `ativo=false`.
- Atualizar `updated_at`.
- Pedir confirmacao simples antes da exclusao.
- Chamar `revalidatePath` apos excluir.

## Campos recomendados

- `ativo boolean default true`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

## Regra operacional

O registro deve permanecer recuperavel no banco para historico, auditoria, timeline e memoria futura do UCE.
