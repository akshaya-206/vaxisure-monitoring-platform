import { NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "Invalid request origin." }, 403)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !supabaseUrl) return json({ error: "Workspace setup is not configured." }, 503)

  const authClient = await createClient()
  const { data: authData, error: authError } = await authClient.auth.getUser()
  if (authError || !authData.user) return json({ error: "Sign in before setting up a workspace." }, 401)

  const database = createSupabaseClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: profile, error: profileError } = await database.from("profiles").select("organization_id, full_name").eq("id", authData.user.id).maybeSingle()
  if (profileError) return json({ error: "Unable to load your account profile." }, 500)
  if (!profile) return json({ error: "Your account profile is not ready yet. Confirm your email and sign in again." }, 409)
  if (profile.organization_id) return json({ ok: true, organization_id: profile.organization_id })

  const displayName = typeof authData.user.user_metadata?.full_name === "string" ? authData.user.user_metadata.full_name.trim() : ""
  const emailName = authData.user.email?.split("@")[0]?.replace(/[._-]+/g, " ").trim()
  const organizationName = `${displayName || emailName || "My"} workspace`.slice(0, 120)
  const { data: organization, error: organizationError } = await database.from("organizations").insert({ name: organizationName, created_by: authData.user.id }).select("id").single()
  if (organizationError || !organization) return json({ error: "Unable to create your workspace. Try again shortly." }, 500)

  const { data: updatedProfile, error: updateError } = await database.from("profiles").update({ organization_id: organization.id, role: "admin", full_name: displayName || profile.full_name || "" }).eq("id", authData.user.id).is("organization_id", null).select("id").maybeSingle()
  if (updateError || !updatedProfile) {
    await database.from("organizations").delete().eq("id", organization.id).eq("created_by", authData.user.id)
    const { data: latestProfile } = await database.from("profiles").select("organization_id").eq("id", authData.user.id).maybeSingle()
    if (latestProfile?.organization_id) return json({ ok: true, organization_id: latestProfile.organization_id })
    return json({ error: "Unable to finish workspace setup. Try again shortly." }, 500)
  }

  return json({ ok: true, organization_id: organization.id }, 201)
}
