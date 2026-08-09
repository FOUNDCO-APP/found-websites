"use client"

import { useRouter } from "next/navigation"
import { performSignOut } from "@/lib/auth/clientSignOut"

export default function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    await performSignOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      style={{
        width: "100%",
        borderRadius: 14,
        padding: "16px 18px",
        backgroundColor: "rgba(244,63,94,0.06)",
        border: "1px solid rgba(244,63,94,0.12)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontFamily: "inherit",
      }}>
      <span style={{ fontSize: "0.9375rem", color: "#F43F5E", fontWeight: 500 }}>Sign out</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="#F43F5E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
    </button>
  )
}
