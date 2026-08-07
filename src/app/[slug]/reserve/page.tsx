import { redirect } from "next/navigation"

// This route moved to /book (a neutral, industry-agnostic URL now that
// booking is available to every industry, not just food/hospitality where
// "reserve" originally made sense). Kept as a permanent redirect so any
// existing bookmarks, Google Business Profile links, or printed receipts
// pointing at /reserve keep working.
export default function ReserveRedirect() {
  redirect("/book")
}
