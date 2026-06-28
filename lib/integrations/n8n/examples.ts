export const n8nWebhookTestPayload = {
  message: "Quero alugar apartamento na Ponta Verde até 3500",
  from: "5582991045418",
  channel: "whatsapp",
  origin: "instagram",
  leadType: "inquilino",
  city: "Maceió",
  responseMode: "uce_puro",
  context: {},
} as const;

export const n8nExpectedResponseShape = {
  ok: true,
  reply: "texto da resposta do UCE",
  conversationId: "uuid",
  conversationStatus: "coletando",
  specialist: "Especialista Locação",
  score: 0,
  handoffReady: false,
  nextQuestion: "pergunta seguinte",
  actions: [],
} as const;
