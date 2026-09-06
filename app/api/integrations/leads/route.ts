import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import {
  isLeadObjective,
  isLeadRelationshipType,
} from "../../../../lib/crm/leads/catalogs";
import {
  normalizeBrazilianPhone,
  normalizeEmail,
} from "../../../../lib/crm/leads/contact-normalization";
import { createAdminClient } from "../../../../lib/supabase/admin";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 64 * 1024;
const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;
const EXPECTED_KEY_ID = "n8n-primary";
const ALLOWED_OUTCOMES = new Set([
  "created",
  "matched_updated",
  "matched_no_change",
  "duplicate_replay",
]);

type ParsedPayload = Readonly<{
  externalEventId: string;
  eventType: "message.received";
  occurredAt: string;
  accountId: string;
  conversationId: string | null;
  name: string | null;
  phoneOriginal: string;
  phoneNormalized: string;
  emailOriginal: string | null;
  emailNormalized: string | null;
  city: string | null;
  neighborhood: string | null;
  relationshipType: string | null;
  objective: string | null;
  handoffRequested: boolean;
}>;

type ParseResult =
  | Readonly<{ ok: true; value: ParsedPayload }>
  | Readonly<{ ok: false; status: 400 | 422; code: "invalid_payload" | "unsupported_phone" }>;

type RawBodyResult =
  | Readonly<{ ok: true; body: Buffer }>
  | Readonly<{ ok: false }>;

function jsonError(status: number, error: string, retryAfter?: number) {
  const headers = retryAfter
    ? { "Retry-After": String(Math.max(1, Math.ceil(retryAfter))) }
    : undefined;
  return NextResponse.json({ ok: false, error }, { status, headers });
}

function logIntegrationError(stage: string, code: unknown, eventHashValue?: string) {
  console.error({
    modulo: "integracao_leads",
    etapa: stage,
    codigo: typeof code === "string" ? code : "unexpected_error",
    ...(eventHashValue ? { evento_hash: eventHashValue } : {}),
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(record: Record<string, unknown>, allowed: readonly string[]) {
  const allowedSet = new Set(allowed);
  return Object.keys(record).every((key) => allowedSet.has(key));
}

function requiredString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

function optionalString(value: unknown, maxLength: number) {
  if (value === undefined || value === null) {
    return { valid: true as const, value: null };
  }
  if (typeof value !== "string") {
    return { valid: false as const, value: null };
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    return { valid: false as const, value: null };
  }
  return { valid: true as const, value: normalized || null };
}

async function readRawBody(request: Request): Promise<RawBodyResult> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const declaredLength = Number(contentLength);
    if (!Number.isFinite(declaredLength) || declaredLength < 0 || declaredLength > MAX_BODY_BYTES) {
      return { ok: false };
    }
  }

  if (!request.body) return { ok: true, body: Buffer.alloc(0) };

  const reader = request.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      return { ok: false };
    }
    chunks.push(Buffer.from(value));
  }

  return { ok: true, body: Buffer.concat(chunks, total) };
}

function verifySignature(
  rawBody: Buffer,
  keyId: string | null,
  timestampHeader: string | null,
  signatureHeader: string | null,
  secret: string,
) {
  if (keyId !== EXPECTED_KEY_ID || !timestampHeader || !signatureHeader) return false;
  if (!/^[0-9]{10,13}$/.test(timestampHeader)) return false;

  const rawTimestamp = Number(timestampHeader);
  if (!Number.isSafeInteger(rawTimestamp)) return false;
  const timestampSeconds = timestampHeader.length === 13
    ? Math.floor(rawTimestamp / 1000)
    : rawTimestamp;
  const currentSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(currentSeconds - timestampSeconds) > SIGNATURE_TOLERANCE_SECONDS) return false;

  const match = /^v1=([0-9a-f]{64})$/i.exec(signatureHeader);
  if (!match) return false;

  const expected = createHmac("sha256", secret)
    .update(timestampHeader + ".")
    .update(rawBody)
    .digest();
  const received = Buffer.from(match[1], "hex");

  return received.length === expected.length && timingSafeEqual(received, expected);
}

function parsePayload(rawBody: Buffer): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return { ok: false, status: 400, code: "invalid_payload" };
  }

  if (!isRecord(parsed) || !hasOnlyKeys(parsed, ["version", "event", "source", "contact", "qualification", "handoff"])) {
    return { ok: false, status: 400, code: "invalid_payload" };
  }
  if (
    parsed.version !== 1
    || !isRecord(parsed.event)
    || !isRecord(parsed.source)
    || !isRecord(parsed.contact)
    || !isRecord(parsed.handoff)
    || (parsed.qualification !== undefined && !isRecord(parsed.qualification))
  ) {
    return { ok: false, status: 400, code: "invalid_payload" };
  }

  const event = parsed.event;
  const source = parsed.source;
  const contact = parsed.contact;
  const qualification = isRecord(parsed.qualification) ? parsed.qualification : {};
  const handoff = parsed.handoff;

  if (
    !hasOnlyKeys(event, ["external_id", "type", "occurred_at"])
    || !hasOnlyKeys(source, ["system", "channel", "account_id", "conversation_id"])
    || !hasOnlyKeys(contact, ["phone", "name", "email"])
    || !hasOnlyKeys(qualification, ["relationship_type", "objective", "city", "neighborhood"])
    || !hasOnlyKeys(handoff, ["requested"])
  ) {
    return { ok: false, status: 400, code: "invalid_payload" };
  }

  const externalEventId = requiredString(event.external_id, 200);
  const accountId = requiredString(source.account_id, 200);
  const occurredAtRaw = requiredString(event.occurred_at, 64);
  const conversationId = optionalString(source.conversation_id, 200);
  const name = optionalString(contact.name, 160);
  const emailInput = optionalString(contact.email, 254);
  const city = optionalString(qualification.city, 120);
  const neighborhood = optionalString(qualification.neighborhood, 120);
  const relationshipType = optionalString(qualification.relationship_type, 80);
  const objective = optionalString(qualification.objective, 80);

  if (
    !externalEventId
    || !accountId
    || !occurredAtRaw
    || Number.isNaN(Date.parse(occurredAtRaw))
    || event.type !== "message.received"
    || source.system !== "n8n"
    || source.channel !== "whatsapp"
    || typeof contact.phone !== "string"
    || handoff.requested !== true && handoff.requested !== false
    || !conversationId.valid
    || !name.valid
    || !emailInput.valid
    || !city.valid
    || !neighborhood.valid
    || !relationshipType.valid
    || !objective.valid
    || relationshipType.value !== null && !isLeadRelationshipType(relationshipType.value)
    || objective.value !== null && !isLeadObjective(objective.value)
  ) {
    return { ok: false, status: 400, code: "invalid_payload" };
  }

  const phone = normalizeBrazilianPhone(contact.phone);
  if (!phone.ok) {
    return phone.error === "unsupported_country"
      ? { ok: false, status: 422, code: "unsupported_phone" }
      : { ok: false, status: 400, code: "invalid_payload" };
  }
  if (!phone.value) return { ok: false, status: 400, code: "invalid_payload" };

  const email = normalizeEmail(emailInput.value ?? "");
  if (!email.ok) return { ok: false, status: 400, code: "invalid_payload" };

  return {
    ok: true,
    value: {
      externalEventId,
      eventType: "message.received",
      occurredAt: new Date(occurredAtRaw).toISOString(),
      accountId,
      conversationId: conversationId.value,
      name: name.value,
      phoneOriginal: phone.value.original,
      phoneNormalized: phone.value.normalized,
      emailOriginal: email.value?.original ?? null,
      emailNormalized: email.value?.normalized ?? null,
      city: city.value,
      neighborhood: neighborhood.value,
      relationshipType: relationshipType.value,
      objective: objective.value,
      handoffRequested: handoff.requested,
    },
  };
}

function eventHash(externalEventId: string) {
  return createHash("sha256").update(externalEventId).digest("hex").slice(0, 16);
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") return jsonError(400, "invalid_payload");

  const rawBodyResult = await readRawBody(request);
  if (!rawBodyResult.ok) return jsonError(413, "payload_too_large");

  const secret = process.env.N8N_LEADS_SIGNING_SECRET?.trim();
  if (!secret) {
    logIntegrationError("configuration", "signing_secret_missing");
    return jsonError(503, "processing_unavailable");
  }

  const keyId = request.headers.get("x-terrazza-key-id");
  const signatureValid = verifySignature(
    rawBodyResult.body,
    keyId,
    request.headers.get("x-terrazza-timestamp"),
    request.headers.get("x-terrazza-signature"),
    secret,
  );
  if (!signatureValid) {
    logIntegrationError("authentication", "invalid_signature");
    return jsonError(401, "invalid_signature");
  }

  const parsed = parsePayload(rawBodyResult.body);
  if (!parsed.ok) return jsonError(parsed.status, parsed.code);

  const payload = parsed.value;
  const safeEventHash = eventHash(payload.externalEventId);

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    logIntegrationError("configuration", "service_role_unavailable", safeEventHash);
    return jsonError(503, "processing_unavailable");
  }

  const { data: rateData, error: rateError } = await admin.rpc(
    "verificar_rate_limit_integracao_leads",
    {
      p_key_id: keyId,
      p_conta_externa_id: payload.accountId,
    },
  );
  if (rateError || !isRecord(rateData) || typeof rateData.allowed !== "boolean") {
    logIntegrationError("rate_limit", rateError?.code ?? "invalid_return", safeEventHash);
    return jsonError(503, "processing_unavailable");
  }
  if (!rateData.allowed) {
    const retryAfter = typeof rateData.retry_after === "number"
      ? rateData.retry_after
      : 60;
    logIntegrationError("rate_limit", "rate_limited", safeEventHash);
    return jsonError(429, "rate_limited", retryAfter);
  }

  const payloadSha256 = createHash("sha256").update(rawBodyResult.body).digest("hex");
  const { data, error } = await admin.rpc(
    "processar_lead_integracao_whatsapp",
    {
      p_integracao: "n8n",
      p_canal: "whatsapp",
      p_conta_externa_id: payload.accountId,
      p_evento_externo_id: payload.externalEventId,
      p_conversa_externa_id: payload.conversationId,
      p_tipo_evento: payload.eventType,
      p_ocorrido_em: payload.occurredAt,
      p_payload_sha256: payloadSha256,
      p_nome: payload.name,
      p_telefone: payload.phoneOriginal,
      p_telefone_normalizado: payload.phoneNormalized,
      p_email: payload.emailOriginal,
      p_email_normalizado: payload.emailNormalized,
      p_cidade: payload.city,
      p_bairro_interesse: payload.neighborhood,
      p_tipo_relacionamento: payload.relationshipType,
      p_objetivo_imobiliario: payload.objective,
      p_handoff_requested: payload.handoffRequested,
    },
  );

  if (error || !isRecord(data)) {
    logIntegrationError("process", error?.code ?? "invalid_return", safeEventHash);
    return jsonError(503, "processing_unavailable");
  }

  const outcome = typeof data.outcome === "string" ? data.outcome : "";
  const errorCode = typeof data.error_code === "string" ? data.error_code : null;
  if (errorCode === "identity_conflict" || outcome === "identity_conflict") {
    logIntegrationError("process", "identity_conflict", safeEventHash);
    return NextResponse.json(
      {
        ok: false,
        error: "identity_conflict",
        event_id: data.event_id ?? null,
        external_event_id: payload.externalEventId,
        outcome,
        idempotent_replay: data.idempotent_replay === true,
      },
      { status: 409 },
    );
  }

  if (
    data.ok !== true
    || !ALLOWED_OUTCOMES.has(outcome)
    || typeof data.event_id !== "string"
    || typeof data.lead_id !== "string"
    || typeof data.idempotent_replay !== "boolean"
  ) {
    logIntegrationError("process", "invalid_return", safeEventHash);
    return jsonError(503, "processing_unavailable");
  }

  return NextResponse.json(
    {
      ok: true,
      event_id: data.event_id,
      external_event_id: payload.externalEventId,
      lead_id: data.lead_id,
      outcome,
      ...(outcome === "duplicate_replay"
        ? { original_outcome: data.original_outcome ?? null }
        : {}),
      idempotent_replay: data.idempotent_replay,
    },
    { status: outcome === "created" ? 201 : 200 },
  );
}
