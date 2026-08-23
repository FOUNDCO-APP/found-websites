export type TestIdentitySource = {
  email?: string | null
  account_kind?: string | null
  is_test?: boolean | null
}

export function isAdminTestEmail(email: string | null | undefined) {
  const value = email?.trim().toLowerCase() ?? ""
  if (!value) return false
  return value.includes("shawnlopez@me.com") || value.includes("seanlopez@me.com") || value.includes("sayitmarketing") || value.includes("marketing")
}

export function isAdminTestIdentity(row: TestIdentitySource) {
  return row.account_kind === "test" || row.is_test === true || isAdminTestEmail(row.email)
}

export function adminTestIdentityReason(row: TestIdentitySource) {
  const email = row.email?.toLowerCase() ?? ""
  if (row.account_kind === "test") return "account_kind = test"
  if (row.is_test === true) return "is_test = true"
  if (email.includes("sayitmarketing")) return "Sayitmarketing email"
  if (email.includes("shawnlopez@me.com") || email.includes("seanlopez@me.com")) return "Shawn/Sean email"
  if (email.includes("marketing")) return "Marketing test email"
  return "Test identity"
}
