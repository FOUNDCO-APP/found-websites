"use client"

import React, { useEffect, useState, useTransition } from "react"
import { updateSiteField, regenerateSection, assignPhotoToSection, clearHeroPhoto, removeStockImage, updatePrimaryIntent, updateMenuItems, uploadMenuItemPhoto } from "./actions"
import { TYPE, TEXT_OPACITY, GREEN, BLACK } from "@/lib/dashboard/typography"
import DomainConnector from "./DomainConnector"
import { polishMenuCategories, polishServices, polishWebsiteField } from "@/lib/copyPolish"

type Config = Record<string, unknown>
type Photo = { id: string; url: string; website_section: string | null }
type Section = "hero" | "about" | "services" | "tagline"
type Props = {
  company: { id: string; name: string; slug: string }
  config: Config | null
  photos: Photo[]
  stockImages: string[]
  mediaPhotos: { id: string; url: string }[]
  primaryIntent: string
  industryCategory: string
  activeAddons: string[]
  plan: string | null
  subscriptionStatus: string | null
}

export default function SiteEditor({ company, config: initialConfig, photos, stockImages: initialStockImages, mediaPhotos, primaryIntent: initialIntent, industryCategory, activeAddons, plan, subscriptionStatus }: Props) {
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
  const [showHeroPicker, setShowHeroPicker] = useState(false)
  const [stockImages, setStockImages] = useState<string[]>(initialStockImages)
  const [activeIntent, setActiveIntent] = useState(initialIntent)
  const [savingIntent, setSavingIntent] = useState(false)
  const [intentSaved, setIntentSaved] = useState(false)

  // Shared sellable item catalog. Food sees Menu; retail/shop sees Products.
  type MenuItemDraft = { name: string; price: string; description: string; photo_url: string }
  type MenuCatData = { category: string; items: { name: string; description: string; price: string | null; photo_url?: string | null }[] }
  const [menuCats, setMenuCats] = useState<MenuCatData[]>((initialConfig?.menu_items as MenuCatData[]) ?? [])
  const [editingMenuItem, setEditingMenuItem] = useState<{ catIdx: number; itemIdx: number | null } | null>(null)
  const [menuItemDraft, setMenuItemDraft] = useState<MenuItemDraft>({ name: '', price: '', description: '', photo_url: '' })
  const [uploadingMenuPhoto, setUploadingMenuPhoto] = useState(false)
  const [addingMenuCat, setAddingMenuCat] = useState(false)
  const [newMenuCatName, setNewMenuCatName] = useState('')
  const [editingMenuCatIdx, setEditingMenuCatIdx] = useState<number | null>(null)
  const [menuCatDraftName, setMenuCatDraftName] = useState('')
  const [menuSaved, setMenuSaved] = useState(false)
  const [menuSaving, setMenuSaving] = useState(false)
  const [menuError, setMenuError] = useState<string | null>(null)

  const [, startTransition] = useTransition()
  const sheetOpen = Boolean(editing || showHeroPicker || editingMenuItem || editingService !== null || newService || addingMenuCat || editingMenuCatIdx !== null)

  useEffect(() => {
    if (!sheetOpen) return

    const body = document.body
    const root = document.documentElement
    const previousBodyOverflow = body.style.overflow
    const previousBodyOverscroll = body.style.overscrollBehavior
    const previousRootOverflow = root.style.overflow
    const previousRootOverscroll = root.style.overscrollBehavior

    const updateVisualHeight = () => {
      root.style.setProperty("--found-visual-height", `${window.visualViewport?.height ?? window.innerHeight}px`)
    }

    updateVisualHeight()
    body.style.overflow = "hidden"
    body.style.overscrollBehavior = "none"
    root.style.overflow = "hidden"
    root.style.overscrollBehavior = "none"
    window.visualViewport?.addEventListener("resize", updateVisualHeight)
    window.visualViewport?.addEventListener("scroll", updateVisualHeight)

    return () => {
      body.style.overflow = previousBodyOverflow
      body.style.overscrollBehavior = previousBodyOverscroll
      root.style.overflow = previousRootOverflow
      root.style.overscrollBehavior = previousRootOverscroll
      root.style.removeProperty("--found-visual-height")
      window.visualViewport?.removeEventListener("resize", updateVisualHeight)
      window.visualViewport?.removeEventListener("scroll", updateVisualHeight)
    }
  }, [sheetOpen])
  const isFoodCatalog = industryCategory === "food" || industryCategory === "home_based_food"
  const isShopCatalog = industryCategory === "retail" || industryCategory === "makers_crafts" || activeAddons.includes("shopping_cart") || activeIntent === "shop"
  const showCatalog = isFoodCatalog || isShopCatalog
  const catalogCopy = isFoodCatalog
    ? {
        pageLabel: "Menu Page",
        href: `https://${company.slug}.foundco.app/menu`,
        savedLabel: "Saved",
        addCategoryLabel: "Add a menu category",
        categoryPlaceholder: "e.g. Tacos, Plates, Drinks...",
        addItemLabel: "Add menu item",
        sheetAddLabel: "Add Menu Item",
        sheetEditLabel: "Edit Menu Item",
        itemPlaceholder: "Menu item name *",
        descriptionPlaceholder: "Description (optional) - ingredients, allergens, what makes it special...",
        saveLabel: "Save to Menu",
      }
    : {
        pageLabel: "Products",
        href: `https://${company.slug}.foundco.app/shop`,
        savedLabel: "Saved",
        addCategoryLabel: "Add a product category",
        categoryPlaceholder: "e.g. Shirts, Hats, Featured...",
        addItemLabel: "Add product",
        sheetAddLabel: "Add Product",
        sheetEditLabel: "Edit Product",
        itemPlaceholder: "Product name *",
        descriptionPlaceholder: "Description (optional) - size, material, pickup, shipping, or what makes it special...",
        saveLabel: "Save Product",
      }

  function startEdit(field: string, value: string) {
    setEditing(field)
    setEditValue(value)
  }

  async function saveEdit(field: string) {
    const value = editValue.trim()
    if (!value) return
    const polishedValue = polishWebsiteField(field, value)
    setConfig(prev => ({ ...prev, [field]: polishedValue }))
    setEditing(null)
    setSaved(field)
    setTimeout(() => setSaved(null), 2500)
    startTransition(async () => { await updateSiteField(field, polishedValue) })
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
    const polishedServices = polishServices(services)
    setConfig(prev => ({ ...prev, services: polishedServices }))
    setEditingService(null)
    startTransition(async () => { await updateSiteField("services", polishedServices) })
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
    const polishedServices = polishServices(services)
    setConfig(prev => ({ ...prev, services: polishedServices }))
    setNewService(false)
    setNewServiceName("")
    setNewServiceDesc("")
    startTransition(async () => { await updateSiteField("services", polishedServices) })
  }

  async function saveIntent(intent: string) {
    if (intent === activeIntent) return
    setActiveIntent(intent)
    setSavingIntent(true)
    await updatePrimaryIntent(intent)
    setSavingIntent(false)
    setIntentSaved(true)
    setTimeout(() => setIntentSaved(false), 2500)
  }

  async function persistMenuCats(cats: MenuCatData[]) {
    const previousCats = menuCats
    const polishedCats = polishMenuCategories(cats)
    setMenuError(null)
    setMenuSaving(true)
    setMenuCats(polishedCats)
    const result = await updateMenuItems(polishedCats)
    setMenuSaving(false)
    if ("error" in result) {
      setMenuCats(previousCats)
      setMenuError(result.error || "Menu could not be saved. Try again.")
      return false
    }
    setMenuSaved(true)
    setTimeout(() => setMenuSaved(false), 2500)
    return true
  }

  function openEditMenuItem(catIdx: number, itemIdx: number | null) {
    const item = itemIdx !== null ? menuCats[catIdx]?.items[itemIdx] : null
    setMenuError(null)
    setMenuItemDraft({ name: item?.name ?? '', price: item?.price ?? '', description: item?.description ?? '', photo_url: item?.photo_url ?? '' })
    setEditingMenuItem({ catIdx, itemIdx })
  }

  async function saveMenuItem() {
    if (!editingMenuItem || menuSaving) return
    const { catIdx, itemIdx } = editingMenuItem
    const newItem = { name: menuItemDraft.name.trim(), description: menuItemDraft.description.trim(), price: menuItemDraft.price.trim() || null, photo_url: menuItemDraft.photo_url || null }
    if (!newItem.name) return
    const cats = menuCats.map((c, ci) => {
      if (ci !== catIdx) return c
      const items = [...c.items]
      if (itemIdx === null) items.push(newItem)
      else items[itemIdx] = newItem
      return { ...c, items }
    })
    const ok = await persistMenuCats(cats)
    if (ok) setEditingMenuItem(null)
  }

  async function removeMenuItem(catIdx: number, itemIdx: number) {
    if (menuSaving) return
    const cats = menuCats.map((c, ci) => {
      if (ci !== catIdx) return c
      const items = [...c.items]; items.splice(itemIdx, 1)
      return { ...c, items }
    })
    const ok = await persistMenuCats(cats)
    if (ok) setEditingMenuItem(null)
  }
  async function handleMenuPhotoUpload(file: File) {
    setUploadingMenuPhoto(true)
    const fd = new FormData(); fd.append('file', file)
    const result = await uploadMenuItemPhoto(fd)
    setUploadingMenuPhoto(false)
    if ('url' in result) setMenuItemDraft(prev => ({ ...prev, photo_url: result.url }))
  }

  async function addMenuCategory() {
    if (!newMenuCatName.trim() || menuSaving) return
    const cats = [...menuCats, { category: newMenuCatName.trim(), items: [] }]
    const ok = await persistMenuCats(cats)
    if (ok) { setNewMenuCatName(''); setAddingMenuCat(false) }
  }

  async function removeMenuCategory(catIdx: number) {
    if (menuSaving) return
    const cats = [...menuCats]; cats.splice(catIdx, 1)
    await persistMenuCats(cats)
  }

  async function saveMenuCatName(catIdx: number) {
    if (menuSaving) return
    const name = menuCatDraftName.trim()
    if (!name) { setEditingMenuCatIdx(null); return }
    const cats = menuCats.map((c, ci) => ci === catIdx ? { ...c, category: name } : c)
    const ok = await persistMenuCats(cats)
    if (ok) setEditingMenuCatIdx(null)
  }
  function handleAssignPhoto(photoId: string, section: string | null) {
    const photo = localPhotos.find(p => p.id === photoId)
    setLocalPhotos(prev => prev.map(p => ({ ...p, website_section: p.id === photoId ? section : section === "hero" && p.website_section === "hero" ? null : p.website_section })))
    if (section === "hero" && photo) {
      const current = Array.isArray(config.hero_images) ? (config.hero_images as string[]) : []
      const heroImages = [photo.url, ...current.filter(url => url !== photo.url)]
      setConfig(prev => ({ ...prev, hero_image_url: photo.url, hero_images: heroImages }))
      setShowHeroPicker(false)
    }
    startTransition(async () => { await assignPhotoToSection(photoId, section) })
  }

  function handleClearHeroPhoto() {
    setLocalPhotos(prev => prev.map(p => p.website_section === "hero" ? { ...p, website_section: null } : p))
    setConfig(prev => ({ ...prev, hero_image_url: null, hero_images: [] }))
    setShowHeroPicker(false)
    startTransition(async () => { await clearHeroPhoto() })
  }

  const heroPhotos = localPhotos.filter(p => p.website_section === "hero")
  const galleryPhotos = localPhotos.filter(p => p.website_section === "gallery")
  const unassigned = localPhotos.filter(p => !p.website_section)
  const heroPickerPhotos = localPhotos
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

          {/* Hero actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              onClick={() => handleRegenerate("hero")}
              disabled={regenerating === "hero"}
              style={{
                alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 100,
                backgroundColor: regenerating === "hero" ? "rgba(255,255,255,0.08)" : `${GREEN}22`,
                border: `1px solid ${GREEN}44`,
                color: regenerating === "hero" ? "rgba(255,255,255,0.3)" : GREEN,
                fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}
            >
              {regenerating === "hero" && <Spinner color={GREEN}/>}
              {regenerating === "hero" ? "Writing..." : "AI Rewrite"}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 18, backgroundColor: "rgba(8,10,9,0.62)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}>
              <div style={{ width: 58, height: 58, borderRadius: 14, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }}>
                {heroImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={heroImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 800 }}>None</div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...TYPE.caption, color: `${GREEN}cc`, marginBottom: 3 }}>Header Photo</div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.35, color: "rgba(255,255,255,0.72)" }}>
                  {heroImage ? "This is the photo customers see first." : "Use one of your photos for the top of the site."}
                </p>
              </div>
              <button onClick={() => setShowHeroPicker(true)} style={{ padding: "10px 14px", borderRadius: 100, border: `1px solid ${GREEN}44`, backgroundColor: `${GREEN}20`, color: GREEN, fontSize: 12, fontWeight: 800, cursor: "pointer", flexShrink: 0 }}>
                Change
              </button>
            </div>
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
        <AIBar label="Rewrite your hook with AI" isLoading={regenerating === "tagline"} color={GREEN} onTap={() => handleRegenerate("tagline")} />
      </div>

      {/* ══════════════════════════════════════════
          PRIMARY CTA PICKER
      ══════════════════════════════════════════ */}
      {(() => {
        const ctaOptions: { intent: string; label: string; desc: string }[] | null = industryCategory === 'food'
          ? [
              { intent: 'reserve', label: 'Reserve a Table', desc: 'Lets guests request a reservation' },
              { intent: 'menu',    label: 'View Our Menu',   desc: 'Takes visitors straight to your menu' },
              { intent: 'call',    label: 'Call Us',         desc: 'Dials your number directly' },
              { intent: 'visit',   label: 'Visit Us',        desc: 'Shows your address & hours' },
            ]
          : industryCategory === 'wellness' || industryCategory === 'beauty' || industryCategory === 'fitness' || industryCategory === 'healthcare' || industryCategory === 'pet'
          ? [
              { intent: 'book',    label: 'Book Now',        desc: 'Sends booking requests to your inbox' },
              { intent: 'call',    label: 'Call Us',         desc: 'Dials your number directly' },
              { intent: 'contact', label: 'Contact Us',      desc: 'General contact form' },
            ]
          : null

        if (!ctaOptions) return null

        return (
          <>
            <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.05)", margin: "32px 0" }}/>
            <div style={{ padding: "0 20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <h2 style={{ margin: 0, ...TYPE.title, color: "white" }}>Main Button</h2>
                  <p style={{ margin: "4px 0 0", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
                    What do you want visitors to do first?
                  </p>
                </div>
                {intentSaved && (
                  <div style={{ fontSize: 11, color: GREEN, fontWeight: 700, backgroundColor: `${GREEN}15`, padding: "4px 12px", borderRadius: 100 }}>
                    ✓ Live
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ctaOptions.map(opt => {
                  const isActive = activeIntent === opt.intent
                  return (
                    <button
                      key={opt.intent}
                      onClick={() => saveIntent(opt.intent)}
                      disabled={savingIntent}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "14px 18px", borderRadius: 16, cursor: savingIntent ? "default" : "pointer",
                        backgroundColor: isActive ? `${GREEN}18` : "rgba(255,255,255,0.03)",
                        border: `1.5px solid ${isActive ? GREEN + "55" : "rgba(255,255,255,0.07)"}`,
                        textAlign: "left",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: isActive ? GREEN : "rgba(255,255,255,0.8)", marginBottom: 2 }}>
                          {opt.label}
                        </div>
                        <div style={{ fontSize: 12, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
                          {opt.desc}
                        </div>
                      </div>
                      {isActive && (
                        <div style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: GREEN, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={BLACK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )
      })()}

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
            background: "linear-gradient(160deg, rgba(50,208,116,0.07) 0%, rgba(50,208,116,0.02) 100%)",
            border: `1px solid ${GREEN}22`,
            cursor: editing === "about_text" ? "default" : "pointer",
            position: "relative",
          }}
        >
          <div style={{ ...TYPE.caption, color: GREEN, marginBottom: 12 }}>
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
        <AIBar label="Let AI write your story" isLoading={regenerating === "about"} color={GREEN} onTap={() => handleRegenerate("about")} />
      </div>

      <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.05)", margin: "32px 0" }}/>

      {/* ══════════════════════════════════════════
          MENU PAGE (food) / SERVICES PAGE (everyone else)
      ══════════════════════════════════════════ */}
      {showCatalog && (
      <div style={{ padding: "0 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <PageTab label={catalogCopy.pageLabel} href={catalogCopy.href} />
          {menuSaved && <div style={{ fontSize: 11, color: GREEN, fontWeight: 700, backgroundColor: `${GREEN}15`, padding: "4px 12px", borderRadius: 100 }}>{catalogCopy.savedLabel}</div>}
        </div>

        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {menuCats.map((cat, catIdx) => (
            <div key={catIdx} style={{ borderRadius: 20, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)", backgroundColor: "rgba(255,255,255,0.03)" }}>
              {/* Category header */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 16px", borderBottom: cat.items.length > 0 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                <div style={{ flex: 1 }}>
                  {editingMenuCatIdx === catIdx ? (
                    <input
                      value={menuCatDraftName}
                      onChange={e => setMenuCatDraftName(e.target.value)}
                      onBlur={() => saveMenuCatName(catIdx)}
                      onKeyDown={e => e.key === 'Enter' && saveMenuCatName(catIdx)}
                      autoFocus
                      style={{ background: "none", border: "none", outline: "none", color: "white", fontSize: 14, fontWeight: 700, width: "100%", fontFamily: "inherit" }}
                    />
                  ) : (
                    <button onClick={() => { setMenuCatDraftName(cat.category); setEditingMenuCatIdx(catIdx) }}
                      style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 14, fontWeight: 700, color: "white", letterSpacing: "0.08em", textTransform: "uppercase" as const, textAlign: "left" as const }}>
                      {cat.category}
                    </button>
                  )}
                </div>
                <button onClick={() => removeMenuCategory(catIdx)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,80,80,0.5)", fontSize: 11, fontWeight: 700, padding: "4px 8px" }}>
                  Remove
                </button>
              </div>

              {/* Items */}
              {cat.items.map((item, itemIdx) => (
                <div key={itemIdx} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  {item.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.photo_url} alt={item.name} style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.05)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "white", marginBottom: 1 }}>{item.name}</div>
                    {item.description && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.description}</div>}
                  </div>
                  {item.price && <div style={{ fontSize: 13, fontWeight: 700, color: GREEN, flexShrink: 0 }}>{item.price}</div>}
                  <button onClick={() => openEditMenuItem(catIdx, itemIdx)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: 700, padding: "4px 6px", flexShrink: 0 }}>
                    Edit
                  </button>
                </div>
              ))}

              {/* {catalogCopy.addItemLabel} row */}
              <button onClick={() => openEditMenuItem(catIdx, null)}
                style={{ width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" as const, fontSize: 13, color: `${GREEN}88`, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                {catalogCopy.addItemLabel}
              </button>
            </div>
          ))}

          {/* Add category */}
          {addingMenuCat ? (
            <div style={{ borderRadius: 16, padding: 16, border: `1px solid ${GREEN}33`, backgroundColor: `${GREEN}08` }}>
              <div style={{ ...TYPE.caption, color: GREEN, marginBottom: 10 }}>Category Name</div>
              <input
                placeholder={catalogCopy.categoryPlaceholder}
                value={newMenuCatName}
                onChange={e => setNewMenuCatName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addMenuCategory()}
                autoFocus
                style={{ width: "100%", padding: "12px 14px", borderRadius: 10, backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 15, outline: "none", boxSizing: "border-box" as const, marginBottom: 10, fontFamily: "inherit" }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setAddingMenuCat(false); setNewMenuCatName('') }}
                  style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent", color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button onClick={addMenuCategory} disabled={!newMenuCatName.trim()}
                  style={{ flex: 2, padding: "11px 0", borderRadius: 10, border: "none", backgroundColor: newMenuCatName.trim() ? GREEN : "rgba(255,255,255,0.06)", color: newMenuCatName.trim() ? BLACK : "rgba(255,255,255,0.2)", fontSize: 13, fontWeight: 700, cursor: newMenuCatName.trim() ? "pointer" : "default" }}>
                  Add Category
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingMenuCat(true)} style={{
              width: "100%", padding: "16px 0", borderRadius: 16,
              border: `2px dashed ${GREEN}33`, backgroundColor: "transparent",
              color: `${GREEN}88`, fontSize: 13, fontWeight: 700,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              {catalogCopy.addCategoryLabel}
            </button>
          )}
        </div>
      </div>
      )}

      {showCatalog && !isFoodCatalog && <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.05)", margin: "32px 0" }}/>}

      {!isFoodCatalog && (
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
            <div style={{ borderRadius: 20, padding: 20, background: `linear-gradient(135deg, ${GREEN}0a, ${GREEN}03)`, border: `1px solid ${GREEN}22` }}>
              <div style={{ ...TYPE.caption, color: GREEN, marginBottom: 14 }}>New Service</div>
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
                  style={{ flex: 2, padding: "12px 0", borderRadius: 12, border: "none", backgroundColor: newServiceName.trim() ? GREEN : "rgba(255,255,255,0.08)", color: newServiceName.trim() ? BLACK : "rgba(255,255,255,0.2)", fontSize: 13, fontWeight: 700, cursor: newServiceName.trim() ? "pointer" : "default" }}>Add Service</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setNewService(true)} style={{
              width: "100%", padding: "16px 0", borderRadius: 16,
              border: `2px dashed ${GREEN}33`,
              backgroundColor: "transparent",
              color: `${GREEN}88`, fontSize: 13, fontWeight: 700,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add a service you forgot
            </button>
          )}

          <AIBar label="AI rewrites all service descriptions" isLoading={regenerating === "services"} color={GREEN} onTap={() => handleRegenerate("services")} />
        </div>
      </div>
      )}

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
            <div style={{ borderRadius: 20, padding: "28px 20px", textAlign: "center", border: `1px dashed ${GREEN}22`, background: `${GREEN}05` }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={`${GREEN}66`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
              <p style={{ margin: "0 0 6px", fontSize: "1.0625rem", fontWeight: 300, color: "white" }}>No photos yet</p>
              <p style={{ margin: 0, ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})`, lineHeight: 1.7 }}>
                Go to the Photos tab, take shots of your work,<br/>heart them, and they show up here.
              </p>
            </div>
          )}

          {/* ── Stock / placeholder photos ── */}
          {stockImages.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
                  Placeholder photos · tap ✕ to remove
                </div>
                <div style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>
                  {stockImages.length} stock
                </div>
              </div>
              <p style={{ margin: "0 0 12px", ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})`, lineHeight: 1.6 }}>
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

      {/* -- CATALOG ITEM EDIT SHEET -- */}
      {editingMenuItem !== null && (
        <>
          <div onClick={() => setEditingMenuItem(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", zIndex: 40, backdropFilter: "blur(4px)" }}/>
          <div style={{ position: "fixed", left: 12, right: 12, bottom: "calc(84px + env(safe-area-inset-bottom))", zIndex: 50, maxHeight: "min(78dvh, 620px)", minHeight: "52dvh", overflowY: "auto" as const, backgroundColor: "#111613", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 28, padding: "22px 20px 24px", boxShadow: "0 -28px 80px rgba(0,0,0,0.55)" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", margin: "0 auto 18px" }}/>
            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
              {editingMenuItem.itemIdx === null ? catalogCopy.sheetAddLabel : catalogCopy.sheetEditLabel}
            </div>

            {/* Photo + name/price row */}
            <div style={{ display: "flex", gap: 14, marginBottom: 12 }}>
              <label style={{ cursor: "pointer", flexShrink: 0 }}>
                <input type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && handleMenuPhotoUpload(e.target.files[0])} />
                <div style={{ width: 72, height: 72, borderRadius: 14, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.07)", border: `1.5px dashed ${GREEN}44`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                  {uploadingMenuPhoto ? (
                    <Spinner color={GREEN} />
                  ) : menuItemDraft.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={menuItemDraft.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ textAlign: "center" as const }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={`${GREEN}66`} strokeWidth="1.5" strokeLinecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                      <div style={{ fontSize: 9, color: `${GREEN}66`, fontWeight: 700, marginTop: 3 }}>ADD PHOTO</div>
                    </div>
                  )}
                </div>
              </label>
              <div style={{ flex: 1, display: "flex", flexDirection: "column" as const, gap: 8 }}>
                <input
                  placeholder={catalogCopy.itemPlaceholder}
                  value={menuItemDraft.name}
                  onChange={e => setMenuItemDraft(prev => ({ ...prev, name: e.target.value }))}
                  style={{ padding: "11px 14px", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.07)", border: `1.5px solid ${GREEN}33`, color: "white", fontSize: 15, outline: "none", fontFamily: "inherit" }}
                />
                <input
                  placeholder="Price (e.g. $12.99)"
                  value={menuItemDraft.price}
                  onChange={e => setMenuItemDraft(prev => ({ ...prev, price: e.target.value }))}
                  style={{ padding: "11px 14px", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 14, outline: "none", fontFamily: "inherit" }}
                />
              </div>
            </div>

            <textarea
              placeholder={catalogCopy.descriptionPlaceholder}
              value={menuItemDraft.description}
              onChange={e => setMenuItemDraft(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              style={{ width: "100%", padding: "12px 14px", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 14, outline: "none", resize: "none" as const, boxSizing: "border-box" as const, marginBottom: 14, fontFamily: "inherit", lineHeight: 1.5 }}
            />

            {menuError && (
              <p style={{ margin: "0 0 12px", padding: "11px 12px", borderRadius: 12, backgroundColor: "rgba(255,69,58,0.12)", border: "1px solid rgba(255,69,58,0.28)", color: "#FF453A", fontSize: 13, fontWeight: 700, lineHeight: 1.35 }}>{menuError}</p>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              {editingMenuItem.itemIdx !== null && (
                <button
                  onClick={() => void removeMenuItem(editingMenuItem.catIdx, editingMenuItem.itemIdx!)}
                  disabled={menuSaving}
                  style={{ padding: "13px 16px", borderRadius: 12, border: "1px solid rgba(255,70,70,0.2)", backgroundColor: "rgba(255,70,70,0.1)", color: "rgba(255,100,100,0.8)", fontSize: 13, fontWeight: 700, cursor: menuSaving ? "default" : "pointer", opacity: menuSaving ? 0.5 : 1 }}>
                  Remove
                </button>
              )}
              <button onClick={() => setEditingMenuItem(null)} disabled={menuSaving}
                style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent", color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 600, cursor: menuSaving ? "default" : "pointer", opacity: menuSaving ? 0.5 : 1 }}>
                Cancel
              </button>
              <button onClick={() => void saveMenuItem()} disabled={!menuItemDraft.name.trim() || menuSaving}
                style={{ flex: 2, padding: "13px 0", borderRadius: 12, border: "none", backgroundColor: menuItemDraft.name.trim() && !menuSaving ? GREEN : "rgba(255,255,255,0.08)", color: menuItemDraft.name.trim() && !menuSaving ? BLACK : "rgba(255,255,255,0.2)", fontSize: 13, fontWeight: 700, cursor: menuItemDraft.name.trim() && !menuSaving ? "pointer" : "default" }}>
                {menuSaving ? "Saving..." : catalogCopy.saveLabel}
              </button>
            </div>
          </div>
        </>
      )}

      {showHeroPicker && (
        <>
          <div onClick={() => setShowHeroPicker(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.72)", zIndex: 60, backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}/>
          <div style={{
            position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 70,
            maxHeight: "min(78dvh, 680px)", overflowY: "auto",
            backgroundColor: "#111613", borderTop: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "26px 26px 0 0", padding: "18px 20px calc(env(safe-area-inset-bottom, 0px) + 26px)",
            boxShadow: "0 -24px 70px rgba(0,0,0,0.45)",
          }}>
            <div style={{ width: 38, height: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.16)", margin: "0 auto 20px" }}/>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
              <div>
                <div style={{ ...TYPE.caption, color: `${GREEN}cc`, marginBottom: 6 }}>Header Photo</div>
                <h3 style={{ margin: 0, ...TYPE.title, color: "white" }}>Choose the first image customers see.</h3>
              </div>
              <button onClick={() => setShowHeroPicker(false)} style={{ width: 38, height: 38, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", fontSize: 20, fontWeight: 500, cursor: "pointer" }}>x</button>
            </div>

            {heroPickerPhotos.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                {heroPickerPhotos.map(photo => {
                  const selected = photo.url === heroImage || photo.website_section === "hero"
                  return (
                    <button key={photo.id} onClick={() => handleAssignPhoto(photo.id, "hero")} style={{ padding: 0, border: selected ? `2px solid ${GREEN}` : "1px solid rgba(255,255,255,0.1)", borderRadius: 18, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.05)", cursor: "pointer", textAlign: "left", boxShadow: selected ? `0 0 0 4px ${GREEN}22` : "none" }}>
                      <div style={{ position: "relative", aspectRatio: "4 / 3", backgroundColor: "rgba(255,255,255,0.04)" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        {selected && (
                          <div style={{ position: "absolute", right: 10, top: 10, padding: "6px 9px", borderRadius: 999, backgroundColor: GREEN, color: BLACK, fontSize: 11, fontWeight: 900 }}>
                            Selected
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div style={{ padding: 20, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <p style={{ margin: "0 0 6px", ...TYPE.headline, color: "white" }}>No website photos yet.</p>
                <p style={{ margin: 0, ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>Add photos from the Photos tab, then heart the ones you want available for your site.</p>
              </div>
            )}

            {heroImage && (
              <button onClick={handleClearHeroPhoto} style={{ width: "100%", marginTop: 14, padding: "14px 0", borderRadius: 16, border: "1px solid rgba(255,80,80,0.24)", backgroundColor: "rgba(255,80,80,0.12)", color: "rgba(255,120,120,0.9)", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
                Remove Header Photo
              </button>
            )}
          </div>
        </>
      )}
      {/* ── EDIT SHEET — focused full-screen editor ── */}
      {editing && (
        <div style={{ position: "fixed", inset: 0, zIndex: 90, backgroundColor: "#111613", display: "flex", flexDirection: "column", overflow: "hidden", overscrollBehavior: "none" }}>
          <div style={{ flexShrink: 0, padding: "calc(env(safe-area-inset-top, 0px) + 12px) 18px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(17,22,19,0.98)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "72px 1fr 72px", alignItems: "center", gap: 8 }}>
              <button onClick={() => setEditing(null)} style={{ justifySelf: "start", padding: "10px 0", border: "none", background: "transparent", color: "rgba(255,255,255,0.72)", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>Close</button>
              <div style={{ textAlign: "center", fontSize: 12, fontWeight: 900, color: "rgba(255,255,255,0.58)", letterSpacing: "0.09em", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {{
                  hero_title: "Headline",
                  hero_subtitle: "Supporting Line",
                  about_text: "Your Story",
                  tagline: "Tagline",
                  cta_headline: "Button Text",
                }[editing] ?? editing}
              </div>
              <button onClick={() => saveEdit(editing)} style={{ justifySelf: "end", padding: "10px 0", border: "none", background: "transparent", color: GREEN, fontSize: 15, fontWeight: 900, cursor: "pointer" }}>Save</button>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflow: "hidden", overscrollBehavior: "none", padding: "22px 20px calc(env(safe-area-inset-bottom, 0px) + 22px)", display: "flex", flexDirection: "column" }}>
            {[
              "about_text",
              "hero_subtitle",
            ].includes(editing) ? (
              <textarea
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                autoFocus rows={6}
                style={{ width: "100%", height: editing === "about_text" ? "min(42dvh, 320px)" : 190, maxHeight: "42dvh", overflowY: "auto", padding: "16px 18px", borderRadius: 18, backgroundColor: "rgba(255,255,255,0.07)", border: `1.5px solid ${GREEN}44`, color: "white", fontSize: 17, outline: "none", resize: "none", lineHeight: 1.55, boxSizing: "border-box", fontFamily: "inherit", overscrollBehavior: "contain" }}
              />
            ) : (
              <input
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                autoFocus
                style={{ width: "100%", padding: "16px 18px", borderRadius: 18, backgroundColor: "rgba(255,255,255,0.07)", border: `1.5px solid ${GREEN}44`, color: "white", fontSize: 17, outline: "none", boxSizing: "border-box" }}
              />
            )}
            <p style={{ margin: "14px 2px 0", ...TYPE.footnote, color: "rgba(255,255,255,0.42)", lineHeight: 1.45 }}>
              Save publishes this copy to the live site.
            </p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          CUSTOM DOMAIN
      ══════════════════════════════════════════ */}
      <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.05)", margin: "32px 0" }}/>
      <div style={{ padding: "0 20px" }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ margin: "0 0 4px", ...TYPE.title, color: "white" }}>Custom Domain</h2>
          <p style={{ margin: 0, ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
            Replace foundco.app with your own domain name
          </p>
        </div>
        <DomainConnector
          initialDomain={(initialConfig?.custom_domain as string | null) ?? null}
          plan={plan}
          subscriptionStatus={subscriptionStatus}
          companySlug={company.slug}
        />
      </div>

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
      <div style={{ borderRadius: 20, padding: 18, background: `linear-gradient(135deg, ${GREEN}0a, ${GREEN}03)`, border: `1px solid ${GREEN}22` }}>
        <input value={editName} onChange={e => setEditName(e.target.value)} autoFocus placeholder="Service name"
          style={{ width: "100%", padding: "12px 14px", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 8, fontFamily: "inherit" }}
        />
        <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description" rows={2}
          style={{ width: "100%", padding: "12px 14px", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 14, outline: "none", resize: "none", boxSizing: "border-box", marginBottom: 12, fontFamily: "inherit", lineHeight: 1.5 }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent", color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          <button onClick={() => onSave(index, editName, editDesc)} style={{ flex: 2, padding: "11px 0", borderRadius: 12, border: "none", backgroundColor: GREEN, color: BLACK, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Save</button>
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
