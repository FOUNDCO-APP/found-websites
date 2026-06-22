"use client"

import React, { useState, useEffect, useTransition } from "react"
import { getContacts, addContact, deleteContact, updateContact } from "./actions"
import { TYPE, TEXT_OPACITY, GREEN as SIGNAL_GREEN, BLACK as FOUND_BLACK, avatarColorFor, contactCategoriesFor } from "@/lib/dashboard/typography"

type Contact = {
  id: string
  name: string
  phone: string | null
  email: string | null
  notes: string | null
  tags: string[]
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newNotes, setNewNotes] = useState("")
  const [newTags, setNewTags] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [, startTransition] = useTransition()

  const [industry, setIndustry] = useState<string | null>(null)
  const [companySlug, setCompanySlug] = useState<string>("")
  const [customTags, setCustomTags] = useState<string[]>([])
  const [showAddTag, setShowAddTag] = useState(false)
  const [newTagName, setNewTagName] = useState("")

  const [removedDefaults, setRemovedDefaults] = useState<string[]>([])
  const defaultCats = contactCategoriesFor(industry)
  const availableTags = [
    ...defaultCats.filter(t => !removedDefaults.includes(t)),
    ...customTags.filter(t => !defaultCats.includes(t)),
  ]

  useEffect(() => {
    Promise.all([
      getContacts(),
      fetch("/api/company-slug").then(r => r.json()).catch(() => ({ industry: null, slug: "" })),
    ]).then(([data, sd]) => {
      setContacts(data as Contact[])
      setIndustry(sd.industry ?? null)
      setCompanySlug(sd.slug ?? "")
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!companySlug) return
    try {
      const stored = localStorage.getItem(`found_contact_cats_${companySlug}`)
      if (stored) setCustomTags(JSON.parse(stored))
      const removedStored = localStorage.getItem(`found_contact_removed_${companySlug}`)
      if (removedStored) setRemovedDefaults(JSON.parse(removedStored))
    } catch {}
  }, [companySlug])

  const filtered = filterTag
    ? contacts.filter(c => c.tags.includes(filterTag))
    : contacts

  function toggleTag(tag: string) {
    setNewTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  function addCustomTag() {
    const trimmed = newTagName.trim()
    if (!trimmed || availableTags.includes(trimmed)) return
    const updated = [...customTags, trimmed]
    setCustomTags(updated)
    if (companySlug) {
      try { localStorage.setItem(`found_contact_cats_${companySlug}`, JSON.stringify(updated)) } catch {}
    }
    setNewTagName("")
    setShowAddTag(false)
  }

  function removeTag(tag: string) {
    if (filterTag === tag) setFilterTag(null)
    if (defaultCats.includes(tag)) {
      const updated = [...removedDefaults, tag]
      setRemovedDefaults(updated)
      if (companySlug) {
        try { localStorage.setItem(`found_contact_removed_${companySlug}`, JSON.stringify(updated)) } catch {}
      }
    } else {
      const updated = customTags.filter(t => t !== tag)
      setCustomTags(updated)
      if (companySlug) {
        try { localStorage.setItem(`found_contact_cats_${companySlug}`, JSON.stringify(updated)) } catch {}
      }
    }
  }

  async function handleSave() {
    if (!newName.trim()) return
    setSaving(true)
    const result = await addContact({
      name: newName,
      phone: newPhone || undefined,
      email: newEmail || undefined,
      notes: newNotes || undefined,
      tags: newTags,
    })
    if (result.contact) {
      setContacts(prev => [...prev, result.contact as Contact].sort((a, b) => a.name.localeCompare(b.name)))
      setShowAdd(false)
      setNewName(""); setNewPhone(""); setNewEmail(""); setNewNotes(""); setNewTags([])
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      await deleteContact(id)
      setContacts(prev => prev.filter(c => c.id !== id))
    })
  }

  return (
    <main style={{ padding: "28px 20px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ margin: 0, color: "white", ...TYPE.largeTitle }}>
          Contacts
        </h1>
        <button onClick={() => setShowAdd(true)} style={{
          width: 44, height: 44, borderRadius: "50%",
          backgroundColor: SIGNAL_GREEN, border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 4px 16px ${SIGNAL_GREEN}44`,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={FOUND_BLACK} strokeWidth="3" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      {/* Category filter pills + manage */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, alignItems: "center" }}>
          {[null, ...availableTags].map(tag => {
            const isActive = filterTag === tag
            return (
              <div key={tag ?? "all"} style={{ flexShrink: 0, display: "flex", alignItems: "center", borderRadius: 20, border: "1px solid", borderColor: isActive ? SIGNAL_GREEN : "rgba(255,255,255,0.12)", backgroundColor: isActive ? `${SIGNAL_GREEN}18` : "transparent" }}>
                <button onClick={() => setFilterTag(tag)} style={{
                  padding: tag !== null ? "6px 8px 6px 14px" : "6px 14px",
                  border: "none", background: "none",
                  color: isActive ? SIGNAL_GREEN : "rgba(255,255,255,0.45)",
                  fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer",
                }}>
                  {tag ?? "All"}
                </button>
                {tag !== null && (
                  <button onClick={e => { e.stopPropagation(); removeTag(tag) }} style={{
                    border: "none", background: "none", padding: "0 10px 0 2px", cursor: "pointer",
                    color: isActive ? SIGNAL_GREEN : "rgba(255,255,255,0.3)",
                    display: "flex", alignItems: "center", lineHeight: 1,
                  }} title="Remove category">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
              </div>
            )
          })}
          <button
            onClick={() => { setShowAddTag(v => !v); setNewTagName("") }}
            title="Add category"
            style={{
              flexShrink: 0, width: 30, height: 30, borderRadius: "50%",
              border: "1px dashed rgba(255,255,255,0.18)",
              backgroundColor: "transparent", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "rgba(255,255,255,0.3)",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>

        {/* Inline new category input */}
        {showAddTag && (
          <div style={{ display: "flex", gap: 8, marginTop: 10, animation: "fadeIn 0.15s ease" }}>
            <input
              autoFocus
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addCustomTag(); if (e.key === "Escape") { setShowAddTag(false); setNewTagName("") } }}
              placeholder="Category name…"
              style={{
                flex: 1, padding: "9px 14px", borderRadius: 12,
                backgroundColor: "rgba(255,255,255,0.06)",
                border: `1px solid ${SIGNAL_GREEN}33`,
                color: "white", fontSize: "0.875rem", outline: "none",
              }}
            />
            <button onClick={addCustomTag} disabled={!newTagName.trim()} style={{
              padding: "9px 16px", borderRadius: 12, border: "none",
              backgroundColor: newTagName.trim() ? SIGNAL_GREEN : "rgba(255,255,255,0.08)",
              color: newTagName.trim() ? FOUND_BLACK : "rgba(255,255,255,0.2)",
              fontSize: "0.8125rem", fontWeight: 700, cursor: newTagName.trim() ? "pointer" : "default",
            }}>Add</button>
          </div>
        )}
      </div>

      {/* Add contact form */}
      {showAdd && (
        <div style={{
          borderRadius: 20, padding: 24, marginBottom: 20,
          backgroundColor: "rgba(255,255,255,0.05)",
          border: `1px solid ${SIGNAL_GREEN}44`,
        }}>
          <div style={{ ...TYPE.caption, color: SIGNAL_GREEN, marginBottom: 20 }}>New Contact</div>
          {[
            { label: "Name *", val: newName, set: setNewName, placeholder: "Full name", type: "text" },
            { label: "Phone", val: newPhone, set: setNewPhone, placeholder: "Phone number", type: "tel" },
            { label: "Email", val: newEmail, set: setNewEmail, placeholder: "Email address", type: "email" },
            { label: "Notes", val: newNotes, set: setNewNotes, placeholder: "e.g. great work, call before noon", type: "text" },
          ].map(({ label, val, set, placeholder, type }) => (
            <div key={label} style={{ marginBottom: 14 }}>
              <div style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, marginBottom: 6 }}>{label}</div>
              <input
                type={type}
                value={val}
                onChange={e => set(e.target.value)}
                placeholder={placeholder}
                style={{
                  width: "100%", padding: "13px 16px", borderRadius: 12,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "white", fontSize: "0.9375rem", outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
          ))}
          {/* Category tags */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, marginBottom: 10 }}>Category</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {availableTags.map(tag => (
                <button key={tag} onClick={() => toggleTag(tag)} style={{
                  padding: "6px 14px", borderRadius: 20, border: "1px solid",
                  borderColor: newTags.includes(tag) ? SIGNAL_GREEN : "rgba(255,255,255,0.12)",
                  backgroundColor: newTags.includes(tag) ? `${SIGNAL_GREEN}18` : "transparent",
                  color: newTags.includes(tag) ? SIGNAL_GREEN : "rgba(255,255,255,0.4)",
                  fontSize: "0.8125rem", fontWeight: 700, cursor: "pointer",
                  letterSpacing: "0.04em",
                }}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { setShowAdd(false); setNewName(""); setNewPhone(""); setNewEmail(""); setNewNotes(""); setNewTags([]) }} style={{
              flex: 1, padding: "14px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)",
              backgroundColor: "transparent", color: "rgba(255,255,255,0.4)",
              fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer",
            }}>Cancel</button>
            <button onClick={handleSave} disabled={!newName.trim() || saving} style={{
              flex: 2, padding: "14px 0", borderRadius: 12, border: "none",
              backgroundColor: newName.trim() ? SIGNAL_GREEN : "rgba(255,255,255,0.1)",
              color: newName.trim() ? FOUND_BLACK : "rgba(255,255,255,0.3)",
              fontSize: "0.8125rem", fontWeight: 700, cursor: newName.trim() ? "pointer" : "default",
            }}>{saving ? "Saving…" : "Save Contact"}</button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ paddingTop: 60, textAlign: "center", color: "rgba(255,255,255,0.2)", ...TYPE.footnote }}>
          Loading…
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div style={{ paddingTop: 60, textAlign: "center" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            backgroundColor: "rgba(255,255,255,0.04)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <line x1="19" y1="8" x2="19" y2="14"/>
              <line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
          </div>
          <p style={{ margin: "0 0 6px", fontSize: "1.375rem", fontWeight: 300, color: "white", letterSpacing: "-0.02em" }}>
            {filterTag ? `No ${filterTag} contacts yet.` : "Your business network lives here."}
          </p>
          <p style={{ margin: 0, ...TYPE.subhead, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})`, lineHeight: 1.7 }}>
            {filterTag ? "Try a different category or add a new contact." : "Add vendors, subs, and suppliers.\nTap + to get started."}
          </p>
        </div>
      )}

      {/* Contact list */}
      {!loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {filtered.map(contact => (
            <div key={contact.id} style={{
              borderRadius: 14, backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden",
            }}>
              <div
                onClick={() => setSelectedContact(contact)}
                style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}
              >
                <div style={{
                  width: 42, height: 42, borderRadius: "50%",
                  backgroundColor: `${avatarColorFor(contact.name)}26`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, fontSize: "0.875rem", fontWeight: 700, color: avatarColorFor(contact.name),
                }}>
                  {contact.name[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "white", marginBottom: 3, ...TYPE.headline }}>
                    {contact.name}
                  </div>
                  {contact.notes && (
                    <div style={{ color: "white", opacity: TEXT_OPACITY.secondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", ...TYPE.subhead }}>
                      {contact.notes}
                    </div>
                  )}
                  {contact.tags.length > 0 && (
                    <div style={{ display: "flex", gap: 5, marginTop: 5, flexWrap: "wrap" }}>
                      {contact.tags.map(tag => (
                        <span key={tag} style={{ color: SIGNAL_GREEN, ...TYPE.caption }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedContact && (
        <ContactDetailSheet
          contact={selectedContact}
          availableTags={availableTags}
          onClose={() => setSelectedContact(null)}
          onSaved={(updated) => {
            setContacts(prev => prev.map(c => c.id === updated.id ? updated : c))
            setSelectedContact(updated)
          }}
          onDelete={() => {
            handleDelete(selectedContact.id)
            setSelectedContact(null)
          }}
        />
      )}

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </main>
  )
}

function ContactDetailSheet({ contact, availableTags, onClose, onSaved, onDelete }: {
  contact: Contact
  availableTags: string[]
  onClose: () => void
  onSaved: (c: Contact) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(contact.name)
  const [phone, setPhone] = useState(contact.phone ?? "")
  const [email, setEmail] = useState(contact.email ?? "")
  const [notes, setNotes] = useState(contact.notes ?? "")
  const [tags, setTags] = useState<string[]>(contact.tags)
  const [saving, setSaving] = useState(false)

  function toggleTag(tag: string) {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  async function handleSave() {
    setSaving(true)
    const result = await updateContact({ id: contact.id, name, phone, email, notes, tags })
    setSaving(false)
    if (result.contact) {
      onSaved(result.contact as Contact)
      setEditing(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.65)", zIndex: 60, backdropFilter: "blur(4px)" }}/>
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 70,
        backgroundColor: "#101411", borderTop: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "28px 28px 0 0", padding: "14px 22px 36px",
        maxHeight: "88dvh", overflowY: "auto",
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", margin: "0 auto 22px" }}/>

        {!editing ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
              <div style={{
                width: 60, height: 60, borderRadius: "50%",
                backgroundColor: `${avatarColorFor(contact.name)}26`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.375rem", fontWeight: 700, color: avatarColorFor(contact.name), flexShrink: 0,
              }}>
                {contact.name[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ margin: "0 0 6px", color: "white", ...TYPE.title }}>
                  {contact.name}
                </h2>
                {contact.tags.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {contact.tags.map(tag => (
                      <span key={tag} style={{ color: SIGNAL_GREEN, backgroundColor: `${SIGNAL_GREEN}15`, padding: "4px 11px", borderRadius: 100, ...TYPE.caption }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => setEditing(true)} style={{
                padding: "8px 16px", borderRadius: 100, border: "1px solid rgba(255,255,255,0.12)",
                backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)",
                fontSize: "0.8125rem", fontWeight: 700, cursor: "pointer", flexShrink: 0,
              }}>Edit</button>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              {contact.phone && (
                <a href={`tel:${contact.phone.replace(/\D/g, "")}`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 0", borderRadius: 18, backgroundColor: `${SIGNAL_GREEN}15`, textDecoration: "none" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={SIGNAL_GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.1 1.22 2 2 0 012.11 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.45-.45a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>
                  <span style={{ fontSize: "0.8125rem", fontWeight: 800, color: SIGNAL_GREEN }}>Call</span>
                </a>
              )}
              {contact.phone && (
                <a href={`sms:${contact.phone.replace(/\D/g, "")}`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 0", borderRadius: 18, backgroundColor: "rgba(255,255,255,0.05)", textDecoration: "none" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                  <span style={{ fontSize: "0.8125rem", fontWeight: 800, color: "rgba(255,255,255,0.6)" }}>Text</span>
                </a>
              )}
              {contact.email && (
                <a href={`mailto:${contact.email}`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 0", borderRadius: 18, backgroundColor: "rgba(255,255,255,0.05)", textDecoration: "none" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  <span style={{ fontSize: "0.8125rem", fontWeight: 800, color: "rgba(255,255,255,0.6)" }}>Email</span>
                </a>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
              {contact.phone && <DetailRow label="Phone" value={contact.phone} />}
              {contact.email && <DetailRow label="Email" value={contact.email} />}
              {contact.notes && (
                <div>
                  <div style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})`, marginBottom: 8 }}>Notes</div>
                  <p style={{ margin: 0, ...TYPE.body, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})`, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                    {contact.notes}
                  </p>
                </div>
              )}
            </div>

            <button onClick={onDelete} style={{
              width: "100%", padding: "14px 0", borderRadius: 14,
              border: "1px solid rgba(255,80,80,0.2)", backgroundColor: "rgba(255,80,80,0.06)",
              color: "rgba(255,110,110,0.8)", ...TYPE.subhead, fontWeight: 600, cursor: "pointer",
            }}>
              Delete Contact
            </button>
          </>
        ) : (
          <>
            <div style={{ ...TYPE.caption, color: SIGNAL_GREEN, marginBottom: 18 }}>
              Edit Contact
            </div>

            {[
              { label: "Name", val: name, set: setName, placeholder: "Full name" },
              { label: "Phone", val: phone, set: setPhone, placeholder: "Phone number" },
              { label: "Email", val: email, set: setEmail, placeholder: "Email address" },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: 14 }}>
                <div style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, marginBottom: 6 }}>{f.label}</div>
                <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                  style={{ width: "100%", padding: "13px 16px", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: "0.9375rem", outline: "none", boxSizing: "border-box" }}
                />
              </div>
            ))}

            <div style={{ marginBottom: 14 }}>
              <div style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, marginBottom: 8 }}>Category</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {availableTags.map(tag => (
                  <button key={tag} onClick={() => toggleTag(tag)} style={{
                    padding: "8px 14px", borderRadius: 100,
                    border: `1px solid ${tags.includes(tag) ? SIGNAL_GREEN : "rgba(255,255,255,0.12)"}`,
                    backgroundColor: tags.includes(tag) ? `${SIGNAL_GREEN}18` : "transparent",
                    color: tags.includes(tag) ? SIGNAL_GREEN : "rgba(255,255,255,0.45)",
                    fontSize: "0.8125rem", fontWeight: 700, cursor: "pointer",
                  }}>{tag}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, marginBottom: 6 }}>Notes</div>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add notes…" rows={4}
                style={{ width: "100%", padding: "13px 16px", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: "0.9375rem", outline: "none", resize: "none", boxSizing: "border-box", lineHeight: 1.6, fontFamily: "inherit" }}
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setEditing(false)} style={{
                flex: 1, padding: "14px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)",
                backgroundColor: "transparent", color: "rgba(255,255,255,0.4)",
                fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer",
              }}>Cancel</button>
              <button onClick={handleSave} disabled={saving || !name.trim()} style={{
                flex: 2, padding: "14px 0", borderRadius: 12, border: "none",
                backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK,
                fontSize: "0.8125rem", fontWeight: 700,
                cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1,
              }}>{saving ? "Saving…" : "Save Changes"}</button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})`, marginBottom: 4 }}>
        {label}
      </div>
      <p style={{ margin: 0, ...TYPE.subhead, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
        {value}
      </p>
    </div>
  )
}
