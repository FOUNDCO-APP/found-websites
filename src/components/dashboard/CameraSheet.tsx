"use client"

import React, { useRef, useState, useEffect } from "react"

type AspectRatio = "16:9" | "4:3" | "1:1"

const RATIOS: { label: string; value: AspectRatio; w: number; h: number }[] = [
  { label: "16:9", value: "16:9", w: 16, h: 9 },
  { label: "4:3", value: "4:3", w: 4, h: 3 },
  { label: "1:1", value: "1:1", w: 1, h: 1 },
]

type Capture = { id: string; previewUrl: string; uploading: boolean }

export type UploadedPhoto = {
  id: string
  url: string
  for_website: boolean
  for_social: boolean
  website_section: string | null
  album_id: string | null
  created_at: string
}

export default function CameraSheet({
  onClose,
  onUploaded,
  pendingAlbumId,
}: {
  onClose: () => void
  onUploaded: (photo: UploadedPhoto) => void
  pendingAlbumId?: string | null
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [ratio, setRatio] = useState<AspectRatio>("4:3")
  const [facing, setFacing] = useState<"environment" | "user">("environment")
  const [torchOn, setTorchOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [captures, setCaptures] = useState<Capture[]>([])
  const [shutterFlash, setShutterFlash] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
      setReady(false)
      setError(null)
      setTorchOn(false)
      setTorchSupported(false)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 4096 }, height: { ideal: 3072 } },
          audio: false,
        })
        if (!alive) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
        const track = stream.getVideoTracks()[0]
        const caps = (track.getCapabilities?.() ?? {}) as Record<string, unknown>
        if (caps.torch) setTorchSupported(true)
      } catch {
        if (alive) setError("Camera access denied. Allow camera in your browser settings.")
      }
    })()
    return () => {
      alive = false
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [facing])

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track || !torchSupported) return
    const next = !torchOn
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] })
      setTorchOn(next)
    } catch {}
  }

  async function shoot() {
    if (!videoRef.current || !canvasRef.current || !ready) return

    setShutterFlash(true)
    setTimeout(() => setShutterFlash(false), 120)

    const video = videoRef.current
    const canvas = canvasRef.current
    const vw = video.videoWidth
    const vh = video.videoHeight

    const r = RATIOS.find(r => r.value === ratio)!
    const target = r.w / r.h
    const actual = vw / vh
    let sx = 0, sy = 0, sw = vw, sh = vh
    if (actual > target) {
      sw = Math.round(vh * target)
      sx = Math.round((vw - sw) / 2)
    } else {
      sh = Math.round(vw / target)
      sy = Math.round((vh - sh) / 2)
    }

    canvas.width = sw
    canvas.height = sh
    const ctx = canvas.getContext("2d")!
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh)

    canvas.toBlob(async blob => {
      if (!blob) return
      const previewUrl = URL.createObjectURL(blob)
      const id = `${Date.now()}-${Math.random()}`
      setCaptures(prev => [{ id, previewUrl, uploading: true }, ...prev])

      const form = new FormData()
      form.append("file", blob, `photo-${Date.now()}.jpg`)
      if (pendingAlbumId) form.append("album_id", pendingAlbumId)

      try {
        const res = await fetch("/api/photos", { method: "POST", body: form })
        const data = await res.json()
        if (data.photo) onUploaded(data.photo)
      } finally {
        setCaptures(prev => prev.map(c => c.id === id ? { ...c, uploading: false } : c))
      }
    }, "image/jpeg", 0.92)
  }

  function handleClose() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    onClose()
  }

  const currentR = RATIOS.find(r => r.value === ratio)!

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, backgroundColor: "#000", display: "flex", flexDirection: "column", userSelect: "none" }}>
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Video — full bleed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onLoadedMetadata={() => setReady(true)}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />

      {/* Crop overlay — dims area outside the selected ratio */}
      <div style={{ position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          width: currentR.w > currentR.h ? "100%" : `calc(100vh * ${currentR.w / currentR.h})`,
          aspectRatio: `${currentR.w} / ${currentR.h}`,
          maxWidth: "100%",
          maxHeight: "100%",
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
          position: "relative",
        }}>
          {/* Corner brackets */}
          {([
            { top: 0, left: 0 },
            { top: 0, right: 0 },
            { bottom: 0, left: 0 },
            { bottom: 0, right: 0 },
          ] as const).map((pos, i) => (
            <div key={i} style={{
              position: "absolute",
              width: 22, height: 22,
              ...pos,
              borderTop: (pos as {top?: number}).top !== undefined ? "2px solid rgba(255,255,255,0.75)" : undefined,
              borderBottom: (pos as {bottom?: number}).bottom !== undefined ? "2px solid rgba(255,255,255,0.75)" : undefined,
              borderLeft: (pos as {left?: number}).left !== undefined ? "2px solid rgba(255,255,255,0.75)" : undefined,
              borderRight: (pos as {right?: number}).right !== undefined ? "2px solid rgba(255,255,255,0.75)" : undefined,
            }} />
          ))}
        </div>
      </div>

      {/* Shutter flash */}
      {shutterFlash && (
        <div style={{ position: "absolute", inset: 0, backgroundColor: "white", zIndex: 50, pointerEvents: "none" }} />
      )}

      {/* Error state */}
      {error && (
        <div style={{ position: "absolute", inset: 0, zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", color: "white", padding: "0 32px" }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{error}</p>
            <p style={{ fontSize: 13, opacity: 0.5, lineHeight: 1.5 }}>Go to Settings → Browser → Camera and allow access.</p>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 30,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "max(env(safe-area-inset-top, 0px), 20px) 18px 16px",
      }}>
        {/* Close */}
        <button
          onClick={handleClose}
          style={{
            width: 38, height: 38, borderRadius: "50%",
            backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
            border: "none", cursor: "pointer", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* Ratio picker */}
        <div style={{
          display: "flex", gap: 2,
          backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
          borderRadius: 100, padding: "3px 4px",
        }}>
          {RATIOS.map(r => (
            <button
              key={r.value}
              onClick={() => setRatio(r.value)}
              style={{
                padding: "6px 14px", borderRadius: 100, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 700, letterSpacing: "0.02em",
                backgroundColor: ratio === r.value ? "white" : "transparent",
                color: ratio === r.value ? "#000" : "rgba(255,255,255,0.55)",
                transition: "all 0.15s ease",
              }}
            >{r.label}</button>
          ))}
        </div>

        {/* Flash / torch */}
        <button
          onClick={toggleTorch}
          disabled={!torchSupported}
          style={{
            width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
            backgroundColor: torchOn ? "rgba(255,215,0,0.3)" : "rgba(0,0,0,0.55)",
            backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
            border: "none", cursor: torchSupported ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: torchSupported ? 1 : 0,
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24"
            fill={torchOn ? "#FFD700" : "none"}
            stroke={torchOn ? "#FFD700" : "rgba(255,255,255,0.7)"}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </button>
      </div>

      {/* Bottom bar */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 30,
        padding: `24px 36px max(env(safe-area-inset-bottom, 0px), 40px)`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)",
      }}>
        {/* Last capture thumbnail */}
        <div style={{ width: 58, height: 58 }}>
          {captures[0] ? (
            <div style={{ width: 58, height: 58, borderRadius: 12, overflow: "hidden", border: "2px solid rgba(255,255,255,0.75)", position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={captures[0].previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              {captures[0].uploading && (
                <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.25)", borderTopColor: "white", animation: "cam-spin 0.8s linear infinite" }} />
                </div>
              )}
              {captures.length > 1 && (
                <div style={{
                  position: "absolute", bottom: 2, right: 4,
                  fontSize: 10, fontWeight: 800, color: "white",
                  textShadow: "0 1px 3px rgba(0,0,0,0.9)",
                }}>{captures.length}</div>
              )}
            </div>
          ) : (
            <div style={{ width: 58, height: 58, borderRadius: 12, border: "2px solid rgba(255,255,255,0.15)" }} />
          )}
        </div>

        {/* Shutter button */}
        <button
          onClick={shoot}
          disabled={!ready}
          style={{
            width: 78, height: 78, borderRadius: "50%",
            border: "4px solid rgba(255,255,255,0.9)",
            backgroundColor: "transparent", cursor: ready ? "pointer" : "default",
            padding: 0, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: ready ? 1 : 0.45,
            transition: "transform 0.08s ease",
          }}
          onPointerDown={e => (e.currentTarget.style.transform = "scale(0.94)")}
          onPointerUp={e => (e.currentTarget.style.transform = "scale(1)")}
          onPointerLeave={e => (e.currentTarget.style.transform = "scale(1)")}
        >
          <div style={{ width: 64, height: 64, borderRadius: "50%", backgroundColor: "white" }} />
        </button>

        {/* Flip camera */}
        <button
          onClick={() => setFacing(f => f === "environment" ? "user" : "environment")}
          style={{
            width: 58, height: 58, borderRadius: "50%",
            backgroundColor: "rgba(255,255,255,0.14)", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 4v6h6"/><path d="M23 20v-6h-6"/>
            <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/>
          </svg>
        </button>
      </div>

      <style>{`@keyframes cam-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
