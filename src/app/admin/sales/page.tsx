import { getAdminClient } from "../lib"
import SalesWorkspace, { type Prospect } from "./SalesWorkspace"

export const metadata = { title: "Sales - Found HQ" }

export default async function SalesPage() {
  const { data } = await getAdminClient().from("sales_prospects")
    .select("id, person_name, business_name, email, phone, source, stage, next_follow_up_at, estimated_plan, notes, created_at")
    .order("next_follow_up_at", { ascending: true, nullsFirst: false })
  const prospects = (data ?? []) as Prospect[]
  const open = prospects.filter((prospect) => !["won", "lost"].includes(prospect.stage)).length
  return (
    <div className="hq-page">
      <header className="hq-header">
        <div><p className="hq-eyebrow">Found HQ</p><h1 className="hq-title">Sales</h1><p className="hq-subtitle">Move every prospect toward a clear next step.</p></div>
        <span className="hq-count">{open} open</span>
      </header>
      <SalesWorkspace prospects={prospects} />
    </div>
  )
}
