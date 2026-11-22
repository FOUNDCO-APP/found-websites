/** Local recording policy. No media rewriting, persistence, logging or network access. */
export const RECORDING_VIDEO_BITS = 5_000_000
export const RECORDING_AUDIO_BITS = 128_000
export type CameraProfileMode = "photo" | "video"
type ProfileCapabilities = Pick<MediaTrackCapabilities, "width" | "height" | "aspectRatio">

/** Request the selected orientation even when capabilities are missing or sensor-oriented.
 * Constraints are ideals: browsers may return other dimensions; measure them.
 * Video is full-track 16:9/9:16, independent of the still-photo crop selector.
 */
export function cameraProfileConstraints(mode: CameraProfileMode, portrait = false, _caps: ProfileCapabilities = {}): MediaTrackConstraints {
  if (mode === "photo") return { width: { ideal: 4096 }, height: { ideal: 3072 } }
  const vertical = portrait
  return {
    width: { ideal: vertical ? 1080 : 1920 }, height: { ideal: vertical ? 1920 : 1080 },
    aspectRatio: { ideal: vertical ? 9 / 16 : 16 / 9 }, frameRate: { ideal: 30 },
  }
}

/** Serialize per-stream changes. Call invalidate synchronously on mode/stream/close
 * changes. A stale in-flight browser operation cannot be cancelled, but cannot
 * authorize capture; a queued latest request runs after it. Keep shutter/flip/
 * zoom/torch disabled while awaiting request, and check isCurrent after awaits.
 */
export function createCameraProfileGuard() {
  let generation = 0
  let tail: Promise<unknown> = Promise.resolve()
  return {
    invalidate() { generation++ },
    request(track: MediaStreamTrack, mode: CameraProfileMode, portrait: boolean, isActive: () => boolean, advanced?: MediaTrackConstraintSet) {
      const token = ++generation
      const isCurrent = () => token === generation && track.readyState === "live" && isActive()
      const result = tail.then(async () => {
        if (!isCurrent()) return { status: "stale" as const, isCurrent }
        let caps: ProfileCapabilities = {}
        try { caps = track.getCapabilities?.() ?? {} } catch { /* Older engines. */ }
        let applied = false
        try { await track.applyConstraints({ ...cameraProfileConstraints(mode, portrait, caps), ...(advanced ? { advanced: [advanced] } : {}) }); applied = true } catch { /* Ideals are best effort. */ }
        return { status: !isCurrent() ? "stale" as const : applied ? "applied" as const : "fallback" as const, isCurrent }
      })
      tail = result.catch(() => undefined)
      return result
    },
  }
}

const MIME_CANDIDATES = ["video/mp4", "video/webm;codecs=h264", "video/webm"] as const

/** Constructor injection keeps browser capability/fallback tests local. */
export function createProfiledRecorder(stream: MediaStream, Recorder: typeof MediaRecorder = MediaRecorder): MediaRecorder {
  const supported = MIME_CANDIDATES.filter(mime => {
    try { return Recorder.isTypeSupported(mime) } catch { return false }
  })
  let lastError: unknown
  for (const mimeType of [...supported, undefined]) {
    const mime = mimeType ? { mimeType } : {}
    for (const options of [{ ...mime, videoBitsPerSecond: RECORDING_VIDEO_BITS, audioBitsPerSecond: RECORDING_AUDIO_BITS }, mime]) {
      try { return new Recorder(stream, options) } catch (error) { lastError = error }
    }
  }
  throw lastError ?? new Error("Recording unavailable")
}

function safeMime(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 160) return null
  const mime = value.trim().toLowerCase()
  return /^video\/(?:mp4|webm)(?:\s*;\s*codecs\s*=\s*"?[a-z0-9., _-]+"?)?$/.test(mime) ? mime : null
}
function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null
}

/** Use recorder MIME, then emitted chunk MIME, never the requested candidate.
 * Unknown format stays unknown; caller must not guess an extension in that case.
 */
export function recordingMime(recorder: Pick<MediaRecorder, "mimeType">, chunks: readonly Blob[]): string {
  return safeMime(recorder.mimeType) ?? chunks.map(chunk => safeMime(chunk.type)).find(Boolean) ?? ""
}

/** Snapshot while track is live (before stop); call again with finalized Blob.
 * Explicit whitelist excludes device/group IDs, labels, constraints and errors.
 * Recorder bitrates are reported browser values, not measured encoder throughput.
 */
export function recordingMeasurement(recorder: Pick<MediaRecorder, "mimeType" | "videoBitsPerSecond" | "audioBitsPerSecond">, track: Pick<MediaStreamTrack, "getSettings">, blob?: Blob) {
  let settings: MediaTrackSettings = {}
  try { settings = track.getSettings() } catch { /* Ended/unsupported track. */ }
  return {
    recorderMime: safeMime(recorder.mimeType),
    videoBitsPerSecond: finite(recorder.videoBitsPerSecond), audioBitsPerSecond: finite(recorder.audioBitsPerSecond),
    track: { width: finite(settings.width), height: finite(settings.height), frameRate: finite(settings.frameRate), aspectRatio: finite(settings.aspectRatio) },
    blobBytes: blob ? finite(blob.size) : null, blobMime: blob ? safeMime(blob.type) : null,
  }
}
