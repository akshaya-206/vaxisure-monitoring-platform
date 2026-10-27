"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import type { Alert, Device, MonitoringData, SensorReading, Shipment, ShipmentLocation, VaccineBatch } from "./types"

export function useMonitoringData(userId: string | null) {
  return useSWR<MonitoringData>(
    userId ? ["vaxisure-monitoring", userId] : null,
    async () => {
      const supabase = createClient()
      const [profileResult, devicesResult, readingsResult, alertsResult, batchesResult, shipmentsResult, locationsResult] = await Promise.all([
        supabase.from("profiles").select("organization_id, role").maybeSingle(),
        supabase.from("devices").select("id, device_code, name, location, sensor_types, firmware_version, status, last_seen_at").order("created_at", { ascending: false }),
        supabase.from("sensor_readings").select("id, device_id, recorded_at, ds18b20_c, dht22_temperature_c, humidity_percent, rtc_timestamp").order("recorded_at", { ascending: false }).limit(240),
        supabase.from("alerts").select("id, device_id, shipment_id, severity, category, title, description, measured_value, recommended_action, status, created_at, resolved_at").order("created_at", { ascending: false }).limit(300),
        supabase.from("vaccine_batches").select("id, vaccine_name, batch_number, quantity, storage_location, min_temperature_c, max_temperature_c, expires_on, device_id, shipment_id, archived_at").order("created_at", { ascending: false }).limit(300),
        supabase.from("shipments").select("id, shipment_code, origin, destination, status, estimated_arrival, device_id").order("created_at", { ascending: false }).limit(200),
        supabase.from("shipment_locations").select("id, shipment_id, latitude, longitude, recorded_at").order("recorded_at", { ascending: false }).limit(500),
      ])

      const failed = [profileResult, devicesResult, readingsResult, alertsResult, batchesResult, shipmentsResult, locationsResult].find((result) => result.error)
      if (failed?.error) throw new Error(failed.error.message)

      let organizationName = "Your organization"
      if (profileResult.data?.organization_id) {
        const { data: organization, error } = await supabase.from("organizations").select("name").eq("id", profileResult.data.organization_id).maybeSingle()
        if (error) throw new Error(error.message)
        organizationName = organization?.name ?? organizationName
      }

      const asNumber = (value: unknown) => value == null ? null : Number(value)
      return {
        devices: (devicesResult.data ?? []) as Device[],
        readings: (readingsResult.data ?? []).map((reading) => ({
          ...reading,
          ds18b20_c: asNumber(reading.ds18b20_c),
          dht22_temperature_c: asNumber(reading.dht22_temperature_c),
          humidity_percent: asNumber(reading.humidity_percent),
        })) as SensorReading[],
        alerts: (alertsResult.data ?? []) as Alert[],
        batches: (batchesResult.data ?? []).map((batch) => ({
          ...batch,
          min_temperature_c: Number(batch.min_temperature_c),
          max_temperature_c: Number(batch.max_temperature_c),
        })) as VaccineBatch[],
        shipments: (shipmentsResult.data ?? []) as Shipment[],
        locations: (locationsResult.data ?? []).map((location) => ({
          ...location,
          latitude: Number(location.latitude),
          longitude: Number(location.longitude),
        })) as ShipmentLocation[],
        organizationName,
        role: profileResult.data?.role ?? "clinic_staff",
      }
    },
    { refreshInterval: 15000, revalidateOnFocus: true, keepPreviousData: true },
  )
}
