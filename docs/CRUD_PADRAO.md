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

## Campos unicos

- Validar campos unicos tambem na interface antes de salvar, para melhorar a experiencia do usuario.
- Manter indice unico no banco como garantia final de consistencia.
- Em edicao, permitir manter o mesmo valor do registro atual e bloquear apenas quando o valor pertencer a outro registro ativo.
- Normalizar valores antes de comparar, removendo espacos desnecessarios e aplicando padrao consistente quando fizer sentido.
- Tratar erro de indice unico retornado pelo banco com mensagem clara e discreta.
- Aplicar futuramente o mesmo padrao em CPF/CNPJ, codigo do imovel e matricula.

### CPF/CNPJ unico

- Pessoas, Proprietarios e Inquilinos devem validar CPF/CNPJ antes de salvar.
- CPF/CNPJ invalido deve bloquear o envio.
- CPF/CNPJ duplicado em pessoa ativa deve bloquear o envio.
- Em edicao, o mesmo documento do registro atual deve ser permitido.

### Codigo do imovel unico

- Codigo do imovel e obrigatorio.
- Codigo duplicado em imovel ativo deve bloquear o envio.
- Em edicao, o mesmo codigo do registro atual deve ser permitido.

### Matricula unica

- Matricula do imovel nao e obrigatoria.
- Quando preenchida, deve ser unica entre imoveis ativos.
- Em edicao, a mesma matricula do registro atual deve ser permitida.

## Regra operacional

O registro deve permanecer recuperavel no banco para historico, auditoria, timeline e memoria futura do UCE.
