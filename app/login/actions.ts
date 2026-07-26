"use server";

import { redirect } from "next/navigation";

import { safeDashboardRedirect } from "../../lib/auth/dashboard-redirect";
import { createClient } from "../../lib/supabase/server";

export type LoginState = {
  message: string;
};

const GENERIC_LOGIN_ERROR =
  "Nao foi possivel entrar. Verifique suas credenciais e tente novamente.";

function valueFromForm(formData: FormData, field: string) {
  return String(formData.get(field) ?? "").trim();
}

function isValidEmail(email: string) {
  return (
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = valueFromForm(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!isValidEmail(email) || !password || password.length > 4096) {
    return { message: GENERIC_LOGIN_ERROR };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { message: GENERIC_LOGIN_ERROR };
  }

  redirect(safeDashboardRedirect(formData.get("redirectTo")));
}

export async function logout() {
  const supabase = await createClient();

  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
