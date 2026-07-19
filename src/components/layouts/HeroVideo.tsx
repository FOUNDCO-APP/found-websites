"use client"

import { useRef } from "react"

export default function HeroVideo({ src, className = "absolute inset-0 w-full h-full object-cover" }: { src: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  function restart() {
    const video = videoRef.current
    if (!video) return
    try {
      video.currentTime = 0
      void video.play()
    } catch {}
  }

  return (
    <video
      ref={videoRef}
      src={src}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      className={className}
      onEnded={restart}
    />
  )
}
