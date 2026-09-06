import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

const DEFAULT_PASSWORD_DESTINATION = "/definir-senha";
const ALLOWED_PASSWORD_DESTINATIONS = new Set([DEFAULT_PASSWORD_DESTINATION]);

function safeNext(value: string | null) {
  const candidate = value?.trim() ?? "";

  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\")
  ) {
    return DEFAULT_PASSWORD_DESTINATION;
  }

  try {
    const url = new URL(candidate, "https://terrazza.internal");

    if (
      url.origin !== "https://terrazza.internal" ||
      !ALLOWED_PASSWORD_DESTINATIONS.has(url.pathname)
    ) {
      return DEFAULT_PASSWORD_DESTINATION;
    }

    return url.pathname;
  } catch {
    return DEFAULT_PASSWORD_DESTINATION;
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");

  if (!tokenHash || (type !== "invite" && type !== "recovery")) {
    return NextResponse.redirect(
      new URL(`/login?error=${type === "recovery" ? "recovery" : "invite"}`, request.url),
    );
  }

  const { error } = await (await createClient()).auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  return error
    ? NextResponse.redirect(new URL(`/login?error=${type}`, request.url))
    : NextResponse.redirect(new URL(next, request.url));
}
