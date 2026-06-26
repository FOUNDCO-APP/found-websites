"use client"

import { useState } from "react"
import { GREEN, BLACK, TYPE, TEXT_OPACITY } from "@/lib/dashboard/typography"

export type LocationRow = {
  id: string
  name: string
  address: string | null
  phone: string | null
  hours: string | null
  sort_order: number
}

function LocationForm({
  initial,
  onSave,
  onCancel,
  onDelete,
  saving,
}: {
  initial: Partial<LocationRow>
  onSave: (data: Partial<LocationRow>) => void
  onCancel: () => void
  onDelete?: () => void
  saving: boolean
}) {
  const [name,    setName]    = useState(initial.name    ?? "")
  const [address, setAddress] = useState(initial.address ?? "")
  const [phone,   setPhone]   = useState(initial.phone   ?? "")
  const [hours,   setHours]   = useState(initial.hours   ?? "")

  const inputStyle = {
    width: "100%", boxSizing: "border-box" as const,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12, padding: "12px 14px",
    color: "white", fontSize: 15, outline: "none",
    fontFamily: "inherit",
  }
  const labelStyle = { ...TYPE.caption, fontWeight: 700, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, display: "block" as const, marginBottom: 6 }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <label style={labelStyle}>Location Name *</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder='e.g. "Downtown" or "North Side"' style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Address</label>
        <input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St, Tucson, AZ 85701" style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Phone</label>
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(520) 555-0100" style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Hours</label>
        <input value={hours} onChange={e => setHours(e.target.value)} placeholder="Mon–Fri 9am–6pm · Sat 10am–4pm" style={inputStyle} />
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent", color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, ...TYPE.subhead, fontWeight: 600, cursor: "pointer" }}>
          Cancel
        </button>
        <button
          onClick={() => onSave({ name, address, phone, hours })}
          disabled={!name.trim() || saving}
          style={{ flex: 2, padding: "12px 0", borderRadius: 12, border: "none", backgroundColor: name.trim() ? GREEN : "rgba(255,255,255,0.07)", color: name.trim() ? BLACK : `rgba(255,255,255,0.3)`, ...TYPE.subhead, fontWeight: 800, cursor: name.trim() ? "pointer" : "default" }}
        >
          {saving ? "Saving…" : "Save Location"}
        </button>
      </div>

      {onDelete && (
        <button onClick={onDelete} style={{ width: "100%", padding: "11px 0", borderRadius: 12, border: "1px solid rgba(255,59,48,0.25)", backgroundColor: "rgba(255,59,48,0.06)", color: "#FF3B30", ...TYPE.subhead, fontWeight: 600, cursor: "pointer" }}>
          Delete This Location
        </button>
      )}
    </div>
  )
}

export default function LocationsClient({
  initialLocations,
  primaryName,
  primaryCity,
  primaryState,
}: {
  initialLocations: LocationRow[]
  primaryName: string
  primaryCity: string | null
  primaryState: string | null
}) {
  const [locations, setLocations] = useState<LocationRow[]>(initialLocations)
  const [adding, setAdding]       = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)
  const [toast, setToast]         = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleAdd(data: Partial<LocationRow>) {
    setSaving(true)
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (json.location) {
        setLocations(prev => [...prev, json.location])
        setAdding(false)
        showToast("Location added")
      }
    } finally { setSaving(false) }
  }

  async function handleEdit(id: string, data: Partial<LocationRow>) {
    setSaving(true)
    try {
      const res = await fetch("/api/locations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...data }),
      })
      const json = await res.json()
      if (json.location) {
        setLocations(prev => prev.map(l => l.id === id ? json.location : l))
        setEditingId(null)
        showToast("Location saved")
      }
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this location?")) return
    setSaving(true)
    try {
      await fetch(`/api/locations?id=${id}`, { method: "DELETE" })
      setLocations(prev => prev.filter(l => l.id !== id))
      setEditingId(null)
      showToast("Location removed")
    } finally { setSaving(false) }
  }

  const card = {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.07)",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: "18px 18px",
  }

  const primaryLine = [primaryCity, primaryState].filter(Boolean).join(", ")

  return (
    <main style={{ padding: "28px 20px 60px" }}>
      <h1 style={{ margin: "0 0 6px", ...TYPE.largeTitle, color: "white" }}>Locations</h1>
      <p style={{ margin: "0 0 28px", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
        Both locations will appear in a "Find Us" section on your website.
      </p>

      {/* Primary location — read-only */}
      <div style={{ marginBottom: 12 }}>
        <p style={{ margin: "0 0 8px", ...TYPE.caption, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>
          Primary Location
        </p>
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${GREEN}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div>
              <p style={{ margin: 0, ...TYPE.subhead, fontWeight: 600, color: "white" }}>{primaryName}</p>
              {primaryLine && <p style={{ margin: "2px 0 0", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>{primaryLine}</p>}
            </div>
          </div>
          <p style={{ margin: "12px 0 0", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>
            Edit your primary location details in Site Editor → Profile.
          </p>
        </div>
      </div>

      {/* Additional locations */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ margin: "0 0 8px", ...TYPE.caption, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>
          Second Location
        </p>

        {locations.length === 0 && !adding && (
          <div style={{ ...card, textAlign: "center", padding: "32px 20px" }}>
            <p style={{ margin: "0 0 4px", ...TYPE.subhead, fontWeight: 600, color: "white" }}>No second location yet</p>
            <p style={{ margin: "0 0 20px", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
              Add your second location to show it on your website.
            </p>
            <button onClick={() => setAdding(true)} style={{ padding: "13px 28px", borderRadius: 12, border: "none", backgroundColor: GREEN, color: BLACK, ...TYPE.subhead, fontWeight: 800, cursor: "pointer" }}>
              Add Location
            </button>
          </div>
        )}

        {locations.map(loc => (
          <div key={loc.id} style={{ ...card, marginBottom: 10 }}>
            {editingId === loc.id ? (
              <LocationForm
                initial={loc}
                onSave={data => handleEdit(loc.id, data)}
                onCancel={() => setEditingId(null)}
                onDelete={() => handleDelete(loc.id)}
                saving={saving}
              />
            ) : (
              <div>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ margin: 0, ...TYPE.subhead, fontWeight: 600, color: "white" }}>{loc.name}</p>
                    {loc.address && <p style={{ margin: "3px 0 0", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>{loc.address}</p>}
                    {loc.phone && <p style={{ margin: "2px 0 0", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>{loc.phone}</p>}
                    {loc.hours && <p style={{ margin: "2px 0 0", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>{loc.hours}</p>}
                  </div>
                  <button onClick={() => setEditingId(loc.id)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, padding: "6px 14px", color: `rgba(255,255,255,${TEXT_OPACITY.secondary})`, ...TYPE.caption, fontWeight: 700, cursor: "pointer", flexShrink: 0, marginLeft: 12 }}>
                    Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {adding && (
          <div style={{ ...card, marginTop: 10 }}>
            <LocationForm
              initial={{}}
              onSave={handleAdd}
              onCancel={() => setAdding(false)}
              saving={saving}
            />
          </div>
        )}

        {locations.length > 0 && !adding && !editingId && (
          <button onClick={() => setAdding(true)} style={{ marginTop: 8, width: "100%", padding: "13px 0", borderRadius: 12, border: "1.5px dashed rgba(255,255,255,0.15)", backgroundColor: "transparent", color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, ...TYPE.subhead, fontWeight: 600, cursor: "pointer" }}>
            + Add Another Location
          </button>
        )}
      </div>

      {toast && (
        <div style={{
          position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
          zIndex: 200, backgroundColor: "rgba(8,10,9,0.92)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 100,
          padding: "10px 20px", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", pointerEvents: "none",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          <span style={{ ...TYPE.footnote, fontWeight: 600, color: "white" }}>{toast}</span>
        </div>
      )}
    </main>
  )
}
