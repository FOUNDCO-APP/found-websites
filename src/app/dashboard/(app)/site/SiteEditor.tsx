"use client"

import React, { useState, useTransition } from "react"
import { updateSiteField, regenerateSection, assignPhotoToSection } from "./actions"

const GREEN = "#32D074"
const BLACK = "#080A09"

type Config = Record<string, unknown>
type Photo = { id: string; url: string; website_section: string | null }

type Props = {
  company: { id: string; name: string; slug: string }
  config: Config | null
  photos: Photo[]
}

type Section = "hero" | "about" | "services" | "tagline"

function SparkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"/>
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}

export default function SiteEditor({ company, config: initialConfig, photos }: Props) {
  const [config, setConfig] = useState<Config>(initialConfig ?? {})
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [regenerating, setRegenerating] = useState<Section | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
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
    setTimeout(() => setSaved(null), 2000)
    startTransition(async () => {
      await updateSiteField(field, value)
    })
  }

  async function handleRegenerate(section: Section) {
    setRegenerating(section)
    const result = await regenerateSection(section)
    if (result.success && result.updates) {
      setConfig(prev => ({ ...prev, ...result.updates }))
    }
    setRegenerating(null)
  }

  async function handleAssignPhoto(photoId: string, section: string | null) {
    startTransition(async () => {
      await assignPhotoToSection(photoId, section)
    })
  }

  const heroPhotos = photos.filter(p => p.website_section === "hero")
  const galleryPhotos = photos.filter(p => p.website_section === "gallery")
  const unassigned = photos.filter(p => !p.website_section)

  return (
    <main style={{ padding: "32px 24px 40px" }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 34, fontWeight: 200, color: "white", letterSpacing: "-0.04em" }}>
          My Site
        </h1>
        <a
          href={`https://${company.slug}.foundco.app`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 6, textDecoration: "none" }}
        >
          <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: GREEN, boxShadow: `0 0 6px ${GREEN}` }}/>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
            {company.slug}.foundco.app
          </span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </a>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>

        {/* ── HERO ── */}
        <SectionCard
          label="Hero"
          isRegenerating={regenerating === "hero"}
          onRegenerate={() => handleRegenerate("hero")}
        >
          <EditableField
            label="Headline"
            field="hero_title"
            value={String(config.hero_title ?? "")}
            editing={editing}
            editValue={editValue}
            saved={saved}
            onEdit={startEdit}
            onSave={saveEdit}
            onCancel={() => setEditing(null)}
            onChange={setEditValue}
            multiline={false}
          />
          <EditableField
            label="Subtitle"
            field="hero_subtitle"
            value={String(config.hero_subtitle ?? "")}
            editing={editing}
            editValue={editValue}
            saved={saved}
            onEdit={startEdit}
            onSave={saveEdit}
            onCancel={() => setEditing(null)}
            onChange={setEditValue}
            multiline={true}
          />

          {/* Hero photos */}
          <PhotoSlot
            label="Hero Photo"
            assigned={heroPhotos}
            unassigned={unassigned}
            section="hero"
            onAssign={handleAssignPhoto}
          />
        </SectionCard>

        {/* ── ABOUT ── */}
        <SectionCard
          label="About"
          isRegenerating={regenerating === "about"}
          onRegenerate={() => handleRegenerate("about")}
        >
          <EditableField
            label="About text"
            field="about_text"
            value={String(config.about_text ?? "")}
            editing={editing}
            editValue={editValue}
            saved={saved}
            onEdit={startEdit}
            onSave={saveEdit}
            onCancel={() => setEditing(null)}
            onChange={setEditValue}
            multiline={true}
          />
        </SectionCard>

        {/* ── TAGLINE & CTA ── */}
        <SectionCard
          label="Tagline & CTA"
          isRegenerating={regenerating === "tagline"}
          onRegenerate={() => handleRegenerate("tagline")}
        >
          <EditableField
            label="Tagline"
            field="tagline"
            value={String(config.tagline ?? "")}
            editing={editing}
            editValue={editValue}
            saved={saved}
            onEdit={startEdit}
            onSave={saveEdit}
            onCancel={() => setEditing(null)}
            onChange={setEditValue}
            multiline={false}
          />
          <EditableField
            label="CTA button"
            field="cta_headline"
            value={String(config.cta_headline ?? "")}
            editing={editing}
            editValue={editValue}
            saved={saved}
            onEdit={startEdit}
            onSave={saveEdit}
            onCancel={() => setEditing(null)}
            onChange={setEditValue}
            multiline={false}
          />
        </SectionCard>

        {/* ── SERVICES ── */}
        <SectionCard
          label="Services"
          isRegenerating={regenerating === "services"}
          onRegenerate={() => handleRegenerate("services")}
        >
          {Array.isArray(config.services) && config.services.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(config.services as Array<{name: string; description: string}>).map((svc, i) => (
                <div key={i} style={{
                  padding: "14px 16px", borderRadius: 12,
                  backgroundColor: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "white", marginBottom: 4 }}>
                    {svc.name}
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
                    {svc.description}
                  </div>
                </div>
              ))}
              <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
                Tap ✨ Rewrite to regenerate all service descriptions with AI
              </p>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.3)" }}>
              No services yet. Tap ✨ Rewrite to generate them.
            </p>
          )}
        </SectionCard>

        {/* ── GALLERY ── */}
        {photos.length > 0 && (
          <SectionCard label="Gallery Photos" onRegenerate={undefined} isRegenerating={false} showRegenerate={false}>
            {galleryPhotos.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: GREEN, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
                  In Gallery
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
                  {galleryPhotos.map(p => (
                    <div key={p.id} style={{ position: "relative", borderRadius: 10, overflow: "hidden", aspectRatio: "1" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button
                        onClick={() => handleAssignPhoto(p.id, null)}
                        style={{
                          position: "absolute", top: 4, right: 4,
                          width: 22, height: 22, borderRadius: "50%",
                          backgroundColor: "rgba(0,0,0,0.7)", border: "none",
                          cursor: "pointer", color: "white", fontSize: 10,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {unassigned.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
                  Tap to add to gallery
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
                  {unassigned.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleAssignPhoto(p.id, "gallery")}
                      style={{
                        padding: 0, border: "2px dashed rgba(255,255,255,0.15)",
                        borderRadius: 10, overflow: "hidden", aspectRatio: "1",
                        cursor: "pointer", position: "relative",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.5 }} />
                      <div style={{
                        position: "absolute", inset: 0, display: "flex",
                        alignItems: "center", justifyContent: "center",
                        fontSize: 18,
                      }}>+</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {photos.length === 0 && (
              <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.3)" }}>
                Heart photos in the Photos tab to use them here.
              </p>
            )}
          </SectionCard>
        )}

      </div>
    </main>
  )
}

// ── Section Card ──
function SectionCard({
  label, children, isRegenerating, onRegenerate, showRegenerate = true
}: {
  label: string
  children: React.ReactNode
  isRegenerating: boolean
  onRegenerate: (() => void) | undefined
  showRegenerate?: boolean
}) {
  return (
    <div style={{
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.07)",
      overflow: "hidden",
      marginBottom: 10,
    }}>
      {/* Section header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 18px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {label}
        </span>
        {showRegenerate && onRegenerate && (
          <button
            onClick={onRegenerate}
            disabled={isRegenerating}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "6px 12px", borderRadius: 100, border: "none",
              backgroundColor: isRegenerating ? "rgba(255,255,255,0.06)" : `${GREEN}18`,
              color: isRegenerating ? "rgba(255,255,255,0.3)" : GREEN,
              fontSize: 11, fontWeight: 700, cursor: isRegenerating ? "default" : "pointer",
              letterSpacing: "0.04em",
            }}
          >
            <SparkIcon />
            {isRegenerating ? "Writing…" : "Rewrite with AI"}
          </button>
        )}
      </div>
      <div style={{ padding: "16px 18px" }}>
        {children}
      </div>
    </div>
  )
}

// ── Editable Field ──
function EditableField({
  label, field, value, editing, editValue, saved,
  onEdit, onSave, onCancel, onChange, multiline,
}: {
  label: string
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
    <div style={{ marginBottom: 14 }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 6,
      }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {label}
        </span>
        {isSaved ? (
          <span style={{ fontSize: 11, color: GREEN, fontWeight: 700 }}>✓ Saved</span>
        ) : !isEditing ? (
          <button onClick={() => onEdit(field, value)} style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            background: "none", border: "none", cursor: "pointer",
            color: "rgba(255,255,255,0.35)", fontSize: 11, padding: 0,
          }}>
            <EditIcon /> Edit
          </button>
        ) : null}
      </div>

      {isEditing ? (
        <div>
          {multiline ? (
            <textarea
              value={editValue}
              onChange={e => onChange(e.target.value)}
              autoFocus
              rows={4}
              style={{
                width: "100%", padding: "12px 14px", borderRadius: 12,
                backgroundColor: "rgba(255,255,255,0.08)",
                border: `1px solid ${GREEN}44`,
                color: "white", fontSize: 14, outline: "none",
                resize: "vertical", lineHeight: 1.5,
                boxSizing: "border-box", fontFamily: "inherit",
              }}
            />
          ) : (
            <input
              value={editValue}
              onChange={e => onChange(e.target.value)}
              autoFocus
              style={{
                width: "100%", padding: "12px 14px", borderRadius: 12,
                backgroundColor: "rgba(255,255,255,0.08)",
                border: `1px solid ${GREEN}44`,
                color: "white", fontSize: 14, outline: "none",
                boxSizing: "border-box",
              }}
            />
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={onCancel} style={{
              flex: 1, padding: "10px 0", borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.1)",
              backgroundColor: "transparent", color: "rgba(255,255,255,0.4)",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>Cancel</button>
            <button onClick={() => onSave(field)} style={{
              flex: 2, padding: "10px 0", borderRadius: 10, border: "none",
              backgroundColor: GREEN, color: BLACK,
              fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>Save</button>
          </div>
        </div>
      ) : (
        <p style={{
          margin: 0, fontSize: 14, color: value ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)",
          lineHeight: 1.6,
        }}>
          {value || "Not set"}
        </p>
      )}
    </div>
  )
}

// ── Photo Slot ──
function PhotoSlot({
  label, assigned, unassigned, section, onAssign,
}: {
  label: string
  assigned: Photo[]
  unassigned: Photo[]
  section: string
  onAssign: (id: string, section: string | null) => void
}) {
  if (assigned.length === 0 && unassigned.length === 0) return null

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
        {assigned.map(p => (
          <div key={p.id} style={{ position: "relative", flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt="" style={{ width: 72, height: 72, borderRadius: 10, objectFit: "cover", border: `2px solid ${GREEN}` }} />
            <button onClick={() => onAssign(p.id, null)} style={{
              position: "absolute", top: -6, right: -6,
              width: 20, height: 20, borderRadius: "50%",
              backgroundColor: "rgba(0,0,0,0.8)", border: "none",
              cursor: "pointer", color: "white", fontSize: 9,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>✕</button>
          </div>
        ))}
        {unassigned.slice(0, 4).map(p => (
          <button key={p.id} onClick={() => onAssign(p.id, section)} style={{
            flexShrink: 0, width: 72, height: 72, borderRadius: 10, padding: 0,
            border: "2px dashed rgba(255,255,255,0.15)", overflow: "hidden",
            cursor: "pointer", position: "relative", backgroundColor: "transparent",
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.4 }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 20 }}>+</div>
          </button>
        ))}
      </div>
    </div>
  )
}
