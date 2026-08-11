"use client"

import { useState } from "react"

type Tab = {
  key: string
  label: string
  sublabel: string
  html: string
}

export default function EmailPreviewTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(0)

  return (
    <div>
      <div className="hq-filter-row" style={{ marginBottom: 20 }}>
        {tabs.map((tab, i) => (
          <button key={tab.key} type="button" data-active={active === i} onClick={() => setActive(i)}>
            {tab.label}
            <span style={{ display: "block", marginTop: 2, fontWeight: 500, color: "var(--hq-dim)" }}>{tab.sublabel}</span>
          </button>
        ))}
      </div>

      <div style={{
        borderRadius: 4,
        overflow: "hidden",
        border: "1px solid var(--hq-border)",
        backgroundColor: "#f5f5f5",
      }}>
        <iframe
          key={tabs[active].key}
          srcDoc={tabs[active].html}
          style={{
            width: "100%",
            height: 700,
            border: "none",
            display: "block",
          }}
          sandbox="allow-same-origin"
          title={tabs[active].label}
        />
      </div>

      <p className="hq-form-note" style={{ textAlign: "center" }}>
        Rendered with sample lead data - Maria Santos, (520) 555-0142, maria@example.com
      </p>
    </div>
  )
}
