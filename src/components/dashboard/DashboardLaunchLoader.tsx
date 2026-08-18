import Spinner from "@/components/Spinner"
import { BLACK, GREEN } from "@/lib/dashboard/typography"

export default function DashboardLaunchLoader({ compact = false }: { compact?: boolean }) {
  return (
    <div
      aria-label="Loading"
      role="status"
      style={{
        minHeight: compact ? "min(56vh, 420px)" : "100dvh",
        backgroundColor: BLACK,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "max(env(safe-area-inset-top), 24px) 24px max(env(safe-area-inset-bottom), 24px)",
      }}
    >
      <span
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        Loading
      </span>
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `radial-gradient(circle, ${GREEN}1F 0%, ${GREEN}0D 46%, transparent 70%)`,
          boxShadow: `0 0 34px ${GREEN}24`,
        }}
      >
        <Spinner size={42} thickness={3} color={GREEN} trackColor="rgba(255,255,255,0.12)" />
      </div>
    </div>
  )
}
