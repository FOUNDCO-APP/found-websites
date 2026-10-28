"use client"

import { useActionState, useState } from "react"
import { useRouter } from "next/navigation"
import type { getReceivedMessage } from "@/lib/admin/mailStore"
import { saveReplyDraft, sendManualReply, markMailRead, moveMail, setSenderRule, retryMailRetrieval } from "./actions"

type Thread = Awaited<ReturnType<typeof getReceivedMessage>>
type Feedback = { success: boolean; error?: string; message?: string }
function feedback(value: unknown): Feedback {
  if (!value || typeof value !== "object") return { success: false, error: "No confirmation received. Refresh before trying again." }
  const row = value as Record<string, unknown>
  return { success: row.success === true || (!row.error && typeof row.replyId === "string"), error: typeof row.error === "string" ? row.error : undefined, message: typeof row.message === "string" ? row.message : typeof row.state === "string" ? `Recorded state: ${row.state}` : undefined }
}
function MailAction({ action, messageId, fields, label }: { action: (data: FormData) => Promise<unknown>; messageId: string; fields?: Record<string, string>; label: string }) {
  const router = useRouter()
  const [state, submit, pending] = useActionState(async (_: Feedback | null, data: FormData) => {
    try {
      const result = feedback(await action(data))
      if (result.success) { window.dispatchEvent(new Event("found:mail-updated")); router.refresh() }
      return result
    } catch { return { success: false, error: "Could not confirm the change. Refresh to check before trying again." } }
  }, null)
  return <form action={submit}><input type="hidden" name="messageId" value={messageId} />{Object.entries(fields ?? {}).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}<button className="hq-button hq-button-secondary" type="submit" disabled={pending} style={{ minHeight: 44 }}>{pending ? "Saving..." : label}</button>{state && <p role={state.success ? "status" : "alert"} className="hq-row-meta">{state.error || state.message || (state.success ? "Saved." : "Change not confirmed.")}</p>}</form>
}

function SavedReplySend({ messageId, replyId, version, to, from, differentRecipient, enabled }: { messageId: string; replyId: string; version: string; to: string; from: string; differentRecipient: boolean; enabled: boolean }) {
  const router = useRouter()
  const [state, action, pending] = useActionState(async (_: Feedback | null, form: FormData) => {
    if (!enabled) return { success: false, error: "Reply sending is not enabled yet." }
    try {
      const result = feedback(await sendManualReply(form))
      if (result.success) { window.dispatchEvent(new Event("found:mail-updated")); router.refresh() }
      return result
    } catch { return { success: false, error: "Send status is uncertain. Refresh this conversation before trying again." } }
  }, null)
  return <form action={action}><input type="hidden" name="messageId" value={messageId} /><input type="hidden" name="replyId" value={replyId} /><input type="hidden" name="expectedTo" value={to} /><input type="hidden" name="expectedFrom" value={from} /><input type="hidden" name="expectedVersion" value={version} />{differentRecipient && <label style={{ display: "flex", gap: 12, lineHeight: 1.6, margin: "12px 0" }}><input type="checkbox" name="confirmDifferentRecipient" value="1" required /><span>I confirm this reply should go to {to}, which differs from the sender.</span></label>}<button type="submit" className="hq-button hq-button-primary" disabled={!enabled || pending || !!state} style={{ minHeight: 44 }}>{pending ? "Sending..." : "Send reply"}</button>{state && <p role={state.success ? "status" : "alert"} className="hq-row-meta">{state.error || state.message || "Send request recorded. Refresh to check its state."}</p>}</form>
}

export default function Conversation({ data, replyTarget, receivingEnabled = false, sendEnabled = false, initialDraft = "", draftId }: { data: Thread; replyTarget: { to: string | null; from: string | null; warnings: string[]; fromOptions?: string[]; requiresFromChoice?: boolean }; receivingEnabled?: boolean; sendEnabled?: boolean; initialDraft?: string; draftId?: string }) {
  const router = useRouter()
  const fromOptions = replyTarget.fromOptions ?? (replyTarget.from ? [replyTarget.from] : [])
  const [chosenFrom, setChosenFrom] = useState("")
  const selectedFrom = fromOptions.length === 1 ? fromOptions[0] : chosenFrom
  const validFrom = fromOptions.includes(selectedFrom)
  const [stableDraftId] = useState(() => draftId ?? crypto.randomUUID())
  const [draftBody, setDraftBody] = useState(initialDraft)
  const [draftState, draftAction, draftPending] = useActionState(async (_: Feedback | null, form: FormData) => {
    try {
      const result = feedback(await saveReplyDraft(form))
      if (result.success) router.refresh()
      return result
    } catch { return { success: false, error: "Draft save could not be confirmed. Keep your text and try again." } }
  }, null)
  const message = data.message
  if (!receivingEnabled) return <section aria-label="Receiving disabled"><h2 className="hq-section-title">Receiving is not enabled yet.</h2><p className="hq-subtitle">Message actions and replies are unavailable until Found receiving is enabled.</p></section>
  if (!message) return <p role="alert" className="hq-subtitle">Message unavailable. Inbox storage may not be enabled yet.</p>
  const recipient = replyTarget.to
  const hardBlocked = "hard_blocked" in message && message.hard_blocked === true
  const sendingAllowed = sendEnabled && !hardBlocked && !data.error && !!recipient && validFrom
  const canSaveDraft = !hardBlocked && !data.error && !!recipient && validFrom && message.processing_state === "ready" && message.folder === "inbox"
  const draftHasRecordedSend = data.replies.some(reply => reply.id === stableDraftId && reply.status !== "draft")
  const replySubject = /^re:/i.test(message.subject ?? "") ? message.subject : `Re: ${message.subject || "No subject"}`
  return <div className="hq-received-conversation">
    {data.error && <p role="alert" className="hq-subtitle">Some message details could not be loaded. Refresh before replying.</p>}
    <section className="hq-section" aria-label="Received message">
      <h1 className="hq-title" style={{ overflowWrap: "anywhere" }}>{message.subject || "No subject"}</h1>
      <p className="hq-row-meta" style={{ overflowWrap: "anywhere" }}>From: {message.from_name ? `${message.from_name} <${message.from_address}>` : message.from_address}</p>
      <p className="hq-row-meta" style={{ overflowWrap: "anywhere" }}>To: {message.to_addresses.join(", ")}</p>
      <p className="hq-row-meta">{message.processing_state === "ready" ? "Ready to read" : message.processing_state === "pending" ? "Waiting for message content" : message.processing_state === "processing" ? "Retrieving message content" : message.processing_state === "failed" ? "Message retrieval needs attention" : "Processing state unknown"} / {message.read_at ? "Read" : "Unread"}</p>
      {message.last_error && <p role="alert" className="hq-row-meta">Processing error: {message.last_error}</p>}
      {hardBlocked && <p role="alert" className="hq-subtitle">This message is blocked by mail safety checks. Sending is unavailable.</p>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
        <MailAction action={markMailRead} messageId={message.id} fields={{ read: message.read_at ? "0" : "1" }} label={message.read_at ? "Mark unread" : "Mark read"} />
        <MailAction action={moveMail} messageId={message.id} fields={{ folder: message.folder === "spam" ? "inbox" : "spam" }} label={message.folder === "spam" ? "Move to Received" : "Move to Spam"} />
        {message.last_error && <MailAction action={retryMailRetrieval} messageId={message.id} label="Retry message retrieval" />}
      </div>
      {message.spam_reasons.some(reason => /unsupported Found address|unknown recipient/i.test(reason)) && <p className="hq-row-meta">Unknown catch-all recipient. {message.folder === "spam" ? "Move a legitimate message to Received, then choose an approved Found address to reply from." : "This rescued message requires an explicit approved Found address to reply from."} The unknown address cannot be used as a sender. Mail safety blocks still apply.</p>}
      {message.folder === "spam" && <p className="hq-row-meta">Spam reasons: {message.spam_reasons.join(", ") || "Not recorded"}. Moving this message does not create a sender rule.</p>}
      <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: "1rem", lineHeight: 1.6, padding: "24px 0", borderBottom: "1px solid var(--hq-border)" }}>{message.body_text || "Plain-text content is not available. HTML and remote images are not displayed."}</div>
      {message.attachments.length > 0 && <section aria-label="Attachment metadata"><h2 className="hq-section-title">Attachments</h2><p className="hq-row-meta">Quarantined. Downloads are unavailable; files have not been verified safe.</p>{message.attachments.map(attachment => <p key={attachment.id} className="hq-row-meta" style={{ overflowWrap: "anywhere" }}>{attachment.filename || "Unnamed file"} / {attachment.content_type || "Unknown type"} / {attachment.size === null ? "Size unavailable" : `${attachment.size} bytes`}</p>)}</section>}
    </section>
    <section className="hq-section" aria-label="Manual reply"><h2 className="hq-section-title">1. Write and save</h2>
      <p className="hq-row-meta" style={{ overflowWrap: "anywhere" }}>To: {recipient || "Unavailable"}</p><p className="hq-row-meta" style={{ overflowWrap: "anywhere" }}>From: {selectedFrom || "Choose below"}</p><p className="hq-row-meta" style={{ overflowWrap: "anywhere" }}>Subject: {replySubject}</p>
      {replyTarget.warnings.map((warning, index) => <p role="note" className="hq-subtitle" key={index}>{warning}</p>)}
      {message.reply_to_address && message.reply_to_address.toLowerCase() !== message.from_address?.toLowerCase() && <p role="note" className="hq-subtitle">The Reply-To address differs from the sender. Your reply will go to {message.reply_to_address}. Check it before sending.</p>}
      {!sendEnabled && <p className="hq-row-meta">Reply sending is not enabled yet. No mail is sent automatically.</p>}
      {!canSaveDraft && <p className="hq-row-meta">A draft can be saved when this message is ready in Received and its reply addresses pass safety checks.</p>}
      <form action={draftAction}><input type="hidden" name="messageId" value={message.id} /><input type="hidden" name="replyId" value={stableDraftId} />{fromOptions.length > 1 ? <label style={{ display: "block", marginBottom: 16 }}>Reply from<select className="hq-input" name="from" value={chosenFrom} onChange={event => setChosenFrom(event.target.value)} required><option value="">Choose a Found address</option>{fromOptions.map(address => <option key={address} value={address}>{address}</option>)}</select></label> : <input type="hidden" name="from" value={selectedFrom} />}<label>Reply text<textarea className="hq-input" name="body" value={draftBody} onChange={event => setDraftBody(event.target.value)} rows={8} style={{ minHeight: 180, padding: 12, lineHeight: 1.6, resize: "vertical" }} required /></label><div style={{ marginTop: 12 }}><button type="submit" className="hq-button hq-button-secondary" disabled={draftPending || !canSaveDraft || draftHasRecordedSend} style={{ minHeight: 44 }}>{draftPending ? "Saving..." : "Save draft"}</button></div></form>
      {draftHasRecordedSend && <p role="status" className="hq-row-meta">This draft has a recorded send. Reload before starting a new reply.</p>}
      {draftState && <p role={draftState.success ? "status" : "alert"} className="hq-row-meta">{draftState.error || draftState.message || (draftState.success ? "Draft saved." : "Draft save not confirmed.")}</p>}
      <p className="hq-row-meta">Save a draft first, then review it in step 2 below. Saving never sends.</p>
    </section>
    <section className="hq-section" aria-label="Replies"><h2 className="hq-section-title">2. Review recipient and send</h2>{data.replies.length === 0 && <p className="hq-row-meta">Save your draft above to review its exact recipient, sender and text here.</p>}{data.replies.map(reply => {
      const targetMatches = reply.to_address === recipient && reply.from_address === selectedFrom && reply.subject === replySubject
      return <div key={reply.id} className="hq-row" style={{ display: "block" }}><p className="hq-row-meta">{reply.status}</p>{reply.last_error && <p role="alert" className="hq-row-meta">The last reply attempt needs review. Check the recorded state before retrying.</p>}<p className="hq-row-meta" style={{ overflowWrap: "anywhere" }}>To: {reply.to_address || "Unavailable"} / From: {reply.from_address || "Unavailable"} / Subject: {reply.subject || "No subject"}</p><div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.6 }}>{reply.body_text}</div>{reply.status === "draft" && reply.to_address && <>{!targetMatches && <p role="alert" className="hq-row-meta">Reply details have changed since this draft was saved. Review and save a new draft before sending.</p>}<SavedReplySend messageId={message.id} replyId={reply.id} version={reply.updated_at} to={reply.to_address} from={reply.from_address} enabled={sendingAllowed && canSaveDraft && targetMatches} differentRecipient={reply.to_address.toLowerCase() !== message.from_address?.toLowerCase()} /></>}</div>
    })}</section>
    <section className="hq-section" aria-label="Sender rules"><details><summary style={{ minHeight: 44, cursor: "pointer" }}>Sender rules</summary><p className="hq-row-meta">Rules affect future received mail from this sender. They do not delete messages or bypass mail safety checks.</p><div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}><MailAction action={setSenderRule} messageId={message.id} fields={{ rule: "allow" }} label="Allow this sender" /><MailAction action={setSenderRule} messageId={message.id} fields={{ rule: "block" }} label="Send this sender to Spam" /><MailAction action={setSenderRule} messageId={message.id} fields={{ rule: "clear" }} label="Clear sender rule" /></div></details></section>
    <style>{`
      .hq-received-conversation { min-width: 0; overflow-wrap: anywhere; }
      .hq-received-conversation .hq-row-meta, .hq-received-conversation .hq-subtitle { font-size: 0.9375rem; line-height: 1.6; color: var(--hq-text); overflow-wrap: anywhere; }
      .hq-received-conversation .hq-section-title { font-size: 1rem; line-height: 1.5; color: var(--hq-text); }
      .hq-received-conversation label > span { overflow-wrap: anywhere; flex: 1; }
      .hq-received-conversation .hq-section { margin-top: 24px; }
      .hq-received-conversation .hq-row { padding: 16px 0; }
      .hq-received-conversation form, .hq-received-conversation label,
      .hq-received-conversation label > span { min-width: 0; max-width: 100%; }
      .hq-received-conversation .hq-button { white-space: normal; height: auto; max-width: 100%; padding-top: 10px; padding-bottom: 10px; overflow-wrap: anywhere; }
      .hq-received-conversation input[type="checkbox"] { flex-shrink: 0; }
    `}</style>
  </div>
}
