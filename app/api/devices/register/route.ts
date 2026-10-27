import { createHash, randomBytes } from "node:crypto"
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
  if (!serviceKey || !supabaseUrl) return json({ error: "Device registration is not configured." }, 503)

  const authClient = await createClient()
  const { data: authData, error: authError } = await authClient.auth.getUser()
  if (authError || !authData.user) return json({ error: "Sign in to register a device." }, 401)

  let payload: unknown
  try { payload = await request.json() } catch { return json({ error: "Send valid device details." }, 400) }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return json({ error: "Send valid device details." }, 400)

  const body = payload as Record<string, unknown>
  const deviceCode = typeof body.device_code === "string" ? body.device_code.trim() : ""
  const name = typeof body.name === "string" ? body.name.trim() : ""
  const location = typeof body.location === "string" ? body.location.trim() : ""
  const firmwareVersion = typeof body.firmware_version === "string" ? body.firmware_version.trim() : ""
  const sensors = Array.isArray(body.sensor_types) ? body.sensor_types : []
  const allowedSensors = new Set(["DS18B20", "DHT22", "DS3231"])
  if (!/^[A-Za-z0-9._-]{2,48}$/.test(deviceCode) || !name || name.length > 100 || location.length > 120 || firmwareVersion.length > 40) {
    return json({ error: "Enter a valid device ID, name, location, and firmware version." }, 400)
  }
  if (!sensors.length || sensors.length > 3 || sensors.some((sensor) => typeof sensor !== "string" || !allowedSensors.has(sensor))) {
    return json({ error: "Choose one or more supported sensors: DS18B20, DHT22, or DS3231." }, 400)
  }

  const database = createSupabaseClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: profile, error: profileError } = await database.from("profiles").select("organization_id, role").eq("id", authData.user.id).maybeSingle()
  if (profileError) return json({ error: "Unable to verify your workspace permissions." }, 500)
  if (!profile?.organization_id || profile.role !== "admin") return json({ error: "Only workspace administrators can register devices." }, 403)

  const apiKey = randomBytes(32).toString("base64url")
  const credentialHash = createHash("sha256").update(apiKey).digest("hex")
  const { data: device, error: insertError } = await database.from("devices").insert({
    organization_id: profile.organization_id,
    device_code: deviceCode,
    name,
    location,
    sensor_types: sensors,
    firmware_version: firmwareVersion,
    status: "offline",
    credential_hash: credentialHash,
  }).select("id, device_code, name, location, sensor_types, firmware_version, status, last_seen_at").single()

  if (insertError || !device) {
    if (insertError?.code === "23505") return json({ error: "That device ID is already registered in this workspace." }, 409)
    return json({ error: "Unable to register the device. Check the entered details and try again." }, 500)
  }

  return json({ device, api_key: apiKey }, 201)
}
