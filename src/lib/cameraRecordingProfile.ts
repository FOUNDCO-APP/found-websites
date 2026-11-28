/** Local recording policy. No media rewriting, persistence, logging or network access. */
export const RECORDING_VIDEO_BITS = 5_000_000
export const RECORDING_AUDIO_BITS = 128_000
export type CameraProfileMode = "photo" | "video"
type ProfileCapabilities = Pick<MediaTrackCapabilities, "width" | "height" | "aspectRatio">

/** Request a primary-orientation video profile, not an output rotation.
 * Width/height constraints can remain sensor-oriented while delivered frames
 * rotate. Swapping ideals for Portrait can instead select a wide crop on iOS.
 * The selected output orientation is checked against actual frames separately.
 * Ideals are best effort; this does not guarantee upright playback or 9:16.
 */
export function cameraProfileConstraints(mode: CameraProfileMode, _portrait = false, _caps: ProfileCapabilities = {}): MediaTrackConstraints {
  if (mode === "photo") return { width: { ideal: 4096 }, height: { ideal: 3072 } }
  return {
    width: { ideal: 1920 }, height: { ideal: 1080 },
    aspectRatio: { ideal: 16 / 9 }, frameRate: { ideal: 30 },
  }
}

export const CAMERA_PROFILE_WAIT_MS = 8000
export type CameraProfileResult = {
  status: "stale" | "applied" | "fallback" | "timeout"
  isCurrent: () => boolean
}

/** Serialize changes per track, with an eight-second deadline from enqueue.
 * Browser operations cannot be cancelled. A timeout permanently retires that
 * track within this guard, even after late settlement; use a fresh track to
 * recover. Never release the underlying per-track queue on timeout. Different
 * tracks have independent queues. Invalidate synchronously on mode/stream/close
 * changes and check isCurrent after awaits; timeout can never authorize capture.
 */
export function createCameraProfileGuard() {
  let generation = 0
  const tracks = new WeakMap<MediaStreamTrack, { tail: Promise<unknown>; poisoned: boolean }>()
  return {
    invalidate() { generation++ },
    request(track: MediaStreamTrack, mode: CameraProfileMode, portrait: boolean, isActive: () => boolean, advanced?: MediaTrackConstraintSet): Promise<CameraProfileResult> {
      const token = ++generation
      let state = tracks.get(track)
      if (!state) {
        state = { tail: Promise.resolve(), poisoned: false }
        tracks.set(track, state)
      }
      const lane = state
      let expired = false
      const isCurrent = () => !expired && !lane.poisoned && token === generation && track.readyState === "live" && isActive()
      if (lane.poisoned) return Promise.resolve({ status: "timeout", isCurrent })
      let timer: ReturnType<typeof setTimeout>
      const timeout = new Promise<CameraProfileResult>(resolve => {
        timer = setTimeout(() => {
          expired = true
          lane.poisoned = true
          resolve({ status: "timeout", isCurrent })
        }, CAMERA_PROFILE_WAIT_MS)
      })
      const operation = lane.tail.then(async (): Promise<CameraProfileResult> => {
        if (!isCurrent()) return { status: "stale" as const, isCurrent }
        let caps: ProfileCapabilities = {}
        try { caps = track.getCapabilities?.() ?? {} } catch { /* Older engines. */ }
        let applied = false
        try { await track.applyConstraints({ ...cameraProfileConstraints(mode, portrait, caps), ...(advanced ? { advanced: [advanced] } : {}) }); applied = true } catch { /* Ideals are best effort. */ }
        return { status: !isCurrent() ? "stale" as const : applied ? "applied" as const : "fallback" as const, isCurrent }
      })
      lane.tail = operation.catch(() => undefined)
      return Promise.race([operation, timeout]).finally(() => clearTimeout(timer))
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
