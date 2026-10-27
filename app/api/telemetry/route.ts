import { createHash, timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

const isoDate = (value: unknown): value is string =>
  typeof value === "string" && Number.isFinite(Date.parse(value)) && value.length <= 40

function isNumberInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max
}

export async function POST(request: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!serviceKey || !supabaseUrl) {
    return NextResponse.json({ error: "Telemetry ingestion is not configured." }, { status: 503 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Send a valid JSON telemetry payload." }, { status: 400 })
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ error: "Send a valid telemetry object." }, { status: 400 })
  }

  const body = payload as Record<string, unknown>
  if (typeof body.device_id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.device_id)) {
    return NextResponse.json({ error: "device_id must be a registered device UUID." }, { status: 400 })
  }
  if (typeof body.api_key !== "string" || body.api_key.length < 32 || body.api_key.length > 128) {
    return NextResponse.json({ error: "A valid device API key is required." }, { status: 401 })
  }
  if (!isoDate(body.recorded_at)) {
    return NextResponse.json({ error: "recorded_at must be an ISO 8601 timestamp." }, { status: 400 })
  }

  const measurements = {
    ds18b20_c: body.ds18b20_c,
    dht22_temperature_c: body.dht22_temperature_c,
    humidity_percent: body.humidity_percent,
  }
  const hasMeasurement = Object.values(measurements).some((value) => value !== undefined && value !== null)
  if (!hasMeasurement) {
    return NextResponse.json({ error: "At least one sensor measurement is required." }, { status: 400 })
  }
  if (measurements.ds18b20_c != null && !isNumberInRange(measurements.ds18b20_c, -55, 125)) {
    return NextResponse.json({ error: "ds18b20_c must be between -55 and 125 °C." }, { status: 400 })
  }
  if (measurements.dht22_temperature_c != null && !isNumberInRange(measurements.dht22_temperature_c, -40, 80)) {
    return NextResponse.json({ error: "dht22_temperature_c must be between -40 and 80 °C." }, { status: 400 })
  }
  if (measurements.humidity_percent != null && !isNumberInRange(measurements.humidity_percent, 0, 100)) {
    return NextResponse.json({ error: "humidity_percent must be between 0 and 100%." }, { status: 400 })
  }
  if (body.rtc_timestamp != null && !isoDate(body.rtc_timestamp)) {
    return NextResponse.json({ error: "rtc_timestamp must be an ISO 8601 timestamp." }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: device, error: deviceError } = await supabase
    .from("devices")
    .select("id, organization_id, credential_hash")
    .eq("id", body.device_id)
    .maybeSingle()

  if (deviceError || !device?.credential_hash) {
    return NextResponse.json({ error: "Device credentials are invalid." }, { status: 401 })
  }

  const suppliedHash = createHash("sha256").update(body.api_key).digest()
  let storedHash: Buffer
  try {
    storedHash = Buffer.from(device.credential_hash, "hex")
  } catch {
    return NextResponse.json({ error: "Device credentials are invalid." }, { status: 401 })
  }
  if (storedHash.length !== suppliedHash.length || !timingSafeEqual(storedHash, suppliedHash)) {
    return NextResponse.json({ error: "Device credentials are invalid." }, { status: 401 })
  }

  const timestamp = body.recorded_at
  const { data: reading, error: readingError } = await supabase
    .from("sensor_readings")
    .insert({
      organization_id: device.organization_id,
      device_id: device.id,
      recorded_at: timestamp,
      ds18b20_c: measurements.ds18b20_c ?? null,
      dht22_temperature_c: measurements.dht22_temperature_c ?? null,
      humidity_percent: measurements.humidity_percent ?? null,
      rtc_timestamp: body.rtc_timestamp ?? null,
    })
    .select("id, recorded_at")
    .single()

  if (readingError || !reading) {
    return NextResponse.json({ error: "Unable to store this reading." }, { status: 500 })
  }

  const temperature = measurements.ds18b20_c ?? measurements.dht22_temperature_c
  let alertCreated = false
  if (typeof temperature === "number" && (temperature < 2 || temperature > 8)) {
    const severity = temperature < 0 || temperature > 10 ? "critical" : "warning"
    const { error: alertError } = await supabase.from("alerts").insert({
      organization_id: device.organization_id,
      device_id: device.id,
      severity,
      category: "temperature",
      title: "Temperature outside the safe range",
      description: "An incoming device reading is outside the configured 2–8 °C demo threshold. Verify the configured range for this storage unit.",
      measured_value: `${temperature.toFixed(2)} °C`,
      recommended_action: "Check the refrigerator, review the door seal, and follow your organization’s vaccine excursion protocol.",
    })
    alertCreated = !alertError
  }

  const status = typeof temperature === "number" && (temperature < 2 || temperature > 8) ? "warning" : "online"
  await supabase.from("devices").update({ status, last_seen_at: timestamp }).eq("id", device.id)

  return NextResponse.json({ ok: true, reading_id: reading.id, recorded_at: reading.recorded_at, alert_created: alertCreated }, { status: 201 })
}
