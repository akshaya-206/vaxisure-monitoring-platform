import type { Alert, Device, MonitoringData, SensorReading, Shipment, ShipmentLocation, VaccineBatch } from "./types"

const now = Date.now()
const ago = (hours: number) => new Date(now - hours * 60 * 60 * 1000).toISOString()

export const demoDevices: Device[] = [
  { id: "demo-device-1", device_code: "ESP32-VC-001", name: "Central Pharmacy Fridge", location: "Central Pharmacy · Unit 02", sensor_types: ["DS18B20", "DHT22", "DS3231"], firmware_version: "1.4.2", status: "online", last_seen_at: ago(0.03) },
  { id: "demo-device-2", device_code: "ESP32-VC-002", name: "North Wing Vaccine Store", location: "North Wing · Room 104", sensor_types: ["DS18B20", "DHT22", "DS3231"], firmware_version: "1.4.2", status: "online", last_seen_at: ago(0.08) },
  { id: "demo-device-3", device_code: "ESP32-TR-014", name: "Transit Cooler 14", location: "En route · Mumbai → Pune", sensor_types: ["DS18B20", "DHT22", "DS3231"], firmware_version: "1.3.8", status: "warning", last_seen_at: ago(0.17) },
  { id: "demo-device-4", device_code: "ESP32-VC-004", name: "Outpatient Clinic Fridge", location: "Outpatient · Unit 01", sensor_types: ["DS18B20", "DHT22", "DS3231"], firmware_version: "1.4.1", status: "offline", last_seen_at: ago(3.2) },
]

export const demoShipments: Shipment[] = [
  { id: "demo-shipment-1", shipment_code: "VS-2048", origin: "Mumbai Central Depot", destination: "Pune District Clinic", status: "in_transit", estimated_arrival: new Date(now + 2.2 * 60 * 60 * 1000).toISOString(), device_id: "demo-device-3" },
  { id: "demo-shipment-2", shipment_code: "VS-2049", origin: "Nashik Regional Store", destination: "Aurangabad Health Center", status: "delayed", estimated_arrival: new Date(now + 5.5 * 60 * 60 * 1000).toISOString(), device_id: "demo-device-2" },
  { id: "demo-shipment-3", shipment_code: "VS-2047", origin: "Thane Distribution Hub", destination: "Mumbai Central Depot", status: "delivered", estimated_arrival: ago(1.4), device_id: "demo-device-1" },
]

export const demoLocations: ShipmentLocation[] = [
  { id: "demo-location-1", shipment_id: "demo-shipment-1", latitude: 18.92, longitude: 73.05, recorded_at: ago(0.08) },
  { id: "demo-location-2", shipment_id: "demo-shipment-2", latitude: 19.99, longitude: 73.77, recorded_at: ago(0.3) },
  { id: "demo-location-3", shipment_id: "demo-shipment-3", latitude: 19.19, longitude: 72.98, recorded_at: ago(1.4) },
]

export const demoBatches: VaccineBatch[] = [
  { id: "demo-batch-1", vaccine_name: "COVID-19 · mRNA", batch_number: "CVX-2026-0842", quantity: 480, storage_location: "Central Pharmacy · Unit 02", min_temperature_c: 2, max_temperature_c: 8, expires_on: new Date(now + 126 * 86400000).toISOString().slice(0, 10), device_id: "demo-device-1", shipment_id: null, archived_at: null },
  { id: "demo-batch-2", vaccine_name: "Influenza · Quadrivalent", batch_number: "FLU-2026-1208", quantity: 216, storage_location: "North Wing · Room 104", min_temperature_c: 2, max_temperature_c: 8, expires_on: new Date(now + 18 * 86400000).toISOString().slice(0, 10), device_id: "demo-device-2", shipment_id: null, archived_at: null },
  { id: "demo-batch-3", vaccine_name: "Hepatitis B · Pediatric", batch_number: "HEP-2026-0511", quantity: 95, storage_location: "Central Pharmacy · Unit 02", min_temperature_c: 2, max_temperature_c: 8, expires_on: new Date(now + 210 * 86400000).toISOString().slice(0, 10), device_id: "demo-device-1", shipment_id: null, archived_at: null },
  { id: "demo-batch-4", vaccine_name: "MMR · Live attenuated", batch_number: "MMR-2026-0398", quantity: 64, storage_location: "In transit · Cooler 14", min_temperature_c: 2, max_temperature_c: 8, expires_on: new Date(now + 78 * 86400000).toISOString().slice(0, 10), device_id: "demo-device-3", shipment_id: "demo-shipment-1", archived_at: null },
  { id: "demo-batch-5", vaccine_name: "Tetanus · Tdap", batch_number: "TDAP-2026-1023", quantity: 180, storage_location: "Outpatient · Unit 01", min_temperature_c: 2, max_temperature_c: 8, expires_on: new Date(now + 275 * 86400000).toISOString().slice(0, 10), device_id: "demo-device-4", shipment_id: null, archived_at: null },
]

export const demoAlerts: Alert[] = [
  { id: "demo-alert-1", device_id: "demo-device-3", shipment_id: "demo-shipment-1", severity: "critical", category: "temperature", title: "Temperature excursion detected", description: "Transit cooler temperature exceeded the safe upper limit for 12 minutes.", measured_value: "8.6 °C", recommended_action: "Contact the driver and verify the cooler seal and power supply.", status: "open", created_at: ago(0.15), resolved_at: null },
  { id: "demo-alert-2", device_id: "demo-device-4", shipment_id: null, severity: "warning", category: "connectivity", title: "Device stopped reporting", description: "No sensor update has been received from the outpatient clinic refrigerator.", measured_value: "Last seen 3h ago", recommended_action: "Check the ESP32 power, Wi-Fi connection, and device status.", status: "open", created_at: ago(0.5), resolved_at: null },
  { id: "demo-alert-3", device_id: "demo-device-2", shipment_id: "demo-shipment-2", severity: "warning", category: "shipment", title: "Delivery running behind schedule", description: "Route delay may affect the expected delivery window.", measured_value: "ETA +55 min", recommended_action: "Confirm the updated arrival time with the receiving clinic.", status: "acknowledged", created_at: ago(1.8), resolved_at: null },
  { id: "demo-alert-4", device_id: "demo-device-1", shipment_id: null, severity: "info", category: "inventory", title: "Batch approaching expiry", description: "An influenza vaccine batch expires within 30 days.", measured_value: "18 days remaining", recommended_action: "Review local stock rotation and clinic demand.", status: "open", created_at: ago(4.2), resolved_at: null },
  { id: "demo-alert-5", device_id: "demo-device-3", shipment_id: "demo-shipment-1", severity: "warning", category: "humidity", title: "Humidity trend increased", description: "Humidity rose above the configured comfort band during transit.", measured_value: "68% RH", recommended_action: "Inspect packaging and verify the cooler remains closed.", status: "resolved", created_at: ago(8), resolved_at: ago(6.5) },
]

export const demoReadings: SensorReading[] = Array.from({ length: 48 }, (_, index) => {
  const hoursAgo = 47 - index
  const recordedAt = ago(hoursAgo * 0.5)
  const stable = 4.6 + Math.sin(index * 0.7) * 0.36 + Math.cos(index * 0.21) * 0.16
  const transitSpike = index === 37 ? 8.6 : index === 38 ? 8.2 : stable
  return {
    id: `demo-reading-${index}`,
    device_id: index > 35 ? "demo-device-3" : "demo-device-1",
    recorded_at: recordedAt,
    ds18b20_c: Number(transitSpike.toFixed(2)),
    dht22_temperature_c: Number((transitSpike + 0.18).toFixed(2)),
    humidity_percent: Number((58 + Math.sin(index * 0.4) * 5 + (index === 37 ? 10 : 0)).toFixed(1)),
    rtc_timestamp: recordedAt,
  }
}).reverse()

export const demoMonitoringData: MonitoringData = {
  devices: demoDevices,
  readings: demoReadings,
  alerts: demoAlerts,
  alertHistory: [],
  batches: demoBatches,
  shipments: demoShipments,
  locations: demoLocations,
  organizationName: "Cedarview Regional Health",
  role: "admin",
}
