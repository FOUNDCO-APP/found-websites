"use client"

import { useMemo, useState } from "react"
import { createProspect, logProspectActivity, updateProspect } from "./actions"
import { formatDue, planLabel } from "../client-utils"

export type Prospect = {
  id: string
  person_name: string
  business_name: string
  email: string | null
  phone: string | null
  source: string
  stage: string
  next_follow_up_at: string | null
  estimated_plan: string | null
  notes: string | null
  created_at: string
}

const STAGES = [
  ["new", "New"],
  ["contacted", "Contacted"],
  ["demo_scheduled", "Demo scheduled"],
  ["proposal_sent", "Proposal sent"],
  ["won", "Won"],
  ["lost", "Lost"],
] as const

function ProspectRow({ prospect }: { prospect: Prospect }) {
  const [stage, setStage] = useState(prospect.stage)
  const dueClass = prospect.next_follow_up_at && new Date(prospect.next_follow_up_at).getTime() < Date.now() ? "hq-badge-warning" : "hq-badge-info"
  return (
    <article className="hq-prospect">
      <div className="hq-prospect-head">
        <div>
          <div className="hq-business-name-line">
            <h2>{prospect.business_name}</h2>
            <span className="hq-badge hq-badge-info">{STAGES.find(([key]) => key === prospect.stage)?.[1]}</span>
          </div>
          <p className="hq-row-meta">{prospect.person_name} / {planLabel(prospect.estimated_plan)} / {prospect.source}</p>
          <div className="hq-contact-actions">
            {prospect.phone && <a href={`tel:${prospect.phone}`}>Call</a>}
            {prospect.phone && <a href={`sms:${prospect.phone}`}>Text</a>}
            {prospect.email && <a href={`mailto:${prospect.email}`}>Email</a>}
          </div>
        </div>
        <span className={`hq-badge ${dueClass}`}>{formatDue(prospect.next_follow_up_at)}</span>
      </div>
      <details className="hq-business-manage">
        <summary>Update</summary>
        <div className="hq-business-manage-body hq-sales-forms">
          <form action={updateProspect} className="hq-inline-form">
            <input type="hidden" name="id" value={prospect.id} />
            <label>Stage<select name="stage" value={stage} onChange={(event) => setStage(event.target.value)}>{STAGES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <label>Next follow-up<input name="next_follow_up_at" type="datetime-local" defaultValue={prospect.next_follow_up_at?.slice(0, 16) ?? ""} disabled={stage === "won" || stage === "lost"} /></label>
            {stage === "lost" && <label>Loss reason<input name="loss_reason" required placeholder="Why did we lose it?" /></label>}
            <button className="hq-button hq-button-primary" type="submit">Save</button>
          </form>
          <form action={logProspectActivity} className="hq-inline-form">
            <input type="hidden" name="id" value={prospect.id} />
            <label>Activity<select name="activity_type"><option value="call">Call</option><option value="text">Text</option><option value="email">Email</option><option value="note">Note</option></select></label>
            <label className="hq-form-grow">What happened?<input name="summary" required placeholder="Short outcome or note" /></label>
            <button className="hq-button hq-button-secondary" type="submit">Log</button>
          </form>
          {prospect.notes && <p className="hq-form-note">{prospect.notes}</p>}
        </div>
      </details>
    </article>
  )
}

export default function SalesWorkspace({ prospects }: { prospects: Prospect[] }) {
  const [query, setQuery] = useState("")
  const [stage, setStage] = useState("open")
  const filtered = useMemo(() => prospects.filter((prospect) => {
    const matches = `${prospect.business_name} ${prospect.person_name} ${prospect.email ?? ""}`.toLowerCase().includes(query.toLowerCase())
    if (!matches) return false
    if (stage === "open") return prospect.stage !== "won" && prospect.stage !== "lost"
    return stage === "all" || prospect.stage === stage
  }), [prospects, query, stage])

  return (
    <>
      <details className="hq-new-record">
        <summary className="hq-button hq-button-primary">Add prospect</summary>
        <form action={createProspect} className="hq-create-form">
          <label>Person<input name="person_name" required /></label>
          <label>Business<input name="business_name" required /></label>
          <label>Email<input name="email" type="email" /></label>
          <label>Phone<input name="phone" type="tel" /></label>
          <label>Source<input name="source" defaultValue="manual" /></label>
          <label>Estimated plan<select name="estimated_plan"><option value="">Unknown</option><option value="found">Starter</option><option value="found_pro">Pro</option><option value="found_business">Business</option></select></label>
          <label>Next follow-up<input name="next_follow_up_at" type="datetime-local" /></label>
          <label className="hq-form-wide">Notes<textarea name="notes" rows={2} /></label>
          <div className="hq-form-wide"><button className="hq-button hq-button-primary" type="submit">Add to sales</button></div>
        </form>
      </details>
      <div className="hq-business-toolbar">
        <input className="hq-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search prospects" />
        <div className="hq-filter-row">
          {[["open", "Open"], ["new", "New"], ["proposal_sent", "Proposals"], ["won", "Won"], ["lost", "Lost"], ["all", "All"]].map(([key, label]) => <button key={key} type="button" data-active={stage === key} onClick={() => setStage(key)}>{label}</button>)}
        </div>
      </div>
      <div className="hq-business-list">
        {filtered.map((prospect) => <ProspectRow key={prospect.id} prospect={prospect} />)}
        {!filtered.length && <div className="hq-business-empty">No prospects in this view.</div>}
      </div>
    </>
  )
}
