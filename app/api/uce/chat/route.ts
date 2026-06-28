import { NextRequest, NextResponse } from "next/server";

import type { TipoLeadSimulador } from "../../../../lib/ia/fluxos";
import {
  atualizarContexto,
  criarContextoInicial,
  type LeadContext,
} from "../../../../lib/ia/motor";
import { processarTurno } from "../../../../lib/ia/motor/adapter";
import { generateNaturalResponse, type UCELLMOutput } from "../../../../lib/uce/llm";

type UCEApiChannel = "whatsapp" | "instagram" | "facebook" | "site" | "manual";
type UCEApiOrigin =
  | "facebook"
  | "instagram"
  | "qr_code_placa"
  | "site"
  | "portal"
  | "manual"
  | "whatsapp";
type UCEApiLeadType = TipoLeadSimulador | "desconhecido";
type UCEApiResponseMode = "uce_puro" | "openai_assistida";

type UCEChatPayload = {
  conversationId?: string;
  message?: string;
  channel?: UCEApiChannel;
  origin?: UCEApiOrigin;
  leadType?: UCEApiLeadType;
  city?: string;
  responseMode?: UCEApiResponseMode;
  context?: Partial<LeadContext>;
};

type UCEApiLlmSummary = {
  usedOpenAI: boolean;
  fallbackUsed: boolean;
  guardrailsApproved: boolean;
  estimatedTotalTokens: number;
  model: string | null;
};

const channels: UCEApiChannel[] = [
  "whatsapp",
  "instagram",
  "facebook",
  "site",
  "manual",
];
const origins: UCEApiOrigin[] = [
  "facebook",
  "instagram",
  "qr_code_placa",
  "site",
  "portal",
  "manual",
  "whatsapp",
];
const leadTypes: UCEApiLeadType[] = [
  "proprietario",
  "inquilino",
  "comprador",
  "vendedor",
  "corretor_parceiro",
  "desconhecido",
];
const responseModes: UCEApiResponseMode[] = ["uce_puro", "openai_assistida"];

function jsonError(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePayload(value: unknown): UCEChatPayload | null {
  if (!isRecord(value)) return null;

  return value as UCEChatPayload;
}

function validOrDefault<T extends string>(
  value: unknown,
  allowed: T[],
  fallback: T,
) {
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : fallback;
}

function normalizeLeadType(leadType: UCEApiLeadType): TipoLeadSimulador {
  return leadType === "desconhecido" ? "corretor_parceiro" : leadType;
}

function buildContext({
  payload,
  leadType,
  channel,
  origin,
}: {
  payload: UCEChatPayload;
  leadType: TipoLeadSimulador;
  channel: UCEApiChannel;
  origin: UCEApiOrigin;
}) {
  const base = atualizarContexto(criarContextoInicial(), {
    tipoLead: leadType,
    cidade: payload.city ?? null,
    canal: channel,
    origem: origin,
  });

  if (!payload.context || !isRecord(payload.context)) {
    return base;
  }

  return atualizarContexto(base, payload.context);
}

function buildActions(handoffReady: boolean) {
  if (!handoffReady) return [];

  return [
    {
      type: "notify_human",
      label: "Notificar especialista",
    },
    {
      type: "create_lead",
      label: "Criar/atualizar lead",
    },
    {
      type: "create_timeline_event",
      label: "Registrar timeline",
    },
  ];
}

function emptyLlm(): UCEApiLlmSummary {
  return {
    usedOpenAI: false,
    fallbackUsed: false,
    guardrailsApproved: true,
    estimatedTotalTokens: 0,
    model: null,
  };
}

function llmResponse(output: UCELLMOutput): UCEApiLlmSummary {
  return {
    usedOpenAI: output.report.usedOpenAI,
    fallbackUsed: output.report.fallbackUsed,
    guardrailsApproved: output.report.guardrailsApproved,
    estimatedTotalTokens: output.report.estimatedTotalTokens,
    model: output.report.model,
  };
}

export async function POST(request: NextRequest) {
  try {
    const expectedApiKey = process.env.UCE_API_KEY;

    if (
      expectedApiKey &&
      request.headers.get("x-uce-api-key") !== expectedApiKey
    ) {
      return jsonError(401, "unauthorized");
    }

    const payload = parsePayload(await request.json().catch(() => null));

    if (!payload) {
      return jsonError(400, "invalid_payload");
    }

    if (typeof payload.message !== "string" || !payload.message.trim()) {
      return jsonError(400, "message_required");
    }

    const conversationId =
      typeof payload.conversationId === "string" && payload.conversationId.trim()
        ? payload.conversationId
        : crypto.randomUUID();
    const channel = validOrDefault(payload.channel, channels, "manual");
    const origin = validOrDefault(payload.origin, origins, "manual");
    const responseMode = validOrDefault(
      payload.responseMode,
      responseModes,
      "uce_puro",
    );
    const apiLeadType = validOrDefault(
      payload.leadType,
      leadTypes,
      "desconhecido",
    );
    const leadType = normalizeLeadType(apiLeadType);
    const context = buildContext({
      payload,
      leadType,
      channel,
      origin,
    });
    const result = processarTurno({
      mensagemUsuario: payload.message,
      contextoAtual: context,
      tipoLead: leadType,
      origem: origin,
      canal: channel,
    });
    let reply = result.respostaIa;
    let llm = emptyLlm();

    if (responseMode === "openai_assistida") {
      const output = await generateNaturalResponse({
        uceResult: result.uceResult,
        userMessage: payload.message,
        provider: "openai",
      });

      reply = output.text;
      llm = llmResponse(output);
    }

    const handoffReady = result.handoff.canHandoff || result.podePassarCorretor;

    return NextResponse.json({
      ok: true,
      conversationId,
      reply,
      conversationStatus: result.conversationStatus,
      specialist: result.specialist.label,
      score: result.score,
      temperature: result.temperatura,
      handoffReady,
      nextQuestion: result.proximaPergunta?.texto ?? null,
      context: result.contexto,
      briefing: result.uceResult.briefing,
      knowledgeSummary: result.knowledgeSummary,
      llm,
      actions: buildActions(handoffReady),
    });
  } catch {
    return jsonError(400, "invalid_payload");
  }
}
