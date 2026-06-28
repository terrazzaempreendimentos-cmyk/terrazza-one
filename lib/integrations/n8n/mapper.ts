import type { LeadContext } from "../../ia/motor";
import type { N8NUCEAction, N8NUCERequest, N8NUCEResponse } from "./types";

type UCEApiPayload = {
  conversationId?: string;
  message: string;
  channel: N8NUCERequest["channel"];
  origin: N8NUCERequest["origin"];
  leadType: N8NUCERequest["leadType"];
  city?: string;
  responseMode: N8NUCERequest["responseMode"];
  context: Partial<LeadContext>;
};

type UCEApiResponseShape = Omit<N8NUCEResponse, "actions"> & {
  actions?: N8NUCEAction[];
};

export function mapN8NToUCEPayload(request: N8NUCERequest): UCEApiPayload {
  return {
    conversationId: request.conversationId,
    message: request.message,
    channel: request.channel,
    origin: request.origin,
    leadType: request.leadType,
    city: request.city,
    responseMode: request.responseMode,
    context: request.context ?? {},
  };
}

export function mapUCEResponseToN8N(response: UCEApiResponseShape): N8NUCEResponse {
  return {
    ...response,
    actions: response.actions ?? [],
  };
}
