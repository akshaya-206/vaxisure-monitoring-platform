"use client"

import dynamic from "next/dynamic"
import type { Shipment, ShipmentLocation } from "@/lib/vaxisure/types"

const MapCanvas = dynamic(() => import("./shipment-map-inner").then((module) => module.ShipmentMapInner), {
  ssr: false,
  loading: () => <div className="map-loading"><span className="map-loading__pulse" />Loading shipment map…</div>,
})

export function ShipmentMap({ shipments, locations, demo, selectedId, onSelect }: {
  shipments: Shipment[]
  locations: ShipmentLocation[]
  demo: boolean
  selectedId: string | null
  onSelect?: (shipmentId: string) => void
}) {
  return <MapCanvas shipments={shipments} locations={locations} demo={demo} selectedId={selectedId} onSelect={onSelect} />
}
