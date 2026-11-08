import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Napkin treats every browser tab as its own person.
 *
 * The generated client persists its session in localStorage, which every tab
 * shares — so three tabs would all be the same visitor. This client keeps its
 * session in sessionStorage under a tab-unique key instead, so each tab signs
 * in as its own anonymous visitor and shows up separately in a Napkin.
 */

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function tabStorageKey() {
  const existing = window.sessionStorage.getItem("napkin-tab-key");
  if (existing) return existing;
  const key = `napkin-auth-${crypto.randomUUID()}`;
  window.sessionStorage.setItem("napkin-tab-key", key);
  return key;
}

function createTabClient() {
  const url = import.meta.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"];
  const key =
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Missing Supabase environment variables.");

  const browser = typeof window !== "undefined";
  return createClient<Database>(url, key, {
    global: { fetch: createSupabaseFetch(key) },
    auth: browser
      ? {
          storage: window.sessionStorage,
          storageKey: tabStorageKey(),
          persistSession: true,
          autoRefreshToken: true,
        }
      : { persistSession: false, autoRefreshToken: false },
  });
}

let instance: ReturnType<typeof createTabClient> | undefined;

/** Supabase client scoped to this browser tab. */
export const supabaseTab = new Proxy({} as ReturnType<typeof createTabClient>, {
  get(_, prop, receiver) {
    if (!instance) instance = createTabClient();
    return Reflect.get(instance, prop, receiver);
  },
});
