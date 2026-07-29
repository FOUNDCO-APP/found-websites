// Resizes a photo client-side and returns a JPEG Blob.
// Handles HEIC on iOS (Safari can decode HEIC natively into a canvas).
// Reduces iPhone photos from 10+ MB to < 1 MB before the server action upload.
// Was previously a private copy inside OnboardingFlow.tsx, only covering the
// initial onboarding hero upload - every other photo upload path in the app
// (menu/product item photos, the general Photos tab) skipped this entirely
// and sent the raw file straight to storage. Extracted here so any upload
// path can reuse the same compression instead of accepting whatever size
// comes off the phone.
export function resizeImageToJpeg(file: File, maxPx = 2400, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const canvas = document.createElement("canvas")
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext("2d")
      if (!ctx) { reject(new Error("Canvas unavailable")); return }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("Canvas toBlob failed")),
        "image/jpeg", quality,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")) }
    img.src = url
  })
}
