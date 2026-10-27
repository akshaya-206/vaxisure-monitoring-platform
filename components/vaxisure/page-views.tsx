"use client"

import { useMemo, useState } from "react"
import { ArrowDownRight, ArrowRight, ArrowUpRight, Bell, Check, ChevronDown, CircleAlert, CircleCheck, Clock3, Download, FileDown, Filter, MapPin, Package, Plus, Radio, ShieldCheck, Thermometer, Truck, Wifi, WifiOff } from "lucide-react"
import { TemperatureChart } from "./temperature-chart"
import { ShipmentMap } from "./shipment-map"
import type { Alert, AlertStatus, Device, DeviceStatus, MonitoringData, SensorReading, Shipment, ShipmentStatus, VaccineBatch } from "@/lib/vaxisure/types"

const shortTime = (date: string | null) => date ? new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Not reported"
const fullTime = (date: string | null) => date ? new Date(date).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "No update yet"
const relativeTime = (date: string) => {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 60000))
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`
  return `${Math.floor(minutes / 1440)}d ago`
}

export function StatusPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "good" | "warning" | "critical" | "neutral" | "info" }) {
  return <span className={`status-pill status-pill--${tone}`}><i />{children}</span>
}

export function AlertItem({ alert, deviceName, onClick }: { alert: Alert; deviceName: string; onClick?: () => void }) {
  return (
    <button type="button" className="alert-item" onClick={onClick}>
      <span className={`alert-item__icon alert-item__icon--${alert.severity}`}>
        {alert.severity === "critical" ? <CircleAlert size={17} /> : alert.severity === "warning" ? <Bell size={17} /> : <CircleCheck size={17} />}
      </span>
      <span className="alert-item__copy"><strong>{alert.title}</strong><small>{deviceName} · {relativeTime(alert.created_at)}</small></span>
      <span className={`severity-dot severity-dot--${alert.severity}`} aria-label={`${alert.severity} severity`} />
    </button>
  )
}

function MetricCard({ label, value, detail, icon: Icon, tone, trend, onClick }: {
  label: string; value: string | number; detail: string; icon: typeof Radio; tone: string; trend?: "up" | "down"; onClick?: () => void
}) {
  return <button type="button" className={`metric-card metric-card--${tone}`} onClick={onClick}>
    <span className="metric-card__top"><span className="metric-card__icon"><Icon size={18} /></span><span className="metric-card__trend">{trend === "up" ? <ArrowUpRight size={14} /> : trend === "down" ? <ArrowDownRight size={14} /> : <ArrowRight size={14} />}</span></span>
    <span className="metric-card__value">{value}</span><span className="metric-card__label">{label}</span><span className="metric-card__detail">{detail}</span>
  </button>
}

export function DashboardView({ data, demo, userName = "there", onNavigate, onAlertClick }: { data: MonitoringData; demo: boolean; userName?: string; onNavigate: (page: string) => void; onAlertClick: (alert: Alert) => void }) {
  const latest = data.readings[0]
  const online = data.devices.filter((device) => device.status === "online").length
  const activeShipments = data.shipments.filter((shipment) => ["in_transit", "delayed", "requires_attention"].includes(shipment.status)).length
  const openAlerts = data.alerts.filter((alert) => alert.status !== "resolved")
  const attention = data.batches.filter((batch) => {
    const device = data.devices.find((item) => item.id === batch.device_id)
    const daysToExpiry = batch.expires_on ? (new Date(batch.expires_on).getTime() - Date.now()) / 86400000 : 999
    return daysToExpiry < 30 || device?.status === "warning" || device?.status === "offline"
  }).length
  const latestTemp = latest?.ds18b20_c ?? latest?.dht22_temperature_c
  const deviceName = (id: string | null) => data.devices.find((device) => device.id === id)?.name ?? "Network"
  const timeline = data.shipments.slice(0, 4)

  return <div className="page-stack">
    <div className="dashboard-intro"><div><div className="eyebrow">NETWORK OVERVIEW <span className="eyebrow__divider">/</span> LIVE OPERATIONS</div><h1>Good morning, <span>{userName}</span></h1><p>Here&apos;s the latest cold-chain status for {data.organizationName}.</p></div><div className="dashboard-intro__actions"><span className="updated-label"><i className="online-pulse" />Updated {latest ? relativeTime(latest.recorded_at) : "just now"}</span><button className="button button--primary" onClick={() => onNavigate("monitoring")}><ActivityIcon />Open live monitor</button></div></div>
    <div className="metric-grid">
      <MetricCard label="Active devices" value={`${online} / ${data.devices.length}`} detail={`${data.devices.length - online} need a connection check`} icon={Radio} tone="teal" onClick={() => onNavigate("devices")} />
      <MetricCard label="Shipments in transit" value={activeShipments} detail="Across monitored routes" icon={Truck} tone="blue" onClick={() => onNavigate("shipments")} />
      <MetricCard label="Vaccines need attention" value={attention} detail="Expiry or storage review" icon={Package} tone="amber" onClick={() => onNavigate("inventory")} />
      <MetricCard label="Open temperature alerts" value={data.alerts.filter((alert) => alert.category === "temperature" && alert.status !== "resolved").length} detail={`${openAlerts.length} total open alerts`} icon={Thermometer} tone="red" onClick={() => onNavigate("alerts")} />
    </div>
    <div className="dashboard-grid">
      <section className="panel sensor-panel">
        <div className="panel-heading"><div><div className="eyebrow"><span className="live-dot" /> LIVE ENVIRONMENTAL MONITOR</div><h2>Central Pharmacy Fridge</h2><p>ESP32-VC-001 <span className="dot-separator">·</span> Central Pharmacy · Unit 02</p></div><div className="sensor-panel__right"><StatusPill tone={demo ? "info" : "good"}>{demo ? "Demo feed" : "Connected"}</StatusPill><button className="icon-button" aria-label="Open monitoring page" onClick={() => onNavigate("monitoring")}><ArrowRight size={17} /></button></div></div>
        <div className="sensor-values">
          <div className="sensor-value sensor-value--primary"><span><Thermometer size={16} /> Storage temperature</span><strong>{latestTemp == null ? "—" : `${latestTemp.toFixed(1)}°`}<small>C</small></strong><em className={latestTemp != null && (latestTemp < 2 || latestTemp > 8) ? "text-critical" : "text-good"}>{latestTemp != null && (latestTemp < 2 || latestTemp > 8) ? "Outside recommended range" : "Within recommended range"}</em></div>
          <div className="sensor-value"><span><DropletIcon /> Relative humidity</span><strong>{latest?.humidity_percent == null ? "—" : `${latest.humidity_percent.toFixed(0)}%`}</strong><em>Recommended 30–70%</em></div>
          <div className="sensor-value"><span><Clock3 size={15} /> Last sensor update</span><strong className="sensor-value__time">{latest ? shortTime(latest.recorded_at) : "—"}</strong><em>{latest ? relativeTime(latest.recorded_at) : "Waiting for data"}</em></div>
        </div>
        <TemperatureChart readings={data.readings} compact />
      </section>
      <section className="panel alerts-panel">
        <div className="panel-heading panel-heading--tight"><div><div className="eyebrow">ATTENTION REQUIRED</div><h2>Recent alerts <span className="count-badge">{openAlerts.length}</span></h2></div><button className="text-button" onClick={() => onNavigate("alerts")}>View all <ArrowRight size={14} /></button></div>
        <div className="alert-list">{data.alerts.slice(0, 4).map((alert) => <AlertItem key={alert.id} alert={alert} deviceName={deviceName(alert.device_id)} onClick={() => onAlertClick(alert)} />)}</div>
        {!data.alerts.length && <div className="quiet-empty"><Check size={18} /><span>No alerts. Your network is clear.</span></div>}
        <div className="panel-footer"><span><span className="severity-dot severity-dot--critical" />Critical <b>{data.alerts.filter((item) => item.severity === "critical" && item.status !== "resolved").length}</b></span><span><span className="severity-dot severity-dot--warning" />Warning <b>{data.alerts.filter((item) => item.severity === "warning" && item.status !== "resolved").length}</b></span></div>
      </section>
      <section className="panel activity-panel">
        <div className="panel-heading panel-heading--tight"><div><div className="eyebrow">LOGISTICS</div><h2>Shipment activity</h2></div><button className="text-button" onClick={() => onNavigate("shipments")}>Track all <ArrowRight size={14} /></button></div>
        <div className="shipment-timeline">{timeline.map((shipment, index) => <div className="shipment-timeline__item" key={shipment.id}><span className={`timeline-icon timeline-icon--${shipment.status}`}><Truck size={15} /></span><div className="shipment-timeline__copy"><strong>{shipment.shipment_code} <span>{shipment.status.replaceAll("_", " ")}</span></strong><small>{shipment.origin} <ArrowRight size={11} /> {shipment.destination}</small><small className="muted">{shipment.estimated_arrival ? `ETA ${shortTime(shipment.estimated_arrival)}` : "ETA not reported"}</small></div>{index < timeline.length - 1 && <i className="timeline-line" />}</div>)}</div>
      </section>
      <section className="panel health-panel">
        <div className="panel-heading panel-heading--tight"><div><div className="eyebrow">DEVICE HEALTH</div><h2>Network connectivity</h2></div><button className="icon-button" aria-label="View all devices" onClick={() => onNavigate("devices")}><ArrowRight size={17} /></button></div>
        <div className="health-summary"><span className="health-summary__number">{online}<small>/{data.devices.length}</small></span><span><strong>devices online</strong><small>Last 15-minute heartbeat</small></span></div>
        <div className="health-bar"><i style={{ width: `${data.devices.length ? (online / data.devices.length) * 100 : 0}%` }} /></div>
        <div className="health-device-list">{data.devices.slice(0, 3).map((device) => <div className="health-device" key={device.id}><span className={`device-mini-dot device-mini-dot--${device.status}`} /><span>{device.name}</span><small>{device.status === "offline" ? "Offline" : device.status === "warning" ? "Check" : "Online"}</small></div>)}</div>
      </section>
    </div>
  </div>
}

function ActivityIcon() { return <ActivityMark /> }
function ActivityMark() { return <span className="button-icon-pulse"><Radio size={15} /></span> }
function DropletIcon() { return <span className="inline-icon">◌</span> }

export function MonitoringView({ data, demo, error, onNavigate }: { data: MonitoringData; demo: boolean; error?: string; onNavigate: (page: string) => void }) {
  const [deviceId, setDeviceId] = useState(data.devices[0]?.id ?? "")
  const device = data.devices.find((item) => item.id === deviceId) ?? data.devices[0]
  const readings = useMemo(() => data.readings.filter((item) => item.device_id === device?.id), [data.readings, device?.id])
  const latest = readings[0]
  const temp = latest?.ds18b20_c ?? latest?.dht22_temperature_c
  const lastAt = device?.last_seen_at ?? latest?.recorded_at ?? null
  const cards = [
    { label: "DS18B20 temperature", value: latest?.ds18b20_c, unit: "°C", icon: Thermometer },
    { label: "DHT22 temperature", value: latest?.dht22_temperature_c, unit: "°C", icon: Thermometer },
    { label: "Relative humidity", value: latest?.humidity_percent, unit: "%", icon: DropletsIcon },
  ]
  return <div className="page-stack">
    {demo && <div className="demo-banner"><span className="demo-banner__dot" /><div><strong>DEMO MODE</strong><span>These sample values are simulated and are not from physical ESP32 hardware.</span></div><span className="demo-banner__tag">SIMULATED DATA</span></div>}
    <div className="page-title-row"><div><div className="eyebrow">SENSOR TELEMETRY</div><h1>Live monitoring</h1><p>Sensor readings, device health, and recent history.</p></div><div className="title-actions"><label className="select-control"><span className="sr-only">Select device</span><select value={device?.id ?? ""} onChange={(event) => setDeviceId(event.target.value)}>{data.devices.map((item) => <option key={item.id} value={item.id}>{item.device_code} · {item.name}</option>)}</select><ChevronDown size={14} /></label><StatusPill tone={demo ? "info" : device?.status === "online" ? "good" : device?.status === "warning" ? "warning" : "critical"}>{demo ? "Simulated feed" : device?.status ?? "No device"}</StatusPill></div></div>
    {error && <div className="inline-error"><CircleAlert size={17} />{error}</div>}
    {device ? <>
      <section className="monitor-device-card panel"><div className="monitor-device-card__icon"><Radio size={21} /></div><div className="monitor-device-card__main"><div className="eyebrow">ACTIVE DEVICE</div><h2>{device.name}</h2><p>{device.device_code}<span className="dot-separator">·</span>{device.location}</p></div><div className="monitor-device-detail"><span>Last communication</span><strong>{fullTime(lastAt)}</strong><small>{lastAt ? relativeTime(lastAt) : "No communication yet"}</small></div><div className="monitor-device-detail"><span>RTC DS3231 timestamp</span><strong>{latest?.rtc_timestamp ? fullTime(latest.rtc_timestamp) : "No RTC reading"}</strong><small>Reported with sensor packet</small></div></section>
      <div className="reading-grid">{cards.map(({ label, value, unit, icon: Icon }) => <div className="reading-card panel" key={label}><span className="reading-card__icon"><Icon size={17} /></span><span className="reading-card__label">{label}</span><strong>{value == null ? "—" : Number(value).toFixed(1)}<small>{value == null ? "" : unit}</small></strong><span className={`reading-card__state ${temp != null && (temp < 2 || temp > 8) ? "reading-card__state--warning" : ""}`}>{value == null ? "Awaiting reading" : temp != null && (temp < 2 || temp > 8) ? "Check configured range" : "Sensor reporting"}</span></div>)}</div>
      <TemperatureChart readings={readings} />
      <div className="two-column-grid"><section className="panel detail-panel"><div className="eyebrow">SENSOR HEALTH</div><h2>Connected components</h2><div className="sensor-health-list">{device.sensor_types.map((sensor) => <div key={sensor}><span className="sensor-health__icon"><Thermometer size={15} /></span><span><strong>{sensor}</strong><small>{sensor === "DS3231" ? "Real-time clock" : sensor === "DS18B20" ? "Digital probe temperature" : "Ambient temperature and humidity"}</small></span><StatusPill tone={demo ? "info" : lastAt ? "good" : "warning"}>{demo ? "Demo" : lastAt ? "Reporting" : "No readings"}</StatusPill></div>)}</div></section><section className="panel detail-panel"><div className="eyebrow">INGESTION</div><h2>Connect an ESP32 device</h2><p className="body-copy">Register a device to generate a one-time API key, then send signed sensor packets to the telemetry endpoint. The key hash stays in the database.</p><button className="button button--secondary" onClick={() => onNavigate("devices")}><Plus size={15} />Manage devices</button><div className="code-snippet">POST <code>/api/telemetry</code><br />Authentication: per-device API key</div></section></div>
    </> : <EmptyState title="No monitoring devices" description="Register your first ESP32 to begin receiving sensor readings." actionLabel="Manage devices" onAction={() => onNavigate("devices")} />}
  </div>
}
function DropletsIcon() { return <DropletsMark /> }
function DropletsMark() { return <Thermometer size={17} /> }

export function InventoryView({ data, demo, search, onAdd, onEdit, onView, onArchive }: { data: MonitoringData; demo: boolean; search: string; onAdd: () => void; onEdit: (batch: VaccineBatch) => void; onView: (batch: VaccineBatch) => void; onArchive: (batch: VaccineBatch) => void }) {
  const [filter, setFilter] = useState("all")
  const filtered = data.batches.filter((batch) => {
    if (batch.archived_at) return false
    const query = search.trim().toLowerCase()
    const matchesQuery = !query || `${batch.vaccine_name} ${batch.batch_number} ${batch.storage_location}`.toLowerCase().includes(query)
    const daysToExpiry = batch.expires_on ? (new Date(batch.expires_on).getTime() - Date.now()) / 86400000 : Infinity
    const device = data.devices.find((item) => item.id === batch.device_id)
    const needsAttention = daysToExpiry < 30 || device?.status === "offline" || device?.status === "warning"
    return matchesQuery && (filter === "all" || (filter === "attention" && needsAttention) || (filter === "in-transit" && Boolean(batch.shipment_id)))
  })
  const statusFor = (batch: VaccineBatch) => {
    const days = batch.expires_on ? (new Date(batch.expires_on).getTime() - Date.now()) / 86400000 : Infinity
    const device = data.devices.find((item) => item.id === batch.device_id)
    if (days < 0) return { text: "Expired", tone: "critical" as const }
    if (days < 30 || device?.status === "offline") return { text: "Needs review", tone: "warning" as const }
    if (device?.status === "warning") return { text: "Monitor", tone: "warning" as const }
    return { text: "In range", tone: "good" as const }
  }
  return <div className="page-stack">
    <div className="page-title-row"><div><div className="eyebrow">COLD STORAGE</div><h1>Vaccine inventory</h1><p>Keep batches, expiry dates, and monitored storage in one place.</p></div><button className="button button--primary" onClick={onAdd}><Plus size={16} />Add batch</button></div>
    {demo && <div className="data-note"><span className="data-note__icon"><Package size={16} /></span><span><strong>Demonstration records</strong> Sample vaccine batches are illustrative and should not be used for inventory decisions.</span></div>}
    <div className="summary-strip"><div><strong>{data.batches.filter((batch) => !batch.archived_at).length}</strong><span>Active batches</span></div><div><strong>{data.batches.filter((batch) => !batch.archived_at && batch.expires_on && (new Date(batch.expires_on).getTime() - Date.now()) / 86400000 < 30).length}</strong><span>Expiring within 30 days</span></div><div><strong>{data.batches.filter((batch) => !batch.archived_at && batch.shipment_id).length}</strong><span>In transit</span></div><div><strong>{data.batches.filter((batch) => !batch.archived_at && statusFor(batch).tone !== "good").length}</strong><span>Need attention</span></div></div>
    <section className="panel table-panel"><div className="table-toolbar"><div><div className="eyebrow">BATCH REGISTER</div><h2>All vaccine batches <span className="count-badge">{filtered.length}</span></h2></div><div className="table-toolbar__filters"><label className="filter-select"><Filter size={14} /><select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter batches"><option value="all">All batches</option><option value="attention">Needs attention</option><option value="in-transit">In transit</option></select><ChevronDown size={13} /></label></div></div>
      {filtered.length ? <div className="table-scroll"><table><thead><tr><th>VACCINE / BATCH</th><th>QUANTITY</th><th>STORAGE LOCATION</th><th>SAFE RANGE</th><th>EXPIRY</th><th>STATUS</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{filtered.map((batch) => { const status = statusFor(batch); const days = batch.expires_on ? Math.ceil((new Date(batch.expires_on).getTime() - Date.now()) / 86400000) : null; return <tr key={batch.id}><td><button className="table-primary" onClick={() => onView(batch)}>{batch.vaccine_name}</button><small className="table-secondary">{batch.batch_number}</small></td><td><strong>{batch.quantity.toLocaleString()}</strong><small className="table-secondary">doses</small></td><td>{batch.storage_location || "Not assigned"}<small className="table-secondary">{data.devices.find((device) => device.id === batch.device_id)?.device_code ?? "No linked sensor"}</small></td><td>{batch.min_temperature_c}° to {batch.max_temperature_c}°C</td><td>{batch.expires_on ? new Date(`${batch.expires_on}T12:00:00`).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "Not set"}{days !== null && days < 30 && days >= 0 && <small className="table-secondary text-warning">{days} days left</small>}</td><td><StatusPill tone={status.tone}>{status.text}</StatusPill></td><td><div className="row-actions"><button aria-label={`View ${batch.batch_number}`} onClick={() => onView(batch)}>View</button><button aria-label={`Edit ${batch.batch_number}`} onClick={() => onEdit(batch)}>Edit</button><button aria-label={`Archive ${batch.batch_number}`} onClick={() => onArchive(batch)}>Archive</button></div></td></tr>})}</tbody></table></div> : <EmptyState title="No batches match" description="Try a different search or add a vaccine batch." actionLabel="Add batch" onAction={onAdd} />}
      <div className="table-footnote"><span>{demo ? "Demo inventory · " : "Live inventory · "}Storage recommendations vary by vaccine product. Follow manufacturer guidance and local protocols.</span></div>
    </section>
  </div>
}

export function ShipmentsView({ data, demo, onAdd }: { data: MonitoringData; demo: boolean; onAdd: () => void }) {
  const [selected, setSelected] = useState<string | null>(data.shipments[0]?.id ?? null)
  const selectedShipment = data.shipments.find((item) => item.id === selected)
  const statusTone = (status: ShipmentStatus) => status === "delivered" ? "good" : status === "delayed" || status === "requires_attention" ? "warning" : status === "in_transit" ? "info" : "neutral"
  const latestLocation = selectedShipment && data.locations.find((item) => item.shipment_id === selectedShipment.id)
  const linkedBatches = selectedShipment ? data.batches.filter((item) => item.shipment_id === selectedShipment.id) : []
  return <div className="page-stack">
    <div className="page-title-row"><div><div className="eyebrow">DISTRIBUTION NETWORK</div><h1>Shipment tracking</h1><p>Monitor delivery status and cold-chain conditions along the route.</p></div><button className="button button--primary" onClick={onAdd}><Plus size={16} />Create shipment</button></div>
    {demo && <div className="data-note"><span className="data-note__icon"><MapPin size={16} /></span><span><strong>DEMO ROUTE</strong> Route lines and positions are illustrative. Live GPS and route optimization are not connected.</span></div>}
    <section className="panel map-panel"><div className="map-panel__head"><div><div className="eyebrow"><MapPin size={13} /> ROUTE VISIBILITY</div><h2>Monitored shipments <span className="count-badge">{data.shipments.length}</span></h2></div><div className="map-legend"><span><i className="legend-dot legend-dot--teal" />Active</span><span><i className="legend-dot legend-dot--amber" />Delayed</span><span><i className="map-legend__pin" />Last known location</span></div></div><div className="map-layout"><div className="map-side-list">{data.shipments.map((shipment) => { const tempReading = data.readings.find((item) => item.device_id === shipment.device_id); const temp = tempReading?.ds18b20_c ?? tempReading?.dht22_temperature_c; return <button key={shipment.id} className={`shipment-select${selected === shipment.id ? " is-selected" : ""}`} onClick={() => setSelected(shipment.id)}><span className={`shipment-select__icon shipment-select__icon--${shipment.status}`}><Truck size={16} /></span><span className="shipment-select__copy"><strong>{shipment.shipment_code}<StatusPill tone={statusTone(shipment.status)}>{shipment.status.replaceAll("_", " ")}</StatusPill></strong><small>{shipment.origin} <ArrowRight size={11} /> {shipment.destination}</small><small className="muted">{shipment.estimated_arrival ? `ETA ${shortTime(shipment.estimated_arrival)}` : "ETA unavailable"}</small></span><ChevronDown className="shipment-select__arrow" size={15} /></button>})}{!data.shipments.length && <div className="list-empty">No shipments have been registered yet.</div>}</div><div className="map-frame"><ShipmentMap shipments={data.shipments} locations={data.locations} demo={demo} selectedId={selected} onSelect={setSelected} /><div className="map-attribution">Map tiles © OpenStreetMap contributors</div></div></div>
    </section>
    {selectedShipment && <div className="two-column-grid shipment-detail-grid"><section className="panel detail-panel"><div className="panel-heading panel-heading--tight"><div><div className="eyebrow">SHIPMENT DETAILS</div><h2>{selectedShipment.shipment_code}</h2></div><StatusPill tone={statusTone(selectedShipment.status)}>{selectedShipment.status.replaceAll("_", " ")}</StatusPill></div><div className="route-stops"><div><span className="route-stop-dot route-stop-dot--origin" /><small>ORIGIN</small><strong>{selectedShipment.origin}</strong></div><div className="route-track"><i /></div><div><span className="route-stop-dot route-stop-dot--destination" /><small>DESTINATION</small><strong>{selectedShipment.destination}</strong></div></div><div className="detail-pairs"><div><span>Estimated arrival</span><strong>{selectedShipment.estimated_arrival ? new Date(selectedShipment.estimated_arrival).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Not provided"}</strong></div><div><span>Last GPS update</span><strong>{latestLocation ? fullTime(latestLocation.recorded_at) : demo ? "Illustrative position" : "No location update"}</strong></div><div><span>Temperature sensor</span><strong>{selectedShipment.device_id ? data.devices.find((item) => item.id === selectedShipment.device_id)?.device_code ?? "Device not found" : "No device assigned"}</strong></div><div><span>Linked vaccine batches</span><strong>{linkedBatches.length ? linkedBatches.map((item) => item.batch_number).join(", ") : "Not linked"}</strong></div></div></section><section className="panel detail-panel"><div className="eyebrow">ROUTE PLANNING</div><h2>Route comparison</h2><div className="route-demo-callout"><span className="route-demo-callout__icon"><MapPin size={16} /></span><div><strong>Illustrative route estimate</strong><small>Demonstration only · No live traffic or routing service connected</small></div></div><div className="route-option"><span className="route-option__rank">01</span><span><strong>Primary route</strong><small>Based on shortest demo distance</small></span><span><b>154 km</b><small>3h 10m · Low risk</small></span></div><div className="route-option"><span className="route-option__rank">02</span><span><strong>Alternate route</strong><small>Fewer urban stops</small></span><span><b>178 km</b><small>3h 42m · Moderate risk</small></span></div></section></div>}
  </div>
}

export function AlertsView({ data, demo, onAction, onOpen }: { data: MonitoringData; demo: boolean; onAction: (alert: Alert, status: AlertStatus) => void; onOpen: (alert: Alert) => void }) {
  const [severity, setSeverity] = useState("all")
  const [status, setStatus] = useState("all")
  const [deviceId, setDeviceId] = useState("all")
  const alerts = data.alerts.filter((alert) => (severity === "all" || alert.severity === severity) && (status === "all" || alert.status === status) && (deviceId === "all" || alert.device_id === deviceId))
  const openCount = data.alerts.filter((alert) => alert.status !== "resolved").length
  return <div className="page-stack">
    <div className="page-title-row"><div><div className="eyebrow">NETWORK SAFETY</div><h1>Alerts & notifications</h1><p>Review excursions, device issues, and delivery risks.</p></div><div className="title-side-stat"><span>{openCount}</span><small>open alerts</small></div></div>
    <div className="alert-summary-grid"><div className="alert-summary alert-summary--critical"><span className="alert-summary__icon"><CircleAlert size={18} /></span><strong>{data.alerts.filter((item) => item.severity === "critical" && item.status !== "resolved").length}</strong><small>Critical</small></div><div className="alert-summary alert-summary--warning"><span className="alert-summary__icon"><Bell size={18} /></span><strong>{data.alerts.filter((item) => item.severity === "warning" && item.status !== "resolved").length}</strong><small>Warning</small></div><div className="alert-summary alert-summary--resolved"><span className="alert-summary__icon"><Check size={18} /></span><strong>{data.alerts.filter((item) => item.status === "resolved").length}</strong><small>Resolved</small></div><div className="alert-summary alert-summary--total"><span className="alert-summary__icon"><Clock3 size={18} /></span><strong>{data.alerts.length}</strong><small>All alerts</small></div></div>
    {demo && <div className="data-note"><span className="data-note__icon"><Bell size={16} /></span><span><strong>Sample alerts</strong> Demo alerts describe simulated readings and are not actual cold-chain events.</span></div>}
    <section className="panel table-panel"><div className="table-toolbar"><div><div className="eyebrow">ALERT REGISTER</div><h2>All notifications <span className="count-badge">{alerts.length}</span></h2></div><div className="table-toolbar__filters"><label className="filter-select"><Filter size={14} /><select value={severity} onChange={(event) => setSeverity(event.target.value)} aria-label="Filter by severity"><option value="all">All severity</option><option value="critical">Critical</option><option value="warning">Warning</option><option value="info">Info</option></select><ChevronDown size={13} /></label><label className="filter-select"><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status"><option value="all">All status</option><option value="open">Open</option><option value="acknowledged">Acknowledged</option><option value="resolved">Resolved</option></select><ChevronDown size={13} /></label><label className="filter-select"><select value={deviceId} onChange={(event) => setDeviceId(event.target.value)} aria-label="Filter by device"><option value="all">All devices</option>{data.devices.map((device) => <option key={device.id} value={device.id}>{device.device_code}</option>)}</select><ChevronDown size={13} /></label></div></div>
      {alerts.length ? <div className="table-scroll"><table><thead><tr><th>SEVERITY</th><th>ALERT</th><th>DEVICE / SHIPMENT</th><th>MEASURED VALUE</th><th>TIME</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>{alerts.map((alert) => { const device = data.devices.find((item) => item.id === alert.device_id); const shipment = data.shipments.find((item) => item.id === alert.shipment_id); return <tr key={alert.id}><td><span className={`severity-label severity-label--${alert.severity}`}><i />{alert.severity}</span></td><td><button className="table-primary" onClick={() => onOpen(alert)}>{alert.title}</button><small className="table-secondary">{alert.category}</small></td><td>{device?.device_code ?? shipment?.shipment_code ?? "Network"}<small className="table-secondary">{device?.name ?? shipment?.destination ?? "No linked asset"}</small></td><td>{alert.measured_value ?? "—"}</td><td>{fullTime(alert.created_at)}</td><td><StatusPill tone={alert.status === "resolved" ? "good" : alert.status === "acknowledged" ? "info" : alert.severity === "critical" ? "critical" : "warning"}>{alert.status}</StatusPill></td><td>{alert.status === "open" ? <button className="row-action-button" onClick={() => onAction(alert, "acknowledged")}>Acknowledge</button> : alert.status === "acknowledged" ? <button className="row-action-button" onClick={() => onAction(alert, "resolved")}>Resolve</button> : <button className="row-action-button" onClick={() => onOpen(alert)}>History</button>}</td></tr>})}</tbody></table></div> : <EmptyState title="No alerts match these filters" description="Clear the filters or check again later." />}
      <div className="table-footnote"><span>{demo ? "Simulated alert history · " : "Live alert history · "}Notification delivery integrations can be configured separately.</span></div>
    </section>
  </div>
}

export function AnalyticsView({ data, demo, onDownload, onPrint }: { data: MonitoringData; demo: boolean; onDownload: () => void; onPrint: () => void }) {
  const [period, setPeriod] = useState("24h")
  const filtered = useMemo(() => { const cutoff = Date.now() - ({ "24h": 24, "7d": 168, "30d": 720 }[period] ?? 24) * 3600000; return data.readings.filter((item) => new Date(item.recorded_at).getTime() >= cutoff) }, [data.readings, period])
  const withTemp = filtered.map((item) => item.ds18b20_c ?? item.dht22_temperature_c).filter((value): value is number => value != null)
  const compliant = withTemp.filter((value) => value >= 2 && value <= 8).length
  const compliance = withTemp.length ? Math.round((compliant / withTemp.length) * 100) : null
  const excursionCount = data.alerts.filter((alert) => alert.category === "temperature").length
  const uptime = data.devices.length ? Math.round((data.devices.filter((item) => item.status === "online").length / data.devices.length) * 100) : null
  const average = withTemp.length ? withTemp.reduce((sum, value) => sum + value, 0) / withTemp.length : null
  return <div className="page-stack">
    <div className="page-title-row"><div><div className="eyebrow">NETWORK PERFORMANCE</div><h1>Analytics & reports</h1><p>Temperature compliance and operations signals from recorded telemetry.</p></div><div className="title-actions"><label className="select-control"><span className="sr-only">Analytics date range</span><select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="24h">Last 24 hours</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option></select><ChevronDown size={14} /></label><button className="button button--secondary" onClick={onPrint}><FileDown size={15} />Print</button><button className="button button--primary" onClick={onDownload}><Download size={15} />Export CSV</button></div></div>
    <div className="analytics-note"><CircleAlert size={15} /><span>{demo ? "Demo values are simulated and not validated operational or clinical outcomes." : "Metrics reflect stored readings in the selected period. Missing data is excluded from compliance calculations."}</span></div>
    <div className="metric-grid metric-grid--analytics"><MetricCard label="Temperature compliance" value={compliance === null ? "—" : `${compliance}%`} detail={`${withTemp.length.toLocaleString()} readings in period`} icon={ShieldCheck} tone="teal" /><MetricCard label="Temperature excursions" value={excursionCount} detail="Matching temperature alerts" icon={Thermometer} tone="red" /><MetricCard label="Average storage temp" value={average === null ? "—" : `${average.toFixed(1)}°C`} detail="Across available readings" icon={Thermometer} tone="blue" /><MetricCard label="Device uptime" value={uptime === null ? "—" : `${uptime}%`} detail="Currently online devices" icon={Wifi} tone="amber" /></div>
    <div className="two-column-grid analytics-grid"><TemperatureChart readings={filtered} /><section className="panel detail-panel"><div className="eyebrow">DELIVERY PERFORMANCE</div><h2>Shipment status</h2><div className="performance-list">{["delivered", "in_transit", "delayed", "requires_attention"].map((status) => { const count = data.shipments.filter((item) => item.status === status).length; const pct = data.shipments.length ? Math.round((count / data.shipments.length) * 100) : 0; return <div className="performance-row" key={status}><div><span>{status.replaceAll("_", " ")}</span><strong>{count}</strong></div><i><b style={{ width: `${pct}%` }} /></i></div>})}</div><div className="report-card"><span><FileDown size={17} /></span><div><strong>Download a data extract</strong><small>Includes sensor timestamps, temperature, humidity, and device codes.</small></div><button className="icon-button" aria-label="Download CSV report" onClick={onDownload}><Download size={15} /></button></div></section></div>
    <div className="analytics-disclaimer"><ShieldCheck size={16} /><span>VaxiSure reports describe recorded operational data only. They do not certify vaccine potency or replace manufacturer handling guidance.</span></div>
  </div>
}
function ActivityMarkIcon() { return <Thermometer size={18} /> }

export function AnomalyView({ data, demo, onOpenAlert }: { data: MonitoringData; demo: boolean; onOpenAlert: (alert: Alert) => void }) {
  const sorted = useMemo(() => [...data.readings].sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()), [data.readings])
  const anomalies = sorted.map((reading, index) => {
    const temp = reading.ds18b20_c ?? reading.dht22_temperature_c
    const previous = sorted[index + 1]
    const previousTemp = previous?.ds18b20_c ?? previous?.dht22_temperature_c
    const outside = temp != null && (temp < 2 || temp > 8)
    const jump = temp != null && previousTemp != null && Math.abs(temp - previousTemp) > 1.2
    return { reading, temp, outside, jump, severity: outside && (temp! < 0 || temp! > 10) ? "critical" : outside || jump ? "warning" : "normal" }
  }).filter((item) => item.outside || item.jump).slice(0, 12)
  const anomalyIds = new Set(anomalies.map((item) => item.reading.id))
  return <div className="page-stack">
    <div className="page-title-row"><div><div className="eyebrow">EARLY WARNING</div><h1>Anomaly detection</h1><p>Review unusual sensor patterns and decide what needs inspection.</p></div><StatusPill tone="info">Rule-based review</StatusPill></div>
    <div className="anomaly-mode-banner"><span className="anomaly-mode-banner__icon"><ActivityMarkIcon /></span><div><strong>{demo ? "DEMO RULES · NO TRAINED MODEL CONNECTED" : "RULE-BASED SCREENING · NO TRAINED MODEL CONNECTED"}</strong><p>Readings are flagged for values outside the 2–8 °C reference band or abrupt changes above 1.2 °C between adjacent samples. This is a review aid, not a validated AI prediction.</p></div></div>
    <div className="anomaly-grid"><section className="panel anomaly-chart-panel"><div className="panel-heading panel-heading--tight"><div><div className="eyebrow">SENSOR PATTERN</div><h2>Temperature timeline</h2></div><StatusPill tone="warning">{anomalies.length} flagged readings</StatusPill></div><TemperatureChart readings={data.readings} compact anomalyIds={anomalyIds} /><div className="anomaly-legend"><span><i className="severity-dot severity-dot--critical" />Outside safe temperature band</span><span><i className="severity-dot severity-dot--warning" />Abrupt reading change</span></div></section><section className="panel anomaly-summary-panel"><div className="eyebrow">REVIEW QUEUE</div><h2>Recommended next steps</h2><div className="anomaly-step"><span>01</span><div><strong>Check device placement</strong><small>Confirm the probe is not touching a cooling element or warm container.</small></div></div><div className="anomaly-step"><span>02</span><div><strong>Verify calibration and timestamp</strong><small>Compare the DS18B20 probe and RTC DS3231 time against a reference.</small></div></div><div className="anomaly-step"><span>03</span><div><strong>Follow excursion protocol</strong><small>Escalate any confirmed excursion using your organization&apos;s approved procedure.</small></div></div><p className="anomaly-disclaimer">Do not use a demo or rule-based flag alone to make clinical decisions.</p></section></div>
    <section className="panel table-panel"><div className="table-toolbar"><div><div className="eyebrow">UNUSUAL PATTERNS</div><h2>Flagged readings <span className="count-badge">{anomalies.length}</span></h2></div><span className="small-muted">Rule-based screening</span></div>{anomalies.length ? <div className="table-scroll"><table><thead><tr><th>SEVERITY</th><th>DEVICE</th><th>READING</th><th>FLAG REASON</th><th>TIME</th><th>RELATED ALERT</th></tr></thead><tbody>{anomalies.map(({ reading, temp, outside, jump, severity }) => { const device = data.devices.find((item) => item.id === reading.device_id); const related = data.alerts.find((alert) => alert.device_id === reading.device_id && alert.category === "temperature"); return <tr key={reading.id}><td><StatusPill tone={severity === "critical" ? "critical" : "warning"}>{severity}</StatusPill></td><td>{device?.device_code ?? "Unknown device"}<small className="table-secondary">{device?.name ?? ""}</small></td><td>{temp == null ? "—" : `${temp.toFixed(1)}°C`}<small className="table-secondary">Humidity {reading.humidity_percent == null ? "—" : `${reading.humidity_percent}%`}</small></td><td>{outside ? "Outside 2–8 °C reference" : "Abrupt change from prior sample"}{jump && outside ? " · rapid change" : ""}</td><td>{fullTime(reading.recorded_at)}</td><td>{related ? <button className="text-button" onClick={() => onOpenAlert(related)}>View alert <ArrowRight size={13} /></button> : "—"}</td></tr>})}</tbody></table></div> : <EmptyState title="No unusual readings" description="No values crossed the current rule-based screening thresholds." />}</section>
  </div>
}

export function DevicesView({ data, demo, onAdd }: { data: MonitoringData; demo: boolean; onAdd: () => void }) {
  const [query, setQuery] = useState("")
  const devices = data.devices.filter((device) => `${device.device_code} ${device.name} ${device.location}`.toLowerCase().includes(query.toLowerCase()))
  return <div className="page-stack">
    <div className="page-title-row"><div><div className="eyebrow">IOT HARDWARE</div><h1>Device management</h1><p>Register ESP32 hardware and review sensor connectivity.</p></div><button className="button button--primary" onClick={onAdd}><Plus size={16} />Register device</button></div>
    {demo && <div className="data-note"><span className="data-note__icon"><Radio size={16} /></span><span><strong>Demo devices</strong> These device IDs and firmware statuses are illustrative sample data.</span></div>}
    <div className="summary-strip"><div><strong>{data.devices.length}</strong><span>Registered devices</span></div><div><strong>{data.devices.filter((item) => item.status === "online").length}</strong><span>Online</span></div><div><strong>{data.devices.filter((item) => item.status === "warning").length}</strong><span>Needs review</span></div><div><strong>{data.devices.filter((item) => item.status === "offline").length}</strong><span>Offline</span></div></div>
    <section className="panel table-panel"><div className="table-toolbar"><div><div className="eyebrow">HARDWARE REGISTER</div><h2>ESP32 devices <span className="count-badge">{devices.length}</span></h2></div><label className="table-search"><Filter size={14} /><input placeholder="Filter devices" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>{devices.length ? <div className="table-scroll"><table><thead><tr><th>DEVICE / ID</th><th>ASSIGNED LOCATION</th><th>SENSORS</th><th>FIRMWARE</th><th>LAST SEEN</th><th>STATUS</th><th>DETAILS</th></tr></thead><tbody>{devices.map((device) => <tr key={device.id}><td><strong>{device.name}</strong><small className="table-secondary">{device.device_code}</small></td><td>{device.location || "Not assigned"}</td><td><div className="sensor-tag-list">{device.sensor_types.map((sensor) => <span key={sensor}>{sensor}</span>)}</div></td><td>{device.firmware_version || "Not reported"}</td><td>{fullTime(device.last_seen_at)}</td><td><StatusPill tone={device.status === "online" ? "good" : device.status === "warning" ? "warning" : "critical"}>{device.status}</StatusPill></td><td><button className="row-action-button" onClick={() => navigator.clipboard?.writeText(device.device_code)}>Copy ID</button></td></tr>)}</tbody></table></div> : <EmptyState title="No devices found" description="Register an ESP32 to start receiving signed telemetry." actionLabel="Register device" onAction={onAdd} />}
      <div className="device-api-footer"><div><span className="device-api-footer__icon"><ShieldCheck size={18} /></span><span><strong>Device API keys are only shown once</strong><small>Credentials are hashed before storage and never included in device list responses.</small></span></div><code>/api/telemetry</code></div>
    </section>
  </div>
}

export function SettingsView({ data, demo, onSaveThresholds }: { data: MonitoringData; demo: boolean; onSaveThresholds: (min: number, max: number, stale: number) => Promise<void> }) {
  const [minimum, setMinimum] = useState("2")
  const [maximum, setMaximum] = useState("8")
  const [stale, setStale] = useState("15")
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  async function save() {
    setSaving(true); setSaved(false); setError("")
    try { await onSaveThresholds(Number(minimum), Number(maximum), Number(stale)); setSaved(true) }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save settings.") }
    finally { setSaving(false) }
  }
  return <div className="page-stack">
    <div className="page-title-row"><div><div className="eyebrow">WORKSPACE PREFERENCES</div><h1>Settings</h1><p>Configure alert thresholds, organization details, and device ingestion.</p></div><StatusPill tone={demo ? "info" : "good"}>{demo ? "Demo workspace" : data.role.replaceAll("_", " ")}</StatusPill></div>
    <div className="settings-layout"><aside className="settings-nav"><a className="is-active" href="#thresholds">Thresholds</a><a href="#devices">Device API</a><a href="#workspace">Workspace</a><a href="#privacy">Data & privacy</a></aside><div className="settings-content">
      <section className="panel settings-section" id="thresholds"><div className="eyebrow">TEMPERATURE RULES</div><h2>Default cold storage range</h2><p>Used for incoming telemetry checks and dashboard screening. Confirm product-specific storage instructions.</p><div className="settings-form-row"><label>Minimum temperature <span className="field-with-unit"><input type="number" step="0.1" value={minimum} onChange={(event) => setMinimum(event.target.value)} /><i>°C</i></span></label><label>Maximum temperature <span className="field-with-unit"><input type="number" step="0.1" value={maximum} onChange={(event) => setMaximum(event.target.value)} /><i>°C</i></span></label><label>Device stale after <span className="field-with-unit"><input type="number" min="1" max="1440" value={stale} onChange={(event) => setStale(event.target.value)} /><i>min</i></span></label></div><div className="settings-actions"><button className="button button--primary" disabled={saving || demo} onClick={save}>{saving ? "Saving…" : "Save threshold rules"}</button>{demo && <small>Sign in to save workspace settings.</small>}{saved && <span className="save-success"><Check size={14} />Settings saved</span>}{error && <span className="text-critical">{error}</span>}</div></section>
      <section className="panel settings-section" id="devices"><div className="eyebrow">ESP32 INGESTION</div><h2>Telemetry API</h2><p>Send device data directly to the secure server endpoint. Keep per-device API keys private and out of client-side code.</p><div className="api-endpoint"><span>POST</span><code>/api/telemetry</code><button className="text-button" onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/api/telemetry`)}>Copy URL</button></div><pre className="payload-example">{`{
  "device_id": "registered-device-uuid",
  "api_key": "one-time-device-secret",
  "recorded_at": "2026-10-27T10:30:00Z",
  "ds18b20_c": 4.6,
  "dht22_temperature_c": 4.8,
  "humidity_percent": 56.2,
  "rtc_timestamp": "2026-10-27T10:30:00Z"
}`}</pre><p className="api-footnote"><ShieldCheck size={14} />Device secret is SHA-256 hashed at registration. The service-role credential is server-only.</p></section>
      <section className="panel settings-section" id="workspace"><div className="eyebrow">ORGANIZATION</div><h2>{data.organizationName}</h2><p>Role-based access is enforced by Supabase row-level security. New accounts create an isolated organization.</p><div className="workspace-facts"><span>Current role</span><strong>{data.role.replaceAll("_", " ")}</strong><span>Registered monitoring devices</span><strong>{data.devices.length}</strong></div></section>
      <section className="panel settings-section" id="privacy"><div className="eyebrow">DATA & PRIVACY</div><h2>Operational safeguards</h2><ul className="privacy-list"><li><Check size={15} />Organization-scoped row-level security</li><li><Check size={15} />No service-role key exposed to the browser</li><li><Check size={15} />Demo values are clearly labeled as simulated</li><li><Check size={15} />Telemetry is timestamped and auditable</li></ul></section>
    </div></div>
  </div>
}

export function EmptyState({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel?: string; onAction?: () => void }) {
  return <div className="empty-state"><span className="empty-state__icon"><Package size={20} /></span><strong>{title}</strong><p>{description}</p>{actionLabel && onAction && <button className="button button--secondary" onClick={onAction}><Plus size={15} />{actionLabel}</button>}</div>
}
