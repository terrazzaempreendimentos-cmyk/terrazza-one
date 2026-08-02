import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { PasswordForm } from "./password-form";
export default async function DefinirSenhaPage() { const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect("/login"); return <main className="flex min-h-screen items-center justify-center bg-[#F7F3ED] p-6"><PasswordForm /></main>; }
