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

const buttonStyle = { minHeight: 44, padding: "10px 16px", borderRadius: 12, border: "1px solid #555", background: "transparent", color: "white", fontSize: 14, cursor: "pointer" } as const

export default function IncludedProTool({ companyId, currentIncludedSlug, disabledAddonSlugs, paidAddonSlugs, variant }: IncludedProToolProps) {
  const router = useRouter()
  const pathname = usePathname()
  const prefix = pathname?.startsWith("/dashboard") ? "/dashboard" : ""
  const titleId = useId()
  const descriptionId = useId()
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
    <section style={{ padding: 16, marginBottom: 16, border: "1px solid #444", borderRadius: 14, color: "white", background: "#161616" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ flex: "1 1 200px" }}>
          <h2 style={{ margin: "0 0 6px", fontSize: 17 }}>{current ? `${current.label} is included with Pro` : "Choose your included Pro tool"}</h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "#bbb" }}>One tool is included. No extra charge. Choose when you're ready.</p>
        </div>
        <button ref={trigger} type="button" style={buttonStyle} onClick={() => {
          if (!inFlight.current && (!uncertain || rechecked)) {
            setSelected(currentIncludedSlug ?? "")
            setConfirmTurnOn(false)
            setSavedSlug(null)
            setUncertain(false)
            setError(null)
          }
          setOpen(true)
        }}>{currentIncludedSlug ? "Manage" : "Choose a tool"}</button>
      </div>
      {open && <dialog ref={dialog} aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={close} onClose={close} style={{ width: "min(480px, calc(100vw - 24px))", maxHeight: "calc(100dvh - 32px)", overflowY: "auto", boxSizing: "border-box", borderRadius: 20, border: "1px solid #555", padding: 20, background: "#161616", color: "white" }}>
        <h2 id={titleId} style={{ margin: "0 0 8px", fontSize: 22 }}>{saved ? "Your choice is saved" : "Choose your included Pro tool"}</h2>
        <p id={descriptionId} style={{ color: "#bbb", lineHeight: 1.5 }}>{saved ? saved.slug === "reservation_calendar" ? "Booking Calendar is included. Set and save your hours before customers can book." : `${saved.label} is included. Continue setup before using it. Payments may need a connected payment account.` : "One tool is included with Pro. This choice adds no charge and doesn't change any separately paid tools."}</p>
        {saved ? <Link href={`${prefix}${saved.path}`} onClick={close} style={{ ...buttonStyle, display: "inline-flex", alignItems: "center", background: GREEN, color: BLACK, textDecoration: "none" }}>Continue setup</Link> : <>
          <fieldset disabled={saving || uncertain} style={{ border: 0, padding: 0, margin: 0 }}>
            <legend style={{ marginBottom: 10 }}>Choose one tool</legend>
            {tools.map(tool => {
              const paid = paidAddonSlugs.includes(tool.slug)
              return <label key={tool.slug} style={{ display: "flex", gap: 12, padding: "14px 10px", marginBottom: 8, borderRadius: 12, border: `1px solid ${selected === tool.slug ? GREEN : "#555"}`, lineHeight: 1.5 }}>
                <input type="radio" name={titleId} value={tool.slug} checked={selected === tool.slug} disabled={paid} onChange={() => { setSelected(tool.slug); setConfirmTurnOn(false); setError(null) }} style={{ marginTop: 5, accentColor: GREEN, flexShrink: 0 }} />
                <span><strong>{tool.label}</strong><span style={{ display: "block", color: "#bbb", fontSize: 14 }}>{tool.description}</span>{tool.slug === currentIncludedSlug && <span style={{ display: "block", color: GREEN }}>Currently included</span>}{paid && <span style={{ display: "block", color: "#ddd", fontSize: 14 }}>Already paid separately. Manage this in Billing; choosing an included tool won't change that charge.</span>}</span>
              </label>
            })}
            {current && selected && selected !== currentIncludedSlug && <p style={{ lineHeight: 1.5 }}>This replaces {current.label} as your included tool. It may no longer be available unless paid separately.</p>}
            {hidden && chosen && <label style={{ display: "flex", gap: 12, padding: "14px 0", lineHeight: 1.5 }}><input type="checkbox" checked={confirmTurnOn} onChange={event => setConfirmTurnOn(event.target.checked)} style={{ flexShrink: 0, marginTop: 5 }} /><span>Include this tool and turn it on for your website and tool settings. Review its website settings during setup before customers use it.</span></label>}
          </fieldset>
          {error && <p role="alert" style={{ color: "#fda4af", lineHeight: 1.5 }}>{error}</p>}
          {uncertain ? <button type="button" style={buttonStyle} disabled={checking} onClick={checkSavedChoice}>{checking ? "Checking..." : "Check saved choice"}</button> : <button type="button" disabled={saving || !chosen || paidAddonSlugs.includes(selected) || (hidden && !confirmTurnOn)} onClick={save} style={{ ...buttonStyle, width: "100%", background: GREEN, color: BLACK, opacity: saving || !chosen || paidAddonSlugs.includes(selected) || (hidden && !confirmTurnOn) ? 0.5 : 1 }}>{saving ? "Saving choice..." : hidden ? "Include and turn on" : "Save included tool"}</button>}
          {uncertain && <p role="status" style={{ lineHeight: 1.5, color: "#bbb" }}>Current saved choice: {current?.label ?? "None"}. {rechecked ? "The latest choice is shown. Close and reopen to choose again." : "Check again after the original save finishes. No second save will be sent while it is unresolved."}</p>}
        </>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
          <button type="button" style={buttonStyle} onClick={close}>{saved ? "Close" : "Later"}</button>
          <Link href={`${prefix}/billing`} onClick={close} style={{ color: "#ddd", padding: "12px 0" }}>Manage billing</Link>
        </div>
      </dialog>}
    </section>
  )
}
