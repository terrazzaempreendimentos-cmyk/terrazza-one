import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("As variaveis publicas do Supabase nao estao configuradas.");
  }

  if (!supabasePublishableKey.startsWith("sb_publishable_")) {
    throw new Error("O navegador exige uma chave Publishable do Supabase.");
  }

  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
