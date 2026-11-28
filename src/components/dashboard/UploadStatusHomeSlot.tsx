"use client"

import { useUploadStatus } from "@/components/dashboard/UploadStatusProvider"

/** An empty placement anchor, never another status or upload-queue owner. */
export default function UploadStatusHomeSlot({ inset = true }: { inset?: boolean }) {
  const { registerHomeStatusTarget } = useUploadStatus()
  return <div ref={registerHomeStatusTarget} data-home-upload-status-slot data-upload-status-inset={inset ? "page" : "none"} style={{ display: "contents" }} />
}
