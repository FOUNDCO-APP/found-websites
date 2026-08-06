export default function Spinner({ size = 16, thickness = 2, color = "#32D074", trackColor }: {
  size?: number
  thickness?: number
  color?: string
  trackColor?: string
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `${thickness}px solid ${trackColor ?? `${color}44`}`,
        borderTopColor: color,
        animation: "spin 0.7s linear infinite",
        flexShrink: 0,
      }}
    />
  )
}
