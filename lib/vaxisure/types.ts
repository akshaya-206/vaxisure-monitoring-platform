export type Severity = "critical" | "warning" | "info"
export type AlertStatus = "open" | "acknowledged" | "resolved"
export type DeviceStatus = "online" | "warning" | "offline"
export type ShipmentStatus = "prepared" | "in_transit" | "delayed" | "delivered" | "requires_attention"

export type Device = {
  id: string
  device_code: string
  name: string
  location: string
  sensor_types: string[]
  firmware_version: string
  status: DeviceStatus
  last_seen_at: string | null
}

export type SensorReading = {
  id: string
  device_id: string
  recorded_at: string
  ds18b20_c: number | null
  dht22_temperature_c: number | null
  humidity_percent: number | null
  rtc_timestamp: string | null
}

export type AlertHistory = {
  id: string
  alert_id: string
  actor_id: string | null
  action: "created" | "acknowledged" | "resolved" | "reopened"
  note: string
  created_at: string
}

export type Alert = {
  id: string
  device_id: string | null
  shipment_id: string | null
  severity: Severity
  category: string
  title: string
  description: string
  measured_value: string | null
  recommended_action: string
  status: AlertStatus
  created_at: string
  resolved_at: string | null
}

export type VaccineBatch = {
  id: string
  vaccine_name: string
  batch_number: string
  quantity: number
  storage_location: string
  min_temperature_c: number
  max_temperature_c: number
  expires_on: string | null
  device_id: string | null
  shipment_id: string | null
  archived_at: string | null
}

export type Shipment = {
  id: string
  shipment_code: string
  origin: string
  destination: string
  status: ShipmentStatus
  estimated_arrival: string | null
  device_id: string | null
}

export type ShipmentLocation = {
  id: string
  shipment_id: string
  latitude: number
  longitude: number
  recorded_at: string
}

export type MonitoringData = {
  devices: Device[]
  readings: SensorReading[]
  alerts: Alert[]
  alertHistory: AlertHistory[]
  batches: VaccineBatch[]
  shipments: Shipment[]
  locations: ShipmentLocation[]
  organizationName: string
  organizationId?: string | null
  role: "admin" | "clinic_staff" | "transportation"
}
