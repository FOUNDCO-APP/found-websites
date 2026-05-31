import { ImageResponse } from "next/og"

export const size = { width: 32, height: 32 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: 32,
        height: 32,
        background: "#111111",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 6,
      }}
    >
      <span style={{ color: "#1EAB46", fontSize: 20, fontWeight: 900, lineHeight: 1 }}>
        F
      </span>
    </div>,
    { ...size }
  )
}
