"use server";

import { createClient } from "../../lib/supabase/server";

export type ForgotPasswordState = {
  submitted: boolean;
  message: string;
};

const GENERIC_RECOVERY_MESSAGE =
  "Se esse e-mail existir em nossa base, você receberá um link de recuperação.";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function solicitarRecuperacaoSenha(
  _previousState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!emailPattern.test(email) || email.length > 254) {
    return { submitted: true, message: GENERIC_RECOVERY_MESSAGE };
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

  if (!site || !/^https?:\/\/[^/]+$/i.test(site)) {
    console.error({
      modulo: "recuperacao_senha",
      etapa: "validar_site_url",
      mensagem: "NEXT_PUBLIC_SITE_URL ausente ou invalida.",
    });
    return { submitted: true, message: GENERIC_RECOVERY_MESSAGE };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${site}/auth/confirm`,
    });

    if (error) {
      console.error({
        modulo: "recuperacao_senha",
        etapa: "reset_password_for_email",
        status: error.status,
        code: (error as { code?: string }).code,
        mensagem: error.message,
      });
    }
  } catch (error) {
    console.error({
      modulo: "recuperacao_senha",
      etapa: "reset_password_for_email",
      mensagem: error instanceof Error ? error.message : "Erro inesperado.",
    });
  }

  return { submitted: true, message: GENERIC_RECOVERY_MESSAGE };
}
