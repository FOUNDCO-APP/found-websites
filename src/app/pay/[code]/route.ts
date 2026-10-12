import { billingLinkRedirect } from "@/lib/stripe/billingLinkRedirect"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  return billingLinkRedirect(code, "pay")
}
