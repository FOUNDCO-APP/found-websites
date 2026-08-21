const WORDMARK_ASPECT_RATIO = 3848 / 632
const WORDMARK_MASK_URL = "/brand/found-wordmark-black.png"

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
  const computedWidth = width ?? Math.round(height * WORDMARK_ASPECT_RATIO)
  return (
    <span
      className={className}
      aria-label="Found"
      role="img"
      style={{
        display: "block",
        width: computedWidth,
        height,
        color,
        backgroundColor: "currentColor",
        maskImage: `url(${WORDMARK_MASK_URL})`,
        maskRepeat: "no-repeat",
        maskPosition: "center",
        maskSize: "contain",
        WebkitMaskImage: `url(${WORDMARK_MASK_URL})`,
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        WebkitMaskSize: "contain",
        ...style,
      }}
    />
  )
}
