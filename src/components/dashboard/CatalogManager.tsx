"use client"

import React, { useState } from "react"
import Link from "next/link"
import { updateMenuItems, uploadMenuItemPhoto } from "@/app/dashboard/(app)/site/actions"
import { TYPE, TEXT_OPACITY, GREEN, BLACK } from "@/lib/dashboard/typography"

type CatalogItem = { name: string; description: string; price: string | null; photo_url?: string | null }
type CatalogCategory = { category: string; items: CatalogItem[] }
type CatalogMode = "menu" | "products"
type ItemDraft = { name: string; price: string; description: string; photo_url: string }

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
  },
  products: {
    title: "Products",
    eyebrow: "What customers can buy",
    body: "Add what you sell online. Found turns these into a shop customers can order from.",
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
    descPlaceholder: "Size, material, pickup, shipping, or what makes it worth buying",
    save: "Save Product",
  },
} as const

function normalizeCategories(categories: CatalogCategory[]) {
  return categories.map((category) => ({
    category: category.category,
    items: category.items.map((item) => ({
      name: item.name,
      description: item.description,
      price: item.price,
      photo_url: item.photo_url ?? null,
    })),
  }))
}

export default function CatalogManager({ mode, companyName, slug, initialCategories }: Props) {
  const copy = COPY[mode]
  const [categories, setCategories] = useState<CatalogCategory[]>(normalizeCategories(initialCategories))
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null)
  const [categoryDraftName, setCategoryDraftName] = useState("")
  const [editingItem, setEditingItem] = useState<{ catIndex: number; itemIndex: number | null } | null>(null)
  const [itemDraft, setItemDraft] = useState<ItemDraft>({ name: "", price: "", description: "", photo_url: "" })
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
    setError(null)
    setItemDraft({ name: item?.name ?? "", price: item?.price ?? "", description: item?.description ?? "", photo_url: item?.photo_url ?? "" })
    setEditingItem({ catIndex, itemIndex })
  }

  async function saveItem() {
    if (!editingItem || saving) return
    const name = itemDraft.name.trim()
    if (!name) return
    const nextItem = {
      name,
      price: itemDraft.price.trim() || null,
      description: itemDraft.description.trim(),
      photo_url: itemDraft.photo_url || null,
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
    if ("url" in result) setItemDraft((prev) => ({ ...prev, photo_url: result.url }))
    else setError(result.error || "Photo could not upload.")
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
              <input value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void addCategory()} autoFocus placeholder={copy.categoryPlaceholder} style={{ width: "100%", boxSizing: "border-box", padding: "14px 15px", borderRadius: 14, backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "white", ...TYPE.body, outline: "none", marginBottom: 10 }} />
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
                {category.items.map((item, itemIndex) => (
                  <button key={`${item.name}-${itemIndex}`} onClick={() => openItem(catIndex, itemIndex)} style={{ border: "none", padding: "14px 18px", backgroundColor: "rgba(8,10,9,0.72)", display: "flex", alignItems: "center", gap: 13, textAlign: "left", cursor: "pointer" }}>
                    {item.photo_url ? <img src={item.photo_url} alt="" style={{ width: 58, height: 58, borderRadius: 14, objectFit: "cover", flexShrink: 0 }} /> : <div style={{ width: 58, height: 58, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.065)", border: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }} />}
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", ...TYPE.subhead, fontWeight: 820, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
                      {item.description && <span style={{ display: "block", marginTop: 3, ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})`, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.description}</span>}
                    </span>
                    {item.price && <span style={{ flexShrink: 0, ...TYPE.subhead, fontWeight: 850, color: GREEN }}>{item.price}</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>

      {editingItem && (
        <>
          <div onClick={() => setEditingItem(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.72)", backdropFilter: "blur(7px)", zIndex: 50 }} />
          <div style={{ position: "fixed", left: 12, right: 12, bottom: "calc(84px + env(safe-area-inset-bottom))", zIndex: 60, maxHeight: "min(76dvh, 620px)", overflowY: "auto", borderRadius: 30, border: "1px solid rgba(255,255,255,0.12)", backgroundColor: "#111613", boxShadow: "0 -26px 90px rgba(0,0,0,0.62)", padding: "22px 20px 24px" }}>
            <div style={{ width: 38, height: 4, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.16)", margin: "0 auto 18px" }} />
            <p style={{ margin: "0 0 15px", ...TYPE.caption, color: GREEN }}>{editingItem.itemIndex === null ? `Add ${copy.itemNoun}` : `Edit ${copy.itemNoun}`}</p>
            <div style={{ display: "flex", gap: 14, marginBottom: 12 }}>
              <label style={{ flexShrink: 0 }}>
                <input type="file" accept="image/*" hidden onChange={(event) => event.target.files?.[0] && void handlePhotoUpload(event.target.files[0])} />
                <div style={{ width: 78, height: 78, borderRadius: 18, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.07)", border: `1.5px dashed ${GREEN}44`, display: "flex", alignItems: "center", justifyContent: "center", color: GREEN, ...TYPE.footnote, fontWeight: 800, cursor: "pointer" }}>
                  {uploading ? "..." : itemDraft.photo_url ? <img src={itemDraft.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "Photo"}
                </div>
              </label>
              <div style={{ flex: 1, display: "grid", gap: 9 }}>
                <input value={itemDraft.name} onChange={(event) => setItemDraft((prev) => ({ ...prev, name: event.target.value }))} placeholder={copy.itemPlaceholder} style={{ padding: "13px 14px", borderRadius: 14, backgroundColor: "rgba(255,255,255,0.08)", border: `1.5px solid ${GREEN}33`, color: "white", ...TYPE.body, outline: "none" }} />
                <input value={itemDraft.price} onChange={(event) => setItemDraft((prev) => ({ ...prev, price: event.target.value }))} placeholder="Price, e.g. $12.99" inputMode="decimal" style={{ padding: "13px 14px", borderRadius: 14, backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.11)", color: "white", ...TYPE.body, outline: "none" }} />
              </div>
            </div>
            <textarea value={itemDraft.description} onChange={(event) => setItemDraft((prev) => ({ ...prev, description: event.target.value }))} placeholder={copy.descPlaceholder} rows={4} style={{ width: "100%", boxSizing: "border-box", padding: "13px 14px", borderRadius: 14, backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.11)", color: "white", ...TYPE.body, lineHeight: 1.45, resize: "none", outline: "none", marginBottom: 14 }} />
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