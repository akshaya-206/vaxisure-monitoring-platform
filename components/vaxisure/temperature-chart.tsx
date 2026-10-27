"use client"

import { useMemo, useState } from "react"
import { Area, AreaChart, CartesianGrid, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Activity, Droplets, Thermometer } from "lucide-react"
import type { SensorReading } from "@/lib/vaxisure/types"

type Props = { readings: SensorReading[]; compact?: boolean; anomalyIds?: Set<string> }
type Metric = "temperature" | "humidity"
type Range = "1h" | "6h" | "24h" | "7d"

const ranges: { value: Range; label: string; hours: number }[] = [
  { value: "1h", label: "1h", hours: 1 },
  { value: "6h", label: "6h", hours: 6 },
  { value: "24h", label: "24h", hours: 24 },
  { value: "7d", label: "7d", hours: 168 },
]

export function TemperatureChart({ readings, compact = false, anomalyIds }: Props) {
  const [metric, setMetric] = useState<Metric>("temperature")
  const [range, setRange] = useState<Range>(compact ? "24h" : "6h")
  const rangeHours = ranges.find((item) => item.value === range)?.hours ?? 6
  const data = useMemo(() => {
    const cutoff = Date.now() - rangeHours * 60 * 60 * 1000
    return [...readings]
      .filter((reading) => new Date(reading.recorded_at).getTime() >= cutoff)
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
      .map((reading) => ({
        id: reading.id,
        time: new Date(reading.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: rangeHours <= 6 ? "2-digit" : undefined }),
        value: metric === "temperature" ? reading.ds18b20_c ?? reading.dht22_temperature_c : reading.humidity_percent,
        flagged: anomalyIds?.has(reading.id) ?? false,
      }))
      .filter((reading) => reading.value !== null)
  }, [readings, rangeHours, metric, anomalyIds])

  const empty = data.length === 0
  return (
    <section className={`chart-card${compact ? " chart-card--compact" : ""}`} aria-label="Sensor history chart">
      <div className="chart-card__header">
        <div>
          <div className="eyebrow"><Activity size={14} /> ENVIRONMENTAL HISTORY</div>
          <h2>{metric === "temperature" ? "Temperature trend" : "Humidity trend"}</h2>
          <p>{metric === "temperature" ? "DS18B20 storage temperature" : "DHT22 relative humidity"}</p>
        </div>
        <div className="chart-controls">
          <div className="metric-toggle" aria-label="Chart measurement">
            <button className={metric === "temperature" ? "is-active" : ""} onClick={() => setMetric("temperature")} aria-pressed={metric === "temperature"}>
              <Thermometer size={14} /><span>Temp</span>
            </button>
            <button className={metric === "humidity" ? "is-active" : ""} onClick={() => setMetric("humidity")} aria-pressed={metric === "humidity"}>
              <Droplets size={14} /><span>Humidity</span>
            </button>
          </div>
          <div className="range-toggle" aria-label="Chart time range">
            {ranges.map((item) => <button key={item.value} onClick={() => setRange(item.value)} aria-pressed={range === item.value} className={range === item.value ? "is-active" : ""}>{item.label}</button>)}
          </div>
        </div>
      </div>
      {empty ? (
        <div className="chart-empty"><Activity size={22} /><span>No readings in this time range</span><small>Connect a device or choose a longer range.</small></div>
      ) : (
        <div className={`chart-plot${compact ? " chart-plot--compact" : ""}`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="temperatureFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#168a82" stopOpacity={0.17} />
                  <stop offset="95%" stopColor="#168a82" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e9eef4" strokeDasharray="3 5" vertical={false} />
              {metric === "temperature" && <ReferenceArea y1={2} y2={8} fill="#13a68d" fillOpacity={0.055} />}
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: "#8794a6", fontSize: 11 }} minTickGap={compact ? 35 : 24} />
              <YAxis domain={metric === "temperature" ? [0, 12] : [20, 90]} axisLine={false} tickLine={false} tick={{ fill: "#8794a6", fontSize: 11 }} tickFormatter={(value) => `${value}${metric === "temperature" ? "°" : "%"}`} />
              <Tooltip
                contentStyle={{ border: "1px solid #e6ebf0", borderRadius: 12, boxShadow: "0 10px 28px rgba(22, 39, 62, .1)", fontSize: 12 }}
                formatter={(value) => [`${Number(value).toFixed(1)} ${metric === "temperature" ? "°C" : "% RH"}`, metric === "temperature" ? "DS18B20" : "DHT22"]}
                labelStyle={{ color: "#738096", marginBottom: 4 }}
              />
              <Area type="monotone" dataKey="value" stroke="#168a82" strokeWidth={2.4} fill="url(#temperatureFill)" activeDot={{ r: 4, fill: "#168a82", stroke: "white", strokeWidth: 2 }} dot={(props) => {
                const { cx, cy, payload } = props
                return payload?.flagged ? <circle key={payload.id} cx={cx} cy={cy} r={4} fill="#e55d4d" stroke="white" strokeWidth={2} /> : <g key={payload?.id} />
              }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      {!compact && <div className="chart-legend"><span><i className="legend-dot legend-dot--teal" />Sensor readings</span><span><i className="legend-band" />Recommended range · 2–8 °C</span><span className="chart-legend__note">Band shown for temperature only</span></div>}
    </section>
  )
}
