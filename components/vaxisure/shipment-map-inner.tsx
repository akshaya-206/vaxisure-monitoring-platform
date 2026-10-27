"use client"

import { useEffect, useMemo } from "react"
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import type { Shipment, ShipmentLocation } from "@/lib/vaxisure/types"

const demoPlaces: Record<string, [number, number]> = {
  "Mumbai Central Depot": [19.076, 72.8777],
  "Pune District Clinic": [18.5204, 73.8567],
  "Nashik Regional Store": [19.9975, 73.7898],
  "Aurangabad Health Center": [19.8762, 75.3433],
  "Thane Distribution Hub": [19.2183, 72.9781],
}

const pin = (kind: "destination" | "vehicle") => L.divIcon({
  className: "map-pin-wrap",
  html: `<span class="map-pin map-pin--${kind}">${kind === "vehicle" ? "" : ""}</span>`,
  iconSize: [kind === "vehicle" ? 18 : 14, kind === "vehicle" ? 18 : 14],
  iconAnchor: [kind === "vehicle" ? 9 : 7, kind === "vehicle" ? 9 : 7],
})

function MapBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [28, 28], maxZoom: 8 })
    else if (points.length === 1) map.setView(points[0], 7)
  }, [map, points])
  return null
}

export function ShipmentMapInner({ shipments, locations, demo, selectedId, onSelect }: {
  shipments: Shipment[]
  locations: ShipmentLocation[]
  demo: boolean
  selectedId: string | null
  onSelect?: (shipmentId: string) => void
}) {
  const points = useMemo(() => {
    const selected = selectedId ? shipments.filter((item) => item.id === selectedId) : shipments
    const list: { shipment: Shipment; current: [number, number] | null; start: [number, number] | null; destination: [number, number] | null }[] = []
    for (const shipment of selected) {
      const location = locations.find((item) => item.shipment_id === shipment.id)
      const current = location ? [location.latitude, location.longitude] as [number, number] : null
      const start = demo ? demoPlaces[shipment.origin] ?? null : null
      const destination = demo ? demoPlaces[shipment.destination] ?? null : null
      if (current || start || destination) list.push({ shipment, current, start, destination })
    }
    return list
  }, [shipments, locations, demo, selectedId])
  const allPoints = points.flatMap((item) => [item.current, item.start, item.destination].filter((point): point is [number, number] => point !== null))

  if (!points.length) return (
    <div className="map-empty">
      <span className="map-empty__icon">⌁</span>
      <strong>No location data yet</strong>
      <p>Shipment GPS locations will appear here when devices report coordinates.</p>
      {demo && <small>Demo route positions are illustrative, not live GPS.</small>}
    </div>
  )

  return (
    <MapContainer center={allPoints[0] ?? [19.2, 73.4]} zoom={7} scrollWheelZoom={false} className="leaflet-map" aria-label="Shipment location map">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapBounds points={allPoints} />
      {points.map(({ shipment, current, start, destination }) => {
        const route = [start, current, destination].filter((point): point is [number, number] => point !== null)
        return (
          <div key={shipment.id}>
            {route.length > 1 && <Polyline positions={route} pathOptions={{ color: shipment.status === "delayed" ? "#e2a33c" : "#168a82", weight: 3, opacity: 0.72, dashArray: demo ? "6 7" : undefined }} />}
            {start && <Marker position={start} icon={pin("destination")}><Tooltip>{shipment.origin} · origin</Tooltip></Marker>}
            {current && <Marker position={current} icon={pin("vehicle")} eventHandlers={{ click: () => onSelect?.(shipment.id) }}><Tooltip>{shipment.shipment_code} · last reported location</Tooltip></Marker>}
            {destination && <Marker position={destination} icon={pin("destination")}><Tooltip>{shipment.destination} · destination</Tooltip></Marker>}
          </div>
        )
      })}
    </MapContainer>
  )
}
