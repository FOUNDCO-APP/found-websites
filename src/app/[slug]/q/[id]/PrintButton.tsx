"use client"

export default function PrintButton({ estimateId, slug }: { estimateId: string; slug: string }) {
  return (
    <button
      onClick={() => window.open(`/${slug}/q/${estimateId}/print`, "_blank")}
      className="no-print"
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "13px 24px", borderRadius: 14,
        backgroundColor: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: 600,
        cursor: "pointer", width: "100%", justifyContent: "center",
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 6 2 18 2 18 9"/>
        <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
        <rect x="6" y="14" width="12" height="8"/>
      </svg>
      Download / Print PDF
    </button>
  )
}
