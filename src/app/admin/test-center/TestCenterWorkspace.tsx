"use client"

import { useEffect, useMemo, useState } from "react"

export type QaStatus = "not_tested" | "passed" | "needs_fix"

export type QaCheck = {
  id: string
  area: string
  title: string
  detail: string
  href: string
}

export type TestIdentity = {
  id: string
  type: "account" | "lead"
  name: string
  email: string | null
  reason: string
  href: string | null
}

const STATUS_LABELS: Record<QaStatus, string> = {
  not_tested: "Not tested",
  passed: "Passed",
  needs_fix: "Needs fix",
}

const STATUS_CLASSES: Record<QaStatus, string> = {
  not_tested: "hq-badge hq-badge-quiet",
  passed: "hq-badge hq-badge-success",
  needs_fix: "hq-badge hq-badge-danger",
}

const STORAGE_KEY = "found-hq-test-center-status-v1"

function readStatuses() {
  if (typeof window === "undefined") return {}
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, QaStatus>
  } catch {
    return {}
  }
}

export default function TestCenterWorkspace({ checks, testIdentities }: { checks: QaCheck[]; testIdentities: TestIdentity[] }) {
  const [statuses, setStatuses] = useState<Record<string, QaStatus>>({})

  useEffect(() => {
    setStatuses(readStatuses())
  }, [])

  function setStatus(id: string, status: QaStatus) {
    setStatuses((current) => {
      const next = { ...current, [id]: status }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  const groupedChecks = useMemo(() => {
    return checks.reduce<Record<string, QaCheck[]>>((groups, check) => {
      groups[check.area] = [...(groups[check.area] ?? []), check]
      return groups
    }, {})
  }, [checks])

  const counts = checks.reduce(
    (total, check) => {
      const status = statuses[check.id] ?? "not_tested"
      total[status] += 1
      return total
    },
    { not_tested: 0, passed: 0, needs_fix: 0 } as Record<QaStatus, number>,
  )

  return (
    <>
      <section className="hq-section">
        <div className="hq-section-head">
          <h2 className="hq-section-title">QA status</h2>
          <span className="hq-section-meta">Saved on this device</span>
        </div>
        <div className="hq-stat-strip">
          <div className="hq-stat"><div className="hq-stat-value">{counts.not_tested}</div><div className="hq-stat-label">Not tested</div></div>
          <div className="hq-stat"><div className="hq-stat-value">{counts.passed}</div><div className="hq-stat-label">Passed</div></div>
          <div className="hq-stat"><div className="hq-stat-value">{counts.needs_fix}</div><div className="hq-stat-label">Needs fix</div></div>
          <div className="hq-stat"><div className="hq-stat-value">{testIdentities.length}</div><div className="hq-stat-label">Test identities</div></div>
        </div>
      </section>

      <section className="hq-section">
        <div className="hq-section-head">
          <h2 className="hq-section-title">Test identities</h2>
          <span className="hq-section-meta">Allowed for sandbox testing</span>
        </div>
        <div className="hq-panel">
          {testIdentities.length === 0 ? (
            <div className="hq-empty-state"><strong>No test identities found.</strong><span>Add or classify a test account before sending test outreach.</span></div>
          ) : (
            testIdentities.map((identity) => (
              <a key={`${identity.type}-${identity.id}`} href={identity.href ?? "#"} className="hq-row hq-link-row" aria-disabled={!identity.href}>
                <div>
                  <p className="hq-row-title">{identity.name}</p>
                  <p className="hq-row-meta">{identity.email ?? "No email"} / {identity.reason}</p>
                </div>
                <span className="hq-badge hq-badge-info">{identity.type === "account" ? "Account" : "Lead"}</span>
              </a>
            ))
          )}
        </div>
      </section>

      {Object.entries(groupedChecks).map(([area, areaChecks]) => (
        <section key={area} className="hq-section">
          <div className="hq-section-head">
            <h2 className="hq-section-title">{area}</h2>
            <span className="hq-section-meta">{areaChecks.length} checks</span>
          </div>
          <div className="hq-panel">
            {areaChecks.map((check) => {
              const status = statuses[check.id] ?? "not_tested"
              return (
                <div key={check.id} className="hq-row" style={{ alignItems: "flex-start" }}>
                  <div>
                    <p className="hq-row-title">{check.title}</p>
                    <p className="hq-row-meta">{check.detail}</p>
                    <a href={check.href} style={{ color: "var(--hq-green)", display: "inline-block", fontSize: 11, fontWeight: 760, marginTop: 8, textDecoration: "none" }}>Open test area</a>
                  </div>
                  <div className="hq-action-end" style={{ alignItems: "flex-end", gap: 8 }}>
                    <span className={STATUS_CLASSES[status]}>{STATUS_LABELS[status]}</span>
                    <div className="hq-contact-actions hq-outreach-log-actions" style={{ justifyContent: "flex-end", marginTop: 0 }}>
                      {(["passed", "needs_fix", "not_tested"] as QaStatus[]).map((option) => (
                        <button key={option} type="button" onClick={() => setStatus(check.id, option)}>{STATUS_LABELS[option]}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </>
  )
}
