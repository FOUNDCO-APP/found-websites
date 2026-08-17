"use client"

import { useEffect, useState } from "react"
import { connectCustomDomain, checkDomainStatus, disconnectDomain, probeDomainConnect, requestDomainHelp } from "./actions"
import { TYPE, TEXT_OPACITY, GREEN, BLACK } from "@/lib/dashboard/typography"

type Props = {
  initialDomain: string | null
  plan: string | null
  subscriptionStatus: string | null
  companySlug: string
  contactName?: string | null
  enableDomainConnectProbe?: boolean
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

type DomainConnectProbeResult = {
  success: boolean
  domain?: string
  discoveryName?: string
  registrarSupportsDomainConnect?: boolean
  providerHost?: string
  templateAvailable?: boolean | null
  status?: "not_available" | "provider_discovered" | "probe_error" | "internal_only"
  message?: string
  error?: string
}

const DNS_RECORDS = [
  { type: "A record",     label: "root domain", host: "@",   value: "76.76.21.21" },
  { type: "CNAME record", label: "www",          host: "www", value: "cname.vercel-dns.com" },
]

// Amber/red are reserved for a genuine problem, not for "you haven't
// finished yet." Neutral matches the same dark-card look used everywhere
// else in this file (see the no-domain-connected card below).
const AMBER = "rgba(255,180,0,0.9)"
const RED = "rgba(255,130,130,0.9)"
const NEUTRAL_BORDER = "1px solid rgba(255,255,255,0.08)"
const NEUTRAL_BG = "rgba(255,255,255,0.03)"

// Guide-only support contact for owners who get stuck on DNS. We never take
// a client's registrar login - Shawn stays on text/call while they click,
// per the locked no-registrar-credentials security decision. Copy must
// never imply Found does the setup unilaterally - Found can only walk an
// owner through it live, not connect the domain without their involvement.
const FOUND_HELP_PHONE_DISPLAY = "(520) 222-6308"
const FOUND_HELP_PHONE_SMS = "5202226308"

// Custom domains are free on every plan (shipped June 2026) - this component
// used to gate behind Pro/Business, left stale after that decision. Kept the
// props so callers don't need to change, just no longer used to gate.
export default function DomainConnector({ initialDomain, companySlug, contactName, enableDomainConnectProbe = false }: Props) {
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
  const [probingDomainConnect, setProbingDomainConnect] = useState(false)
  const [domainConnectProbe, setDomainConnectProbe] = useState<DomainConnectProbeResult | null>(null)
  const [requestingHelp, setRequestingHelp] = useState(false)
  const [helpRequested, setHelpRequested] = useState(false)
  const [helpError, setHelpError] = useState("")

  const isConnected = !!connectedDomain
  // Below this many checks, always show the calm "still checking" message even
  // if Vercel already reports misconfigured - DNS propagation isn't instant,
  // and flagging "records look wrong" on the very first check (when it's
  // almost certainly just still propagating) would be a false alarm. Past
  // this many checks, a still-misconfigured result is worth surfacing as
  // something the owner may actually need to fix, not just wait out.
  const MISCONFIGURED_GRACE_CHECKS = 3
  const showMisconfiguredHelp = !verified && manualStepConfirmed && misconfigured && checkAttempts >= MISCONFIGURED_GRACE_CHECKS
  // The only state that earns the amber "something's actually wrong" look.
  // Every other unverified moment (just connected, waiting, checking) is a
  // normal step in a normal flow, not a warning.
  const hasRealProblem = showMisconfiguredHelp

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

  function domainPersonInstructions() {
    return [
      `Please connect ${connectedDomain} to my Found website.`,
      "",
      "Add or replace these DNS records where the domain is managed:",
      "",
      "1) Root domain",
      "Type: A",
      "Name/Host: @",
      "Value/Points to: 76.76.21.21",
      "",
      "2) WWW address",
      "Type: CNAME",
      "Name/Host: www",
      "Value/Points to: cname.vercel-dns.com",
      "",
      "Important: if a record with the same type and name already exists, replace it instead of adding a duplicate.",
      "Do not change nameservers, MX, SPF, DKIM, DMARC, or any email records.",
      "",
      "After the records are saved, Found will check both:",
      `- ${connectedDomain}`,
      `- www.${connectedDomain}`,
    ].join("\n")
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

  async function handleDomainConnectProbe() {
    if (!connectedDomain) return
    setProbingDomainConnect(true)
    const result = await probeDomainConnect(connectedDomain)
    setDomainConnectProbe(result)
    setProbingDomainConnect(false)
  }

  function handleConfirmManualStep() {
    setManualStepConfirmed(true)
    handleCheck()
  }

  // Redesigned 2026-08-17 (real mockup reviewed and approved before this
  // build): each record is a small legible card - a quiet label on top,
  // the value itself large and prominent (the thing an owner actually
  // reads/copies), no monospace, no shouting orange type badge. Inter
  // throughout, matching the locked "one typeface" decision.
  function DnsRecordsList() {
    return (
      <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
        {DNS_RECORDS.map((rec, i) => (
          <div key={i} style={{
            borderRadius: 16, padding: "14px 16px",
            backgroundColor: "rgba(255,255,255,0.045)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.42)" }}>
                {rec.type} — {rec.label}
              </span>
              <button
                onClick={() => copyToClipboard(rec.value, rec.type + rec.host)}
                style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 12.5, fontWeight: 700, color: copied === rec.type + rec.host ? "rgba(255,255,255,0.5)" : GREEN }}>
                {copied === rec.type + rec.host ? "Copied" : "Copy"}
              </button>
            </div>
            <div style={{ marginTop: 6, fontSize: 19, fontWeight: 600, letterSpacing: "-0.005em", color: "white", wordBreak: "break-all" as const }}>
              {rec.value}
            </div>
          </div>
        ))}
      </div>
    )
  }

  async function handleRequestHelp() {
    setRequestingHelp(true)
    setHelpError("")
    const result = await requestDomainHelp(connectedDomain)
    setRequestingHelp(false)
    if (!result.success) {
      setHelpError(result.error ?? "Couldn't send that — text us instead.")
      return
    }
    setHelpRequested(true)
  }

  // Fully standalone card, rendered as a sibling of the domain-status card
  // below, never nested inside it. Neutral background - green is reserved
  // for the one actual action (the Text Us button), not a background wash
  // for the whole card. Copy promises only what Found can actually do:
  // guide live, never "set it up for you" unilaterally (no registrar
  // credentials, per the locked security decision).
  function StillStuckPanel() {
    const smsBody = encodeURIComponent(
      `Hi, I need help connecting my domain (${connectedDomain || "my domain"}) to Found.${contactName ? ` - ${contactName}` : ""}`
    )
    return (
      <div style={{
        borderRadius: 20, padding: "22px 22px 20px",
        backgroundColor: NEUTRAL_BG, border: NEUTRAL_BORDER,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
          <div style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 11, backgroundColor: `${GREEN}1f`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          </div>
          <div style={{ paddingTop: 2 }}>
            <p style={{ margin: "0 0 4px", ...TYPE.subhead, fontWeight: 700, color: "white" }}>
              Still stuck? We&apos;ll walk you through it
            </p>
            <p style={{ margin: 0, ...TYPE.footnote, fontWeight: 400, color: "rgba(255,255,255,0.5)", lineHeight: 1.55 }}>
              Text us and we&apos;ll stay with you live while you connect it. No tech skills needed.
            </p>
          </div>
        </div>
        <a
          href={`sms:${FOUND_HELP_PHONE_SMS}?body=${smsBody}`}
          style={{ display: "block", textAlign: "center" as const, padding: "13px 0", borderRadius: 12, border: "none", backgroundColor: GREEN, color: BLACK, ...TYPE.subhead, fontWeight: 700, textDecoration: "none" }}>
          Text us: {FOUND_HELP_PHONE_DISPLAY}
        </a>
        {helpRequested ? (
          <p style={{ margin: "10px 0 0", ...TYPE.caption, color: GREEN, textAlign: "center" as const, fontWeight: 700 }}>
            We got it — we&apos;ll reach out shortly.
          </p>
        ) : (
          <button
            onClick={handleRequestHelp}
            disabled={requestingHelp}
            style={{ display: "block", width: "100%", marginTop: 10, background: "none", border: "none", padding: 0, cursor: requestingHelp ? "default" : "pointer", ...TYPE.caption, textTransform: "none" as const, letterSpacing: "normal", fontWeight: 600, color: requestingHelp ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.45)", textAlign: "center" as const }}>
            {requestingHelp ? "Sending…" : "Have us reach out instead — no typing needed"}
          </button>
        )}
        {helpError && (
          <p style={{ margin: "8px 0 0", ...TYPE.caption, color: RED, textAlign: "center" as const }}>{helpError}</p>
        )}
      </div>
    )
  }

  function DomainStatusRows() {
    if (!domainStatuses) return null
    const rows = [domainStatuses.root, domainStatuses.www]

    return (
      <div style={{ padding: "0 24px 4px", display: "flex", flexDirection: "column" as const, gap: 10 }}>
        {rows.map(status => {
          const live = status.ownershipVerified && !status.misconfigured
          // Only escalate to amber once the owner has actually tried and
          // it's still wrong - before that, "Needs DNS" is just the normal
          // starting state, not a problem.
          const rowHasProblem = status.misconfigured && manualStepConfirmed
          const label = live ? "Live" : status.registered === false ? "Needs Found setup" : "Needs DNS"
          const color = live ? GREEN : status.registered === false ? RED : rowHasProblem ? AMBER : "rgba(255,255,255,0.4)"

          return (
            <div
              key={status.hostname}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}
            >
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.4)" }}>
                  {status.label === "Root" ? "Root domain" : "www address"}
                </span>
                <span style={{ fontSize: 14.5, fontWeight: 600, color: "rgba(255,255,255,0.85)", wordBreak: "break-word" as const }}>
                  {status.hostname}
                </span>
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 700, color, whiteSpace: "nowrap" as const }}>
                {label}
              </span>
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
      <div style={{ display: "flex", flexDirection: "column" as const, gap: 14 }}>
        <div style={{
          borderRadius: 22, overflow: "hidden",
          border: verified ? `1px solid ${GREEN}44` : hasRealProblem ? "1px solid rgba(255,180,0,0.28)" : NEUTRAL_BORDER,
          backgroundColor: verified ? `${GREEN}08` : hasRealProblem ? "rgba(255,180,0,0.045)" : NEUTRAL_BG,
        }}>
          {/* Domain header - the domain name is the hero, status is a quiet pill beneath it */}
          <div style={{ padding: "24px 24px 20px", display: "flex", flexDirection: "column" as const, gap: 10 }}>
            <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: "-0.01em", color: "white", wordBreak: "break-all" as const }}>
              {connectedDomain}
            </div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 7, width: "fit-content",
              padding: "5px 11px 5px 9px", borderRadius: 999,
              backgroundColor: verified ? `${GREEN}26` : hasRealProblem ? "rgba(255,180,0,0.15)" : "rgba(255,255,255,0.07)",
            }}>
              {verified ? (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: hasRealProblem ? AMBER : "rgba(255,255,255,0.5)", animation: "pulse 2s infinite" }}/>
              )}
              <span style={{ fontSize: 12.5, fontWeight: 700, color: verified ? GREEN : hasRealProblem ? AMBER : "rgba(255,255,255,0.65)" }}>
                {verified
                  ? "Live — root and www both work"
                  : needsFoundRepair
                    ? "Found needs to finish setup"
                    : manualStepConfirmed
                      ? "Checking — this can take a few minutes"
                      : hasRealProblem
                        ? "Records don't look right yet"
                        : "Waiting on DNS"}
              </span>
            </div>
          </div>

          <DomainStatusRows />

          {!verified && needsFoundRepair && (
            <div style={{ padding: "20px 24px 0" }}>
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
            <div style={{ padding: "22px 24px 24px", display: "flex", flexDirection: "column" as const, gap: 16 }}>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "white" }}>
                  Add these two records
                </p>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 400, lineHeight: 1.5, color: "rgba(255,255,255,0.45)" }}>
                  At the registrar where the domain was bought — GoDaddy or Namecheap work the same way.
                </p>
              </div>

              <DnsRecordsList />

              {verificationRecords.length > 0 && (
                <div>
                  <p style={{ margin: "0 0 8px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>
                    Also add this verification record:
                  </p>
                  <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                    {verificationRecords.map((rec, i) => (
                      <div key={i} style={{ borderRadius: 14, padding: "11px 14px", backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.42)" }}>{rec.type} record — {rec.host}</div>
                        <div style={{ fontSize: 14.5, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginTop: 2, wordBreak: "break-all" as const }}>{rec.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p style={{ margin: 0, fontSize: 13, fontWeight: 400, lineHeight: 1.55, color: "rgba(255,255,255,0.4)" }}>
                Already have a record with this name? Replace it instead of adding a second one.
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" as const }}>
                <a href="https://dcc.godaddy.com/control/portfolio" target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 13.5, fontWeight: 600, color: "rgba(255,255,255,0.55)", textDecoration: "underline", textDecorationColor: "rgba(255,255,255,0.2)" }}>
                  Open GoDaddy →
                </a>
                <a href="https://ap.www.namecheap.com/domains/list/" target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 13.5, fontWeight: 600, color: "rgba(255,255,255,0.55)", textDecoration: "underline", textDecorationColor: "rgba(255,255,255,0.2)" }}>
                  Open Namecheap →
                </a>
                <button
                  onClick={() => copyToClipboard(domainPersonInstructions(), "domain-person-instructions")}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 13.5, fontWeight: 600, color: copied === "domain-person-instructions" ? GREEN : "rgba(255,255,255,0.55)", textDecoration: "underline", textDecorationColor: "rgba(255,255,255,0.2)" }}>
                  {copied === "domain-person-instructions" ? "Copied instructions" : "Copy instructions for my domain person"}
                </button>
              </div>

              {enableDomainConnectProbe && (
                <div style={{ borderRadius: 14, padding: "12px 14px", backgroundColor: "rgba(255,255,255,0.035)", border: "1px dashed rgba(255,255,255,0.14)" }}>
                  <div style={{ ...TYPE.caption, color: "rgba(255,255,255,0.42)", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.4 }}>
                    Internal automation proof
                  </div>
                  <p style={{ margin: "7px 0 10px", ...TYPE.footnote, color: "rgba(255,255,255,0.62)", lineHeight: 1.55 }}>
                    Checks whether this registrar exposes Domain Connect. Customers do not see this yet.
                  </p>
                  <button
                    onClick={handleDomainConnectProbe}
                    disabled={probingDomainConnect}
                    style={{ width: "100%", padding: "10px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.05)", color: probingDomainConnect ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.8)", ...TYPE.footnote, fontWeight: 700, cursor: probingDomainConnect ? "default" : "pointer" }}>
                    {probingDomainConnect ? "Checking…" : "Check automatic setup"}
                  </button>
                  {domainConnectProbe && (
                    <div style={{ marginTop: 10, display: "grid", gap: 6, ...TYPE.caption, color: "rgba(255,255,255,0.58)", lineHeight: 1.45 }}>
                      <div>Domain Connect: <strong style={{ color: domainConnectProbe.registrarSupportsDomainConnect ? GREEN : AMBER }}>{domainConnectProbe.registrarSupportsDomainConnect ? "Detected" : "Not detected"}</strong></div>
                      {domainConnectProbe.discoveryName && <div>Lookup: <span>{domainConnectProbe.discoveryName}</span></div>}
                      {domainConnectProbe.providerHost && <div>Provider: <span>{domainConnectProbe.providerHost}</span></div>}
                      <div>Template: <strong style={{ color: domainConnectProbe.templateAvailable ? GREEN : AMBER }}>{domainConnectProbe.templateAvailable === true ? "Available" : domainConnectProbe.templateAvailable === false ? "Unavailable" : "Not proven yet"}</strong></div>
                      <div style={{ color: domainConnectProbe.error ? RED : "rgba(255,255,255,0.5)" }}>
                        {domainConnectProbe.error ?? domainConnectProbe.message}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleConfirmManualStep}
                style={{ width: "100%", padding: "15px 0", borderRadius: 14, border: "none", backgroundColor: GREEN, color: BLACK, fontSize: 15.5, fontWeight: 700, letterSpacing: "-0.005em", cursor: "pointer" }}>
                Done — I added these records
              </button>
            </div>
          )}

          {!verified && manualStepConfirmed && !showMisconfiguredHelp && (
            <div style={{ padding: "20px 24px 24px" }}>
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
            <div style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column" as const, gap: 14 }}>
              <p style={{ margin: 0, ...TYPE.footnote, fontWeight: 400, color: AMBER, lineHeight: 1.6 }}>
                We&apos;re seeing your domain, but the records don&apos;t look right yet — double check the values below match exactly.
              </p>
              <DnsRecordsList />
              <p style={{ margin: 0, ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, lineHeight: 1.6 }}>
                Fixed it? Give it a few minutes, then check again below.
              </p>
            </div>
          )}

          {!verified && (
            <>
              {/* Check / Disconnect */}
              <div style={{ padding: "0 24px 24px", display: "flex", alignItems: "center", justifyContent: "center", gap: 18 }}>
                <button
                  onClick={handleCheck}
                  disabled={checking}
                  style={{ background: "none", border: "none", padding: 0, cursor: checking ? "default" : "pointer", fontSize: 13, fontWeight: 600, color: checking ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.5)" }}>
                  {checking ? "Checking…" : "Check connection"}
                </button>
                <span style={{ width: 3, height: 3, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.2)" }}/>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "rgba(255,120,120,0.6)" }}>
                  {disconnecting ? "…" : "Remove domain"}
                </button>
              </div>

              {error && (
                <div style={{ margin: "0 24px 20px", padding: "10px 14px", borderRadius: 10, backgroundColor: "rgba(255,100,100,0.08)", border: "1px solid rgba(255,100,100,0.15)" }}>
                  <p style={{ margin: 0, ...TYPE.footnote, color: RED }}>{error}</p>
                </div>
              )}
            </>
          )}

          {verified && (
            <div style={{ padding: "22px 24px 24px", display: "flex", gap: 10 }}>
              <a
                href={`https://${connectedDomain}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ flex: 2, padding: "15px 0", borderRadius: 14, border: `1px solid ${GREEN}33`, backgroundColor: `${GREEN}15`, color: GREEN, fontSize: 15, fontWeight: 700, textDecoration: "none", textAlign: "center" as const }}>
                Visit Site →
              </a>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                style={{ flex: 1, padding: "15px 0", borderRadius: 14, border: "1px solid rgba(255,70,70,0.2)", backgroundColor: "rgba(255,70,70,0.08)", color: "rgba(255,100,100,0.7)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {disconnecting ? "…" : "Remove"}
              </button>
            </div>
          )}

          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
        </div>

        {/* Fully separate card, not nested inside the status card above. */}
        {!verified && (!manualStepConfirmed || showMisconfiguredHelp) && (
          <StillStuckPanel />
        )}
      </div>
    )
  }

  // No domain connected — show input
  return (
    <div style={{
      borderRadius: 18, padding: "20px",
      backgroundColor: NEUTRAL_BG,
      border: NEUTRAL_BORDER,
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
        <p style={{ margin: "10px 0 0", ...TYPE.footnote, color: RED }}>{error}</p>
      )}

      <p style={{ margin: "12px 0 0", ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})`, lineHeight: 1.6 }}>
        You&apos;ll get step-by-step DNS instructions — or we&apos;ll walk you through it if you&apos;d rather. Usually live within minutes.
      </p>

      <p style={{ margin: "8px 0 0", ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})`, lineHeight: 1.6 }}>
        Don&apos;t have a domain yet? We recommend GoDaddy first, then Namecheap. Other registrars still work manually.
      </p>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  )
}
