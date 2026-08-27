"use client"

import { useMemo, useState } from "react"

const BASE = "https://foundco.app"

const PRESETS: { label: string; path: string; source: string; medium: string; campaign: string }[] = [
  { label: "Instagram bio", path: "/", source: "instagram", medium: "social", campaign: "bio" },
  { label: "Instagram story", path: "/onboarding", source: "instagram", medium: "social", campaign: "story" },
  { label: "Facebook page", path: "/", source: "facebook", medium: "social", campaign: "page" },
  { label: "Facebook post", path: "/how-it-works", source: "facebook", medium: "social", campaign: "post" },
  { label: "Google Business Profile", path: "/", source: "google", medium: "gbp", campaign: "profile" },
  { label: "Email signature", path: "/", source: "email", medium: "signature", campaign: "outreach" },
  { label: "Paid — Google Ads", path: "/", source: "googleads", medium: "cpc", campaign: "search" },
  { label: "Paid — Meta Ads", path: "/onboarding", source: "facebook", medium: "cpc", campaign: "prospecting" },
]

function build(path: string, source: string, medium: string, campaign: string) {
  const url = new URL(path || "/", BASE)
  if (source) url.searchParams.set("utm_source", source)
  if (medium) url.searchParams.set("utm_medium", medium)
  if (campaign) url.searchParams.set("utm_campaign", campaign)
  return url.toString()
}

function CopyRow({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="hq-row" style={{ display: "block" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <span className="hq-row-title">{label}</span>
        <button
          type="button"
          className={`hq-badge ${copied ? "hq-badge-success" : "hq-badge-quiet"}`}
          style={{ border: "none", cursor: "pointer" }}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url)
              setCopied(true)
              setTimeout(() => setCopied(false), 1600)
            } catch {}
          }}
        >
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <p className="hq-row-meta" style={{ marginTop: 4, wordBreak: "break-all" }}>{url}</p>
    </div>
  )
}

export function UtmLinkBuilder() {
  const [path, setPath] = useState("/")
  const [source, setSource] = useState("")
  const [medium, setMedium] = useState("")
  const [campaign, setCampaign] = useState("")

  const custom = useMemo(
    () => (source ? build(path, source, medium, campaign) : ""),
    [path, source, medium, campaign],
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="hq-panel">
        {PRESETS.map(p => (
          <CopyRow key={p.label} label={p.label} url={build(p.path, p.source, p.medium, p.campaign)} />
        ))}
      </div>

      <div className="hq-panel" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <p className="hq-row-title">Build a custom one</p>
        <input className="hq-input" placeholder="path (e.g. /plans)" value={path} onChange={e => setPath(e.target.value)} />
        <input className="hq-input" placeholder="utm_source (e.g. nextdoor)" value={source} onChange={e => setSource(e.target.value)} />
        <input className="hq-input" placeholder="utm_medium (e.g. social, cpc, email)" value={medium} onChange={e => setMedium(e.target.value)} />
        <input className="hq-input" placeholder="utm_campaign (e.g. fall-launch)" value={campaign} onChange={e => setCampaign(e.target.value)} />
        {custom && <CopyRow label="Your link" url={custom} />}
      </div>
    </div>
  )
}
