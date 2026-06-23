import { TYPE, TEXT_OPACITY, GREEN } from "@/lib/dashboard/typography"

function LoadingRow({ width = "100%" }: { width?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.06)", flexShrink: 0 }} />
      <div style={{ flex: 1, display: "grid", gap: 7 }}>
        <div style={{ width, height: 12, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)" }} />
        <div style={{ width: "52%", height: 9, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.045)" }} />
      </div>
    </div>
  )
}

export default function DashboardLoading() {
  return (
    <main style={{ padding: "28px 20px" }} aria-label="Loading">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: GREEN, boxShadow: `0 0 10px ${GREEN}` }} />
        <span style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>Loading</span>
      </div>

      <div style={{ borderRadius: 22, padding: "22px 20px", border: `1px solid ${GREEN}18`, background: "linear-gradient(180deg, rgba(50,208,116,0.08), rgba(255,255,255,0.035))", marginBottom: 16 }}>
        <div style={{ width: "68%", height: 22, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.1)", marginBottom: 18 }} />
        <div style={{ display: "grid", gap: 12 }}>
          <LoadingRow width="82%" />
          <LoadingRow width="74%" />
          <LoadingRow width="66%" />
        </div>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ height: 56, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.055)" }} />
        <div style={{ height: 56, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.045)" }} />
      </div>
    </main>
  )
}