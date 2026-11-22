/** Aspect-orientation observations only. Never proves visually upright content,
 * rotates/crops media, changes a track, logs data, or discards the input Blob.
 */
export type OrientationOptions = {
  signal?: AbortSignal
  isCurrent?: () => boolean
  timeoutMs?: number
  settleMs?: number
  minWaitMs?: number
}
type Dimensions = { width: number; height: number }
export type OrientationResult = {
  status: "verified" | "mismatch" | "unavailable"
  reason: "aspect-match" | "aspect-mismatch" | "timeout" | "cancelled" | "stale" | "ended" | "decode-error" | "unsupported"
  requested: "portrait" | "landscape"
  track: Dimensions | null
  frame: Dimensions | null
  scope: "live-frame-aspect" | "decoded-playback-aspect"
  uprightContentVerified: false
}
function dimensions(width: unknown, height: unknown): Dimensions | null {
  return typeof width === "number" && typeof height === "number" && Number.isFinite(width) && Number.isFinite(height)
    && width > 0 && height > 0 ? { width, height } : null
}
function bounded(value: number | undefined, fallback: number, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback
}

/** Poll delivered dimensions, not capability ranges. A quiet observation window
 * catches delayed resize/settings changes; any future resize needs a new check.
 * Caller must also check its generation after awaiting before updating UI/start.
 * No image pixels or device identifiers are read. Never throws browser errors.
 */
function observe(video: HTMLVideoElement, track: MediaStreamTrack | null, portrait: boolean, options: OrientationOptions): Promise<OrientationResult> {
  const timeout = bounded(options.timeoutMs, 2500, 50, 10000)
  const settle = bounded(options.settleMs, 250, 25, timeout)
  const minWait = bounded(options.minWaitMs, Math.min(500, timeout), 0, timeout)
  return new Promise(resolve => {
    const start = performance.now()
    let since = start, signature = "", timer: ReturnType<typeof setTimeout> | undefined
    let done = false
    const result: OrientationResult = { status: "unavailable", reason: "timeout", requested: portrait ? "portrait" : "landscape",
      track: null, frame: null, scope: track ? "live-frame-aspect" : "decoded-playback-aspect", uprightContentVerified: false }
    const finish = (reason: OrientationResult["reason"], status: OrientationResult["status"] = "unavailable") => {
      if (done) return
      done = true
      if (timer !== undefined) clearTimeout(timer)
      options.signal?.removeEventListener("abort", aborted)
      video.removeEventListener("error", failed)
      resolve({ ...result, status, reason })
    }
    const aborted = () => finish("cancelled")
    const failed = () => finish("decode-error")
    const tick = () => {
      if (done) return
      if (options.signal?.aborted) { finish("cancelled"); return }
      try {
        if (options.isCurrent && !options.isCurrent()) { finish("stale"); return }
        if (track?.readyState === "ended") { finish("ended"); return }
        if (video.error) { finish("decode-error"); return }
        try { const s = track?.getSettings(); result.track = s ? dimensions(s.width, s.height) : null } catch { result.track = null }
        result.frame = video.readyState >= 2 ? dimensions(video.videoWidth, video.videoHeight) : null
        const next = JSON.stringify([result.track, result.frame])
        const now = performance.now()
        if (next !== signature) { signature = next; since = now }
        if (result.frame && now - start >= minWait && now - since >= settle) {
          // Square frames cannot establish portrait or landscape.
          const ratio = result.frame.width / result.frame.height
          const match = portrait ? ratio < .98 : ratio > 1.02
          finish(match ? "aspect-match" : "aspect-mismatch", match ? "verified" : "mismatch")
          return
        }
        if (now - start >= timeout) { finish("timeout"); return }
        timer = setTimeout(tick, Math.min(50, timeout - (now - start)))
      } catch { finish("unsupported") }
    }
    options.signal?.addEventListener("abort", aborted, { once: true })
    video.addEventListener("error", failed, { once: true })
    tick()
  })
}

export function verifyCameraOrientation(video: HTMLVideoElement, track: MediaStreamTrack, portrait: boolean, options: OrientationOptions = {}): Promise<OrientationResult> {
  return observe(video, track, portrait, options)
}

/** Decode the original Blob in a private video element. Retain/save the original
 * unconditionally before calling this; mismatch/error is diagnostic, not deletion.
 * Playback dimensions may incorporate container rotation metadata. Upright visual
 * content still requires real-device inspection. No canvas/transcoding is used.
 */
export async function verifyRecordedOrientation(blob: Blob, portrait: boolean, options: OrientationOptions = {}): Promise<OrientationResult> {
  const unavailable = (reason: OrientationResult["reason"]): OrientationResult => ({ status: "unavailable", reason,
    requested: portrait ? "portrait" : "landscape", track: null, frame: null, scope: "decoded-playback-aspect", uprightContentVerified: false })
  if (options.signal?.aborted) return unavailable("cancelled")
  try { if (options.isCurrent && !options.isCurrent()) return unavailable("stale") } catch { return unavailable("unsupported") }
  if (typeof document === "undefined" || typeof URL.createObjectURL !== "function") return unavailable("unsupported")
  let video: HTMLVideoElement | undefined, url: string | undefined
  try {
    video = document.createElement("video")
    video.muted = true; video.playsInline = true; video.preload = "auto"
    url = URL.createObjectURL(blob)
    video.src = url; video.load()
    return await observe(video, null, portrait, options)
  } catch { return unavailable("decode-error") }
  finally {
    if (video) {
      try { video.pause(); video.removeAttribute("src"); video.load(); video.remove() } catch { /* Cleanup cannot replace the observation. */ }
    }
    if (url) { try { URL.revokeObjectURL(url) } catch { /* Already released. */ } }
  }
}
