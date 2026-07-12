import { NextRequest, NextResponse } from "next/server"
import { confirmActivation } from "../activateActions"

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const slug = searchParams.get("slug") ?? ""
  const setupIntent = searchParams.get("setup_intent") ?? ""
  const redirectStatus = searchParams.get("redirect_status") ?? ""
  const returnTo = searchParams.get("returnTo") ?? ""
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"

  function activationFailed() {
    return NextResponse.redirect(new URL(`/activate?slug=${encodeURIComponent(slug)}&error=payment_failed`, request.url))
  }

  if (!slug || !setupIntent || redirectStatus !== "succeeded") {
    return activationFailed()
  }

  const activation = await confirmActivation(slug, setupIntent)

  if (!activation.ok || !activation.companyId) {
    return activationFailed()
  }

  const destination = returnTo === "dashboard"
    ? `https://my.${rootDomain}/api/select-company?id=${encodeURIComponent(activation.companyId)}&activated=true`
    : `https://${slug}.${rootDomain}?activated=true`

  const response = NextResponse.redirect(destination)
  response.cookies.set("found_company_id", activation.companyId, {
    path: "/",
    domain: `.${rootDomain}`,
    sameSite: "lax",
    secure: true,
    maxAge: 60 * 60 * 24 * 30,
  })

  return response
}