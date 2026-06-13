import ActivateLoader from "./ActivateLoader"

// Fully static — served from CDN, zero cold start, zero bundle size limit.
// Slug is read client-side from the URL.
export const dynamic = "force-static"

export default function ActivatePage() {
  return <ActivateLoader />
}
