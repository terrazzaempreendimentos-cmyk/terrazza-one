# Ponte n8n UCE

Documento de preparação para integrar o n8n ao UCE usando a rota interna
`/api/uce/chat`.

## Visão Geral

O n8n será responsável por receber a mensagem do canal, chamar a API do UCE,
guardar `conversationId` e `context` entre mensagens e executar ações sugeridas
quando o atendimento estiver pronto para handoff.

Nesta etapa, o projeto não integra WhatsApp real, não cria workflow externo e
não salva dados em banco.

Fluxo esperado:

1. Canal envia mensagem para o n8n.
2. n8n chama `POST /api/uce/chat`.
3. UCE decide especialista, próxima pergunta, score, status e handoff.
4. API retorna resposta estruturada.
5. n8n reenvia `reply` ao canal e guarda `context` para a próxima mensagem.
6. Se `actions` vier preenchido, o n8n poderá acionar etapas futuras.

## Endpoint

`POST /api/uce/chat`

Headers:

```http
Content-Type: application/json
x-uce-api-key: sua-chave-opcional
```

O header `x-uce-api-key` só é obrigatório quando a variável de ambiente
`UCE_API_KEY` estiver configurada.

## Payload Esperado

```json
{
  "conversationId": "string opcional",
  "message": "Quero alugar apartamento na Ponta Verde até 3500",
  "channel": "whatsapp",
  "origin": "instagram",
  "leadType": "inquilino",
  "city": "Maceió",
  "responseMode": "uce_puro",
  "context": {}
}
```

Campos principais:

- `conversationId`: identificador temporário da conversa. Se não vier, a API
  gera um novo.
- `message`: texto enviado pelo usuário. Campo obrigatório.
- `channel`: canal de atendimento. Valores aceitos: `whatsapp`, `instagram`,
  `facebook`, `site`, `manual`.
- `origin`: origem comercial. Valores aceitos: `facebook`, `instagram`,
  `qr_code_placa`, `site`, `portal`, `manual`, `whatsapp`.
- `leadType`: tipo inicial do lead. Valores aceitos: `proprietario`,
  `inquilino`, `comprador`, `vendedor`, `corretor_parceiro`, `desconhecido`.
- `city`: cidade inicial, quando conhecida.
- `responseMode`: `uce_puro` ou `openai_assistida`.
- `context`: memória temporária da conversa, reenviada pelo n8n a cada turno.

## Resposta Esperada

```json
{
  "ok": true,
  "conversationId": "uuid",
  "reply": "resposta para enviar ao usuário",
  "conversationStatus": "coletando",
  "specialist": "Especialista Locação",
  "score": 72,
  "temperature": "morno",
  "handoffReady": false,
  "nextQuestion": "Qual faixa de valor de aluguel você procura?",
  "context": {},
  "briefing": {},
  "knowledgeSummary": "Resumo da base consultada pelo UCE",
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

## ConversationId

O `conversationId` identifica a conversa no n8n. Na primeira mensagem, o n8n
pode omitir esse campo. A API gera o valor e devolve na resposta.

Nas mensagens seguintes, o n8n deve reenviar o mesmo `conversationId`.

Nesta fase, o `conversationId` não é salvo no banco pelo Terrazza One. Ele serve
para o n8n manter a memória temporária do fluxo.

## Context Entre Mensagens

O campo `context` é essencial para continuidade. O n8n deve guardar o `context`
retornado pela API e reenviar esse objeto no próximo `POST /api/uce/chat`.

Exemplo:

1. n8n envia `context: {}`.
2. API retorna `context` com bairro, tipo de lead, pergunta ativa e campos já
   coletados.
3. n8n salva esse `context`.
4. Na próxima mensagem, n8n envia o `context` salvo.

Sem esse reenvio, o UCE inicia um novo contexto temporário.

## Modos de Resposta

`uce_puro`:

- Usa apenas a resposta determinística do UCE.
- Recomendado como padrão inicial.
- Mais previsível para testes de fluxo.

`openai_assistida`:

- UCE continua decidindo especialista, pergunta, score, handoff e status.
- OpenAI apenas melhora a linguagem da resposta.
- Guardrails e fallback protegem o atendimento.
- Se houver falha, a API retorna resposta segura do UCE.

## Segurança

Se `UCE_API_KEY` existir no ambiente, o n8n deve enviar:

```http
x-uce-api-key: valor-da-chave
```

Se a chave estiver ausente ou incorreta, a API retorna:

```json
{
  "ok": false,
  "error": "unauthorized"
}
```

Se `UCE_API_KEY` não existir, a rota permite chamadas no ambiente atual para
facilitar testes.

## Ações Retornadas pelo UCE

Quando `handoffReady` for `true`, a API poderá retornar:

```json
[
  { "type": "notify_human", "label": "Notificar especialista" },
  { "type": "create_lead", "label": "Criar/atualizar lead" },
  { "type": "create_timeline_event", "label": "Registrar timeline" }
]
```

Essas ações são sugestões estruturadas. O n8n decidirá, em sprint futura, como
executar cada etapa. A API ainda não cria lead, não registra timeline e não
notifica especialistas automaticamente.

## Arquivos de Exemplo

- `docs/examples/n8n-uce-chat-request.json`
- `docs/examples/n8n-uce-chat-response.json`
