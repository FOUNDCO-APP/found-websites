"use client"

import React, { useState, useTransition } from "react"
import { updateSiteField, regenerateSection, assignPhotoToSection } from "./actions"

const GREEN = "#32D074"
const BLACK = "#080A09"

type Config = Record<string, unknown>
type Photo = { id: string; url: string; website_section: string | null }
type Section = "hero" | "about" | "services" | "tagline"

type Props = {
  company: { id: string; name: string; slug: string }
  config: Config | null
  photos: Photo[]
}

export default function SiteEditor({ company, config: initialConfig, photos }: Props) {
  const [config, setConfig] = useState<Config>(initialConfig ?? {})
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [regenerating, setRegenerating] = useState<Section | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [editingService, setEditingService] = useState<number | null>(null)
  const [newService, setNewService] = useState(false)
  const [newServiceName, setNewServiceName] = useState("")
  const [newServiceDesc, setNewServiceDesc] = useState("")
  const [, startTransition] = useTransition()

  function startEdit(field: string, value: string) {
    setEditing(field)
    setEditValue(value)
  }

  async function saveEdit(field: string) {
    const value = editValue.trim()
    if (!value) return
    setConfig(prev => ({ ...prev, [field]: value }))
    setEditing(null)
    setSaved(field)
    setTimeout(() => setSaved(null), 2500)
    startTransition(async () => { await updateSiteField(field, value) })
  }

  async function handleRegenerate(section: Section) {
    setRegenerating(section)
    const result = await regenerateSection(section)
    if (result.success && result.updates) {
      setConfig(prev => ({ ...prev, ...result.updates }))
    }
    setRegenerating(null)
  }

  async function saveService(index: number, name: string, description: string) {
    const services = [...((config.services as Array<{name:string;description:string}>) ?? [])]
    services[index] = { name, description }
    setConfig(prev => ({ ...prev, services }))
    setEditingService(null)
    startTransition(async () => { await updateSiteField("services", services) })
  }

  async function removeService(index: number) {
    const services = [...((config.services as Array<{name:string;description:string}>) ?? [])]
    services.splice(index, 1)
    setConfig(prev => ({ ...prev, services }))
    startTransition(async () => { await updateSiteField("services", services) })
  }

  async function addService() {
    if (!newServiceName.trim()) return
    const services = [...((config.services as Array<{name:string;description:string}>) ?? [])]
    services.push({ name: newServiceName.trim(), description: newServiceDesc.trim() })
    setConfig(prev => ({ ...prev, services }))
    setNewService(false)
    setNewServiceName("")
    setNewServiceDesc("")
    startTransition(async () => { await updateSiteField("services", services) })
  }

  function handleAssignPhoto(photoId: string, section: string | null) {
    startTransition(async () => { await assignPhotoToSection(photoId, section) })
  }

  const heroPhotos = photos.filter(p => p.website_section === "hero")
  const galleryPhotos = photos.filter(p => p.website_section === "gallery")
  const unassigned = photos.filter(p => !p.website_section)
  const services = (config.services as Array<{name:string;description:string}>) ?? []

  return (
    <div style={{ backgroundColor: BLACK, minHeight: "100dvh", paddingBottom: 60 }}>

      {/* ── HERO BANNER — gradient, not flat black ── */}
      <div style={{
        padding: "36px 24px 32px",
        background: `radial-gradient(ellipse at 0% 0%, rgba(50,208,116,0.12) 0%, transparent 60%),
                     radial-gradient(ellipse at 100% 100%, rgba(120,80,255,0.08) 0%, transparent 60%)`,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Subtle grid texture */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.03,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          pointerEvents: "none",
        }}/>

        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              backgroundColor: GREEN,
              boxShadow: `0 0 12px ${GREEN}`,
            }}/>
            <span style={{ fontSize: 11, color: GREEN, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Live
            </span>
          </div>
          <h1 style={{ margin: "0 0 4px", fontSize: 32, fontWeight: 200, color: "white", letterSpacing: "-0.04em" }}>
            Your Website
          </h1>
          <a
            href={`https://${company.slug}.foundco.app`}
            target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}
          >
            {company.slug}.foundco.app
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
        </div>
      </div>

      <div style={{ padding: "0 20px" }}>

        {/* ══════════════════════════════
            HOME PAGE
        ══════════════════════════════ */}
        <PageLabel title="Home Page" description="What people see the moment they arrive" gradient="linear-gradient(135deg, rgba(50,208,116,0.15), rgba(50,208,116,0.03))" />

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 8 }}>

          <FieldCard
            eyebrow="First Impression"
            label="Your main headline"
            hint="Short and punchy. What do you do, for who?"
            field="hero_title"
            value={String(config.hero_title ?? "")}
            editing={editing} editValue={editValue} saved={saved}
            onEdit={startEdit} onSave={saveEdit}
            onCancel={() => setEditing(null)} onChange={setEditValue}
            multiline={false}
            accentColor={GREEN}
          />

          <FieldCard
            eyebrow="First Impression"
            label="Supporting line"
            hint="One or two sentences that back up your headline."
            field="hero_subtitle"
            value={String(config.hero_subtitle ?? "")}
            editing={editing} editValue={editValue} saved={saved}
            onEdit={startEdit} onSave={saveEdit}
            onCancel={() => setEditing(null)} onChange={setEditValue}
            multiline={true}
            accentColor={GREEN}
          />

          <AIRewriteCard
            label="Not feeling it?"
            description="Let AI rewrite your headline and supporting line based on your business."
            buttonLabel="Rewrite First Impression"
            isLoading={regenerating === "hero"}
            accentColor={GREEN}
            onRegenerate={() => handleRegenerate("hero")}
          />

          {/* Hero photo */}
          {photos.length > 0 && (
            <PhotoAssignCard
              label="Main photo"
              description="The big image behind your headline"
              assigned={heroPhotos}
              unassigned={unassigned}
              section="hero"
              onAssign={handleAssignPhoto}
              accentColor={GREEN}
            />
          )}

          <FieldCard
            eyebrow="Your Hook"
            label="Tagline"
            hint="3–6 words. Something that sticks."
            field="tagline"
            value={String(config.tagline ?? "")}
            editing={editing} editValue={editValue} saved={saved}
            onEdit={startEdit} onSave={saveEdit}
            onCancel={() => setEditing(null)} onChange={setEditValue}
            multiline={false}
            accentColor="#38BDF8"
          />

          <FieldCard
            eyebrow="Your Hook"
            label="Button text"
            hint="What do you want people to tap or click?"
            field="cta_headline"
            value={String(config.cta_headline ?? "")}
            editing={editing} editValue={editValue} saved={saved}
            onEdit={startEdit} onSave={saveEdit}
            onCancel={() => setEditing(null)} onChange={setEditValue}
            multiline={false}
            accentColor="#38BDF8"
          />

          <AIRewriteCard
            label="Need help with your hook?"
            description="AI will write a tagline and button text that matches your brand."
            buttonLabel="Rewrite Your Hook"
            isLoading={regenerating === "tagline"}
            accentColor="#38BDF8"
            onRegenerate={() => handleRegenerate("tagline")}
          />
        </div>

        {/* ══════════════════════════════
            ABOUT PAGE
        ══════════════════════════════ */}
        <PageLabel title="About Page" description="Your story — who you are and why you do this" gradient="linear-gradient(135deg, rgba(167,139,250,0.15), rgba(167,139,250,0.03))" />

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 8 }}>
          <FieldCard
            eyebrow="Your Story"
            label="About your business"
            hint="Be real. Talk to your customer like a neighbor, not a corporation."
            field="about_text"
            value={String(config.about_text ?? "")}
            editing={editing} editValue={editValue} saved={saved}
            onEdit={startEdit} onSave={saveEdit}
            onCancel={() => setEditing(null)} onChange={setEditValue}
            multiline={true}
            accentColor="#A78BFA"
          />

          <AIRewriteCard
            label="Want it to sound better?"
            description="AI will rewrite your story to feel warm, authentic, and compelling."
            buttonLabel="Rewrite Your Story"
            isLoading={regenerating === "about"}
            accentColor="#A78BFA"
            onRegenerate={() => handleRegenerate("about")}
          />
        </div>

        {/* ══════════════════════════════
            SERVICES PAGE
        ══════════════════════════════ */}
        <PageLabel title="Services Page" description="Everything you do and offer" gradient="linear-gradient(135deg, rgba(251,146,60,0.15), rgba(251,146,60,0.03))" />

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 8 }}>
          {services.map((svc, i) => (
            <ServiceCard
              key={i} index={i}
              name={svc.name} description={svc.description}
              isEditing={editingService === i}
              onEdit={() => setEditingService(i)}
              onSave={saveService}
              onRemove={() => removeService(i)}
              onCancel={() => setEditingService(null)}
            />
          ))}

          {newService ? (
            <div style={{
              borderRadius: 18, padding: 20,
              background: "linear-gradient(135deg, rgba(251,146,60,0.08), rgba(251,146,60,0.03))",
              border: "1px solid rgba(251,146,60,0.25)",
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#FB923C", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>
                New Service
              </div>
              <input placeholder="Service name (e.g. AC Installation)" value={newServiceName}
                onChange={e => setNewServiceName(e.target.value)} autoFocus
                style={{ width: "100%", padding: "12px 14px", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 10, fontFamily: "inherit" }}
              />
              <textarea placeholder="What's included? (optional)" value={newServiceDesc}
                onChange={e => setNewServiceDesc(e.target.value)} rows={2}
                style={{ width: "100%", padding: "12px 14px", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 14, outline: "none", resize: "none", boxSizing: "border-box", marginBottom: 14, fontFamily: "inherit", lineHeight: 1.5 }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setNewService(false); setNewServiceName(""); setNewServiceDesc("") }} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent", color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button onClick={addService} disabled={!newServiceName.trim()} style={{ flex: 2, padding: "12px 0", borderRadius: 12, border: "none", backgroundColor: newServiceName.trim() ? "#FB923C" : "rgba(255,255,255,0.08)", color: newServiceName.trim() ? BLACK : "rgba(255,255,255,0.2)", fontSize: 13, fontWeight: 700, cursor: newServiceName.trim() ? "pointer" : "default" }}>Add Service</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setNewService(true)} style={{ width: "100%", padding: "16px 0", borderRadius: 16, border: "2px dashed rgba(251,146,60,0.25)", backgroundColor: "rgba(251,146,60,0.04)", color: "rgba(251,146,60,0.6)", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add a service you forgot
            </button>
          )}

          <AIRewriteCard
            label="Make your services sound better?"
            description="AI rewrites each service description to be more compelling to customers."
            buttonLabel="Rewrite All Services"
            isLoading={regenerating === "services"}
            accentColor="#FB923C"
            onRegenerate={() => handleRegenerate("services")}
          />
        </div>

        {/* ══════════════════════════════
            GALLERY PAGE
        ══════════════════════════════ */}
        <PageLabel title="Gallery Page" description="Photos of your work that build trust" gradient="linear-gradient(135deg, rgba(52,211,153,0.15), rgba(52,211,153,0.03))" />

        {photos.length === 0 ? (
          <div style={{ borderRadius: 20, padding: "28px 20px", textAlign: "center", border: "1px dashed rgba(255,255,255,0.08)", marginBottom: 8 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📸</div>
            <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 300, color: "white" }}>No photos yet</p>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.3)", lineHeight: 1.7 }}>
              Go to the Photos tab, take some shots of your work,<br/>and heart them to use them here.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 8 }}>
            {galleryPhotos.length > 0 && (
              <div style={{ borderRadius: 18, overflow: "hidden", background: "linear-gradient(135deg, rgba(52,211,153,0.08), rgba(52,211,153,0.02))", border: "1px solid rgba(52,211,153,0.15)" }}>
                <div style={{ padding: "14px 16px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#34D399", letterSpacing: "0.1em", textTransform: "uppercase" }}>In Your Gallery</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{galleryPhotos.length} photo{galleryPhotos.length !== 1 ? "s" : ""}</span>
                </div>
                <div style={{ padding: "0 16px 16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
                  {galleryPhotos.map(p => (
                    <div key={p.id} style={{ position: "relative", borderRadius: 10, overflow: "hidden", aspectRatio: "1" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button onClick={() => handleAssignPhoto(p.id, null)} style={{ position: "absolute", top: 5, right: 5, width: 22, height: 22, borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.8)", border: "none", cursor: "pointer", color: "white", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {unassigned.length > 0 && (
              <div style={{ borderRadius: 18, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ padding: "14px 16px 10px" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Tap to add to gallery</span>
                </div>
                <div style={{ padding: "0 16px 16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
                  {unassigned.map(p => (
                    <button key={p.id} onClick={() => handleAssignPhoto(p.id, "gallery")} style={{ padding: 0, border: "2px dashed rgba(52,211,153,0.2)", borderRadius: 10, overflow: "hidden", aspectRatio: "1", cursor: "pointer", position: "relative", backgroundColor: "transparent" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.4 }} />
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 22, opacity: 0.7 }}>+</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── Page Label ──
function PageLabel({ title, description, gradient }: { title: string; description: string; gradient: string }) {
  return (
    <div style={{
      margin: "32px 0 16px",
      padding: "18px 20px",
      borderRadius: 20,
      background: gradient,
      border: "1px solid rgba(255,255,255,0.08)",
    }}>
      <h2 style={{ margin: "0 0 3px", fontSize: 24, fontWeight: 700, color: "white", letterSpacing: "-0.03em" }}>
        {title}
      </h2>
      <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
        {description}
      </p>
    </div>
  )
}

// ── Field Card ──
function FieldCard({
  eyebrow, label, hint, field, value, editing, editValue, saved,
  onEdit, onSave, onCancel, onChange, multiline, accentColor,
}: {
  eyebrow: string
  label: string
  hint: string
  field: string
  value: string
  editing: string | null
  editValue: string
  saved: string | null
  onEdit: (field: string, value: string) => void
  onSave: (field: string) => void
  onCancel: () => void
  onChange: (val: string) => void
  multiline: boolean
  accentColor: string
}) {
  const isEditing = editing === field
  const isSaved = saved === field

  return (
    <div style={{
      borderRadius: 18,
      backgroundColor: isEditing ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
      border: isEditing ? `1px solid ${accentColor}44` : "1px solid rgba(255,255,255,0.07)",
      overflow: "hidden",
      transition: "all 0.15s ease",
    }}>
      <div style={{ padding: isEditing ? "16px 18px 4px" : "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div>
            <span style={{ fontSize: 10, fontWeight: 700, color: accentColor, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.8 }}>
              {eyebrow}
            </span>
            <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginTop: 1 }}>
              {label}
            </div>
          </div>
          {isSaved ? (
            <span style={{ fontSize: 11, color: GREEN, fontWeight: 700, backgroundColor: `${GREEN}15`, padding: "4px 10px", borderRadius: 100 }}>
              ✓ Live
            </span>
          ) : !isEditing && (
            <button onClick={() => onEdit(field, value)} style={{
              padding: "6px 14px", borderRadius: 100, border: `1px solid rgba(255,255,255,0.1)`,
              backgroundColor: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.45)",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>Edit</button>
          )}
        </div>

        {!isEditing && (
          <div onClick={() => onEdit(field, value)} style={{ cursor: "pointer" }}>
            <p style={{ margin: 0, fontSize: 15, color: value ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)", lineHeight: 1.6, fontStyle: value ? "normal" : "italic" }}>
              {value || `Tap to write your ${label.toLowerCase()}…`}
            </p>
          </div>
        )}
      </div>

      {isEditing && (
        <div style={{ padding: "8px 18px 18px" }}>
          <p style={{ margin: "0 0 10px", fontSize: 12, color: "rgba(255,255,255,0.25)", fontStyle: "italic" }}>{hint}</p>
          {multiline ? (
            <textarea value={editValue} onChange={e => onChange(e.target.value)} autoFocus rows={4}
              style={{ width: "100%", padding: "13px 14px", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", border: `1.5px solid ${accentColor}44`, color: "white", fontSize: 15, outline: "none", resize: "vertical", lineHeight: 1.6, boxSizing: "border-box", fontFamily: "inherit" }}
            />
          ) : (
            <input value={editValue} onChange={e => onChange(e.target.value)} autoFocus
              style={{ width: "100%", padding: "13px 14px", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", border: `1.5px solid ${accentColor}44`, color: "white", fontSize: 15, outline: "none", boxSizing: "border-box" }}
            />
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={onCancel} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent", color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
            <button onClick={() => onSave(field)} style={{ flex: 2, padding: "12px 0", borderRadius: 12, border: "none", backgroundColor: accentColor, color: BLACK, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Save & Go Live</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── AI Rewrite Card ──
function AIRewriteCard({ label, description, buttonLabel, isLoading, accentColor, onRegenerate }: {
  label: string
  description: string
  buttonLabel: string
  isLoading: boolean
  accentColor: string
  onRegenerate: () => void
}) {
  return (
    <div style={{
      borderRadius: 18, padding: "16px 18px",
      background: `linear-gradient(135deg, ${accentColor}08, transparent)`,
      border: `1px solid ${accentColor}22`,
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", lineHeight: 1.5 }}>{description}</div>
      </div>
      <button onClick={onRegenerate} disabled={isLoading} style={{
        flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
        padding: "10px 16px", borderRadius: 100, border: "none",
        backgroundColor: isLoading ? "rgba(255,255,255,0.06)" : `${accentColor}22`,
        color: isLoading ? "rgba(255,255,255,0.25)" : accentColor,
        fontSize: 12, fontWeight: 700, cursor: isLoading ? "default" : "pointer", whiteSpace: "nowrap",
      }}>
        {isLoading ? (
          <><div style={{ width: 10, height: 10, borderRadius: "50%", border: `1.5px solid ${accentColor}33`, borderTopColor: accentColor, animation: "spin 0.7s linear infinite" }}/> Writing…</>
        ) : <>✨ {buttonLabel}</>}
      </button>
    </div>
  )
}

// ── Photo Assign Card ──
function PhotoAssignCard({ label, description, assigned, unassigned, section, onAssign, accentColor }: {
  label: string
  description: string
  assigned: Photo[]
  unassigned: Photo[]
  section: string
  onAssign: (id: string, section: string | null) => void
  accentColor: string
}) {
  if (assigned.length === 0 && unassigned.length === 0) return null
  return (
    <div style={{ borderRadius: 18, padding: "16px 18px", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", marginBottom: 12 }}>{description}</div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
        {assigned.map(p => (
          <div key={p.id} style={{ position: "relative", flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt="" style={{ width: 76, height: 76, borderRadius: 12, objectFit: "cover", border: `2px solid ${accentColor}` }} />
            <button onClick={() => onAssign(p.id, null)} style={{ position: "absolute", top: -5, right: -5, width: 20, height: 20, borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.9)", border: "none", cursor: "pointer", color: "white", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
        ))}
        {unassigned.slice(0, 5).map(p => (
          <button key={p.id} onClick={() => onAssign(p.id, section)} style={{ flexShrink: 0, width: 76, height: 76, borderRadius: 12, padding: 0, border: `2px dashed ${accentColor}33`, overflow: "hidden", cursor: "pointer", position: "relative", backgroundColor: "transparent" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.35 }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 20, opacity: 0.6 }}>+</div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Service Card ──
function ServiceCard({ index, name, description, isEditing, onEdit, onSave, onRemove, onCancel }: {
  index: number; name: string; description: string; isEditing: boolean
  onEdit: () => void; onSave: (i: number, n: string, d: string) => void
  onRemove: () => void; onCancel: () => void
}) {
  const [editName, setEditName] = useState(name)
  const [editDesc, setEditDesc] = useState(description)

  if (isEditing) {
    return (
      <div style={{ borderRadius: 18, padding: 18, background: "linear-gradient(135deg, rgba(251,146,60,0.08), rgba(251,146,60,0.02))", border: "1px solid rgba(251,146,60,0.3)" }}>
        <input value={editName} onChange={e => setEditName(e.target.value)} autoFocus placeholder="Service name"
          style={{ width: "100%", padding: "11px 14px", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 8, fontFamily: "inherit" }}
        />
        <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Brief description" rows={2}
          style={{ width: "100%", padding: "11px 14px", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 14, outline: "none", resize: "none", boxSizing: "border-box", marginBottom: 12, fontFamily: "inherit", lineHeight: 1.5 }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent", color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          <button onClick={() => onSave(index, editName, editDesc)} style={{ flex: 2, padding: "11px 0", borderRadius: 12, border: "none", backgroundColor: "#FB923C", color: BLACK, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Save</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ borderRadius: 16, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ padding: "14px 16px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: description ? 4 : 0 }}>{name}</div>
        {description && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>{description}</div>}
      </div>
      <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <button onClick={onEdit} style={{ flex: 1, padding: "10px 0", border: "none", backgroundColor: "transparent", color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 600, cursor: "pointer", borderRight: "1px solid rgba(255,255,255,0.05)" }}>Edit</button>
        <button onClick={onRemove} style={{ flex: 1, padding: "10px 0", border: "none", backgroundColor: "transparent", color: "rgba(255,80,80,0.5)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Remove</button>
      </div>
    </div>
  )
}
