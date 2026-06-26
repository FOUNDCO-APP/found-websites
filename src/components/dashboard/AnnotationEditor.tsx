"use client"

import React, { useRef, useState, useEffect } from "react"

type Tool = "rect" | "circle" | "arrow"
type Stroke = { tool: Tool; color: string; lw: number; x1: number; y1: number; x2: number; y2: number }

const COLORS = [
  "#FF3B30", // red
  "#FF9F0A", // orange
  "#FFD60A", // yellow
  "#30D158", // green
  "#0A84FF", // blue
  "#FFFFFF", // white
  "#000000", // black
]
const THICKNESSES: { value: number; label: string }[] = [
  { value: 3,  label: "S" },
  { value: 7,  label: "M" },
  { value: 13, label: "L" },
]

export default function AnnotationEditor({
  src,
  onSave,
  onDiscard,
}: {
  src: string
  onSave: (blob: Blob) => void
  onDiscard: () => void
}) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef       = useRef<HTMLImageElement | null>(null)
  const drawingRef   = useRef(false)
  const startRef     = useRef({ x: 0, y: 0 })
  const strokesRef   = useRef<Stroke[]>([])
  const toolRef      = useRef<Tool>("rect")
  const colorRef     = useRef(COLORS[0])
  const lwRef        = useRef(7)

  const [tool, setTool]           = useState<Tool>("rect")
  const [color, setColor]         = useState(COLORS[0])
  const [lw, setLw]               = useState(7)
  const [strokes, setStrokes]     = useState<Stroke[]>([])
  const [loaded, setLoaded]       = useState(false)
  const [saving, setSaving]       = useState(false)

  // Keep refs in sync so pointer handlers never go stale
  useEffect(() => { toolRef.current  = tool  }, [tool])
  useEffect(() => { colorRef.current = color }, [color])
  useEffect(() => { lwRef.current    = lw    }, [lw])
  useEffect(() => { strokesRef.current = strokes }, [strokes])

  // ── Canvas helpers ──────────────────────────────────────────────────────────

  function contain(iw: number, ih: number, cw: number, ch: number) {
    const scale = Math.min(cw / iw, ch / ih)
    const dw = iw * scale, dh = ih * scale
    return { dx: (cw - dw) / 2, dy: (ch - dh) / 2, dw, dh }
  }

  function arrowHead(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, lw: number) {
    const angle = Math.atan2(y2 - y1, x2 - x1)
    const head  = Math.max(18, lw * 3.5)
    ctx.beginPath()
    ctx.moveTo(x2, y2)
    ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6))
    ctx.moveTo(x2, y2)
    ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6))
    ctx.stroke()
  }

  function paintStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
    ctx.strokeStyle = s.color
    ctx.lineWidth   = s.lw
    ctx.lineCap     = "round"
    ctx.lineJoin    = "round"
    if (s.tool === "rect") {
      ctx.strokeRect(s.x1, s.y1, s.x2 - s.x1, s.y2 - s.y1)
    } else if (s.tool === "circle") {
      const rx = Math.abs(s.x2 - s.x1) / 2
      const ry = Math.abs(s.y2 - s.y1) / 2
      if (rx < 1 || ry < 1) return
      ctx.beginPath()
      ctx.ellipse((s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2, rx, ry, 0, 0, 2 * Math.PI)
      ctx.stroke()
    } else if (s.tool === "arrow") {
      ctx.beginPath()
      ctx.moveTo(s.x1, s.y1)
      ctx.lineTo(s.x2, s.y2)
      ctx.stroke()
      arrowHead(ctx, s.x1, s.y1, s.x2, s.y2, s.lw)
    }
  }

  function render(committed: Stroke[], preview?: Partial<Stroke> | null) {
    const canvas = canvasRef.current
    const img    = imgRef.current
    if (!canvas || !img) return
    const ctx    = canvas.getContext("2d")!
    const { dx, dy, dw, dh } = contain(img.naturalWidth, img.naturalHeight, canvas.width, canvas.height)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    // Dark letterbox
    ctx.fillStyle = "#111"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, dx, dy, dw, dh)
    for (const s of committed) paintStroke(ctx, s)
    if (preview && preview.x2 !== undefined) {
      paintStroke(ctx, {
        tool:  toolRef.current,
        color: colorRef.current,
        lw:    lwRef.current,
        x1: preview.x1 ?? 0, y1: preview.y1 ?? 0,
        x2: preview.x2,      y2: preview.y2 ?? 0,
      })
    }
  }

  // ── Load image ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      imgRef.current = img
      const canvas    = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return
      canvas.width  = container.clientWidth
      canvas.height = container.clientHeight
      render([])
      setLoaded(true)
    }
    img.src = src
  }, [src]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-render after undo
  useEffect(() => {
    if (loaded) render(strokes)
  }, [strokes]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pointer handlers ────────────────────────────────────────────────────────

  function xy(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  function onDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault()
    const { x, y } = xy(e)
    drawingRef.current = true
    startRef.current = { x, y }
    canvasRef.current?.setPointerCapture(e.pointerId)
  }

  function onMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    e.preventDefault()
    const { x, y } = xy(e)
    render(strokesRef.current, { x1: startRef.current.x, y1: startRef.current.y, x2: x, y2: y })
  }

  function onUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    drawingRef.current = false
    const { x, y } = xy(e)
    const s: Stroke = {
      tool: toolRef.current, color: colorRef.current, lw: lwRef.current,
      x1: startRef.current.x, y1: startRef.current.y, x2: x, y2: y,
    }
    const next = [...strokesRef.current, s]
    strokesRef.current = next
    setStrokes(next)
    render(next)
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  function handleSave() {
    const canvas = canvasRef.current
    if (!canvas || saving) return
    setSaving(true)
    canvas.toBlob(blob => {
      if (blob) onSave(blob)
      setSaving(false)
    }, "image/jpeg", 0.92)
  }

  function handleUndo() {
    const next = strokes.slice(0, -1)
    setStrokes(next)
    strokesRef.current = next
    render(next)
  }

  // ── UI ──────────────────────────────────────────────────────────────────────

  const GREEN = "#32D074"
  const DARK  = "#0D100E"

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 120, backgroundColor: "#111", display: "flex", flexDirection: "column", userSelect: "none" }}>

      {/* ── Top bar ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "max(env(safe-area-inset-top, 0px), 18px) 20px 14px",
        backgroundColor: DARK, borderBottom: "1px solid rgba(255,255,255,0.07)",
        flexShrink: 0,
      }}>
        <button
          onClick={onDiscard}
          style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.7)", background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}
        >
          Cancel
        </button>

        <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Annotate
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {strokes.length > 0 && (
            <button
              onClick={handleUndo}
              style={{ width: 34, height: 34, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.08)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              title="Undo"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/>
              </svg>
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!loaded || saving}
            style={{ padding: "8px 20px", borderRadius: 100, backgroundColor: strokes.length > 0 ? GREEN : "rgba(255,255,255,0.12)", border: "none", cursor: strokes.length > 0 && !saving ? "pointer" : "default", fontSize: 14, fontWeight: 700, color: strokes.length > 0 ? "#000" : "rgba(255,255,255,0.3)", transition: "all 0.15s ease" }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div ref={containerRef} style={{ flex: 1, overflow: "hidden", position: "relative", touchAction: "none" }}>
        <canvas
          ref={canvasRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          style={{ display: "block", width: "100%", height: "100%", cursor: "crosshair", touchAction: "none" }}
        />
        {!loaded && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.15)", borderTopColor: "white", animation: "ann-spin 0.8s linear infinite" }} />
          </div>
        )}
      </div>

      {/* ── Bottom toolbar ── */}
      <div style={{
        flexShrink: 0, backgroundColor: DARK,
        borderTop: "1px solid rgba(255,255,255,0.07)",
        padding: `14px 20px max(env(safe-area-inset-bottom, 0px), 20px)`,
        display: "flex", flexDirection: "column", gap: 14,
      }}>

        {/* Row 1: Tool + Thickness */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Tools */}
          <div style={{ display: "flex", gap: 8 }}>
            {([
              { t: "rect"   as Tool, icon: <rect x="3" y="3" width="18" height="18" rx="2"/> },
              { t: "circle" as Tool, icon: <circle cx="12" cy="12" r="9"/> },
              { t: "arrow"  as Tool, icon: <><line x1="5" y1="19" x2="19" y2="5"/><polyline points="9 5 19 5 19 15"/></> },
            ] as { t: Tool; icon: React.ReactNode }[]).map(({ t, icon }) => (
              <button
                key={t}
                onClick={() => setTool(t)}
                style={{
                  width: 48, height: 48, borderRadius: 14,
                  backgroundColor: tool === t ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.05)",
                  border: tool === t ? "1.5px solid rgba(255,255,255,0.35)" : "1.5px solid transparent",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.12s ease",
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  {icon}
                </svg>
              </button>
            ))}
          </div>

          {/* Thickness */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {THICKNESSES.map(th => (
              <button
                key={th.value}
                onClick={() => setLw(th.value)}
                style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: lw === th.value ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.05)", border: lw === th.value ? `1.5px solid rgba(255,255,255,0.35)` : "1.5px solid transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 3, transition: "all 0.12s ease" }}
              >
                <div style={{ width: th.value === 3 ? 16 : th.value === 7 ? 20 : 24, height: th.value, borderRadius: th.value, backgroundColor: "white" }} />
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Colors */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: 32, height: 32, borderRadius: "50%",
                backgroundColor: c,
                border: color === c ? "3px solid white" : c === "#FFFFFF" ? "2px solid rgba(255,255,255,0.3)" : "2px solid transparent",
                cursor: "pointer",
                boxShadow: color === c ? "0 0 0 2px rgba(255,255,255,0.5)" : "none",
                transition: "all 0.12s ease",
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`@keyframes ann-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
