import { createClient } from "@supabase/supabase-js";

export function getMissingSupabaseEnv() {
  const missing: string[] = [];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!url) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  } else if (!url.includes("supabase.co")) {
    missing.push(
      "NEXT_PUBLIC_SUPABASE_URL must point to your Supabase project, not your Vercel domain",
    );
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }

  return missing;
}

export function formatSupabaseRequestError(
  message: string,
  scope: string,
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  if (message.toLowerCase().includes("failed to fetch")) {
    if (url.includes("vercel.app")) {
      return `Cloud could not reach Supabase while loading ${scope}. NEXT_PUBLIC_SUPABASE_URL is currently set to ${url}, but it must be your Supabase project URL.`;
    }

    return `Cloud could not reach Supabase while loading ${scope}. Check NEXT_PUBLIC_SUPABASE_URL, then redeploy or restart the app after updating env vars.`;
  }

  return message;
}

export function createSupabaseBrowserClient(
  accessToken?: () => Promise<string | null>,
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publicKey) {
    return null;
  }

  return createClient(url, publicKey, {
    accessToken,
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
