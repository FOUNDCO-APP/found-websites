import Link from "next/link"

export default function MailNavigation({ active }: { active: "received" | "sent" }) {
  return <nav aria-label="Mail" style={{ display: "flex", gap: 20, borderBottom: "1px solid var(--hq-border)", marginBottom: 20 }}>
    {([ ["received", "/admin/emails/received", "Received"], ["sent", "/admin/emails", "Sent"] ] as const).map(([key, href, label]) => <Link key={key} href={href} aria-current={active === key ? "page" : undefined} style={{ minHeight: 44, display: "inline-flex", alignItems: "center", color: active === key ? "var(--hq-text)" : "var(--hq-muted)", borderBottom: active === key ? "2px solid var(--hq-green)" : "2px solid transparent", textDecoration: "none", fontWeight: 600 }}>{label}</Link>)}
  </nav>
}
