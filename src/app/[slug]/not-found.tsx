export default function TenantNotFound() {
  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#080A09",
      color: "white",
      textAlign: "center",
      padding: 24,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, color: "#3ecf8e", margin: "0 0 16px" }}>FOUND</p>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>We couldn&apos;t find this site</h1>
      <p style={{ fontSize: 15, fontWeight: 400, color: "rgba(255,255,255,0.6)", maxWidth: 380, lineHeight: 1.6, margin: 0 }}>
        This address may be mistyped, or the site it belongs to isn&apos;t set up yet.
      </p>
    </div>
  )
}
