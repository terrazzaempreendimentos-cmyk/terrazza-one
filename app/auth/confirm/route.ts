import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
function safeNext(value: string | null) { return value && value.startsWith("/") && !value.startsWith("//") && !value.includes("://") ? value : "/definir-senha"; }
export async function GET(request: NextRequest) {
  const url = new URL(request.url); const next = safeNext(url.searchParams.get("next")); const tokenHash = url.searchParams.get("token_hash"); const type = url.searchParams.get("type");
  if (!tokenHash || type !== "invite") return NextResponse.redirect(new URL("/login?error=invite", request.url));
  const { error } = await (await createClient()).auth.verifyOtp({ token_hash: tokenHash, type: "invite" });
  return error ? NextResponse.redirect(new URL("/login?error=invite", request.url)) : NextResponse.redirect(new URL(next, request.url));
}
