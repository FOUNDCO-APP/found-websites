export type MediaKind = "photo" | "video"

const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "m4v", "ogg"])

export function mediaKindFromUrl(url?: string | null, mimeType?: string | null): MediaKind {
  if (mimeType?.toLowerCase().startsWith("video/")) return "video"

  const cleanUrl = (url ?? "").split("?")[0]?.toLowerCase() ?? ""
  const ext = cleanUrl.includes(".") ? cleanUrl.split(".").pop() : ""
  return ext && VIDEO_EXTENSIONS.has(ext) ? "video" : "photo"
}

export function isVideoMedia(url?: string | null, mimeType?: string | null) {
  return mediaKindFromUrl(url, mimeType) === "video"
}
