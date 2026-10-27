import { createBrowserClient } from "@supabase/ssr"

let browserClient: ReturnType<typeof createBrowserClient> | undefined

export function createClient() {
  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) throw new Error("Supabase is not configured for this deployment.")

    browserClient = createBrowserClient(url, key, {
      cookieOptions: { secure: process.env.NODE_ENV === "production", sameSite: "lax" },
    })
  }

  return browserClient
}
