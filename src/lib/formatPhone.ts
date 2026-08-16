// Owners can type a phone number into Site Editor in any shape - raw digits,
// dashes, dots, parens - and it's stored exactly as typed (see the
// saveBusinessField 10/11-digit validation in SiteEditor.tsx, which accepts
// any of those shapes). Nothing has ever normalized it for display, so the
// public site shows whatever the owner happened to type, unformatted, on
// Contact and on quote/estimate pages. This formats for display only - the
// stored value and every tel: link (which already strips non-digits itself)
// are untouched.
export function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    const d = digits.slice(1)
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  }
  // Extension, international, or an unrecognized shape - show it as typed
  // rather than mangling something we can't confidently reformat.
  return raw
}
