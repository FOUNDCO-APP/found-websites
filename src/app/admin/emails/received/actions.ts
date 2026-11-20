"use server"

import { requireAdmin } from "../../lib"

const retired = { success: false, error: "Found inbox and manual email actions are retired. Use Namecheap for correspondence." }

export async function saveReplyDraft(_form: FormData) {
  await requireAdmin()
  return retired
}

export async function sendManualReply(_form: FormData) {
  await requireAdmin()
  return retired
}

export async function markMailRead(_form: FormData) {
  await requireAdmin()
  return retired
}

export async function saveComposeDraft(_form: FormData) {
  await requireAdmin()
  return retired
}

export async function sendComposeDraft(_form: FormData) {
  await requireAdmin()
  return retired
}

export async function moveMail(_form: FormData) {
  await requireAdmin()
  return retired
}

export async function setSenderRule(_form: FormData) {
  await requireAdmin()
  return retired
}

export async function retryMailRetrieval(_form: FormData) {
  await requireAdmin()
  return retired
}
