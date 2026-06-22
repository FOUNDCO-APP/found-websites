"use client"

import { useState } from "react"
import { connectCustomDomain, checkDomainStatus, disconnectDomain } from "./actions"
import { TYPE, TEXT_OPACITY, GREEN, BLACK } from "@/lib/dashboard/typography"

type Props = {
  initialDomain: string | null
  plan: string | null
  subscriptionStatus: string | null
  companySlug: string
}

const DNS_RECORDS = [
  { type: "A",     host: "@",   value: "76.76.21.21",         note: "Points your root domain to Found" },
  { type: "CNAME", host: "www", value: "cname.vercel-dns.com", note: "Points www to Found" },
]

export default function DomainConnector({ initialDomain, plan, subscriptionStatus, companySlug }: Props) {
  const isPro = (plan === "found_pro" || plan === "found_business") &&
    (subscriptionStatus === "active" || subscriptionStatus === "trialing")

  const [domain, setDomain] = useState(initialDomain ?? "")
  const [connectedDomain, setConnectedDomain] = useState(initialDomain ?? "")
  const [verified, setVerified] = useState(false)
  const [verificationRecords, setVerificationRecords] = useState<{ type: string; host: string; value: string }[]>([])
  const [inputValue, setInputValue] = useState("")
  const [connecting, setConnecting] = useState(false)
  const [checking, setChecking] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState<string | null>(null)

  const isConnected = !!connectedDomain

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1800)
  }

  async function handleConnect() {
    if (!inputValue.trim()) return
    setConnecting(true)
    setError("")
    const result = await connectCustomDomain(inputValue)
    setConnecting(false)
    if (!result.success || !result.domain) {
      setError(result.error ?? "Something went wrong")
      return
    }
    setConnectedDomain(result.domain)
    setDomain(result.domain)
    setVerified(result.verified ?? false)
    setVerificationRecords(result.verificationRecords ?? [])
    setInputValue("")
  }

  async function handleCheck() {
    if (!connectedDomain) return
    setChecking(true)
    const result = await checkDomainStatus(connectedDomain)
    setChecking(false)
    setVerified(result.verified)
    if (!result.verified) setError("DNS not detected yet — it can take up to 48 hours to propagate.")
    else setError("")
  }

  async function handleDisconnect() {
    if (!connectedDomain) return
    setDisconnecting(true)
    await disconnectDomain(connectedDomain)
    setConnectedDomain("")
    setDomain("")
    setVerified(false)
    setVerificationRecords([])
    setError("")
    setDisconnecting(false)
  }

  if (!isPro) {
    return (
      <div style={{
        borderRadius: 18, padding: "20px 20px",
        backgroundColor: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
          <span style={{ ...TYPE.subhead, fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>
            Custom Domain
          </span>
        </div>
        <p style={{ margin: "0 0 14px", ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, lineHeight: 1.6 }}>
          Connect <strong style={{ color: "rgba(255,255,255,0.5)" }}>yourbusiness.com</strong> to your Found site.
          Available on Found Pro.
        </p>
        <a href="/more" style={{ textDecoration: "none" }}>
          <div style={{
            padding: "11px 18px", borderRadius: 10, textAlign: "center" as const,
            backgroundColor: `${GREEN}18`, border: `1px solid ${GREEN}33`,
            ...TYPE.subhead, fontWeight: 700, color: GREEN,
          }}>
            Upgrade to Found Pro →
          </div>
        </a>
      </div>
    )
  }

  if (isConnected) {
    return (
      <div style={{
        borderRadius: 18, overflow: "hidden",
        border: verified ? `1px solid ${GREEN}44` : "1px solid rgba(255,180,0,0.25)",
        backgroundColor: verified ? `${GREEN}08` : "rgba(255,180,0,0.04)",
      }}>
        {/* Domain header */}
        <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
            backgroundColor: verified ? `${GREEN}22` : "rgba(255,180,0,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {verified ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "rgba(255,180,0,0.8)", animation: "pulse 2s infinite" }}/>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ ...TYPE.subhead, fontWeight: 700, color: "white" }}>{connectedDomain}</div>
            <div style={{ ...TYPE.footnote, fontWeight: 400, color: verified ? GREEN : "rgba(255,180,0,0.8)" }}>
              {verified ? "Live — your site is live at this domain" : "Waiting for DNS — check back in a few minutes"}
            </div>
          </div>
        </div>

        {!verified && (
          <>
            {/* DNS Records */}
            <div style={{ padding: "0 18px 16px" }}>
              <p style={{ margin: "0 0 12px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
                Add these records at your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)
              </p>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
                {DNS_RECORDS.map((rec, i) => (
                  <div key={i} style={{
                    borderRadius: 12, padding: "11px 14px",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <div style={{ display: "flex", gap: 14, flex: 1, fontFamily: "monospace", fontSize: 12 }}>
                      <span style={{ color: "rgba(255,180,0,0.9)", fontWeight: 700, minWidth: 44 }}>{rec.type}</span>
                      <span style={{ color: "rgba(255,255,255,0.5)", minWidth: 30 }}>{rec.host}</span>
                      <span style={{ color: "white", fontWeight: 600, flex: 1 }}>{rec.value}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(rec.value, rec.type + rec.host)}
                      style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 6, backgroundColor: copied === rec.type + rec.host ? `${GREEN}22` : "rgba(255,255,255,0.06)", color: copied === rec.type + rec.host ? GREEN : "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700 }}>
                      {copied === rec.type + rec.host ? "✓" : "Copy"}
                    </button>
                  </div>
                ))}
              </div>

              {verificationRecords.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <p style={{ margin: "0 0 8px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>
                    Also add this verification record:
                  </p>
                  {verificationRecords.map((rec, i) => (
                    <div key={i} style={{ borderRadius: 12, padding: "10px 14px", backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", fontFamily: "monospace", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                      <span style={{ color: "rgba(255,180,0,0.8)", fontWeight: 700 }}>{rec.type}</span>
                      {" "}<span>{rec.host}</span>
                      {" "}<span style={{ color: "rgba(255,255,255,0.7)", wordBreak: "break-all" as const }}>{rec.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Check / Disconnect buttons */}
            <div style={{ padding: "0 18px 18px", display: "flex", gap: 8 }}>
              <button
                onClick={handleCheck}
                disabled={checking}
                style={{ flex: 2, padding: "12px 0", borderRadius: 10, border: "none", backgroundColor: checking ? "rgba(255,255,255,0.06)" : GREEN, color: checking ? "rgba(255,255,255,0.3)" : BLACK, ...TYPE.subhead, fontWeight: 700, cursor: checking ? "default" : "pointer" }}>
                {checking ? "Checking…" : "Check Connection"}
              </button>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: "1px solid rgba(255,70,70,0.2)", backgroundColor: "rgba(255,70,70,0.08)", color: "rgba(255,100,100,0.7)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {disconnecting ? "…" : "Remove"}
              </button>
            </div>

            {error && (
              <div style={{ margin: "0 18px 14px", padding: "10px 14px", borderRadius: 10, backgroundColor: "rgba(255,100,100,0.08)", border: "1px solid rgba(255,100,100,0.15)" }}>
                <p style={{ margin: 0, ...TYPE.footnote, color: "rgba(255,130,130,0.9)" }}>{error}</p>
              </div>
            )}
          </>
        )}

        {verified && (
          <div style={{ padding: "0 18px 18px", display: "flex", gap: 8 }}>
            <a
              href={`https://${connectedDomain}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ flex: 2, padding: "12px 0", borderRadius: 10, border: `1px solid ${GREEN}33`, backgroundColor: `${GREEN}15`, color: GREEN, ...TYPE.subhead, fontWeight: 700, textDecoration: "none", textAlign: "center" as const }}>
              Visit Site →
            </a>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: "1px solid rgba(255,70,70,0.2)", backgroundColor: "rgba(255,70,70,0.08)", color: "rgba(255,100,100,0.7)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {disconnecting ? "…" : "Remove"}
            </button>
          </div>
        )}

        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      </div>
    )
  }

  // No domain connected — show input
  return (
    <div style={{
      borderRadius: 18, padding: "20px",
      backgroundColor: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.07)",
    }}>
      <div style={{ marginBottom: 14 }}>
        <p style={{ margin: "0 0 4px", ...TYPE.subhead, fontWeight: 700, color: "white" }}>Custom Domain</p>
        <p style={{ margin: 0, ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, lineHeight: 1.6 }}>
          Connect <strong style={{ color: "rgba(255,255,255,0.5)" }}>yourbusiness.com</strong> so customers reach you directly — no foundco.app in the URL.
        </p>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={inputValue}
          onChange={e => { setInputValue(e.target.value); setError("") }}
          onKeyDown={e => e.key === "Enter" && handleConnect()}
          placeholder="yourbusiness.com"
          style={{
            flex: 1, padding: "13px 16px", borderRadius: 12,
            backgroundColor: "rgba(255,255,255,0.07)",
            border: error ? "1.5px solid rgba(255,100,100,0.5)" : `1.5px solid ${GREEN}33`,
            color: "white", fontSize: 15, outline: "none", fontFamily: "inherit",
          }}
        />
        <button
          onClick={handleConnect}
          disabled={connecting || !inputValue.trim()}
          style={{
            flexShrink: 0, padding: "13px 18px", borderRadius: 12, border: "none",
            backgroundColor: connecting || !inputValue.trim() ? "rgba(255,255,255,0.07)" : GREEN,
            color: connecting || !inputValue.trim() ? "rgba(255,255,255,0.3)" : BLACK,
            fontSize: 14, fontWeight: 700, cursor: connecting || !inputValue.trim() ? "default" : "pointer",
          }}>
          {connecting ? "…" : "Connect"}
        </button>
      </div>

      {error && (
        <p style={{ margin: "10px 0 0", ...TYPE.footnote, color: "rgba(255,130,130,0.9)" }}>{error}</p>
      )}

      <p style={{ margin: "12px 0 0", ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})`, lineHeight: 1.6 }}>
        You&apos;ll get step-by-step DNS instructions for any registrar.
        Usually live within minutes.
      </p>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  )
}
