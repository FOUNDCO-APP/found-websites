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
    <main style={{ backgroundColor: BLACK, minHeight: "100dvh", paddingBottom: 48 }}>

      {/* ── PAGE HEADER ── */}
      <div style={{
        padding: "32px 24px 24px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 34, fontWeight: 200, color: "white", letterSpacing: "-0.04em" }}>
          Your Website
        </h1>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href={`https://${company.slug}.foundco.app`} target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 7, textDecoration: "none" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: GREEN, boxShadow: `0 0 8px ${GREEN}` }}/>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{company.slug}.foundco.app</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontStyle: "italic" }}>
            Changes go live instantly
          </span>
        </div>
      </div>

      <div style={{ padding: "0 24px" }}>

        {/* ══ FIRST IMPRESSION ══ */}
        <PageSection
          number="01"
          title="First Impression"
          subtitle="The very first thing people read when they land on your site."
          onRegenerate={() => handleRegenerate("hero")}
          isRegenerating={regenerating === "hero"}
          accentColor={GREEN}
        >
          <EditableField
            label="Your main headline"
            hint="Short and punchy. What do you do?"
            field="hero_title"
            value={String(config.hero_title ?? "")}
            editing={editing} editValue={editValue} saved={saved}
            onEdit={startEdit} onSave={saveEdit}
            onCancel={() => setEditing(null)} onChange={setEditValue}
            multiline={false}
          />
          <EditableField
            label="Supporting line"
            hint="One or two sentences that back up your headline."
            field="hero_subtitle"
            value={String(config.hero_subtitle ?? "")}
            editing={editing} editValue={editValue} saved={saved}
            onEdit={startEdit} onSave={saveEdit}
            onCancel={() => setEditing(null)} onChange={setEditValue}
            multiline={true}
          />
          {/* Hero photo */}
          {photos.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>
                Main photo — the big image behind your headline
              </div>
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                {heroPhotos.map(p => (
                  <div key={p.id} style={{ position: "relative", flexShrink: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="" style={{ width: 80, height: 80, borderRadius: 12, objectFit: "cover", border: `2px solid ${GREEN}` }} />
                    <button onClick={() => handleAssignPhoto(p.id, null)} style={{
                      position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: "50%",
                      backgroundColor: "rgba(0,0,0,0.85)", border: "none", cursor: "pointer", color: "white", fontSize: 10,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>✕</button>
                  </div>
                ))}
                {unassigned.slice(0, 5).map(p => (
                  <button key={p.id} onClick={() => handleAssignPhoto(p.id, "hero")} style={{
                    flexShrink: 0, width: 80, height: 80, borderRadius: 12, padding: 0,
                    border: "2px dashed rgba(255,255,255,0.2)", overflow: "hidden",
                    cursor: "pointer", position: "relative", backgroundColor: "transparent",
                  }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.4 }} />
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 22 }}>+</div>
                  </button>
                ))}
                {photos.length === 0 && (
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", margin: 0, lineHeight: 1.6 }}>
                    Heart photos in the Photos tab to use them here.
                  </p>
                )}
              </div>
            </div>
          )}
        </PageSection>

        {/* ══ YOUR STORY ══ */}
        <PageSection
          number="02"
          title="Your Story"
          subtitle="Who you are and why you love what you do. People hire people — not businesses."
          onRegenerate={() => handleRegenerate("about")}
          isRegenerating={regenerating === "about"}
          accentColor="#A78BFA"
        >
          <EditableField
            label="About your business"
            hint="Be real. Talk to your customer like a neighbor."
            field="about_text"
            value={String(config.about_text ?? "")}
            editing={editing} editValue={editValue} saved={saved}
            onEdit={startEdit} onSave={saveEdit}
            onCancel={() => setEditing(null)} onChange={setEditValue}
            multiline={true}
          />
        </PageSection>

        {/* ══ WHAT YOU OFFER ══ */}
        <PageSection
          number="03"
          title="What You Offer"
          subtitle="The services you provide. Add everything — even things you forgot to mention during setup."
          onRegenerate={() => handleRegenerate("services")}
          isRegenerating={regenerating === "services"}
          accentColor="#FB923C"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {services.map((svc, i) => (
              <ServiceCard
                key={i}
                index={i}
                name={svc.name}
                description={svc.description}
                isEditing={editingService === i}
                onEdit={() => setEditingService(i)}
                onSave={saveService}
                onRemove={() => removeService(i)}
                onCancel={() => setEditingService(null)}
              />
            ))}

            {/* Add new service */}
            {newService ? (
              <div style={{
                borderRadius: 16, padding: 18,
                backgroundColor: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,150,50,0.3)",
              }}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 8, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  New Service
                </div>
                <input
                  placeholder="Service name"
                  value={newServiceName}
                  onChange={e => setNewServiceName(e.target.value)}
                  autoFocus
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: 10,
                    backgroundColor: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "white", fontSize: 14, outline: "none",
                    boxSizing: "border-box", marginBottom: 8, fontFamily: "inherit",
                  }}
                />
                <textarea
                  placeholder="Brief description (optional)"
                  value={newServiceDesc}
                  onChange={e => setNewServiceDesc(e.target.value)}
                  rows={2}
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: 10,
                    backgroundColor: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "white", fontSize: 14, outline: "none", resize: "none",
                    boxSizing: "border-box", marginBottom: 12, fontFamily: "inherit", lineHeight: 1.5,
                  }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { setNewService(false); setNewServiceName(""); setNewServiceDesc("") }} style={{
                    flex: 1, padding: "11px 0", borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent",
                    color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}>Cancel</button>
                  <button onClick={addService} disabled={!newServiceName.trim()} style={{
                    flex: 2, padding: "11px 0", borderRadius: 10, border: "none",
                    backgroundColor: newServiceName.trim() ? "#FB923C" : "rgba(255,255,255,0.08)",
                    color: newServiceName.trim() ? BLACK : "rgba(255,255,255,0.2)",
                    fontSize: 13, fontWeight: 700, cursor: newServiceName.trim() ? "pointer" : "default",
                  }}>Add Service</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setNewService(true)} style={{
                width: "100%", padding: "14px 0", borderRadius: 14,
                border: "2px dashed rgba(255,255,255,0.1)", backgroundColor: "transparent",
                color: "rgba(255,255,255,0.3)", fontSize: 13, fontWeight: 600,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add another service
              </button>
            )}
          </div>
        </PageSection>

        {/* ══ YOUR HOOK ══ */}
        <PageSection
          number="04"
          title="Your Hook"
          subtitle="A short phrase that sticks in people's heads. And the button that gets them to act."
          onRegenerate={() => handleRegenerate("tagline")}
          isRegenerating={regenerating === "tagline"}
          accentColor="#38BDF8"
        >
          <EditableField
            label="Your tagline"
            hint="3-6 words. Something memorable."
            field="tagline"
            value={String(config.tagline ?? "")}
            editing={editing} editValue={editValue} saved={saved}
            onEdit={startEdit} onSave={saveEdit}
            onCancel={() => setEditing(null)} onChange={setEditValue}
            multiline={false}
          />
          <EditableField
            label="Call to action button"
            hint="What do you want people to click?"
            field="cta_headline"
            value={String(config.cta_headline ?? "")}
            editing={editing} editValue={editValue} saved={saved}
            onEdit={startEdit} onSave={saveEdit}
            onCancel={() => setEditing(null)} onChange={setEditValue}
            multiline={false}
          />
        </PageSection>

        {/* ══ YOUR WORK ══ */}
        {photos.length > 0 && (
          <PageSection
            number="05"
            title="Your Work"
            subtitle="Photos that show what you do. Tap a photo to add it to your gallery. Tap again to remove it."
            onRegenerate={undefined}
            isRegenerating={false}
            accentColor="#34D399"
            showRegenerate={false}
          >
            {galleryPhotos.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#34D399", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
                  In your gallery
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
                  {galleryPhotos.map(p => (
                    <div key={p.id} style={{ position: "relative", borderRadius: 12, overflow: "hidden", aspectRatio: "1" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button onClick={() => handleAssignPhoto(p.id, null)} style={{
                        position: "absolute", inset: 0, width: "100%", height: "100%",
                        backgroundColor: "rgba(0,0,0,0)", border: "none", cursor: "pointer",
                      }}>
                        <div style={{
                          position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%",
                          backgroundColor: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center",
                          color: "white", fontSize: 10,
                        }}>✕</div>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {unassigned.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
                  Tap to add to gallery
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
                  {unassigned.map(p => (
                    <button key={p.id} onClick={() => handleAssignPhoto(p.id, "gallery")} style={{
                      padding: 0, border: "2px dashed rgba(255,255,255,0.15)", borderRadius: 12,
                      overflow: "hidden", aspectRatio: "1", cursor: "pointer", position: "relative", backgroundColor: "transparent",
                    }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.45 }} />
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 24, opacity: 0.7 }}>+</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </PageSection>
        )}

        {/* No photos prompt */}
        {photos.length === 0 && (
          <div style={{
            borderRadius: 20, padding: "24px 20px", marginTop: 4,
            border: "1px dashed rgba(255,255,255,0.08)",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>📸</div>
            <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 300, color: "white" }}>No photos yet</p>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.3)", lineHeight: 1.6 }}>
              Go to Photos, heart some of your work,<br/>and they'll appear here to add to your site.
            </p>
          </div>
        )}

      </div>
    </main>
  )
}

// ── Page Section ──
function PageSection({
  number, title, subtitle, children,
  onRegenerate, isRegenerating, accentColor,
  showRegenerate = true,
}: {
  number: string
  title: string
  subtitle: string
  children: React.ReactNode
  onRegenerate: (() => void) | undefined
  isRegenerating: boolean
  accentColor: string
  showRegenerate?: boolean
}) {
  return (
    <div style={{ paddingTop: 36, paddingBottom: 4 }}>
      {/* Section heading */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: accentColor, letterSpacing: "0.15em", opacity: 0.7 }}>
              {number}
            </span>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: "white", letterSpacing: "-0.02em" }}>
              {title}
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>
            {subtitle}
          </p>
        </div>
        {showRegenerate && onRegenerate && (
          <button
            onClick={onRegenerate}
            disabled={isRegenerating}
            style={{
              flexShrink: 0,
              display: "flex", alignItems: "center", gap: 5,
              padding: "8px 14px", borderRadius: 100, border: "none",
              backgroundColor: isRegenerating ? "rgba(255,255,255,0.05)" : `${accentColor}18`,
              color: isRegenerating ? "rgba(255,255,255,0.25)" : accentColor,
              fontSize: 12, fontWeight: 700, cursor: isRegenerating ? "default" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {isRegenerating ? (
              <>
                <div style={{
                  width: 10, height: 10, borderRadius: "50%",
                  border: `1.5px solid ${accentColor}33`,
                  borderTopColor: accentColor,
                  animation: "spin 0.7s linear infinite",
                }}/>
                Writing…
              </>
            ) : (
              <>✨ Rewrite</>
            )}
          </button>
        )}
      </div>

      {/* Accent line */}
      <div style={{ height: 1, backgroundColor: `${accentColor}18`, marginBottom: 20 }} />

      {children}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── Editable Field ──
function EditableField({
  label, hint, field, value, editing, editValue, saved,
  onEdit, onSave, onCancel, onChange, multiline,
}: {
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
}) {
  const isEditing = editing === field
  const isSaved = saved === field

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em" }}>
          {label}
        </span>
        {isSaved ? (
          <span style={{ fontSize: 11, color: GREEN, fontWeight: 700 }}>✓ Live</span>
        ) : !isEditing ? (
          <button onClick={() => onEdit(field, value)} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 12, color: "rgba(255,255,255,0.3)", padding: 0, fontWeight: 600,
          }}>
            Edit
          </button>
        ) : null}
      </div>

      {isEditing ? (
        <div>
          <p style={{ margin: "0 0 8px", fontSize: 12, color: "rgba(255,255,255,0.25)", fontStyle: "italic" }}>{hint}</p>
          {multiline ? (
            <textarea
              value={editValue}
              onChange={e => onChange(e.target.value)}
              autoFocus rows={4}
              style={{
                width: "100%", padding: "13px 16px", borderRadius: 14,
                backgroundColor: "rgba(255,255,255,0.07)",
                border: `1.5px solid ${GREEN}55`,
                color: "white", fontSize: 15, outline: "none", resize: "vertical",
                lineHeight: 1.6, boxSizing: "border-box", fontFamily: "inherit",
              }}
            />
          ) : (
            <input
              value={editValue}
              onChange={e => onChange(e.target.value)}
              autoFocus
              style={{
                width: "100%", padding: "13px 16px", borderRadius: 14,
                backgroundColor: "rgba(255,255,255,0.07)",
                border: `1.5px solid ${GREEN}55`,
                color: "white", fontSize: 15, outline: "none",
                boxSizing: "border-box",
              }}
            />
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={onCancel} style={{
              flex: 1, padding: "12px 0", borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent",
              color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>Cancel</button>
            <button onClick={() => onSave(field)} style={{
              flex: 2, padding: "12px 0", borderRadius: 12, border: "none",
              backgroundColor: GREEN, color: BLACK,
              fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>Save & Go Live</button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => onEdit(field, value)}
          style={{
            padding: "14px 16px", borderRadius: 14,
            backgroundColor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            cursor: "pointer",
          }}
        >
          <p style={{
            margin: 0, fontSize: 15,
            color: value ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.2)",
            lineHeight: 1.6, fontStyle: value ? "normal" : "italic",
          }}>
            {value || `Tap to add your ${label.toLowerCase()}…`}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Service Card ──
function ServiceCard({
  index, name, description, isEditing, onEdit, onSave, onRemove, onCancel,
}: {
  index: number
  name: string
  description: string
  isEditing: boolean
  onEdit: () => void
  onSave: (index: number, name: string, desc: string) => void
  onRemove: () => void
  onCancel: () => void
}) {
  const [editName, setEditName] = useState(name)
  const [editDesc, setEditDesc] = useState(description)

  if (isEditing) {
    return (
      <div style={{
        borderRadius: 16, padding: 16,
        backgroundColor: "rgba(255,150,50,0.06)",
        border: "1px solid rgba(255,150,50,0.25)",
      }}>
        <input
          value={editName}
          onChange={e => setEditName(e.target.value)}
          autoFocus
          placeholder="Service name"
          style={{
            width: "100%", padding: "10px 13px", borderRadius: 10,
            backgroundColor: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "white", fontSize: 14, outline: "none",
            boxSizing: "border-box", marginBottom: 8, fontFamily: "inherit",
          }}
        />
        <textarea
          value={editDesc}
          onChange={e => setEditDesc(e.target.value)}
          placeholder="Brief description"
          rows={2}
          style={{
            width: "100%", padding: "10px 13px", borderRadius: 10,
            backgroundColor: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "white", fontSize: 14, outline: "none", resize: "none",
            boxSizing: "border-box", marginBottom: 10, fontFamily: "inherit", lineHeight: 1.5,
          }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: "10px 0", borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent",
            color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={() => onSave(index, editName, editDesc)} style={{
            flex: 2, padding: "10px 0", borderRadius: 10, border: "none",
            backgroundColor: "#FB923C", color: BLACK,
            fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}>Save</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      borderRadius: 16, overflow: "hidden",
      backgroundColor: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.07)",
    }}>
      <div style={{ padding: "14px 16px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 4 }}>{name}</div>
        {description && (
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>{description}</div>
        )}
      </div>
      <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <button onClick={onEdit} style={{
          flex: 1, padding: "10px 0", border: "none", backgroundColor: "transparent",
          color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 600, cursor: "pointer",
          borderRight: "1px solid rgba(255,255,255,0.05)",
        }}>Edit</button>
        <button onClick={onRemove} style={{
          flex: 1, padding: "10px 0", border: "none", backgroundColor: "transparent",
          color: "rgba(255,80,80,0.6)", fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>Remove</button>
      </div>
    </div>
  )
}
