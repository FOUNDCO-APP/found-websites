"use client"

import React, { useEffect, useRef, useState, useTransition } from "react"
import { createPortal } from "react-dom"
import { updateSiteField, regenerateSection, assignPhotoToSection, clearHeroPhoto, removeStockImage, updatePrimaryIntent, updateMenuItems, uploadMenuItemPhoto, updateCompanyField } from "./actions"
import { TYPE, TEXT_OPACITY, GREEN, BLACK } from "@/lib/dashboard/typography"
import DomainConnector from "./DomainConnector"
import { polishMenuCategories, polishServices, polishWebsiteField } from "@/lib/copyPolish"
import { isVideoMedia } from "@/lib/mediaKind"
import { getFeaturedUpdateDraft, isGenericFeaturedCopy } from "@/lib/featuredUpdate"

type Config = Record<string, unknown>
type Photo = { id: string; url: string; website_section: string | null; media_type?: "photo" | "video"; mime_type?: string | null }
type Section = "hero" | "about" | "services" | "tagline"
type PhotoSlot = "hero" | "about" | "cta" | "gallery" | "announcement" | "contact"
type AnnouncementStyle = "default" | "light" | "dark" | "accent" | "image"
type View = "hub" | "home" | "about" | "contact" | "catalog" | "services" | "photos" | "businessInfo" | "domain"

type Props = {
  company: { id: string; name: string; slug: string; sub_industry?: string | null; phone: string | null; email: string | null; city: string | null; state: string | null }
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
  const editorTouchStartY = useRef(0)
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
  const [photoPickerSlot, setPhotoPickerSlot] = useState<PhotoSlot | null>(null)
  const [stockImages, setStockImages] = useState<string[]>(initialStockImages)
  const [activeIntent, setActiveIntent] = useState(initialIntent)
  const [savingIntent, setSavingIntent] = useState(false)
  const [intentSaved, setIntentSaved] = useState(false)

  // Shared save-failure toast. A save showing "Saved" when the write actually
  // failed is worse than no feedback at all - this makes failures visible
  // instead of silent, and callers roll their optimistic state back on error.
  const [saveError, setSaveError] = useState<string | null>(null)
  function flashSaveError(message = "Couldn't save. Check your connection and try again.") {
    setSaveError(message)
    setTimeout(() => setSaveError(null), 4000)
  }

  // Shared confirm-before-delete. Remove buttons for real owner content
  // (services, categories, items) used to delete instantly on one tap with
  // no undo - a mis-tap next to Edit could wipe a whole category.
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; confirmLabel: string; onConfirm: () => void } | null>(null)

  // Edit My Site is a hub: pick a page/section, edit just that, come back.
  // Not one long scrolling page. See DESIGN_DECISIONS.md [2026-07-27].
  const [view, setView] = useState<View>("hub")
  const [businessInfo, setBusinessInfo] = useState({
    name: company.name ?? "",
    phone: company.phone ?? "",
    email: company.email ?? "",
    city: company.city ?? "",
    state: company.state ?? "",
  })
  const [savingBizField, setSavingBizField] = useState<string | null>(null)
  const [savedBizField, setSavedBizField] = useState<string | null>(null)

  async function saveBusinessField(field: "name" | "phone" | "email" | "city" | "state", value: string) {
    const previousValue = businessInfo[field]
    setBusinessInfo(prev => ({ ...prev, [field]: value }))
    setSavingBizField(field)
    const result = await updateCompanyField(field, value)
    setSavingBizField(null)
    if (!("error" in result)) {
      setSavedBizField(field)
      setTimeout(() => setSavedBizField(null), 2200)
    } else {
      setBusinessInfo(prev => ({ ...prev, [field]: previousValue }))
      flashSaveError("Couldn't save that. Try again.")
    }
  }

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
  const sheetOpen = Boolean(editing || photoPickerSlot || editingMenuItem || editingService !== null || newService || addingMenuCat || editingMenuCatIdx !== null || confirmAction)

  useEffect(() => {
    const root = document.documentElement
    const header = document.querySelector<HTMLElement>(".found-dashboard-header")
    if (!header) return

    const updateHeaderHeight = () => {
      root.style.setProperty("--found-header-h", `${header.getBoundingClientRect().height}px`)
    }

    updateHeaderHeight()
    const observer = new ResizeObserver(updateHeaderHeight)
    observer.observe(header)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!sheetOpen) return

    const body = document.body
    const root = document.documentElement
    const previousBodyOverflow = body.style.overflow
    const previousBodyOverscroll = body.style.overscrollBehavior
    const previousBodyPosition = body.style.position
    const previousBodyTop = body.style.top
    const previousBodyLeft = body.style.left
    const previousBodyRight = body.style.right
    const previousBodyWidth = body.style.width
    const previousRootOverflow = root.style.overflow
    const previousRootOverscroll = root.style.overscrollBehavior
    const previousRootHeight = root.style.height
    const scrollY = window.scrollY

    const updateVisualHeight = () => {
      root.style.setProperty("--found-visual-height", `${window.visualViewport?.height ?? window.innerHeight}px`)
    }

    updateVisualHeight()
    body.style.overflow = "hidden"
    body.style.overscrollBehavior = "none"
    body.style.position = "fixed"
    body.style.top = `-${scrollY}px`
    body.style.left = "0"
    body.style.right = "0"
    body.style.width = "100%"
    root.style.overflow = "hidden"
    root.style.overscrollBehavior = "none"
    root.style.height = "100%"
    window.visualViewport?.addEventListener("resize", updateVisualHeight)
    window.visualViewport?.addEventListener("scroll", updateVisualHeight)

    return () => {
      body.style.overflow = previousBodyOverflow
      body.style.overscrollBehavior = previousBodyOverscroll
      body.style.position = previousBodyPosition
      body.style.top = previousBodyTop
      body.style.left = previousBodyLeft
      body.style.right = previousBodyRight
      body.style.width = previousBodyWidth
      root.style.overflow = previousRootOverflow
      root.style.overscrollBehavior = previousRootOverscroll
      root.style.height = previousRootHeight
      root.style.removeProperty("--found-visual-height")
      window.visualViewport?.removeEventListener("resize", updateVisualHeight)
      window.visualViewport?.removeEventListener("scroll", updateVisualHeight)
      window.scrollTo(0, scrollY)
    }
  }, [sheetOpen])

  function handleEditorTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    editorTouchStartY.current = event.touches[0]?.clientY ?? 0
  }

  function handleEditorTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement
    const scrollable = target.closest("[data-found-editor-scrollable='true']") as HTMLElement | null
    if (!scrollable) {
      event.preventDefault()
      return
    }

    const currentY = event.touches[0]?.clientY ?? editorTouchStartY.current
    const deltaY = currentY - editorTouchStartY.current
    const atTop = scrollable.scrollTop <= 0
    const atBottom = scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 1
    if ((atTop && deltaY > 0) || (atBottom && deltaY < 0)) event.preventDefault()
  }
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
    const previousValue = config[field]
    setConfig(prev => ({ ...prev, [field]: polishedValue }))
    setEditing(null)
    setSaved(field)
    setTimeout(() => setSaved(null), 2500)
    const result = await updateSiteField(field, polishedValue)
    if (result && "error" in result) {
      setConfig(prev => ({ ...prev, [field]: previousValue }))
      setSaved(null)
      flashSaveError()
    }
  }

  function saveConfigField(field: string, value: unknown) {
    const previousValue = config[field]
    setConfig(prev => ({ ...prev, [field]: value }))
    setSaved(field)
    setTimeout(() => setSaved(null), 2500)
    startTransition(async () => {
      const result = await updateSiteField(field, value)
      if (result && "error" in result) {
        setConfig(prev => ({ ...prev, [field]: previousValue }))
        setSaved(null)
        flashSaveError()
      }
    })
  }

  function toggleFeaturedUpdate() {
    if (announcementEnabled) {
      saveConfigField("announcement_enabled", false)
      return
    }

    const updates: Record<string, unknown> = { announcement_enabled: true }
    if (isGenericFeaturedCopy(config.announcement_title)) updates.announcement_title = announcementDefault.title
    if (isGenericFeaturedCopy(config.announcement_body)) updates.announcement_body = announcementDefault.body
    if (isGenericFeaturedCopy(config.announcement_cta_label)) updates.announcement_cta_label = announcementDefault.label
    if (!String(config.announcement_cta_href ?? "").trim()) updates.announcement_cta_href = announcementDefault.href

    const previousValues: Record<string, unknown> = {}
    Object.keys(updates).forEach(field => { previousValues[field] = config[field] })

    setConfig(prev => ({ ...prev, ...updates }))
    setSaved("announcement_enabled")
    setTimeout(() => setSaved(null), 2500)
    startTransition(async () => {
      const results = await Promise.all(Object.entries(updates).map(([field, value]) => updateSiteField(field, value)))
      if (results.some(r => r && "error" in r)) {
        setConfig(prev => ({ ...prev, ...previousValues }))
        setSaved(null)
        flashSaveError()
      }
    })
  }
  async function handleRegenerate(section: Section) {
    setRegenerating(section)
    const result = await regenerateSection(section)
    if (result.success && result.updates) setConfig(prev => ({ ...prev, ...result.updates }))
    else flashSaveError("Couldn't rewrite that section. Try again.")
    setRegenerating(null)
  }

  async function saveService(index: number, name: string, description: string) {
    const previousServices = (config.services as Array<{name:string;description:string}>) ?? []
    const services = [...previousServices]
    services[index] = { name, description }
    const polishedServices = polishServices(services)
    setConfig(prev => ({ ...prev, services: polishedServices }))
    setEditingService(null)
    startTransition(async () => {
      const result = await updateSiteField("services", polishedServices)
      if (result && "error" in result) {
        setConfig(prev => ({ ...prev, services: previousServices }))
        flashSaveError("Couldn't save that service. Try again.")
      }
    })
  }

  async function removeService(index: number) {
    const previousServices = (config.services as Array<{name:string;description:string}>) ?? []
    const services = [...previousServices]
    services.splice(index, 1)
    setConfig(prev => ({ ...prev, services }))
    startTransition(async () => {
      const result = await updateSiteField("services", services)
      if (result && "error" in result) {
        setConfig(prev => ({ ...prev, services: previousServices }))
        flashSaveError("Couldn't remove that service. Try again.")
      }
    })
  }

  async function addService() {
    if (!newServiceName.trim()) return
    const previousServices = (config.services as Array<{name:string;description:string}>) ?? []
    const services = [...previousServices]
    services.push({ name: newServiceName.trim(), description: newServiceDesc.trim() })
    const polishedServices = polishServices(services)
    setConfig(prev => ({ ...prev, services: polishedServices }))
    setNewService(false)
    setNewServiceName("")
    setNewServiceDesc("")
    startTransition(async () => {
      const result = await updateSiteField("services", polishedServices)
      if (result && "error" in result) {
        setConfig(prev => ({ ...prev, services: previousServices }))
        flashSaveError("Couldn't add that service. Try again.")
      }
    })
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
    else flashSaveError(result.error || "Couldn't upload that photo. Try again.")
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
  function handleAssignPhoto(photoId: string, section: PhotoSlot | null) {
    const photo = localPhotos.find(p => p.id === photoId)
    const previousPhotos = localPhotos
    const previousConfig = config
    setLocalPhotos(prev => prev.map(p => ({
      ...p,
      website_section: p.id === photoId
        ? section
        : section && section !== "gallery" && p.website_section === section
          ? null
          : p.website_section,
    })))
    if (section === "hero" && photo) {
      const current = Array.isArray(config.hero_images) ? (config.hero_images as string[]) : []
      if (isVideoMedia(photo.url, photo.mime_type)) {
        setConfig(prev => ({ ...prev, hero_video_url: photo.url, hero_image_url: null }))
      } else {
        const heroImages = [photo.url, ...current.filter(url => url !== photo.url)]
        setConfig(prev => ({ ...prev, hero_image_url: photo.url, hero_video_url: null, hero_images: heroImages }))
      }
    }
    if (section && section !== "gallery") setPhotoPickerSlot(null)
    startTransition(async () => {
      const result = await assignPhotoToSection(photoId, section)
      if (result && "error" in result) {
        setLocalPhotos(previousPhotos)
        setConfig(previousConfig)
        flashSaveError("Couldn't update that photo. Try again.")
      }
    })
  }

  function handleClearPhotoSlot(slot: PhotoSlot) {
    const slotPhotoIds = localPhotos.filter(p => p.website_section === slot).map(p => p.id)
    const previousPhotos = localPhotos
    const previousConfig = config
    if (slot === "hero") {
      setLocalPhotos(prev => prev.map(p => p.website_section === "hero" ? { ...p, website_section: null } : p))
      setConfig(prev => ({ ...prev, hero_image_url: null, hero_video_url: null, hero_images: [] }))
      setPhotoPickerSlot(null)
      startTransition(async () => {
        const result = await clearHeroPhoto()
        if (result && "error" in result) {
          setLocalPhotos(previousPhotos)
          setConfig(previousConfig)
          flashSaveError("Couldn't remove that photo. Try again.")
        }
      })
      return
    }
    setLocalPhotos(prev => prev.map(p => p.website_section === slot ? { ...p, website_section: null } : p))
    setPhotoPickerSlot(null)
    startTransition(async () => {
      const results = await Promise.all(slotPhotoIds.map(id => assignPhotoToSection(id, null)))
      if (results.some(r => r && "error" in r)) {
        setLocalPhotos(previousPhotos)
        flashSaveError("Couldn't remove that photo. Try again.")
      }
    })
  }

  const heroPhotos = localPhotos.filter(p => p.website_section === "hero")
  const aboutPhotos = localPhotos.filter(p => p.website_section === "about")
  const ctaPhotos = localPhotos.filter(p => p.website_section === "cta")
  const galleryPhotos = localPhotos.filter(p => p.website_section === "gallery")
  const contactPhotos = localPhotos.filter(p => p.website_section === "contact")
  const announcementPhotos = localPhotos.filter(p => p.website_section === "announcement")
  const unassigned = localPhotos.filter(p => !p.website_section)
  const pickerPhotos = localPhotos
  const services = (config.services as Array<{name:string;description:string}>) ?? []
  const heroImage = heroPhotos[0]?.url ?? (config.hero_video_url as string) ?? (config.hero_image_url as string) ?? null
  const announcementEnabled = config.announcement_enabled === true
  const announcementStyleRaw = typeof config.announcement_style === "string" ? config.announcement_style : "default"
  const announcementStyle: AnnouncementStyle = (["default", "light", "dark", "accent", "image"].includes(announcementStyleRaw) ? announcementStyleRaw : "default") as AnnouncementStyle
  const announcementImage = announcementPhotos[0]?.url ?? null
  const announcementTargets = isFoodCatalog
    ? [{ label: "Menu", href: "/menu" }, { label: "Reservations", href: "/reserve" }, { label: "Contact", href: "/contact" }]
    : isShopCatalog
      ? [{ label: "Shop", href: "/shop" }, { label: "Products", href: "/shop" }, { label: "Contact", href: "/contact" }]
      : [{ label: "Services", href: "/services" }, { label: "Estimate", href: "/estimate" }, { label: "Contact", href: "/contact" }]
  const announcementNearbyCopy = [
    config.hero_title,
    config.hero_subtitle,
    config.about_preview,
    config.about_text,
    "From the shop",
    "A closer look at what they carry",
    "From the menu",
    "A taste of what is ready",
  ]
  const announcementDefault = getFeaturedUpdateDraft({
    name: company.name,
    industry_category: industryCategory,
    sub_industry: company.sub_industry ?? null,
    website_config: { ...(config as any), menu_items: menuCats, services } as any,
  }, announcementNearbyCopy) ?? { title: "A clear next step is ready.", body: "Visitors can see what matters now and move straight to the right action.", label: "Learn more", href: "/contact", eyebrow: "Featured update" }
  const announcementTitle = !isGenericFeaturedCopy(config.announcement_title) ? String(config.announcement_title).trim() : announcementDefault.title
  const announcementBody = !isGenericFeaturedCopy(config.announcement_body) ? String(config.announcement_body).trim() : announcementDefault.body
  const announcementLabel = !isGenericFeaturedCopy(config.announcement_cta_label) ? String(config.announcement_cta_label).trim() : announcementDefault.label
  const announcementHref = typeof config.announcement_cta_href === "string" && config.announcement_cta_href.trim() ? config.announcement_cta_href : announcementDefault.href
  const announcementIsLight = announcementStyle === "light"
  const announcementTextColor = announcementIsLight ? "#111111" : "white"
  const announcementMutedColor = announcementIsLight ? "rgba(0,0,0,0.62)" : "rgba(255,255,255,0.72)"
  const announcementSubtleColor = announcementIsLight ? "rgba(0,0,0,0.48)" : "rgba(255,255,255,0.48)"
  const announcementControlBg = announcementIsLight ? "rgba(0,0,0,0.045)" : "rgba(255,255,255,0.06)"
  const announcementControlBorder = announcementIsLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)"
  const photoSlots: { slot: PhotoSlot; label: string; helper: string; photos: Photo[] }[] = [
    { slot: "hero", label: "Header", helper: "The first image customers see.", photos: heroPhotos },
    { slot: "about", label: "About", helper: "The story and services image.", photos: aboutPhotos },
    { slot: "cta", label: "Visit / CTA", helper: "The final action image on the site.", photos: ctaPhotos },
    { slot: "gallery", label: "Gallery", helper: "Photos shown in gallery and photo strips.", photos: galleryPhotos },
    { slot: "announcement", label: "Featured Update", helper: "The image behind a sale, update, or promotion.", photos: announcementPhotos },
    { slot: "contact", label: "Contact", helper: "The image behind the contact page.", photos: contactPhotos },
  ]
  const missingPhotoSlots = photoSlots.filter(slot => slot.photos.length === 0).length

  const catalogTileLabel = isFoodCatalog ? "Menu" : "Shop"
  const catalogTileSub = isFoodCatalog ? "What guests order from" : "What you sell, priced"

  // Lateral quick-nav between the "Pages" sections, so owners can jump
  // Home -> About -> Contact etc. without detouring back through the hub.
  const pagesNavItems: { view: View; label: string }[] = [
    { view: "home", label: "Home" },
    { view: "about", label: "About" },
    { view: "contact", label: "Contact" },
    ...(showCatalog ? [{ view: "catalog" as View, label: catalogTileLabel }] : []),
    ...(!isFoodCatalog ? [{ view: "services" as View, label: "Services" }] : []),
    { view: "photos", label: "Gallery" },
  ]

  return (
    // overflowX: clip (not hidden) guards against any descendant - the new
    // Pages pill row, a long unbroken value, etc. - stretching this page
    // horizontally past the viewport, without turning this into its own
    // vertical scroll container (which would break the sticky BackHeader,
    // whose offset is measured against the shared document scroll).
    <div style={{ backgroundColor: BLACK, minHeight: "100dvh", paddingBottom: "140px", overflowX: "clip" as const }}>
      {view === "hub" && (
        <>
          <div style={{ padding: "28px 20px 0" }}>
            <div style={{ ...TYPE.caption, color: GREEN, marginBottom: 8 }}>Your site</div>
            <h1 style={{ margin: 0, fontSize: 40, lineHeight: 1.02, fontWeight: 300, color: "white", letterSpacing: 0 }}>Edit website</h1>
          </div>

          <a href={`https://${company.slug}.foundco.app`} target="_blank" rel="noopener noreferrer" style={{ margin: "14px 20px 0", display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none" }}>
            <span style={{ ...TYPE.footnote, color: GREEN }}>View live site</span>
            <span style={{ ...TYPE.footnote, fontWeight: 500, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>{company.slug}.foundco.app</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M9 6l6 6-6 6"/></svg>
          </a>

          <div style={{ padding: "26px 20px 0" }}>
            <div style={{ ...TYPE.caption, color: GREEN, marginBottom: 12 }}>Pages</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <HubTile label="Home" sub="Headline, photos, Featured Update" onClick={() => setView("home")} />
              <HubTile label="About" sub="Your story, what you offer" onClick={() => setView("about")} />
              <HubTile label="Contact" sub="How customers reach you" onClick={() => setView("contact")} />
              {showCatalog && <HubTile label={catalogTileLabel} sub={catalogTileSub} onClick={() => setView("catalog")} />}
              {!isFoodCatalog && <HubTile label="Services" sub="What you offer, priced" onClick={() => setView("services")} />}
              <HubTile label="Gallery" sub="Photos customers see" flag={galleryPhotos.length === 0 ? "Add photos" : undefined} onClick={() => setView("photos")} />
            </div>
          </div>

          <div style={{ padding: "26px 20px 0" }}>
            <div style={{ ...TYPE.caption, color: GREEN, marginBottom: 12 }}>Business info</div>
            <button onClick={() => setView("businessInfo")} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: 16, borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.035)", textAlign: "left", cursor: "pointer" }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 17, fontWeight: 700, color: "white", marginBottom: 3 }}>Name, phone, email, address</span>
                <span style={{ display: "block", fontSize: 15, fontWeight: 500, lineHeight: 1.4, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>Used everywhere on your site - not just one page</span>
              </span>
              <TapChevronBadge />
            </button>
          </div>

          <div style={{ padding: "26px 20px 0" }}>
            <div style={{ ...TYPE.caption, color: GREEN, marginBottom: 12 }}>Site-wide</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <HubTile label="Photo library" sub="All your photos" href="/photos" />
              <HubTile label="Domain" sub={`${company.slug}.foundco.app`} onClick={() => setView("domain")} />
            </div>
          </div>
        </>
      )}

      {view === "home" && (
      <>
      <BackHeader label="Home" onBack={() => setView("hub")} pages={pagesNavItems} currentView={view} onNavigate={setView} />
      <div id="homepage" style={{ padding: "10px 20px 0" }}>
        <div style={{ ...TYPE.caption, color: GREEN, marginBottom: 8 }}>First impression</div>
        <h2 style={{ margin: 0, ...TYPE.title, color: "white" }}>Homepage</h2>
        <p style={{ margin: "6px 0 0", ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, lineHeight: 1.5 }}>
          This is the first screen customers see. Keep the photo, headline, and main action clear.
        </p>
      </div>

      <div style={{ margin: "16px 20px 0", borderRadius: 26, overflow: "hidden", border: "1px solid rgba(255,255,255,0.09)", backgroundColor: "rgba(255,255,255,0.035)" }}>
        <div style={{ position: "relative", height: 210, overflow: "hidden" }}>
          {heroImage ? (
            isVideoMedia(heroImage) ? (
              <video src={heroImage} autoPlay muted loop playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroImage} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            )
          ) : (
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #1a2a1a 0%, #0d1a0d 50%, #080A09 100%)" }}/>
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(8,10,9,0.18) 0%, rgba(8,10,9,0.72) 100%)" }}/>
          <div style={{ position: "absolute", left: 18, right: 18, bottom: 18 }}>
            <div style={{ ...TYPE.caption, color: "rgba(255,255,255,0.76)", marginBottom: 8 }}>Live preview</div>
            <h3 style={{ margin: 0, fontSize: 30, lineHeight: 1.04, fontWeight: 900, color: "white", letterSpacing: 0 }}>
              {String(config.hero_title || "Homepage headline")}
            </h3>
            <p style={{ margin: "8px 0 0", fontSize: 15, lineHeight: 1.45, color: "rgba(255,255,255,0.72)" }}>
              {String(config.hero_subtitle || "Add the short line customers read first.")}
            </p>
          </div>
        </div>

        <div style={{ padding: 16, display: "flex", flexDirection: "column" as const, gap: 10 }}>
          <button onClick={() => startEdit("hero_title", String(config.hero_title ?? ""))} style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: 14, borderRadius: 18, border: "1px solid rgba(255,255,255,0.09)", backgroundColor: "rgba(255,255,255,0.045)", color: "white", textAlign: "left", cursor: "pointer" }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", ...TYPE.caption, color: "rgba(255,255,255,0.48)", marginBottom: 5 }}>Headline</span>
              <span style={{ display: "block", fontSize: 16, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(config.hero_title || "Add homepage headline")}</span>
            </span>
            <span style={{ color: GREEN, fontSize: 13, fontWeight: 900 }}>Edit</span>
          </button>

          <button onClick={() => startEdit("hero_subtitle", String(config.hero_subtitle ?? ""))} style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: 14, borderRadius: 18, border: "1px solid rgba(255,255,255,0.09)", backgroundColor: "rgba(255,255,255,0.045)", color: "white", textAlign: "left", cursor: "pointer" }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", ...TYPE.caption, color: "rgba(255,255,255,0.48)", marginBottom: 5 }}>Supporting line</span>
              <span style={{ display: "block", fontSize: 14, lineHeight: 1.35, color: "rgba(255,255,255,0.72)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(config.hero_subtitle || "Add homepage supporting line")}</span>
            </span>
            <span style={{ color: GREEN, fontSize: 13, fontWeight: 900 }}>Edit</span>
          </button>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button onClick={() => startEdit("cta_headline", String(config.cta_headline ?? ""))} style={{ padding: 14, borderRadius: 18, border: "1px solid rgba(255,255,255,0.09)", backgroundColor: "rgba(255,255,255,0.045)", color: "white", textAlign: "left", cursor: "pointer" }}>
              <span style={{ display: "block", ...TYPE.caption, color: "rgba(255,255,255,0.48)", marginBottom: 5 }}>Main button</span>
              <span style={{ display: "block", fontSize: 15, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(config.cta_headline || "Come see us")}</span>
            </button>
            <button onClick={() => startEdit("tagline", String(config.tagline ?? ""))} style={{ padding: 14, borderRadius: 18, border: "1px solid rgba(255,255,255,0.09)", backgroundColor: "rgba(255,255,255,0.045)", color: "white", textAlign: "left", cursor: "pointer" }}>
              <span style={{ display: "block", ...TYPE.caption, color: "rgba(255,255,255,0.48)", marginBottom: 5 }}>Short hook</span>
              <span style={{ display: "block", fontSize: 15, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(config.tagline || "Add a hook")}</span>
            </button>
          </div>

          <button onClick={() => setPhotoPickerSlot("hero")} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: 14, borderRadius: 18, border: "1px solid rgba(255,255,255,0.09)", backgroundColor: "rgba(255,255,255,0.045)", color: "white", textAlign: "left", cursor: "pointer" }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.07)", flexShrink: 0 }}>
              {heroImage ? (
                isVideoMedia(heroImage) ? <VideoThumb src={heroImage} /> : <img src={heroImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : null}
            </div>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", ...TYPE.caption, color: "rgba(255,255,255,0.48)", marginBottom: 5 }}>Header photo</span>
              <span style={{ display: "block", fontSize: 14, color: "rgba(255,255,255,0.72)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Change the main image or video</span>
            </span>
            <span style={{ color: GREEN, fontSize: 13, fontWeight: 900 }}>Change</span>
          </button>

          <AIBar label="Rewrite the first impression with AI" isLoading={regenerating === "hero"} color={GREEN} onTap={() => handleRegenerate("hero")} />
        </div>
      </div>

      <div id="site-photo-map" style={{ margin: "18px 20px 0", borderRadius: 24, padding: 16, border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.032)" }}>
        <div style={{ ...TYPE.caption, color: GREEN, marginBottom: 6 }}>Photos around the site</div>
        <p style={{ margin: "0 0 14px", fontSize: 14, lineHeight: 1.45, color: "rgba(255,255,255,0.58)" }}>
          Pick what appears on each page. Stock photos can stay until the owner has better images.
        </p>
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
          {photoSlots.map(slot => {
            const cover = slot.photos[0]?.url ?? null
            const count = slot.photos.length
            return (
              <button key={slot.slot} onClick={() => setPhotoPickerSlot(slot.slot)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: 0, border: "none", background: "transparent", textAlign: "left", cursor: "pointer" }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }}>
                  {cover ? (
                    isVideoMedia(cover) ? <VideoThumb src={cover} /> : <img src={cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: 900 }}>None</div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: "white", marginBottom: 2 }}>{slot.label}</div>
                  <p style={{ margin: 0, fontSize: 12, lineHeight: 1.35, color: "rgba(255,255,255,0.58)" }}>{count ? `${count} selected` : slot.helper}</p>
                </div>
                <span style={{ padding: "8px 12px", borderRadius: 999, border: `1px solid ${GREEN}33`, backgroundColor: `${GREEN}18`, color: GREEN, fontSize: 12, fontWeight: 900, flexShrink: 0 }}>
                  Change
                </span>
              </button>
            )
          })}
        </div>
      </div>
      <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.05)", margin: "28px 0" }}/>
      <div id="featured-update" style={{ padding: "0 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <div style={{ ...TYPE.caption, color: GREEN, marginBottom: 8 }}>Featured Update</div>
            <h2 style={{ margin: 0, ...TYPE.title, color: "white" }}>Show what matters right now.</h2>
            <p style={{ margin: "6px 0 0", ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, lineHeight: 1.45 }}>
              Put one sale, product drop, event, or booking push below the homepage hero.
            </p>
          </div>
          <button onClick={toggleFeaturedUpdate} style={{ padding: "10px 14px", borderRadius: 999, border: `1px solid ${announcementEnabled ? GREEN + "55" : "rgba(255,255,255,0.12)"}`, backgroundColor: announcementEnabled ? `${GREEN}18` : "rgba(255,255,255,0.06)", color: announcementEnabled ? GREEN : "rgba(255,255,255,0.72)", fontWeight: 900, cursor: "pointer", whiteSpace: "nowrap" }}>
            {announcementEnabled ? "On" : "Off"}
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column" as const, gap: 12 }}>
          <div style={{ borderRadius: 24, padding: 18, background: announcementStyle === "light" ? "#f6f7f4" : announcementStyle === "accent" ? `linear-gradient(145deg, ${GREEN}26, rgba(255,255,255,0.05))` : "linear-gradient(145deg, rgba(50,208,116,0.11), rgba(255,255,255,0.045))", border: `1px solid ${announcementEnabled ? GREEN + "33" : "rgba(255,255,255,0.1)"}`, opacity: announcementEnabled ? 1 : 0.62 }}>
            {announcementStyle === "image" && announcementImage && (
              <div style={{ height: 130, borderRadius: 18, overflow: "hidden", marginBottom: 14, position: "relative" }}>
                {isVideoMedia(announcementImage) ? <VideoThumb src={announcementImage} /> : <img src={announcementImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.48), transparent)" }}/>
              </div>
            )}
            <div style={{ ...TYPE.caption, color: GREEN, marginBottom: 8 }}>Preview</div>
            <div style={{ margin: "0 0 10px", fontSize: 12, lineHeight: 1.35, color: announcementMutedColor }}>Found drafted this for you. Edit it before or after it goes live.</div>
            <h3 style={{ margin: 0, fontSize: 28, lineHeight: 1.05, fontWeight: 900, color: announcementTextColor, letterSpacing: 0 }}>{announcementTitle}</h3>
            <p style={{ margin: "12px 0 0", fontSize: 16, lineHeight: 1.5, color: announcementMutedColor }}>{announcementBody}</p>
            <div style={{ marginTop: 16, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "10px 14px", borderRadius: 999, backgroundColor: announcementStyle === "light" ? GREEN : "rgba(255,255,255,0.1)", border: `1px solid ${announcementStyle === "light" ? GREEN : announcementControlBorder}`, color: announcementStyle === "light" ? "#07130d" : announcementTextColor, fontSize: 13, fontWeight: 900 }}>
              {announcementLabel}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
            <button onClick={() => startEdit("announcement_title", announcementTitle)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%", padding: 14, borderRadius: 18, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.045)", color: "white", textAlign: "left", cursor: "pointer" }}>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", ...TYPE.caption, color: "rgba(255,255,255,0.48)", marginBottom: 5 }}>Edit headline</span>
                <span style={{ display: "block", fontSize: 16, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 320 }}>{announcementTitle}</span>
              </span>
              <span style={{ color: GREEN, fontSize: 13, fontWeight: 900, flexShrink: 0 }}>Edit</span>
            </button>
            <button onClick={() => startEdit("announcement_body", announcementBody)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%", padding: 14, borderRadius: 18, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.045)", color: "white", textAlign: "left", cursor: "pointer" }}>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", ...TYPE.caption, color: "rgba(255,255,255,0.48)", marginBottom: 5 }}>Edit message</span>
                <span style={{ display: "block", fontSize: 14, lineHeight: 1.35, color: "rgba(255,255,255,0.72)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 320 }}>{announcementBody}</span>
              </span>
              <span style={{ color: GREEN, fontSize: 13, fontWeight: 900, flexShrink: 0 }}>Edit</span>
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button onClick={() => startEdit("announcement_cta_label", announcementLabel)} style={{ padding: 14, borderRadius: 18, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.045)", color: "white", textAlign: "left", cursor: "pointer" }}>
              <div style={{ ...TYPE.caption, color: "rgba(255,255,255,0.48)", marginBottom: 5 }}>Button text</div>
              <div style={{ fontWeight: 900 }}>{announcementLabel}</div>
            </button>
            <button onClick={() => setPhotoPickerSlot("announcement")} style={{ padding: 14, borderRadius: 18, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.045)", color: "white", textAlign: "left", cursor: "pointer" }}>
              <div style={{ ...TYPE.caption, color: "rgba(255,255,255,0.48)", marginBottom: 5 }}>Image</div>
              <div style={{ fontWeight: 900 }}>{announcementImage ? "Change image" : "Add image"}</div>
            </button>
          </div>

          <div style={{ padding: 14, borderRadius: 18, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.045)" }}>
            <div style={{ ...TYPE.caption, color: "rgba(255,255,255,0.48)", marginBottom: 10 }}>Style</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["default", "light", "dark", "accent", "image"] as AnnouncementStyle[]).map(style => (
                <button key={style} onClick={() => saveConfigField("announcement_style", style)} style={{ padding: "9px 12px", borderRadius: 999, border: `1px solid ${announcementStyle === style ? GREEN + "66" : "rgba(255,255,255,0.12)"}`, backgroundColor: announcementStyle === style ? `${GREEN}1f` : "rgba(255,255,255,0.04)", color: announcementStyle === style ? GREEN : "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 900, textTransform: "capitalize", cursor: "pointer" }}>
                  {style}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: 14, borderRadius: 18, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.045)" }}>
            <div style={{ ...TYPE.caption, color: "rgba(255,255,255,0.48)", marginBottom: 10 }}>Button goes to</div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
              {announcementTargets.map(target => (
                <button key={target.href} onClick={() => saveConfigField("announcement_cta_href", target.href)} style={{ flex: "0 0 auto", padding: "10px 13px", borderRadius: 999, border: `1px solid ${announcementHref === target.href ? GREEN + "66" : "rgba(255,255,255,0.12)"}`, backgroundColor: announcementHref === target.href ? `${GREEN}1f` : "rgba(255,255,255,0.04)", color: announcementHref === target.href ? GREEN : "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 900, cursor: "pointer" }}>
                  {target.label}
                </button>
              ))}
              <button onClick={() => startEdit("announcement_cta_href", announcementHref)} style={{ flex: "0 0 auto", padding: "10px 13px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 900, cursor: "pointer" }}>
                Custom link
              </button>
            </div>
          </div>
        </div>
      </div>
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
                    Live
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
      </>
      )}

      {view === "about" && (
      <>
      <BackHeader label="About" onBack={() => setView("hub")} pages={pagesNavItems} currentView={view} onNavigate={setView} />
      <div style={{ padding: "10px 20px 0" }}>
        <SectionIntro eyebrow="About" title="Tell customers why to trust you." body="Write the short story customers read before they call, book, or buy." />
        <div style={{ marginTop: 18 }}>
          <PageTab label="About" href={`https://${company.slug}.foundco.app/about`} />
        </div>
      </div>

      <div style={{ margin: "16px 20px 0", display: "flex", flexDirection: "column" as const, gap: 10 }}>
        <div style={{
          borderRadius: 20, padding: "22px 20px",
          background: "linear-gradient(160deg, rgba(50,208,116,0.07) 0%, rgba(50,208,116,0.02) 100%)",
          border: `1px solid ${GREEN}22`,
        }}>
          <div style={{ ...TYPE.caption, color: GREEN, marginBottom: 12 }}>Live preview</div>
          <p style={{
            margin: 0, fontSize: 16, fontWeight: 300,
            color: config.about_text ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.25)",
            lineHeight: 1.7, fontStyle: config.about_text ? "normal" : "italic",
          }}>
            {String(config.about_text || "Tap to write your story. Tell customers who you are and why you love what you do.")}
          </p>
        </div>
        <EditRow
          label="Story"
          value={String(config.about_text ?? "")}
          placeholder="Tap to write your story"
          onClick={() => startEdit("about_text", String(config.about_text ?? ""))}
          isSaved={saved === "about_text"}
        />
        <AIBar label="Let AI write your story" isLoading={regenerating === "about"} color={GREEN} onTap={() => handleRegenerate("about")} />
      </div>
      </>
      )}

      {view === "contact" && (
      <>
      <BackHeader label="Contact" onBack={() => setView("hub")} pages={pagesNavItems} currentView={view} onNavigate={setView} />
      <div style={{ padding: "10px 20px 0" }}>
        <SectionIntro eyebrow="Contact" title="Make reaching out easy." body="Set the words customers see before they send a message." />
        <div style={{ marginTop: 18 }}>
          <PageTab label="Contact" href={"https://" + company.slug + ".foundco.app/contact"} />
        </div>
      </div>

      <div style={{ margin: "16px 20px 0", display: "flex", flexDirection: "column" as const, gap: 10 }}>
        <EditRowGroup>
          <EditRow label="Page label" value={String(config.contact_eyebrow ?? "")} placeholder="Get in touch" onClick={() => startEdit("contact_eyebrow", String(config.contact_eyebrow ?? ""))} isSaved={saved === "contact_eyebrow"} bordered={false} divider />
          <EditRow label="Headline" value={String(config.contact_title ?? "")} placeholder="Contact Us" big onClick={() => startEdit("contact_title", String(config.contact_title ?? ""))} isSaved={saved === "contact_title"} bordered={false} divider />
          <EditRow label="Supporting line" value={String(config.contact_subtitle ?? "")} placeholder="We'd love to hear from you." onClick={() => startEdit("contact_subtitle", String(config.contact_subtitle ?? ""))} isSaved={saved === "contact_subtitle"} bordered={false} />
        </EditRowGroup>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <TapToEdit label="Form title" value={String(config.contact_form_title ?? "")} placeholder="Send us a message" onClick={() => startEdit("contact_form_title", String(config.contact_form_title ?? ""))} isSaved={saved === "contact_form_title"} />
          <TapToEdit label="Form note" value={String(config.contact_form_subtitle ?? "")} placeholder="We will reply soon" onClick={() => startEdit("contact_form_subtitle", String(config.contact_form_subtitle ?? ""))} isSaved={saved === "contact_form_subtitle"} />
        </div>
      </div>
      </>
      )}

      {view === "catalog" && showCatalog && (
      <>
      <BackHeader label={catalogTileLabel} onBack={() => setView("hub")} pages={pagesNavItems} currentView={view} onNavigate={setView} />
      <div style={{ padding: "10px 20px 0" }}>
        <SectionIntro eyebrow={isFoodCatalog ? "Menu" : "Shop"} title={isFoodCatalog ? "Build the menu guests order from." : "Build the products customers buy."} body={isFoodCatalog ? "Keep every item easy to scan, price, and order from a phone." : "Set names, photos, prices, options, and inventory."} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 18 }}>
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
                <button
                  onClick={() => setConfirmAction({
                    title: `Remove ${cat.category}?`,
                    message: cat.items.length > 0
                      ? `This removes the category and all ${cat.items.length} item${cat.items.length === 1 ? "" : "s"} in it. This can't be undone.`
                      : "This can't be undone.",
                    confirmLabel: "Remove",
                    onConfirm: () => removeMenuCategory(catIdx),
                  })}
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
      </>
      )}

      {view === "services" && !isFoodCatalog && (
      <>
      <BackHeader label="Services" onBack={() => setView("hub")} pages={pagesNavItems} currentView={view} onNavigate={setView} />
      <div style={{ padding: "10px 20px 0" }}>
        <SectionIntro eyebrow="Services" title="Show what you offer." body="Keep the service list short, plain, and easy to understand." />
        <div style={{ marginTop: 18 }}>
          <PageTab label="Services" href={`https://${company.slug}.foundco.app/services`} />
        </div>

        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {services.map((svc, i) => (
            <ServiceCard
              key={i} index={i}
              name={svc.name} description={svc.description}
              isEditing={editingService === i}
              onEdit={() => setEditingService(i)}
              onSave={saveService}
              onRemove={() => setConfirmAction({
                title: `Remove ${svc.name}?`,
                message: "This can't be undone.",
                confirmLabel: "Remove",
                onConfirm: () => removeService(i),
              })}
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
      </>
      )}

      {view === "photos" && (
      <>
      <BackHeader label="Gallery" onBack={() => setView("hub")} pages={pagesNavItems} currentView={view} onNavigate={setView} />
      <div id="site-photos" style={{ padding: "10px 20px 0" }}>
        <SectionIntro eyebrow="Photos" title="Choose the photos customers see." body={missingPhotoSlots ? `${missingPhotoSlots} site photo spots still need owner photos. Stock can stay until better photos are ready.` : "The important photo spots have owner photos assigned."} />
        <div style={{ marginTop: 18 }}>
          <PageTab label="Gallery" href={`https://${company.slug}.foundco.app/gallery`} />
        </div>

        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>

          {galleryPhotos.length > 0 && (
            <div>
              <div style={{ ...TYPE.caption, color: "#34D399", marginBottom: 10 }}>
                Your photos - live on your gallery
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                {galleryPhotos.map(p => (
                  <div key={p.id} style={{ position: "relative", borderRadius: 14, overflow: "hidden", aspectRatio: "1" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button onClick={() => handleAssignPhoto(p.id, null)} style={{ position: "absolute", inset: 0, backgroundColor: "transparent", border: "none", cursor: "pointer" }}>
                      <div style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 10 }}>x</div>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

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

          {stockImages.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
                  Placeholder photos - tap x to remove
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
                        const previous = stockImages
                        setStockImages(prev => prev.filter(u => u !== url))
                        startTransition(async () => {
                          const result = await removeStockImage(url)
                          if (result && "error" in result) {
                            setStockImages(previous)
                            flashSaveError("Couldn't remove that photo. Try again.")
                          }
                        })
                      }}
                      style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.8)", border: "none", cursor: "pointer", color: "rgba(255,120,120,0.9)", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}
                      aria-label="Remove this stock photo"
                    >x</button>
                    <div style={{ position: "absolute", bottom: 5, left: 7, fontSize: 9, color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: "0.06em" }}>STOCK</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
      </>
      )}

      {view === "businessInfo" && (
      <>
      <BackHeader label="Business Info" onBack={() => setView("hub")} />
      <div style={{ padding: "10px 20px 0" }}>
        <SectionIntro eyebrow="Business info" title="Used everywhere on your site." body="Your name, phone, email, and address show up in the footer, contact page, and nav - not just one place." />
        <div style={{ marginTop: 18, display: "flex", flexDirection: "column" as const, gap: 10 }}>
          <BizInfoField label="Business name" value={businessInfo.name} placeholder="Your business name" saving={savingBizField === "name"} justSaved={savedBizField === "name"} onSave={v => saveBusinessField("name", v)} />
          <BizInfoField label="Phone" value={businessInfo.phone} placeholder="(520) 555-0100" type="tel" saving={savingBizField === "phone"} justSaved={savedBizField === "phone"} onSave={v => saveBusinessField("phone", v)} />
          <BizInfoField label="Email" value={businessInfo.email} placeholder="you@yourbusiness.com" type="email" saving={savingBizField === "email"} justSaved={savedBizField === "email"} onSave={v => saveBusinessField("email", v)} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <BizInfoField label="City" value={businessInfo.city} placeholder="Tucson" saving={savingBizField === "city"} justSaved={savedBizField === "city"} onSave={v => saveBusinessField("city", v)} />
            <BizInfoField label="State" value={businessInfo.state} placeholder="AZ" saving={savingBizField === "state"} justSaved={savedBizField === "state"} onSave={v => saveBusinessField("state", v)} />
          </div>
        </div>
      </div>
      </>
      )}

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
                  onClick={() => setConfirmAction({
                    title: menuItemDraft.name ? `Remove ${menuItemDraft.name}?` : "Remove this item?",
                    message: "This can't be undone.",
                    confirmLabel: "Remove",
                    onConfirm: () => { void removeMenuItem(editingMenuItem.catIdx, editingMenuItem.itemIdx!) },
                  })}
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

      {photoPickerSlot && (() => {
        const activeSlot = photoSlots.find(slot => slot.slot === photoPickerSlot)
        if (!activeSlot) return null
        return (
          <>
            <div onClick={() => setPhotoPickerSlot(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.72)", zIndex: 60, backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}/>
            <div style={{
              position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 70,
              top: "calc(env(safe-area-inset-top, 0px) + 14px)", overflowY: "auto", overscrollBehavior: "contain",
              backgroundColor: "#111613", borderTop: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "26px 26px 0 0", padding: "18px 20px calc(env(safe-area-inset-bottom, 0px) + 26px)",
              boxShadow: "0 -24px 70px rgba(0,0,0,0.45)",
            }}>
              <div style={{ width: 38, height: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.16)", margin: "0 auto 20px" }}/>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
                <div>
                  <div style={{ ...TYPE.caption, color: `${GREEN}cc`, marginBottom: 6 }}>{activeSlot.label} Photo</div>
                  <h3 style={{ margin: 0, ...TYPE.title, color: "white" }}>{activeSlot.helper}</h3>
                </div>
                <button onClick={() => setPhotoPickerSlot(null)} style={{ width: 38, height: 38, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", fontSize: 20, fontWeight: 500, cursor: "pointer" }}>x</button>
              </div>

              {pickerPhotos.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                  {pickerPhotos.map(photo => {
                    const selected = photo.website_section === activeSlot.slot
                    return (
                      <button key={photo.id} onClick={() => handleAssignPhoto(photo.id, activeSlot.slot)} style={{ padding: 0, border: selected ? `2px solid ${GREEN}` : "1px solid rgba(255,255,255,0.1)", borderRadius: 18, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.05)", cursor: "pointer", textAlign: "left", boxShadow: selected ? `0 0 0 4px ${GREEN}22` : "none" }}>
                        <div style={{ position: "relative", aspectRatio: "4 / 3", backgroundColor: "rgba(255,255,255,0.04)" }}>
                          {isVideoMedia(photo.url, photo.mime_type) ? (
                            <VideoThumb src={photo.url} />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={photo.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          )}
                          {isVideoMedia(photo.url, photo.mime_type) && (
                            <div style={{ position: "absolute", left: 10, top: 10, padding: "5px 8px", borderRadius: 999, backgroundColor: "rgba(0,0,0,0.72)", color: "white", fontSize: 10, fontWeight: 900, letterSpacing: "0.08em" }}>VIDEO</div>
                          )}
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

              {activeSlot.photos.length > 0 && (
                <button onClick={() => handleClearPhotoSlot(activeSlot.slot)} style={{ width: "100%", marginTop: 14, padding: "14px 0", borderRadius: 16, border: "1px solid rgba(255,80,80,0.24)", backgroundColor: "rgba(255,80,80,0.12)", color: "rgba(255,120,120,0.9)", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
                  Remove {activeSlot.label} Photo{activeSlot.slot === "gallery" && activeSlot.photos.length > 1 ? "s" : ""}
                </button>
              )}
            </div>
          </>
        )
      })()}
      {editing && (
        <div onTouchStart={handleEditorTouchStart} onTouchMove={handleEditorTouchMove} style={{ position: "fixed", inset: 0, zIndex: 90, backgroundColor: "#111613", display: "flex", flexDirection: "column", overflow: "hidden", overscrollBehavior: "none", touchAction: "none" }}>
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
                  contact_eyebrow: "Contact Label",
                  contact_title: "Contact Headline",
                  contact_subtitle: "Contact Supporting Line",
                  contact_form_title: "Form Headline",
                  contact_form_subtitle: "Form Supporting Line",
                  announcement_title: "Featured Update Headline",
                  announcement_body: "Featured Update Copy",
                  announcement_cta_label: "Featured Update Button",
                  announcement_cta_href: "Featured Update Link",
                }[editing] ?? editing}
              </div>
              <button onClick={() => saveEdit(editing)} style={{ justifySelf: "end", padding: "10px 0", border: "none", background: "transparent", color: GREEN, fontSize: 15, fontWeight: 900, cursor: "pointer" }}>Save</button>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflow: "hidden", overscrollBehavior: "none", padding: "22px 20px calc(env(safe-area-inset-bottom, 0px) + 22px)", display: "flex", flexDirection: "column" }}>
            {[
              "about_text",
              "hero_subtitle",
              "contact_subtitle",
              "contact_form_subtitle",
            ].includes(editing) ? (
              <textarea
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                data-found-editor-scrollable="true"
                autoFocus rows={6}
                style={{ width: "100%", height: editing === "about_text" ? "min(42dvh, 320px)" : 190, maxHeight: "42dvh", overflowY: "auto", padding: "16px 18px", borderRadius: 18, backgroundColor: "rgba(255,255,255,0.07)", border: `1.5px solid ${GREEN}44`, color: "white", fontSize: 17, outline: "none", resize: "none", lineHeight: 1.55, boxSizing: "border-box", fontFamily: "inherit", overscrollBehavior: "contain", touchAction: "pan-y" }}
              />
            ) : (
              <input
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                data-found-editor-scrollable="true"
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

      {view === "domain" && (
      <>
      <BackHeader label="Domain" onBack={() => setView("hub")} />
      <div id="launch-trust" style={{ padding: "10px 20px 0" }}>
        <div style={{ marginBottom: 16 }}>
          <SectionIntro eyebrow="Domain" title="Connect a business domain." body="Keep the foundco.app URL while testing, or connect a domain so customers see the business name in the address bar." />
        </div>
        <DomainConnector
          initialDomain={(initialConfig?.custom_domain as string | null) ?? null}
          plan={plan}
          subscriptionStatus={subscriptionStatus}
          companySlug={company.slug}
        />
      </div>
      </>
      )}

      {/* Shared confirm-before-delete sheet. Renders above everything else,
          including the full-screen edit sheet, since a Remove button inside
          the item editor also routes through this. */}
      {confirmAction && (
        <>
          <div onClick={() => setConfirmAction(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", zIndex: 96, backdropFilter: "blur(4px)" }} />
          <div style={{ position: "fixed", left: 20, right: 20, bottom: "calc(28px + env(safe-area-inset-bottom))", zIndex: 97, backgroundColor: "#111613", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: "22px 20px", boxShadow: "0 -20px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: "white", marginBottom: 6 }}>{confirmAction.title}</div>
            <p style={{ margin: "0 0 18px", fontSize: 14, lineHeight: 1.5, color: "rgba(255,255,255,0.6)" }}>{confirmAction.message}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmAction(null)} style={{ flex: 1, padding: "13px 0", borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent", color: "rgba(255,255,255,0.7)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Cancel</button>
              <button
                onClick={() => { const action = confirmAction; setConfirmAction(null); action?.onConfirm() }}
                style={{ flex: 1, padding: "13px 0", borderRadius: 14, border: "none", backgroundColor: "#FF453A", color: "white", fontWeight: 800, fontSize: 14, cursor: "pointer" }}
              >
                {confirmAction.confirmLabel}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Shared save-failure toast - a save that silently fails is worse
          than no feedback, since the owner walks away thinking it's live. */}
      {saveError && (
        <div style={{ position: "fixed", left: 16, right: 16, bottom: "calc(90px + env(safe-area-inset-bottom))", zIndex: 80, backgroundColor: "#2A1213", border: "1px solid rgba(255,69,58,0.35)", borderRadius: 16, padding: "13px 16px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 10px 30px rgba(0,0,0,0.4)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF9B95" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#FF9B95", flex: 1 }}>{saveError}</span>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// Hub tile - quiet card, no icon badge. Typography carries the hierarchy.
// See DESIGN_DECISIONS.md [2026-07-27].
// Filled circular chevron badge - the "click me" affordance every tappable
// card in the hub uses, big and high-contrast instead of a faint stray mark.
// Video thumbnail that actually shows a frame. `preload="metadata"` alone
// doesn't reliably paint a visible frame on phones - same root cause as the
// "black video thumbnails" bug fixed in the Photos grid (July 19). Force
// real video-data loading and fade in once a frame is ready, same pattern.
function VideoThumb({ src }: { src: string }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <video
      src={src}
      muted autoPlay loop playsInline preload="auto"
      onLoadedData={() => setLoaded(true)}
      onCanPlay={() => setLoaded(true)}
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: loaded ? 1 : 0, transition: "opacity 180ms ease" }}
    />
  )
}

function TapChevronBadge() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M9 6l6 6-6 6"/></svg>
  )
}

function HubTile({ label, sub, flag, onClick, href }: { label: string; sub: string; flag?: string; onClick?: () => void; href?: string }) {
  const sharedStyle: React.CSSProperties = {
    borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.035)",
    padding: "16px 12px 14px 15px", textAlign: "left", cursor: "pointer",
    display: "flex", flexDirection: "row", alignItems: "center", gap: 8, minHeight: 78,
    textDecoration: "none",
  }
  const inner = (
    <>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
        <span style={{ ...TYPE.headline, color: "white" }}>{label}</span>
        {flag && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, ...TYPE.footnote, color: GREEN }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: GREEN, boxShadow: `0 0 8px ${GREEN}44`, flexShrink: 0 }} />
            {flag}
          </span>
        )}
        <span style={{ ...TYPE.subhead, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>{sub}</span>
      </span>
      <TapChevronBadge />
    </>
  )
  if (href) return <a href={href} style={sharedStyle}>{inner}</a>
  return <button type="button" onClick={onClick} style={sharedStyle}>{inner}</button>
}

// Renders straight onto document.body, escaping any ancestor's stacking
// context. Without this, a fixed-position full-screen panel nested inside
// a `position: sticky` ancestor (like BackHeader below) can never visually
// out-rank a sibling z-indexed element elsewhere in the tree (the app's own
// persistent dashboard header) no matter how high its own z-index is set -
// z-index only competes within the nearest ancestor stacking context.
// Same pattern already used in LeadContactSheet/ActivateOverlay/etc.
function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  return createPortal(children, document.body)
}

// Shared back-to-hub header for every drilled-in page/section. Sticks under the
// main dashboard header (via --found-header-h, measured in SiteEditor) so the
// owner always has a way back without scrolling to the top of a long section.
// When `pages` is given, tapping the section label drops down a full-width
// panel (portaled to body - see Portal above) instead of a hub detour.
function BackHeader({ label, onBack, pages, currentView, onNavigate }: {
  label: string
  onBack: () => void
  pages?: { view: View; label: string }[]
  currentView?: View
  onNavigate?: (view: View) => void
}) {
  const [open, setOpen] = useState(false)
  const rowRef = useRef<HTMLDivElement>(null)
  const [rowHeight, setRowHeight] = useState(62)
  const current = pages?.find(p => p.view === currentView)

  // Measure this row's real height (not a guessed constant) so the dropdown
  // panel below can be positioned exactly under it regardless of device
  // text-size settings, same measurement approach already used for
  // --found-header-h in SiteEditor.
  useEffect(() => {
    if (!rowRef.current) return
    const el = rowRef.current
    const update = () => setRowHeight(el.getBoundingClientRect().height)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div style={{
      position: "sticky",
      top: "var(--found-header-h, 0px)",
      zIndex: 30,
      backgroundColor: BLACK,
      borderBottom: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div ref={rowRef} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 20px" }}>
        <button type="button" onClick={onBack} style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.035)", display: "flex", alignItems: "center", justifyContent: "center", color: `rgba(255,255,255,${TEXT_OPACITY.secondary})`, cursor: "pointer", flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
        </button>

        {pages && pages.length > 0 ? (
          // Reads as a page title, not a UI control. Tapping it (or tapping
          // it again) opens/closes the dropdown below - it IS the control,
          // there's no separate close button inside the panel anymore.
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", padding: 0, cursor: "pointer" }}
          >
            <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", color: "white" }}>{current?.label ?? label}</span>
            <span style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.09)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.18s ease" }}><polyline points="6 9 12 15 18 9"/></svg>
            </span>
          </button>
        ) : (
          <span style={{ ...TYPE.caption, color: GREEN }}>{label}</span>
        )}
      </div>

      {pages && pages.length > 0 && (
        // Full-width panel dropping down from under this row - not a
        // full-screen takeover. This is a dashboard tool, not the public
        // site: the owner isn't navigating away, just picking a different
        // part of the same page, so the persistent FOUND header and this
        // row both stay visible above it, and the real page stays visible
        // (dimmed) below it, so it reads as "an overlay on this page," the
        // same convention the photo picker sheet already uses, just
        // flipped to drop from the top instead of rise from the bottom.
        // Portaled to body for the same reason as before: nested inside
        // this row's `position: sticky` ancestor, a fixed-position child's
        // z-index is trapped in that ancestor's local stacking context and
        // can never out-rank the persistent dashboard header elsewhere in
        // the tree no matter how high its own z-index is set.
        <Portal>
          <div
            onClick={() => setOpen(false)}
            style={{
              // Starts at the same offset as the panel, not inset:0 - the
              // scrim must not dim the FOUND header or this row above it,
              // that's the whole point of keeping them visible.
              position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 65,
              top: `calc(var(--found-header-h, 56px) + ${rowHeight}px)`,
              backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)",
              opacity: open ? 1 : 0, visibility: open ? "visible" : "hidden",
              transition: "opacity 190ms ease",
            }}
          />
          <div style={{
            position: "fixed", left: 0, right: 0, zIndex: 70,
            top: `calc(var(--found-header-h, 56px) + ${rowHeight}px)`,
            height: "60vh",
            backgroundColor: "#111111",
            borderBottom: `3px solid ${GREEN}`,
            boxShadow: "0 24px 50px rgba(0,0,0,0.5)",
            transform: open ? "translateY(0)" : "translateY(-100%)",
            transition: "transform 190ms cubic-bezier(0.4, 0, 0.2, 1)",
            visibility: open ? "visible" : "hidden",
            overflowY: "auto",
            padding: "14px 24px 20px",
          }}>
            {/* Small, deliberate "you're editing, not browsing" anchor - the
                list itself is modeled on the public site's own nav, so this
                quiet label plus the per-row edit icon below are there so the
                admin/editing context reads even if the eye locks onto the
                big list before registering the surrounding dashboard chrome. */}
            <div style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, marginBottom: 10 }}>Editing - jump to a page</div>
            {pages.map((p, i) => {
              const active = p.view === currentView
              return (
                <button
                  key={p.view}
                  type="button"
                  disabled={active}
                  onClick={() => { onNavigate?.(p.view); setOpen(false) }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, width: "100%",
                    padding: "17px 0", border: "none", borderBottom: "1px solid rgba(255,255,255,0.1)",
                    backgroundColor: "transparent", textAlign: "left", cursor: active ? "default" : "pointer",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "baseline", gap: 16, minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 900, color: GREEN, letterSpacing: "0.1em", flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                    <span style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.02em", color: active ? GREEN : "white" }}>{p.label}</span>
                  </span>
                  {active ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  )}
                </button>
              )
            })}
          </div>
        </Portal>
      )}
    </div>
  )
}

// Business Info field - saves itself on blur, no Save button. Matches the
// "easy as taking a picture" bar: type, look away, it's already saved.
function BizInfoField({ label, value, placeholder, type, saving, justSaved, onSave }: {
  label: string; value: string; placeholder: string; type?: string
  saving: boolean; justSaved: boolean; onSave: (value: string) => void
}) {
  const [local, setLocal] = useState(value)
  useEffect(() => { setLocal(value) }, [value])
  return (
    <div style={{ borderRadius: 16, padding: "14px 15px", backgroundColor: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>{label}</span>
        {(saving || justSaved) && (
          <span style={{ ...TYPE.footnote, color: justSaved ? GREEN : `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>{saving ? "Saving..." : "Saved"}</span>
        )}
      </div>
      <input
        type={type ?? "text"}
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={() => { if (local.trim() !== value.trim()) onSave(local) }}
        placeholder={placeholder}
        style={{ width: "100%", background: "none", border: "none", outline: "none", color: "white", fontSize: 17, fontWeight: 500, fontFamily: "inherit", padding: 0 }}
      />
    </div>
  )
}

function SectionIntro({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div>
      <div style={{ ...TYPE.caption, color: GREEN, marginBottom: 8 }}>{eyebrow}</div>
      <h2 style={{ margin: 0, ...TYPE.title, color: "white" }}>{title}</h2>
      <p style={{ margin: "6px 0 0", ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, lineHeight: 1.45 }}>{body}</p>
    </div>
  )
}

// Groups several EditRows (with bordered={false}) into one continuous
// surface with hairline dividers between rows, instead of a separate
// bordered bubble per field - same fix the Estimate builder shipped for
// its own "feels like a database" complaint (five boxes -> one surface).
function EditRowGroup({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)", overflow: "hidden" }}>
      {children}
    </div>
  )
}

// Shared editable row: plain-noun label (not a "Change ___" command) with the
// current value below and an explicit green "Edit" pill - the same pattern
// Homepage's headline/supporting-line rows already use. Pass bordered={false}
// to render as a flush row inside an EditRowGroup instead of its own bubble.
function EditRow({ label, value, placeholder, big, onClick, isSaved, bordered = true, divider = false }: {
  label: string; value: string; placeholder: string; big?: boolean; onClick: () => void; isSaved?: boolean
  bordered?: boolean; divider?: boolean
}) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 14, width: "100%", boxSizing: "border-box" as const,
      padding: bordered ? 14 : "16px 16px",
      borderRadius: bordered ? 18 : 0,
      border: bordered ? "1px solid rgba(255,255,255,0.08)" : "none",
      borderBottom: divider ? "1px solid rgba(255,255,255,0.06)" : "none",
      backgroundColor: bordered ? "rgba(255,255,255,0.035)" : "transparent",
      textAlign: "left", cursor: "pointer", position: "relative",
    }}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", ...TYPE.caption, color: "rgba(255,255,255,0.48)", marginBottom: 5 }}>{label}</span>
        <span style={{
          display: "block",
          fontSize: big ? 22 : 15,
          fontWeight: big ? 300 : 700,
          letterSpacing: big ? "-0.02em" : undefined,
          lineHeight: big ? 1.15 : 1.35,
          color: value ? "white" : "rgba(255,255,255,0.32)",
          fontStyle: value ? "normal" : "italic",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {value || placeholder}
        </span>
      </span>
      <span style={{ color: GREEN, fontSize: 13, fontWeight: 900, flexShrink: 0 }}>Edit</span>
      {isSaved && <div style={{ position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: "50%", backgroundColor: GREEN, boxShadow: `0 0 6px ${GREEN}` }}/>}
    </button>
  )
}
// Page Tab
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

// Tap To Edit pill
function TapToEdit({ label, value, placeholder, onClick, isSaved, flex }: {
  label: string; value: string; placeholder: string
  onClick: () => void; isSaved: boolean; flex?: number
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

// AI Bar
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
        {isLoading ? <Spinner color={color}/> : <span style={{ fontSize: 13 }}>AI</span>}
        <span style={{ fontSize: 12, fontWeight: 700, color: isLoading ? "rgba(255,255,255,0.25)" : color }}>
          {isLoading ? "Writing..." : "Rewrite"}
        </span>
      </div>
    </button>
  )
}

// Spinner
function Spinner({ color }: { color: string }) {
  return (
    <div style={{ width: 12, height: 12, borderRadius: "50%", border: `2px solid ${color}33`, borderTopColor: color, animation: "spin 0.7s linear infinite" }}/>
  )
}

// Service Card
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
