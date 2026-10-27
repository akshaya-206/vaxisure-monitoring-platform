import { NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import type { AlertStatus } from "@/lib/vaxisure/types"

export const runtime = "nodejs"
const allowedStatuses = new Set<AlertStatus>(["open", "acknowledged", "resolved"])

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } })
}

export async function PATCH(request: Request, context: { params: Promise<{ alertId: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "Invalid request origin." }, 403)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !supabaseUrl) return json({ error: "Alert history is not configured." }, 503)

  const { alertId } = await context.params
  if (!/^[0-9a-f-]{36}$/i.test(alertId)) return json({ error: "Invalid alert identifier." }, 400)
  let payload: unknown
  try { payload = await request.json() } catch { return json({ error: "Send a valid alert status." }, 400) }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return json({ error: "Send a valid alert status." }, 400)
  const status = (payload as Record<string, unknown>).status
  if (typeof status !== "string" || !allowedStatuses.has(status as AlertStatus)) return json({ error: "Choose a valid alert status." }, 400)

  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) return json({ error: "Sign in to update alerts." }, 401)
  const { data: profile, error: profileError } = await supabase.from("profiles").select("organization_id, role").eq("id", authData.user.id).maybeSingle()
  if (profileError) return json({ error: "Unable to verify workspace permissions." }, 500)
  if (!profile?.organization_id || !["admin", "clinic_staff"].includes(profile.role)) return json({ error: "Your role cannot update alerts." }, 403)

  const { data: alert, error: alertError } = await supabase.from("alerts").select("id, status").eq("id", alertId).maybeSingle()
  if (alertError) return json({ error: "Unable to load this alert." }, 500)
  if (!alert) return json({ error: "Alert not found in this workspace." }, 404)

  const nextStatus = status as AlertStatus
  const resolvedAt = nextStatus === "resolved" ? new Date().toISOString() : null
  const { data: updated, error: updateError } = await supabase.from("alerts").update({ status: nextStatus, resolved_at: resolvedAt }).eq("id", alertId).select("id").maybeSingle()
  if (updateError) return json({ error: "Unable to update alert status." }, 500)
  if (!updated) return json({ error: "This alert could not be updated. Refresh and try again." }, 409)

  const database = createSupabaseClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const action = nextStatus === "open" ? "reopened" : nextStatus
  const { error: historyError } = await database.from("alert_history").insert({ alert_id: alertId, actor_id: authData.user.id, action, note: "Status changed from the VaxiSure alert register." })
  return json({ ok: true, history_recorded: !historyError }, historyError ? 207 : 200)
}
