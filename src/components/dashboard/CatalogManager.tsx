"use client"

import React, { useState } from "react"
import Link from "next/link"
import { updateMenuItems, uploadMenuItemPhoto } from "@/app/dashboard/(app)/site/actions"
import { TYPE, TEXT_OPACITY, GREEN, BLACK } from "@/lib/dashboard/typography"

type CatalogDetail = { label: string; value: string }
type CatalogItem = {
  name: string
  description: string
  price: string | null
  photo_url?: string | null
  images?: string[] | null
  details?: CatalogDetail[] | null
  sizes?: string | null
  materials?: string | null
  shipping_note?: string | null
}
type CatalogCategory = { category: string; items: CatalogItem[] }
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

const EMPTY_DRAFT: ItemDraft = { name: "", price: "", description: "", photo_url: "", images: [], sizes: "", materials: "", shipping_note: "", details: [] }

function uniqueImages(item: CatalogItem | ItemDraft) {
  return Array.from(new Set([item.photo_url || "", ...(item.images ?? [])].map(image => image.trim()).filter(Boolean))).slice(0, 6)
}

function normalizeCategories(categories: CatalogCategory[]) {
  return categories.map((category) => ({
    category: category.category,
    items: category.items.map((item) => {
      const images = uniqueImages(item)
      return {
        name: item.name,
        description: item.description,
        price: item.price,
        photo_url: images[0] ?? null,
        images: images.length ? images : null,
        details: item.details?.filter(detail => detail.label.trim() && detail.value.trim()) ?? null,
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
  const [categories, setCategories] = useState<CatalogCategory[]>(normalizeCategories(initialCategories))
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null)
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

  async function persist(next: CatalogCategory[]) {
    const previous = categories
    setCategories(normalizeCategories(next))
    setSaving(true)
    setError(null)
    const result = await updateMenuItems(normalizeCategories(next))
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
    setShowDetails(Boolean(item?.sizes || item?.materials || item?.shipping_note || item?.details?.length))
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
    })
    setEditingItem({ catIndex, itemIndex })
  }

  async function saveItem() {
    if (!editingItem || saving) return
    const name = itemDraft.name.trim()
    if (!name) return
    const images = uniqueImages(itemDraft)
    const details = itemDraft.details.filter(detail => detail.label.trim() && detail.value.trim())
    const nextItem: CatalogItem = {
      name,
      price: itemDraft.price.trim() || null,
      description: itemDraft.description.trim(),
      photo_url: images[0] ?? null,
      images: images.length ? images : null,
      details: details.length ? details : null,
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
              <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingCategoryIndex === catIndex ? (
                    <input value={categoryDraftName} onChange={(event) => setCategoryDraftName(event.target.value)} onBlur={() => void saveCategoryName(catIndex)} onKeyDown={(event) => event.key === "Enter" && void saveCategoryName(catIndex)} autoFocus style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "white", ...TYPE.title, fontWeight: 820 }} />
                  ) : (
                    <button onClick={() => { setCategoryDraftName(category.category); setEditingCategoryIndex(catIndex) }} style={{ display: "block", width: "100%", padding: 0, border: "none", background: "none", color: "white", textAlign: "left", ...TYPE.title, fontWeight: 820, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{category.category}</button>
                  )}
                  <p style={{ margin: "4px 0 0", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>{category.items.length} {category.items.length === 1 ? copy.itemNoun : `${copy.itemNoun}s`}</p>
                </div>
                <button onClick={() => openItem(catIndex, null)} style={{ border: "none", borderRadius: 999, padding: "10px 13px", backgroundColor: `${GREEN}16`, color: GREEN, ...TYPE.footnote, fontWeight: 850 }}>{copy.addItem}</button>
                <button onClick={() => void removeCategory(catIndex)} style={{ border: "none", background: "none", color: "rgba(255,100,100,0.68)", ...TYPE.footnote, fontWeight: 800 }}>Remove</button>
              </div>

              <div style={{ display: "grid", gap: 1, backgroundColor: "rgba(255,255,255,0.035)" }}>
                {category.items.map((item, itemIndex) => {
                  const images = uniqueImages(item)
                  return (
                    <button key={`${item.name}-${itemIndex}`} onClick={() => openItem(catIndex, itemIndex)} style={{ border: "none", padding: "14px 18px", backgroundColor: "rgba(8,10,9,0.72)", display: "flex", alignItems: "center", gap: 13, textAlign: "left", cursor: "pointer" }}>
                      {images[0] ? <img src={images[0]} alt="" style={{ width: 68, height: 68, borderRadius: 16, objectFit: "cover", flexShrink: 0 }} /> : <div style={{ width: 68, height: 68, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.065)", border: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }} />}
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", ...TYPE.subhead, fontWeight: 820, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
                        {item.description && <span style={{ display: "block", marginTop: 3, ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})`, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.description}</span>}
                        {isProducts && images.length > 1 && <span style={{ display: "block", marginTop: 5, ...TYPE.footnote, color: GREEN, fontWeight: 800 }}>{images.length} photos</span>}
                      </span>
                      {item.price && <span style={{ flexShrink: 0, ...TYPE.subhead, fontWeight: 850, color: GREEN }}>{priceLabel(item.price)}</span>}
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
                    <input value={itemDraft.sizes} onChange={(event) => setItemDraft((prev) => ({ ...prev, sizes: event.target.value }))} placeholder="Sizes or options, e.g. Small to XL" style={inputStyle()} />
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