"use client"

import React, { useState, useTransition } from "react"
import { updateSiteField, regenerateSection, assignPhotoToSection, removeStockImage } from "./actions"
import { TYPE, TEXT_OPACITY, GREEN, BLACK } from "@/lib/dashboard/typography"

type Config = Record<string, unknown>
type Photo = { id: string; url: string; website_section: string | null }
type Section = "hero" | "about" | "services" | "tagline"
type Props = {
  company: { id: string; name: string; slug: string }
  config: Config | null
  photos: Photo[]
  stockImages: string[]
  mediaPhotos: { id: string; url: string }[]
}

export default function SiteEditor({ company, config: initialConfig, photos, stockImages: initialStockImages, mediaPhotos }: Props) {
  const [config, setConfig] = useState<Config>(initialConfig ?? {})
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [regenerating, setRegenerating] = useState<Section | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [editingService, setEditingService] = useState<number | null>(null)
  const [newService, setNewService] = useState(false)
  const [newServiceName, setNewServiceName] = useState("")
  const [newServiceDesc, setNewServiceDesc] = useState("")
  const [localPhotos, setLocalPhotos] = useState<Photo[]>(photos)
  const [stockImages, setStockImages] = useState<string[]>(initialStockImages)
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
    if (result.success && result.updates) setConfig(prev => ({ ...prev, ...result.updates }))
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
    // Optimistic update — move photo immediately in local state
    setLocalPhotos(prev => prev.map(p => p.id === photoId ? { ...p, website_section: section } : p))
    startTransition(async () => { await assignPhotoToSection(photoId, section) })
  }

  const heroPhotos = localPhotos.filter(p => p.website_section === "hero")
  const galleryPhotos = localPhotos.filter(p => p.website_section === "gallery")
  const unassigned = localPhotos.filter(p => !p.website_section)
  const services = (config.services as Array<{name:string;description:string}>) ?? []
  const heroImage = heroPhotos[0]?.url ?? (config.hero_image_url as string) ?? null

  return (
    <div style={{ backgroundColor: BLACK, minHeight: "100dvh", paddingBottom: "140px" }}>

      {/* ══════════════════════════════════════════
          HOME PAGE — full bleed hero preview
      ══════════════════════════════════════════ */}

      {/* Page tab */}
      <div style={{ padding: "28px 20px 0" }}>
        <PageTab label="Home Page" href={`https://${company.slug}.foundco.app`} isLive />
      </div>

      {/* Hero preview card — looks like their actual site */}
      <div style={{ margin: "16px 20px 0", borderRadius: 24, overflow: "hidden", position: "relative", minHeight: 220 }}>
        {/* Background */}
        {heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroImage} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(135deg, #1a2a1a 0%, #0d1a0d 50%, #080A09 100%)",
          }}/>
        )}
        {/* Gradient overlay like real site */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, rgba(8,10,9,0.3) 0%, rgba(8,10,9,0.7) 100%)",
        }}/>

        {/* Content */}
        <div style={{ position: "relative", padding: "28px 22px 24px" }}>
          <div style={{ marginBottom: 20 }}>
            {/* Headline */}
            <div
              onClick={() => startEdit("hero_title", String(config.hero_title ?? ""))}
              style={{ cursor: "pointer", marginBottom: 10 }}
            >
              <div style={{ ...TYPE.caption, color: `${GREEN}cc`, marginBottom: 5 }}>
                HEADLINE · tap to edit
              </div>
              <h2 style={{
                margin: 0, fontSize: 28, fontWeight: 300,
                color: config.hero_title ? "white" : "rgba(255,255,255,0.3)",
                letterSpacing: "-0.03em", lineHeight: 1.1,
              }}>
                {String(config.hero_title || "Your headline goes here")}
              </h2>
            </div>

            {/* Subtitle */}
            <div
              onClick={() => startEdit("hero_subtitle", String(config.hero_subtitle ?? ""))}
              style={{ cursor: "pointer" }}
            >
              <div style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, marginBottom: 5 }}>
                SUPPORTING LINE · tap to edit
              </div>
              <p style={{
                margin: 0, fontSize: 15,
                color: config.hero_subtitle ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)",
                lineHeight: 1.5,
              }}>
                {String(config.hero_subtitle || "Your supporting line goes here")}
              </p>
            </div>
          </div>

          {/* Hero action row */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => handleRegenerate("hero")}
              disabled={regenerating === "hero"}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 100,
                backgroundColor: regenerating === "hero" ? "rgba(255,255,255,0.08)" : `${GREEN}22`,
                border: `1px solid ${GREEN}44`,
                color: regenerating === "hero" ? "rgba(255,255,255,0.3)" : GREEN,
                fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}
            >
              {regenerating === "hero" ? <Spinner color={GREEN}/> : "✨"}
              {regenerating === "hero" ? "Writing…" : "AI Rewrite"}
            </button>

            {/* Hero photo swap */}
            {unassigned.length > 0 && (
              <div style={{ display: "flex", gap: 5 }}>
                {unassigned.slice(0, 3).map(p => (
                  <button key={p.id} onClick={() => handleAssignPhoto(p.id, "hero")} style={{
                    width: 32, height: 32, borderRadius: 8, padding: 0,
                    border: "2px dashed rgba(255,255,255,0.2)", overflow: "hidden",
                    cursor: "pointer", position: "relative", backgroundColor: "transparent",
                  }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }} />
                  </button>
                ))}
              </div>
            )}
            {heroImage && (
              <button onClick={() => handleAssignPhoto(heroPhotos[0]?.id ?? "", null)} style={{
                padding: "8px 14px", borderRadius: 100,
                backgroundColor: "rgba(255,70,70,0.15)", border: "1px solid rgba(255,70,70,0.2)",
                color: "rgba(255,100,100,0.7)", fontSize: 11, fontWeight: 700, cursor: "pointer",
              }}>Remove photo</button>
            )}
          </div>
        </div>
      </div>

      {/* Hook section — tagline + CTA */}
      <div style={{ margin: "12px 20px 0" }}>
        <div style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, marginBottom: 10, paddingLeft: 4 }}>
          Your Hook
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <TapToEdit
            label="Tagline"
            value={String(config.tagline ?? "")}
            placeholder="Your tagline…"
            onClick={() => startEdit("tagline", String(config.tagline ?? ""))}
            isSaved={saved === "tagline"}
            flex={3}
          />
          <TapToEdit
            label="Button"
            value={String(config.cta_headline ?? "")}
            placeholder="CTA…"
            onClick={() => startEdit("cta_headline", String(config.cta_headline ?? ""))}
            isSaved={saved === "cta_headline"}
            flex={2}
          />
        </div>
        <AIBar label="Rewrite your hook with AI" isLoading={regenerating === "tagline"} color="#38BDF8" onTap={() => handleRegenerate("tagline")} />
      </div>

      {/* Divider */}
      <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.05)", margin: "32px 0" }}/>

      {/* ══════════════════════════════════════════
          ABOUT PAGE
      ══════════════════════════════════════════ */}
      <div style={{ padding: "0 20px" }}>
        <PageTab label="About Page" href={`https://${company.slug}.foundco.app/about`} />
      </div>

      <div style={{ margin: "16px 20px 0" }}>
        {/* Story card — feels like reading the actual about page */}
        <div
          onClick={() => !editing && startEdit("about_text", String(config.about_text ?? ""))}
          style={{
            borderRadius: 20, padding: "22px 20px",
            background: "linear-gradient(160deg, rgba(167,139,250,0.1) 0%, rgba(167,139,250,0.03) 100%)",
            border: "1px solid rgba(167,139,250,0.15)",
            cursor: editing === "about_text" ? "default" : "pointer",
            position: "relative",
          }}
        >
          <div style={{ ...TYPE.caption, color: "#A78BFA", marginBottom: 12, opacity: 0.8 }}>
            Your Story · tap to edit
          </div>
          <p style={{
            margin: 0, fontSize: 16, fontWeight: 300,
            color: config.about_text ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.25)",
            lineHeight: 1.7, fontStyle: config.about_text ? "normal" : "italic",
          }}>
            {String(config.about_text || "Tap to write your story. Tell customers who you are and why you love what you do.")}
          </p>
          {saved === "about_text" && (
            <div style={{ position: "absolute", top: 14, right: 14, fontSize: 11, color: GREEN, fontWeight: 700, backgroundColor: `${GREEN}15`, padding: "3px 10px", borderRadius: 100 }}>✓ Live</div>
          )}
        </div>
        <AIBar label="Let AI write your story" isLoading={regenerating === "about"} color="#A78BFA" onTap={() => handleRegenerate("about")} />
      </div>

      <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.05)", margin: "32px 0" }}/>

      {/* ══════════════════════════════════════════
          SERVICES PAGE
      ══════════════════════════════════════════ */}
      <div style={{ padding: "0 20px" }}>
        <PageTab label="Services Page" href={`https://${company.slug}.foundco.app/services`} />

        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
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
            <div style={{ borderRadius: 20, padding: 20, background: "linear-gradient(135deg, rgba(251,146,60,0.1), rgba(251,146,60,0.03))", border: "1px solid rgba(251,146,60,0.25)" }}>
              <div style={{ ...TYPE.caption, color: "#FB923C", marginBottom: 14 }}>New Service</div>
              <input placeholder="Service name" value={newServiceName} onChange={e => setNewServiceName(e.target.value)} autoFocus
                style={{ width: "100%", padding: "12px 14px", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 10, fontFamily: "inherit" }}
              />
              <textarea placeholder="What's included? (optional)" value={newServiceDesc} onChange={e => setNewServiceDesc(e.target.value)} rows={2}
                style={{ width: "100%", padding: "12px 14px", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 14, outline: "none", resize: "none", boxSizing: "border-box", marginBottom: 14, fontFamily: "inherit", lineHeight: 1.5 }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setNewService(false); setNewServiceName(""); setNewServiceDesc("") }}
                  style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent", color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button onClick={addService} disabled={!newServiceName.trim()}
                  style={{ flex: 2, padding: "12px 0", borderRadius: 12, border: "none", backgroundColor: newServiceName.trim() ? "#FB923C" : "rgba(255,255,255,0.08)", color: newServiceName.trim() ? BLACK : "rgba(255,255,255,0.2)", fontSize: 13, fontWeight: 700, cursor: newServiceName.trim() ? "pointer" : "default" }}>Add Service</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setNewService(true)} style={{
              width: "100%", padding: "16px 0", borderRadius: 16,
              border: "2px dashed rgba(251,146,60,0.2)",
              backgroundColor: "transparent",
              color: "rgba(251,146,60,0.5)", fontSize: 13, fontWeight: 700,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add a service you forgot
            </button>
          )}

          <AIBar label="AI rewrites all service descriptions" isLoading={regenerating === "services"} color="#FB923C" onTap={() => handleRegenerate("services")} />
        </div>
      </div>

      <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.05)", margin: "32px 0" }}/>

      {/* ══════════════════════════════════════════
          GALLERY PAGE
      ══════════════════════════════════════════ */}
      <div style={{ padding: "0 20px" }}>
        <PageTab label="Gallery Page" href={`https://${company.slug}.foundco.app/gallery`} />

        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* ── Owner's real photos in gallery ── */}
          {galleryPhotos.length > 0 && (
            <div>
              <div style={{ ...TYPE.caption, color: "#34D399", marginBottom: 10 }}>
                Your photos · live on your gallery
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                {galleryPhotos.map(p => (
                  <div key={p.id} style={{ position: "relative", borderRadius: 14, overflow: "hidden", aspectRatio: "1" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button onClick={() => handleAssignPhoto(p.id, null)} style={{ position: "absolute", inset: 0, backgroundColor: "transparent", border: "none", cursor: "pointer" }}>
                      <div style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 10 }}>✕</div>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Add more from unassigned hearted photos ── */}
          {unassigned.length > 0 && (
            <div>
              <div style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, marginBottom: 10 }}>
                Add your photos to gallery
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                {unassigned.map(p => (
                  <button key={p.id} onClick={() => handleAssignPhoto(p.id, "gallery")} style={{ padding: 0, border: "2px dashed rgba(52,211,153,0.25)", borderRadius: 14, overflow: "hidden", aspectRatio: "1", cursor: "pointer", position: "relative", backgroundColor: "transparent" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.4 }} />
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 24, opacity: 0.6 }}>+</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── No owner photos yet ── */}
          {photos.length === 0 && (
            <div style={{ borderRadius: 20, padding: "28px 20px", textAlign: "center", border: "1px dashed rgba(52,211,153,0.15)", background: "rgba(52,211,153,0.03)" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📸</div>
              <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 300, color: "white" }}>No photos yet</p>
              <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.3)", lineHeight: 1.7 }}>
                Go to the Photos tab, take shots of your work,<br/>heart them, and they show up here.
              </p>
            </div>
          )}

          {/* ── Stock / placeholder photos ── */}
          {stockImages.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ ...TYPE.caption, color: "rgba(255,150,50,0.7)" }}>
                  Placeholder photos · tap ✕ to remove
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
                  {stockImages.length} stock
                </div>
              </div>
              <p style={{ margin: "0 0 12px", fontSize: 12, color: "rgba(255,255,255,0.25)", lineHeight: 1.6 }}>
                These show until you add your own photos. Remove the ones that don&apos;t fit your business.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                {stockImages.map((url, i) => (
                  <div key={i} style={{ position: "relative", borderRadius: 14, overflow: "hidden", aspectRatio: "1" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.5) 100%)" }}/>
                    <button
                      onClick={() => {
                        setStockImages(prev => prev.filter(u => u !== url))
                        startTransition(async () => { await removeStockImage(url) })
                      }}
                      style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.8)", border: "none", cursor: "pointer", color: "rgba(255,120,120,0.9)", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}
                    >✕</button>
                    <div style={{ position: "absolute", bottom: 5, left: 7, fontSize: 9, color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: "0.06em" }}>STOCK</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── EDIT SHEET — slides up from bottom ── */}
      {editing && (
        <>
          <div onClick={() => setEditing(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", zIndex: 40, backdropFilter: "blur(4px)" }}/>
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
            backgroundColor: "#111613",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "24px 24px 0 0",
            padding: "20px 20px 40px",
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", margin: "0 auto 20px" }}/>
            <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 12, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {{
                hero_title: "Headline",
                hero_subtitle: "Supporting Line",
                about_text: "Your Story",
                tagline: "Tagline",
                cta_headline: "Button Text",
              }[editing] ?? editing}
            </div>
            {["about_text", "hero_subtitle"].includes(editing) ? (
              <textarea
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                autoFocus rows={5}
                style={{ width: "100%", padding: "14px 16px", borderRadius: 16, backgroundColor: "rgba(255,255,255,0.07)", border: `1.5px solid ${GREEN}44`, color: "white", fontSize: 16, outline: "none", resize: "none", lineHeight: 1.6, boxSizing: "border-box", fontFamily: "inherit" }}
              />
            ) : (
              <input
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                autoFocus
                style={{ width: "100%", padding: "14px 16px", borderRadius: 16, backgroundColor: "rgba(255,255,255,0.07)", border: `1.5px solid ${GREEN}44`, color: "white", fontSize: 16, outline: "none", boxSizing: "border-box" }}
              />
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button onClick={() => setEditing(null)} style={{ flex: 1, padding: "14px 0", borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent", color: "rgba(255,255,255,0.4)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => saveEdit(editing)} style={{ flex: 2, padding: "14px 0", borderRadius: 14, border: "none", backgroundColor: GREEN, color: BLACK, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Save & Go Live</button>
            </div>
          </div>
        </>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── Page Tab ──
function PageTab({ label, href, isLive }: { label: string; href: string; isLive?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <h2 style={{ margin: 0, ...TYPE.title, color: "white" }}>
        {label}
      </h2>
      <a href={href} target="_blank" rel="noopener noreferrer" style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "7px 14px", borderRadius: 100,
        backgroundColor: isLive ? `${GREEN}18` : "rgba(255,255,255,0.06)",
        border: `1px solid ${isLive ? GREEN + "33" : "rgba(255,255,255,0.1)"}`,
        textDecoration: "none",
      }}>
        {isLive && <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: GREEN, boxShadow: `0 0 6px ${GREEN}` }}/>}
        <span style={{ fontSize: 11, fontWeight: 700, color: isLive ? GREEN : "rgba(255,255,255,0.4)", letterSpacing: "0.06em" }}>
          {isLive ? "Live" : "View"}
        </span>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={isLive ? GREEN : "rgba(255,255,255,0.3)"} strokeWidth="2.5" strokeLinecap="round">
          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
          <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
      </a>
    </div>
  )
}

// ── Tap To Edit pill ──
function TapToEdit({ label, value, placeholder, onClick, isSaved, flex }: {
  label: string; value: string; placeholder: string
  onClick: () => void; isSaved: boolean; flex: number
}) {
  return (
    <div onClick={onClick} style={{ flex, cursor: "pointer", borderRadius: 16, padding: "14px 16px", backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", position: "relative" }}>
      <div style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, marginBottom: 4 }}>{label}</div>
      <p style={{ margin: 0, fontSize: 14, color: value ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.2)", fontStyle: value ? "normal" : "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {value || placeholder}
      </p>
      {isSaved && <div style={{ position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: "50%", backgroundColor: GREEN, boxShadow: `0 0 6px ${GREEN}` }}/>}
    </div>
  )
}

// ── AI Bar ──
function AIBar({ label, isLoading, color, onTap }: { label: string; isLoading: boolean; color: string; onTap: () => void }) {
  return (
    <button onClick={onTap} disabled={isLoading} style={{
      width: "100%", marginTop: 10, padding: "13px 18px",
      borderRadius: 16, border: `1px solid ${color}22`,
      background: `linear-gradient(90deg, ${color}0f, transparent)`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      cursor: isLoading ? "default" : "pointer",
    }}>
      <span style={{ fontSize: 13, color: isLoading ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.55)", fontWeight: 500 }}>
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 100, backgroundColor: isLoading ? "rgba(255,255,255,0.05)" : `${color}18`, border: `1px solid ${color}33` }}>
        {isLoading ? <Spinner color={color}/> : <span style={{ fontSize: 13 }}>✨</span>}
        <span style={{ fontSize: 12, fontWeight: 700, color: isLoading ? "rgba(255,255,255,0.25)" : color }}>
          {isLoading ? "Writing…" : "Rewrite"}
        </span>
      </div>
    </button>
  )
}

// ── Spinner ──
function Spinner({ color }: { color: string }) {
  return (
    <div style={{ width: 12, height: 12, borderRadius: "50%", border: `2px solid ${color}33`, borderTopColor: color, animation: "spin 0.7s linear infinite" }}/>
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
      <div style={{ borderRadius: 20, padding: 18, background: "linear-gradient(135deg, rgba(251,146,60,0.1), rgba(251,146,60,0.02))", border: "1px solid rgba(251,146,60,0.3)" }}>
        <input value={editName} onChange={e => setEditName(e.target.value)} autoFocus placeholder="Service name"
          style={{ width: "100%", padding: "12px 14px", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 8, fontFamily: "inherit" }}
        />
        <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description" rows={2}
          style={{ width: "100%", padding: "12px 14px", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 14, outline: "none", resize: "none", boxSizing: "border-box", marginBottom: 12, fontFamily: "inherit", lineHeight: 1.5 }}
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
      <div style={{ padding: "16px 18px" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: description ? 5 : 0 }}>{name}</div>
        {description && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>{description}</div>}
      </div>
      <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <button onClick={onEdit} style={{ flex: 1, padding: "11px 0", border: "none", backgroundColor: "transparent", color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 600, cursor: "pointer", borderRight: "1px solid rgba(255,255,255,0.05)" }}>Edit</button>
        <button onClick={onRemove} style={{ flex: 1, padding: "11px 0", border: "none", backgroundColor: "transparent", color: "rgba(255,80,80,0.5)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Remove</button>
      </div>
    </div>
  )
}
