"use client"

import { useRef, useState } from "react"

export default function HeroVideo({ src, className = "absolute inset-0 w-full h-full object-cover" }: { src: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isLoopBlend, setIsLoopBlend] = useState(false)

  function restart() {
    const video = videoRef.current
    if (!video) return
    try {
      video.currentTime = 0
      setIsLoopBlend(false)
      void video.play()
    } catch {}
  }

  function blendLoopPoint() {
    const video = videoRef.current
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return

    const secondsRemaining = video.duration - video.currentTime
    if (secondsRemaining <= 0.35) {
      setIsLoopBlend(true)
    } else if (video.currentTime <= 0.35 || secondsRemaining > 0.65) {
      setIsLoopBlend(false)
    }
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
      className={`${className} transition-opacity duration-300 ease-out ${isLoopBlend ? "opacity-60" : "opacity-100"}`}
      onTimeUpdate={blendLoopPoint}
      onEnded={restart}
      onPlay={() => setIsLoopBlend(false)}
    />
  )
}
