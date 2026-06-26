"use client"

import React, { useRef, useState, useEffect } from "react"

type AspectRatio = "16:9" | "4:3" | "1:1"
type CameraMode = "photo" | "video"
type ZoomLevel = 1 | 2 | 3

const RATIOS = [
  { label: "16:9", value: "16:9" as AspectRatio, w: 16, h: 9 },
  { label: "4:3", value: "4:3" as AspectRatio, w: 4, h: 3 },
  { label: "1:1", value: "1:1" as AspectRatio, w: 1, h: 1 },
]

type Capture = { id: string; previewUrl: string; uploading: boolean; isVideo?: boolean; photoId?: string; storagePath?: string }

export type UploadedPhoto = {
  id: string; url: string; for_website: boolean; for_social: boolean
  website_section: string | null; album_id: string | null; created_at: string
  storage_path: string
}

export default function CameraSheet({ onClose, onUploaded, pendingAlbumId }: {
  onClose: () => void
  onUploaded: (photo: UploadedPhoto) => void
  pendingAlbumId?: string | null
}) {
  const videoRef        = useRef<HTMLVideoElement>(null)
  const canvasRef       = useRef<HTMLCanvasElement>(null)
  const streamRef       = useRef<MediaStream | null>(null)
  const recorderRef     = useRef<MediaRecorder | null>(null)
  const chunksRef       = useRef<Blob[]>([])
  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null)
  const hwZoomRef       = useRef(false)

  const [ratio, setRatio]         = useState<AspectRatio>("16:9")
  const [portrait, setPortrait]   = useState(true)
  const [facing, setFacing]       = useState<"environment" | "user">("environment")
  const [torchOn, setTorchOn]     = useState(false)
  const [torchOk, setTorchOk]     = useState(false)
  const [zoom, setZoom]           = useState<ZoomLevel>(1)
  const [mode, setMode]           = useState<CameraMode>("photo")
  const [recording, setRecording] = useState(false)
  const [recSecs, setRecSecs]     = useState(0)
  const [captures, setCaptures]     = useState<Capture[]>([])
  const [reviewIndex, setReviewIndex] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [shutterFlash, setFlash]  = useState(false)
  const [ready, setReady]         = useState(false)
  const [error, setError]         = useState<string | null>(null)

  // Start / restart camera stream
  useEffect(() => {
    let alive = true
    ;(async () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
      hwZoomRef.current = false
      setReady(false); setError(null); setTorchOn(false); setTorchOk(false)

      const videoConstraints = { facingMode: facing, width: { ideal: 4096 }, height: { ideal: 3072 } }
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: true })
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false })
        } catch {
          if (alive) setError("Camera access denied. Allow camera in your browser settings.")
          return
        }
      }

      if (!alive) { stream.getTracks().forEach(t => t.stop()); return }
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream

      const track = stream.getVideoTracks()[0]
      const caps = (track.getCapabilities?.() ?? {}) as Record<string, unknown>
      if (caps.torch) setTorchOk(true)
    })()
    return () => {
      alive = false
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [facing])

  async function applyZoom(level: ZoomLevel) {
    setZoom(level)
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    try {
      await track.applyConstraints({ advanced: [{ zoom: level } as MediaTrackConstraintSet] })
      hwZoomRef.current = true
    } catch {
      hwZoomRef.current = false
    }
  }

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track || !torchOk) return
    const next = !torchOn
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] })
      setTorchOn(next)
    } catch {}
  }

  // Compute canvas crop: zoom region first, then aspect ratio crop within it
  function getCrop(vw: number, vh: number, rw: number, rh: number, z: number) {
    const srcW = hwZoomRef.current ? vw : Math.round(vw / z)
    const srcH = hwZoomRef.current ? vh : Math.round(vh / z)
    const srcX = Math.round((vw - srcW) / 2)
    const srcY = Math.round((vh - srcH) / 2)
    const target = rw / rh
    const actual = srcW / srcH
    let sx = srcX, sy = srcY, sw = srcW, sh = srcH
    if (actual > target) {
      sw = Math.round(srcH * target)
      sx = srcX + Math.round((srcW - sw) / 2)
    } else {
      sh = Math.round(srcW / target)
      sy = srcY + Math.round((srcH - sh) / 2)
    }
    return { sx, sy, sw, sh }
  }

  async function shoot() {
    if (!videoRef.current || !canvasRef.current || !ready) return
    setFlash(true)
    setTimeout(() => setFlash(false), 120)
    const video = videoRef.current
    const canvas = canvasRef.current
    const { sx, sy, sw, sh } = getCrop(video.videoWidth, video.videoHeight, currentR.w, currentR.h, zoom)
    canvas.width = sw; canvas.height = sh
    canvas.getContext("2d")!.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh)
    canvas.toBlob(async blob => {
      if (!blob) return
      const previewUrl = URL.createObjectURL(blob)
      const id = `${Date.now()}`
      setCaptures(prev => [{ id, previewUrl, uploading: true }, ...prev])
      const form = new FormData()
      form.append("file", blob, `photo-${id}.jpg`)
      if (pendingAlbumId) form.append("album_id", pendingAlbumId)
      try {
        const res = await fetch("/api/photos", { method: "POST", body: form })
        const data = await res.json()
        if (data.photo) {
          onUploaded(data.photo)
          setCaptures(prev => prev.map(c => c.id === id ? { ...c, uploading: false, photoId: data.photo.id, storagePath: data.photo.storage_path } : c))
        }
      } catch {
        setCaptures(prev => prev.map(c => c.id === id ? { ...c, uploading: false } : c))
      }
    }, "image/jpeg", 0.92)
  }

  function startRecording() {
    const stream = streamRef.current
    if (!stream) return
    chunksRef.current = []
    const mimeType = MediaRecorder.isTypeSupported("video/mp4") ? "video/mp4"
      : MediaRecorder.isTypeSupported("video/webm;codecs=h264") ? "video/webm;codecs=h264"
      : "video/webm"
    const mr = new MediaRecorder(stream, { mimeType })
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.onstop = () => uploadVideo(mimeType)
    recorderRef.current = mr
    mr.start(250)
    setRecording(true)
    setRecSecs(0)
    timerRef.current = setInterval(() => setRecSecs(s => s + 1), 1000)
  }

  function stopRecording() {
    recorderRef.current?.stop()
    if (timerRef.current) clearInterval(timerRef.current)
    setRecording(false)
  }

  async function uploadVideo(mimeType: string) {
    const ext = mimeType.includes("mp4") ? "mp4" : "webm"
    const blob = new Blob(chunksRef.current, { type: mimeType })
    const previewUrl = URL.createObjectURL(blob)
    const id = `${Date.now()}`
    setCaptures(prev => [{ id, previewUrl, uploading: true, isVideo: true }, ...prev])
    const form = new FormData()
    form.append("file", blob, `video-${id}.${ext}`)
    if (pendingAlbumId) form.append("album_id", pendingAlbumId)
    try {
      const res = await fetch("/api/photos", { method: "POST", body: form })
      const data = await res.json()
      if (data.photo) {
        onUploaded(data.photo)
        setCaptures(prev => prev.map(c => c.id === id ? { ...c, uploading: false, photoId: data.photo.id, storagePath: data.photo.storage_path } : c))
      }
    } catch {
      setCaptures(prev => prev.map(c => c.id === id ? { ...c, uploading: false } : c))
    }
  }

  async function deleteCapture(capture: Capture) {
    setCaptures(prev => prev.filter(c => c.id !== capture.id))
    setReviewIndex(null)
    setConfirmDelete(false)
    URL.revokeObjectURL(capture.previewUrl)
    if (capture.photoId && capture.storagePath) {
      await fetch("/api/photos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: capture.photoId, storage_path: capture.storagePath }),
      })
    }
  }

  function handleShutter() {
    if (mode === "photo") shoot()
    else if (recording) stopRecording()
    else startRecording()
  }

  function handleClose() {
    if (recording) stopRecording()
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    onClose()
  }

  const baseR    = RATIOS.find(r => r.value === ratio)!
  const currentR = (portrait && ratio !== "1:1") ? { ...baseR, w: baseR.h, h: baseR.w } : baseR
  const cssZoom  = !hwZoomRef.current && zoom > 1 ? zoom : 1

  function fmtTime(s: number) {
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, backgroundColor: "#000", overflow: "hidden", userSelect: "none" }}>
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Video */}
      <video
        ref={videoRef} autoPlay playsInline muted
        onLoadedMetadata={() => setReady(true)}
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
          transform: cssZoom > 1 ? `scale(${cssZoom})` : undefined,
          transformOrigin: "center center",
          transition: "transform 0.2s ease",
        }}
      />

      {/* Crop overlay */}
      <div style={{ position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          width: currentR.w > currentR.h ? "100%" : `calc(100vh * ${currentR.w / currentR.h})`,
          aspectRatio: `${currentR.w} / ${currentR.h}`,
          maxWidth: "100%", maxHeight: "100%",
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
          position: "relative",
        }}>
          {([{ top:0,left:0 },{ top:0,right:0 },{ bottom:0,left:0 },{ bottom:0,right:0 }] as const).map((pos, i) => (
            <div key={i} style={{
              position: "absolute", width: 22, height: 22, ...pos,
              borderTop:    (pos as {top?:number}).top    !== undefined ? "2px solid rgba(255,255,255,0.75)" : undefined,
              borderBottom: (pos as {bottom?:number}).bottom !== undefined ? "2px solid rgba(255,255,255,0.75)" : undefined,
              borderLeft:   (pos as {left?:number}).left  !== undefined ? "2px solid rgba(255,255,255,0.75)" : undefined,
              borderRight:  (pos as {right?:number}).right !== undefined ? "2px solid rgba(255,255,255,0.75)" : undefined,
            }} />
          ))}
        </div>
      </div>

      {/* Shutter flash */}
      {shutterFlash && <div style={{ position: "absolute", inset: 0, backgroundColor: "white", zIndex: 50, pointerEvents: "none" }} />}

      {/* Error */}
      {error && (
        <div style={{ position: "absolute", inset: 0, zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", color: "white", padding: "0 32px" }}>
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{error}</p>
            <p style={{ fontSize: 13, opacity: 0.5 }}>Go to Settings → Browser → Camera and allow access.</p>
          </div>
        </div>
      )}

      {/* ── Top bar ── */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 30,
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        padding: "max(env(safe-area-inset-top, 0px), 20px) 18px 16px",
      }}>
        {/* Close */}
        <button onClick={handleClose} style={{ width: 38, height: 38, borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "none", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* Center: ratio + portrait toggle OR rec timer */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          {recording ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 100, padding: "6px 16px" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#FF3B30", animation: "rec-blink 1s ease-in-out infinite" }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "white", fontVariantNumeric: "tabular-nums", letterSpacing: "0.04em" }}>{fmtTime(recSecs)}</span>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 2, backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", borderRadius: 100, padding: "3px 4px" }}>
                {RATIOS.map(r => (
                  <button key={r.value} onClick={() => setRatio(r.value)} style={{ padding: "6px 14px", borderRadius: 100, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, letterSpacing: "0.02em", backgroundColor: ratio === r.value ? "white" : "transparent", color: ratio === r.value ? "#000" : "rgba(255,255,255,0.55)", transition: "all 0.15s ease" }}>{r.label}</button>
                ))}
              </div>
              {ratio !== "1:1" && (
                <button onClick={() => setPortrait(p => !p)} style={{ display: "flex", alignItems: "center", gap: 5, backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", borderRadius: 100, padding: "4px 12px", border: "none", cursor: "pointer" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: portrait ? "rotate(0deg)" : "rotate(90deg)", transition: "transform 0.2s ease" }}>
                    <rect x="5" y="2" width="14" height="20" rx="2"/>
                  </svg>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.75)", letterSpacing: "0.04em" }}>{portrait ? "Portrait" : "Landscape"}</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Flash */}
        <button onClick={toggleTorch} disabled={!torchOk} style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, backgroundColor: torchOn ? "rgba(255,215,0,0.3)" : "rgba(0,0,0,0.55)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "none", cursor: torchOk ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", opacity: torchOk ? 1 : 0 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill={torchOn ? "#FFD700" : "none"} stroke={torchOn ? "#FFD700" : "rgba(255,255,255,0.7)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </button>
      </div>

      {/* ── Zoom + mode (above bottom controls) ── */}
      <div style={{
        position: "absolute", bottom: `calc(max(env(safe-area-inset-bottom, 0px), 40px) + 112px)`,
        left: 0, right: 0, zIndex: 30,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
      }}>
        {/* Zoom */}
        {!recording && (
          <div style={{ display: "flex", gap: 4, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 100, padding: "3px 4px", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}>
            {([1, 2, 3] as ZoomLevel[]).map(z => (
              <button key={z} onClick={() => applyZoom(z)} style={{ width: 46, height: 30, borderRadius: 100, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 800, backgroundColor: zoom === z ? "rgba(255,255,255,0.9)" : "transparent", color: zoom === z ? "#000" : "rgba(255,255,255,0.6)", transition: "all 0.15s ease" }}>{z}×</button>
            ))}
          </div>
        )}

        {/* Photo / Video mode */}
        <div style={{ display: "flex", gap: 2, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 100, padding: "3px 4px", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}>
          {(["photo", "video"] as CameraMode[]).map(m => (
            <button key={m} onClick={() => { if (!recording) setMode(m) }} style={{ padding: "5px 22px", borderRadius: 100, border: "none", cursor: recording ? "default" : "pointer", fontSize: 12, fontWeight: 700, textTransform: "capitalize", letterSpacing: "0.04em", backgroundColor: mode === m ? "white" : "transparent", color: mode === m ? "#000" : "rgba(255,255,255,0.5)", transition: "all 0.15s ease" }}>{m}</button>
          ))}
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 30,
        padding: `24px 36px max(env(safe-area-inset-bottom, 0px), 40px)`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)",
      }}>
        {/* Last capture thumbnail — tap to review */}
        <button
          onClick={() => captures.length > 0 ? setReviewIndex(0) : undefined}
          style={{ width: 58, height: 58, padding: 0, background: "none", border: "none", cursor: captures.length > 0 ? "pointer" : "default", flexShrink: 0 }}
        >
          {captures[0] ? (
            <div style={{ width: 58, height: 58, borderRadius: 12, overflow: "hidden", border: "2px solid rgba(255,255,255,0.75)", position: "relative", backgroundColor: "#111" }}>
              {captures[0].isVideo ? (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={captures[0].previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              )}
              {captures[0].uploading && (
                <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.25)", borderTopColor: "white", animation: "cam-spin 0.8s linear infinite" }} />
                </div>
              )}
              {captures.length > 1 && <div style={{ position: "absolute", bottom: 2, right: 4, fontSize: 10, fontWeight: 800, color: "white", textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>{captures.length}</div>}
            </div>
          ) : (
            <div style={{ width: 58, height: 58, borderRadius: 12, border: "2px solid rgba(255,255,255,0.15)" }} />
          )}
        </button>

        {/* Shutter / Record */}
        <button
          onClick={handleShutter}
          disabled={!ready}
          style={{
            width: 78, height: 78, borderRadius: "50%",
            border: `4px solid ${mode === "video" ? (recording ? "#FF3B30" : "rgba(255,50,50,0.7)") : "rgba(255,255,255,0.9)"}`,
            backgroundColor: "transparent", cursor: ready ? "pointer" : "default",
            padding: 0, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: ready ? 1 : 0.45,
            transition: "border-color 0.2s ease, transform 0.08s ease",
          }}
          onPointerDown={e => (e.currentTarget.style.transform = "scale(0.94)")}
          onPointerUp={e => (e.currentTarget.style.transform = "scale(1)")}
          onPointerLeave={e => (e.currentTarget.style.transform = "scale(1)")}
        >
          {mode === "video" ? (
            recording
              ? <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: "#FF3B30" }} />
              : <div style={{ width: 64, height: 64, borderRadius: "50%", backgroundColor: "#FF3B30" }} />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: "50%", backgroundColor: "white" }} />
          )}
        </button>

        {/* Flip — disabled while recording */}
        <button
          onClick={() => { if (!recording) setFacing(f => f === "environment" ? "user" : "environment") }}
          style={{ width: 58, height: 58, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.14)", border: "none", cursor: recording ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: recording ? 0.3 : 1, transition: "opacity 0.2s" }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 4v6h6"/><path d="M23 20v-6h-6"/>
            <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/>
          </svg>
        </button>
      </div>

      {/* ── Review overlay ── */}
      {reviewIndex !== null && captures[reviewIndex] && (() => {
        const cap = captures[reviewIndex]
        return (
          <div style={{ position: "absolute", inset: 0, zIndex: 80, backgroundColor: "#000", display: "flex", flexDirection: "column" }}>

            {/* Top bar */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "max(env(safe-area-inset-top, 0px), 20px) 20px 16px",
              background: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)",
              position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
            }}>
              <button
                onClick={() => { setReviewIndex(null); setConfirmDelete(false) }}
                style={{ width: 38, height: 38, borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.55)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>

              {captures.length > 1 && (
                <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
                  {reviewIndex + 1} of {captures.length}
                </span>
              )}

              <button
                onClick={() => setConfirmDelete(true)}
                style={{ width: 38, height: 38, borderRadius: "50%", backgroundColor: "rgba(255,59,48,0.18)", border: "1px solid rgba(255,59,48,0.35)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF3B30" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
            </div>

            {/* Media */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {cap.isVideo ? (
                <video
                  src={cap.previewUrl}
                  controls
                  playsInline
                  style={{ maxWidth: "100%", maxHeight: "100%", outline: "none" }}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cap.previewUrl}
                  alt=""
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }}
                />
              )}
            </div>

            {/* Prev / Next */}
            {captures.length > 1 && (
              <div style={{
                position: "absolute", bottom: `calc(max(env(safe-area-inset-bottom, 0px), 24px) + 16px)`,
                left: 0, right: 0, display: "flex", justifyContent: "space-between", padding: "0 24px", zIndex: 10,
              }}>
                <button
                  onClick={() => { setReviewIndex(i => Math.max(0, (i ?? 0) - 1)); setConfirmDelete(false) }}
                  disabled={reviewIndex === 0}
                  style={{ width: 52, height: 52, borderRadius: "50%", backgroundColor: reviewIndex === 0 ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.14)", border: "none", cursor: reviewIndex === 0 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: reviewIndex === 0 ? 0.3 : 1 }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <button
                  onClick={() => { setReviewIndex(i => Math.min(captures.length - 1, (i ?? 0) + 1)); setConfirmDelete(false) }}
                  disabled={reviewIndex === captures.length - 1}
                  style={{ width: 52, height: 52, borderRadius: "50%", backgroundColor: reviewIndex === captures.length - 1 ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.14)", border: "none", cursor: reviewIndex === captures.length - 1 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: reviewIndex === captures.length - 1 ? 0.3 : 1 }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            )}

            {/* Delete confirmation */}
            {confirmDelete && (
              <div style={{
                position: "absolute", inset: 0, zIndex: 20,
                backgroundColor: "rgba(0,0,0,0.75)",
                display: "flex", alignItems: "flex-end", justifyContent: "center",
                padding: `0 20px max(env(safe-area-inset-bottom, 0px), 40px)`,
              }}>
                <div style={{ width: "100%", backgroundColor: "#1A1C1B", borderRadius: 24, padding: 24 }}>
                  <p style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 600, color: "white", textAlign: "center" }}>
                    Delete this {cap.isVideo ? "video" : "photo"}?
                  </p>
                  <p style={{ margin: "0 0 24px", fontSize: 13, color: "rgba(255,255,255,0.45)", textAlign: "center" }}>
                    {cap.photoId ? "It will be removed from your account." : "It hasn't finished uploading yet."}
                  </p>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      style={{ flex: 1, padding: "15px 0", borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", backgroundColor: "transparent", color: "rgba(255,255,255,0.7)", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => deleteCapture(cap)}
                      style={{ flex: 1, padding: "15px 0", borderRadius: 14, border: "none", backgroundColor: "#FF3B30", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })()}

      <style>{`
        @keyframes cam-spin  { to { transform: rotate(360deg); } }
        @keyframes rec-blink { 0%,100% { opacity:1; } 50% { opacity:0.15; } }
      `}</style>
    </div>
  )
}
