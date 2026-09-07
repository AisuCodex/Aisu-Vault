import { createBrowserClient } from "@supabase/ssr";

export function getBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "missing-publishable-key";
  return createBrowserClient(url, key);
}
