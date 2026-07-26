import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** @deprecated No operational consumer should use a Publishable client without a user session. */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
