"use client"

import { useEffect, useMemo, useState } from "react"
import type { FormEvent } from "react"
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Eye,
  EyeOff,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  Package,
  PanelLeftClose,
  Plus,
  Radio,
  Search,
  Settings,
  ShieldCheck,
  Thermometer,
  Truck,
  Wifi,
  X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { AuthChangeEvent, AuthError, Session, User } from "@supabase/supabase-js"
import { useMonitoringData } from "@/lib/vaxisure/use-monitoring-data"
import { demoMonitoringData } from "@/lib/vaxisure/demo-data"
import type { Alert, AlertStatus, Device, MonitoringData, Shipment, VaccineBatch } from "@/lib/vaxisure/types"
import { ActionDialog } from "./action-dialog"
import {
  AlertsView,
  AnalyticsView,
  AnomalyView,
  DashboardView,
  DevicesView,
  EmptyState,
  InventoryView,
  MonitoringView,
  SettingsView,
  ShipmentsView,
} from "./page-views"

type PageId = "overview" | "monitoring" | "inventory" | "shipments" | "alerts" | "analytics" | "anomalies" | "devices" | "settings"
type DialogState = { kind: "batch" | "shipment" | "device"; item?: VaccineBatch | Shipment; readOnly?: boolean }
type FieldValues = Record<string, string>
type NavEntry = { id: PageId; label: string; icon: LucideIcon }

const navGroups: { label: string; items: NavEntry[] }[] = [
  { label: "WORKSPACE", items: [{ id: "overview", label: "Overview", icon: LayoutDashboard }, { id: "monitoring", label: "Live monitoring", icon: Activity }] },
  { label: "COLD CHAIN", items: [{ id: "inventory", label: "Vaccine inventory", icon: Package }, { id: "shipments", label: "Shipment tracking", icon: Truck }, { id: "alerts", label: "Alerts & notifications", icon: Bell }] },
  { label: "INTELLIGENCE", items: [{ id: "analytics", label: "Analytics & reports", icon: Activity }, { id: "anomalies", label: "Anomaly detection", icon: AlertTriangle }, { id: "devices", label: "Device management", icon: Radio }] },
]
const pageTitles: Record<PageId, string> = {
  overview: "Overview",
  monitoring: "Live monitoring",
  inventory: "Vaccine inventory",
  shipments: "Shipment tracking",
  alerts: "Alerts & notifications",
  analytics: "Analytics & reports",
  anomalies: "Anomaly detection",
  devices: "Device management",
  settings: "Settings",
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return <span className={`brand-mark${compact ? " brand-mark--compact" : ""}`} aria-hidden="true"><ShieldCheck className="brand-mark__shield" size={compact ? 28 : 34} strokeWidth={1.8} /><FlaskConical className="brand-mark__vial" size={compact ? 13 : 15} strokeWidth={2} /><svg className="brand-mark__signal" width={compact ? 8 : 9} height={compact ? 8 : 9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 8.5a11 11 0 0 1 14 0" /><path d="M8.5 12a5.5 5.5 0 0 1 7 0" /><path d="M12 16h.01" /></svg></span>
}

function LiveClock() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const interval = window.setInterval(() => setNow(new Date()), 30000)
    return () => window.clearInterval(interval)
  }, [])
  return <span className="topbar-date"><Clock3 size={15} />{now ? now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) : "Today"}</span>
}

function AuthScreen({ onDemo }: { onDemo: () => void }) {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setNotice("")
    setLoading(true)
    try {
      const supabase = createClient()
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`,
            data: { full_name: fullName.trim() },
          },
        })
        if (signUpError) {
          const lowerMessage = signUpError.message.toLowerCase()
          if (lowerMessage.includes("password") || lowerMessage.includes("weak")) setError("Choose a stronger password with at least 8 characters.")
          else if (lowerMessage.includes("rate limit") || lowerMessage.includes("too many")) setError("Too many attempts. Wait a moment and try again.")
          else setError("Unable to create an account with those details. Check the email format and try again.")
        } else if (data.session) {
          setNotice("Account created. Setting up your organization workspace…")
        } else {
          setNotice("Account created. Confirm your email using the link we sent, then sign in to finish workspace setup.")
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (signInError) {
          const lowerMessage = signInError.message.toLowerCase()
          if (lowerMessage.includes("email not confirmed")) setError("Confirm your email using the link we sent, then sign in again.")
          else if (lowerMessage.includes("rate limit") || lowerMessage.includes("too many")) setError("Too many attempts. Wait a moment and try again.")
          else setError("We couldn’t sign you in. Check your email and password, then try again.")
        }
      }
    } catch {
      setError("Authentication is temporarily unavailable. Use demo access or try again shortly.")
    } finally {
      setLoading(false)
    }
  }

  return <main className="auth-screen">
    <section className="auth-story">
      <div className="auth-story__top"><BrandMark /><span className="brand-wordmark">VaxiSure</span><span className="brand-divider" /><span className="brand-tagline">Protecting Every Dose, Every Mile.</span></div>
      <div className="auth-story__content">
        <span className="auth-kicker"><span /> COLD-CHAIN VISIBILITY</span>
        <h1>Confidence in every<br /><span>cold-chain handoff.</span></h1>
        <p>One clear view of vaccine storage, transit conditions, and the signals that need your attention.</p>
        <div className="auth-proof-grid"><div><span><Thermometer size={16} /></span><strong>Environmental</strong><small>Temperature & humidity</small></div><div><span><MapPinned size={16} /></span><strong>In transit</strong><small>Shipment visibility</small></div><div><span><ShieldCheck size={16} /></span><strong>Accountable</strong><small>Role-aware operations</small></div></div>
      </div>
      <div className="auth-story__footer"><span><ShieldCheck size={15} /> Built for operational review</span><span>VaxiSure · Cold-chain monitoring</span></div>
      <span className="auth-orbit auth-orbit--one" /><span className="auth-orbit auth-orbit--two" />
    </section>
    <section className="auth-panel">
      <div className="auth-form-wrap">
        <div className="auth-mobile-brand"><BrandMark compact /><strong>VaxiSure</strong></div>
        <span className="eyebrow">SECURE WORKSPACE ACCESS</span>
        <h2>{isSignUp ? "Create your workspace" : "Welcome back"}</h2>
        <p className="auth-subtitle">{isSignUp ? "Create an account to start a private cold-chain workspace." : "Sign in to your VaxiSure monitoring workspace."}</p>
        {error && <div className="auth-message auth-message--error" role="alert"><AlertTriangle size={16} />{error}</div>}
        {notice && <div className="auth-message auth-message--success" role="status"><Check size={16} />{notice}</div>}
        <form className="auth-form" onSubmit={submit}>
          {isSignUp && <><label htmlFor="auth-name">Full name</label><input id="auth-name" autoComplete="name" required maxLength={100} value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your name" /></>}
          <label htmlFor="auth-email">Email address</label>
          <input id="auth-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@organization.org" />
          <div className="auth-label-row"><label htmlFor="auth-password">Password</label>{!isSignUp && <button type="button" className="auth-link" onClick={() => setNotice("Ask your workspace administrator to reset your password.")}>Need help?</button>}</div>
          <div className="password-field"><input id="auth-password" type={showPassword ? "text" : "password"} autoComplete={isSignUp ? "new-password" : "current-password"} required minLength={isSignUp ? 8 : 6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isSignUp ? "At least 8 characters" : "Enter your password"} /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>
          <button className="button button--primary auth-submit" type="submit" disabled={loading}>{loading ? <span className="loading-spinner" /> : <ShieldCheck size={16} />}{loading ? isSignUp ? "Creating account…" : "Signing in…" : isSignUp ? "Create account" : "Sign in securely"}<ArrowRight size={16} /></button>
        </form>
        <div className="auth-separator"><span /> <small>OR FOR EVALUATION</small> <span /></div>
        <button className="button button--secondary demo-access" type="button" onClick={onDemo}><Activity size={16} />Explore the demo workspace</button>
        <p className="auth-switch">{isSignUp ? "Already have an account?" : "New to VaxiSure?"}<button type="button" onClick={() => { setIsSignUp((value) => !value); setError(""); setNotice("") }}>{isSignUp ? "Sign in" : "Create a workspace"}</button></p>
        <p className="auth-demo-note"><span className="demo-dot" /> Demo data is simulated and does not represent live sensor readings.</p>
        <div className="auth-security"><ShieldCheck size={14} /> Your session is protected by Supabase authentication and organization-scoped access policies.</div>
      </div>
    </section>
  </main>
}

export function AppShell() {
  const [user, setUser] = useState<{ id: string; email?: string; name?: string } | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [demo, setDemo] = useState(false)
  const [demoData, setDemoData] = useState<MonitoringData>(demoMonitoringData)
  const [page, setPage] = useState<PageId>("overview")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [toast, setToast] = useState("")
  const [workspaceSetupError, setWorkspaceSetupError] = useState("")

  useEffect(() => {
    let active = true
    let subscription: { unsubscribe: () => void } | undefined
    try {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data, error }: { data: { user: User | null }; error: AuthError | null }) => {
        if (!active) return
        if (!error && data.user) setUser({ id: data.user.id, email: data.user.email, name: data.user.user_metadata?.full_name })
        setAuthReady(true)
      }).catch(() => { if (active) setAuthReady(true) })
      const result = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
        if (!active) return
        setUser(session?.user ? { id: session.user.id, email: session.user.email, name: session.user.user_metadata?.full_name } : null)
        setDemo(false)
      })
      subscription = result.data.subscription
    } catch {
      setAuthReady(true)
    }
    return () => { active = false; subscription?.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(""), 3800)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const { data: remoteData, error: dataError, isLoading, mutate } = useMonitoringData(user?.id ?? null)
  const data = demo ? demoData : remoteData

  useEffect(() => {
    if (!user || demo) return
    let active = true
    setWorkspaceSetupError("")
    fetch("/api/organizations/initialize", { method: "POST" })
      .then(async (response) => {
        const result = await response.json().catch(() => ({})) as { error?: string }
        if (!response.ok) throw new Error(result.error ?? "Workspace setup is unavailable.")
        if (active) await mutate()
      })
      .catch((cause) => { if (active) setWorkspaceSetupError(cause instanceof Error ? cause.message : "Unable to prepare your workspace.") })
    return () => { active = false }
  }, [user?.id, demo, mutate])
  const activeAlerts = useMemo(() => (data?.alerts ?? []).filter((alert) => alert.status !== "resolved"), [data?.alerts])
  const currentPageLabel = pageTitles[page]

  function navigate(next: string) {
    if (next in pageTitles) setPage(next as PageId)
    setMobileNavOpen(false)
    setNotificationsOpen(false)
    setProfileOpen(false)
  }

  async function signOut() {
    try { await createClient().auth.signOut() } catch { /* The UI still clears its local session state. */ }
    setUser(null)
    setDemo(false)
    setPage("overview")
  }

  function requireOrganization() {
    if (!data?.organizationId) throw new Error("This account is not linked to an organization yet. Ask your workspace administrator to finish account setup.")
    return data.organizationId
  }

  async function saveBatch(values: FieldValues, item?: VaccineBatch) {
    const fields = {
      vaccine_name: values.vaccine_name.trim(),
      batch_number: values.batch_number.trim(),
      quantity: Number(values.quantity),
      storage_location: values.storage_location.trim(),
      min_temperature_c: Number(values.min_temperature_c),
      max_temperature_c: Number(values.max_temperature_c),
      expires_on: values.expires_on || null,
      device_id: values.device_id || null,
      shipment_id: values.shipment_id || null,
    }
    if (demo) {
      setDemoData((current) => ({ ...current, batches: item ? current.batches.map((batch) => batch.id === item.id ? { ...batch, ...fields } : batch) : [{ id: `demo-batch-${Date.now()}`, ...fields, archived_at: null }, ...current.batches] }))
      return "Demo batch saved in this session."
    }
    const supabase = createClient()
    const organizationId = requireOrganization()
    const result = item
      ? await supabase.from("vaccine_batches").update(fields).eq("id", item.id).select("id").single()
      : await supabase.from("vaccine_batches").insert({ ...fields, organization_id: organizationId }).select("id").single()
    if (result.error) throw new Error(result.error.message)
    await mutate()
    return "Vaccine batch saved."
  }

  async function archiveBatch(item: VaccineBatch) {
    if (demo) {
      setDemoData((current) => ({ ...current, batches: current.batches.map((batch) => batch.id === item.id ? { ...batch, archived_at: new Date().toISOString() } : batch) }))
      setToast("Batch archived in this demo session.")
      return
    }
    const { error } = await createClient().from("vaccine_batches").update({ archived_at: new Date().toISOString() }).eq("id", item.id)
    if (error) setToast(error.message)
    else { await mutate(); setToast("Batch archived.") }
  }

  async function saveShipment(values: FieldValues) {
    const fields = {
      shipment_code: values.shipment_code.trim(),
      origin: values.origin.trim(),
      destination: values.destination.trim(),
      status: values.status,
      estimated_arrival: values.estimated_arrival ? new Date(values.estimated_arrival).toISOString() : null,
      device_id: values.device_id || null,
    }
    if (demo) {
      setDemoData((current) => ({ ...current, shipments: [{ id: `demo-shipment-${Date.now()}`, ...fields } as Shipment, ...current.shipments] }))
      return "Demo shipment added to this session. Its route is not live GPS."
    }
    const { error } = await createClient().from("shipments").insert({ ...fields, organization_id: requireOrganization() })
    if (error) throw new Error(error.message)
    await mutate()
    return "Shipment created."
  }

  async function registerDevice(values: FieldValues) {
    const fields = {
      device_code: values.device_code.trim(),
      name: values.name.trim(),
      location: values.location.trim(),
      firmware_version: values.firmware_version.trim(),
      sensor_types: values.sensor_types.split(",").map((sensor) => sensor.trim()).filter(Boolean),
    }
    if (demo) {
      const id = `demo-device-${Date.now()}`
      setDemoData((current) => ({ ...current, devices: [{ id, ...fields, status: "offline", last_seen_at: null }, ...current.devices] }))
      return "DEMO ONLY — this device record is simulated. No credential was created."
    }
    const response = await fetch("/api/devices/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fields) })
    const result = await response.json().catch(() => ({})) as { error?: string; api_key?: string }
    if (!response.ok) throw new Error(result.error ?? "Unable to register this device.")
    await mutate()
    return result.api_key ? `One-time device API key: ${result.api_key}` : "Device registered."
  }

  async function updateAlert(alert: Alert, status: AlertStatus) {
    if (demo) {
      const createdAt = new Date().toISOString()
      setDemoData((current) => ({
        ...current,
        alerts: current.alerts.map((item) => item.id === alert.id ? { ...item, status, resolved_at: status === "resolved" ? createdAt : null } : item),
        alertHistory: [{ id: `demo-history-${Date.now()}`, alert_id: alert.id, actor_id: null, action: status === "open" ? "reopened" : status, note: "Status changed in this demo session.", created_at: createdAt }, ...(current.alertHistory ?? [])],
      }))
      setSelectedAlert(null)
      setToast(`Alert marked ${status} in this demo session.`)
      return
    }
    const response = await fetch(`/api/alerts/${encodeURIComponent(alert.id)}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) })
    const result = await response.json().catch(() => ({})) as { error?: string; history_recorded?: boolean }
    if (!response.ok && response.status !== 207) { setToast(result.error ?? "Unable to update alert status."); return }
    setSelectedAlert(null)
    await mutate()
    setToast(result.history_recorded === false ? `Alert marked ${status}; audit history could not be recorded.` : `Alert marked ${status}.`)
  }

  async function saveThresholds(minimum: number, maximum: number, stale: number) {
    if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum >= maximum || !Number.isInteger(stale) || stale < 1 || stale > 1440) {
      throw new Error("Choose a minimum below the maximum and a stale interval from 1 to 1,440 minutes.")
    }
    if (demo) {
      setToast("Thresholds saved for this demo session.")
      return
    }
    const supabase = createClient()
    const organizationId = requireOrganization()
    const existing = await supabase.from("threshold_configs").select("id").eq("organization_id", organizationId).is("device_id", null).limit(1).maybeSingle()
    if (existing.error) throw new Error(existing.error.message)
    const fields = { min_temperature_c: minimum, max_temperature_c: maximum, stale_after_minutes: stale }
    const result = existing.data
      ? await supabase.from("threshold_configs").update(fields).eq("id", existing.data.id)
      : await supabase.from("threshold_configs").insert({ ...fields, organization_id: organizationId, device_id: null, label: "Default storage range" })
    if (result.error) throw new Error(result.error.message)
  }

  function downloadCsv() {
    if (!data) return
    const rows = [["device_code", "device_name", "recorded_at", "ds18b20_c", "dht22_temperature_c", "humidity_percent", "data_source"]]
    const deviceById = new Map(data.devices.map((device) => [device.id, device]))
    for (const reading of data.readings) {
      const device = deviceById.get(reading.device_id)
      rows.push([device?.device_code ?? "", device?.name ?? "", reading.recorded_at, reading.ds18b20_c == null ? "" : String(reading.ds18b20_c), reading.dht22_temperature_c == null ? "" : String(reading.dht22_temperature_c), reading.humidity_percent == null ? "" : String(reading.humidity_percent), demo ? "simulated demo data" : "stored telemetry"])
    }
    const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\r\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `vaxisure-readings-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  if (!authReady) return <div className="startup-screen"><BrandMark /><span>Preparing your workspace…</span></div>
  if (!user && !demo) return <AuthScreen onDemo={() => { setDemo(true); setPage("overview") }} />
  if (!data && isLoading) return <div className="startup-screen"><BrandMark /><span>Loading your organization&apos;s monitoring data…</span></div>
  if (!data) return <main className="startup-error"><ShieldCheck size={30} /><h1>Workspace data unavailable</h1><p>{dataError?.message ?? "Sign in again or open the demonstration workspace."}</p><button className="button button--secondary" onClick={signOut}>Return to sign in</button></main>

  const onDialogSubmit = async (values: FieldValues) => {
    if (!dialog) return
    if (dialog.kind === "batch") return saveBatch(values, dialog.item as VaccineBatch | undefined)
    if (dialog.kind === "shipment") return saveShipment(values)
    return registerDevice(values)
  }

  return <main className={`vaxisure-app${sidebarCollapsed ? " is-collapsed" : ""}`}>
    {mobileNavOpen && <button className="mobile-nav-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
    <aside className={`app-sidebar${sidebarCollapsed ? " app-sidebar--collapsed" : ""}${mobileNavOpen ? " app-sidebar--open" : ""}`}>
      <div className="sidebar-brand"><BrandMark compact /><span className="sidebar-brand__copy"><strong>VaxiSure</strong><small>Cold-chain operations</small></span><button className="sidebar-close" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}><X size={17} /></button></div>
      <div className="workspace-switcher"><span className="workspace-switcher__mark">{data.organizationName.slice(0, 1).toUpperCase()}</span><span className="workspace-switcher__copy"><strong>{data.organizationName}</strong><small>{demo ? "Demo workspace" : "Organization workspace"}</small></span><ChevronDown size={14} /></div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {navGroups.map((group) => <div className="nav-group" key={group.label}><span className="nav-group__label">{group.label}</span>{group.items.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item${page === id ? " is-active" : ""}`} onClick={() => navigate(id)} title={sidebarCollapsed ? label : undefined} aria-current={page === id ? "page" : undefined}><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{id === "alerts" && activeAlerts.length > 0 && <i className="nav-count">{activeAlerts.length}</i>}</button>)}</div>)}
        <div className="nav-group nav-group--bottom"><span className="nav-group__label">WORKSPACE</span><button className={`nav-item${page === "settings" ? " is-active" : ""}`} onClick={() => navigate("settings")} title={sidebarCollapsed ? "Settings" : undefined}><Settings size={17} strokeWidth={1.8} /><span>Settings</span></button><button className="nav-item" onClick={() => setToast("For workspace support, contact your VaxiSure administrator.")}><CircleHelp size={17} strokeWidth={1.8} /><span>Help & support</span></button></div>
      </nav>
      <div className="sidebar-bottom"><div className={`connection-card${demo ? " connection-card--demo" : ""}`}><span className="connection-card__icon">{demo ? <Activity size={15} /> : <Wifi size={15} />}</span><span><strong>{demo ? "Demo environment" : "Supabase connected"}</strong><small>{demo ? "Simulated sample readings" : "Live workspace data"}</small></span><i /></div><button className="sidebar-user" onClick={() => setProfileOpen((value) => !value)}><span className="user-avatar">{user?.name?.slice(0, 1).toUpperCase() ?? user?.email?.slice(0, 1).toUpperCase() ?? "D"}</span><span className="sidebar-user__copy"><strong>{user?.name || user?.email?.split("@")[0] || "Demo operator"}</strong><small>{demo ? "Evaluation access" : data.role.replaceAll("_", " ")}</small></span><ChevronDown size={14} /></button></div>
      <button className="sidebar-collapse" onClick={() => setSidebarCollapsed((value) => !value)} aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}>{sidebarCollapsed ? <ChevronRight size={16} /> : <PanelLeftClose size={16} />}<span>{sidebarCollapsed ? "Expand menu" : "Collapse menu"}</span></button>
    </aside>

    <section className="app-main">
      <header className="topbar"><div className="topbar__left"><button className="mobile-menu-button" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu size={19} /></button><div className="breadcrumb"><span>VaxiSure</span><ChevronRight size={13} /><strong>{currentPageLabel}</strong></div></div><div className="topbar__tools"><label className="global-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search inventory…" aria-label="Search vaccine inventory" onKeyDown={(event) => { if (event.key === "Enter" && !(event.nativeEvent.isComposing || event.keyCode === 229)) navigate("inventory") }} /><kbd>↵</kbd></label><LiveClock /><span className="topbar-divider" /><button className="topbar-icon-button" aria-label={`${activeAlerts.length} open alerts`} onClick={() => setNotificationsOpen((value) => !value)}><Bell size={17} />{activeAlerts.length > 0 && <i />}</button><button className="topbar-profile" onClick={() => setProfileOpen((value) => !value)}><span className="user-avatar user-avatar--small">{user?.name?.slice(0, 1).toUpperCase() ?? user?.email?.slice(0, 1).toUpperCase() ?? "D"}</span><ChevronDown size={13} /></button></div>
        {profileOpen && <div className="profile-popover profile-popover--topbar"><span>{user?.email ?? "Demo workspace"}</span><button onClick={demo ? () => { setDemo(false); setDemoData(demoMonitoringData); setPage("overview"); setProfileOpen(false) } : signOut}><LogOut size={14} />{demo ? "Exit demo" : "Sign out"}</button></div>}
        {notificationsOpen && <div className="notification-popover"><div className="notification-popover__head"><strong>Open alerts</strong><button onClick={() => navigate("alerts")}>View all</button></div>{activeAlerts.slice(0, 4).map((alert) => <button key={alert.id} className="notification-row" onClick={() => { setSelectedAlert(alert); setNotificationsOpen(false) }}><span className={`notification-mark notification-mark--${alert.severity}`}><AlertTriangle size={14} /></span><span><strong>{alert.title}</strong><small>{new Date(alert.created_at).toLocaleString()}</small></span></button>)}{!activeAlerts.length && <p className="notification-empty"><Check size={15} />No open alerts</p>}</div>}
      </header>

      {demo && <div className="demo-ribbon"><span><Activity size={14} /><strong>DEMO MODE</strong><i />Simulated data · not connected to physical sensors</span><button onClick={() => setToast("Demo changes last for this browser session only.")}>About demo data <ArrowRight size={13} /></button></div>}
      {workspaceSetupError && !demo && <div className="app-error-banner" role="alert"><AlertTriangle size={16} />{workspaceSetupError}<button onClick={() => { setWorkspaceSetupError(""); void fetch("/api/organizations/initialize", { method: "POST" }).then(() => mutate()) }}>Retry setup</button></div>}
      {dataError && !demo && <div className="app-error-banner" role="alert"><AlertTriangle size={16} />Unable to refresh live data: {dataError.message}<button onClick={() => mutate()}>Retry</button></div>}
      <div className="page-content">
        {page === "overview" && <DashboardView data={data} demo={demo} userName={demo ? "Alex" : user?.name || user?.email?.split("@")[0] || "there"} onNavigate={navigate} onAlertClick={setSelectedAlert} />}
        {page === "monitoring" && <MonitoringView data={data} demo={demo} error={dataError?.message} onNavigate={navigate} />}
        {page === "inventory" && <InventoryView data={data} demo={demo} search={search} onAdd={() => setDialog({ kind: "batch" })} onEdit={(item) => setDialog({ kind: "batch", item })} onView={(item) => setDialog({ kind: "batch", item, readOnly: true })} onArchive={(item) => { if (window.confirm(`Archive batch ${item.batch_number}?`)) void archiveBatch(item) }} />}
        {page === "shipments" && <ShipmentsView data={data} demo={demo} onAdd={() => setDialog({ kind: "shipment" })} />}
        {page === "alerts" && <AlertsView data={data} demo={demo} onAction={updateAlert} onOpen={setSelectedAlert} />}
        {page === "analytics" && <AnalyticsView data={data} demo={demo} onDownload={downloadCsv} onPrint={() => window.print()} />}
        {page === "anomalies" && <AnomalyView data={data} demo={demo} onOpenAlert={setSelectedAlert} />}
        {page === "devices" && <DevicesView data={data} demo={demo} onAdd={() => setDialog({ kind: "device" })} />}
        {page === "settings" && <SettingsView data={data} demo={demo} onSaveThresholds={saveThresholds} />}
      </div>
      <footer className="app-footer"><span><ShieldCheck size={14} /> VaxiSure supports operational monitoring; it does not certify vaccine potency.</span><span>Data refreshed automatically <i /></span></footer>
    </section>

    {dialog && <ActionDialog key={`${dialog.kind}-${dialog.item?.id ?? "new"}-${dialog.readOnly ? "view" : "edit"}`} kind={dialog.kind} item={dialog.item} readOnly={dialog.readOnly} devices={data.devices} shipments={data.shipments} onClose={() => setDialog(null)} onSubmit={onDialogSubmit} />}
    {selectedAlert && <AlertDetailDialog alert={selectedAlert} data={data} onClose={() => setSelectedAlert(null)} onAction={(status) => void updateAlert(selectedAlert, status)} />}
    {toast && <div className="toast-message" role="status"><Check size={16} />{toast}<button aria-label="Dismiss notification" onClick={() => setToast("")}><X size={14} /></button></div>}
  </main>
}

function AlertDetailDialog({ alert, data, onClose, onAction }: { alert: Alert; data: MonitoringData; onClose: () => void; onAction: (status: AlertStatus) => void }) {
  const device = data.devices.find((item) => item.id === alert.device_id)
  const shipment = data.shipments.find((item) => item.id === alert.shipment_id)
  const history = (data.alertHistory ?? []).filter((item) => item.alert_id === alert.id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="modal-card alert-detail-modal" role="dialog" aria-modal="true" aria-labelledby="alert-detail-title"><div className="modal-header"><span className={`alert-item__icon alert-item__icon--${alert.severity}`}><AlertTriangle size={17} /></span><button className="icon-button" aria-label="Close alert details" onClick={onClose}><X size={17} /></button></div><span className={`severity-label severity-label--${alert.severity}`}><i />{alert.severity} severity</span><h2 id="alert-detail-title">{alert.title}</h2><p>{alert.description}</p><div className="alert-detail-grid"><div><small>Reported at</small><strong>{new Date(alert.created_at).toLocaleString()}</strong></div><div><small>Measured value</small><strong>{alert.measured_value ?? "Not reported"}</strong></div><div><small>Related device</small><strong>{device?.device_code ?? device?.name ?? "No device linked"}</strong></div><div><small>Shipment</small><strong>{shipment?.shipment_code ?? "No shipment linked"}</strong></div></div><div className="recommended-action"><span><ShieldCheck size={16} /></span><div><strong>Recommended next step</strong><p>{alert.recommended_action || "Review the device and follow local cold-chain procedures."}</p></div></div><section className="alert-history" aria-label="Alert status history"><div className="eyebrow">ACTIVITY HISTORY</div>{history.length ? history.map((entry) => <div className="alert-history__row" key={entry.id}><span className="alert-history__dot" /><span><strong>{entry.action.replaceAll("_", " ")}</strong><small>{new Date(entry.created_at).toLocaleString()} · {entry.note}</small></span></div>) : <p>No additional status changes recorded{!(data.alertHistory ?? []).length ? " in this demo" : " yet"}.</p>}</section><div className="modal-actions"><button className="button button--secondary" onClick={onClose}>Close</button>{alert.status === "open" && <button className="button button--primary" onClick={() => onAction("acknowledged")}>Acknowledge alert</button>}{alert.status === "acknowledged" && <button className="button button--primary" onClick={() => onAction("resolved")}>Mark resolved</button>}</div></section></div>
}
