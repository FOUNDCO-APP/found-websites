"use client"

import React, { useState } from "react"
import Link from "next/link"
import { updateMenuItems, uploadMenuItemPhoto } from "@/app/dashboard/(app)/site/actions"
import { TYPE, TEXT_OPACITY, GREEN, BLACK } from "@/lib/dashboard/typography"
import type { CatalogSettings } from "@/types/company"

type CatalogDetail = { label: string; value: string }
type CatalogOption = { label: string; choices: string[] }
type CatalogVariant = { id: string; options: Record<string, string>; stock: number | null }
type FulfillmentMode = "pickup" | "shipping" | "both" | "unavailable"
type CatalogItem = {
  name: string
  description: string
  price: string | null
  photo_url?: string | null
  images?: string[] | null
  details?: CatalogDetail[] | null
  options?: CatalogOption[] | null
  variants?: CatalogVariant[] | null
  inventory_tracking?: boolean | null
  fulfillment?: "inherit" | FulfillmentMode | null
  availability?: "active" | "hidden" | "sold_out" | null
  sizes?: string | null
  materials?: string | null
  shipping_note?: string | null
}
type CatalogCategory = { category: string; items: CatalogItem[]; catalog_settings?: CatalogSettings | null }
type CatalogMode = "menu" | "products"
type ItemDraft = {
  name: string
  price: string
  description: string
  photo_url: string
  images: string[]
  sizes: string
  materials: string
  shipping_note: string
  details: CatalogDetail[]
  options: CatalogOption[]
  variants: CatalogVariant[]
  inventory_tracking: boolean
  availability: "active" | "hidden" | "sold_out"
}

type Props = {
  mode: CatalogMode
  companyName: string
  slug: string
  initialCategories: CatalogCategory[]
}

const COPY = {
  menu: {
    title: "Menu",
    eyebrow: "What guests can order",
    body: "Keep the food people can buy from your site simple, current, and easy to choose.",
    previewPath: "/menu",
    previewLabel: "View live menu",
    categoryNoun: "menu category",
    itemNoun: "menu item",
    addCategory: "Add a menu category",
    addItem: "Add menu item",
    emptyTitle: "Start with one category.",
    emptyBody: "Add Tacos, Plates, Drinks, or whatever makes the menu easy to scan.",
    categoryPlaceholder: "e.g. Tacos, Plates, Drinks",
    itemPlaceholder: "Menu item name",
    descPlaceholder: "Ingredients, allergens, prep notes, or what makes it special",
    save: "Save to Menu",
    photoLabel: "Dish photos",
  },
  products: {
    title: "Products",
    eyebrow: "Catalog studio",
    body: "Build the products customers can see, understand, and buy from your site.",
    previewPath: "/shop",
    previewLabel: "View live shop",
    categoryNoun: "product category",
    itemNoun: "product",
    addCategory: "Add a product category",
    addItem: "Add product",
    emptyTitle: "Start with one product category.",
    emptyBody: "Add Shirts, Hats, Featured, or another simple group customers understand immediately.",
    categoryPlaceholder: "e.g. Shirts, Hats, Featured",
    itemPlaceholder: "Product name",
    descPlaceholder: "Short description customers will see first",
    save: "Save Product",
    photoLabel: "Product photos",
  },
} as const

const EMPTY_DRAFT: ItemDraft = { name: "", price: "", description: "", photo_url: "", images: [], sizes: "", materials: "", shipping_note: "", details: [], options: [], variants: [], inventory_tracking: false, availability: "active" }
const DEFAULT_SETTINGS: Required<CatalogSettings> = { fulfillment: "both", payment_behavior: "online_required" }
const SIZE_PRESET = ["XS", "S", "M", "L", "XL", "XXL"]
const COMMON_SIZE_PRESET = ["Small", "Medium", "Large", "XL"]
const COLOR_PRESET = ["Black", "White", "Gray", "Blue", "Green", "Red"]

function uniqueImages(item: CatalogItem | ItemDraft) {
  return Array.from(new Set([item.photo_url || "", ...(item.images ?? [])].map(image => image.trim()).filter(Boolean))).slice(0, 6)
}

function titleCase(value: string) {
  return value.trim().replace(/\s+/g, " ").replace(/\b\w/g, char => char.toUpperCase())
}

function normalizeOptions(options: CatalogOption[] | null | undefined) {
  const map = new Map<string, { label: string; choices: string[] }>()
  for (const option of options ?? []) {
    const label = titleCase(option.label || "")
    if (!label) continue
    const key = label.toLowerCase()
    const current = map.get(key) ?? { label, choices: [] }
    for (const choice of option.choices ?? []) {
      const clean = String(choice || "").trim().replace(/\s+/g, " ")
      if (clean && !current.choices.some(existing => existing.toLowerCase() === clean.toLowerCase())) current.choices.push(clean)
    }
    current.choices = current.choices.slice(0, 24)
    map.set(key, current)
  }
  return Array.from(map.values()).filter(option => option.choices.length).slice(0, 4)
}

function variantId(options: Record<string, string>) {
  return Object.entries(options).map(([label, value]) => `${label}:${value}`).join("|")
}

function buildVariantMatrix(options: CatalogOption[]) {
  const normalized = normalizeOptions(options)
  if (!normalized.length) return []
  let rows: Record<string, string>[] = [{}]
  for (const option of normalized) {
    const next: Record<string, string>[] = []
    for (const row of rows) {
      for (const choice of option.choices) next.push({ ...row, [option.label]: choice })
    }
    rows = next.slice(0, 500)
  }
  return rows.map(optionsRecord => ({ id: variantId(optionsRecord), options: optionsRecord, stock: null as number | null }))
}

function normalizeVariants(options: CatalogOption[], variants: CatalogVariant[] | null | undefined, trackInventory: boolean) {
  const matrix = buildVariantMatrix(options)
  const existing = new Map<string, CatalogVariant>()
  for (const variant of variants ?? []) {
    if (variant?.id) existing.set(variant.id, variant)
    if (variant?.options) existing.set(variantId(variant.options), variant)
  }
  return matrix.map(variant => {
    const previous = existing.get(variant.id)
    const rawStock = previous?.stock
    const stock = trackInventory ? (rawStock === null || rawStock === undefined ? null : Math.max(0, Math.floor(Number(rawStock)))) : null
    return { ...variant, stock: Number.isFinite(stock as number) ? stock : null }
  })
}

function normalizeSettings(settings: CatalogSettings | null | undefined): Required<CatalogSettings> {
  const fulfillment = settings?.fulfillment === "pickup" || settings?.fulfillment === "shipping" || settings?.fulfillment === "both" || settings?.fulfillment === "unavailable" ? settings.fulfillment : DEFAULT_SETTINGS.fulfillment
  const paymentBehavior = settings?.payment_behavior === "pay_later" ? "pay_later" : DEFAULT_SETTINGS.payment_behavior
  return { fulfillment, payment_behavior: paymentBehavior }
}
function normalizeCategories(categories: CatalogCategory[], settings?: CatalogSettings) {
  const normalizedSettings = settings ? normalizeSettings(settings) : null
  return categories.map((category, categoryIndex) => ({
    category: category.category,
    catalog_settings: categoryIndex === 0 ? (normalizedSettings ?? normalizeSettings(category.catalog_settings)) : null,
    items: category.items.map((item) => {
      const images = uniqueImages(item)
      const options = normalizeOptions(item.options)
      const inventoryTracking = Boolean(item.inventory_tracking)
      const variants = normalizeVariants(options, item.variants, inventoryTracking)
      return {
        name: item.name,
        description: item.description,
        price: item.price,
        photo_url: images[0] ?? null,
        images: images.length ? images : null,
        details: item.details?.filter(detail => detail.label.trim() && detail.value.trim()) ?? null,
        options: options.length ? options : null,
        variants: variants.length ? variants : null,
        inventory_tracking: inventoryTracking,
        fulfillment: item.fulfillment ?? "inherit",
        availability: item.availability ?? "active",
        sizes: item.sizes?.trim() || null,
        materials: item.materials?.trim() || null,
        shipping_note: item.shipping_note?.trim() || null,
      }
    }),
  }))
}
function priceLabel(price: string | null | undefined) {
  if (!price) return ""
  const match = price.replace(/,/g, "").match(/(\d+(?:\.\d{1,2})?)/)
  if (!match) return price
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(match[1]))
}

function inputStyle(extra: React.CSSProperties = {}): React.CSSProperties {
  return { width: "100%", boxSizing: "border-box", padding: "14px 15px", borderRadius: 14, backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.11)", color: "white", ...TYPE.body, outline: "none", ...extra }
}

export default function CatalogManager({ mode, companyName, slug, initialCategories }: Props) {
  const copy = COPY[mode]
  const isProducts = mode === "products"
  const initialSettings = normalizeSettings(initialCategories.find(category => category.catalog_settings)?.catalog_settings ?? initialCategories[0]?.catalog_settings)
  const [catalogSettings, setCatalogSettings] = useState<Required<CatalogSettings>>(initialSettings)
  const [categories, setCategories] = useState<CatalogCategory[]>(normalizeCategories(initialCategories, initialSettings))
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null)
  const [categoryActionIndex, setCategoryActionIndex] = useState<number | null>(null)
  const [categoryDraftName, setCategoryDraftName] = useState("")
  const [editingItem, setEditingItem] = useState<{ catIndex: number; itemIndex: number | null } | null>(null)
  const [itemDraft, setItemDraft] = useState<ItemDraft>(EMPTY_DRAFT)
  const [showDetails, setShowDetails] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const itemCount = categories.reduce((sum, category) => sum + category.items.length, 0)
  const publicHref = `https://${slug}.foundco.app${copy.previewPath}`
  const fulfillmentLabel = catalogSettings.fulfillment === "both" ? (isProducts ? "Pickup and shipping" : "Pickup and delivery") : catalogSettings.fulfillment === "shipping" ? (isProducts ? "Shipping only" : "Delivery only") : catalogSettings.fulfillment === "pickup" ? "Pickup only" : "Checkout paused"

  async function persist(next: CatalogCategory[], settings = catalogSettings) {
    const previous = categories
    setCategories(normalizeCategories(next, settings))
    setSaving(true)
    setError(null)
    const result = await updateMenuItems(normalizeCategories(next, settings))
    setSaving(false)
    if ("error" in result) {
      setCategories(previous)
      setError(result.error || "Could not save. Try again.")
      return false
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
    return true
  }


  async function saveSettings(nextSettings: Required<CatalogSettings>) {
    setCatalogSettings(nextSettings)
    await persist(categories, nextSettings)
  }
  async function addCategory() {
    const name = newCategoryName.trim()
    if (!name || saving) return
    const ok = await persist([...categories, { category: name, items: [] }])
    if (ok) {
      setNewCategoryName("")
      setAddingCategory(false)
    }
  }

  async function removeCategory(index: number) {
    if (saving) return
    const next = [...categories]
    next.splice(index, 1)
    setCategoryActionIndex(null)
    await persist(next)
  }

  async function saveCategoryName(index: number) {
    const name = categoryDraftName.trim()
    if (!name || saving) {
      setEditingCategoryIndex(null)
      return
    }
    const next = categories.map((category, categoryIndex) => categoryIndex === index ? { ...category, category: name } : category)
    const ok = await persist(next)
    if (ok) setEditingCategoryIndex(null)
  }

  function openItem(catIndex: number, itemIndex: number | null) {
    const item = itemIndex !== null ? categories[catIndex]?.items[itemIndex] : null
    const images = item ? uniqueImages(item) : []
    setError(null)
    const options = normalizeOptions(item?.options)
    const trackInventory = Boolean(item?.inventory_tracking)
    setShowDetails(Boolean(options.length || item?.sizes || item?.materials || item?.shipping_note || item?.details?.length || trackInventory))
    setItemDraft({
      name: item?.name ?? "",
      price: item?.price ?? "",
      description: item?.description ?? "",
      photo_url: images[0] ?? "",
      images,
      sizes: item?.sizes ?? "",
      materials: item?.materials ?? "",
      shipping_note: item?.shipping_note ?? "",
      details: item?.details ?? [],
      options,
      variants: normalizeVariants(options, item?.variants, trackInventory),
      inventory_tracking: trackInventory,
      availability: item?.availability ?? "active",
    })
    setEditingItem({ catIndex, itemIndex })
  }

  async function saveItem() {
    if (!editingItem || saving) return
    const name = itemDraft.name.trim()
    if (!name) return
    const images = uniqueImages(itemDraft)
    const details = itemDraft.details.filter(detail => detail.label.trim() && detail.value.trim())
    const options = normalizeOptions(itemDraft.options)
    const variants = normalizeVariants(options, itemDraft.variants, itemDraft.inventory_tracking)
    const nextItem: CatalogItem = {
      name,
      price: itemDraft.price.trim() || null,
      description: itemDraft.description.trim(),
      photo_url: images[0] ?? null,
      images: images.length ? images : null,
      details: details.length ? details : null,
      options: options.length ? options : null,
      variants: variants.length ? variants : null,
      inventory_tracking: itemDraft.inventory_tracking,
      fulfillment: "inherit",
      availability: itemDraft.availability,
      sizes: itemDraft.sizes.trim() || null,
      materials: itemDraft.materials.trim() || null,
      shipping_note: itemDraft.shipping_note.trim() || null,
    }
    const next = categories.map((category, categoryIndex) => {
      if (categoryIndex !== editingItem.catIndex) return category
      const items = [...category.items]
      if (editingItem.itemIndex === null) items.push(nextItem)
      else items[editingItem.itemIndex] = nextItem
      return { ...category, items }
    })
    const ok = await persist(next)
    if (ok) setEditingItem(null)
  }

  async function removeItem(catIndex: number, itemIndex: number) {
    if (saving) return
    const next = categories.map((category, categoryIndex) => {
      if (categoryIndex !== catIndex) return category
      const items = [...category.items]
      items.splice(itemIndex, 1)
      return { ...category, items }
    })
    const ok = await persist(next)
    if (ok) setEditingItem(null)
  }

  async function handlePhotoUpload(file: File) {
    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    const result = await uploadMenuItemPhoto(formData)
    setUploading(false)
    if ("url" in result) {
      setItemDraft((prev) => {
        const images = Array.from(new Set([...(prev.images ?? []), result.url])).slice(0, 6)
        return { ...prev, photo_url: prev.photo_url || result.url, images }
      })
    } else setError(result.error || "Photo could not upload.")
  }

  function setDraftOptions(options: CatalogOption[]) {
    setItemDraft((prev) => {
      const normalized = normalizeOptions(options)
      return { ...prev, options: normalized, variants: normalizeVariants(normalized, prev.variants, prev.inventory_tracking) }
    })
    setShowDetails(true)
  }

  function addPresetOption(label: string, choices: string[]) {
    setDraftOptions([...itemDraft.options.filter(option => option.label.toLowerCase() !== label.toLowerCase()), { label, choices }])
  }

  function toggleChoice(label: string, choice: string) {
    const existing = normalizeOptions(itemDraft.options)
    const current = existing.find(option => option.label.toLowerCase() === label.toLowerCase()) ?? { label, choices: [] }
    const choices = current.choices.some(value => value.toLowerCase() === choice.toLowerCase())
      ? current.choices.filter(value => value.toLowerCase() !== choice.toLowerCase())
      : [...current.choices, choice]
    setDraftOptions([...existing.filter(option => option.label.toLowerCase() !== label.toLowerCase()), { label, choices }])
  }

  function removeDraftOption(label: string) {
    setDraftOptions(itemDraft.options.filter(option => option.label.toLowerCase() !== label.toLowerCase()))
  }

  function updateVariantStock(id: string, value: string) {
    setItemDraft((prev) => ({
      ...prev,
      variants: normalizeVariants(prev.options, prev.variants, prev.inventory_tracking).map(variant => variant.id === id ? { ...variant, stock: value.trim() === "" ? null : Math.max(0, Math.floor(Number(value) || 0)) } : variant),
    }))
  }
  function removeDraftImage(image: string) {
    setItemDraft((prev) => {
      const images = prev.images.filter(url => url !== image)
      return { ...prev, images, photo_url: prev.photo_url === image ? images[0] ?? "" : prev.photo_url }
    })
  }

  return (
    <main style={{ minHeight: "100dvh", backgroundColor: BLACK, padding: "28px 20px 140px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 28 }}>
          <div>
            <p style={{ margin: "0 0 8px", ...TYPE.caption, color: GREEN }}>{copy.eyebrow}</p>
            <h1 style={{ margin: "0 0 8px", ...TYPE.largeTitle, color: "white" }}>{copy.title}</h1>
            <p style={{ margin: 0, ...TYPE.body, lineHeight: 1.5, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>{copy.body}</p>
          </div>
          {saved && <div style={{ flexShrink: 0, borderRadius: 100, padding: "7px 12px", backgroundColor: `${GREEN}16`, color: GREEN, ...TYPE.footnote, fontWeight: 800 }}>Saved</div>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 26 }}>
          <a href={publicHref} target="_blank" rel="noreferrer" style={{ textDecoration: "none", borderRadius: 16, padding: "14px 15px", backgroundColor: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.08)", color: "white", ...TYPE.subhead, fontWeight: 750 }}>{copy.previewLabel}</a>
          <Link href="/site" style={{ textDecoration: "none", borderRadius: 16, padding: "14px 15px", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: `rgba(255,255,255,${TEXT_OPACITY.secondary})`, ...TYPE.subhead, fontWeight: 650 }}>Edit site</Link>
        </div>


        <section style={{ marginBottom: 18, borderRadius: 22, padding: 16, border: "1px solid rgba(255,255,255,0.08)", background: "linear-gradient(135deg, rgba(49,209,88,0.13), rgba(255,255,255,0.035))" }}>
          <p style={{ margin: "0 0 4px", ...TYPE.caption, color: GREEN }}>{fulfillmentLabel}</p>
          <h2 style={{ margin: "0 0 6px", ...TYPE.headline, color: "white" }}>{isProducts ? "How customers receive purchases" : "How guests receive orders"}</h2>
          <p style={{ margin: "0 0 14px", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>{isProducts ? "Set pickup, shipping, both, or pause checkout without making the site look broken." : "Choose what this business can actually handle today."}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
            {(["both", "pickup", "shipping", "unavailable"] as FulfillmentMode[]).map((modeValue) => {
              const active = catalogSettings.fulfillment === modeValue
              const label = modeValue === "both" ? "Both" : modeValue === "shipping" ? (isProducts ? "Ship" : "Deliver") : modeValue === "pickup" ? "Pickup" : "Pause"
              return <button key={modeValue} onClick={() => void saveSettings({ ...catalogSettings, fulfillment: modeValue })} disabled={saving} style={{ border: active ? `1px solid ${GREEN}` : "1px solid rgba(255,255,255,0.09)", borderRadius: 14, padding: "11px 7px", backgroundColor: active ? `${GREEN}18` : "rgba(255,255,255,0.04)", color: active ? GREEN : `rgba(255,255,255,${TEXT_OPACITY.secondary})`, ...TYPE.footnote, fontWeight: 850 }}>{label}</button>
            })}
          </div>
        </section>
        <section style={{ borderRadius: 24, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", background: "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02))" }}>
          <div style={{ padding: "18px 18px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <p style={{ margin: "0 0 3px", ...TYPE.title, color: "white" }}>{companyName}</p>
              <p style={{ margin: 0, ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>{categories.length} categories - {itemCount} items</p>
            </div>
            <button onClick={() => setAddingCategory(true)} style={{ border: "none", borderRadius: 999, padding: "12px 15px", backgroundColor: GREEN, color: BLACK, ...TYPE.subhead, fontWeight: 850, cursor: "pointer" }}>{copy.addCategory}</button>
          </div>

          {error && <p style={{ margin: 18, borderRadius: 14, padding: "12px 13px", backgroundColor: "rgba(255,69,58,0.13)", border: "1px solid rgba(255,69,58,0.28)", color: "#FF453A", ...TYPE.footnote, fontWeight: 760 }}>{error}</p>}

          {categories.length === 0 && !addingCategory && (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <p style={{ margin: "0 0 8px", ...TYPE.title, color: "white" }}>{copy.emptyTitle}</p>
              <p style={{ margin: "0 auto 22px", maxWidth: 430, ...TYPE.body, lineHeight: 1.55, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>{copy.emptyBody}</p>
              <button onClick={() => setAddingCategory(true)} style={{ border: "none", borderRadius: 999, padding: "15px 22px", backgroundColor: GREEN, color: BLACK, ...TYPE.subhead, fontWeight: 850 }}>{copy.addCategory}</button>
            </div>
          )}

          {addingCategory && (
            <div style={{ padding: 18, borderBottom: "1px solid rgba(255,255,255,0.07)", backgroundColor: `${GREEN}08` }}>
              <p style={{ margin: "0 0 9px", ...TYPE.caption, color: GREEN }}>New {copy.categoryNoun}</p>
              <input value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void addCategory()} autoFocus placeholder={copy.categoryPlaceholder} style={inputStyle({ marginBottom: 10 })} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 9 }}>
                <button onClick={() => { setAddingCategory(false); setNewCategoryName("") }} disabled={saving} style={{ borderRadius: 13, padding: "13px 0", border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent", color: `rgba(255,255,255,${TEXT_OPACITY.secondary})`, ...TYPE.subhead, fontWeight: 700 }}>Cancel</button>
                <button onClick={() => void addCategory()} disabled={!newCategoryName.trim() || saving} style={{ borderRadius: 13, padding: "13px 0", border: "none", backgroundColor: newCategoryName.trim() && !saving ? GREEN : "rgba(255,255,255,0.08)", color: newCategoryName.trim() && !saving ? BLACK : `rgba(255,255,255,${TEXT_OPACITY.disabled})`, ...TYPE.subhead, fontWeight: 850 }}>{saving ? "Saving..." : "Add Category"}</button>
              </div>
            </div>
          )}

          {categories.map((category, catIndex) => (
            <div key={`${category.category}-${catIndex}`} style={{ borderTop: catIndex === 0 && !addingCategory ? "none" : "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingCategoryIndex === catIndex ? (
                    <input value={categoryDraftName} onChange={(event) => setCategoryDraftName(event.target.value)} onBlur={() => void saveCategoryName(catIndex)} onKeyDown={(event) => event.key === "Enter" && void saveCategoryName(catIndex)} autoFocus style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "white", ...TYPE.title, fontWeight: 820 }} />
                  ) : (
                    <button onClick={() => { setCategoryDraftName(category.category); setEditingCategoryIndex(catIndex); setCategoryActionIndex(null) }} style={{ display: "block", width: "100%", padding: 0, border: "none", background: "none", color: "white", textAlign: "left", ...TYPE.title, fontWeight: 820, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{category.category}</button>
                  )}
                  <p style={{ margin: "4px 0 0", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>{category.items.length} {category.items.length === 1 ? copy.itemNoun : `${copy.itemNoun}s`}</p>
                </div>
                <button onClick={() => openItem(catIndex, null)} style={{ border: "none", borderRadius: 999, padding: "10px 13px", backgroundColor: `${GREEN}16`, color: GREEN, ...TYPE.footnote, fontWeight: 850 }}>{copy.addItem}</button>
                <button aria-label={`Category actions for ${category.category}`} onClick={() => setCategoryActionIndex(categoryActionIndex === catIndex ? null : catIndex)} style={{ width: 36, height: 36, borderRadius: 999, border: "1px solid rgba(255,255,255,0.07)", backgroundColor: "rgba(255,255,255,0.035)", color: `rgba(255,255,255,${TEXT_OPACITY.secondary})`, ...TYPE.subhead, fontWeight: 850, lineHeight: 1, cursor: "pointer" }}>...</button>
                {categoryActionIndex === catIndex && (
                  <div style={{ position: "absolute", right: 18, top: 58, zIndex: 5, width: 188, borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#151917", boxShadow: "0 18px 45px rgba(0,0,0,0.38)" }}>
                    <button onClick={() => { setCategoryActionIndex(null); setCategoryDraftName(category.category); setEditingCategoryIndex(catIndex) }} style={{ width: "100%", border: "none", padding: "13px 14px", background: "none", color: "white", textAlign: "left", ...TYPE.footnote, fontWeight: 800 }}>Rename category</button>
                    <button onClick={() => void removeCategory(catIndex)} style={{ width: "100%", border: "none", borderTop: "1px solid rgba(255,255,255,0.07)", padding: "13px 14px", background: "none", color: "rgba(255,100,100,0.76)", textAlign: "left", ...TYPE.footnote, fontWeight: 800 }}>Remove category</button>
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gap: 1, backgroundColor: "rgba(255,255,255,0.035)" }}>
                {category.items.map((item, itemIndex) => {
                  const images = uniqueImages(item)
                  return (
                    <button key={`${item.name}-${itemIndex}`} onClick={() => openItem(catIndex, itemIndex)} style={{ border: "none", padding: "16px 18px", backgroundColor: "rgba(8,10,9,0.72)", display: "grid", gridTemplateColumns: "72px minmax(0, 1fr) auto", alignItems: "center", gap: 14, textAlign: "left", cursor: "pointer" }}>
                      {images[0] ? <img src={images[0]} alt="" style={{ width: 72, height: 72, borderRadius: 18, objectFit: "contain", backgroundColor: "rgba(255,255,255,0.96)", flexShrink: 0 }} /> : <div style={{ width: 72, height: 72, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.065)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.34)", ...TYPE.footnote, fontWeight: 850 }}>Photo</div>}
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", ...TYPE.subhead, fontWeight: 850, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
                        <span style={{ display: "block", marginTop: 6, ...TYPE.footnote, color: images.length ? GREEN : "#FFB340", fontWeight: 850 }}>
                          {images.length ? `${images.length} ${images.length === 1 ? "photo" : "photos"}` : "Needs photo"}
                        </span>
                      </span>
                      <span style={{ flexShrink: 0, textAlign: "right", ...TYPE.subhead, fontWeight: 900, color: item.price ? GREEN : "rgba(255,255,255,0.42)", whiteSpace: "nowrap" }}>{item.price ? priceLabel(item.price) : "No price"}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </section>
      </div>

      {editingItem && (
        <>
          <div onClick={() => setEditingItem(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.72)", backdropFilter: "blur(7px)", zIndex: 50 }} />
          <div style={{ position: "fixed", left: 12, right: 12, bottom: "calc(84px + env(safe-area-inset-bottom))", zIndex: 60, maxHeight: "min(82dvh, 720px)", overflowY: "auto", borderRadius: 30, border: "1px solid rgba(255,255,255,0.12)", backgroundColor: "#111613", boxShadow: "0 -26px 90px rgba(0,0,0,0.62)", padding: "22px 20px 24px" }}>
            <div style={{ width: 38, height: 4, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.16)", margin: "0 auto 18px" }} />
            <p style={{ margin: "0 0 15px", ...TYPE.caption, color: GREEN }}>{editingItem.itemIndex === null ? `Add ${copy.itemNoun}` : `Edit ${copy.itemNoun}`}</p>

            <div style={{ marginBottom: 14 }}>
              <p style={{ margin: "0 0 10px", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})`, fontWeight: 800 }}>{copy.photoLabel}</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 9 }}>
                {itemDraft.images.map((image) => (
                  <button key={image} onClick={() => removeDraftImage(image)} style={{ padding: 0, border: itemDraft.photo_url === image ? `2px solid ${GREEN}` : "1px solid rgba(255,255,255,0.1)", borderRadius: 16, overflow: "hidden", background: "rgba(255,255,255,0.06)", aspectRatio: "1 / 1" }} aria-label="Remove photo">
                    <img src={image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </button>
                ))}
                {itemDraft.images.length < 6 && (
                  <label style={{ aspectRatio: "1 / 1", borderRadius: 16, border: `1.5px dashed ${GREEN}44`, backgroundColor: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", color: GREEN, ...TYPE.footnote, fontWeight: 850, cursor: "pointer", textAlign: "center" }}>
                    <input type="file" accept="image/*" hidden onChange={(event) => event.target.files?.[0] && void handlePhotoUpload(event.target.files[0])} />
                    {uploading ? "Uploading" : "Add photo"}
                  </label>
                )}
              </div>
              {itemDraft.images.length > 0 && <p style={{ margin: "8px 0 0", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>Tap a photo to remove it. First photo leads the product.</p>}
            </div>

            <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
              <input value={itemDraft.name} onChange={(event) => setItemDraft((prev) => ({ ...prev, name: event.target.value }))} placeholder={copy.itemPlaceholder} style={inputStyle({ border: `1.5px solid ${GREEN}33` })} />
              <input value={itemDraft.price} onChange={(event) => setItemDraft((prev) => ({ ...prev, price: event.target.value }))} placeholder="Price, e.g. $12.99" inputMode="decimal" style={inputStyle()} />
              <textarea value={itemDraft.description} onChange={(event) => setItemDraft((prev) => ({ ...prev, description: event.target.value }))} placeholder={copy.descPlaceholder} rows={3} style={inputStyle({ lineHeight: 1.45, resize: "none" })} />
            </div>

            {isProducts && (
              <div style={{ marginBottom: 14 }}>
                <button onClick={() => setShowDetails((value) => !value)} style={{ width: "100%", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 16, backgroundColor: "rgba(255,255,255,0.045)", color: "white", padding: "13px 14px", textAlign: "left", ...TYPE.subhead, fontWeight: 820 }}>
                  {showDetails ? "Hide product details" : "Add size, material, and delivery details"}
                </button>
                {showDetails && (
                  <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                    <div style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.035)", padding: 14 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
                        <div>
                          <p style={{ margin: 0, ...TYPE.subhead, color: "white", fontWeight: 900 }}>Customer choices</p>
                          <p style={{ margin: "4px 0 0", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>Tap presets. Customers must choose before adding to cart.</p>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                        <button type="button" onClick={() => addPresetOption("Size", SIZE_PRESET)} style={presetButtonStyle()}>Sizes</button>
                        <button type="button" onClick={() => addPresetOption("Size", COMMON_SIZE_PRESET)} style={presetButtonStyle()}>Simple sizes</button>
                        <button type="button" onClick={() => addPresetOption("Color", COLOR_PRESET)} style={presetButtonStyle()}>Colors</button>
                      </div>
                      {normalizeOptions(itemDraft.options).map((option) => (
                        <div key={option.label} style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 12, marginTop: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 9 }}>
                            <p style={{ margin: 0, ...TYPE.footnote, color: "white", fontWeight: 900 }}>{option.label}</p>
                            <button type="button" onClick={() => removeDraftOption(option.label)} style={{ border: "none", background: "none", color: "rgba(255,105,105,0.9)", ...TYPE.footnote, fontWeight: 850 }}>Remove</button>
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {(option.label.toLowerCase() === "size" ? Array.from(new Set([...option.choices, ...SIZE_PRESET])) : option.label.toLowerCase() === "color" ? Array.from(new Set([...option.choices, ...COLOR_PRESET])) : option.choices).map((choice) => {
                              const active = option.choices.some(value => value.toLowerCase() === choice.toLowerCase())
                              return <button key={choice} type="button" onClick={() => toggleChoice(option.label, choice)} style={{ borderRadius: 999, padding: "9px 12px", border: active ? `1px solid ${GREEN}` : "1px solid rgba(255,255,255,0.1)", backgroundColor: active ? `${GREEN}1E` : "rgba(255,255,255,0.045)", color: active ? GREEN : `rgba(255,255,255,${TEXT_OPACITY.secondary})`, ...TYPE.footnote, fontWeight: 850 }}>{choice}</button>
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {normalizeOptions(itemDraft.options).length > 0 && (
                      <div style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.035)", padding: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
                          <div>
                            <p style={{ margin: 0, ...TYPE.subhead, color: "white", fontWeight: 900 }}>Inventory by choice</p>
                            <p style={{ margin: "4px 0 0", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>Leave blank for unlimited. Enter 0 to show sold out.</p>
                          </div>
                          <button type="button" onClick={() => setItemDraft((prev) => ({ ...prev, inventory_tracking: !prev.inventory_tracking, variants: normalizeVariants(prev.options, prev.variants, !prev.inventory_tracking) }))} style={{ border: "none", borderRadius: 999, padding: "10px 12px", backgroundColor: itemDraft.inventory_tracking ? GREEN : "rgba(255,255,255,0.08)", color: itemDraft.inventory_tracking ? BLACK : `rgba(255,255,255,${TEXT_OPACITY.secondary})`, ...TYPE.footnote, fontWeight: 900 }}>{itemDraft.inventory_tracking ? "Tracking" : "Track stock"}</button>
                        </div>
                        {itemDraft.inventory_tracking && <div style={{ display: "grid", gap: 8 }}>{normalizeVariants(itemDraft.options, itemDraft.variants, true).map((variant) => <div key={variant.id} style={{ display: "grid", gridTemplateColumns: "1fr 104px", gap: 8, alignItems: "center" }}><p style={{ margin: 0, ...TYPE.footnote, color: "white", fontWeight: 850 }}>{Object.values(variant.options).join(" / ")}</p><input value={variant.stock ?? ""} onChange={(event) => updateVariantStock(variant.id, event.target.value)} inputMode="numeric" placeholder="Stock" style={inputStyle({ padding: "11px 12px", textAlign: "center" })} /></div>)}</div>}
                      </div>
                    )}                    <input value={itemDraft.sizes} onChange={(event) => setItemDraft((prev) => ({ ...prev, sizes: event.target.value }))} placeholder="Sizes shown as product info, e.g. Small to XL" style={inputStyle()} />
                    <input value={itemDraft.materials} onChange={(event) => setItemDraft((prev) => ({ ...prev, materials: event.target.value }))} placeholder="Material, finish, or what it is made from" style={inputStyle()} />
                    <input value={itemDraft.shipping_note} onChange={(event) => setItemDraft((prev) => ({ ...prev, shipping_note: event.target.value }))} placeholder="Pickup or shipping note" style={inputStyle()} />
                    <div style={{ display: "grid", gap: 8 }}>
                      {[0, 1, 2].map((index) => {
                        const detail = itemDraft.details[index] ?? { label: "", value: "" }
                        return (
                          <div key={index} style={{ display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: 8 }}>
                            <input value={detail.label} onChange={(event) => setItemDraft((prev) => {
                              const details = [...prev.details]
                              details[index] = { ...(details[index] ?? { label: "", value: "" }), label: event.target.value }
                              return { ...prev, details }
                            })} placeholder="Detail" style={inputStyle()} />
                            <input value={detail.value} onChange={(event) => setItemDraft((prev) => {
                              const details = [...prev.details]
                              details[index] = { ...(details[index] ?? { label: "", value: "" }), value: event.target.value }
                              return { ...prev, details }
                            })} placeholder="What customers should know" style={inputStyle()} />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: editingItem.itemIndex === null ? "1fr 2fr" : "1fr 1fr 2fr", gap: 9 }}>
              {editingItem.itemIndex !== null && <button onClick={() => void removeItem(editingItem.catIndex, editingItem.itemIndex!)} disabled={saving} style={{ borderRadius: 14, padding: "14px 0", border: "1px solid rgba(255,70,70,0.24)", backgroundColor: "rgba(255,70,70,0.11)", color: "rgba(255,105,105,0.88)", ...TYPE.subhead, fontWeight: 800 }}>Remove</button>}
              <button onClick={() => setEditingItem(null)} disabled={saving} style={{ borderRadius: 14, padding: "14px 0", border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent", color: `rgba(255,255,255,${TEXT_OPACITY.secondary})`, ...TYPE.subhead, fontWeight: 750 }}>Cancel</button>
              <button onClick={() => void saveItem()} disabled={!itemDraft.name.trim() || saving} style={{ borderRadius: 14, padding: "14px 0", border: "none", backgroundColor: itemDraft.name.trim() && !saving ? GREEN : "rgba(255,255,255,0.08)", color: itemDraft.name.trim() && !saving ? BLACK : `rgba(255,255,255,${TEXT_OPACITY.disabled})`, ...TYPE.subhead, fontWeight: 900 }}>{saving ? "Saving..." : copy.save}</button>
            </div>
          </div>
        </>
      )}
    </main>
  )
}
function presetButtonStyle(): React.CSSProperties {
  return { border: "1px solid rgba(255,255,255,0.1)", borderRadius: 999, padding: "9px 12px", backgroundColor: "rgba(255,255,255,0.06)", color: "white", ...TYPE.footnote, fontWeight: 850 }
}