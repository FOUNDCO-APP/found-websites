"use client"

import { useEffect, useId, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { switchIncludedAddon } from "@/app/dashboard/(app)/more/actions"
import { GREEN, BLACK } from "@/lib/dashboard/typography"

export type IncludedProToolProps = {
  companyId: string
  currentIncludedSlug: string | null
  disabledAddonSlugs: string[]
  paidAddonSlugs: string[]
  variant: "prompt" | "manage"
}

const tools = [
  { slug: "online_ordering", label: "Online Ordering", description: "Let customers order and pay from your menu.", path: "/menu" },
  { slug: "reservation_calendar", label: "Booking Calendar", description: "Let customers request a time. Set your availability first.", path: "/schedule?tab=hours" },
  { slug: "shopping_cart", label: "Shopping Cart", description: "Sell products from your website with a cart and checkout.", path: "/products" },
  { slug: "quote_payments", label: "Estimates and Payments", description: "Send estimates for approval and collect deposits or payments.", path: "/estimates" },
  { slug: "email_marketing", label: "Email Marketing", description: "Send news and offers to customers who subscribe.", path: "/marketing" },
]

const buttonStyle = { minHeight: 44, padding: "10px 16px", borderRadius: 12, border: "1px solid #555", background: "transparent", color: "white", fontSize: "1rem", cursor: "pointer" } as const

export default function IncludedProTool({ companyId, currentIncludedSlug, disabledAddonSlugs, paidAddonSlugs, variant }: IncludedProToolProps) {
  const router = useRouter()
  const pathname = usePathname()
  const prefix = pathname?.startsWith("/dashboard") ? "/dashboard" : ""
  const titleId = useId()
  const descriptionId = useId()
  const dialogId = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const inFlight = useRef(false)
  const mounted = useRef(true)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(currentIncludedSlug ?? "")
  const [confirmTurnOn, setConfirmTurnOn] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedSlug, setSavedSlug] = useState<string | null>(null)
  const [checking, startChecking] = useTransition()
  const [checkRequested, setCheckRequested] = useState(false)
  const [rechecked, setRechecked] = useState(false)
  const chosen = tools.find(tool => tool.slug === selected)
  const current = tools.find(tool => tool.slug === currentIncludedSlug)
  const saved = tools.find(tool => tool.slug === savedSlug)
  const hidden = disabledAddonSlugs.includes(selected)

  useEffect(() => {
    if (uncertain && selected && currentIncludedSlug === selected && !disabledAddonSlugs.includes(selected)) {
      setSavedSlug(selected)
      setError(null)
      setUncertain(false)
    }
  }, [uncertain, selected, currentIncludedSlug, disabledAddonSlugs])

  useEffect(() => {
    if (checkRequested && !checking) {
      setRechecked(!inFlight.current)
      setCheckRequested(false)
    }
  }, [checkRequested, checking])

  function checkSavedChoice() {
    setCheckRequested(true)
    startChecking(() => router.refresh())
  }

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    if (!open) return
    dialog.current?.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      dialog.current?.close()
      document.body.style.overflow = previousOverflow
      trigger.current?.focus()
    }
  }, [open])

  function close() {
    setOpen(false)
    if (savedSlug) router.refresh()
  }

  function openChooser() {
    if (!inFlight.current && (!uncertain || rechecked)) {
      setSelected(currentIncludedSlug ?? "")
      setConfirmTurnOn(false)
      setSavedSlug(null)
      setUncertain(false)
      setError(null)
    }
    setOpen(true)
  }

  async function save() {
    if (inFlight.current || !chosen || paidAddonSlugs.includes(selected) || (hidden && !confirmTurnOn)) return
    inFlight.current = true
    setSaving(true)
    setError(null)
    setUncertain(false)
    setRechecked(false)
    const timer = window.setTimeout(() => {
      if (!mounted.current) return
      setUncertain(true)
      setSaving(false)
      setError("We haven't confirmed your choice yet. Check the saved choice before trying again.")
    }, 20000)
    try {
      const result = await switchIncludedAddon(companyId, selected, { expectedIncludedAddonSlug: currentIncludedSlug, confirmTurnOn: hidden && confirmTurnOn })
      if (!mounted.current) return
      if (result.success) {
        setSavedSlug(selected)
        setError(null)
        setUncertain(false)
      } else {
        setError(`${result.error ?? "Your choice wasn't saved."} Refresh your choice before trying again.`)
        setUncertain(false)
        router.refresh()
      }
    } catch {
      if (!mounted.current) return
      setUncertain(true)
      setError("We couldn't confirm the save. Check the saved choice before trying again.")
      router.refresh()
    } finally {
      window.clearTimeout(timer)
      inFlight.current = false
      if (mounted.current) setSaving(false)
    }
  }

  if (variant === "prompt" && currentIncludedSlug && !open) return null

  return (
    <section style={variant === "prompt"
      ? { color: "white", minWidth: 0 }
      : { padding: 16, marginBottom: 16, border: "1px solid #444", borderRadius: 14, color: "white", background: "#161616" }}>
      {variant === "prompt" ? <button
        ref={trigger}
        type="button"
        className="included-pro-prompt"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        onClick={openChooser}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, width: "100%", minHeight: 76, padding: "14px 0", margin: 0, border: 0, borderBottom: "1px solid rgba(255,255,255,0.14)", borderRadius: 0, background: "transparent", color: "white", textAlign: "left", fontFamily: "inherit", letterSpacing: 0, cursor: "pointer", outlineOffset: 4 }}
      >
        <span style={{ display: "block", minWidth: 0, overflowWrap: "anywhere" }}>
          <span style={{ display: "block", fontSize: "1rem", fontWeight: 600, lineHeight: 1.4 }}>Choose your Pro tool</span>
          <span style={{ display: "block", marginTop: 4, color: "#b7bcb9", fontSize: "0.875rem", lineHeight: 1.4, fontWeight: 400 }}>Included. No extra charge.</span>
        </span>
        <span aria-hidden="true" style={{ flexShrink: 0, color: "#b7bcb9", fontSize: 26, lineHeight: 1 }}>&rsaquo;</span>
      </button> : <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ flex: "1 1 200px" }}>
          <h2 style={{ margin: "0 0 6px", fontSize: 17 }}>{current ? `${current.label} is included with Pro` : "Choose your included Pro tool"}</h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "#bbb" }}>One tool is included. No extra charge. Choose when you're ready.</p>
        </div>
        <button ref={trigger} type="button" style={buttonStyle} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? dialogId : undefined} onClick={openChooser}>{currentIncludedSlug ? "Manage" : "Choose a tool"}</button>
      </div>}
      {open && <dialog id={dialogId} ref={dialog} aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={close} onClose={close} className="included-pro-dialog">
        <header className="included-pro-header">
          <h2 id={titleId} style={{ margin: 0, fontSize: "1rem", lineHeight: 1.25, overflowWrap: "anywhere" }}>{saved ? "Your choice is saved" : "Choose your Pro tool"}</h2>
          <button type="button" aria-label="Close chooser" onClick={close} style={{ ...buttonStyle, display: "grid", placeItems: "center", width: 44, minWidth: 44, height: 44, padding: 0, flexShrink: 0 }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
        </header>
        <div className="included-pro-body">
        <p id={descriptionId} style={{ color: "#bbb", lineHeight: 1.5 }}>{saved ? saved.slug === "reservation_calendar" ? "Booking Calendar is included. Set and save your hours before customers can book." : `${saved.label} is included. Continue setup before using it. Payments may need a connected payment account.` : "One tool included. No extra charge. Separately paid tools stay unchanged."}</p>
        {!saved && <>
          <fieldset disabled={saving || uncertain} style={{ border: 0, padding: 0, margin: 0 }}>
            <legend style={{ marginBottom: 10 }}>Choose one tool</legend>
            {tools.map(tool => {
              const paid = paidAddonSlugs.includes(tool.slug)
              return <label key={tool.slug} style={{ display: "flex", gap: 12, minHeight: 44, padding: "16px 0", borderBottom: "1px solid #393939", lineHeight: 1.5, cursor: paid ? "default" : "pointer" }}>
                <input type="radio" name={titleId} value={tool.slug} checked={selected === tool.slug} disabled={paid} onChange={() => { setSelected(tool.slug); setConfirmTurnOn(false); setError(null) }} style={{ marginTop: 5, accentColor: GREEN, flexShrink: 0 }} />
                <span style={{ minWidth: 0, overflowWrap: "anywhere" }}><strong>{tool.label}</strong><span style={{ display: "block", color: "#bbb", fontSize: "0.875rem" }}>{tool.description}</span>{tool.slug === currentIncludedSlug && <span style={{ display: "block", color: GREEN }}>Currently included</span>}{paid && <span style={{ display: "block", color: "#ddd", fontSize: "0.875rem" }}>Already paid separately. Manage this in Billing; choosing an included tool won't change that charge.</span>}</span>
              </label>
            })}
            {current && selected && selected !== currentIncludedSlug && <p style={{ lineHeight: 1.5 }}>This replaces {current.label} as your included tool. It may no longer be available unless paid separately.</p>}
            {hidden && chosen && <label style={{ display: "flex", gap: 12, padding: "14px 0", lineHeight: 1.5 }}><input type="checkbox" checked={confirmTurnOn} onChange={event => setConfirmTurnOn(event.target.checked)} style={{ flexShrink: 0, marginTop: 5 }} /><span>Include this tool and turn it on for your website and tool settings. Review its website settings during setup before customers use it.</span></label>}
          </fieldset>
          {error && <p role="alert" style={{ color: "#fda4af", lineHeight: 1.5 }}>{error}</p>}
          {uncertain && <p role="status" style={{ lineHeight: 1.5, color: "#bbb" }}>Current saved choice: {current?.label ?? "None"}. {rechecked ? "The latest choice is shown. Close and reopen to choose again." : "Check again after the original save finishes. No second save will be sent while it is unresolved."}</p>}
        </>}
          <Link href={`${prefix}/billing`} onClick={close} style={{ display: "inline-flex", alignItems: "center", minHeight: 44, color: "#ddd", padding: "8px 0" }}>Manage billing</Link>
        </div>
        <footer className="included-pro-footer">
          {saved ? <Link href={`${prefix}${saved.path}`} onClick={close} style={{ ...buttonStyle, display: "inline-flex", alignItems: "center", background: GREEN, color: BLACK, textDecoration: "none" }}>Continue setup</Link> : <>
          {uncertain ? <button type="button" style={buttonStyle} disabled={checking} onClick={checkSavedChoice}>{checking ? "Checking..." : "Check saved choice"}</button> : <button type="button" disabled={saving || !chosen || paidAddonSlugs.includes(selected) || (hidden && !confirmTurnOn)} onClick={save} style={{ ...buttonStyle, width: "100%", background: GREEN, color: BLACK, opacity: saving || !chosen || paidAddonSlugs.includes(selected) || (hidden && !confirmTurnOn) ? 0.5 : 1 }}>{saving ? "Saving choice..." : hidden ? "Include and turn on" : "Save included tool"}</button>}
          </>}
          <button type="button" style={buttonStyle} onClick={close}>{saved ? "Close" : "Later"}</button>
        </footer>
      </dialog>}
      <style>{`
        .included-pro-dialog {
          width: min(32rem, calc(100vw - 32px));
          max-width: none;
          max-height: calc(100dvh - 48px);
          margin: auto;
          padding: 0;
          border: 1px solid #555;
          border-radius: 20px;
          box-sizing: border-box;
          overflow: hidden;
          background: #161616;
          color: white;
          font-family: inherit;
          font-size: 1rem;
        }
        .included-pro-dialog[open] { display: flex; flex-direction: column; }
        .included-pro-dialog::backdrop { background: rgba(0,0,0,0.72); }
        .included-pro-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-shrink: 0;
          padding: 12px 20px;
          border-bottom: 1px solid #393939;
        }
        .included-pro-body {
          min-height: 0;
          overflow-y: auto;
          overscroll-behavior: contain;
          padding: 0 20px 16px;
          overflow-wrap: anywhere;
          scrollbar-gutter: stable;
        }
        .included-pro-body fieldset { min-width: 0; }
        .included-pro-footer {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: stretch;
          gap: 12px;
          flex-shrink: 0;
          padding: 12px 20px max(12px, env(safe-area-inset-bottom));
          border-top: 1px solid #393939;
        }
        .included-pro-footer > button, .included-pro-footer > a {
          min-width: 0;
          box-sizing: border-box;
          overflow-wrap: anywhere;
          line-height: 1.25;
        }
        .included-pro-dialog button, .included-pro-dialog a { font-family: inherit; }
        .included-pro-dialog button:focus-visible, .included-pro-dialog a:focus-visible,
        .included-pro-dialog input:focus-visible { outline: 2px solid ${GREEN}; outline-offset: 3px; }
        @media (max-width: 600px) {
          .included-pro-dialog {
            width: 100%;
            max-height: calc(100dvh - max(12px, env(safe-area-inset-top)));
            margin: auto 0 0;
            border-radius: 20px 20px 0 0;
          }
          .included-pro-header, .included-pro-body, .included-pro-footer {
            padding-left: max(20px, env(safe-area-inset-left));
            padding-right: max(20px, env(safe-area-inset-right));
          }
        }
      `}</style>
      {variant === "prompt" && <style>{`
        .included-pro-prompt:hover { border-bottom-color: rgba(255,255,255,0.35) !important; }
        .included-pro-prompt:focus-visible { outline: 2px solid ${GREEN}; }
      `}</style>}
    </section>
  )
}
