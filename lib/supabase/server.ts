import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("As variaveis publicas do Supabase nao estao configuradas.");
  }

  if (!supabasePublishableKey.startsWith("sb_publishable_")) {
    throw new Error("O cliente de sessao exige uma chave Publishable do Supabase.");
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components podem ler cookies, mas nao podem grava-los.
          // O proxy atualiza a sessao antes da renderizacao nesses casos.
        }
      },
    },
  });
}
