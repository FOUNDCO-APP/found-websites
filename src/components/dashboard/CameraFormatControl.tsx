"use client"

import React, { useEffect, useId, useRef, useState } from "react"

type Ratio = "16:9" | "4:3" | "1:1"

export default function CameraFormatControl({ ratio, portrait, onRatioChange, onPortraitChange, disabled = false, allowRatio = true }: {
  ratio: Ratio
  portrait: boolean
  onRatioChange: (ratio: Ratio) => void
  onPortraitChange: (portrait: boolean) => void
  disabled?: boolean
  allowRatio?: boolean
}) {
  const id = useId()
  const panel = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [formatOpen, setFormatOpen] = useState(false)
  const selection = `${ratio}${ratio === "1:1" ? "" : portrait ? " · Portrait" : " · Landscape"}`
  function close() {
    panel.current?.hidePopover()
    trigger.current?.focus()
  }
  useEffect(() => { if (disabled) panel.current?.hidePopover() }, [disabled])
  const button: React.CSSProperties = { minWidth: 44, minHeight: 44, padding: "10px 14px", border: 0, borderRadius: 24, cursor: "pointer", fontSize: "0.875rem", fontWeight: 600, lineHeight: 1.4 }
  function option(selected: boolean): React.CSSProperties {
    return { ...button, background: selected ? "#fff" : "#292e2b", color: selected ? "#000" : "#eee" }
  }
  return <>
    <button ref={trigger} type="button" popoverTarget={id} aria-haspopup="dialog" aria-expanded={formatOpen} aria-controls={id} aria-label={`Format, ${selection}`} disabled={disabled} style={{ ...button, background: "rgba(0,0,0,0.65)", color: "white", display: "flex", alignItems: "center", gap: 8 }}>
      Format <span aria-hidden="true" style={{ opacity: 0.65 }}>{ratio} ▾</span>
    </button>
    <div ref={panel} id={id} popover="auto" role="dialog" aria-label="Camera format" onToggle={event => setFormatOpen(event.newState === "open")} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); close() } }} style={{ position: "fixed", inset: "auto", top: "calc(max(env(safe-area-inset-top, 0px), 12px) + 56px)", left: "max(env(safe-area-inset-left, 0px), 16px)", right: "max(env(safe-area-inset-right, 0px), 16px)", margin: "0 auto", width: "min(320px, calc(100% - max(env(safe-area-inset-left, 0px), 16px) - max(env(safe-area-inset-right, 0px), 16px)))", maxHeight: "calc(100dvh - max(env(safe-area-inset-top, 0px), 12px) - max(env(safe-area-inset-bottom, 0px), 16px) - 72px)", overflowY: "auto", boxSizing: "border-box", padding: 16, border: "1px solid #444b46", borderRadius: 20, background: "#161b18", color: "white", boxShadow: "0 12px 40px #0008" }}>
      <p style={{ margin: "0 0 12px", fontSize: "0.9375rem", fontWeight: 600 }}>Format</p>
      {allowRatio && <div role="group" aria-label="Aspect ratio" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {(["16:9", "4:3", "1:1"] as Ratio[]).map(value => <button key={value} type="button" aria-pressed={ratio === value} style={option(ratio === value)} onClick={() => { onRatioChange(value); close() }}>{value}</button>)}
      </div>}
      {ratio !== "1:1" && <div role="group" aria-label="Orientation" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        {[true, false].map(value => <button key={String(value)} type="button" aria-pressed={portrait === value} style={option(portrait === value)} onClick={() => { if (value !== portrait) onPortraitChange(value); close() }}>{value ? "Portrait" : "Landscape"}</button>)}
      </div>}
      <button type="button" onClick={close} style={{ ...button, display: "block", margin: "12px 0 0 auto", color: "white", background: "transparent" }}>Done</button>
    </div>
  </>
}
