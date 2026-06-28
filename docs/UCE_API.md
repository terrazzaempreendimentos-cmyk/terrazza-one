# UCE API Bridge

Endpoint interno para testes futuros com n8n, Postman, Insomnia ou curl.

## Endpoint

`POST /api/uce/chat`

A rota recebe uma mensagem, chama o UCE, opcionalmente usa OpenAI assistida
apenas para melhorar a linguagem da resposta e retorna um JSON estruturado.

## Payload

```json
{
  "conversationId": "string opcional",
  "message": "texto do usuario",
  "channel": "whatsapp | instagram | facebook | site | manual",
  "origin": "facebook | instagram | qr_code_placa | site | portal | manual | whatsapp",
  "leadType": "proprietario | inquilino | comprador | vendedor | corretor_parceiro | desconhecido",
  "city": "Maceio",
  "responseMode": "uce_puro | openai_assistida",
  "context": {}
}
```

Se `conversationId` nao vier, a API gera um `crypto.randomUUID()` e retorna o
valor. Nenhum dado e salvo em banco nesta etapa.

## Resposta

```json
{
  "ok": true,
  "conversationId": "uuid",
  "reply": "resposta ao usuario",
  "conversationStatus": "coletando",
  "specialist": "Especialista Locacao",
  "score": 72,
  "temperature": "morno",
  "handoffReady": false,
  "nextQuestion": "Qual faixa de valor voce procura?",
  "context": {},
  "briefing": {},
  "knowledgeSummary": "Base consultada pelo UCE...",
  "llm": {
    "usedOpenAI": false,
    "fallbackUsed": false,
    "guardrailsApproved": true,
    "estimatedTotalTokens": 0,
    "model": null
  },
  "actions": []
}
```

Quando `handoffReady=true`, `actions` sugere:

```json
[
  { "type": "notify_human", "label": "Notificar especialista" },
  { "type": "create_lead", "label": "Criar/atualizar lead" },
  { "type": "create_timeline_event", "label": "Registrar timeline" }
]
```

Essas actions sao apenas sugestoes para o n8n. A API nao cria lead, nao grava
timeline e nao notifica humano sozinha.

## Erros

Mensagem vazia:

```json
{
  "ok": false,
  "error": "message_required"
}
```

Payload invalido:

```json
{
  "ok": false,
  "error": "invalid_payload"
}
```

Falha de autenticacao:

```json
{
  "ok": false,
  "error": "unauthorized"
}
```

Stack trace nunca e exposto na resposta.

## Contexto Temporario

O campo `context` deve ser reenviado pelo n8n a cada mensagem para manter
memoria temporaria. Se vier vazio, a API cria um contexto inicial. Se vier
preenchido, a API continua a conversa usando esse contexto.

## Modos de Resposta

- `uce_puro`: usa apenas a resposta deterministica do UCE.
- `openai_assistida`: usa o UCE para decidir o fluxo e chama o LLM Adapter para
  melhorar a linguagem. Se OpenAI falhar ou os guardrails reprovarem, a resposta
  volta para fallback seguro do UCE.

A OpenAI nao escolhe especialista, nao muda fluxo, nao altera score e nao cria
pergunta fora da decisao do UCE.

## Seguranca

Se `UCE_API_KEY` existir no ambiente, a rota exige o header:

```http
x-uce-api-key: sua-chave
```

Se `UCE_API_KEY` nao estiver configurada, a rota permite chamadas no ambiente
atual para facilitar testes locais.

## Exemplo curl

```bash
curl -X POST http://localhost:3000/api/uce/chat \
  -H "Content-Type: application/json" \
  -H "x-uce-api-key: sua-chave" \
  -d '{
    "message": "Pajucara, apartamento 3 quartos ate 3500",
    "channel": "manual",
    "origin": "manual",
    "leadType": "inquilino",
    "city": "Maceio",
    "responseMode": "uce_puro",
    "context": {}
  }'
```

## Uso Futuro com n8n

O n8n podera chamar esta rota em um node HTTP Request, armazenar
`conversationId` e `context` em memoria temporaria do workflow e executar as
`actions` sugeridas quando o atendimento estiver pronto para handoff.

WhatsApp real, workflow n8n, persistencia em banco e criacao de leads ficam para
sprints futuras.

## Uso com n8n

A ponte n8n deve chamar `POST /api/uce/chat`, guardar o `conversationId`
retornado e reenviar o `context` completo em cada nova mensagem. Assim, o n8n
mantem memoria temporaria sem que a API grave dados no banco.

Use `responseMode: "uce_puro"` como padrao para validar fluxo e
`responseMode: "openai_assistida"` apenas quando quiser testar melhoria de
linguagem com guardrails e fallback.

Se `UCE_API_KEY` estiver configurada, o node HTTP Request do n8n deve enviar o
header `x-uce-api-key` com o mesmo valor.

Quando `handoffReady=true`, o n8n pode ler `actions` para decidir proximas
etapas, como notificar especialista, criar/atualizar lead ou registrar timeline.
Essas actions continuam sendo sugestoes; a rota nao executa automacoes.

Documentacao completa da ponte:

- `docs/N8N_UCE_BRIDGE.md`
- `docs/examples/n8n-uce-chat-request.json`
- `docs/examples/n8n-uce-chat-response.json`
