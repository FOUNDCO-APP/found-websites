"use client"

import { useEffect, useState } from "react"
import { connectCustomDomain, checkDomainStatus, disconnectDomain } from "./actions"
import { TYPE, TEXT_OPACITY, GREEN, BLACK } from "@/lib/dashboard/typography"

type Props = {
  initialDomain: string | null
  plan: string | null
  subscriptionStatus: string | null
  companySlug: string
}

type HostnameStatus = {
  hostname: string
  label: "Root" | "WWW"
  ownershipVerified: boolean
  misconfigured: boolean
  registered?: boolean
  error?: string
}

type DomainCheckResult = {
  verified: boolean
  misconfigured?: boolean
  root?: HostnameStatus
  www?: HostnameStatus
  needsFoundRepair?: boolean
  error?: string
}

const DNS_RECORDS = [
  { type: "A",     host: "@",   value: "76.76.21.21",         note: "Points your root domain to Found" },
  { type: "CNAME", host: "www", value: "cname.vercel-dns.com", note: "Points www to Found" },
]

// Custom domains are free on every plan (shipped June 2026) - this component
// used to gate behind Pro/Business, left stale after that decision. Kept the
// props so callers don't need to change, just no longer used to gate.
export default function DomainConnector({ initialDomain, companySlug }: Props) {
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
  const [manualStepConfirmed, setManualStepConfirmed] = useState(false)
  const [misconfigured, setMisconfigured] = useState(false)
  const [checkAttempts, setCheckAttempts] = useState(0)
  const [domainStatuses, setDomainStatuses] = useState<{ root: HostnameStatus; www: HostnameStatus } | null>(null)
  const [needsFoundRepair, setNeedsFoundRepair] = useState(false)

  const isConnected = !!connectedDomain
  // Below this many checks, always show the calm "still checking" message even
  // if Vercel already reports misconfigured - DNS propagation isn't instant,
  // and flagging "records look wrong" on the very first check (when it's
  // almost certainly just still propagating) would be a false alarm. Past
  // this many checks, a still-misconfigured result is worth surfacing as
  // something the owner may actually need to fix, not just wait out.
  const MISCONFIGURED_GRACE_CHECKS = 3
  const showMisconfiguredHelp = !verified && manualStepConfirmed && misconfigured && checkAttempts >= MISCONFIGURED_GRACE_CHECKS

  function applyCheckResult(result: DomainCheckResult) {
    setVerified(result.verified)
    if (result.root && result.www) setDomainStatuses({ root: result.root, www: result.www })
    setNeedsFoundRepair(!!result.needsFoundRepair)
    if (result.verified) {
      setCheckAttempts(0)
      setMisconfigured(false)
      setNeedsFoundRepair(false)
      return
    }
    // A network/API error isn't evidence the records are wrong - only count
    // an actual "misconfigured" answer from Vercel toward the grace window.
    if (!result.error) {
      setCheckAttempts(n => n + 1)
      setMisconfigured(!!result.misconfigured)
    }
  }

  // Silently check status in the background - on mount (so a page reload
  // shows the real current state instead of assuming "not verified"), then
  // every 20s while unverified, so the owner doesn't have to remember to
  // tap "Check Connection" themselves. Stays quiet unless it finds success;
  // the manual button below is still what shows an explicit error.
  useEffect(() => {
    if (!connectedDomain || verified) return
    let cancelled = false

    async function poll() {
      const result = await checkDomainStatus(connectedDomain)
      if (!cancelled) applyCheckResult(result)
    }
    poll()
    const id = setInterval(poll, 20000)
    return () => { cancelled = true; clearInterval(id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedDomain, verified])

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
    applyCheckResult({ ...result, verified: result.verified ?? false })
    setVerificationRecords(result.verificationRecords ?? [])
    setManualStepConfirmed(false)
    setInputValue("")
  }

  async function handleRepairFoundConnection() {
    if (!connectedDomain) return
    setConnecting(true)
    setError("")
    const result = await connectCustomDomain(connectedDomain)
    setConnecting(false)
    if (!result.success || !result.domain) {
      setError(result.error ?? "Could not finish the Found domain setup")
      return
    }
    setConnectedDomain(result.domain)
    setDomain(result.domain)
    setVerificationRecords(result.verificationRecords ?? [])
    applyCheckResult({ ...result, verified: result.verified ?? false })
  }

  async function handleCheck() {
    if (!connectedDomain) return
    setChecking(true)
    const result = await checkDomainStatus(connectedDomain)
    setChecking(false)
    applyCheckResult(result)
    if (!result.verified) setError("DNS not detected yet — it can take up to 48 hours to propagate.")
    else setError("")
  }

  function handleConfirmManualStep() {
    setManualStepConfirmed(true)
    handleCheck()
  }

  function DnsRecordsList() {
    return (
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
    )
  }

  function DomainStatusRows() {
    if (!domainStatuses) return null
    const rows = [domainStatuses.root, domainStatuses.www]

    return (
      <div style={{ padding: "0 18px 14px", display: "flex", flexDirection: "column" as const, gap: 8 }}>
        {rows.map(status => {
          const live = status.ownershipVerified && !status.misconfigured
          const label = live ? "Live" : status.registered === false ? "Needs Found setup" : "Needs DNS"
          const color = live ? GREEN : status.registered === false ? "rgba(255,130,130,0.9)" : "rgba(255,180,0,0.9)"

          return (
            <div
              key={status.hostname}
              style={{
                borderRadius: 12,
                padding: "10px 12px",
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div>
                <div style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})`, fontWeight: 700, textTransform: "uppercase" }}>
                  {status.label === "Root" ? "Root domain" : "www address"}
                </div>
                <div style={{ ...TYPE.footnote, color: "white", fontWeight: 700, wordBreak: "break-word" }}>
                  {status.hostname}
                </div>
              </div>
              <div style={{ ...TYPE.caption, color, fontWeight: 800, whiteSpace: "nowrap" }}>
                {label}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  async function handleDisconnect() {
    if (!connectedDomain) return
    setDisconnecting(true)
    await disconnectDomain(connectedDomain)
    setConnectedDomain("")
    setDomain("")
    setVerified(false)
    setVerificationRecords([])
    setManualStepConfirmed(false)
    setMisconfigured(false)
    setCheckAttempts(0)
    setDomainStatuses(null)
    setNeedsFoundRepair(false)
    setError("")
    setDisconnecting(false)
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
              {verified
                ? "Live — root and www both work"
                : needsFoundRepair
                  ? "Found needs to finish adding both domain versions"
                  : manualStepConfirmed
                    ? "Checking root and www — this can take a few minutes"
                    : "Add both records below to finish connecting"}
            </div>
          </div>
        </div>

        <DomainStatusRows />

        {!verified && needsFoundRepair && (
          <div style={{ padding: "0 18px 16px" }}>
            <div style={{
              borderRadius: 14,
              padding: "13px 14px",
              backgroundColor: "rgba(255,100,100,0.07)",
              border: "1px solid rgba(255,100,100,0.16)",
            }}>
              <p style={{ margin: "0 0 10px", ...TYPE.footnote, fontWeight: 400, color: "rgba(255,210,210,0.9)", lineHeight: 1.6 }}>
                Found needs to add or repair one of the domain versions before DNS can finish.
                This only updates Found/Vercel. It will not change GoDaddy, Namecheap, or any registrar settings.
              </p>
              <button
                onClick={handleRepairFoundConnection}
                disabled={connecting}
                style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: "none", backgroundColor: connecting ? "rgba(255,255,255,0.06)" : GREEN, color: connecting ? "rgba(255,255,255,0.3)" : BLACK, ...TYPE.subhead, fontWeight: 700, cursor: connecting ? "default" : "pointer" }}>
                {connecting ? "Fixing…" : "Fix Found setup"}
              </button>
            </div>
          </div>
        )}

        {!verified && !manualStepConfirmed && (
          <>
            {/* DNS Records */}
            <div style={{ padding: "0 18px 16px" }}>
              <p style={{ margin: "0 0 10px", ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, lineHeight: 1.6 }}>
                Found checks both <strong style={{ color: "rgba(255,255,255,0.72)" }}>{connectedDomain}</strong> and <strong style={{ color: "rgba(255,255,255,0.72)" }}>www.{connectedDomain}</strong>. Add both records so either address works.
              </p>
              <p style={{ margin: "0 0 12px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
                Add these at the registrar where the domain was bought. We recommend GoDaddy first, then Namecheap. Other registrars work manually with the same records.
              </p>
              <DnsRecordsList />

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

              <p style={{ margin: "12px 0 0", ...TYPE.footnote, fontWeight: 400, color: "rgba(255,180,0,0.85)", lineHeight: 1.6 }}>
                If your registrar already shows a record with the same type and name, replace it instead of adding a second one — two records at the same spot will conflict.
              </p>

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <a href="https://dcc.godaddy.com/control/portfolio" target="_blank" rel="noopener noreferrer"
                  style={{ flex: 1, textAlign: "center" as const, padding: "10px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", ...TYPE.footnote, fontWeight: 600, textDecoration: "none" }}>
                  Open GoDaddy DNS settings →
                </a>
                <a href="https://ap.www.namecheap.com/domains/list/" target="_blank" rel="noopener noreferrer"
                  style={{ flex: 1, textAlign: "center" as const, padding: "10px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", ...TYPE.footnote, fontWeight: 600, textDecoration: "none" }}>
                  Open Namecheap DNS settings →
                </a>
              </div>

              <button
                onClick={handleConfirmManualStep}
                style={{ width: "100%", marginTop: 10, padding: "12px 0", borderRadius: 10, border: "none", backgroundColor: GREEN, color: BLACK, ...TYPE.subhead, fontWeight: 700, cursor: "pointer" }}>
                Done — I added these records
              </button>
            </div>
          </>
        )}

        {!verified && manualStepConfirmed && !showMisconfiguredHelp && (
          <div style={{ padding: "0 18px 16px" }}>
            <p style={{ margin: 0, ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, lineHeight: 1.6 }}>
              We're checking now. This usually takes a few minutes, but can take longer depending on your registrar — no need to keep refreshing, this screen will say &quot;Live&quot; the moment it's ready.
            </p>
            <button
              onClick={() => setManualStepConfirmed(false)}
              style={{ marginTop: 10, background: "none", border: "none", padding: 0, cursor: "pointer", ...TYPE.footnote, fontWeight: 600, color: GREEN, textDecoration: "underline" }}>
              Show the records again
            </button>
          </div>
        )}

        {!verified && manualStepConfirmed && showMisconfiguredHelp && (
          <div style={{ padding: "0 18px 16px" }}>
            <p style={{ margin: "0 0 12px", ...TYPE.footnote, fontWeight: 400, color: "rgba(255,180,0,0.9)", lineHeight: 1.6 }}>
              We&apos;re seeing your domain, but the records don&apos;t look right yet — double check the values below match exactly.
            </p>
            <DnsRecordsList />
            <p style={{ margin: "12px 0 0", ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, lineHeight: 1.6 }}>
              Fixed it? Give it a few minutes, then check again below.
            </p>
          </div>
        )}

        {!verified && (
          <>
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
        You&apos;ll get step-by-step DNS instructions for root and www.
        Usually live within minutes.
      </p>

      <p style={{ margin: "8px 0 0", ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})`, lineHeight: 1.6 }}>
        Don&apos;t have a domain yet? We recommend GoDaddy first, then Namecheap. Other registrars still work manually.
      </p>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  )
}
