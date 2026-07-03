// Single source of truth for the FOUND wordmark.
// Uses the Inter variable loaded in the root layout (the app's one true typeface) — never hardcode Arial here again.
export default function FoundWordmark({
  height = 24,
  width,
  color = "currentColor",
  className,
  style,
}: {
  height?: number
  width?: number
  color?: string
  className?: string
  style?: React.CSSProperties
}) {
  const computedWidth = width ?? Math.round(height * (420 / 72))
  return (
    <svg
      viewBox="0 0 420 72"
      width={computedWidth}
      height={height}
      className={className}
      style={{ display: "block", color, ...style }}
      aria-label="Found"
      role="img"
    >
      <text
        x="0"
        y="56"
        fill="currentColor"
        fontFamily="var(--font-inter), Arial, sans-serif"
        fontSize="58"
        fontWeight="300"
        letterSpacing="25"
      >
        FOUND
      </text>
    </svg>
  )
}
