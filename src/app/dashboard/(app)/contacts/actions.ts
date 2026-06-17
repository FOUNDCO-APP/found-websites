"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"

export async function getContacts() {
  const user = await getAuthUser()
  if (!user) return []
  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return []

  const admin = createAdminClient()
  const { data } = await admin
    .from("contacts")
    .select("*")
    .eq("company_id", company.id)
    .order("name", { ascending: true })

  return data ?? []
}

export async function addContact(input: {
  name: string
  phone?: string
  email?: string
  notes?: string
  tags?: string[]
}) {
  const user = await getAuthUser()
  if (!user) return { error: "Not authenticated" }
  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return { error: "No company found" }

  if (!input.name?.trim()) return { error: "Name is required" }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("contacts")
    .insert({
      company_id: company.id,
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      notes: input.notes?.trim() || null,
      tags: input.tags ?? [],
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { contact: data }
}

export async function deleteContact(id: string) {
  const user = await getAuthUser()
  if (!user) return { error: "Not authenticated" }
  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return { error: "No company found" }

  const admin = createAdminClient()
  const { error } = await admin
    .from("contacts")
    .delete()
    .eq("id", id)
    .eq("company_id", company.id)

  if (error) return { error: error.message }
  return { success: true }
}
