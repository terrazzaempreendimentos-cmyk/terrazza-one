# Testes Locais da API UCE

Guia para validar a rota `/api/uce/chat` antes de conectar n8n, WhatsApp
Business ou qualquer automação externa.

## Endpoints

Local:

```text
http://localhost:3000/api/uce/chat
```

Produção:

```text
https://www.terrazzacrm.com.br/api/uce/chat
```

Método:

```text
POST
```

Headers:

```http
Content-Type: application/json
x-uce-api-key: sua-chave-opcional
```

O header `x-uce-api-key` só é obrigatório quando `UCE_API_KEY` estiver
configurada no ambiente.

## Número Operacional Futuro

Número oficial de atendimento da Terrazza para futura operação:

```text
82 99104-5418
```

Esse número é apenas referência operacional. Ele não deve ser hardcodado em
lógica de negócio.

## Payload Base

```json
{
  "message": "Quero alugar apartamento na Ponta Verde até 3500",
  "channel": "whatsapp",
  "origin": "instagram",
  "leadType": "inquilino",
  "city": "Maceió",
  "responseMode": "uce_puro",
  "context": {}
}
```

## Resposta Esperada

A API deve retornar um JSON com:

- `reply`
- `conversationStatus`
- `specialist`
- `score`
- `handoffReady`
- `nextQuestion`
- `context`
- `actions`

Exemplo reduzido:

```json
{
  "ok": true,
  "conversationId": "uuid",
  "reply": "resposta do UCE",
  "conversationStatus": "coletando",
  "specialist": "Especialista Locação",
  "score": 68,
  "handoffReady": false,
  "nextQuestion": "Quantos quartos você precisa?",
  "context": {},
  "actions": []
}
```

## Exemplos curl

Arquivos prontos:

- `docs/examples/curl-uce-inquilino.txt`
- `docs/examples/curl-uce-comprador.txt`
- `docs/examples/curl-uce-proprietario.txt`
- `docs/examples/curl-uce-vendedor.txt`

Para testar localmente, mantenha a aplicação rodando em `localhost:3000` e
execute o conteúdo de um dos arquivos no terminal.

## Script Local

Arquivo:

```text
scripts/test-uce-api.mjs
```

Uso:

```bash
node scripts/test-uce-api.mjs
```

Por padrão, o script chama:

```text
http://localhost:3000/api/uce/chat
```

Para testar outro endpoint:

```bash
UCE_API_URL=https://www.terrazzacrm.com.br/api/uce/chat node scripts/test-uce-api.mjs
```

Se a API exigir chave:

```bash
UCE_API_KEY=sua-chave node scripts/test-uce-api.mjs
```

O script imprime:

- `reply`
- `specialist`
- `conversationStatus`
- `score`
- `handoffReady`
- `nextQuestion`
- `actions`

## Checklist Antes do n8n

1. A API responde `ok: true`.
2. `reply` vem preenchido.
3. `specialist` corresponde ao cenário.
4. `context` é retornado e pode ser reenviado.
5. `handoffReady` só fica `true` quando o atendimento está qualificado.
6. `actions` só aparece preenchido quando há handoff.

Nenhum teste deste documento salva dados em banco ou envia mensagens reais.
