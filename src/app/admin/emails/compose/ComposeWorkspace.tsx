"use client"

import { useActionState, useState } from "react"
import { useRouter } from "next/navigation"
import { saveComposeDraft, sendComposeDraft } from "../received/actions"

export type ComposeDraft = {
  id: string; to_address: string; from_address: string; subject: string; body_text: string
  status: string; updated_at: string; last_error: string | null
}
type Feedback = { success: boolean; error?: string; message?: string; state?: string }

export default function ComposeWorkspace({ draftId, draft, error = null, approvedFromAddresses, enabled = false, sendEnabled = false }: {
  draftId: string; draft: ComposeDraft | null; error?: string | null
  approvedFromAddresses: readonly string[]; enabled?: boolean; sendEnabled?: boolean
}) {
  const router = useRouter()
  const [stableId] = useState(draftId)
  const [to, setTo] = useState(draft?.to_address ?? "")
  const [from, setFrom] = useState(draft?.from_address ?? "")
  const [subject, setSubject] = useState(draft?.subject ?? "")
  const [body, setBody] = useState(draft?.body_text ?? "")
  const [saveState, saveAction, saving] = useActionState(async (_: Feedback | null, form: FormData): Promise<Feedback> => {
    if (!enabled) return { success: false, error: "Email drafting is not enabled yet." }
    try {
      const result = await saveComposeDraft(form)
      if (result.success) {
        router.replace(`/admin/emails/compose?draft=${encodeURIComponent(stableId)}`)
        router.refresh()
      }
      return result
    } catch { return { success: false, error: "Draft save could not be confirmed. Keep your text and check the saved draft before trying again." } }
  }, null)
  const [sendState, sendAction, sending] = useActionState(async (_: Feedback | null, form: FormData): Promise<Feedback> => {
    if (!enabled || !sendEnabled) return { success: false, error: "Email sending is not enabled yet." }
    try {
      const result = await sendComposeDraft(form)
      router.refresh()
      return result
    } catch { return { success: false, error: "Send status is uncertain. Do not send again until the recorded state has been checked." } }
  }, null)

  const recordedSend = !!draft && draft.status !== "draft"
  const reviewedMatches = !!draft && draft.id === stableId && draft.to_address === to.trim().toLowerCase() && draft.from_address === from && draft.subject === subject.trim() && draft.body_text === body
  const hasApprovedFrom = approvedFromAddresses.includes(from)
  const canSave = enabled && !error && !recordedSend && !sendState && !saving && !sending && hasApprovedFrom && !!to.trim() && !!subject.trim() && !!body.trim()

  return <div className="hq-compose-workspace">
    {!enabled && <p role="status" className="hq-row-meta">Email drafting is not enabled yet.</p>}
    {!sendEnabled && <p role="status" className="hq-row-meta">Email sending is not enabled yet. Saving a draft never sends.</p>}
    {error && <p role="alert" className="hq-row-meta">The saved email could not be loaded. Refresh before making changes.</p>}
    <section className="hq-section" aria-label="Write email">
      <h2 className="hq-section-title">1. Write and save</h2>
      <form action={saveAction}>
        <input type="hidden" name="draftId" value={stableId} />
        <label>To<input className="hq-input" type="email" name="to" autoComplete="off" value={to} onChange={event => setTo(event.target.value)} maxLength={254} required /></label>
        <label>From<select className="hq-input" name="from" value={from} onChange={event => setFrom(event.target.value)} required><option value="">Choose a Found address</option>{approvedFromAddresses.map(address => <option key={address} value={address}>{address}</option>)}</select></label>
        <label>Subject<input className="hq-input" name="subject" value={subject} onChange={event => setSubject(event.target.value)} maxLength={500} required /></label>
        <label>Message<textarea className="hq-input" name="body" value={body} onChange={event => setBody(event.target.value)} maxLength={20000} rows={8} style={{ minHeight: 180, padding: 12, lineHeight: 1.6, resize: "vertical" }} required /></label>
        <button className="hq-button hq-button-secondary" type="submit" disabled={!canSave} style={{ minHeight: 44 }}>{saving ? "Saving..." : "Save draft"}</button>
        {!canSave && <p className="hq-row-meta">{!enabled ? "Email drafting is not enabled yet." : recordedSend ? "This draft has a recorded send. Review its state before starting another email." : saving || sending ? "A request is in progress." : sendState ? "Check the recorded send state before making changes." : error ? "Refresh to load the saved draft." : "Complete To, From, subject and message before saving."}</p>}
      </form>
      {saveState && <p role={saveState.success ? "status" : "alert"} className="hq-row-meta">{saveState.error || saveState.message || (saveState.success ? "Draft saved. Review it below." : "Draft save not confirmed.")}</p>}
    </section>
    <section className="hq-section" aria-label="Review email">
      <h2 className="hq-section-title">2. Review and send</h2>
      {!draft ? <p className="hq-row-meta">Save a draft to review the exact recipient, Found address and message here.</p> : <>
        <p className="hq-row-meta">Recorded state: {draft.status}</p>
        <p className="hq-row-meta">To: {draft.to_address}</p><p className="hq-row-meta">From: {draft.from_address}</p><p className="hq-row-meta">Subject: {draft.subject}</p>
        <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.6, margin: "20px 0" }}>{draft.body_text}</div>
        {draft.last_error && <p role="alert" className="hq-row-meta">The last send needs review. Check the recorded state before trying again.</p>}
        {draft.status === "draft" && <>
          {!reviewedMatches && <p className="hq-row-meta">You have changes that are not in this saved draft. Save again before sending.</p>}
          <form action={sendAction}>
            <input type="hidden" name="draftId" value={draft.id} />
            <input type="hidden" name="expectedTo" value={draft.to_address} />
            <input type="hidden" name="expectedFrom" value={draft.from_address} />
            <input type="hidden" name="expectedSubject" value={draft.subject} />
            <input type="hidden" name="expectedVersion" value={draft.updated_at} />
            <button className="hq-button hq-button-primary" type="submit" disabled={!enabled || !sendEnabled || !reviewedMatches || !hasApprovedFrom || !!error || saving || sending || !!sendState} style={{ minHeight: 44 }}>{sending ? "Sending..." : "Send email"}</button>
            {(!enabled || !sendEnabled || !reviewedMatches || !hasApprovedFrom || !!error || saving || sending || !!sendState) && <p className="hq-row-meta">{!enabled || !sendEnabled ? "Email sending is not enabled yet." : saving || sending ? "A request is in progress." : sendState ? "Check the recorded send result before any further send." : "Save and review the current email before sending."}</p>}
          </form>
        </>}
      </>}
      {sendState && <p role={sendState.success ? "status" : "alert"} className="hq-row-meta">{sendState.error || sendState.message || (sendState.success ? "Send recorded. Delivery is not confirmed." : "Send not confirmed. Check its recorded state.")}</p>}
    </section>
    <style>{`
      .hq-compose-workspace { min-width: 0; overflow-wrap: anywhere; }
      .hq-compose-workspace label { display: block; min-width: 0; margin: 16px 0; line-height: 1.6; }
      .hq-compose-workspace .hq-row-meta { font-size: 0.9375rem; line-height: 1.6; color: var(--hq-text); overflow-wrap: anywhere; }
      .hq-compose-workspace .hq-section-title { font-size: 1rem; line-height: 1.5; color: var(--hq-text); }
      .hq-compose-workspace .hq-button { min-width: 0; max-width: 100%; white-space: normal; height: auto; padding-top: 10px; padding-bottom: 10px; overflow-wrap: anywhere; }
      .hq-compose-workspace .hq-button:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
    `}</style>
  </div>
}
