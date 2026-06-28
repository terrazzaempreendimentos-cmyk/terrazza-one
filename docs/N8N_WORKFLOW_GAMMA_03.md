# Workflow n8n Gamma-03

Guia para montar manualmente o primeiro workflow de teste:

```text
Webhook n8n
↓
Mapear payload
↓
Chamar API UCE
↓
Receber resposta do UCE
↓
Responder ao Webhook com JSON estruturado
```

Este workflow é apenas para validação. Ele não integra WhatsApp real, não envia
mensagem real, não salva dados em banco e não cria automações permanentes.

## 1. Criar Workflow

No n8n:

1. Clique em `New Workflow`.
2. Nome sugerido: `Terrazza UCE Test - Gamma 03`.
3. Salve o workflow antes de testar.

## 2. Node Webhook

Adicione um node `Webhook`.

Configuração:

- `HTTP Method`: `POST`
- `Path`: `terrazza-uce-test`
- `Response Mode`: `Using Respond to Webhook node`

Payload de teste:

```json
{
  "message": "Quero alugar apartamento na Ponta Verde até 3500",
  "from": "5582991045418",
  "channel": "whatsapp",
  "origin": "instagram",
  "leadType": "inquilino",
  "city": "Maceió",
  "responseMode": "uce_puro",
  "context": {}
}
```

Arquivo de apoio:

```text
docs/examples/n8n-webhook-test-payload.json
```

## 3. Node HTTP Request

Adicione um node `HTTP Request` após o Webhook.

Configuração:

- `Method`: `POST`
- `URL`: `https://www.terrazzacrm.com.br/api/uce/chat`
- `Send Headers`: `true`
- `Send Body`: `true`
- `Body Content Type`: `JSON`

Headers:

```http
Content-Type: application/json
x-uce-api-key: usar somente se UCE_API_KEY estiver configurada
```

Body JSON sugerido:

```json
{
  "conversationId": "={{ $json.conversationId }}",
  "message": "={{ $json.message }}",
  "channel": "={{ $json.channel || 'whatsapp' }}",
  "origin": "={{ $json.origin || 'manual' }}",
  "leadType": "={{ $json.leadType || 'desconhecido' }}",
  "city": "={{ $json.city || 'Maceió' }}",
  "responseMode": "={{ $json.responseMode || 'uce_puro' }}",
  "context": "={{ $json.context || {} }}"
}
```

Observação: se o n8n estiver recebendo dados em `body`, use `{{$json.body.message}}`
e o mesmo padrão para os demais campos.

## 4. Node Respond to Webhook

Adicione um node `Respond to Webhook` após o `HTTP Request`.

Configuração:

- `Respond With`: `JSON`
- `Response Body`: resposta completa retornada pelo node HTTP Request

JSON recomendado:

```json
{
  "ok": "={{ $json.ok }}",
  "reply": "={{ $json.reply }}",
  "conversationId": "={{ $json.conversationId }}",
  "conversationStatus": "={{ $json.conversationStatus }}",
  "specialist": "={{ $json.specialist }}",
  "score": "={{ $json.score }}",
  "handoffReady": "={{ $json.handoffReady }}",
  "nextQuestion": "={{ $json.nextQuestion }}",
  "actions": "={{ $json.actions || [] }}",
  "context": "={{ $json.context }}"
}
```

## Teste com curl

Use o endpoint do webhook gerado pelo seu n8n.

```bash
curl -X POST https://SEU_N8N/webhook/terrazza-uce-test \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Quero alugar apartamento na Ponta Verde até 3500",
    "from": "5582991045418",
    "channel": "whatsapp",
    "origin": "instagram",
    "leadType": "inquilino",
    "city": "Maceió",
    "responseMode": "uce_puro",
    "context": {}
  }'
```

## Resposta Esperada

O webhook deve devolver um JSON parecido com:

```json
{
  "ok": true,
  "reply": "texto da resposta do UCE",
  "conversationId": "uuid",
  "conversationStatus": "coletando",
  "specialist": "Especialista Locação",
  "score": 0,
  "handoffReady": false,
  "nextQuestion": "pergunta seguinte",
  "actions": []
}
```

Arquivo de apoio:

```text
docs/examples/n8n-webhook-test-response.json
```

## Checklist

1. O Webhook recebe o payload manual.
2. O HTTP Request chama `https://www.terrazzacrm.com.br/api/uce/chat`.
3. A API UCE retorna `ok: true`.
4. O Respond to Webhook devolve o JSON estruturado.
5. Nenhuma mensagem real é enviada.
6. Nenhum dado é salvo em banco.
