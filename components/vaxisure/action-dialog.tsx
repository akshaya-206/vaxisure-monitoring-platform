"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import { AlertTriangle, Check, KeyRound, LoaderCircle, X } from "lucide-react"
import type { Device, Shipment, VaccineBatch } from "@/lib/vaxisure/types"

type DialogKind = "batch" | "shipment" | "device"
type FormValues = Record<string, string>

export function ActionDialog({ kind,   item,
  readOnly = false,
  devices,
  shipments,
  onClose, onSubmit }: {
  kind: DialogKind
  item?: VaccineBatch | Shipment
  readOnly?: boolean
  devices: Device[]
  shipments: Shipment[]
  onClose: () => void
  onSubmit: (values: FormValues) => Promise<string | void>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState("")
  const batch = kind === "batch" ? item as VaccineBatch | undefined : undefined
  const shipment = kind === "shipment" ? item as Shipment | undefined : undefined
  const title = kind === "batch" ? readOnly ? "Vaccine batch details" : batch ? "Edit vaccine batch" : "Add vaccine batch" : kind === "shipment" ? "Create shipment" : "Register monitoring device"

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setBusy(true)
    const form = new FormData(event.currentTarget)
    const values = Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]))
    try {
      const message = await onSubmit(values)
      setResult(message || "Saved successfully.")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save this record. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="action-dialog-title"><div className="modal-header"><div><span className="eyebrow">{kind === "batch" ? "VACCINE INVENTORY" : kind === "shipment" ? "COLD-CHAIN LOGISTICS" : "IOT HARDWARE"}</span><h2 id="action-dialog-title">{title}</h2></div><button className="icon-button" aria-label="Close dialog" onClick={onClose} disabled={busy}><X size={17} /></button></div>
    {result ? <div className="action-success"><span className="action-success__icon">{kind === "device" && result.includes("API key:") ? <KeyRound size={20} /> : <Check size={20} />}</span><strong>{kind === "device" && result.includes("API key:") ? "Device is registered" : "Changes saved"}</strong><p>{result.startsWith("One-time device API key:") ? "Copy this secret now. It is shown only once and is not stored in the device list." : result}</p>{result.startsWith("One-time device API key:") && <code className="one-time-secret">{result.replace("One-time device API key: ", "")}</code>}<button className="button button--primary" onClick={onClose}>Done</button></div> : <form className="action-form" onSubmit={submit}>
      {error && <div className="form-error" role="alert"><AlertTriangle size={15} />{error}</div>}
      <fieldset className="action-form-fields" disabled={readOnly}>
      {kind === "batch" && <>
        <div className="form-grid"><label>Vaccine name<input name="vaccine_name" required maxLength={120} defaultValue={batch?.vaccine_name} placeholder="e.g. Influenza · Quadrivalent" /></label><label>Batch number<input name="batch_number" required maxLength={60} defaultValue={batch?.batch_number} placeholder="e.g. FLU-2026-1208" /></label><label>Quantity (doses)<input name="quantity" type="number" required min="0" step="1" defaultValue={batch?.quantity ?? 0} /></label><label>Expiry date<input name="expires_on" type="date" defaultValue={batch?.expires_on ?? ""} /></label><label>Minimum storage temperature<input name="min_temperature_c" type="number" required step="0.1" defaultValue={batch?.min_temperature_c ?? 2} /></label><label>Maximum storage temperature<input name="max_temperature_c" type="number" required step="0.1" defaultValue={batch?.max_temperature_c ?? 8} /></label><label className="form-grid__wide">Storage location<input name="storage_location" maxLength={120} defaultValue={batch?.storage_location} placeholder="Pharmacy · Unit 02" /></label><label>Monitoring device<select name="device_id" defaultValue={batch?.device_id ?? ""}><option value="">No linked device</option>{devices.map((device) => <option key={device.id} value={device.id}>{device.device_code} · {device.name}</option>)}</select></label><label>Shipment<select name="shipment_id" defaultValue={batch?.shipment_id ?? ""}><option value="">In storage</option>{shipments.map((entry) => <option key={entry.id} value={entry.id}>{entry.shipment_code}</option>)}</select></label></div>
      </>}
      {kind === "shipment" && <div className="form-grid"><label>Shipment code<input name="shipment_code" required maxLength={48} placeholder="e.g. VS-2050" /></label><label>Status<select name="status" defaultValue="prepared"><option value="prepared">Prepared</option><option value="in_transit">In transit</option><option value="delayed">Delayed</option><option value="delivered">Delivered</option><option value="requires_attention">Requires attention</option></select></label><label>Origin<input name="origin" required maxLength={120} placeholder="Distribution depot" /></label><label>Destination<input name="destination" required maxLength={120} placeholder="Receiving clinic" /></label><label>Estimated arrival<input name="estimated_arrival" type="datetime-local" /></label><label>Monitoring device<select name="device_id" defaultValue=""><option value="">No linked device</option>{devices.map((device) => <option key={device.id} value={device.id}>{device.device_code} · {device.name}</option>)}</select></label></div>}
      {kind === "device" && <><div className="form-grid"><label>Device ID<input name="device_code" required maxLength={48} placeholder="ESP32-VC-005" /></label><label>Device name<input name="name" required maxLength={100} placeholder="Central pharmacy refrigerator" /></label><label className="form-grid__wide">Assigned location<input name="location" maxLength={120} placeholder="Building · room · unit" /></label><label>Firmware version<input name="firmware_version" maxLength={40} placeholder="1.0.0" /></label><label>Sensor types<input name="sensor_types" required defaultValue="DS18B20, DHT22, DS3231" /></label></div><p className="form-hint"><KeyRound size={14} />A device API key is generated once, then only its hash is stored. Copy it from the confirmation screen.</p></>}
      </fieldset>
      <div className="modal-actions"><button type="button" className="button button--secondary" onClick={onClose} disabled={busy}>{readOnly ? "Close" : "Cancel"}</button>{!readOnly && <button type="submit" className="button button--primary" disabled={busy}>{busy ? <><LoaderCircle size={15} className="spin" />Saving…</> : kind === "device" ? "Register device" : kind === "shipment" ? "Create shipment" : batch ? "Save changes" : "Add batch"}</button>}</div>
    </form>}</section></div>
}
