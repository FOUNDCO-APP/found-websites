"use server"

import { createClient } from "@/lib/supabase/server"

export async function submitLead(_: unknown, formData: FormData) {
  const companyId = formData.get("company_id") as string
  const name = (formData.get("name") as string)?.trim()
  const phone = (formData.get("phone") as string)?.trim()
  const email = (formData.get("email") as string)?.trim()
  const service = (formData.get("service") as string)?.trim()
  const message = (formData.get("message") as string)?.trim()

  if (!companyId || !name || !phone) {
    return { success: false, error: "Name and phone number are required." }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("leads").insert({
    company_id: companyId,
    name,
    phone,
    email: email || null,
    service: service || null,
    message: message || null,
  })

  if (error) {
    console.error("Lead insert error:", error.message)
    return { success: false, error: "Something went wrong. Please call us directly." }
  }

  return { success: true }
}
