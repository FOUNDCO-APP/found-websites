"use client"

import React, { useState, useEffect, useTransition } from "react"
import { getContacts, addContact, deleteContact } from "./actions"

const SIGNAL_GREEN = "#32D074"
const FOUND_BLACK = "#080A09"

type Contact = {
  id: string
  name: string
  phone: string | null
  email: string | null
  notes: string | null
  tags: string[]
}

const DEFAULT_TAGS = ["Vendor", "Subcontractor", "Laborer", "Supplier", "Referral"]

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
  const [, startTransition] = useTransition()

  useEffect(() => {
    getContacts().then(data => {
      setContacts(data as Contact[])
      setLoading(false)
    })
  }, [])

  const filtered = filterTag
    ? contacts.filter(c => c.tags.includes(filterTag))
    : contacts

  function toggleTag(tag: string) {
    setNewTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
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
        <h1 style={{ margin: 0, fontSize: 34, fontWeight: 300, color: "white", letterSpacing: "-0.04em", lineHeight: 0.95 }}>
          Contacts
        </h1>
        <button onClick={() => setShowAdd(true)} style={{
          width: 36, height: 36, borderRadius: "50%",
          backgroundColor: SIGNAL_GREEN, border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={FOUND_BLACK} strokeWidth="3" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      {/* Tag filters */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 20 }}>
        {[null, ...DEFAULT_TAGS].map(tag => (
          <button key={tag ?? "all"} onClick={() => setFilterTag(tag)} style={{
            flexShrink: 0, padding: "6px 14px", borderRadius: 20,
            border: "1px solid",
            borderColor: filterTag === tag ? SIGNAL_GREEN : "rgba(255,255,255,0.12)",
            backgroundColor: filterTag === tag ? `${SIGNAL_GREEN}18` : "transparent",
            color: filterTag === tag ? SIGNAL_GREEN : "rgba(255,255,255,0.45)",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}>
            {tag ?? "All"}
          </button>
        ))}
      </div>

      {/* Add contact form */}
      {showAdd && (
        <div style={{
          borderRadius: 16, padding: 20, marginBottom: 20,
          backgroundColor: "rgba(255,255,255,0.05)",
          border: `1px solid ${SIGNAL_GREEN}44`,
        }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: SIGNAL_GREEN, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 16 }}>New Contact</div>
          {[
            { label: "Name *", val: newName, set: setNewName, placeholder: "Full name" },
            { label: "Phone", val: newPhone, set: setNewPhone, placeholder: "Phone number" },
            { label: "Email", val: newEmail, set: setNewEmail, placeholder: "Email address" },
            { label: "Notes", val: newNotes, set: setNewNotes, placeholder: "e.g. great drywall work, call before noon" },
          ].map(({ label, val, set, placeholder }) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 5, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</div>
              <input
                value={val}
                onChange={e => set(e.target.value)}
                placeholder={placeholder}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "white", fontSize: 14, outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          ))}
          {/* Tags */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>Tags</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {DEFAULT_TAGS.map(tag => (
                <button key={tag} onClick={() => toggleTag(tag)} style={{
                  padding: "6px 14px", borderRadius: 20, border: "1px solid",
                  borderColor: newTags.includes(tag) ? SIGNAL_GREEN : "rgba(255,255,255,0.12)",
                  backgroundColor: newTags.includes(tag) ? `${SIGNAL_GREEN}18` : "transparent",
                  color: newTags.includes(tag) ? SIGNAL_GREEN : "rgba(255,255,255,0.4)",
                  fontSize: 10, fontWeight: 900, cursor: "pointer", letterSpacing: "0.15em", textTransform: "uppercase",
                }}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { setShowAdd(false); setNewName(""); setNewPhone(""); setNewEmail(""); setNewNotes(""); setNewTags([]) }} style={{
              flex: 1, padding: "12px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
              backgroundColor: "transparent", color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>Cancel</button>
            <button onClick={handleSave} disabled={!newName.trim() || saving} style={{
              flex: 2, padding: "12px 0", borderRadius: 10, border: "none",
              backgroundColor: newName.trim() ? SIGNAL_GREEN : "rgba(255,255,255,0.1)",
              color: newName.trim() ? FOUND_BLACK : "rgba(255,255,255,0.3)",
              fontSize: 13, fontWeight: 700, cursor: newName.trim() ? "pointer" : "default",
            }}>{saving ? "Saving…" : "Save Contact"}</button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ paddingTop: 60, textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
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
          <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 300, color: "white" }}>
            Your business network lives here.
          </p>
          <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.35)", lineHeight: 1.7 }}>
            Add vendors, subs, and suppliers.<br/>Tap + to get started.
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
              <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: "50%",
                  backgroundColor: "rgba(255,255,255,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.6)",
                }}>
                  {contact.name[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 3 }}>
                    {contact.name}
                  </div>
                  {contact.notes && (
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {contact.notes}
                    </div>
                  )}
                  {contact.tags.length > 0 && (
                    <div style={{ display: "flex", gap: 5, marginTop: 5, flexWrap: "wrap" }}>
                      {contact.tags.map(tag => (
                        <span key={tag} style={{
                          fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
                          color: SIGNAL_GREEN, textTransform: "uppercase",
                        }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {/* Actions */}
                <div style={{ display: "flex", gap: 14, flexShrink: 0, alignItems: "center" }}>
                  {contact.phone && (
                    <a href={`tel:${contact.phone.replace(/\D/g, "")}`} style={{ color: "rgba(255,255,255,0.35)", display: "flex" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.1 1.22 2 2 0 012.11 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.45-.45a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/>
                      </svg>
                    </a>
                  )}
                  {contact.phone && (
                    <a href={`sms:${contact.phone.replace(/\D/g, "")}`} style={{ color: "rgba(255,255,255,0.35)", display: "flex" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                      </svg>
                    </a>
                  )}
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} style={{ color: "rgba(255,255,255,0.35)", display: "flex" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                    </a>
                  )}
                  <button onClick={() => handleDelete(contact.id)} style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "rgba(255,255,255,0.15)", display: "flex", padding: 0,
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14H6L5 6"/>
                      <path d="M10 11v6M14 11v6"/>
                      <path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </main>
  )
}
