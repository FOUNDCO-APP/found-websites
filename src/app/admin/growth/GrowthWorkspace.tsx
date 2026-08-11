"use client"

import { useState, useTransition } from "react"
import { addLead, convertLeadToClient, dismissLead } from "./actions"

export type Prospect = {
  id: string
  person_name: string
  business_name: string
  email: string | null
  phone: string | null
  source: string
  stage: string
  notes: string | null
  created_at: string
  linked_company_id: string | null
}

export type Cohort = {
  title: string
  plan: string
  companies: { id: string; name: string; slug: string; email: string | null }[]
}

function CohortCard({ cohort }: { cohort: Cohort }) {
  const [expanded, setExpanded] = useState(false)
  const emails = cohort.companies.map((c) => c.email).filter((e): e is string => !!e)
  return (
    <article className="hq-prospect">
      <button type="button" className="hq-prospect-head" onClick={() => setExpanded((v) => !v)} style={{ width: "100%", border: "none", background: "none", cursor: "pointer", textAlign: "left" }}>
        <div>
          <div className="hq-business-name-line"><h2>{cohort.title}</h2></div>
          <p className="hq-row-meta">{cohort.plan} clients ready for a personal nudge to upgrade</p>
        </div>
        <span className="hq-chevron" style={{ transform: expanded ? "rotate(135deg)" : "rotate(45deg)" }} />
      </button>
      {expanded && (
        <div className="hq-business-manage-body hq-sales-forms">
          <div className="hq-contact-actions" style={{ marginBottom: 10 }}>
            {emails.length > 0 && <a href={`mailto:?bcc=${emails.join(",")}`}>Email all {emails.length}</a>}
          </div>
          {cohort.companies.map((c) => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--hq-border)" }}>
              <span className="hq-row-title" style={{ fontSize: 13 }}>{c.name}</span>
              <a href={`/admin/clients?q=${encodeURIComponent(c.name)}`} style={{ color: "var(--hq-green)", fontSize: 11, fontWeight: 750, textDecoration: "none" }}>View</a>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

function LeadRow({ prospect }: { prospect: Prospect }) {
  const [converting, startConverting] = useTransition()
  const [dismissing, startDismissing] = useTransition()
  const [converted, setConverted] = useState(Boolean(prospect.linked_company_id))
  const [dismissed, setDismissed] = useState(false)

  function handleConvert() {
    startConverting(async () => {
      await convertLeadToClient(prospect.id)
      setConverted(true)
    })
  }

  function handleDismiss() {
    startDismissing(async () => {
      await dismissLead(prospect.id)
      setDismissed(true)
    })
  }

  if (dismissed) return null

  return (
    <article className="hq-prospect">
      <div className="hq-prospect-head">
        <div>
          <div className="hq-business-name-line">
            <h2>{prospect.business_name}</h2>
            {converted && <span className="hq-badge hq-badge-success">Converted</span>}
          </div>
          <p className="hq-row-meta">{prospect.person_name} - {prospect.source}</p>
          <div className="hq-contact-actions">
            {prospect.phone && <a href={`tel:${prospect.phone}`}>Call</a>}
            {prospect.phone && <a href={`sms:${prospect.phone}`}>Text</a>}
            {prospect.email && <a href={`mailto:${prospect.email}`}>Email</a>}
          </div>
          {prospect.notes && <p className="hq-form-note" style={{ marginTop: 8 }}>{prospect.notes}</p>}
        </div>
      </div>
      {!converted && (
        <div className="hq-business-manage-body" style={{ paddingTop: 0, display: "flex", gap: 10 }}>
          <button type="button" onClick={handleConvert} disabled={converting} className="hq-button hq-button-primary">
            {converting ? "Converting..." : "Mark converted"}
          </button>
          <button type="button" onClick={handleDismiss} disabled={dismissing} className="hq-button hq-button-secondary">
            {dismissing ? "..." : "Not moving forward"}
          </button>
        </div>
      )}
      {converted && (
        <div className="hq-business-manage-body" style={{ paddingTop: 0 }}>
          <a href={`/admin/clients?q=${encodeURIComponent(prospect.business_name)}`} style={{ color: "var(--hq-green)", fontSize: 12, fontWeight: 750, textDecoration: "none" }}>View client record</a>
        </div>
      )}
    </article>
  )
}

export default function GrowthWorkspace({ cohorts, prospects, recentSignupCount, windowDays }: {
  cohorts: Cohort[]
  prospects: Prospect[]
  recentSignupCount: number
  windowDays: number
}) {
  const [showAdd, setShowAdd] = useState(false)

  return (
    <>
      <section>
        <div className="hq-section-head">
          <h2 className="hq-section-title">Upgrade opportunities</h2>
          <span className="hq-section-meta">{recentSignupCount} signups, last {windowDays}d</span>
        </div>
        {cohorts.length === 0 ? (
          <div className="hq-panel"><div className="hq-empty-state"><strong>No upgrade cohorts yet.</strong><span>Once 2+ clients share a plan and industry, they'll show up here as a group worth reaching out to.</span></div></div>
        ) : (
          <div className="hq-business-list">
            {cohorts.map((cohort) => <CohortCard key={cohort.title} cohort={cohort} />)}
          </div>
        )}
      </section>

      <section className="hq-section">
        <div className="hq-section-head">
          <h2 className="hq-section-title">Leads you're tracking</h2>
          <button type="button" className="hq-button hq-button-secondary" onClick={() => setShowAdd((v) => !v)}>
            {showAdd ? "Cancel" : "Add a lead"}
          </button>
        </div>
        {showAdd && (
          <form action={async (formData) => { await addLead(formData); setShowAdd(false) }} className="hq-create-form" style={{ marginBottom: 16, padding: 14, border: "1px solid var(--hq-border)", borderRadius: 8, background: "var(--hq-surface)" }}>
            <label>Person<input name="person_name" required /></label>
            <label>Business<input name="business_name" required /></label>
            <label>Email<input name="email" type="email" /></label>
            <label>Phone<input name="phone" type="tel" /></label>
            <label className="hq-form-wide">Note<textarea name="notes" rows={2} placeholder="How you know them, what they're interested in" /></label>
            <div className="hq-form-wide"><button className="hq-button hq-button-primary" type="submit">Add</button></div>
          </form>
        )}
        {prospects.length === 0 ? (
          <div className="hq-panel"><div className="hq-empty-state"><strong>No leads yet.</strong><span>Add someone worth following up with - a referral, someone you met.</span></div></div>
        ) : (
          <div className="hq-business-list">
            {prospects.map((prospect) => <LeadRow key={prospect.id} prospect={prospect} />)}
          </div>
        )}
      </section>
    </>
  )
}
