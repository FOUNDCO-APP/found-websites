"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { performSignOut } from "@/lib/auth/clientSignOut"

function GearIcon({ active }: { active?: boolean }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={active ? "white" : "rgba(255,255,255,0.62)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  )
}

function SwitchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.66)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h13l-3-3M20 17H7l3 3"/>
    </svg>
  )
}
function TeamIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.66)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 20v-1.5a3.5 3.5 0 00-3.5-3.5h-5A3.5 3.5 0 005 18.5V20"/>
      <circle cx="9.5" cy="8" r="3.25"/>
      <path d="M19 20v-1.5a3.5 3.5 0 00-2.5-3.36M14.5 4.7a3.25 3.25 0 010 6.1"/>
    </svg>
  )
}
function StorefrontIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.66)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9.5V20a1 1 0 001 1h14a1 1 0 001-1V9.5"/>
      <path d="M2.5 9.5l1.4-5A1 1 0 014.86 4h14.28a1 1 0 01.96.5l1.4 5a2.6 2.6 0 01-5.15.5 2.6 2.6 0 01-5.15 0 2.6 2.6 0 01-5.15 0 2.6 2.6 0 01-5.15-.5z"/>
    </svg>
  )
}
function CardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.66)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="5.5" width="19" height="13" rx="2.2"/><path d="M2.5 10h19"/>
    </svg>
  )
}
function ExitIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F43F5E" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}

function MenuRow({ href, onClick, icon, label, danger }: { href?: string; onClick?: () => void; icon: React.ReactNode; label: string; danger?: boolean }) {
  const content = (
    <div style={{
      minHeight: 52, borderRadius: 14, padding: "0 12px",
      display: "flex", alignItems: "center", gap: 12,
      backgroundColor: "transparent", cursor: "pointer",
    }}>
      <span style={{
        width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
        backgroundColor: "rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {icon}
      </span>
      <span style={{ fontSize: 15, fontWeight: 650, color: danger ? "#F43F5E" : "rgba(255,255,255,0.94)" }}>{label}</span>
    </div>
  )
  if (href) {
    return <Link href={href} style={{ textDecoration: "none", display: "block" }} onClick={onClick}>{content}</Link>
  }
  return <button onClick={onClick} style={{ width: "100%", background: "none", border: "none", padding: 0, textAlign: "left", display: "block" }}>{content}</button>
}

function Divider() {
  return <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.07)", margin: "6px 6px" }} />
}

export default function AccountMenu({
  hasMultiple,
}: {
  hasMultiple: boolean
}) {
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const router = useRouter()

  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)
    await performSignOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Account and settings"
        style={{
          width: 30, height: 30, borderRadius: 9, flexShrink: 0,
          border: "none", cursor: "pointer",
          backgroundColor: open ? "rgba(255,255,255,0.1)" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <GearIcon active={open} />
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, backgroundColor: "transparent", zIndex: 55 }} />
          <div style={{
            position: "absolute", top: "calc(100% + 10px)", right: 0,
            width: "min(268px, calc(100vw - 40px))",
            zIndex: 56,
            backgroundColor: "rgba(15,18,16,0.97)",
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.11)",
            padding: 8,
            boxShadow: "0 18px 54px rgba(0,0,0,0.5)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}>
            {hasMultiple && (
              <>
                <MenuRow href="/select" icon={<SwitchIcon />} label="Switch Business" onClick={() => setOpen(false)} />
                <Divider />
              </>
            )}
            <MenuRow href="/team" icon={<TeamIcon />} label="Team" onClick={() => setOpen(false)} />
            <MenuRow href="/business-info" icon={<StorefrontIcon />} label="Business Info" onClick={() => setOpen(false)} />
            <MenuRow href="/billing" icon={<CardIcon />} label="Billing & Plan" onClick={() => setOpen(false)} />
            <Divider />
            <MenuRow icon={<ExitIcon />} label={signingOut ? "Signing out…" : "Sign Out"} danger onClick={handleSignOut} />
          </div>
        </>
      )}
    </div>
  )
}
