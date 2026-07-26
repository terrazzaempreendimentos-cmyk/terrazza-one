import "server-only";

import type { User } from "@supabase/supabase-js";

import { createClient } from "../supabase/server";

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Autenticacao necessaria.");
    this.name = "AuthenticationRequiredError";
  }
}

export async function getOptionalUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) return null;

  return user;
}

export async function requireUser(): Promise<User> {
  const user = await getOptionalUser();

  if (!user) {
    throw new AuthenticationRequiredError();
  }

  return user;
}
