const apiUrl = process.env.UCE_API_URL ?? "http://localhost:3000/api/uce/chat";
const apiKey = process.env.UCE_API_KEY;

const scenarios = [
  {
    name: "Inquilino",
    payload: {
      message: "Quero alugar apartamento na Ponta Verde até 3500",
      channel: "whatsapp",
      origin: "instagram",
      leadType: "inquilino",
      city: "Maceió",
      responseMode: "uce_puro",
      context: {},
    },
  },
  {
    name: "Comprador",
    payload: {
      message: "Quero comprar apartamento de 3 quartos na Ponta Verde até 500 mil",
      channel: "whatsapp",
      origin: "facebook",
      leadType: "comprador",
      city: "Maceió",
      responseMode: "uce_puro",
      context: {},
    },
  },
  {
    name: "Proprietário",
    payload: {
      message: "Tenho um apartamento no Farol para anunciar",
      channel: "whatsapp",
      origin: "manual",
      leadType: "proprietario",
      city: "Maceió",
      responseMode: "uce_puro",
      context: {},
    },
  },
  {
    name: "Vendedor",
    payload: {
      message: "Quero vender uma casa no Poço com 180m2 e 3 quartos",
      channel: "whatsapp",
      origin: "site",
      leadType: "vendedor",
      city: "Maceió",
      responseMode: "uce_puro",
      context: {},
    },
  },
];

function printResult(name, data) {
  console.log(`\n=== ${name} ===`);

  if (!data?.ok) {
    console.log("error:", data?.error ?? "unknown_error");
    return;
  }

  console.log("reply:", data.reply);
  console.log("specialist:", data.specialist);
  console.log("conversationStatus:", data.conversationStatus);
  console.log("score:", data.score);
  console.log("handoffReady:", data.handoffReady);
  console.log("nextQuestion:", data.nextQuestion);
  console.log("actions:", JSON.stringify(data.actions ?? [], null, 2));
}

async function callScenario({ name, payload }) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (apiKey) {
    headers["x-uce-api-key"] = apiKey;
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({
    ok: false,
    error: `invalid_json_response_${response.status}`,
  }));

  printResult(name, data);
}

for (const scenario of scenarios) {
  await callScenario(scenario);
}
